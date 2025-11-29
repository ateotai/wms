import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  Settings,
  Calendar,
  MapPin,
  Package,
} from 'lucide-react';

type UiMovementType = 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT' | 'COUNT';

type WarehouseOption = { id: string; name: string; code: string; is_active: boolean };

type TraceEvent = {
  id: string;
  product_id: string;
  warehouse_id: string | null;
  location_id: string | null;
  movement_type: UiMovementType;
  transaction_type?: string | null;
  quantity: number;
  unit_cost?: number | null;
  reference_number?: string | null;
  reference_type?: string | null;
  lot_number?: string | null;
  expiry_date?: string | null;
  reason?: string | null;
  notes?: string | null;
  created_at: string;
  products?: { name?: string | null; sku?: string | null } | null;
  locations?: { code?: string | null; name?: string | null } | null;
};

type Summary = {
  inbound: number;
  outbound: number;
  net: number;
  last_movement_at: string | null;
  distinct_locations: number;
};

const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';

export function Traceability() {
  const { signOut } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [type, setType] = useState<'all' | UiMovementType>('all');
  const [dateRange, setDateRange] = useState('90days');
  const [warehouseId, setWarehouseId] = useState('');
  const [lotFilter, setLotFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [summary, setSummary] = useState<Summary>({ inbound: 0, outbound: 0, net: 0, last_movement_at: null, distinct_locations: 0 });
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);

  const typeLabel = (t: UiMovementType) => {
    switch (t) {
      case 'IN': return 'Entrada';
      case 'OUT': return 'Salida';
      case 'TRANSFER': return 'Transferencia';
      case 'ADJUSTMENT': return 'Ajuste';
      case 'COUNT': return 'Recuento';
    }
  };

  const typeIcon = (t: UiMovementType) => {
    switch (t) {
      case 'IN': return ArrowDownLeft;
      case 'OUT': return ArrowUpRight;
      case 'TRANSFER': return RotateCcw;
      case 'ADJUSTMENT': return Settings;
      case 'COUNT': return TrendingUp;
    }
  };

  const fetchWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name, code, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (!error && Array.isArray(data)) setWarehouses(data as WarehouseOption[]);
    } catch {}
  };

  useEffect(() => { fetchWarehouses(); }, []);

  const onSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        q: searchTerm || '',
        type: type,
        dateRange,
        limit: '400',
      });
      if (warehouseId) qs.set('warehouse_id', warehouseId);
      if (lotFilter) qs.set('lot', lotFilter);

      let ok = false;
      if (AUTH_BACKEND_URL) {
        try {
          const token = localStorage.getItem('app_token');
          const resp = await fetch(`${AUTH_BACKEND_URL}/inventory/traceability?${qs.toString()}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (resp.ok) {
            const json = await resp.json();
            setEvents(Array.isArray(json.events) ? json.events : []);
            setSummary(json.summary || { inbound: 0, outbound: 0, net: 0, last_movement_at: null, distinct_locations: 0 });
            ok = true;
          }
        } catch {}
      }

      if (!ok) {
        // Fallback directo a Supabase
        let query = supabase
          .from('inventory_movements')
          .select('id, product_id, warehouse_id, location_id, movement_type, transaction_type, quantity, unit_cost, reference_number, reference_type, lot_number, expiry_date, reason, notes, created_at, products:product_id(name, sku), locations:location_id(code, name)')
          .order('created_at', { ascending: false })
          .limit(400);

        // Resolver productos por q si aplica
        const term = String(searchTerm || '').trim();
        if (term) {
          const { data: bySku } = await supabase
            .from('products')
            .select('id')
            .ilike('sku', `%${term}%`)
            .eq('is_active', true)
            .limit(300);
          const { data: byName } = await supabase
            .from('products')
            .select('id')
            .ilike('name', `%${term}%`)
            .eq('is_active', true)
            .limit(300);
          const ids = Array.from(new Set([...(bySku || []).map((r: any) => r.id), ...(byName || []).map((r: any) => r.id)]));
          if (ids.length > 0) query = query.in('product_id', ids as any);
          else {
            setEvents([]);
            setSummary({ inbound: 0, outbound: 0, net: 0, last_movement_at: null, distinct_locations: 0 });
            setLoading(false);
            return;
          }
        }
        if (type !== 'all') query = query.eq('movement_type', type);
        if (warehouseId) query = query.eq('warehouse_id', warehouseId);
        if (lotFilter) query = query.ilike('lot_number', `%${lotFilter}%`);

        // Rango de fechas
        const now = new Date();
        const toISOString = (d: Date) => new Date(d).toISOString();
        let fromDate: string | null = null;
        if (dateRange === '7days') { const d = new Date(now); d.setDate(d.getDate() - 7); fromDate = toISOString(d); }
        else if (dateRange === '30days') { const d = new Date(now); d.setDate(d.getDate() - 30); fromDate = toISOString(d); }
        else if (dateRange === '90days') { const d = new Date(now); d.setDate(d.getDate() - 90); fromDate = toISOString(d); }
        if (fromDate) query = query.gte('created_at', fromDate);

        const { data, error } = await query;
        if (error) throw error;
        const evs = (data || []) as TraceEvent[];
        setEvents(evs);
        let inbound = 0, outbound = 0; const locSet = new Set<string>();
        const last = evs[0]?.created_at || null;
        for (const e of evs) {
          if (String(e.movement_type).toUpperCase() === 'IN') inbound += Number(e.quantity || 0);
          if (String(e.movement_type).toUpperCase() === 'OUT') outbound += Number(e.quantity || 0);
          if (e.location_id) locSet.add(String(e.location_id));
        }
        setSummary({ inbound, outbound, net: inbound - outbound, last_movement_at: last, distinct_locations: locSet.size });
      }
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar la trazabilidad');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setType('all');
    setDateRange('90days');
    setWarehouseId('');
    setLotFilter('');
  };

  const infoText = useMemo(() => {
    const sku = events[0]?.products?.sku ? `SKU: ${events[0]?.products?.sku}` : '';
    const name = events[0]?.products?.name ? ` • ${events[0]?.products?.name}` : '';
    return `${sku}${name}`;
  }, [events]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Trazabilidad de Inventario</h2>
          <p className="text-gray-600">Línea de tiempo de movimientos por producto</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={onSearch} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 text-sm"
              placeholder="Buscar por SKU, ID o nombre de producto"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
            />
          </div>
          <button onClick={onSearch} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50">
            <Filter className="w-4 h-4 mr-2" /> Buscar
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo</label>
            <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="all">Todos</option>
              <option value="IN">Entrada</option>
              <option value="OUT">Salida</option>
              <option value="TRANSFER">Transferencia</option>
              <option value="ADJUSTMENT">Ajuste</option>
              <option value="COUNT">Recuento</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Rango</label>
            <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              <option value="7days">7 días</option>
              <option value="30days">30 días</option>
              <option value="90days">90 días</option>
              <option value="all">Todos</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Almacén</label>
            <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              <option value="">Todos</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Lote</label>
            <input className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={lotFilter} onChange={(e) => setLotFilter(e.target.value)} placeholder="Ej. LOTE-123" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{infoText || 'Ingresa un SKU para ver la línea de tiempo'}</span>
          <button onClick={clearFilters} className="text-sm text-gray-600 hover:text-gray-800">Limpiar filtros</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Entradas</span>
            <ArrowDownLeft className="w-4 h-4 text-green-600" />
          </div>
          <div className="mt-2 text-2xl font-semibold">{summary.inbound}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Salidas</span>
            <ArrowUpRight className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-2 text-2xl font-semibold">{summary.outbound}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Neto</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-semibold">{summary.net}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Ubicaciones</span>
            <MapPin className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-semibold">{summary.distinct_locations}</div>
          <div className="text-xs text-gray-500 mt-1">Último: {summary.last_movement_at ? new Date(summary.last_movement_at).toLocaleString() : '—'}</div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        {loading ? (
          <div className="py-12 text-center text-gray-600">Cargando trazabilidad…</div>
        ) : error ? (
          <div className="py-12 text-center text-red-600">{error}</div>
        ) : events.length === 0 ? (
          <div className="py-12 text-center text-gray-600">Sin eventos para los filtros seleccionados</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {events.map((e) => {
              const Icon = typeIcon(e.movement_type);
              const location = e.locations?.code || '—';
              const product = e.products?.sku ? `${e.products?.sku}` : '';
              const name = e.products?.name ? ` • ${e.products?.name}` : '';
              const total = e.unit_cost != null ? (Number(e.unit_cost) * Number(e.quantity || 0)) : null;
              return (
                <li key={e.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Icon className="w-5 h-5 mr-3 text-gray-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{typeLabel(e.movement_type)} <span className="text-gray-500 font-normal">• {e.quantity} u</span></div>
                        <div className="text-xs text-gray-600">
                          <Calendar className="inline w-3 h-3 mr-1" /> {new Date(e.created_at).toLocaleString()} • <Package className="inline w-3 h-3 mx-1" /> {product}{name} • Ubicación: {location}
                          {e.lot_number ? <> • Lote: {e.lot_number}</> : null}
                          {e.reference_number ? <> • Ref: {e.reference_number}</> : null}
                          {total != null ? <> • Valor: ${total.toFixed(2)}</> : null}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">{e.transaction_type || ''}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}