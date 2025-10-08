import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Settings,
  MapPin,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Tipos locales basados en la BD
interface DBLocation {
  id: string;
  warehouse_id: string | null;
  code: string;
  name: string | null;
  zone: string | null;
  aisle: string | null;
  rack: string | null;
  shelf: string | null;
  bin: string | null;
  location_type?: 'receiving' | 'storage' | 'picking' | 'shipping' | 'quarantine';
  capacity: number | null;
  is_active: boolean | null;
}

interface InventoryByLocation {
  location_id: string | null;
  quantity: number | null;
  reserved_quantity: number | null;
  available_quantity: number | null;
}

interface ZoneDerived {
  id: string; // zone code
  name: string; // zone name shown
  type: 'receiving' | 'storage' | 'picking' | 'shipping' | 'returns';
  capacity: number;
  occupied: number;
  status: 'active' | 'maintenance' | 'blocked';
}

interface LocationDerived {
  id: string;
  zoneId: string | null;
  name: string;
  capacity: number;
  occupied: number;
  type: 'rack' | 'floor' | 'dock' | 'staging';
  // Posición derivada para visualización (sin coordenadas en BD)
  x: number;
  y: number;
  width: number;
  height: number;
}

export function WarehouseMap() {
  const [zoom, setZoom] = useState(1);
  const [selectedZone, setSelectedZone] = useState<ZoneDerived | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationDerived | null>(null);
  const [viewMode, setViewMode] = useState<'zones' | 'locations' | 'heatmap'>('zones');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zones, setZones] = useState<ZoneDerived[]>([]);
  const [locations, setLocations] = useState<LocationDerived[]>([]);

  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Cargar ubicaciones reales
        const { data: dbLocations, error: locError } = await supabase
          .from('locations')
          .select('id, warehouse_id, code, name, zone, aisle, rack, shelf, bin, capacity, is_active, location_type');

        if (locError) throw locError;

        // Cargar inventario para calcular ocupación por ubicación
        const { data: dbInventory, error: invError } = await supabase
          .from('inventory')
          .select('location_id, quantity, reserved_quantity, available_quantity');

        if (invError) throw invError;

        const inventoryByLocationMap = new Map<string, InventoryByLocation>();
        (dbInventory || []).forEach((inv: InventoryByLocation) => {
          if (inv.location_id) {
            inventoryByLocationMap.set(inv.location_id, inv);
          }
        });

        // Derivar posiciones para ubicaciones (grid simple)
        const derivedLocations: LocationDerived[] = (dbLocations || []).map((loc: DBLocation, index: number) => {
          const inv = loc.id ? inventoryByLocationMap.get(loc.id) : undefined;
          const capacity = loc.capacity ?? 0;
          const occupied = inv?.available_quantity ?? 0;

          // Layout básico en cuadrícula
          const cols = 12;
          const cellW = 40;
          const cellH = 30;
          const gap = 8;
          const row = Math.floor(index / cols);
          const col = index % cols;
          const x = 20 + col * (cellW + gap);
          const y = 60 + row * (cellH + gap);

          const type: LocationDerived['type'] = loc.location_type === 'receiving'
            ? 'dock'
            : loc.location_type === 'picking'
            ? 'rack'
            : loc.location_type === 'shipping'
            ? 'staging'
            : 'rack';

          return {
            id: loc.id,
            zoneId: loc.zone || null,
            name: loc.code || loc.name || 'Ubicación',
            capacity,
            occupied,
            type,
            x,
            y,
            width: cellW,
            height: cellH
          };
        });

        setLocations(derivedLocations);

        // Derivar zonas agrupando por "zone" de locations
        const zoneAgg = new Map<string, { capacity: number; occupied: number; activeCount: number }>();
        derivedLocations.forEach((l) => {
          const zoneKey = l.zoneId || 'SIN-ZONA';
          const prev = zoneAgg.get(zoneKey) || { capacity: 0, occupied: 0, activeCount: 0 };
          zoneAgg.set(zoneKey, {
            capacity: prev.capacity + (l.capacity || 0),
            occupied: prev.occupied + (l.occupied || 0),
            activeCount: prev.activeCount + 1
          });
        });

        const derivedZonesFromLocations: ZoneDerived[] = Array.from(zoneAgg.entries()).map(([zoneCode, agg], idx) => {
          const utilization = agg.capacity > 0 ? agg.occupied / agg.capacity : 0;
          const type: ZoneDerived['type'] = zoneCode.toUpperCase().includes('REC')
            ? 'receiving'
            : zoneCode.toUpperCase().includes('PICK')
            ? 'picking'
            : zoneCode.toUpperCase().includes('SHIP')
            ? 'shipping'
            : 'storage';

          const status: ZoneDerived['status'] = utilization >= 1
            ? 'blocked'
            : utilization >= 0.8
            ? 'maintenance'
            : 'active';

          return {
            id: zoneCode,
            name: zoneCode === 'SIN-ZONA' ? 'Sin Zona' : `Zona ${zoneCode}`,
            type,
            capacity: agg.capacity,
            occupied: agg.occupied,
            status
          };
        });
        
        // Intentar cargar zonas reales desde la tabla 'zones' para incluir zonas sin ubicaciones
        type DBZone = {
          code: string;
          name: string;
          zone_type: 'receiving' | 'storage' | 'picking' | 'packing' | 'shipping' | 'cross_dock';
          capacity: number | null;
          is_active: boolean | null;
        };

        let combinedZones = derivedZonesFromLocations;
        try {
          const { data: dbZones, error: zonesError } = await supabase
            .from('zones')
            .select('code, name, zone_type, capacity, is_active');

          if (!zonesError && dbZones) {
            const byCode = new Map<string, ZoneDerived>();
            combinedZones.forEach((z) => byCode.set(z.id, z));

            (dbZones as DBZone[]).forEach((z) => {
              const existing = byCode.get(z.code);
              const mappedType: ZoneDerived['type'] =
                z.zone_type === 'receiving'
                  ? 'receiving'
                  : z.zone_type === 'storage'
                  ? 'storage'
                  : z.zone_type === 'picking'
                  ? 'picking'
                  : z.zone_type === 'shipping'
                  ? 'shipping'
                  : 'returns'; // fallback para 'packing' y 'cross_dock'

              if (existing) {
                // Actualizar nombre y tipo si vienen de la tabla
                existing.name = z.name || existing.name;
                existing.type = mappedType;
                // Si la capacidad derivada es 0, usar la de la tabla
                if (!existing.capacity && z.capacity != null) {
                  existing.capacity = z.capacity;
                }
                // Si la zona está marcada como inactiva, reflejar estado
                if (z.is_active === false) {
                  existing.status = 'blocked';
                }
                byCode.set(z.code, existing);
              } else {
                const capacity = z.capacity ?? 0;
                const occupied = 0; // Sin ubicaciones asignadas aún
                const utilization = capacity > 0 ? occupied / capacity : 0;
                const status: ZoneDerived['status'] =
                  z.is_active === false
                    ? 'blocked'
                    : utilization >= 1
                    ? 'blocked'
                    : utilization >= 0.8
                    ? 'maintenance'
                    : 'active';

                byCode.set(z.code, {
                  id: z.code,
                  name: z.name || `Zona ${z.code}`,
                  type: mappedType,
                  capacity,
                  occupied,
                  status
                });
              }
            });

            combinedZones = Array.from(byCode.values());
          }
        } catch (e) {
          // Si la tabla zones no existe o hay error de lectura, continuar con las derivadas
          console.warn('No se pudieron cargar zonas desde la tabla zones:', e);
        }

        setZones(combinedZones);
      } catch (err: any) {
        console.error('Error cargando layout de almacén:', err);
        setError('Error al cargar datos de almacén');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getZoneColor = (zone: Zone) => {
    const occupancyRate = zone.occupied / zone.capacity;
    
    if (zone.status === 'maintenance') return 'bg-yellow-200 border-yellow-400';
    if (zone.status === 'blocked') return 'bg-red-200 border-red-400';
    
    switch (zone.type) {
      case 'receiving':
        return occupancyRate > 0.8 ? 'bg-blue-300 border-blue-500' : 'bg-blue-100 border-blue-300';
      case 'storage':
        return occupancyRate > 0.8 ? 'bg-green-300 border-green-500' : 'bg-green-100 border-green-300';
      case 'picking':
        return occupancyRate > 0.8 ? 'bg-purple-300 border-purple-500' : 'bg-purple-100 border-purple-300';
      case 'shipping':
        return occupancyRate > 0.8 ? 'bg-orange-300 border-orange-500' : 'bg-orange-100 border-orange-300';
      case 'returns':
        return occupancyRate > 0.8 ? 'bg-gray-300 border-gray-500' : 'bg-gray-100 border-gray-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const getLocationColor = (location: Location) => {
    const occupancyRate = location.occupied / location.capacity;
    
    if (occupancyRate === 1) return 'bg-red-400 border-red-600';
    if (occupancyRate > 0.8) return 'bg-yellow-400 border-yellow-600';
    if (occupancyRate > 0.5) return 'bg-green-400 border-green-600';
    return 'bg-blue-400 border-blue-600';
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleReset = () => setZoom(1);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mapa Digital del Almacén</h1>
          <p className="text-gray-600">Visualización interactiva del layout y ocupación</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-white border border-gray-300 rounded-md">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-50"
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-3 py-2 text-sm font-medium border-x border-gray-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-50"
              disabled={zoom >= 3}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleReset}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </button>
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Settings className="w-4 h-4 mr-2" />
            Configurar
          </button>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium text-gray-700">Vista:</span>
        <div className="flex space-x-1 bg-gray-100 rounded-md p-1">
          {[
            { id: 'zones', label: 'Zonas' },
            { id: 'locations', label: 'Ubicaciones' },
            { id: 'heatmap', label: 'Mapa de Calor' }
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id as any)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === mode.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map Container */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div 
              ref={mapRef}
              className="relative bg-gray-50 overflow-auto"
              style={{ height: '600px' }}
            >
              <div
                className="relative"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  width: '900px',
                  height: '500px'
                }}
              >
                {/* Grid Background */}
                <div className="absolute inset-0 opacity-20">
                  <svg width="100%" height="100%">
                    <defs>
                      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                </div>

                {/* Zones (derivadas de BD) */}
                {viewMode === 'zones' && zones.map((zone, idx) => (
                  <div
                    key={zone.id}
                    className={`absolute border-2 rounded cursor-pointer transition-all hover:shadow-lg ${getZoneColor(zone)} ${
                      selectedZone?.id === zone.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    style={{
                      // Posiciones derivadas simples en grid
                      left: 40 + (idx % 4) * (220 + 20),
                      top: 60 + Math.floor(idx / 4) * (120 + 20),
                      width: 220,
                      height: 120
                    }}
                    onClick={() => setSelectedZone(zone)}
                  >
                    <div className="p-2 h-full flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-gray-800">{zone.name}</h4>
                        <p className="text-xs text-gray-600">
                          {zone.occupied}/{zone.capacity}
                        </p>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-xs text-gray-500">
                          {Math.round((zone.occupied / zone.capacity) * 100)}%
                        </span>
                        {zone.status === 'maintenance' && (
                          <AlertTriangle className="w-3 h-3 text-yellow-600" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Locations (de BD, con posiciones derivadas) */}
                {viewMode === 'locations' && locations.map((location) => (
                  <div
                    key={location.id}
                    className={`absolute border cursor-pointer transition-all hover:shadow-md ${getLocationColor(location)} ${
                      selectedLocation?.id === location.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    style={{
                      left: location.x,
                      top: location.y,
                      width: location.width,
                      height: location.height
                    }}
                    onClick={() => setSelectedLocation(location)}
                  >
                    <div className="p-1 h-full flex items-center justify-center">
                      <span className="text-xs font-medium text-white">
                        {location.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="space-y-4">
          {/* Legend */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Leyenda</h3>
            <div className="space-y-2">
              {viewMode === 'zones' && (
                <>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                    <span className="text-xs text-gray-600">Recepción</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                    <span className="text-xs text-gray-600">Almacenamiento</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
                    <span className="text-xs text-gray-600">Picking</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
                    <span className="text-xs text-gray-600">Envíos</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                    <span className="text-xs text-gray-600">Devoluciones</span>
                  </div>
                </>
              )}
              {viewMode === 'locations' && (
                <>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-400 border border-blue-600 rounded"></div>
                    <span className="text-xs text-gray-600">Disponible</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-400 border border-green-600 rounded"></div>
                    <span className="text-xs text-gray-600">Ocupado 50-80%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-yellow-400 border border-yellow-600 rounded"></div>
                    <span className="text-xs text-gray-600">Ocupado 80-100%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-400 border border-red-600 rounded"></div>
                    <span className="text-xs text-gray-600">Completo</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Selected Zone/Location Info */}
          {selectedZone && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Información de Zona</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-xs font-medium text-gray-500">Nombre:</span>
                  <p className="text-sm text-gray-900">{selectedZone.name}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">Tipo:</span>
                  <p className="text-sm text-gray-900 capitalize">{selectedZone.type}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">Capacidad:</span>
                  <p className="text-sm text-gray-900">{selectedZone.capacity} posiciones</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">Ocupado:</span>
                  <p className="text-sm text-gray-900">{selectedZone.occupied} posiciones</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">Utilización:</span>
                  <p className="text-sm text-gray-900">
                    {Math.round((selectedZone.occupied / selectedZone.capacity) * 100)}%
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">Estado:</span>
                  <div className="flex items-center space-x-1">
                    {selectedZone.status === 'active' && <CheckCircle className="w-3 h-3 text-green-500" />}
                    {selectedZone.status === 'maintenance' && <Clock className="w-3 h-3 text-yellow-500" />}
                    {selectedZone.status === 'blocked' && <AlertTriangle className="w-3 h-3 text-red-500" />}
                    <span className="text-sm text-gray-900 capitalize">{selectedZone.status}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedLocation && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Información de Ubicación</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-xs font-medium text-gray-500">Código:</span>
                  <p className="text-sm text-gray-900">{selectedLocation.name}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">Tipo:</span>
                  <p className="text-sm text-gray-900 capitalize">{selectedLocation.type}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">Capacidad:</span>
                  <p className="text-sm text-gray-900">{selectedLocation.capacity} unidades</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">Ocupado:</span>
                  <p className="text-sm text-gray-900">{selectedLocation.occupied} unidades</p>
                </div>
                {selectedLocation.products && selectedLocation.products.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">Productos:</span>
                    <div className="mt-1 space-y-1">
                      {selectedLocation.products.map((product, index) => (
                        <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1">
                          {product}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}