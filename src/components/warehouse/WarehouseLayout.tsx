import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Map, Settings, BarChart3, Package, MapPin, Warehouse as WarehouseIcon } from 'lucide-react';
import { WarehouseMap } from './WarehouseMap';
import { ZoneConfiguration } from './ZoneConfiguration';
import { WarehouseLocations } from './WarehouseLocations';
import { Warehouses } from './Warehouses';
import { supabase } from '../../lib/supabase';

export function WarehouseLayout() {
  const location = useLocation();

  const isActiveTab = (path: string) => {
    return location.pathname.includes(path);
  };

  const tabs = [
    {
      id: 'map',
      name: 'Mapa del Almacén',
      icon: Map,
      path: '/warehouse/map'
    },
    {
      id: 'warehouses',
      name: 'Almacenes',
      icon: WarehouseIcon,
      path: '/warehouse/warehouses'
    },
    {
      id: 'locations',
      name: 'Ubicaciones',
      icon: MapPin,
      path: '/warehouse/locations'
    },
    {
      id: 'zones',
      name: 'Configuración de Zonas',
      icon: Settings,
      path: '/warehouse/zones'
    },
    {
      id: 'analytics',
      name: 'Análisis de Ocupación',
      icon: BarChart3,
      path: '/warehouse/analytics'
    },
    {
      id: 'capacity',
      name: 'Gestión de Capacidad',
      icon: Package,
      path: '/warehouse/capacity'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Layout de Almacén</h1>
              <p className="text-gray-600">Gestión del mapa digital y configuración de zonas</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Última actualización: {new Date().toLocaleDateString('es-ES')}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="px-6 flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = isActiveTab(tab.path);
              
              return (
                <Link
                  key={tab.id}
                  to={tab.path}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <Routes>
          <Route path="map" element={<WarehouseMap />} />
          <Route path="warehouses" element={<Warehouses />} />
          <Route path="locations" element={<WarehouseLocations />} />
          <Route path="zones" element={<ZoneConfiguration />} />
          <Route path="analytics" element={<WarehouseAnalytics />} />
          <Route path="capacity" element={<CapacityManagement />} />
          <Route path="" element={<WarehouseMap />} />
        </Routes>
      </div>
    </div>
  );
}

// Placeholder components for future implementation
function WarehouseAnalytics() {
  type Warehouse = { id: string; name: string; code: string; is_active: boolean };
  type Location = {
    id: string;
    warehouse_id: string | null;
    code: string;
    name: string | null;
    zone: string | null;
    capacity: number | null;
    is_active: boolean | null;
    location_type: string | null;
  };

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState({
    occupancyTotal: 0,
    activeZones: 0,
    maintenanceCount: 0,
    efficiency: 0,
  });

  const [zoneStats, setZoneStats] = useState<Array<{ name: string; occupancy: number; capacity: number; color: string }>>([]);

  useEffect(() => {
    const loadInitial = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: dbWarehouses, error: whError } = await supabase
          .from('warehouses')
          .select('id, name, code, is_active')
          .order('name', { ascending: true });
        if (whError) throw whError;
        setWarehouses(dbWarehouses || []);
        const firstId = (dbWarehouses || [])[0]?.id || '';
        setSelectedWarehouseId(firstId);
        if (firstId) await loadAnalytics(firstId);
      } catch (e: any) {
        console.error('Error cargando Analytics:', e);
        setError('No se pudo cargar el análisis de ocupación');
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, []);

  const loadAnalytics = async (warehouseId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Locations del almacén (activas e inactivas para contar mantenimiento)
      const { data: allLocations, error: locErr } = await supabase
        .from('locations')
        .select('id, warehouse_id, code, name, zone, capacity, is_active, location_type')
        .eq('warehouse_id', warehouseId);
      if (locErr) throw locErr;

      const activeLocations = (allLocations || []).filter(l => l.is_active);
      const totalCapacity = activeLocations.reduce((sum, l) => sum + (typeof l.capacity === 'number' ? l.capacity! : 0), 0);

      // Inventario por ubicación (usar available_quantity para ocupación efectiva)
      const locationIds = (activeLocations || []).map(l => l.id);
      const { data: invRows, error: invErr } = await supabase
        .from('inventory')
        .select('location_id, quantity, reserved_quantity, available_quantity')
        .eq('warehouse_id', warehouseId)
        .in('location_id', locationIds.length ? locationIds : ['00000000-0000-0000-0000-000000000000']);
      if (invErr) throw invErr;

      const byLocation = new Map<string, { qty: number; avail: number }>();
      (invRows || []).forEach((r: any) => {
        const prev = byLocation.get(r.location_id) || { qty: 0, avail: 0 };
        byLocation.set(r.location_id, { qty: prev.qty + (r.quantity || 0), avail: prev.avail + (r.available_quantity || 0) });
      });

      const totalOccupied = activeLocations.reduce((sum, l) => sum + (byLocation.get(l.id)?.avail || 0), 0);
      const occupancyTotalPct = totalCapacity > 0 ? (totalOccupied / totalCapacity) * 100 : 0;

      // Derivar zonas
      const zoneAgg = new Map<string, { capacity: number; occupied: number }>();
      activeLocations.forEach((l) => {
        const key = l.zone || 'SIN-ZONA';
        const prev = zoneAgg.get(key) || { capacity: 0, occupied: 0 };
        zoneAgg.set(key, {
          capacity: prev.capacity + (typeof l.capacity === 'number' ? l.capacity! : 0),
          occupied: prev.occupied + (byLocation.get(l.id)?.avail || 0),
        });
      });

      const palette = ['blue', 'green', 'purple', 'orange', 'teal', 'pink'];
      const zonesArray = Array.from(zoneAgg.entries()).map(([name, agg], idx) => ({
        name,
        occupancy: agg.occupied,
        capacity: agg.capacity,
        color: palette[idx % palette.length],
      }));

      // Zonas activas: zonas con al menos una ubicación activa
      const activeZones = zoneAgg.size;

      // Mantenimiento: ubicaciones inactivas o en cuarentena
      const maintenanceCount = (allLocations || []).filter(l => !l.is_active || (l.location_type || '').toLowerCase() === 'quarantine').length;

      // Eficiencia estimada: disponibilidad efectiva sobre cantidad total registrada
      const totalQty = (invRows || []).reduce((s, r: any) => s + (r.quantity || 0), 0);
      const totalAvail = (invRows || []).reduce((s, r: any) => s + (r.available_quantity || 0), 0);
      const efficiencyPct = totalQty > 0 ? (totalAvail / totalQty) * 100 : 0;

      setMetrics({
        occupancyTotal: occupancyTotalPct,
        activeZones,
        maintenanceCount,
        efficiency: efficiencyPct,
      });
      setZoneStats(zonesArray);
    } catch (e: any) {
      console.error('Error calculando analytics:', e);
      setError('No se pudo calcular métricas de ocupación');
    } finally {
      setLoading(false);
    }
  };

  const handleWarehouseChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedWarehouseId(id);
    if (id) await loadAnalytics(id);
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Análisis de Ocupación</h2>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Almacén:</label>
            <select
              className="border border-gray-300 rounded px-2 py-1 text-sm"
              value={selectedWarehouseId}
              onChange={handleWarehouseChange}
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ocupación Total</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.occupancyTotal.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Zonas Activas</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.activeZones}</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Settings className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">En Mantenimiento</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.maintenanceCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Map className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Eficiencia</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.efficiency.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Ocupación por Zona</h3>
          <div className="space-y-4">
            {zoneStats.map((zone, index) => {
              const percentage = zone.capacity > 0 ? (zone.occupancy / zone.capacity) * 100 : 0;
              return (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{zone.name}</span>
                      <span className="text-sm text-gray-500">
                        {Math.round(zone.occupancy)}/{zone.capacity} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`bg-${zone.color}-500 h-2 rounded-full transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {zoneStats.length === 0 && (
              <div className="p-4 text-sm text-gray-600">No hay ubicaciones activas en este almacén.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CapacityManagement() {
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Gestión de Capacidad</h2>
        <div className="text-gray-600">
          <p>Esta sección permitirá:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Definir capacidades por peso, volumen y tipo de contenedor</li>
            <li>Configurar reglas de slotting automático</li>
            <li>Optimizar ubicaciones según rotación y dimensiones</li>
            <li>Gestionar restricciones de productos peligrosos</li>
            <li>Simular escenarios de capacidad</li>
          </ul>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-800 font-medium">🚧 Módulo en desarrollo</p>
            <p className="text-blue-700 text-sm mt-1">
              Esta funcionalidad será implementada en la siguiente fase del proyecto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}