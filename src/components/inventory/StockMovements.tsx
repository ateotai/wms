import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowUpRight, ArrowDownLeft, RotateCcw, Calendar, User, MapPin, Package, Filter, Plus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Tipos locales para alinear con valores de UI y backend
type UiMovementType = 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT' | 'COUNT';
type TransactionSubtype =
  | 'RECEIPT'
  | 'TRANSFER_IN'
  | 'ADJUSTMENT_IN'
  | 'CYCLE_COUNT'
  | 'SHIPMENT'
  | 'TRANSFER_OUT'
  | 'ADJUSTMENT_OUT'
  | 'all';

interface BackendMovement {
  id: string;
  product_id: string;
  movement_type: UiMovementType;
  quantity: number;
  lot_number?: string;
  unit_cost?: number;
  created_at: string;
  reason?: string | null;
  reference_number?: string;
  performed_by?: string;
  locations?: { code?: string };
  products?: { sku?: string; name?: string };
}

interface StockMovementUI {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  type: UiMovementType;
  quantity: number;
  fromLocation?: string;
  toLocation?: string;
  reason: string;
  reference: string;
  userId: string;
  userName: string;
  timestamp: Date;
  unitCost?: number;
  totalValue: number;
  batchNumber?: string;
}

const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8082' : '');

// Opciones de selección basadas en tablas existentes
type WarehouseOption = { id: string; name: string; code: string; is_active: boolean };
type LocationOption = { id: string; warehouse_id: string | null; code: string; name: string | null; is_active: boolean | null };

// Utilidades: validar y resolver producto por ID/SKU/nombre
function isUuid(val: string): boolean {
  const s = String(val || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

async function resolveProductId(input: string): Promise<string | null> {
  const raw = String(input || '').trim();
  if (!raw) return null;
  // Si ya es UUID, usarlo directamente
  if (isUuid(raw)) return raw;

  // Primero: intentar resolver vía backend público (catálogo)
  try {
    if (AUTH_BACKEND_URL) {
      const resp = await fetch(`${AUTH_BACKEND_URL}/products/list?q=${encodeURIComponent(raw)}&limit=1`);
      if (resp.ok) {
        const json = await resp.json();
        const arr = Array.isArray(json.products) ? json.products : [];
        if (arr[0]?.id) return String(arr[0].id);
      }
    }
  } catch { /* noop */ }

  // Intentar por SKU exacto
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id')
      // Case-insensitive exact match (sin comodines)
      .ilike('sku', raw)
      .single();
    if (!error && data?.id) return String(data.id);
  } catch { /* noop */ }

  // Intentar por nombre (primera coincidencia)
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .ilike('name', `%${raw}%`)
      .limit(1);
    if (!error && Array.isArray(data) && data[0]?.id) return String(data[0].id);
  } catch { /* noop */ }

  return null;
}

// Resuelve o crea la ubicación por defecto de recepción (RECV) para el almacén dado.
async function ensureDefaultReceivingLocation(warehouseId: string): Promise<string | null> {
  try {
    if (!warehouseId) return null;
    // Buscar una ubicación activa de tipo 'receiving'
    const { data, error } = await supabase
      .from('locations')
      .select('id, code, location_type, is_active')
      .eq('warehouse_id', warehouseId)
      .eq('location_type', 'receiving')
      .eq('is_active', true)
      .order('code', { ascending: true })
      .limit(1);
    if (!error) {
      const row = Array.isArray(data) ? (data[0] || null) : (data as any);
      if (row?.id) return String(row.id);
    }

    // Fallback: buscar por código 'RECV' si existe con otro tipo
    const byCode = await supabase
      .from('locations')
      .select('id, code, is_active')
      .eq('warehouse_id', warehouseId)
      .eq('code', 'RECV')
      .eq('is_active', true)
      .limit(1);
    if (!byCode.error) {
      const row = Array.isArray(byCode.data) ? (byCode.data[0] || null) : (byCode.data as any);
      if (row?.id) return String(row.id);
    }

    // Intentar crearla vía backend cuando no existe
    const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('app_token') : null;
    if (!AUTH_BACKEND_URL || !token) return null;

    const resp = await fetch(`${AUTH_BACKEND_URL}/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        warehouse_id: warehouseId,
        code: 'RECV',
        name: 'Recepción',
        location_type: 'receiving',
        is_active: true,
      }),
    });
    if (resp.ok) {
      const json = await resp.json().catch(() => ({}));
      const id = json?.location?.id;
      if (id) return String(id);
    } else if (resp.status === 409) {
      // Duplicado: obtener la existente
      const { data: reData } = await supabase
        .from('locations')
        .select('id')
        .eq('warehouse_id', warehouseId)
        .eq('code', 'RECV')
        .eq('is_active', true)
        .order('code', { ascending: true })
        .limit(1);
      const row = Array.isArray(reData) ? (reData[0] || null) : (reData as any);
      if (row?.id) return String(row.id);
    }
  } catch (e) {
    console.warn('No se pudo resolver ubicación por defecto de recepción:', e);
  }
  return null;
}

export function StockMovements(
  {
    initialType,
    initialCreateType,
    filterScope
  }: { initialType?: UiMovementType | 'all'; initialCreateType?: UiMovementType; filterScope?: 'inbound' | 'outbound' | 'all' }
) {
  const { signOut, token } = useAuth();
  const [filterType, setFilterType] = useState<UiMovementType | 'all'>(initialType ?? 'all');
  const [dateRange, setDateRange] = useState('7days');
  const [filterSubtype, setFilterSubtype] = useState<TransactionSubtype>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movements, setMovements] = useState<StockMovementUI[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState<'single' | 'multiple' | 'csv'>('single');
  const [createForm, setCreateForm] = useState({
    productId: '',
    warehouseId: '',
    locationId: '',
    movementType: (initialCreateType ?? 'IN') as UiMovementType,
    transactionType: (initialCreateType ?? 'IN') === 'OUT' ? 'SHIPMENT' : 'RECEIPT',
    quantity: 0,
    unitCost: '',
    lotNumber: '',
    expiryDate: '',
    reason: '',
    notes: ''
  });
  // Estado auxiliar: disponibilidad y costo sugerido para el producto capturado
  const [maxAvailable, setMaxAvailable] = useState<number | null>(null);
  const [suggestedUnitCost, setSuggestedUnitCost] = useState<number | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState<boolean>(false);
  const [multiRows, setMultiRows] = useState<Array<{ productId: string; quantity: number; lotNumber?: string }>>([
    { productId: '', quantity: 0 }
  ]);
  const [csvRows, setCsvRows] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [csvError, setCsvError] = useState<string | null>(null);

  // Configuración de moneda y bloqueo de movimientos desde localStorage
  type Currency = 'MXN' | 'USD' | 'EUR';
  const [currency, setCurrency] = useState<Currency>('MXN');
  const [movementsDisabled, setMovementsDisabled] = useState(false);
  useEffect(() => {
    try {
      const c = (localStorage.getItem('system_currency') as Currency) || 'MXN';
      setCurrency(c);
      const disabled = localStorage.getItem('disable_inventory_movements') === 'true';
      setMovementsDisabled(Boolean(disabled));
    } catch (e) {
      // ignore
    }
  }, []);

  const currencyFormat = (value: number) => {
    const currencyCode = { MXN: 'MXN', USD: 'USD', EUR: 'EUR' }[currency];
    const locale = { MXN: 'es-MX', USD: 'en-US', EUR: 'es-ES' }[currency];
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(value);
  };

  const formatRowLocation = (m: StockMovementUI) => {
    if (m.type === 'TRANSFER') {
      const from = m.fromLocation ?? '—';
      const to = m.toLocation ?? '—';
      return `${from} → ${to}`;
    }
    if (m.type === 'IN' || m.type === 'ADJUSTMENT') {
      return m.toLocation ?? '—';
    }
    if (m.type === 'OUT') {
      return m.fromLocation ?? '—';
    }
    return m.toLocation ?? m.fromLocation ?? '—';
  };

  // Listados para selects
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);

  const mapSubtypeToType = (sub: TransactionSubtype): UiMovementType | 'all' => {
    switch (sub) {
      case 'RECEIPT': return 'IN';
      case 'TRANSFER_IN': return 'TRANSFER';
      case 'ADJUSTMENT_IN': return 'ADJUSTMENT';
      case 'CYCLE_COUNT': return 'COUNT';
      case 'SHIPMENT': return 'OUT';
      case 'TRANSFER_OUT': return 'TRANSFER';
      case 'ADJUSTMENT_OUT': return 'ADJUSTMENT';
      default: return 'all';
    }
  };

  const fetchMovements = useCallback(async () => {
    try {
      // Espera token cuando hay backend
      if (AUTH_BACKEND_URL && !token) {
        return;
      }
      setLoading(true);
      setError(null);
      if (!AUTH_BACKEND_URL) throw new Error('Backend no configurado');
      const effectiveType = filterSubtype !== 'all'
        ? (filterSubtype === 'RECEIPT'
            ? 'IN'
            : filterSubtype === 'TRANSFER_IN' || filterSubtype === 'TRANSFER_OUT'
              ? 'TRANSFER'
              : filterSubtype === 'ADJUSTMENT_IN' || filterSubtype === 'ADJUSTMENT_OUT'
                ? 'ADJUSTMENT'
                : filterSubtype === 'CYCLE_COUNT'
                  ? 'COUNT'
                  : 'all')
        : filterType;
      const resp = await fetch(`${AUTH_BACKEND_URL}/inventory/movements?type=${effectiveType}&period=${dateRange}` , {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!resp.ok) {
        // Si el token no es válido, cerrar sesión y avisar
        if (resp.status === 401) {
          try { localStorage.removeItem('app_token'); } catch (e) { console.debug('No se pudo limpiar token', e); }
          await signOut();
          setError('Sesión expirada. Vuelve a iniciar sesión.');
          return;
        }
        const text = await resp.text().catch(() => '');
        throw new Error(text || 'Error al cargar movimientos');
      }
      const json = await resp.json();
      const list: StockMovementUI[] = (json.movements || []).map((m: BackendMovement) => {
        const type: UiMovementType = m.movement_type;
        const qtySign = type === 'OUT' ? -1 : 1;
        const qty = (Number(m.quantity || 0) || 0) * qtySign;
        const unitCost = m.unit_cost !== undefined && m.unit_cost !== null ? Number(m.unit_cost) : undefined;
        const totalValue = unitCost ? qty * unitCost : 0;
        return {
          id: String(m.id),
          productId: String(m.product_id),
          sku: m.products?.sku || '',
          productName: m.products?.name || 'Producto',
          type,
          quantity: qty,
          fromLocation: undefined,
          toLocation: m.locations?.code || undefined,
          reason: m.reason || '',
          reference: m.reference_number || '',
          userId: m.performed_by || 'system',
          userName: 'Sistema',
          timestamp: new Date(m.created_at),
          unitCost,
          totalValue,
          batchNumber: m.lot_number || ''
        } as StockMovementUI;
      });
      setMovements(list);
    } catch (err: unknown) {
      console.error('Error fetching movements:', err);
      setError('Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  }, [filterSubtype, filterType, dateRange, signOut, token]);

  // Cargar almacenes activos al montar
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
        if (!createForm.warehouseId && list.length > 0) {
          setCreateForm((f) => ({ ...f, warehouseId: list[0].id }));
        }
      } catch (e) {
        console.error('Error cargando almacenes:', e);
      }
    };
    loadWarehouses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar ubicaciones activas al cambiar almacén
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
        const list = (data || []) as LocationOption[];
        setLocations(list);

        // Autocompletar ubicación por defecto: RECV si no hay una selección
        const currentId = createForm.locationId;
        const exists = currentId && list.some(l => String(l.id) === String(currentId));
        if (!exists) {
          // Buscar RECV en las ubicaciones cargadas
          const recv = list.find(l => String(l.code).toUpperCase() === 'RECV');
          let nextId: string | null = recv ? String(recv.id) : null;
          if (!nextId) {
            // Resolver o crear RECV vía helper
            nextId = await ensureDefaultReceivingLocation(wid);
            if (nextId && !list.some(l => String(l.id) === String(nextId))) {
              // Asegurar que aparezca en el select
              setLocations(prev => ([...prev, { id: nextId!, warehouse_id: wid, code: 'RECV', name: 'Recepción', is_active: true } as LocationOption]));
            }
          }
          if (!nextId && list.length > 0) {
            nextId = String(list[0].id);
          }
          if (nextId) {
            setCreateForm(f => ({ ...f, locationId: nextId! }));
          }
        }
      } catch (e) {
        console.error('Error cargando ubicaciones:', e);
      }
    };
    loadLocations(createForm.warehouseId);
  }, [createForm.warehouseId]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const filteredMovements = useMemo(() => movements.filter(movement => {
    const effectiveType = filterSubtype !== 'all' ? mapSubtypeToType(filterSubtype) : filterType;
    if (effectiveType !== 'all' && movement.type !== effectiveType) {
      return false;
    }

    const now = new Date();
    const movementDate = new Date(movement.timestamp);
    
    switch (dateRange) {
      case '1day':
        return (now.getTime() - movementDate.getTime()) <= 24 * 60 * 60 * 1000;
      case '7days':
        return (now.getTime() - movementDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
      case '30days':
        return (now.getTime() - movementDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
      default:
        return true;
    }
  }), [movements, filterType, dateRange, filterSubtype]);

  // Opciones de filtro por tipo según el alcance (entradas/salidas/todos)
  const scope: 'inbound' | 'outbound' | 'all' = filterScope ?? 'all';
  const filterOptions: Array<{ value: UiMovementType | 'all'; label: string }> = useMemo(() => {
    if (scope === 'inbound') {
      return [
        { value: 'IN', label: 'Entradas' },
        { value: 'TRANSFER', label: 'Transferencias' },
        { value: 'ADJUSTMENT', label: 'Ajustes' },
        { value: 'COUNT', label: 'Conteo cíclico' },
      ];
    }
    if (scope === 'outbound') {
      return [
        { value: 'OUT', label: 'Salidas' },
        { value: 'TRANSFER', label: 'Transferencias' },
        { value: 'ADJUSTMENT', label: 'Ajustes' },
      ];
    }
    return [
      { value: 'all', label: 'Todos' },
      { value: 'IN', label: 'Entradas' },
      { value: 'OUT', label: 'Salidas' },
      { value: 'TRANSFER', label: 'Transferencias' },
      { value: 'ADJUSTMENT', label: 'Ajustes' },
      { value: 'COUNT', label: 'Conteo cíclico' },
    ];
  }, [scope]);

  const subtypeOptions: Array<{ value: TransactionSubtype; label: string }> = useMemo(() => {
    if (scope === 'inbound') {
      return [
        { value: 'all', label: 'Todas' },
        { value: 'RECEIPT', label: 'Recepción manual' },
        { value: 'TRANSFER_IN', label: 'Transferencia entrada' },
        { value: 'ADJUSTMENT_IN', label: 'Ajuste entrada' },
        { value: 'CYCLE_COUNT', label: 'Conteo cíclico' },
      ];
    }
    if (scope === 'outbound') {
      return [
        { value: 'all', label: 'Todas' },
        { value: 'SHIPMENT', label: 'Salida por venta' },
        { value: 'TRANSFER_OUT', label: 'Transferencia salida' },
        { value: 'ADJUSTMENT_OUT', label: 'Ajuste salida' },
      ];
    }
    return [ { value: 'all', label: 'Todas' } ];
  }, [scope]);

  const getMovementIcon = (type: UiMovementType) => {
    switch (type) {
      case 'IN':
        return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
      case 'OUT':
        return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      case 'TRANSFER':
        return <RotateCcw className="w-4 h-4 text-blue-600" />;
      case 'ADJUSTMENT':
        return <Package className="w-4 h-4 text-orange-600" />;
      default:
        return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  const getMovementTypeLabel = (type: UiMovementType) => {
    switch (type) {
      case 'IN':
        return 'Entrada';
      case 'OUT':
        return 'Salida';
      case 'TRANSFER':
        return 'Transferencia';
      case 'ADJUSTMENT':
        return 'Ajuste';
      default:
        return type;
    }
  };

  const getMovementColor = (type: UiMovementType) => {
    switch (type) {
      case 'IN':
        return 'text-green-600 bg-green-50';
      case 'OUT':
        return 'text-red-600 bg-red-50';
      case 'TRANSFER':
        return 'text-blue-600 bg-blue-50';
      case 'ADJUSTMENT':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Helper: cargar disponibilidad y último costo al capturar producto (SKU o ID)
  const loadAvailabilityAndCost = useCallback(async (rawInput: string, warehouseId?: string) => {
    try {
      const raw = String(rawInput || '').trim();
      if (!raw) {
        setMaxAvailable(null);
        setSuggestedUnitCost(null);
        return;
      }
      setAvailabilityLoading(true);

      let productId: string | null = null;
      let productSku: string | null = null;
      let productCostFromCatalog: number | null = null;

      // 1) Resolver producto con backend catálogo para obtener id/sku y costo
      try {
        if (AUTH_BACKEND_URL) {
          const token = localStorage.getItem('app_token');
          const qs = new URLSearchParams({ q: raw, limit: '1' });
          const resp = await fetch(`${AUTH_BACKEND_URL}/products/list?${qs.toString()}`);
          if (resp.ok) {
            const json = await resp.json();
            const p = Array.isArray(json.products) && json.products[0] ? json.products[0] : null;
            if (p) {
              productId = String(p.id || '');
              productSku = String(p.sku || '');
              productCostFromCatalog = p.cost_price !== undefined && p.cost_price !== null ? Number(p.cost_price) : null;
            }
          }
        }
      } catch (e) {
        // noop (continuar con fallbacks)
      }

      // Si no pudimos resolver por backend, intentar vía Supabase
      if (!productId || !productSku) {
        try {
          const { data, error } = await supabase
            .from('products')
            .select('id, sku, cost_price')
            .or(`sku.ilike.*${raw}*,name.ilike.*${raw}*`)
            .limit(1);
          if (!error && Array.isArray(data) && data[0]) {
            productId = String((data[0] as any).id || '');
            productSku = String((data[0] as any).sku || '');
            productCostFromCatalog = (data[0] as any).cost_price !== undefined && (data[0] as any).cost_price !== null
              ? Number((data[0] as any).cost_price)
              : null;
          }
        } catch { /* noop */ }
      }

      // 2) Obtener disponibilidad desde backend (preferido), filtrando por almacén si aplica
      let availableSum = 0;
      let unitCostFallback = productCostFromCatalog;
      try {
        if (AUTH_BACKEND_URL && productSku) {
          const token = localStorage.getItem('app_token');
          const qs = new URLSearchParams({ q: productSku });
          if (warehouseId) qs.set('warehouse_id', warehouseId);
          const resp = await fetch(`${AUTH_BACKEND_URL}/inventory/list?${qs.toString()}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (resp.ok) {
            const json = await resp.json();
            const rows = Array.isArray(json.inventory) ? json.inventory : [];
            for (const r of rows) {
              availableSum += Number(r.available_quantity || 0);
              if (unitCostFallback == null && r.unit_cost !== undefined && r.unit_cost !== null) {
                unitCostFallback = Number(r.unit_cost);
              }
              if (!productId && r.product_id) {
                productId = String(r.product_id);
              }
            }
          }
        }
      } catch (e) {
        // noop
      }

      // 3) Fallback de disponibilidad vía Supabase directo (evitar OR cruzando tablas)
      if (availableSum === 0 && productSku) {
        try {
          // Construir consulta base
          let query = supabase
            .from('inventory')
            .select('product_id, warehouse_id, available_quantity, products:product_id(cost_price, sku)')
            .eq('products.is_active', true);
          if (warehouseId) query = query.eq('warehouse_id', warehouseId);

          // Si ya conocemos el productId, filtramos directamente
          if (productId) {
            query = query.eq('product_id', productId);
          } else {
            // Buscar IDs de productos coincidentes por SKU para evitar OR con referencias cruzadas
            const { data: prodMatches } = await supabase
              .from('products')
              .select('id, cost_price, sku')
              .ilike('sku', `%${productSku}%`)
              .eq('is_active', true)
              .limit(50);
            const ids = (prodMatches || []).map((p: any) => p.id);
            if (ids.length === 0) {
              // No hay coincidencias; no continuar
              throw new Error('no-product-matches');
            }
            query = query.in('product_id', ids as any);
            // Si no hay costo aún, intentar tomar el primero del catálogo
            if (unitCostFallback == null && prodMatches && prodMatches[0]?.cost_price != null) {
              unitCostFallback = Number(prodMatches[0].cost_price);
            }
          }

          const { data, error } = await query;
          if (!error && Array.isArray(data)) {
            for (const r of data as any[]) {
              availableSum += Number(r.available_quantity || 0);
              if (!productId && r.product_id) productId = String(r.product_id);
              if (unitCostFallback == null && r.products?.cost_price != null) unitCostFallback = Number(r.products.cost_price);
            }
          }
        } catch { /* noop */ }
      }

      setMaxAvailable(availableSum);

      // 4) Intentar obtener último costo desde movimientos de entrada (backend)
      let lastCost: number | null = null;
      try {
        if (AUTH_BACKEND_URL && productId) {
          const token = localStorage.getItem('app_token');
          const resp = await fetch(`${AUTH_BACKEND_URL}/inventory/movements?type=IN&period=all`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (resp.ok) {
            const json = await resp.json();
            const arr = Array.isArray(json.movements) ? json.movements : [];
            const filtered = arr.filter((m: any) => String(m.product_id) === String(productId) && m.unit_cost !== undefined && m.unit_cost !== null);
            if (filtered.length > 0) {
              filtered.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              lastCost = Number(filtered[0].unit_cost);
            }
          }
        }
      } catch { /* noop */ }

      // 5) Fallback: usar precio costo del catálogo si no hubo último costo
      if (lastCost == null && unitCostFallback != null) {
        lastCost = Number(unitCostFallback);
      }

      setSuggestedUnitCost(lastCost);
      // Autocompletar campo si el usuario no ha escrito un valor
      if (lastCost != null) {
        setCreateForm((f) => ({ ...f, unitCost: f.unitCost ? f.unitCost : String(lastCost) }));
      }

      // Ajuste suave de cantidad si es salida y excede disponible
      if (createForm.movementType === 'OUT' && availableSum > 0) {
        setCreateForm((f) => ({ ...f, quantity: Math.min(Number(f.quantity || 0), availableSum) }));
      }
    } finally {
      setAvailabilityLoading(false);
    }
  }, [createForm.movementType]);

  // Helper sin efectos: obtener disponibilidad actual de un producto para validación de guardado
  const getAvailableQuantity = useCallback(async (rawInput: string, warehouseId?: string): Promise<number> => {
    let availableSum = 0;
    let productSku: string | null = null;
    try {
      const raw = String(rawInput || '').trim();
      if (!raw) return 0;
      // Resolver SKU por backend o por Supabase
      try {
        if (AUTH_BACKEND_URL) {
          const qs = new URLSearchParams({ q: raw, limit: '1' });
          const resp = await fetch(`${AUTH_BACKEND_URL}/products/list?${qs.toString()}`);
          if (resp.ok) {
            const json = await resp.json();
            const p = Array.isArray(json.products) && json.products[0] ? json.products[0] : null;
            if (p?.sku) productSku = String(p.sku);
          }
        }
      } catch {}
      if (!productSku) {
        try {
          const { data } = await supabase
            .from('products')
            .select('sku')
            .or(`sku.ilike.*${raw}*,name.ilike.*${raw}*`)
            .limit(1);
          const row = Array.isArray(data) ? data[0] : null;
          if (row?.sku) productSku = String(row.sku);
        } catch {}
      }
      if (!productSku) return 0;
      // Inventario desde backend preferido
      try {
        if (AUTH_BACKEND_URL) {
          const token = localStorage.getItem('app_token');
          const qs = new URLSearchParams({ q: productSku });
          if (warehouseId) qs.set('warehouse_id', warehouseId);
          const resp = await fetch(`${AUTH_BACKEND_URL}/inventory/list?${qs.toString()}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (resp.ok) {
            const json = await resp.json();
            const rows = Array.isArray(json.inventory) ? json.inventory : [];
            for (const r of rows) availableSum += Number(r.available_quantity || 0);
          }
        }
      } catch {}
      // Fallback Supabase si backend no arroja datos (evitar OR cruzando tablas)
      if (availableSum === 0) {
        try {
          let query = supabase
            .from('inventory')
            .select('available_quantity, product_id, products:product_id(sku)')
            .eq('products.is_active', true);
          if (warehouseId) query = query.eq('warehouse_id', warehouseId);

          if (productId) {
            query = query.eq('product_id', productId);
          } else {
            const { data: prodMatches } = await supabase
              .from('products')
              .select('id, sku')
              .ilike('sku', `%${productSku}%`)
              .eq('is_active', true)
              .limit(50);
            const ids = (prodMatches || []).map((p: any) => p.id);
            if (ids.length === 0) {
              throw new Error('no-product-matches');
            }
            query = query.in('product_id', ids as any);
          }

          const { data } = await query;
          for (const r of (data || []) as any[]) availableSum += Number(r.available_quantity || 0);
        } catch {}
      }
    } catch {}
    return availableSum;
  }, []);

  // Disparar carga de disponibilidad/costo al cambiar producto, almacén o tipo de movimiento
  useEffect(() => {
    if (createMode === 'single' && createForm.productId) {
      // Solo aplica para salidas de stock; aún así precargamos costo para otros tipos
      loadAvailabilityAndCost(createForm.productId, createForm.warehouseId || undefined);
    } else {
      setMaxAvailable(null);
      setSuggestedUnitCost(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createForm.productId, createForm.warehouseId, createForm.movementType, createMode]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Tipo:</span>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as UiMovementType | 'all')}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            {filterOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {scope !== 'all' && (
            <>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Subclasificación:</span>
              </div>
              <select
                value={filterSubtype}
                onChange={(e) => setFilterSubtype(e.target.value as TransactionSubtype)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                {subtypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Período:</span>
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="1day">Último día</option>
            <option value="7days">Últimos 7 días</option>
            <option value="30days">Últimos 30 días</option>
            <option value="all">Todo el período</option>
          </select>
        </div>

        <div className="flex items-center">
          <button
            onClick={() => {
              if (movementsDisabled) {
                alert('Los movimientos de inventario están desactivados por configuración.');
                return;
              }
              setShowCreateModal(true);
            }}
            disabled={movementsDisabled}
            className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
              movementsDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Movimiento
          </button>
        </div>
      </div>

      {/* Movements List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Movimientos de Stock ({filteredMovements.length})
          </h3>
        </div>

        {loading && (
          <div className="p-6 text-sm text-gray-500">Cargando movimientos...</div>
        )}
        {error && !loading && (
          <div className="p-6 text-sm text-red-600">{error}</div>
        )}

        {!loading && !error && filteredMovements.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Referencia</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ubicación</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Cantidad</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Fecha</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMovements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMovementColor(movement.type)}`}>
                        {getMovementTypeLabel(movement.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">#{movement.reference}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{movement.productName}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{movement.sku}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatRowLocation(movement)}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </span>
                      {movement.batchNumber && (
                        <span className="ml-2 text-xs text-gray-400">Lote: {movement.batchNumber}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      {movement.totalValue !== 0 ? currencyFormat(Math.abs(movement.totalValue)) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{movement.userName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{movement.timestamp.toLocaleString('es-ES')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && filteredMovements.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay movimientos</h3>
            <p className="mt-1 text-sm text-gray-500">
              No se encontraron movimientos para los filtros seleccionados.
            </p>
          </div>
        )}
      </div>

      {/* Create Movement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => setShowCreateModal(false)} />
            <div className="relative bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Nuevo Movimiento Manual</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Selector de modo */}
              <div className="mb-4">
                <div className="inline-flex rounded-md shadow-sm" role="group">
                  <button
                    type="button"
                    onClick={() => setCreateMode('single')}
                    className={`px-4 py-2 border border-gray-300 text-sm rounded-l-md ${createMode === 'single' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    Único
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateMode('multiple')}
                    className={`px-4 py-2 border-t border-b border-gray-300 text-sm ${createMode === 'multiple' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    Múltiple
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateMode('csv')}
                    className={`px-4 py-2 border border-gray-300 text-sm rounded-r-md ${createMode === 'csv' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    CSV
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {createMode === 'single' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Producto (SKU o ID)</label>
                    <input
                      value={createForm.productId}
                      onChange={(e) => setCreateForm({ ...createForm, productId: e.target.value })}
                      onBlur={(e) => loadAvailabilityAndCost(e.target.value, createForm.warehouseId || undefined)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="SKU o UUID del producto"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Almacén</label>
                  <select
                    value={createForm.warehouseId}
                    onChange={(e) => setCreateForm({ ...createForm, warehouseId: e.target.value, locationId: '' })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Selecciona almacén</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                  <select
                    value={createForm.locationId}
                    onChange={(e) => setCreateForm({ ...createForm, locationId: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Sin ubicación</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.code || l.name || 'Ubicación'}</option>
                    ))}
                  </select>
                </div>
                {createMode === 'single' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                    <input
                      type="number"
                      value={createForm.quantity}
                      min={0}
                      max={createForm.movementType === 'OUT' && maxAvailable != null ? Math.max(0, maxAvailable) : undefined}
                      onChange={(e) => {
                        const val = Number(e.target.value || 0);
                        const limited = createForm.movementType === 'OUT' && maxAvailable != null ? Math.min(val, Math.max(0, maxAvailable)) : val;
                        setCreateForm({ ...createForm, quantity: limited });
                      }}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="> 0"
                    />
                    {createForm.movementType === 'OUT' && (
                      <p className="mt-1 text-xs text-gray-500">
                        {availabilityLoading ? 'Calculando disponibilidad…' : `Disponible: ${maxAvailable != null ? maxAvailable : '—'}`}
                      </p>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={createForm.movementType}
                    onChange={(e) => {
                      const mt = e.target.value as UiMovementType;
                      setCreateForm({ ...createForm, movementType: mt, transactionType: mt === 'OUT' ? 'SHIPMENT' : 'RECEIPT' });
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="IN">Entrada</option>
                    <option value="OUT">Salida</option>
                    <option value="ADJUSTMENT">Ajuste</option>
                    <option value="TRANSFER">Transferencia</option>
                    <option value="COUNT">Conteo cíclico</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subclasificación</label>
                  <select
                    value={createForm.transactionType}
                    onChange={(e) => setCreateForm({ ...createForm, transactionType: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    {createForm.movementType === 'OUT' ? (
                      <>
                        <option value="SHIPMENT">Salida por venta</option>
                        <option value="TRANSFER_OUT">Transferencia salida</option>
                        <option value="ADJUSTMENT_OUT">Ajuste salida</option>
                      </>
                    ) : createForm.movementType === 'IN' ? (
                      <>
                        <option value="RECEIPT">Recepción manual</option>
                        <option value="TRANSFER_IN">Transferencia entrada</option>
                        <option value="ADJUSTMENT_IN">Ajuste entrada</option>
                        <option value="CYCLE_COUNT">Conteo cíclico</option>
                      </>
                    ) : createForm.movementType === 'ADJUSTMENT' ? (
                      <>
                        <option value="ADJUSTMENT_IN">Ajuste entrada</option>
                        <option value="ADJUSTMENT_OUT">Ajuste salida</option>
                      </>
                    ) : createForm.movementType === 'TRANSFER' ? (
                      <>
                        <option value="TRANSFER_IN">Transferencia entrada</option>
                        <option value="TRANSFER_OUT">Transferencia salida</option>
                      </>
                    ) : (
                      <>
                        <option value="CYCLE_COUNT">Conteo cíclico</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo unitario</label>
                  <input
                    type="number"
                    value={createForm.unitCost}
                    onChange={(e) => setCreateForm({ ...createForm, unitCost: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Opcional"
                  />
                  {suggestedUnitCost != null && (
                    <p className="mt-1 text-xs text-gray-500">Sugerido: {Number.isFinite(suggestedUnitCost) ? suggestedUnitCost : '—'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lote</label>
                  <input
                    value={createForm.lotNumber}
                    onChange={(e) => setCreateForm({ ...createForm, lotNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Caducidad</label>
                  <input
                    type="date"
                    value={createForm.expiryDate}
                    onChange={(e) => setCreateForm({ ...createForm, expiryDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                  <input
                    value={createForm.reason}
                    onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Descripción breve"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    rows={3}
                  />
                </div>
              </div>

              {/* Modo Múltiple: captura por renglones */}
              {createMode === 'multiple' && (
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Almacén</label>
                      <select
                        value={createForm.warehouseId}
                        onChange={(e) => setCreateForm({ ...createForm, warehouseId: e.target.value, locationId: '' })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="">Selecciona almacén</option>
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                      <select
                        value={createForm.locationId}
                        onChange={(e) => setCreateForm({ ...createForm, locationId: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="">Sin ubicación</option>
                        {locations.map((l) => (
                          <option key={l.id} value={l.id}>{l.code || l.name || 'Ubicación'}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                      <select
                        value={createForm.movementType}
                        onChange={(e) => {
                          const mt = e.target.value as UiMovementType;
                          setCreateForm({ ...createForm, movementType: mt, transactionType: mt === 'OUT' ? 'SHIPMENT' : 'RECEIPT' });
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="IN">Entrada</option>
                        <option value="OUT">Salida</option>
                        <option value="ADJUSTMENT">Ajuste</option>
                      </select>
                    </div>
                  </div>

                    <div className="border border-gray-200 rounded-md overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Productos y cantidades</span>
                      <button
                        onClick={() => setMultiRows([...multiRows, { productId: '', quantity: 0 }])}
                        className="inline-flex items-center px-2 py-1 text-sm rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Agregar renglón
                      </button>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {multiRows.map((row, idx) => (
                        <div key={idx} className="px-4 py-3 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                          <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Producto (SKU o ID)</label>
                            <input
                              value={row.productId}
                              onChange={(e) => {
                                const next = [...multiRows];
                                next[idx] = { ...row, productId: e.target.value };
                                setMultiRows(next);
                              }}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="SKU o UUID del producto"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                            <input
                              type="number"
                              value={row.quantity}
                              onChange={(e) => {
                                const next = [...multiRows];
                                next[idx] = { ...row, quantity: Number(e.target.value || 0) };
                                setMultiRows(next);
                              }}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                              placeholder="> 0"
                            />
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={() => setMultiRows(multiRows.filter((_, i) => i !== idx))}
                              className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Los campos superiores se aplican a todos los renglones.</p>
                </div>
              )}

              {/* Modo CSV: carga de archivo */}
              {createMode === 'csv' && (
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Almacén</label>
                      <select
                        value={createForm.warehouseId}
                        onChange={(e) => setCreateForm({ ...createForm, warehouseId: e.target.value, locationId: '' })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="">Selecciona almacén</option>
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                      <select
                        value={createForm.locationId}
                        onChange={(e) => setCreateForm({ ...createForm, locationId: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="">Sin ubicación</option>
                        {locations.map((l) => (
                          <option key={l.id} value={l.id}>{l.code || l.name || 'Ubicación'}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                      <select
                        value={createForm.movementType}
                        onChange={(e) => {
                          const mt = e.target.value as UiMovementType;
                          setCreateForm({ ...createForm, movementType: mt, transactionType: mt === 'OUT' ? 'SHIPMENT' : 'RECEIPT' });
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="IN">Entrada</option>
                        <option value="OUT">Salida</option>
                        <option value="ADJUSTMENT">Ajuste</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Archivo CSV</label>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          try {
                            const text = String(reader.result || '').trim();
                            const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
                            if (lines.length === 0) {
                              setCsvRows([]);
                              setCsvError('CSV vacío');
                              return;
                            }
                            const header = lines[0].split(',').map(h => h.trim().toLowerCase());
                            const idxProduct = header.indexOf('productid') >= 0 ? header.indexOf('productid') : header.indexOf('product_id');
                            const idxQty = header.indexOf('quantity');
                            if (idxProduct < 0 || idxQty < 0) {
                              setCsvError('El CSV debe incluir columnas productId y quantity');
                              setCsvRows([]);
                              return;
                            }
                            const parsed: Array<{ productId: string; quantity: number }> = [];
                            for (let i = 1; i < lines.length; i++) {
                              const cols = lines[i].split(',').map(c => c.trim());
                              const pid = cols[idxProduct];
                              const qty = Number(cols[idxQty] || 0);
                              if (!pid || !isFinite(qty) || qty <= 0) continue;
                              parsed.push({ productId: pid, quantity: qty });
                            }
                            setCsvRows(parsed);
                            setCsvError(null);
                          } catch (err: unknown) {
                            console.error('CSV parse error', err);
                            setCsvError('Error leyendo CSV');
                            setCsvRows([]);
                          }
                        };
                        reader.readAsText(file);
                      }}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                    {csvError && (
                      <p className="text-xs text-red-600 mt-1">{csvError}</p>
                    )}
                    {!csvError && csvRows.length > 0 && (
                      <p className="text-xs text-gray-600 mt-1">{csvRows.length} renglones detectados</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (movementsDisabled) {
                        alert('Los movimientos de inventario están desactivados por configuración.');
                        return;
                      }
                      const token = localStorage.getItem('app_token');
                      if (!AUTH_BACKEND_URL) throw new Error('Backend no configurado');
                      // Resolver ubicación por defecto si no se seleccionó
                      let locationIdFinal: string | null = createForm.locationId || null;
                      if (!locationIdFinal && createForm.warehouseId) {
                        locationIdFinal = await ensureDefaultReceivingLocation(createForm.warehouseId);
                      }

                      const common = {
                        warehouse_id: createForm.warehouseId,
                        location_id: locationIdFinal || null,
                        movement_type: createForm.movementType,
                        transaction_type: createForm.transactionType,
                        unit_cost: createForm.unitCost ? Number(createForm.unitCost) : (suggestedUnitCost != null ? Number(suggestedUnitCost) : null),
                        lot_number: createForm.lotNumber || null,
                        expiry_date: createForm.expiryDate || null,
                        reason: createForm.reason || null,
                        notes: createForm.notes || null
                      };

                      const postMovement = async (payload: Record<string, unknown>) => {
                        const resp = await fetch(`${AUTH_BACKEND_URL}/inventory/movements`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {})
                          },
                          body: JSON.stringify(payload)
                        });
                        if (!resp.ok) {
                          if (resp.status === 401) {
                            try { localStorage.removeItem('app_token'); } catch (e) { console.debug('No se pudo limpiar token', e); }
                            await signOut();
                            throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
                          }
                          const text = await resp.text().catch(() => '');
                          throw new Error(text || 'Error al crear movimiento');
                        }
                      };

                      if (createMode === 'single') {
                        const resolvedId = await resolveProductId(createForm.productId);
                        if (!resolvedId) {
                          alert('Producto no encontrado. Usa SKU, nombre o ID válido.');
                          return;
                        }
                        // Validación estricta: para salidas no exceder disponibilidad
                        if (createForm.movementType === 'OUT') {
                          const available = await getAvailableQuantity(createForm.productId, createForm.warehouseId || undefined);
                          if (available <= 0) {
                            alert('No hay disponibilidad para este producto en el almacén seleccionado.');
                            return;
                          }
                          if (Number(createForm.quantity || 0) > available) {
                            alert(`Cantidad a sacar (${createForm.quantity}) excede disponible (${available}). Ajusta la cantidad.`);
                            return;
                          }
                        }
                        const payload = { ...common, product_id: resolvedId, quantity: createForm.quantity };
                        if (!payload.product_id || !payload.warehouse_id || !payload.movement_type || !payload.transaction_type || !payload.quantity) {
                          alert('Completa los campos obligatorios');
                          return;
                        }
                        await postMovement(payload);
                      } else if (createMode === 'multiple') {
                        if (!createForm.warehouseId) {
                          alert('El almacén es obligatorio');
                          return;
                        }
                        const invalids: string[] = [];
                        const toCreate: Record<string, unknown>[] = [];
                        for (const r of multiRows) {
                          const id = await resolveProductId(r.productId);
                          const qty = Number(r.quantity || 0);
                          if (!id || !qty || qty <= 0) {
                            invalids.push(`${r.productId}: producto/cantidad inválidos`);
                            continue;
                          }
                          if (createForm.movementType === 'OUT') {
                            const available = await getAvailableQuantity(r.productId, createForm.warehouseId || undefined);
                            if (available <= 0) {
                              invalids.push(`${r.productId}: sin disponibilidad en almacén`);
                              continue;
                            }
                            if (qty > available) {
                              invalids.push(`${r.productId}: cantidad ${qty} excede disponible ${available}`);
                              continue;
                            }
                          }
                          toCreate.push({ ...common, product_id: id, quantity: qty });
                        }
                        if (invalids.length > 0) {
                          alert(`Algunas filas no son válidas:\n${invalids.join('\n')}`);
                          return;
                        }
                        for (const payload of toCreate) {
                          await postMovement(payload);
                        }
                      } else if (createMode === 'csv') {
                        if (!createForm.warehouseId) {
                          alert('El almacén es obligatorio');
                          return;
                        }
                        const invalids: string[] = [];
                        const toCreate: Record<string, unknown>[] = [];
                        for (const r of csvRows) {
                          const id = await resolveProductId(r.productId);
                          const qty = Number(r.quantity || 0);
                          if (!id || !qty || qty <= 0) {
                            invalids.push(`${r.productId}: producto/cantidad inválidos`);
                            continue;
                          }
                          if (createForm.movementType === 'OUT') {
                            const available = await getAvailableQuantity(r.productId, createForm.warehouseId || undefined);
                            if (available <= 0) {
                              invalids.push(`${r.productId}: sin disponibilidad en almacén`);
                              continue;
                            }
                            if (qty > available) {
                              invalids.push(`${r.productId}: cantidad ${qty} excede disponible ${available}`);
                              continue;
                            }
                          }
                          toCreate.push({ ...common, product_id: id, quantity: qty });
                        }
                        if (invalids.length > 0) {
                          alert(`Renglones inválidos en CSV:\n${invalids.join('\n')}`);
                          return;
                        }
                        for (const payload of toCreate) {
                          await postMovement(payload);
                        }
                      }

                      await fetchMovements();
                      setShowCreateModal(false);
                      setCreateForm({
                        productId: '', warehouseId: '', locationId: '', movementType: 'IN', transactionType: 'RECEIPT', quantity: 0,
                        unitCost: '', lotNumber: '', expiryDate: '', reason: '', notes: ''
                      });
                      setMultiRows([{ productId: '', quantity: 0 }]);
                      setCsvRows([]);
                      alert('Movimiento(s) creado(s)');
                    } catch (err: unknown) {
                      console.error('Error creando movimiento:', err);
                      const msg = err instanceof Error ? err.message : 'Error al crear movimiento';
                      alert(msg);
                    }
                  }}
                  className="px-4 py-2 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}