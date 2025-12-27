import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { RotateCcw, MapPin, Package, AlertTriangle, CheckCircle, Play, Search, RefreshCw } from 'lucide-react';

const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';

interface ReplenishmentTasksProps {
  searchTerm?: string;
}

interface Suggestion {
  product_id: string;
  warehouse_id: string;
  sku: string;
  name: string;
  threshold: number;
  current_pick_qty: number;
  needed_qty: number;
  suggested_qty: number;
  from_location_id: string | null;
  from_location_code?: string;
  to_location_id: string | null;
  to_location_code?: string;
}

export function ReplenishmentTasks({ searchTerm = '' }: ReplenishmentTasksProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const warehouseId = '';
  const [zoneFilter, setZoneFilter] = useState<string>('');

  const filteredSuggestions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return suggestions.filter(s => {
      const byTerm = !term || s.sku.toLowerCase().includes(term) || s.name.toLowerCase().includes(term);
      const byZone = !zoneFilter || s.to_location_code?.toLowerCase().includes(zoneFilter.toLowerCase()) || s.from_location_code?.toLowerCase().includes(zoneFilter.toLowerCase());
      const byWh = !warehouseId || s.warehouse_id === warehouseId;
      return byTerm && byZone && byWh;
    });
  }, [suggestions, searchTerm, zoneFilter, warehouseId]);

  const loadSuggestionsFromBackend = async () => {
    if (!AUTH_BACKEND_URL || !token) return false;
    try {
      setLoading(true);
      setError(null);
      const url = new URL('/replenishment/suggestions', AUTH_BACKEND_URL);
      if (warehouseId) url.searchParams.set('warehouse_id', warehouseId);
      if (zoneFilter) url.searchParams.set('zone', zoneFilter);
      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list = (json.suggestions || []) as Suggestion[];
      setSuggestions(list);
      return true;
    } catch (e: any) {
      setError('No se pudo obtener sugerencias del backend, usando Supabase directo');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestionsFromSupabase = async () => {
    try {
      setLoading(true);
      setError(null);
      // Cargar inventario con joins básicos
      const { data: inv, error: invErr } = await supabase
        .from('inventory')
        .select('product_id, warehouse_id, location_id, available_quantity, reserved_quantity, products:product_id(sku, name, min_stock_level, reorder_point), locations:location_id(code, zone, location_type)')
        .limit(1000);
      if (invErr) throw invErr;

      const byWh: Record<string, any[]> = {};
      for (const row of inv || []) {
        const w = String(row.warehouse_id || '');
        byWh[w] = byWh[w] || [];
        byWh[w].push(row);
      }

      const result: Suggestion[] = [];

      for (const [, rows] of Object.entries(byWh)) {
        const pickRows = rows.filter(r => {
          const lt = String(r?.locations?.location_type || '').toUpperCase();
          const zone = String(r?.locations?.zone || '');
          return lt === 'PICKING' || /pick/i.test(zone);
        });
        for (const pr of pickRows) {
          const threshold = Number(pr?.products?.reorder_point || pr?.products?.min_stock_level || 0);
          const current = Number(pr?.available_quantity || 0);
          if (threshold > 0 && current < threshold) {
            const need = Math.max(0, threshold - current);
            // Buscar mejor origen con más disponibilidad
            const candidates = rows.filter(r => r.product_id === pr.product_id && r.location_id !== pr.location_id);
            const sorted = candidates.sort((a, b) => Number(b.available_quantity || 0) - Number(a.available_quantity || 0));
            const from = sorted[0];
            const avail = Number(from?.available_quantity || 0);
            if (avail > 0) {
              result.push({
                product_id: pr.product_id,
                warehouse_id: pr.warehouse_id,
                sku: pr.products?.sku || '',
                name: pr.products?.name || '',
                threshold,
                current_pick_qty: current,
                needed_qty: need,
                suggested_qty: Math.min(need, avail),
                from_location_id: from?.location_id || null,
                from_location_code: from?.locations?.code || '',
                to_location_id: pr.location_id || null,
                to_location_code: pr?.locations?.code || '',
              });
            }
          }
        }
      }

      setSuggestions(result);
    } catch (e: any) {
      setError('No se pudieron calcular sugerencias con Supabase');
    } finally {
      setLoading(false);
    }
  };

  const reload = async () => {
    const ok = await loadSuggestionsFromBackend();
    if (!ok) await loadSuggestionsFromSupabase();
  };

  useEffect(() => { reload(); }, [warehouseId, zoneFilter]);

  const toggleSelect = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const executeSelected = async () => {
    const items = filteredSuggestions.filter(s => selected.has(`${s.product_id}-${s.to_location_id}`));
    if (items.length === 0) return;

    // Preferir backend dedicado; fallback: crear movimientos en lote
    if (AUTH_BACKEND_URL && token) {
      try {
        const res = await fetch(new URL('/replenishment/execute', AUTH_BACKEND_URL).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ items: items.map(i => ({
            product_id: i.product_id,
            warehouse_id: i.warehouse_id,
            from_location_id: i.from_location_id,
            to_location_id: i.to_location_id,
            quantity: i.suggested_qty,
          })) })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await reload();
        setSelected(new Set());
        alert('Reposición ejecutada');
        return;
      } catch (e) {
        // fallback abajo
      }
    }

    // Fallback: intentar crear movimientos en lote directo al backend de inventario
    if (AUTH_BACKEND_URL && token) {
      try {
        const movements: any[] = [];
        for (const i of items) {
          movements.push({
            product_id: i.product_id,
            warehouse_id: i.warehouse_id,
            location_id: i.from_location_id,
            movement_type: 'OUT',
            transaction_type: 'TRANSFER_OUT',
            quantity: i.suggested_qty,
            reference_type: 'REPLENISHMENT',
            notes: `Auto-reposición ${i.sku}`,
          });
          movements.push({
            product_id: i.product_id,
            warehouse_id: i.warehouse_id,
            location_id: i.to_location_id,
            movement_type: 'IN',
            transaction_type: 'TRANSFER_IN',
            quantity: i.suggested_qty,
            reference_type: 'REPLENISHMENT',
            notes: `Auto-reposición ${i.sku}`,
          });
        }
        const res = await fetch(new URL('/inventory/movements/batch', AUTH_BACKEND_URL).toString(), {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ movements })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await reload();
        setSelected(new Set());
        alert('Reposición ejecutada (batch)');
      } catch (e: any) {
        alert('No se pudo ejecutar la reposición');
      }
    } else {
      alert('Backend no configurado para ejecutar movimientos');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Filtrar por zona"
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button onClick={reload} className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 mr-2" />
            Recargar
          </button>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={executeSelected}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Ejecutar reposición seleccionada
          </button>
        </div>
      </div>

      {/* Info */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">{error}</div>
      )}
      {!AUTH_BACKEND_URL && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">Configura `VITE_AUTH_BACKEND_URL` para usar endpoints dedicados</div>
      )}

      {/* Suggestions list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading && (
          <div className="text-sm text-gray-600">Cargando sugerencias…</div>
        )}
        {!loading && filteredSuggestions.map(s => {
          const key = `${s.product_id}-${s.to_location_id}`;
          const selectedFlag = selected.has(key);
          return (
            <div key={key} className={`bg-white rounded-lg shadow border ${selectedFlag ? 'border-blue-400' : 'border-gray-200'} hover:shadow-md transition-shadow`}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{s.sku}</h3>
                    <p className="text-sm text-gray-600">{s.name}</p>
                  </div>
                  <button
                    onClick={() => toggleSelect(key)}
                    className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${selectedFlag ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-800'}`}
                  >
                    {selectedFlag ? 'Seleccionado' : 'Seleccionar'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div className="bg-gray-50 border border-gray-200 rounded p-3">
                    <div className="flex items-center text-gray-700 mb-1">
                      <Package className="w-4 h-4 mr-2" />
                      <span className="font-medium">Umbral:</span>
                      <span className="ml-1">{s.threshold}</span>
                    </div>
                    <div className="flex items-center text-gray-700 mb-1">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      <span className="font-medium">En picking:</span>
                      <span className="ml-1">{s.current_pick_qty}</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      <span className="font-medium">Necesario:</span>
                      <span className="ml-1">{s.needed_qty}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded p-3">
                    <div className="flex items-center text-gray-700 mb-1">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span className="font-medium">Origen:</span>
                      <span className="ml-1">{s.from_location_code || '—'}</span>
                    </div>
                    <div className="flex items-center text-gray-700 mb-1">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span className="font-medium">Destino:</span>
                      <span className="ml-1">{s.to_location_code || '—'}</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      <span className="font-medium">Sugerido:</span>
                      <span className="ml-1">{s.suggested_qty}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => toggleSelect(key)}
                    className={`px-3 py-2 text-sm font-medium rounded-md border ${selectedFlag ? 'border-blue-300 text-blue-700 bg-blue-50' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}
                  >
                    {selectedFlag ? 'Quitar' : 'Seleccionar'}
                  </button>
                  <button
                    onClick={async () => { setSelected(new Set([key])); await executeSelected(); }}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Ejecutar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
