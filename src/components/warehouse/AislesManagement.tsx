import { useEffect, useState } from 'react';
import { Rows, RefreshCw, Plus, Save, Eye, Pencil, Trash, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Warehouse = { id: string; name: string; code: string; is_active: boolean };
type Location = { id: string; warehouse_id: string | null; aisle: string | null; zone: string | null; rack?: string | null; shelf?: string | number | null; bin?: string | number | null };

type AisleInfo = { name: string; locations: number; zones: string[]; racks: number; rackCodes?: string[]; rackLevels?: Record<string, number>; rackPositions?: Record<string, number> };

export function AislesManagement() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [aisles, setAisles] = useState<AisleInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zones, setZones] = useState<{ code: string; name: string | null }[]>([]);
  
  // Estados para renglones inline por pasillo y despliegue de racks
  type InlineRow = {
    zone: string;
    levels: number;
    positionsPerLevel: number;
    capacityMax: number;
    capacityUnit: 'Kg' | 'm³' | 'cajas' | 'pallets' | 'piezas';
    isActive: boolean;
    racksQuantity: number;
    rackPrefix: string;
    rackDigits: number;
  };
  const [inlineRows, setInlineRows] = useState<Record<string, InlineRow[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [rackMetaEdits, setRackMetaEdits] = useState<Record<string, { capacity: number; unit: 'Kg' | 'm³' | 'cajas' | 'pallets' | 'piezas'; isActive: boolean }>>({});
  const [editingRack, setEditingRack] = useState<Record<string, boolean>>({});
  

  // Formulario de generación por pasillo
  const [genForm, setGenForm] = useState({
    zone: '',
    aisle: '', // prefijo de pasillo (ej. A)
    racks_count: 1,
    shelves_per_rack: 0,
    bins_per_shelf: 0,
    location_type: 'storage' as 'receiving' | 'storage' | 'picking' | 'shipping' | 'quarantine',
  });

  // Normaliza entrada de pasillo: "A-1" -> "A-01", "a01" -> "A-01"
  const normalizeAisleInput = (input: string) => {
    const raw = String(input || '').trim().toUpperCase();
    const m = raw.match(/^([A-Z]+)[\s-]*(\d+)?$/);
    if (!m) return raw;
    const prefix = m[1];
    const numRaw = m[2];
    if (!numRaw) return prefix;
    const num = Number.parseInt(numRaw, 10);
    if (Number.isNaN(num)) return prefix;
    const padded = String(num).padStart(2, '0');
    return `${prefix}-${padded}`;
  };

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
    loadAisles(selectedWarehouseId);
  }, [selectedWarehouseId]);

  const loadAisles = async (warehouseId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Preferir backend con Service Role para evitar bloqueos por RLS
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
              aisle: l.aisle || null,
              zone: l.zone || null,
              rack: l.rack || null,
              shelf: l.shelf ?? null,
              bin: l.bin ?? null,
            }));
          }
        } catch {}
      }

      // Fallback a Supabase si no hay backend o falla la llamada
      if (rows.length === 0) {
        const { data, error } = await supabase
          .from('locations')
          .select('id, warehouse_id, aisle, zone, rack, shelf, bin')
          .eq('warehouse_id', warehouseId);
        if (error) throw error;
        rows = (data || []) as Location[];
      }

      const byAisle = new Map<string, { locations: number; zones: Set<string>; racks: Set<string>; rackLevels: Map<string, Set<string | number>>; rackPositions: Map<string, number> }>();
      rows.forEach((r) => {
        const key = (r.aisle || '').trim();
        if (!key) return;
        const entry = byAisle.get(key) || { locations: 0, zones: new Set<string>(), racks: new Set<string>(), rackLevels: new Map(), rackPositions: new Map() };
        entry.locations += 1;
        if (r.zone) entry.zones.add(r.zone);
        if (r.rack) entry.racks.add(String(r.rack));
        const rackCode = (r.rack || '').trim();
        if (rackCode) {
          const setLvls = entry.rackLevels.get(rackCode) || new Set<string | number>();
          const lvl = (r.shelf ?? '').toString();
          if (lvl) setLvls.add(lvl);
          entry.rackLevels.set(rackCode, setLvls);
          const prevPos = entry.rackPositions.get(rackCode) || 0;
          entry.rackPositions.set(rackCode, prevPos + 1);
        }
        byAisle.set(key, entry);
      });
      const list: AisleInfo[] = Array.from(byAisle.entries()).map(([name, info]) => ({
        name,
        locations: info.locations,
        zones: Array.from(info.zones),
        racks: info.racks.size,
        rackCodes: Array.from(info.racks),
        rackLevels: Array.from(info.racks).reduce((acc, code) => ({ ...acc, [code]: (info.rackLevels.get(code)?.size || 0) }), {} as Record<string, number>),
        rackPositions: Array.from(info.racks).reduce((acc, code) => ({ ...acc, [code]: (info.rackPositions.get(code) || 0) }), {} as Record<string, number>),
      }));
      list.sort((a, b) => a.name.localeCompare(b.name));
      setAisles(list);
    } catch (e: any) {
      setError(e?.message || 'Error cargando pasillos');
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

  useEffect(() => {
    if (!selectedWarehouseId) return;
    loadZones(selectedWarehouseId);
  }, [selectedWarehouseId]);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
      const token = localStorage.getItem('app_token');
      if (!AUTH_BACKEND_URL || !token) throw new Error('Backend de autenticación no configurado o sesión inválida');

      const payload = {
        warehouse_id: selectedWarehouseId,
        zone: genForm.zone || null,
        aisle: genForm.aisle, // usamos el prefijo como código de pasillo
        racks_count: Number(genForm.racks_count || 1),
        shelves_per_rack: Number(genForm.shelves_per_rack) || 0,
        bins_per_shelf: Number(genForm.bins_per_shelf) || 0,
        location_type: genForm.location_type,
      };

      const resp = await fetch(`${AUTH_BACKEND_URL}/locations/generate_by_aisle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        throw new Error((data && data.error) || 'No se pudo generar ubicaciones');
      }

      // Recargar listado de pasillos
      await loadAisles(selectedWarehouseId);
      // Reset ligero
      setGenForm((p) => ({ ...p, aisle: '', racks_count: 0, shelves_per_rack: 0, bins_per_shelf: 0 }));
    } catch (e: any) {
      setError(e?.message || 'Error generando ubicaciones');
    } finally {
      setLoading(false);
    }
  };

  const addRowForAisle = (aisleName: string, zonesForAisle: string[]) => {
    setInlineRows((prev) => {
      const rows = prev[aisleName] ? [...prev[aisleName]] : [];
      rows.push({
        zone: zonesForAisle[0] || '',
        levels: 0,
        positionsPerLevel: 0,
        capacityMax: 100,
        capacityUnit: 'piezas',
        isActive: true,
        racksQuantity: 1,
        rackPrefix: 'R',
        rackDigits: 2,
      });
      return { ...prev, [aisleName]: rows };
    });
  };

  const updateInlineRow = (aisleName: string, index: number, next: Partial<InlineRow>) => {
    setInlineRows((prev) => {
      const rows = [...(prev[aisleName] || [])];
      rows[index] = { ...rows[index], ...next } as InlineRow;
      return { ...prev, [aisleName]: rows };
    });
  };

  const saveInlineRow = async (aisleName: string, index: number) => {
    try {
      setError(null);
      if (!selectedWarehouseId) throw new Error('Seleccione un almacén');
      const row = (inlineRows[aisleName] || [])[index];
      if (!row) throw new Error('Formulario inválido');
      const zoneSel = row.zone || '';
      if (!zoneSel) throw new Error('Seleccione zona');

      const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
      const token = localStorage.getItem('app_token');
      if (!AUTH_BACKEND_URL || !token) throw new Error('Backend no disponible o sesión inválida');

      const payload = {
        warehouse_id: selectedWarehouseId,
        zone: zoneSel,
        aisle: aisleName,
        racks_count: row.racksQuantity || 1,
        shelves_per_rack: row.levels || 0,
        bins_per_shelf: row.positionsPerLevel || 0,
        rack_prefix: row.rackPrefix || 'R',
        shelf_prefix: 'S',
        bin_prefix: 'B',
        location_type: 'storage',
        capacity: row.capacityMax || 0,
        is_active: row.isActive,
        code_padding: { rack: row.rackDigits || 2, shelf: 2, bin: 2 },
      };

      const resp = await fetch(`${AUTH_BACKEND_URL}/locations/generate_by_aisle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Error creando racks en pasillo ${aisleName}: ${txt}`);
      }

      // Quitar el renglón al guardar y refrescar lista
      setInlineRows((prev) => {
        const rows = [...(prev[aisleName] || [])];
        rows.splice(index, 1);
        return { ...prev, [aisleName]: rows };
      });
      await loadAisles(selectedWarehouseId);
    } catch (e: any) {
      setError(e?.message || 'Error al crear racks');
    }
  };

  const saveRackMeta = async (aisleName: string, rackCode: string) => {
    try {
      setError(null);
      const edit = rackMetaEdits[rackCode];
      if (!edit) return;
      if (!selectedWarehouseId) throw new Error('Seleccione un almacén');

      // Intentar backend primero; si no, actualizar en Supabase
      const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
      const token = localStorage.getItem('app_token');
      if (AUTH_BACKEND_URL && token) {
        const resp = await fetch(`${AUTH_BACKEND_URL}/locations/update_meta_by_rack`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            warehouse_id: selectedWarehouseId,
            aisle: aisleName,
            rack: rackCode,
            capacity: edit.capacity,
            unit: edit.unit,
            is_active: edit.isActive,
          }),
        });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(`Error actualizando rack ${rackCode}: ${txt}`);
        }
      } else {
        const { error } = await supabase
          .from('locations')
          .update({ capacity: edit.capacity, unit_measure: edit.unit, is_active: edit.isActive })
          .eq('warehouse_id', selectedWarehouseId)
          .eq('aisle', aisleName)
          .eq('rack', rackCode);
        if (error) throw error;
      }

      await loadAisles(selectedWarehouseId);
    } catch (e: any) {
      setError(e?.message || 'Error al actualizar datos del rack');
    }
  };

  // Validaciones de inventario antes de eliminar
  const hasInventoryForLocations = async (locationIds: string[]) => {
    try {
      if (!selectedWarehouseId) return true; // sin almacén, bloquear por seguridad
      const safeIds = locationIds.length ? locationIds : ['00000000-0000-0000-0000-000000000000'];
      const { data, error } = await supabase
        .from('inventory')
        .select('location_id, quantity, reserved_quantity, available_quantity')
        .eq('warehouse_id', selectedWarehouseId)
        .in('location_id', safeIds);
      if (error) throw error;
      const rows = (data || []) as any[];
      return rows.some((r) => {
        const qty = Number(r.quantity || 0);
        const res = Number(r.reserved_quantity || 0);
        const avail = Number(r.available_quantity || 0);
        return qty > 0 || res > 0 || avail > 0;
      });
    } catch {
      // Si no se puede verificar, bloquear por seguridad
      return true;
    }
  };

  const hasInventoryForAisle = async (aisleName: string) => {
    try {
      if (!selectedWarehouseId) return true;
      const { data, error } = await supabase
        .from('locations')
        .select('id')
        .eq('warehouse_id', selectedWarehouseId)
        .eq('aisle', aisleName);
      if (error) throw error;
      const ids = (data || []).map((l: any) => String(l.id)).filter(Boolean);
      return await hasInventoryForLocations(ids);
    } catch {
      return true;
    }
  };

  const hasInventoryForRack = async (aisleName: string, rackCode: string) => {
    try {
      if (!selectedWarehouseId) return true;
      const { data, error } = await supabase
        .from('locations')
        .select('id')
        .eq('warehouse_id', selectedWarehouseId)
        .eq('aisle', aisleName)
        .eq('rack', rackCode);
      if (error) throw error;
      const ids = (data || []).map((l: any) => String(l.id)).filter(Boolean);
      return await hasInventoryForLocations(ids);
    } catch {
      return true;
    }
  };

  const deleteAisle = async (aisleName: string) => {
    try {
      if (!aisleName) return;
      setLoading(true);
      setError(null);
      if (!selectedWarehouseId) throw new Error('Seleccione un almacén');

      // Bloquear si tiene inventario
      const hasInv = await hasInventoryForAisle(aisleName);
      if (hasInv) {
        setError(`No se puede eliminar el pasillo ${aisleName}: existe inventario en sus ubicaciones.`);
        window.alert(`No se puede eliminar el pasillo ${aisleName}: existe inventario.`);
        return;
      }

      const ok = window.confirm(`¿Eliminar el pasillo "${aisleName}" y todas sus ubicaciones?`);
      if (!ok) return;

      const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
      const token = localStorage.getItem('app_token');
      if (AUTH_BACKEND_URL && token) {
        const resp = await fetch(`${AUTH_BACKEND_URL}/locations/delete_by_aisle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ warehouse_id: selectedWarehouseId, aisle: aisleName }),
        });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(`Error eliminando pasillo ${aisleName}: ${txt}`);
        }
      } else {
        const { error } = await supabase
          .from('locations')
          .delete()
          .eq('warehouse_id', selectedWarehouseId)
          .eq('aisle', aisleName);
        if (error) throw error;
      }

      await loadAisles(selectedWarehouseId);
    } catch (e: any) {
      setError(e?.message || 'Error al eliminar pasillo');
    } finally {
      setLoading(false);
    }
  };

  const deleteRack = async (aisleName: string, rackCode: string) => {
    try {
      if (!rackCode) return;
      setLoading(true);
      setError(null);
      if (!selectedWarehouseId) throw new Error('Seleccione un almacén');

      // Bloquear si tiene inventario
      const hasInv = await hasInventoryForRack(aisleName, rackCode);
      if (hasInv) {
        setError(`No se puede eliminar el rack ${rackCode}: existe inventario en sus ubicaciones.`);
        window.alert(`No se puede eliminar el rack ${rackCode}: existe inventario.`);
        return;
      }

      const ok = window.confirm(`¿Eliminar el rack "${rackCode}" del pasillo "${aisleName}" y sus ubicaciones?`);
      if (!ok) return;

      const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
      const token = localStorage.getItem('app_token');
      if (AUTH_BACKEND_URL && token) {
        const resp = await fetch(`${AUTH_BACKEND_URL}/locations/delete_by_rack`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ warehouse_id: selectedWarehouseId, aisle: aisleName, rack: rackCode }),
        });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(`Error eliminando rack ${rackCode}: ${txt}`);
        }
      } else {
        const { error } = await supabase
          .from('locations')
          .delete()
          .eq('warehouse_id', selectedWarehouseId)
          .eq('aisle', aisleName)
          .eq('rack', rackCode);
        if (error) throw error;
      }

      setEditingRack((p) => ({ ...p, [rackCode]: false }));
      await loadAisles(selectedWarehouseId);
    } catch (e: any) {
      setError(e?.message || 'Error al eliminar rack');
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de pasillos por búsqueda (nombre, zona o código de rack)
  const filteredAisles = aisles.filter((a) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      a.name.toLowerCase().includes(q) ||
      (a.zones || []).some((z) => z.toLowerCase().includes(q)) ||
      ((a.rackCodes || []).some((rc) => rc.toLowerCase().includes(q)))
    );
  });

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Rows className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Pasillos</h2>
          </div>
          <button
            onClick={() => loadAisles(selectedWarehouseId)}
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
            {zones.length > 0 ? (
              <select
                value={genForm.zone}
                onChange={(e) => setGenForm((p) => ({ ...p, zone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sin zona</option>
                {zones.map((z) => (
                  <option key={z.code} value={z.code}>{z.name || z.code}</option>
                ))}
              </select>
            ) : (
              <input
                value={genForm.zone}
                onChange={(e) => setGenForm((p) => ({ ...p, zone: e.target.value }))}
                placeholder="Ej. A, B, C"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Prefijo Pasillo</label>
            <input
              value={genForm.aisle}
              onChange={(e) => setGenForm((p) => ({ ...p, aisle: normalizeAisleInput(e.target.value) }))}
              placeholder="Ej. A o A-01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">Acepta solo prefijo (A, B, C...) o prefijo con número (A-01, B-02...).</p>
          </div>
        </div>

        {error && (
          <div className="mx-4 mb-4 p-3 bg-red-50 text-red-700 text-sm rounded">{error}</div>
        )}

        <div className="p-4">
          <div className="mb-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Generar ubicaciones por Pasillo</span>
                <button
                  onClick={handleGenerate}
                  className="flex items-center px-3 py-2 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                  disabled={loading || !selectedWarehouseId || !genForm.zone || !genForm.aisle}
                >
                  <Plus className="w-3 h-3 mr-2" />
                  Generar
                </button>
              </div>
              {/* Se remueve la sección debajo del botón para simplificar el flujo */}
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Lista de Pasillos</span>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar pasillo, zona o rack"
                    className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1.5" />
                </div>
                <span className="text-xs text-gray-500">{filteredAisles.length} registros</span>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {filteredAisles.map((a) => (
                <div key={a.name}>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Pasillo {a.name}</p>
                      <p className="text-xs text-gray-500">Zonas: {a.zones.join(', ') || '—'}</p>
                      <p className="text-xs text-gray-500">Ubicaciones: {a.locations} · Racks: {a.racks}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        className="px-2 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        title={expanded[a.name] ? 'Ocultar racks' : 'Ver racks'}
                        onClick={() => setExpanded((p) => ({ ...p, [a.name]: !p[a.name] }))}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="px-2 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        title="Agregar renglón de rack"
                        onClick={() => addRowForAisle(a.name, a.zones)}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        className="px-2 py-2 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50"
                        title="Eliminar pasillo"
                        disabled={!selectedWarehouseId || loading}
                        onClick={() => deleteAisle(a.name)}
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {expanded[a.name] && (
                    <div className="px-4 pb-4">
                      {(a.rackCodes || []).length ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {(a.rackCodes || []).map((code) => (
                            <div key={code} className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold text-gray-900">{code}</div>
                                <button
                                  className="p-1 border border-gray-300 rounded hover:bg-gray-50"
                                  title={editingRack[code] ? 'Cerrar edición' : 'Editar rack'}
                                  onClick={() => setEditingRack((p) => ({ ...p, [code]: !p[code] }))}
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  className="p-1 border border-red-300 text-red-700 rounded hover:bg-red-50 ml-2"
                                  title="Eliminar rack"
                                  disabled={!selectedWarehouseId || loading}
                                  onClick={() => deleteRack(a.name, code)}
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                  {a.rackLevels?.[code] ?? 0} niveles
                                </span>
                                <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-gray-50 text-gray-700 border border-gray-200">
                                  {a.rackPositions?.[code] ?? 0} posiciones
                                </span>
                              </div>
                              {editingRack[code] && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Capacidad</label>
                                    <input type="number" min={0} value={rackMetaEdits[code]?.capacity ?? 0}
                                      onChange={(e) => setRackMetaEdits((p) => ({ ...p, [code]: { ...(p[code]||{unit:'piezas', isActive:true, capacity:0}), capacity: parseInt(e.target.value||'0',10) } }))}
                                      className="w-full px-3 py-2 border border-gray-300 rounded" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Unidad</label>
                                    <select value={rackMetaEdits[code]?.unit ?? 'piezas'}
                                      onChange={(e) => setRackMetaEdits((p) => ({ ...p, [code]: { ...(p[code]||{unit:'piezas', isActive:true, capacity:0}), unit: e.target.value as any } }))}
                                      className="w-full px-3 py-2 border border-gray-300 rounded">
                                      <option value="Kg">Kg</option>
                                      <option value="m³">m³</option>
                                      <option value="cajas">cajas</option>
                                      <option value="pallets">pallets</option>
                                      <option value="piezas">piezas</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                                    <select value={(rackMetaEdits[code]?.isActive ?? true) ? 'activo' : 'inactivo'}
                                      onChange={(e) => setRackMetaEdits((p) => ({ ...p, [code]: { ...(p[code]||{unit:'piezas', isActive:true, capacity:0}), isActive: e.target.value === 'activo' } }))}
                                      className="w-full px-3 py-2 border border-gray-300 rounded">
                                      <option value="activo">Activo</option>
                                      <option value="inactivo">Inactivo</option>
                                    </select>
                                  </div>
                                  <div className="md:col-span-3 flex justify-end">
                                    <button onClick={() => saveRackMeta(a.name, code)}
                                      className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                      <Save className="w-4 h-4 mr-2" /> Guardar
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">Sin racks asignados</div>
                      )}
                    </div>
                  )}

                  {(inlineRows[a.name] || []).map((row, idx) => (
                    <div key={`${a.name}-row-${idx}`} className="px-4 pb-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                        {a.zones.length > 1 ? (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Zona</label>
                            <select
                              value={row.zone}
                              onChange={(e) => updateInlineRow(a.name, idx, { zone: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              {a.zones.map((z) => (
                                <option key={z} value={z}>{z}</option>
                              ))}
                            </select>
                          </div>
                        ) : null}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad de racks</label>
                          <input type="number" min={1} value={row.racksQuantity}
                            onChange={(e) => updateInlineRow(a.name, idx, { racksQuantity: Math.max(1, parseInt(e.target.value || '1', 10)) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Prefijo de rack</label>
                          <input type="text" value={row.rackPrefix}
                            onChange={(e) => updateInlineRow(a.name, idx, { rackPrefix: (e.target.value || 'R').slice(0,4) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Dígitos (padding)</label>
                          <input type="number" min={1} max={4} value={row.rackDigits}
                            onChange={(e) => updateInlineRow(a.name, idx, { rackDigits: Math.max(1, Math.min(4, parseInt(e.target.value || '2', 10))) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Niveles</label>
                          <input type="number" min={0} value={row.levels}
                            onChange={(e) => updateInlineRow(a.name, idx, { levels: parseInt(e.target.value || '0', 10) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Posiciones por nivel</label>
                          <input type="number" min={0} value={row.positionsPerLevel}
                            onChange={(e) => updateInlineRow(a.name, idx, { positionsPerLevel: parseInt(e.target.value || '0', 10) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Capacidad máxima</label>
                          <input type="number" min={0} value={row.capacityMax}
                            onChange={(e) => updateInlineRow(a.name, idx, { capacityMax: parseInt(e.target.value || '0', 10) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Unidad de capacidad</label>
                          <select value={row.capacityUnit}
                            onChange={(e) => updateInlineRow(a.name, idx, { capacityUnit: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="Kg">Kg</option>
                            <option value="m³">m³</option>
                            <option value="cajas">cajas</option>
                            <option value="pallets">pallets</option>
                            <option value="piezas">piezas</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                          <select value={row.isActive ? 'activo' : 'inactivo'}
                            onChange={(e) => updateInlineRow(a.name, idx, { isActive: e.target.value === 'activo' })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="activo">Activo</option>
                            <option value="inactivo">Inactivo</option>
                          </select>
                        </div>
                        <div className="md:col-span-6 flex justify-end">
                          <button onClick={() => saveInlineRow(a.name, idx)}
                            className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            <Save className="w-4 h-4 mr-2" /> Guardar renglón
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {filteredAisles.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-gray-500">{searchQuery.trim() ? 'Sin resultados de búsqueda' : 'Sin datos de pasillos para este almacén'}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}