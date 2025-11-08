import { useState, useRef, useEffect, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Settings,
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
  aisles: number;
  racks: number;
  locations: number;
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
  // Productos presentes en la ubicación (derivado opcional para panel de info)
  products?: string[];
}

interface AisleDerived {
  id: string; // aisle code
  zoneId: string; // zone code
  racks: number;
  locations: number;
  capacity: number;
  occupied: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RackDerived {
  id: string; // rack code
  zoneId: string;
  aisleId: string;
  capacity: number;
  occupied: number;
  rx: number; // posición relativa dentro del pasillo
  ry: number; // posición relativa dentro del pasillo
  width: number;
  height: number;
}

export function WarehouseMap() {
  const [zoom, setZoom] = useState(1);
  const [selectedZone, setSelectedZone] = useState<ZoneDerived | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationDerived | null>(null);
  const [viewMode, setViewMode] = useState<'zones' | 'aisles' | 'locations' | 'heatmap'>('zones');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zones, setZones] = useState<ZoneDerived[]>([]);
  const [locations, setLocations] = useState<LocationDerived[]>([]);
  const [aisles, setAisles] = useState<AisleDerived[]>([]);
  const [selectedAisle, setSelectedAisle] = useState<AisleDerived | null>(null);
  const [racksByAisle, setRacksByAisle] = useState<Record<string, RackDerived[]>>({});
  const [selectedRack, setSelectedRack] = useState<RackDerived | null>(null);
  interface RackPositionDerived { id: string; code: string; capacity: number; occupied: number; rx: number; ry: number; width: number; height: number; }
  const [positionsByRack, setPositionsByRack] = useState<Record<string, RackPositionDerived[]>>({});
  const [selectedPosition, setSelectedPosition] = useState<RackPositionDerived | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Intentar cargar ubicaciones desde Supabase; si no hay datos, usar backend
        let dbLocations: DBLocation[] = [];
        try {
          const { data, error: locError } = await supabase
            .from('locations')
            .select('id, warehouse_id, code, name, zone, aisle, rack, shelf, bin, capacity, is_active, location_type');
          if (!locError && data) {
            dbLocations = (data as any[]) as DBLocation[];
          }
        } catch {}

        if (!dbLocations || dbLocations.length === 0) {
          const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
          const token = localStorage.getItem('app_token');
          if (AUTH_BACKEND_URL) {
            try {
              const resp = await fetch(`${AUTH_BACKEND_URL}/locations`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
              });
              if (resp.ok) {
                const json = await resp.json();
                const list = Array.isArray(json.locations) ? json.locations : [];
                dbLocations = list.map((l: any) => ({
                  id: String(l.id),
                  warehouse_id: l.warehouse_id != null ? String(l.warehouse_id) : null,
                  code: String(l.code ?? ''),
                  name: l.name != null ? String(l.name) : null,
                  zone: l.zone != null ? String(l.zone) : null,
                  aisle: l.aisle != null ? String(l.aisle) : null,
                  rack: l.rack != null ? String(l.rack) : null,
                  shelf: l.shelf != null ? String(l.shelf) : null,
                  bin: l.bin != null ? String(l.bin) : null,
                  location_type: l.location_type ?? undefined,
                  capacity: typeof l.capacity === 'number' ? l.capacity : Number(l.capacity ?? 0),
                  is_active: l.is_active ?? true
                }));
              }
            } catch (e) {
              console.warn('Backend locations no disponible:', e);
            }
          }
        }

        // Cargar inventario para calcular ocupación por ubicación (Supabase → backend fallback)
        let dbInventory: InventoryByLocation[] = [];
        try {
          const { data, error: invError } = await supabase
            .from('inventory')
            .select('location_id, quantity, reserved_quantity, available_quantity');
          if (!invError && data) {
            dbInventory = (data as any[]) as InventoryByLocation[];
          }
        } catch {}

        // Si no hay inventario desde Supabase, intentar backend
        // Nota: el endpoint /inventory/list suele incluir location_id; si no, se utilizará location_code
        let invByCode = new Map<string, number>();
        if (!dbInventory || dbInventory.length === 0) {
          const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
          const token = localStorage.getItem('app_token');
          if (AUTH_BACKEND_URL) {
            try {
              const qs = new URLSearchParams();
              qs.set('limit', '2000');
              const resp = await fetch(`${AUTH_BACKEND_URL}/inventory/list?${qs.toString()}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
              });
              if (resp.ok) {
                const json = await resp.json();
                const rows = Array.isArray(json.inventory) ? json.inventory : [];
                const tmp: InventoryByLocation[] = [];
                rows.forEach((r: any) => {
                  const hasId = r.location_id != null || r.locationId != null;
                  const locId = hasId ? String(r.location_id ?? r.locationId) : null;
                  const available = Number(r.available_quantity ?? r.availableQuantity ?? r.quantity ?? 0);
                  if (hasId) {
                    tmp.push({
                      location_id: locId,
                      quantity: Number(r.quantity ?? 0),
                      reserved_quantity: Number(r.reserved_quantity ?? r.reservedQuantity ?? 0),
                      available_quantity: available
                    });
                  } else {
                    const codeNorm = String(r.location_code ?? r.locations?.code ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
                    if (codeNorm) invByCode.set(codeNorm, (invByCode.get(codeNorm) || 0) + available);
                  }
                });
                if (tmp.length > 0) dbInventory = tmp;
              }
            } catch (e) {
              console.warn('Backend inventory no disponible:', e);
            }
          }
        }

        const inventoryByLocationMap = new Map<string, InventoryByLocation>();
        (dbInventory || []).forEach((inv: InventoryByLocation) => {
          if (inv.location_id) {
            inventoryByLocationMap.set(inv.location_id, inv);
          }
        });

        // Helper para normalizar códigos (quita acentos, trim y mayúsculas)
        const normalizeCode = (s?: string | null) => {
          const base = (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          return base ? base.toUpperCase() : '';
        };

        // Agregaciones por zona (capacidad, ocupación, conteos)
        const zoneAgg = new Map<string, { capacity: number; occupied: number; activeCount: number; aisles: Set<string>; racks: Set<string> }>();

        // Helper para obtener ocupación por ubicación: usar mapa por id, y si no, por código
        const getOccupiedForLoc = (loc: DBLocation) => {
          const byId = loc.id ? inventoryByLocationMap.get(loc.id) : undefined;
          if (byId) return Number(byId.available_quantity ?? 0);
          const codeNorm = normalizeCode(loc.code);
          if (codeNorm && invByCode.size > 0) return Number(invByCode.get(codeNorm) || 0);
          return 0;
        };

        // Derivar posiciones para ubicaciones (grid simple)
        const derivedLocations: LocationDerived[] = (dbLocations || []).map((loc: DBLocation, index: number) => {
          const capacity = Number(loc.capacity ?? 0);
          const occupied = getOccupiedForLoc(loc);

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

        // Derivar pasillos por zona desde locations (usando ocupación derivada)
        const byAisleKey = new Map<string, { zoneId: string; racks: Set<string>; count: number; capacity: number; occupied: number }>();
        (dbLocations || []).forEach((loc) => {
          const zoneKeyNorm = normalizeCode(loc.zone) || 'SIN-ZONA';
          const aisleKeyRaw = (loc.aisle || '').trim();
          if (!aisleKeyRaw) return;
          const key = `${zoneKeyNorm}__${aisleKeyRaw}`;
          const occupiedLoc = getOccupiedForLoc(loc);
          const prev = byAisleKey.get(key) || { zoneId: zoneKeyNorm, racks: new Set<string>(), count: 0, capacity: 0, occupied: 0 };
          if (loc.rack) prev.racks.add(String(loc.rack));
          prev.count += 1;
          prev.capacity += (loc.capacity ?? 0) as number;
          prev.occupied += occupiedLoc as number;
          byAisleKey.set(key, prev);
        });

        const derivedAisles: AisleDerived[] = Array.from(byAisleKey.entries()).map(([key, agg], idx) => {
          const cols = 8;
          const cellW = 120;
          const cellH = 70;
          const gap = 10;
          const row = Math.floor(idx / cols);
          const col = idx % cols;
          const x = 20 + col * (cellW + gap);
          const y = 60 + row * (cellH + gap);
          const aisleCode = key.split('__')[1];
          return {
            id: aisleCode,
            zoneId: agg.zoneId,
            racks: agg.racks.size,
            locations: agg.count,
            capacity: agg.capacity,
            occupied: agg.occupied,
            x,
            y,
            width: cellW,
            height: cellH,
          };
        });

        setAisles(derivedAisles);

        // Agregar racks por pasillo y calcular posiciones relativas dentro del pasillo
        const rackAgg = new Map<string, { zoneId: string; aisleId: string; rackId: string; capacity: number; occupied: number; count: number }>();
        (dbLocations || []).forEach((loc) => {
          const zoneKeyNorm = normalizeCode(loc.zone) || 'SIN-ZONA';
          const aisleKeyRaw = (loc.aisle || '').trim();
          const rackKeyRaw = (loc.rack || '').trim();
          if (!aisleKeyRaw || !rackKeyRaw) return;
          const key = `${zoneKeyNorm}__${aisleKeyRaw}__${rackKeyRaw}`;
          const prev = rackAgg.get(key) || { zoneId: zoneKeyNorm, aisleId: aisleKeyRaw, rackId: rackKeyRaw, capacity: 0, occupied: 0, count: 0 };
          prev.capacity += Number(loc.capacity ?? 0);
          prev.occupied += getOccupiedForLoc(loc);
          prev.count += 1;
          rackAgg.set(key, prev);
        });

        const nextRacksByAisle: Record<string, RackDerived[]> = {};
        derivedAisles.forEach((aisle) => {
          const keyPrefix = `${aisle.zoneId}__${aisle.id}__`;
          const racksForAisle = Array.from(rackAgg.entries())
            .filter(([key]) => key.startsWith(keyPrefix))
            .map(([_, agg]) => agg);
          const n = racksForAisle.length;
          if (n === 0) {
            nextRacksByAisle[`${aisle.zoneId}__${aisle.id}`] = [];
            return;
          }
          const padding = 6;
          const gap = 4;
          const cols = n >= 6 ? 3 : 2;
          const rows = Math.ceil(n / cols);
          const rackW = Math.max(16, (aisle.width - padding * 2 - gap * (cols - 1)) / cols);
          const rackH = Math.max(14, (aisle.height - padding * 2 - gap * (rows - 1)) / rows);
          const boxes: RackDerived[] = racksForAisle.map((agg, idx) => {
            const rRow = Math.floor(idx / cols);
            const rCol = idx % cols;
            const rx = padding + rCol * (rackW + gap);
            const ry = padding + rRow * (rackH + gap);
            return {
              id: agg.rackId,
              zoneId: agg.zoneId,
              aisleId: agg.aisleId,
              capacity: agg.capacity,
              occupied: agg.occupied,
              rx,
              ry,
              width: rackW,
              height: rackH,
            };
          });
          nextRacksByAisle[`${aisle.zoneId}__${aisle.id}`] = boxes;
        });

        setRacksByAisle(nextRacksByAisle);

        // Derivar posiciones por rack (ubicaciones dentro del rack) con layout relativo
        const locsByRack = new Map<string, Array<{ code: string; capacity: number; occupied: number }>>();
        (dbLocations || []).forEach((loc) => {
          const zoneKeyNorm = normalizeCode(loc.zone) || 'SIN-ZONA';
          const aisleKeyRaw = (loc.aisle || '').trim();
          const rackKeyRaw = (loc.rack || '').trim();
          if (!aisleKeyRaw || !rackKeyRaw) return;
          const key = `${zoneKeyNorm}__${aisleKeyRaw}__${rackKeyRaw}`;
          const occupiedLoc = getOccupiedForLoc(loc);
          const arr = locsByRack.get(key) || [];
          arr.push({ code: String(loc.code || ''), capacity: Number(loc.capacity ?? 0), occupied: Number(occupiedLoc ?? 0) });
          locsByRack.set(key, arr);
        });

        const nextPositionsByRack: Record<string, RackPositionDerived[]> = {};
        Object.entries(nextRacksByAisle).forEach(([aisleKey, rackBoxes]) => {
          rackBoxes.forEach((box) => {
            const rackKey = `${box.zoneId}__${box.aisleId}__${box.id}`;
            const locs = locsByRack.get(rackKey) || [];
            const n = locs.length;
            if (n === 0) {
              nextPositionsByRack[rackKey] = [];
              return;
            }
            const padding = 4;
            const gap = 2;
            const cols = n >= 12 ? 4 : n >= 6 ? 3 : 2;
            const rows = Math.ceil(n / cols);
            const slotW = Math.max(10, (box.width - padding * 2 - gap * (cols - 1)) / cols);
            const slotH = Math.max(10, (box.height - padding * 2 - gap * (rows - 1)) / rows);
            const slots: RackPositionDerived[] = locs.map((l, idx) => {
              const rRow = Math.floor(idx / cols);
              const rCol = idx % cols;
              const rx = box.rx + padding + rCol * (slotW + gap);
              const ry = box.ry + padding + rRow * (slotH + gap);
              return { id: `${rackKey}__${idx}`, code: l.code, capacity: l.capacity, occupied: l.occupied, rx, ry, width: slotW, height: slotH };
            });
            nextPositionsByRack[rackKey] = slots;
          });
        });

        setPositionsByRack(nextPositionsByRack);

        // Derivar zonas agrupando por "zone" desde ubicaciones originales (usando ocupación derivada)
        (dbLocations || []).forEach((loc) => {
          const zoneKeyNorm = normalizeCode(loc.zone) || 'SIN-ZONA';
          const prev = zoneAgg.get(zoneKeyNorm) || { capacity: 0, occupied: 0, activeCount: 0, aisles: new Set<string>(), racks: new Set<string>() };
          prev.capacity += (loc.capacity ?? 0) as number;
          prev.occupied += getOccupiedForLoc(loc) as number;
          prev.activeCount += 1;
          if (loc.aisle) prev.aisles.add(String(loc.aisle));
          if (loc.rack) prev.racks.add(String(loc.rack));
          zoneAgg.set(zoneKeyNorm, prev);
        });

        const derivedZonesFromLocations: ZoneDerived[] = Array.from(zoneAgg.entries()).map(([zoneCodeNorm, agg]) => {
          const utilization = agg.capacity > 0 ? agg.occupied / agg.capacity : 0;
          const type: ZoneDerived['type'] = zoneCodeNorm.toUpperCase().includes('REC')
            ? 'receiving'
            : zoneCodeNorm.toUpperCase().includes('PICK')
            ? 'picking'
            : zoneCodeNorm.toUpperCase().includes('SHIP')
            ? 'shipping'
            : 'storage';

          const status: ZoneDerived['status'] = utilization >= 1
            ? 'blocked'
            : utilization >= 0.8
            ? 'maintenance'
            : 'active';

          return {
            id: zoneCodeNorm,
            name: zoneCodeNorm === 'SIN-ZONA' ? 'Sin Zona' : `Zona ${zoneCodeNorm}`,
            type,
            capacity: agg.capacity,
            occupied: agg.occupied,
            status,
            aisles: agg.aisles.size,
            racks: agg.racks.size,
            locations: agg.activeCount
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
              const codeNorm = normalizeCode(z.code) || 'SIN-ZONA';
              const existing = byCode.get(codeNorm);
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
                byCode.set(codeNorm, existing);
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

                byCode.set(codeNorm, {
                  id: codeNorm,
                  name: z.name || `Zona ${z.code}`,
                  type: mappedType,
                  capacity,
                  occupied,
                  status,
                  aisles: 0,
                  racks: 0,
                  locations: 0
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
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error desconocido';
        console.error('Error cargando layout de almacén:', message);
        setError('Error al cargar datos de almacén');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getZoneColor = (zone: ZoneDerived) => {
    const occupancyRate = zone.capacity > 0 ? zone.occupied / zone.capacity : 0;
    
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

  const getLocationColor = (location: LocationDerived) => {
    const occupancyRate = location.capacity > 0 ? location.occupied / location.capacity : 0;
    
    if (occupancyRate === 1) return 'bg-red-400 border-red-600';
    if (occupancyRate > 0.8) return 'bg-yellow-400 border-yellow-600';
    if (occupancyRate > 0.5) return 'bg-green-400 border-green-600';
    return 'bg-blue-400 border-blue-600';
  };

  const getAisleColor = (aisle: AisleDerived) => {
    const rate = aisle.capacity > 0 ? aisle.occupied / aisle.capacity : 0;
    if (rate >= 1) return 'bg-red-200 border-red-400';
    if (rate > 0.8) return 'bg-yellow-200 border-yellow-400';
    if (rate > 0.5) return 'bg-green-200 border-green-400';
    return 'bg-blue-200 border-blue-400';
  };

  const getRackColor = (rack: RackDerived) => {
    const rate = rack.capacity > 0 ? rack.occupied / rack.capacity : 0;
    if (rate >= 1) return 'bg-red-300 border-red-500';
    if (rate > 0.8) return 'bg-yellow-300 border-yellow-500';
    if (rate > 0.5) return 'bg-green-300 border-green-500';
    return 'bg-blue-300 border-blue-500';
  };

  const getPositionColor = (pos: RackPositionDerived) => {
    const rate = pos.capacity > 0 ? pos.occupied / pos.capacity : 0;
    if (rate >= 1) return 'bg-red-400 border-red-600';
    if (rate > 0.8) return 'bg-yellow-400 border-yellow-600';
    if (rate > 0.5) return 'bg-green-400 border-green-600';
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
          {([
            { id: 'zones', label: 'Zonas' },
            { id: 'aisles', label: 'Pasillos' },
            { id: 'locations', label: 'Ubicaciones' },
            { id: 'heatmap', label: 'Mapa de Calor' }
          ] as Array<{ id: 'zones' | 'aisles' | 'locations' | 'heatmap'; label: string }>).map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Map Container */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {loading && (
              <div className="p-3 text-sm text-gray-600">Cargando layout de almacén...</div>
            )}
            {error && (
              <div className="p-3 text-sm text-red-600">{error}</div>
            )}
            <div 
              ref={mapRef}
              className="relative bg-gray-50 overflow-auto"
              style={{ height: '600px' }}
            >
              {/** Dimensiones dinámicas del lienzo según la vista actual **/}
              {/** Zonas: 4 columnas, 200x (gap 16), filas con cell alto 120 (gap 20) **/}
              {/** Pasillos: 8 columnas, 120x (gap 10), filas con cell alto 70 (gap 10) **/}
              {/** Ubicaciones: 12 columnas, 40x (gap 8), filas con cell alto 30 (gap 8) **/}
              {/** Márgenes: left 20/40, top 60, right 40, bottom 60 **/}
              {/** En heatmap, usar tamaño base **/}
              constDims
              
              {/* calcular dimensiones según datos visibles */}
              {/** useMemo para evitar recalcular en cada render **/}
              
              
              
              <div
                className="relative"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  width: `${(function(){
                    const baseRight = 40; const topMargin = 60; const leftMarginZones = 40; const leftMarginDefault = 20;
                    if (viewMode === 'zones') {
                      const cols = 4; const cellW = 200; const gapX = 16; const usedCols = Math.max(1, Math.min(cols, zones.length || cols));
                      const w = leftMarginZones + usedCols * (cellW + gapX) - gapX + baseRight; 
                      return Math.max(w, 1000);
                    }
                    if (viewMode === 'aisles') {
                      const cols = 8; const cellW = 120; const gapX = 10; const visible = (selectedZone ? aisles.filter(a=>a.zoneId===selectedZone.id) : aisles).length;
                      const usedCols = Math.max(1, Math.min(cols, visible || cols));
                      const w = leftMarginDefault + usedCols * (cellW + gapX) - gapX + baseRight;
                      return Math.max(w, 1000);
                    }
                    if (viewMode === 'locations') {
                      const cols = 12; const cellW = 40; const gapX = 8; const usedCols = Math.max(1, Math.min(cols, locations.length || cols));
                      const w = leftMarginDefault + usedCols * (cellW + gapX) - gapX + baseRight;
                      return Math.max(w, 900);
                    }
                    return 1000;
                  })()}px`,
                  height: `${(function(){
                    const topMargin = 60; const bottomMargin = 60;
                    if (viewMode === 'zones') {
                      const cols = 4; const cellH = 120; const gapY = 20; const rows = Math.max(1, Math.ceil((zones.length || 1)/cols));
                      const h = topMargin + rows * (cellH + gapY) - gapY + bottomMargin;
                      return Math.max(h, 500);
                    }
                    if (viewMode === 'aisles') {
                      const cols = 8; const cellH = 70; const gapY = 10; const visible = (selectedZone ? aisles.filter(a=>a.zoneId===selectedZone.id) : aisles).length; const rows = Math.max(1, Math.ceil((visible || 1)/cols));
                      const h = topMargin + rows * (cellH + gapY) - gapY + bottomMargin;
                      return Math.max(h, 500);
                    }
                    if (viewMode === 'locations') {
                      const cols = 12; const cellH = 30; const gapY = 8; const rows = Math.max(1, Math.ceil((locations.length || 1)/cols));
                      const h = topMargin + rows * (cellH + gapY) - gapY + bottomMargin;
                      return Math.max(h, 500);
                    }
                    return 600;
                  })()}px`
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
                      left: 40 + (idx % 4) * (200 + 16),
                      top: 60 + Math.floor(idx / 4) * (120 + 20),
                      width: 200,
                      height: 110
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {zone.capacity > 0 ? Math.round((zone.occupied / zone.capacity) * 100) : 0}%
                          </span>
                          <span className="text-[10px] text-gray-600">· Pasillos {zone.aisles} · Racks {zone.racks} · Ubic {zone.locations}</span>
                        </div>
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

                {/* Aisles (derivados por zona) */}
                {viewMode === 'aisles' && (aisles.filter(a => !selectedZone || a.zoneId === selectedZone.id)).map((aisle) => (
                  <div
                    key={`${aisle.zoneId}-${aisle.id}`}
                    className={`absolute border-2 rounded cursor-pointer transition-all hover:shadow-md ${getAisleColor(aisle)} ${selectedAisle?.id === aisle.id && selectedAisle?.zoneId === aisle.zoneId ? 'ring-2 ring-blue-500' : ''} relative`}
                    style={{
                      left: aisle.x,
                      top: aisle.y,
                      width: aisle.width,
                      height: aisle.height
                    }}
                    onClick={() => setSelectedAisle(aisle)}
                  >
                    {/* Racks dentro del pasillo */}
                    <div className="absolute inset-0 z-0">
                      {(racksByAisle[`${aisle.zoneId}__${aisle.id}`] || []).map((rack) => (
                        <div
                          key={`${aisle.zoneId}-${aisle.id}-${rack.id}`}
                          className={`absolute ${getRackColor(rack)} border rounded-sm ${selectedRack && selectedRack.id === rack.id && selectedRack.zoneId === rack.zoneId && selectedRack.aisleId === rack.aisleId ? 'ring-2 ring-blue-500' : ''}`}
                          style={{ left: rack.rx, top: rack.ry, width: rack.width, height: rack.height }}
                          title={`Rack ${rack.id}: ${rack.occupied}/${rack.capacity}`}
                          onClick={(e) => { e.stopPropagation(); setSelectedAisle(aisle); setSelectedRack(rack); }}
                        >
                          {selectedRack && selectedRack.id === rack.id && selectedRack.zoneId === rack.zoneId && selectedRack.aisleId === rack.aisleId && (
                            <div className="absolute inset-0 p-1">
                              {(positionsByRack[`${rack.zoneId}__${rack.aisleId}__${rack.id}`] || []).map((p) => (
                                <div
                                  key={p.id}
                                  className={`absolute ${getPositionColor(p)} border rounded-sm flex items-center justify-center`}
                                  style={{ left: p.rx - rack.rx, top: p.ry - rack.ry, width: p.width, height: p.height }}
                                  title={`${p.code}: ${p.occupied}/${p.capacity}`}
                                  onClick={(e) => { e.stopPropagation(); setSelectedPosition(p); }}
                                >
                                  <span className="text-[9px] text-white font-medium truncate px-0.5">{p.code}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="p-2 h-full flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-gray-800">{aisle.zoneId} · Pasillo {aisle.id}</h4>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] text-gray-600">Racks {aisle.racks} · Ubic {aisle.locations} · {aisle.capacity > 0 ? Math.round((aisle.occupied / aisle.capacity) * 100) : 0}%</span>
                      </div>
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
              {viewMode === 'aisles' && (
                <>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-200 border border-blue-400 rounded"></div>
                    <span className="text-xs text-gray-600">Utilización ≤ 50%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-200 border border-green-400 rounded"></div>
                    <span className="text-xs text-gray-600">Utilización 50-80%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-yellow-200 border border-yellow-400 rounded"></div>
                    <span className="text-xs text-gray-600">Utilización 80-100%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-200 border border-red-400 rounded"></div>
                    <span className="text-xs text-gray-600">Completo</span>
                  </div>
                  <p className="text-[11px] text-gray-500">Selecciona una zona y cambia a Pasillos para filtrar.</p>
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
                    {selectedZone.capacity > 0 ? Math.round((selectedZone.occupied / selectedZone.capacity) * 100) : 0}%
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div>
                    <span className="text-xs font-medium text-gray-500">Pasillos</span>
                    <p className="text-sm text-gray-900">{selectedZone.aisles}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500">Racks</span>
                    <p className="text-sm text-gray-900">{selectedZone.racks}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500">Ubicaciones</span>
                    <p className="text-sm text-gray-900">{selectedZone.locations}</p>
                  </div>
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
                <div className="pt-2">
                  <button
                    onClick={() => setViewMode('aisles')}
                    className="inline-flex items-center px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Ver pasillos de esta zona
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedAisle && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Información de Pasillo</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-xs font-medium text-gray-500">Zona:</span>
                  <p className="text-sm text-gray-900">{selectedAisle.zoneId}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">Pasillo:</span>
                  <p className="text-sm text-gray-900">{selectedAisle.id}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div>
                    <span className="text-xs font-medium text-gray-500">Racks</span>
                    <p className="text-sm text-gray-900">{selectedAisle.racks}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500">Ubicaciones</span>
                    <p className="text-sm text-gray-900">{selectedAisle.locations}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500">Utilización</span>
                    <p className="text-sm text-gray-900">{selectedAisle.capacity > 0 ? Math.round((selectedAisle.occupied / selectedAisle.capacity) * 100) : 0}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedRack && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Información de Rack</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs font-medium text-gray-500">Zona</span>
                    <p className="text-sm text-gray-900">{selectedRack.zoneId}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500">Pasillo</span>
                    <p className="text-sm text-gray-900">{selectedRack.aisleId}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div>
                    <span className="text-xs font-medium text-gray-500">Rack</span>
                    <p className="text-sm text-gray-900">{selectedRack.id}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500">Capacidad</span>
                    <p className="text-sm text-gray-900">{selectedRack.capacity}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500">Ocupado</span>
                    <p className="text-sm text-gray-900">{selectedRack.occupied}</p>
                  </div>
                </div>
                <div className="pt-2">
                  <span className="text-xs font-medium text-gray-500">Posiciones</span>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(positionsByRack[`${selectedRack.zoneId}__${selectedRack.aisleId}__${selectedRack.id}`] || []).map((p) => (
                      <button
                        key={p.id}
                        className={`inline-flex items-center bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded hover:bg-gray-200 ${selectedPosition && selectedPosition.id === p.id ? 'ring-2 ring-blue-500' : ''}`}
                        onClick={() => setSelectedPosition(p)}
                        title={`${p.code}: ${p.occupied}/${p.capacity}`}
                      >
                        {p.code || '—'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedPosition && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Detalle de Posición</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs font-medium text-gray-500">Código</span>
                    <p className="text-sm text-gray-900">{selectedPosition.code}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500">Utilización</span>
                    <p className="text-sm text-gray-900">{selectedPosition.capacity > 0 ? Math.round((selectedPosition.occupied / selectedPosition.capacity) * 100) : 0}%</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs font-medium text-gray-500">Capacidad</span>
                    <p className="text-sm text-gray-900">{selectedPosition.capacity}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500">Ocupado</span>
                    <p className="text-sm text-gray-900">{selectedPosition.occupied}</p>
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