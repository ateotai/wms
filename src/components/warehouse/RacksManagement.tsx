import { useEffect, useState } from 'react';
import { Layers, RefreshCw, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Warehouse = { id: string; name: string; code: string; is_active: boolean };
type Location = { id: string; warehouse_id: string | null; rack: string | null; zone: string | null; aisle?: string | null };

type RackInfo = { name: string; locations: number; zones: string[] };

export function RacksManagement() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [racks, setRacks] = useState<RackInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zones, setZones] = useState<{ code: string; name: string | null }[]>([]);
  const [aisles, setAisles] = useState<string[]>([]);

  // Formulario de creación de racks
  const [form, setForm] = useState({
    zone: '',
    aisles: [] as string[],
    racks_count: 0,
    rack_prefix: 'R',
    levels: 0, // shelves_per_rack
    positions_per_level: 0, // bins_per_shelf
    capacity_max: 100,
    capacity_unit: 'piezas' as 'Kg' | 'm³' | 'cajas' | 'pallets' | 'piezas',
    location_type: 'storage' as 'receiving' | 'storage' | 'picking' | 'shipping' | 'quarantine',
  });

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('warehouses')
          .select('id, name, code, is_active')
          .eq('is_active', true)
          .order('name', { ascending: true });
        if (error) throw error;
        setWarehouses((data || []) as Warehouse[]);
        if (data && data.length) {
          setSelectedWarehouseId(data[0].id);
        }
      } catch (e: any) {
        setError(e?.message || 'Error cargando almacenes');
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedWarehouseId) return;
    loadRacks(selectedWarehouseId);
    loadZones(selectedWarehouseId);
    loadAisles(selectedWarehouseId, form.zone);
  }, [selectedWarehouseId]);

  useEffect(() => {
    if (!selectedWarehouseId) return;
    // Cuando cambia la zona, recargar pasillos disponibles
    loadAisles(selectedWarehouseId, form.zone);
  }, [form.zone]);

  const loadRacks = async (warehouseId: string) => {
    try {
      setLoading(true);
      setError(null);
      // Preferir backend con Service Role para evitar RLS
      const AUTH_BACKEND_URL = (import.meta as any).env?.VITE_AUTH_BACKEND_URL || '';
      const token = localStorage.getItem('app_token');
      let rows: Location[] = [];
      if (AUTH_BACKEND_URL && token) {
        try {
          const resp = await fetch(`${AUTH_BACKEND_URL}/locations?warehouse_id=${warehouseId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (resp.ok) {
            const json = await resp.json();
            const list = Array.isArray(json.locations) ? json.locations : [];
            rows = list.map((l: any) => ({
              id: String(l.id),
              warehouse_id: String(l.warehouse_id || ''),
              rack: l.rack || null,
              zone: l.zone || null,
              aisle: l.aisle || null,
            }));
          }
        } catch {}
      }
      // Fallback a Supabase si el backend no responde
      if (rows.length === 0) {
        const { data, error } = await supabase
          .from('locations')
          .select('id, warehouse_id, rack, zone, aisle')
          .eq('warehouse_id', warehouseId);
        if (error) throw error;
        rows = (data || []) as Location[];
      }
      const byRack = new Map<string, { locations: number; zones: Set<string> }>();
      rows.forEach((r) => {
        const key = (r.rack || '').trim();
        if (!key) return;
        const entry = byRack.get(key) || { locations: 0, zones: new Set<string>() };
        entry.locations += 1;
        if (r.zone) entry.zones.add(r.zone);
        byRack.set(key, entry);
      });
      const list: RackInfo[] = Array.from(byRack.entries()).map(([name, info]) => ({
        name,
        locations: info.locations,
        zones: Array.from(info.zones)
      }));
      list.sort((a, b) => a.name.localeCompare(b.name));
      setRacks(list);
    } catch (e: any) {
      setError(e?.message || 'Error cargando racks');
    } finally {
      setLoading(false);
    }
  };

  const loadZones = async (warehouseId: string) => {
    setZones([]);
    try {
      let query = supabase
        .from('zones')
        .select('code, name')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (warehouseId) query = query.eq('warehouse_id', warehouseId);
      const { data, error } = await query;
      if (!error && data) {
        setZones((data as any[]).map((z) => ({ code: String(z.code), name: z.name ? String(z.name) : null })));
        return;
      }
    } catch {
      // Fallback derivado desde locations
      try {
        const { data } = await supabase
          .from('locations')
          .select('zone')
          .eq('warehouse_id', warehouseId)
          .order('zone', { ascending: true });
        const codes = Array.from(new Set((data || []).map((l: any) => String(l.zone || '').trim()).filter(Boolean)));
        setZones(codes.map((code) => ({ code, name: code })));
      } catch { /* noop */ }
    }
  };

  const loadAisles = async (warehouseId: string, zoneCode?: string) => {
    setAisles([]);
    try {
      // Derivar pasillos desde locations, opcionalmente filtrando por zona
      const { data, error } = await supabase
        .from('locations')
        .select('aisle, zone')
        .eq('warehouse_id', warehouseId);
      if (error) throw error;
      const set = new Set<string>();
      (data || []).forEach((l: any) => {
        const z = String(l.zone || '').trim();
        const a = String(l.aisle || '').trim();
        if (!a) return;
        if (zoneCode && zoneCode.trim()) {
          if (z === zoneCode) set.add(a);
        } else {
          set.add(a);
        }
      });
      const list = Array.from(set.values()).sort((a, b) => a.localeCompare(b));
      setAisles(list);
    } catch {
      // Si no hay tabla o falla, dejar vacío
      setAisles([]);
    }
  };

  const createRacks = async () => {
    try {
      setError(null);
      if (!selectedWarehouseId) throw new Error('Seleccione un almacén');
      if (!form.zone) throw new Error('Seleccione una zona');
      if (!form.aisles.length) throw new Error('Seleccione al menos un pasillo');
      if (!form.racks_count || form.racks_count <= 0) throw new Error('Ingrese cantidad de racks (>0)');

      const AUTH_BACKEND_URL = (import.meta as any).env?.VITE_AUTH_BACKEND_URL || '';
      const token = localStorage.getItem('app_token');
      if (!AUTH_BACKEND_URL || !token) throw new Error('Backend no disponible o sin token');

      for (const aisle of form.aisles) {
        const payload = {
          warehouse_id: selectedWarehouseId,
          zone: form.zone,
          aisle,
          racks_count: form.racks_count,
          shelves_per_rack: form.levels,
          bins_per_shelf: form.positions_per_level,
          rack_prefix: form.rack_prefix,
          shelf_prefix: 'S',
          bin_prefix: 'B',
          location_type: form.location_type,
          capacity: form.capacity_max,
          // capacity_unit no está en el esquema actual; se omite en persistencia
        };
        const resp = await fetch(`${AUTH_BACKEND_URL}/locations/generate_by_aisle`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(`Error creando racks en pasillo ${aisle}: ${txt}`);
        }
      }

      // Refrescar y limpiar
      await loadRacks(selectedWarehouseId);
      setForm({
        zone: '',
        aisles: [],
        racks_count: 0,
        rack_prefix: 'R',
        levels: 0,
        positions_per_level: 0,
        capacity_max: 100,
        capacity_unit: 'piezas',
        location_type: 'storage',
      });
    } catch (e: any) {
      setError(e?.message || 'Error al crear racks');
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Layers className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Rack</h2>
          </div>
          <button
            onClick={() => loadRacks(selectedWarehouseId)}
            className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={!selectedWarehouseId || loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Recargar
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Almacén</label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Zona</label>
            <select
              value={form.zone}
              onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecciona zona</option>
              {zones.map((z) => (
                <option key={z.code} value={z.code}>{z.name || z.code}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Pasillos (multi)</label>
            <select
              multiple
              value={form.aisles}
              onChange={(e) => {
                const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
                setForm((f) => ({ ...f, aisles: opts }));
              }}
              className="w-full px-3 py-2 h-28 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {aisles.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Formulario de creación de racks */}
        <div className="px-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Crear Racks</span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Prefijo de Rack</label>
                <input
                  type="text"
                  value={form.rack_prefix}
                  onChange={(e) => setForm((f) => ({ ...f, rack_prefix: e.target.value || 'R' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad de Racks</label>
                <input
                  type="number"
                  min={0}
                  value={form.racks_count}
                  onChange={(e) => setForm((f) => ({ ...f, racks_count: parseInt(e.target.value || '0', 10) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Número de niveles</label>
                <input
                  type="number"
                  min={0}
                  value={form.levels}
                  onChange={(e) => setForm((f) => ({ ...f, levels: parseInt(e.target.value || '0', 10) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Posiciones por nivel</label>
                <input
                  type="number"
                  min={0}
                  value={form.positions_per_level}
                  onChange={(e) => setForm((f) => ({ ...f, positions_per_level: parseInt(e.target.value || '0', 10) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Capacidad máxima</label>
                <input
                  type="number"
                  min={0}
                  value={form.capacity_max}
                  onChange={(e) => setForm((f) => ({ ...f, capacity_max: parseInt(e.target.value || '0', 10) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Unidad de capacidad</label>
                <select
                  value={form.capacity_unit}
                  onChange={(e) => setForm((f) => ({ ...f, capacity_unit: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Kg">Kg</option>
                  <option value="m³">m³</option>
                  <option value="cajas">cajas</option>
                  <option value="pallets">pallets</option>
                  <option value="piezas">piezas</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={createRacks}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 mr-2" /> Crear Racks
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-4 mb-4 p-3 bg-red-50 text-red-700 text-sm rounded">{error}</div>
        )}

        <div className="p-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Lista de Rack</span>
              <span className="text-xs text-gray-500">{racks.length} registros</span>
            </div>
            <div className="divide-y divide-gray-200">
              {racks.map((r) => (
                <div key={r.name} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.name}</p>
                    <p className="text-xs text-gray-500">Zonas: {r.zones.join(', ') || '—'}</p>
                  </div>
                  <div className="text-sm text-gray-700">{r.locations} ubicaciones</div>
                </div>
              ))}
              {racks.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-gray-500">Sin datos de rack para este almacén</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}