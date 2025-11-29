import { useEffect, useMemo, useState, useCallback } from 'react';
import { BarChart3, Filter, Plus, Calendar, MapPin, Package, User, X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
import { useAuth } from '../../contexts/AuthContext';

type CountStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
type CountType = 'cycle' | 'full' | 'spot';

type WarehouseOption = { id: string; name: string; code: string; is_active: boolean };
type LocationOption = { id: string; warehouse_id: string | null; code: string; name: string | null; is_active: boolean | null };

interface CycleCountRow {
  id: string;
  count_number: string;
  warehouse_id: string | null;
  location_id: string | null;
  status: CountStatus;
  count_date: string;
  count_type: CountType;
  notes?: string | null;
  warehouses?: { name?: string; code?: string } | null;
  locations?: { code?: string } | null;
}

interface CycleCountItemRow {
  id: string;
  product_id: string;
  products?: { sku?: string; name?: string } | null;
  location_id: string | null;
  locations?: { code?: string } | null;
  system_quantity: number;
  counted_quantity: number | null;
  lot_number?: string | null;
  notes?: string | null;
}

// Tipos mínimos para filas de inventario utilizadas en el prellenado
interface InventoryRow {
  product_id: string;
  location_id: string | null;
  quantity: number;
  lot_number?: string | null;
}

function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function generateCountNumber() {
  const now = new Date();
  const yr = now.getFullYear();
  const rnd = Math.floor(100000 + Math.random() * 900000);
  return `CC-${yr}-${rnd}`;
}

export function CycleCounts() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<CycleCountRow[]>([]);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<CountStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<'1day' | '7days' | '30days' | 'all'>('7days');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');

  // Catálogos
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);

  // Crear recuento
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<{ warehouseId: string; locationId: string; countType: CountType; countDate: string; notes: string }>(
    { warehouseId: '', locationId: '', countType: 'cycle', countDate: formatDateInput(new Date()), notes: '' }
  );

  // Detalle
  const [selectedCount, setSelectedCount] = useState<CycleCountRow | null>(null);
  const [items, setItems] = useState<CycleCountItemRow[]>([]);
  const [savingItems, setSavingItems] = useState(false);

  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const { data, error } = await supabase
          .from('warehouses')
          .select('id, name, code, is_active')
          .eq('is_active', true)
          .order('name', { ascending: true });
        if (error) throw error;
        const list = (data || []) as WarehouseOption[];
        setWarehouses(list);
        if (list.length > 0) {
          setCreateForm((f) => (f.warehouseId ? f : { ...f, warehouseId: list[0].id }));
        }
      } catch (e) {
        console.error('Error cargando almacenes:', e);
      }
  };
  loadWarehouses();
  }, []);

  useEffect(() => {
    const loadLocations = async (wid: string) => {
      try {
        if (!wid) { setLocations([]); return; }
        const { data, error } = await supabase
          .from('locations')
          .select('id, warehouse_id, code, name, is_active')
          .eq('warehouse_id', wid)
          .eq('is_active', true)
          .order('code', { ascending: true });
        if (error) throw error;
        setLocations((data || []) as LocationOption[]);
      } catch (e) {
        console.error('Error cargando ubicaciones:', e);
      }
  };
  loadLocations(createForm.warehouseId);
  }, [createForm.warehouseId]);

  const fetchCounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Usar exclusivamente el backend
      if (!AUTH_BACKEND_URL) {
        throw new Error('Backend no configurado (VITE_AUTH_BACKEND_URL)');
      }
      const token = typeof window !== 'undefined' ? localStorage.getItem('app_token') : null;
      const params = new URLSearchParams();
      params.set('status', statusFilter);
      params.set('dateRange', dateRange);
      if (warehouseFilter) params.set('warehouseId', warehouseFilter);
      const url = `${AUTH_BACKEND_URL}/inventory/cycle_counts?${params.toString()}`;
      const resp = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error || 'Error al cargar recuentos');
      }
      const json = await resp.json();
      const rows = Array.isArray(json.counts) ? json.counts : [];
      setCounts(rows as CycleCountRow[]);
    } catch (err) {
      console.error('Error fetching cycle counts:', err);
      setError('Error al cargar recuentos cíclicos');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateRange, warehouseFilter]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const filteredCounts = useMemo(() => counts, [counts]);

  const openCount = async (count: CycleCountRow) => {
    try {
      setSelectedCount(count);
      const { data, error } = await supabase
        .from('cycle_count_items')
        .select('id, product_id, products(sku,name), location_id, locations(code), system_quantity, counted_quantity, lot_number, notes')
        .eq('cycle_count_id', count.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setItems((data || []) as CycleCountItemRow[]);
    } catch (e) {
      console.error('Error abriendo recuento:', e);
    }
  };

  const saveItems = async () => {
    try {
      setSavingItems(true);
      for (const item of items) {
        const { error } = await supabase
          .from('cycle_count_items')
          .update({ counted_quantity: item.counted_quantity })
          .eq('id', item.id);
        if (error) throw error;
      }
      await fetchCounts();
      alert('Cantidades guardadas');
    } catch (e) {
      console.error('Error guardando items:', e);
      alert('No se pudieron guardar las cantidades');
    } finally {
      setSavingItems(false);
    }
  };

  const completeCount = async () => {
    try {
      if (!selectedCount) return;
      setSavingItems(true);
      const whId = selectedCount.warehouse_id || null;
      const ref = selectedCount.count_number;
      const performer = user?.id || null;
      for (const item of items) {
        const sys = Number(item.system_quantity || 0);
        const cnt = Number(item.counted_quantity || 0);
        const diff = cnt - sys;
        if (diff === 0) continue;
        const movementType = diff > 0 ? 'IN' : 'OUT';
        const qty = Math.abs(diff);
        const { error } = await supabase.from('inventory_movements').insert({
          product_id: item.product_id,
          warehouse_id: whId,
          location_id: item.location_id || selectedCount.location_id,
          movement_type: movementType,
          transaction_type: 'CYCLE_COUNT',
          quantity: qty,
          unit_cost: null,
          reference_number: ref,
          lot_number: item.lot_number || null,
          reason: diff > 0 ? 'CYCLE_COUNT_OVERAGE' : 'CYCLE_COUNT_SHORTAGE',
          notes: 'Ajuste por recuento cíclico',
          performed_by: performer,
        });
        if (error) throw error;
      }

      const { error: updErr } = await supabase
        .from('cycle_counts')
        .update({ status: 'completed', counted_by: performer })
        .eq('id', selectedCount.id);
      if (updErr) throw updErr;
      alert('Recuento completado y ajustes registrados');
      setSelectedCount(null);
      setItems([]);
      await fetchCounts();
    } catch (e) {
      console.error('Error completando recuento:', e);
      alert('No se pudo completar el recuento');
    } finally {
      setSavingItems(false);
    }
  };

  const createCount = async () => {
    try {
      if (!createForm.warehouseId) { alert('Selecciona un almacén'); return; }
      const countNumber = generateCountNumber();

      // Usar exclusivamente el backend
      const token = typeof window !== 'undefined' ? localStorage.getItem('app_token') : null;
      if (!AUTH_BACKEND_URL || !token) {
        alert('Backend no configurado o sesión no iniciada');
        return;
      }
      const resp = await fetch(`${AUTH_BACKEND_URL}/inventory/cycle_counts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          warehouseId: createForm.warehouseId,
          locationId: createForm.locationId || null,
          countType: createForm.countType,
          countDate: createForm.countDate,
          notes: createForm.notes || null,
          countNumber,
        })
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error || 'Error creando recuento');
      }
      const json = await resp.json();
      setShowCreateModal(false);
      setCreateForm({ warehouseId: createForm.warehouseId, locationId: createForm.locationId, countType: 'cycle', countDate: formatDateInput(new Date()), notes: '' });
      await fetchCounts();
      alert(`Recuento creado: ${json?.count?.count_number || countNumber}`);
    } catch (e) {
      console.error('Error creando recuento:', e);
      alert('No se pudo crear el recuento');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-bold text-gray-900">Recuentos Cíclicos</h2>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Programa, captura y finaliza recuentos para mantener tu inventario preciso.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Estado:</span>
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as CountStatus | 'all')} className="border border-gray-300 rounded-md px-3 py-1 text-sm">
            <option value="all">Todos</option>
            <option value="planned">Planificado</option>
            <option value="in_progress">En progreso</option>
            <option value="completed">Completado</option>
            <option value="cancelled">Cancelado</option>
          </select>

          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Período:</span>
          </div>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value as '1day' | '7days' | '30days' | 'all')} className="border border-gray-300 rounded-md px-3 py-1 text-sm">
            <option value="1day">Último día</option>
            <option value="7days">Últimos 7 días</option>
            <option value="30days">Últimos 30 días</option>
            <option value="all">Todo el período</option>
          </select>

          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Almacén:</span>
          </div>
          <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="border border-gray-300 rounded-md px-3 py-1 text-sm">
            <option value="">Todos</option>
            {warehouses.map(w => (<option key={w.id} value={w.id}>{w.name} ({w.code})</option>))}
          </select>
        </div>

        <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Recuento
        </button>
      </div>

      {/* Lista de recuentos */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recuentos ({filteredCounts.length})</h3>
        </div>
        {loading && <div className="p-6 text-sm text-gray-500">Cargando recuentos...</div>}
        {error && !loading && <div className="p-6 text-sm text-red-600">{error}</div>}
        {!loading && !error && (
          <div className="divide-y divide-gray-200">
            {filteredCounts.map((cc) => (
              <div key={cc.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-indigo-600" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cc.status === 'completed' ? 'bg-green-50 text-green-700' : cc.status === 'in_progress' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'}`}>{cc.status.replace('_',' ')}</span>
                        <span className="text-sm text-gray-500">#{cc.count_number}</span>
                      </div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">{cc.warehouses?.name || 'Almacén'} ({cc.warehouses?.code})</h4>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        {cc.locations?.code && (
                          <div className="flex items-center"><MapPin className="w-3 h-3 mr-1" />{cc.locations?.code}</div>
                        )}
                        <div className="flex items-center"><Calendar className="w-3 h-3 mr-1" />{new Date(cc.count_date).toLocaleDateString('es-ES')}</div>
                        <div className="flex items-center"><Package className="w-3 h-3 mr-1" />{cc.count_type}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => openCount(cc)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Abrir</button>
                    {cc.status !== 'completed' && (
                      <button onClick={() => openCount(cc)} className="inline-flex items-center px-2 py-1 text-sm rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                        <BarChart3 className="w-4 h-4 mr-1" /> Capturar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && !error && filteredCounts.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay recuentos</h3>
            <p className="mt-1 text-sm text-gray-500">Crea un nuevo recuento para comenzar.</p>
          </div>
        )}
      </div>

      {/* Modal de creación */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => setShowCreateModal(false)} />
            <div className="relative bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Nuevo Recuento</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Almacén</label>
                  <select value={createForm.warehouseId} onChange={(e) => setCreateForm({ ...createForm, warehouseId: e.target.value, locationId: '' })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                    <option value="">Selecciona almacén</option>
                    {warehouses.map(w => (<option key={w.id} value={w.id}>{w.name} ({w.code})</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                  <select value={createForm.locationId} onChange={(e) => setCreateForm({ ...createForm, locationId: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                    <option value="">Todas / Ninguna</option>
                    {locations.map(l => (<option key={l.id} value={l.id}>{l.code || l.name || 'Ubicación'}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de recuento</label>
                  <select value={createForm.countType} onChange={(e) => setCreateForm({ ...createForm, countType: e.target.value as CountType })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                    <option value="cycle">Cíclico</option>
                    <option value="spot">Spot</option>
                    <option value="full">Completo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input type="date" value={createForm.countDate} onChange={(e) => setCreateForm({ ...createForm, countDate: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" rows={3} />
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end space-x-2">
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50">Cancelar</button>
                <button onClick={createCount} className="px-4 py-2 text-sm rounded-md text-white bg-blue-600 hover:bg-blue-700">Crear</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Panel de detalle */}
      {selectedCount && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-start justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => { setSelectedCount(null); setItems([]); }} />
            <div className="relative bg-white rounded-lg shadow-lg w-full max-w-4xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Recuento #{selectedCount.count_number}</h3>
                  <p className="text-xs text-gray-500">{selectedCount.warehouses?.name} ({selectedCount.warehouses?.code}) • {selectedCount.locations?.code || 'sin ubicación'}</p>
                </div>
                <button onClick={() => { setSelectedCount(null); setItems([]); }} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-4 text-xs text-gray-600 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center"><Calendar className="w-3 h-3 mr-1" />{new Date(selectedCount.count_date).toLocaleDateString('es-ES')}</div>
                  <div className="flex items-center"><User className="w-3 h-3 mr-1" />{user?.full_name || 'Usuario'}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={saveItems} disabled={savingItems} className="px-3 py-1 text-xs rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">Guardar cantidades</button>
                  {selectedCount.status !== 'completed' && (
                    <button onClick={completeCount} disabled={savingItems} className="px-3 py-1 text-xs inline-flex items-center rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"><Check className="w-3 h-3 mr-1" /> Finalizar</button>
                  )}
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sistema</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Varianza</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((it, idx) => {
                        const variance = (Number(it.counted_quantity || 0) - Number(it.system_quantity || 0));
                        const vColor = variance === 0 ? 'text-gray-700' : variance > 0 ? 'text-green-600' : 'text-red-600';
                        return (
                          <tr key={it.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{it.products?.name || 'Producto'}</div>
                              <div className="text-xs text-gray-500">{it.products?.sku}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex items-center"><MapPin className="w-3 h-3 mr-1 text-gray-400" />{it.locations?.code || selectedCount.locations?.code || '—'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{it.system_quantity}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <input
                                type="number"
                                value={it.counted_quantity ?? ''}
                                onChange={(e) => {
                                  const next = [...items];
                                  next[idx] = { ...it, counted_quantity: e.target.value === '' ? null : Number(e.target.value) };
                                  setItems(next);
                                }}
                                className="w-28 border border-gray-300 rounded-md px-2 py-1 text-sm"
                                placeholder="0"
                              />
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${vColor}`}>{variance > 0 ? '+' : ''}{variance}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CycleCounts;