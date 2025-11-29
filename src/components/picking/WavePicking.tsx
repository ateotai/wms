import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
  import { 
  Waves, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Play,
  Plus,
  Eye,
  Edit,
  Pause,
  Package,
  MapPin,
  BarChart3,
  TrendingUp,
  Calendar,
  Trash2
  } from 'lucide-react';

interface WaveBatch {
  id: string;
  name: string;
  orders: number;
  items: number;
  assignedTo: string;
  status: 'pending' | 'in_progress' | 'completed';
  zone: string;
}

interface Wave {
  id: string;
  name: string;
  status: 'planning' | 'released' | 'in_progress' | 'completed' | 'paused';
  priority: 'high' | 'medium' | 'low';
  batches: WaveBatch[];
  totalOrders: number;
  totalItems: number;
  estimatedTime: number;
  actualTime?: number;
  createdAt: string;
  releasedAt?: string;
  completedAt?: string;
  efficiency: number;
  completedBatches: number;
  zones: string[];
  cutoffTime: string;
  shipmentDate: string;
}

export function WavePicking() {
  const { user, token } = useAuth();
  const [waves, setWaves] = useState<Wave[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [existingBatchNames, setExistingBatchNames] = useState<string[]>([]);
  // Estado para ítems consolidados de la ola seleccionada
  const [waveItems, setWaveItems] = useState<Array<{
    id: string;
    batchId: string;
    batchName: string;
    productId: string;
    sku: string;
    description: string;
    quantity: number;
    unit?: string;
    sourceLocation: string | null;
    expiryDate?: string | null;
    pickedQuantity: number;
    status: 'picking_pending' | 'picking_confirmed' | 'cancelled';
    weight?: number | null;
    dimensions?: string | null;
    barcode?: string | null;
    locationDetails?: {
      code: string | null;
      zone?: string | null;
      aisle?: string | null;
      rack?: string | null;
      shelf?: string | null;
      bin?: string | null;
    } | null;
  }>>([]);
  const [waveBarcodeInputs, setWaveBarcodeInputs] = useState<Record<string, string>>({});
  const [waveLocationInputs, setWaveLocationInputs] = useState<Record<string, string>>({});
  const [waveItemTimers, setWaveItemTimers] = useState<Record<string, { startAt?: number; endAt?: number; locationVerified?: boolean }>>({});
  const [nowTick, setNowTick] = useState<number>(Date.now());

  // Utilidad para calcular estado de ola desde estados de lotes
  const deriveWaveStatus = (batches: WaveBatch[]): Wave['status'] => {
    const statuses = new Set(batches.map(b => b.status));
    if (batches.length === 0) return 'planning';
    if (statuses.has('in_progress')) return 'in_progress';
    if (statuses.size === 1 && statuses.has('completed')) return 'completed';
    if (statuses.has('pending') && !statuses.has('in_progress')) return 'released';
    return 'planning';
  };

  const isAdmin = (user?.role as any) === 'ADMIN';

  const maxPriority = (arr: Array<'high' | 'medium' | 'low'>): 'high' | 'medium' | 'low' => {
    if (arr.includes('high')) return 'high';
    if (arr.includes('medium')) return 'medium';
    return 'low';
  };

  // Cargar lotes y computar olas agrupadas por código de ola (OLA-YYYYMMDD-XXX)
  useEffect(() => {
    const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8082' : '');
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`${AUTH_BACKEND_URL}/picking/batches`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        const arr = Array.isArray(json?.batches) ? json.batches : [];
        setExistingBatchNames(arr.map((b: any) => String(b.name || '')));
        // Mapear a estructura de lotes simplificados para olas
        const simpleBatches: Array<{
          id: string;
          name: string;
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          assignedTo: string;
          zone: string;
          ordersCount: number;
          items: number;
          estimatedTime: number;
          actualTime?: number;
          createdAt: string;
          efficiency: number;
          priority?: 'high' | 'medium' | 'low';
        }> = arr.map((b: any) => ({
          id: String(b.id || ''),
          name: String(b.name || ''),
          status: (b.status || 'pending') as 'pending' | 'in_progress' | 'completed' | 'cancelled',
          assignedTo: String(b.assignedTo || ''),
          zone: String(b.zone || 'Zona A - Picking'),
          ordersCount: Array.isArray(b.orders) ? b.orders.length : 0,
          items: Number(b.totalItems || 0) || 0,
          estimatedTime: Number(b.estimatedTime || 0) || 0,
          actualTime: b.actualTime ? Number(b.actualTime) || undefined : undefined,
          createdAt: String(b.createdAt || new Date().toISOString()),
          efficiency: Number(b.efficiency || 0) || 0,
          priority: (b.priority || 'medium') as 'high' | 'medium' | 'low',
        }));

        // Función para extraer clave de ola y fecha desde el nombre "OLA-YYYYMMDD-XXX-..."
        const parseWaveKey = (name: string, createdAt: string): { key: string; ymd: string } => {
          const m = (name || '').match(/^OLA-(\d{8})-(\d{3})/);
          if (m) {
            return { key: `OLA-${m[1]}-${m[2]}`, ymd: `${m[1].slice(0,4)}-${m[1].slice(4,6)}-${m[1].slice(6,8)}` };
          }
          const d = new Date(createdAt);
          const ymd = isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
          return { key: `DATE-${ymd}`, ymd };
        };

        // Agrupar por clave de ola
        const groups = new Map<string, WaveBatch[]>();
        const metaByGroup: Record<string, { ymd: string; priorities: Array<'high' | 'medium' | 'low'>; zones: Set<string>; estTime: number; actTime: number; effSum: number; effCount: number; createdAtMin: string; }> = {};
        for (const b of simpleBatches) {
          const { key, ymd } = parseWaveKey(b.name, b.createdAt);
          const list = groups.get(key) || [];
          list.push({ id: b.id, name: b.name, orders: b.ordersCount, items: b.items, assignedTo: b.assignedTo, status: b.status === 'cancelled' ? 'pending' : (b.status as WaveBatch['status']), zone: b.zone });
          groups.set(key, list);
          if (!metaByGroup[key]) metaByGroup[key] = { ymd, priorities: [], zones: new Set<string>(), estTime: 0, actTime: 0, effSum: 0, effCount: 0, createdAtMin: b.createdAt };
          metaByGroup[key].priorities.push(b.priority || 'medium');
          metaByGroup[key].zones.add(b.zone);
          metaByGroup[key].estTime += b.estimatedTime || 0;
          metaByGroup[key].actTime += b.actualTime || 0;
          metaByGroup[key].effSum += b.efficiency || 0;
          metaByGroup[key].effCount += 1;
          // mínimo createdAt para el grupo
          if (new Date(b.createdAt) < new Date(metaByGroup[key].createdAtMin)) metaByGroup[key].createdAtMin = b.createdAt;
        }

        // Construir olas
        const nextWaves: Wave[] = [];
        for (const [key, batches] of groups.entries()) {
          const meta = metaByGroup[key];
          const status = deriveWaveStatus(batches);
          const pri = maxPriority(meta.priorities);
          const zonesArr = Array.from(meta.zones.values());
          const totalOrders = batches.reduce((s, b) => s + (b.orders || 0), 0);
          const totalItems = batches.reduce((s, b) => s + (b.items || 0), 0);
          nextWaves.push({
            id: key,
            name: `${key} (${new Date(meta.ymd).toLocaleDateString()})`,
            status,
            priority: pri,
            batches,
            totalOrders,
            totalItems,
            estimatedTime: meta.estTime,
            actualTime: meta.actTime || undefined,
            createdAt: meta.createdAtMin,
            releasedAt: status === 'released' ? meta.createdAtMin : undefined,
            completedAt: status === 'completed' ? new Date(meta.ymd + 'T23:59:59').toISOString() : undefined,
            efficiency: meta.effCount ? Math.round(meta.effSum / meta.effCount) : 0,
            completedBatches: batches.filter(b => b.status === 'completed').length,
            zones: zonesArr,
            cutoffTime: '—',
            shipmentDate: meta.ymd,
          });
        }

        // Ordenar por fecha desc, y luego por código
        nextWaves.sort((a, b) => {
          const diff = new Date(b.shipmentDate).getTime() - new Date(a.shipmentDate).getTime();
          if (diff !== 0) return diff;
          return a.id.localeCompare(b.id);
        });
        setWaves(nextWaves);
      } catch (e: any) {
        setError(e?.message || 'No se pudo cargar olas');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, refreshToken]);

  // Suscripción SSE para refrescar olas cuando cambian lotes
  useEffect(() => {
    const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8082' : '');
    const es = new EventSource(`${AUTH_BACKEND_URL}/picking/batches/stream`);
    es.onmessage = () => setRefreshToken((t) => t + 1);
    es.onerror = () => { es.close(); };
    return () => es.close();
  }, []);

  const [selectedWave, setSelectedWave] = useState<Wave | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditWave, setShowEditWave] = useState(false);
  const [editingWave, setEditingWave] = useState<Wave | null>(null);
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editAssignedUserId, setEditAssignedUserId] = useState<string | null>(null);
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [editZone, setEditZone] = useState('Zona A - Picking');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [docType, setDocType] = useState<'orders' | 'transfers'>('orders');
  const [grouping, setGrouping] = useState<'customer' | 'destination'>('customer');
  const [shipmentDate, setShipmentDate] = useState<string>('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [cutoffTime, setCutoffTime] = useState<string>('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(120);
  const [availableOrders, setAvailableOrders] = useState<Array<{ id: string; number: string; customer: string }>>([]);
  const [availableTransfers, setAvailableTransfers] = useState<Array<{ id: string; number: string; toWarehouseId: string; destinationName?: string }>>([]);
  // Asignación de usuario
  const [formAssignedTo, setFormAssignedTo] = useState('');
  const [assignedUserId, setAssignedUserId] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<Array<{ id: string; email: string; name?: string | null }>>([]);
  
  // Totalizadores
  const [totals, setTotals] = useState<{ quantity: number; weightKg: number; volumeM3: number }>({ quantity: 0, weightKg: 0, volumeM3: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hiddenOrdersCount, setHiddenOrdersCount] = useState<number>(0);
  const [hiddenTransfersCount, setHiddenTransfersCount] = useState<number>(0);

  useEffect(() => {
    // Cargar documentos disponibles para selección (órdenes y traspasos)
    const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8082' : '');
    const loadDocs = async () => {
      // Obtener IDs ya utilizados en lotes activos para excluirlos
      let usedOrderIds = new Set<string>();
      let usedTransferIds = new Set<string>();
      try {
        const uRes = await fetch(`${AUTH_BACKEND_URL}/picking/batches/used-docs`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (uRes.ok) {
          const uJson = await uRes.json();
          usedOrderIds = new Set((Array.isArray(uJson?.order_ids) ? uJson.order_ids : []).map((id: any) => String(id)));
          usedTransferIds = new Set((Array.isArray(uJson?.transfer_ids) ? uJson.transfer_ids : []).map((id: any) => String(id)));
        }
      } catch {}
      try {
        // Órdenes
        const oRes = await fetch(`${AUTH_BACKEND_URL}/picking/tasks?status=pending`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const oJson = await oRes.json();
        const ordersFromTasks = Array.isArray(oJson?.tasks) ? oJson.tasks : [];
        const mappedOrders = ordersFromTasks.map((t: any) => ({ id: String(t.id), number: String(t.orderNumber || t.number || ''), customer: String(t.customer || '') }));
        const filteredOrders = mappedOrders.filter(o => !usedOrderIds.has(o.id));
        setAvailableOrders(filteredOrders);
        setHiddenOrdersCount(Math.max(0, mappedOrders.length - filteredOrders.length));
      } catch {}

      try {
        // Traspasos directamente desde Supabase
        const { data: trData, error: trErr } = await supabase
          .from('transfers')
          .select('id, transfer_number, to_warehouse_id, status, transfer_date')
          .order('transfer_date', { ascending: false })
          .limit(200);
        if (!trErr) {
          const transfersRows = (trData || []) as any[];
          const destIds = Array.from(new Set(transfersRows
            .map(t => t?.to_warehouse_id)
            .filter((id: any) => !!id)));
          let warehousesMap: Record<string, { name?: string }> = {};
          if (destIds.length > 0) {
            try {
              const { data: whData, error: whErr } = await supabase
                .from('warehouses')
                .select('id, name')
                .in('id', destIds);
              if (!whErr) {
                (whData || []).forEach((w: any) => { warehousesMap[String(w.id)] = { name: String(w.name || '') }; });
              }
            } catch {}
          }
          const list = transfersRows.map((t: any) => {
            const id = String(t.id);
            const number = String(t.transfer_number || '');
            const toWarehouseId = String(t.to_warehouse_id || '');
            const destName = warehousesMap[toWarehouseId]?.name || (() => {
              // Fallback demostrativo: alterna entre Sucursal A y Sucursal B si no hay warehouse
              const lastNum = parseInt((number.match(/\d+$/) || ['0'])[0], 10);
              return lastNum % 2 === 0 ? 'Sucursal B' : 'Sucursal A';
            })();
            return { id, number, toWarehouseId, destinationName: destName };
          });
          const filteredTransfers = list.filter(t => !usedTransferIds.has(t.id));
          setAvailableTransfers(filteredTransfers);
          setHiddenTransfersCount(Math.max(0, list.length - filteredTransfers.length));
        }
      } catch {}
    };
    loadDocs();
  }, [token]);

  // Búsqueda en tiempo real de usuarios para "Asignar a"
  useEffect(() => {
    const q = (userQuery || '').trim();
    const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8082' : '');
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      try {
        if (!q) { setUserResults([]); return; }
        const resp = await fetch(`${AUTH_BACKEND_URL}/app_users/search?q=${encodeURIComponent(q)}`, { 
          signal: ctrl.signal,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        const arr = Array.isArray(json?.users) ? json.users : [];
        setUserResults(arr.map((u: any) => ({ id: String(u.id), email: String(u.email || ''), name: u.name || null })));
      } catch (_) {
        // Silenciar en UI del modal
      }
    }, 250);
    return () => { clearTimeout(id); ctrl.abort(); };
  }, [userQuery, token]);

  // Abrir modal de edición de ola (ADMIN)
  const openEditWave = (wave: Wave) => {
    setEditingWave(wave);
    // valores iniciales tomados del primer lote (si existe)
    const first = wave.batches[0];
    setEditAssignedTo(first?.assignedTo || '');
    setEditAssignedUserId(null);
    setEditPriority('medium');
    setEditZone(first?.zone || 'Zona A - Picking');
    setShowEditWave(true);
  };

  // Guardar cambios de edición sobre todos los lotes de la ola
  const saveEditWave = async () => {
    if (!editingWave) return;
    const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8082' : '');
    try {
      // aplicar en cada lote de la ola
      for (const b of editingWave.batches) {
        const payload: any = {
          assigned_to: editAssignedTo || b.assignedTo || '',
          zone: editZone || b.zone || 'Zona A - Picking',
        };
        // priority si existe en schema
        payload.priority = editPriority;
        await fetch(`${AUTH_BACKEND_URL}/picking/batches/${b.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
      }
      setShowEditWave(false);
      setEditingWave(null);
      setRefreshToken(t => t + 1);
    } catch (e: any) {
      setError(e?.message || 'No se pudieron guardar los cambios de la ola');
    }
  };

  // Recalcular totalizadores al seleccionar documentos
  useEffect(() => {
    const ids = Array.from(selectedIds);
    const compute = async () => {
      try {
        if (ids.length === 0) { setTotals({ quantity: 0, weightKg: 0, volumeM3: 0 }); return; }
        if (docType === 'orders') {
          const { data: items, error: itemsErr } = await supabase
            .from('sales_order_items')
            .select('sales_order_id, product_id, quantity')
            .in('sales_order_id', ids);
          if (itemsErr) throw itemsErr;
          const productIds = Array.from(new Set((items || []).map((r: any) => r.product_id).filter(Boolean)));
          let prodMap: Record<string, { weight?: number; dimensions?: { length: number; width: number; height: number } }> = {};
          if (productIds.length > 0) {
            const { data: prods } = await supabase
              .from('products')
              .select('id, weight, dimensions')
              .in('id', productIds);
            (prods || []).forEach((p: any) => { prodMap[p.id] = { weight: p?.weight, dimensions: p?.dimensions }; });
          }
          let qty = 0, weight = 0, volume = 0;
          for (const it of (items || [])) {
            const q = Number(it.quantity || 0) || 0;
            qty += q;
            const pm = prodMap[it.product_id] || {};
            const w = Number(pm.weight || 0) || 0; // kg por unidad
            weight += w * q;
            const d = pm.dimensions as any;
            const l = Number(d?.length || 0), wdt = Number(d?.width || 0), h = Number(d?.height || 0);
            const volUnit = (l && wdt && h) ? (l * wdt * h) : 0; // m3 por unidad si dimensiones vienen en metros
            volume += volUnit * q;
          }
          setTotals({ quantity: qty, weightKg: Number(weight.toFixed(2)), volumeM3: Number(volume.toFixed(3)) });
        } else {
          const { data: items, error: itemsErr } = await supabase
            .from('transfer_items')
            .select('transfer_id, product_id, quantity')
            .in('transfer_id', ids);
          if (itemsErr) throw itemsErr;
          const productIds = Array.from(new Set((items || []).map((r: any) => r.product_id).filter(Boolean)));
          let prodMap: Record<string, { weight?: number; dimensions?: { length: number; width: number; height: number } }> = {};
          if (productIds.length > 0) {
            const { data: prods } = await supabase
              .from('products')
              .select('id, weight, dimensions')
              .in('id', productIds);
            (prods || []).forEach((p: any) => { prodMap[p.id] = { weight: p?.weight, dimensions: p?.dimensions }; });
          }
          let qty = 0, weight = 0, volume = 0;
          for (const it of (items || [])) {
            const q = Number(it.quantity || 0) || 0;
            qty += q;
            const pm = prodMap[it.product_id] || {};
            const w = Number(pm.weight || 0) || 0;
            weight += w * q;
            const d = pm.dimensions as any;
            const l = Number(d?.length || 0), wdt = Number(d?.width || 0), h = Number(d?.height || 0);
            const volUnit = (l && wdt && h) ? (l * wdt * h) : 0;
            volume += volUnit * q;
          }
          setTotals({ quantity: qty, weightKg: Number(weight.toFixed(2)), volumeM3: Number(volume.toFixed(3)) });
        }
      } catch {
        setTotals({ quantity: 0, weightKg: 0, volumeM3: 0 });
      }
    };
    const t = setTimeout(compute, 200);
    return () => clearTimeout(t);
  }, [selectedIds, docType]);

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const formatYmd = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  };

  const nextWaveCodeForDate = (dateStr: string) => {
    const prefix = `OLA-${dateStr}-`;
    const nums = existingBatchNames
      .filter(n => n.startsWith(prefix))
      .map(n => {
        const tail = n.slice(prefix.length);
        const firstPart = tail.split('-')[0] || tail;
        const num = parseInt(firstPart, 10);
        return isNaN(num) ? 0 : num;
      });
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return `${prefix}${String(next).padStart(3, '0')}`;
  };

  const handleCreateWave = async () => {
    try {
      const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8082' : '');
      const date = shipmentDate ? new Date(shipmentDate) : new Date();
      const ymd = formatYmd(date);
      const baseCode = nextWaveCodeForDate(ymd);
      const ids = Array.from(selectedIds);
      if (ids.length === 0) {
        setError('Selecciona al menos un documento');
        return;
      }

      // Agrupar por criterio seleccionado
      type Group = { key: string; ids: string[] };
      const groups: Group[] = [];
      const pushToGroup = (key: string, id: string) => {
        const g = groups.find(x => x.key === key);
        if (g) g.ids.push(id); else groups.push({ key, ids: [id] });
      };
      if (docType === 'orders') {
        const idx = new Map(availableOrders.map(o => [o.id, o]));
        for (const id of ids) {
          const o = idx.get(id);
          if (!o) continue;
          const key = grouping === 'customer' ? (o.customer || 'Sin Cliente') : (o.customer || 'Sin Destino');
          pushToGroup(key, id);
        }
      } else {
        const idx = new Map(availableTransfers.map(t => [t.id, t]));
        for (const id of ids) {
          const t = idx.get(id);
          if (!t) continue;
          const destLabel = t.destinationName || t.toWarehouseId || 'Sin Destino';
          const key = grouping === 'destination' ? destLabel : destLabel; // por ahora no agrupamos por cliente en traspasos
          pushToGroup(key, id);
        }
      }

      // Crear un lote por grupo con nombre consecutivo, validando respuesta
      let createdCount = 0;
      let lastError: string | null = null;
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        const groupLabel = g.key.replace(/\s+/g, ' ').trim();
        const waveName = `${baseCode}-${groupLabel}`;
        let resp: Response | null = null;
        if (docType === 'orders') {
          resp = await fetch(`${AUTH_BACKEND_URL}/picking/batches`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              name: waveName,
              order_ids: g.ids,
              priority,
              grouping_criterion: grouping === 'customer' ? 'customer' : 'destination',
              assignedTo: formAssignedTo || '',
              assigned_to_user_id: assignedUserId || undefined,
              zone: 'Zona A - Picking',
            }),
          });
        } else {
          resp = await fetch(`${AUTH_BACKEND_URL}/picking/batches/transfers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              name: waveName,
              transfer_ids: g.ids,
              priority,
              grouping_criterion: grouping,
              assignedTo: formAssignedTo || '',
              assigned_to_user_id: assignedUserId || undefined,
              zone: 'Zona A - Picking',
            }),
          });
        }
        if (resp && resp.ok) {
          createdCount += 1;
        } else {
          try {
            const js = resp ? await resp.json() : null;
            lastError = String(js?.error || `Error HTTP ${resp?.status || ''}`);
          } catch {
            lastError = `Error HTTP ${resp?.status || ''}`;
          }
        }
      }
      if (createdCount === 0) {
        setError(lastError || 'No se pudo crear la ola');
        return;
      }

      setShowCreateForm(false);
      setSelectedIds(new Set());
      setShipmentDate('');
      setPriority('high');
      setCutoffTime('');
      setEstimatedMinutes(120);
      setFormAssignedTo('');
      setAssignedUserId(null);
      setUserQuery('');
      setUserResults([]);
      setTotals({ quantity: 0, weightKg: 0, volumeM3: 0 });
      setRefreshToken(t => t + 1);
    } catch (e: any) {
      setError(e?.message || 'No se pudo crear la ola');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'gray';
      case 'released': return 'blue';
      case 'in_progress': return 'yellow';
      case 'completed': return 'green';
      case 'paused': return 'red';
      default: return 'gray';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planning': return 'Planificando';
      case 'released': return 'Liberada';
      case 'in_progress': return 'En Progreso';
      case 'completed': return 'Completada';
      case 'paused': return 'Pausada';
      default: return 'Desconocido';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const getBatchStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'gray';
      case 'in_progress': return 'blue';
      case 'completed': return 'green';
      default: return 'gray';
    }
  };

  const handleReleaseWave = (waveId: string) => {
    setWaves(prev => prev.map(wave => 
      wave.id === waveId 
        ? { 
            ...wave, 
            status: 'released' as const,
            releasedAt: new Date().toISOString()
          }
        : wave
    ));
  };

  const handleStartWave = async (waveId: string) => {
    const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8082' : '');
    // Intentar iniciar lotes pendientes de la ola (si el backend lo permite para el usuario)
    const target = waves.find(w => w.id === waveId);
    if (target) {
      for (const b of target.batches) {
        if (b.status === 'pending') {
          try {
            await fetch(`${AUTH_BACKEND_URL}/picking/batches/${b.id}/start`, {
              method: 'POST',
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
          } catch {}
        }
      }
    }
    setRefreshToken(t => t + 1);
  };

  const handlePauseWave = (waveId: string) => {
    // Pausar solo en UI (no hay endpoint de pausa por lote)
    setWaves(prev => prev.map(wave => 
      wave.id === waveId 
        ? { ...wave, status: 'paused' as const }
        : wave
    ));
  };

  const handleCompleteWave = async (waveId: string) => {
    const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8082' : '');
    const target = waves.find(w => w.id === waveId);
    if (target) {
      for (const b of target.batches) {
        if (b.status === 'in_progress' || b.status === 'pending') {
          try {
            await fetch(`${AUTH_BACKEND_URL}/picking/batches/${b.id}/complete`, {
              method: 'POST',
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
          } catch {}
        }
      }
    }
    setRefreshToken(t => t + 1);
  };

  const handleDeleteWave = async (waveId: string) => {
    const target = waves.find(w => w.id === waveId);
    if (!target) return;
    const confirmed = window.confirm(
      `¿Eliminar la ola ${target.name}?\n\nEsta acción eliminará TODOS sus lotes y sus ítems relacionados. No se puede deshacer.`
    );
    if (!confirmed) return;
    const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8082' : '');
    try {
      for (const b of target.batches) {
        try {
          const resp = await fetch(`${AUTH_BACKEND_URL}/picking/batches/${b.id}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          // continuar aunque falle alguno, pero avisar luego
        } catch (e) {
          console.error('Error eliminando lote', b.id, e);
        }
      }
      setWaves(prev => prev.filter(w => w.id !== waveId));
      if (selectedWave?.id === waveId) {
        setShowDetails(false);
        setSelectedWave(null);
      }
    } catch (e) {
      alert('No se pudo eliminar la ola');
    }
  };

  const handleViewDetails = (wave: Wave) => {
    setSelectedWave(wave);
    setShowDetails(true);
  };

  // Cargar y consolidar ítems de la ola seleccionada
  useEffect(() => {
    if (!showDetails || !selectedWave) return;
    const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8082' : '');
    let mounted = true;
    const locKey = (ld: { zone?: string | null; aisle?: string | null; rack?: string | null; shelf?: string | null; bin?: string | null; code: string | null } | null) => {
      if (!ld) return '~~~~~';
      const parts = [ld.zone, ld.aisle, ld.rack, ld.shelf, ld.bin, ld.code]
        .map(x => (x || '').toString().padStart(4, ' '));
      return parts.join('|');
    };
    const load = async () => {
      try {
        const all: typeof waveItems = [];
        for (const b of selectedWave.batches) {
          try {
            const resp = await fetch(`${AUTH_BACKEND_URL}/picking/batches/${b.id}/items`, {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const json = await resp.json();
            const arr = Array.isArray(json?.items) ? json.items : [];
            for (const i of arr) {
              all.push({
                id: String(i.id),
                batchId: String(b.id),
                batchName: String(b.name || ''),
                productId: String(i.productId || ''),
                sku: String(i.sku || ''),
                description: String(i.description || ''),
                quantity: Number(i.quantity || 0) || 0,
                unit: i.unit || undefined,
                sourceLocation: i.sourceLocation ?? null,
                expiryDate: i.expiryDate ?? null,
                pickedQuantity: Number(i.pickedQuantity || 0) || 0,
                status: (i.status || 'picking_pending'),
                weight: typeof i.weight !== 'undefined' ? (i.weight === null ? null : Number(i.weight)) : undefined,
                dimensions: i.dimensions ?? undefined,
                barcode: i.barcode ?? undefined,
                locationDetails: i.locationDetails ?? null,
              });
            }
          } catch {}
        }
        // Ordenar por ubicación y luego por SKU
        const sorted = all.sort((a, b) => {
          const ka = locKey(a.locationDetails);
          const kb = locKey(b.locationDetails);
          if (ka < kb) return -1;
          if (ka > kb) return 1;
          return a.sku.localeCompare(b.sku);
        });
        if (!mounted) return;
        setWaveItems(sorted);
        // Inicializar inputs y timers
        const bi: Record<string, string> = {};
        const li: Record<string, string> = {};
        const tm: Record<string, { startAt?: number; endAt?: number; locationVerified?: boolean }> = {};
        for (const it of sorted) {
          bi[it.id] = '';
          li[it.id] = '';
          tm[it.id] = {};
        }
        setWaveBarcodeInputs(bi);
        setWaveLocationInputs(li);
        setWaveItemTimers(tm);
      } catch {
        setWaveItems([]);
      }
    };
    load();
    const iv = setInterval(() => setNowTick(Date.now()), 1000);
    return () => { mounted = false; clearInterval(iv); };
  }, [showDetails, selectedWave, token]);

  const calculateProgress = (wave: Wave) => {
    return wave.batches.length > 0 ? (wave.completedBatches / wave.batches.length) * 100 : 0;
  };

  // Confirmar todo lo pendiente por un SKU en toda la ola
  const confirmAllForSku = async (sku: string) => {
    const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8082' : '');
    // Secuencial para evitar saturar el backend
    for (const it of waveItems.filter(x => (x.sku || '') === sku)) {
      const remaining = Math.max(0, Number(it.quantity || 0) - Number(it.pickedQuantity || 0));
      if (remaining <= 0) continue;
      try {
        const resp = await fetch(`${AUTH_BACKEND_URL}/picking/batches/${it.batchId}/items/${it.id}/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ quantity: remaining })
        });
        if (resp.ok) {
          const json = await resp.json();
          const newPicked = Number(json?.picked_quantity ?? (it.pickedQuantity + remaining));
          const newStatus = (json?.status || it.status) as typeof it.status;
          setWaveItems(prev => prev.map(x => x.id === it.id ? { ...x, pickedQuantity: newPicked, status: newStatus } : x));
          setWaveItemTimers(prev => {
            const curr = prev[it.id] || {};
            const isDone = newPicked >= it.quantity;
            return { ...prev, [it.id]: { ...curr, endAt: isDone && !curr.endAt ? Date.now() : curr.endAt } };
          });
        }
      } catch {}
    }
  };

  return (
    <div className="space-y-6">
      {loading && (
        <div className="text-sm text-gray-500">Cargando olas…</div>
      )}
      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Olas por pedidos</h2>
          <p className="text-gray-600">Coordina múltiples lotes para optimizar el flujo de trabajo</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Crear ola por pedido
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Waves className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Olas Activas</p>
              <p className="text-2xl font-bold text-gray-900">
                {waves.filter(w => w.status === 'in_progress' || w.status === 'released').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completadas Hoy</p>
              <p className="text-2xl font-bold text-gray-900">
                {waves.filter(w => w.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Eficiencia Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(waves.reduce((sum, w) => sum + w.efficiency, 0) / waves.length)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Items Procesados</p>
              <p className="text-2xl font-bold text-gray-900">
                {waves.reduce((sum, w) => sum + (w.status === 'completed' ? w.totalItems : 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Wave List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Olas de Picking</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {waves.map((wave) => {
            const statusColor = getStatusColor(wave.status);
            const priorityColor = getPriorityColor(wave.priority);
            const progress = calculateProgress(wave);

            return (
              <div key={wave.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h4 className="text-lg font-medium text-gray-900">{wave.name}</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800`}>
                        {getStatusText(wave.status)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${priorityColor}-100 text-${priorityColor}-800`}>
                        {wave.priority === 'high' ? 'Alta' : wave.priority === 'medium' ? 'Media' : 'Baja'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Package className="w-4 h-4 mr-2" />
                        <span className="font-medium">Órdenes:</span>
                        <span className="ml-1">{wave.totalOrders}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        <span className="font-medium">Items:</span>
                        <span className="ml-1">{wave.totalItems}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-2" />
                        <span className="font-medium">Lotes:</span>
                        <span className="ml-1">{wave.batches.length}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span className="font-medium">Zonas:</span>
                        <span className="ml-1">{wave.zones.join(', ')}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span className="font-medium">Envío:</span>
                        <span className="ml-1">{new Date(wave.shipmentDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {(wave.status === 'in_progress' || wave.status === 'released') && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Progreso de Lotes</span>
                          <span>{progress.toFixed(0)}% ({wave.completedBatches}/{wave.batches.length})</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Batches Preview */}
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-2">
                        {wave.batches.slice(0, 4).map((batch) => (
                          <div
                            key={batch.id}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs bg-${getBatchStatusColor(batch.status)}-100 text-${getBatchStatusColor(batch.status)}-800`}
                          >
                            <span className="font-medium">{batch.name}</span>
                            <span className="ml-1">({batch.orders} órdenes)</span>
                          </div>
                        ))}
                        {wave.batches.length > 4 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                            +{wave.batches.length - 4} más
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>
                          {wave.actualTime ? `${wave.actualTime}/${wave.estimatedTime} min` : `${wave.estimatedTime} min est.`}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        <span>Corte: {wave.cutoffTime}</span>
                      </div>
                      {wave.efficiency > 0 && (
                        <div className="flex items-center">
                          <TrendingUp className="w-4 h-4 mr-1" />
                          <span>Eficiencia: {wave.efficiency}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleViewDetails(wave)}
                      className="p-2 text-gray-400 hover:text-blue-600"
                      title="Ver detalles"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    {wave.status === 'planning' && (
                      <button
                        onClick={() => handleReleaseWave(wave.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Liberar
                      </button>
                    )}
                    
                    {wave.status === 'released' && (
                      <button
                        onClick={() => handleStartWave(wave.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Iniciar
                      </button>
                    )}
                    
                    {wave.status === 'in_progress' && (
                      <>
                        <button
                          onClick={() => handlePauseWave(wave.id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
                        >
                          <Pause className="w-4 h-4 mr-1" />
                          Pausar
                        </button>
                        <button
                          onClick={() => handleCompleteWave(wave.id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Completar
                        </button>
                      </>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteWave(wave.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                        title="Eliminar ola"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Eliminar
                      </button>
                    )}

                    <button
                      onClick={() => openEditWave(wave)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="Editar ola"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Wave Details Modal */}
      {showDetails && selectedWave && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Detalles de la Ola - {selectedWave.name}
              </h3>
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteWave(selectedWave.id)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                    title="Eliminar ola"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Eliminar
                  </button>
                )}
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Wave Info */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Información de la Ola</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Estado:</span>
                      <span className={`text-sm font-medium text-${getStatusColor(selectedWave.status)}-600`}>
                        {getStatusText(selectedWave.status)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Prioridad:</span>
                      <span className={`text-sm font-medium text-${getPriorityColor(selectedWave.priority)}-600`}>
                        {selectedWave.priority === 'high' ? 'Alta' : selectedWave.priority === 'medium' ? 'Media' : 'Baja'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Total Órdenes:</span>
                      <span className="text-sm text-gray-900">{selectedWave.totalOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Total Items:</span>
                      <span className="text-sm text-gray-900">{selectedWave.totalItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Lotes Completados:</span>
                      <span className="text-sm text-gray-900">{selectedWave.completedBatches}/{selectedWave.batches.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Eficiencia:</span>
                      <span className="text-sm text-gray-900">{selectedWave.efficiency}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Hora de Corte:</span>
                      <span className="text-sm text-gray-900">{selectedWave.cutoffTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Fecha de Envío:</span>
                      <span className="text-sm text-gray-900">{new Date(selectedWave.shipmentDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Batches List */}
              <div className="md:col-span-2">
                <h4 className="text-lg font-medium text-gray-900 mb-3">Lotes en la Ola</h4>
                {isAdmin && (
                  <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                    Advertencia: eliminar la ola borrará sus lotes e ítems. Acción permanente.
                  </div>
                )}
                <div className="space-y-3">
                  {selectedWave.batches.map((batch) => (
                    <div key={batch.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-medium text-gray-900">{batch.name}</h5>
                          <p className="text-sm text-gray-500">Asignado a: {batch.assignedTo}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${getBatchStatusColor(batch.status)}-100 text-${getBatchStatusColor(batch.status)}-800`}>
                            {batch.status === 'pending' ? 'Pendiente' : batch.status === 'in_progress' ? 'En Progreso' : 'Completado'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Órdenes:</span> {batch.orders}
                        </div>
                        <div>
                          <span className="font-medium">Items:</span> {batch.items}
                        </div>
                        <div>
                          <span className="font-medium">Zona:</span> {batch.zone}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Items consolidados de la ola */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-medium text-gray-900">Items de la Ola (con referencia al lote/documento)</h4>
              </div>
              {/* Resumen de progreso de la lista */}
              <div className="mb-3 flex items-center justify-between text-sm text-gray-700">
                <div>
                  Progreso: {waveItems.reduce((a, x) => a + Number(x.pickedQuantity || 0), 0)}/{waveItems.reduce((a, x) => a + Number(x.quantity || 0), 0)}
                </div>
                <div className="w-64 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(() => {
                      const total = waveItems.reduce((a, x) => a + Number(x.quantity || 0), 0);
                      const picked = waveItems.reduce((a, x) => a + Number(x.pickedQuantity || 0), 0);
                      return total > 0 ? (picked / total) * 100 : 0;
                    })()}%` }}
                  />
                </div>
              </div>

              <div className="border border-gray-200 rounded-md overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 text-xs font-medium text-gray-600">
                  <div className="col-span-2">SKU</div>
                  <div className="col-span-3">Descripción</div>
                  <div className="col-span-2">Ubicación</div>
                  <div className="col-span-2">Documento/Lote</div>
                  <div className="col-span-1 text-right">Cant</div>
                  <div className="col-span-1 text-right">Pick</div>
                  <div className="col-span-1">Tiempo</div>
                </div>
                <div className="divide-y divide-gray-200">
                  {waveItems.map((it) => {
                    const loc = it.locationDetails;
                    const locLabel = loc?.code || it.sourceLocation || '—';
                    const isDone = Number(it.pickedQuantity || 0) >= Number(it.quantity || 0);
                    const timer = waveItemTimers[it.id] || {};
                    const elapsed = (() => {
                      if (!timer.startAt) return '—';
                      const till = timer.endAt || nowTick;
                      const sec = Math.max(0, Math.floor((till - timer.startAt) / 1000));
                      const m = Math.floor(sec / 60); const s = sec % 60;
                      return `${m}m ${s}s`;
                    })();
                    return (
                      <div key={`${it.id}-${it.batchId}`} className="grid grid-cols-12 gap-2 px-3 py-2 items-center text-sm">
                        <div className="col-span-2">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-900 font-medium">{it.sku}</span>
                            <button
                              type="button"
                              onClick={() => confirmAllForSku(it.sku)}
                              className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                              title="Contar todo de este SKU"
                            >
                              Contar todo
                            </button>
                          </div>
                          <input
                            type="text"
                            value={waveBarcodeInputs[it.id] || ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              setWaveBarcodeInputs(prev => ({ ...prev, [it.id]: v }));
                              const normalized = String(v || '').trim();
                              const sku = String(it.sku || '').trim();
                              if (normalized && normalized.toUpperCase().includes(sku.toUpperCase())) {
                                setWaveItemTimers(prev => ({ ...prev, [it.id]: { ...(prev[it.id] || {}), startAt: (prev[it.id]?.startAt) || Date.now() } }));
                                // confirmar 1 unidad
                                (async () => {
                                  const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8082' : '');
                                  try {
                                    const resp = await fetch(`${AUTH_BACKEND_URL}/picking/batches/${it.batchId}/items/${it.id}/confirm`, {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                      },
                                      body: JSON.stringify({ quantity: 1 })
                                    });
                                    if (resp.ok) {
                                      const json = await resp.json();
                                      const newPicked = Number(json?.picked_quantity ?? (it.pickedQuantity + 1));
                                      const newStatus = (json?.status || it.status) as typeof it.status;
                                      setWaveItems(prev => prev.map(x => x.id === it.id ? { ...x, pickedQuantity: newPicked, status: newStatus } : x));
                                      setWaveBarcodeInputs(prev => ({ ...prev, [it.id]: '' }));
                                    }
                                  } catch {}
                                })();
                              }
                            }}
                            className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-xs"
                            placeholder="Escanear código"
                          />
                        </div>
                        <div className="col-span-3">
                          <div className="text-gray-900">{it.description || '—'}</div>
                          <div className="text-xs text-gray-500">{loc?.zone || ''} {loc?.aisle || ''} {loc?.rack || ''} {loc?.shelf || ''} {loc?.bin || ''}</div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-gray-900">{locLabel}</div>
                          <input
                            type="text"
                            value={waveLocationInputs[it.id] || ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              setWaveLocationInputs(prev => ({ ...prev, [it.id]: v }));
                              const normalized = String(v || '').trim();
                              const expected = String(it.sourceLocation || '').trim();
                              if (normalized && expected && normalized.toUpperCase() === expected.toUpperCase()) {
                                setWaveItemTimers(prev => ({ ...prev, [it.id]: { ...(prev[it.id] || {}), locationVerified: true, startAt: (prev[it.id]?.startAt) || Date.now() } }));
                              }
                            }}
                            className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-xs"
                            placeholder="Escanear ubicación"
                          />
                        </div>
                        <div className="col-span-2">
                          <div className="text-xs text-gray-600">{it.batchName}</div>
                        </div>
                        <div className="col-span-1 text-right">
                          {it.quantity}
                        </div>
                        <div className="col-span-1 text-right">
                          <span className={isDone ? 'text-green-600' : 'text-gray-900'}>{it.pickedQuantity}</span>
                        </div>
                        <div className="col-span-1">
                          <span className="text-xs text-gray-600">{elapsed}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wave Edit Modal */}
      {showEditWave && editingWave && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Editar Ola - {editingWave.name}
              </h3>
              <button
                onClick={() => setShowEditWave(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Asignar a</label>
                <input
                  type="text"
                  value={editAssignedTo}
                  onChange={(e) => { setEditAssignedTo(e.target.value); setUserQuery(e.target.value); }}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                  placeholder="Buscar por nombre o correo"
                />
                {userResults.length > 0 && (
                  <div className="mt-2 border rounded-md max-h-40 overflow-auto">
                    {userResults.map(u => (
                      <button key={u.id} type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50"
                        onClick={() => { setEditAssignedTo(u.name || u.email); setEditAssignedUserId(u.id); setUserResults([]); }}>
                        <div className="text-sm text-gray-900">{u.name || '—'}</div>
                        <div className="text-xs text-gray-600">{u.email}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prioridad</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                  >
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Zona</label>
                  <input
                    type="text"
                    value={editZone}
                    onChange={(e) => setEditZone(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button onClick={() => setShowEditWave(false)} className="px-3 py-2 border rounded-md">Cancelar</button>
                <button onClick={saveEditWave} className="px-3 py-2 rounded-md bg-blue-600 text-white">Guardar Cambios</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Wave Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Crear Nueva Ola</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento</label>
                  <select value={docType} onChange={e => setDocType(e.target.value as any)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="orders">Pedidos</option>
                    <option value="transfers">Traspasos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agrupar por</label>
                  <select value={grouping} onChange={e => setGrouping(e.target.value as any)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="destination">Destino</option>
                    <option value="customer">Cliente</option>
                  </select>
                </div>
              </div>
              {/* Campo de nombre eliminado: el código y nombre se generan automáticamente */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridad
                  </label>
                  <select value={priority} onChange={e => setPriority(e.target.value as any)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Envío
                  </label>
                  <input
                    type="date"
                    value={shipmentDate}
                    onChange={e => setShipmentDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Asignar a: búsqueda de usuarios en tiempo real */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a</label>
                <input
                  type="text"
                  value={formAssignedTo || userQuery}
                  onChange={(e) => { setFormAssignedTo(''); setAssignedUserId(null); setUserQuery(e.target.value); }}
                  placeholder="Buscar usuario (email o nombre)"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {userResults.length > 0 && !formAssignedTo && (
                  <div className="mt-2 border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                    {userResults.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => { setFormAssignedTo(`${u.name ? u.name : u.email}`); setAssignedUserId(u.id); setUserQuery(''); setUserResults([]); }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50"
                      >
                        {(u.name ? `${u.name} (${u.email})` : u.email)}
                      </button>
                    ))}
                  </div>
                )}
                {formAssignedTo && (
                  <div className="mt-2 text-sm text-gray-600">Asignado a: {formAssignedTo}</div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora de Corte
                  </label>
                  <input
                    type="time"
                    value={cutoffTime}
                    onChange={e => setCutoffTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tiempo Estimado (min)
                  </label>
                  <input
                    type="number"
                    value={estimatedMinutes}
                    onChange={e => setEstimatedMinutes(Number(e.target.value || 0))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="120"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {docType === 'orders' ? 'Pedidos Disponibles' : 'Traspasos Disponibles'}
                </label>
                {docType === 'orders' && hiddenOrdersCount > 0 && (
                  <div className="text-xs text-gray-500 mb-1">Se ocultaron {hiddenOrdersCount} pedidos por estar en uso en otra ola/lote.</div>
                )}
                {docType === 'transfers' && hiddenTransfersCount > 0 && (
                  <div className="text-xs text-gray-500 mb-1">Se ocultaron {hiddenTransfersCount} traspasos por estar en uso en otra ola/lote.</div>
                )}
                <div className="border border-gray-300 rounded-md p-3 max-h-56 overflow-y-auto">
                  <div className="space-y-2">
                    {(docType === 'orders' ? availableOrders : availableTransfers).map(doc => (
                      <label key={doc.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(doc.id)}
                          onChange={() => toggleSelected(doc.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-900">
                          {(docType === 'orders')
                            ? `#${(doc as any).number} · ${(doc as any).customer}`
                            : `#${(doc as any).number} · Destino: ${(doc as any).destinationName || '—'}`}
                        </span>
                      </label>
                    ))}
                    {((docType === 'orders' ? availableOrders : availableTransfers).length === 0) && (
                      <div className="text-sm text-gray-500">No hay documentos disponibles aún.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Totalizadores en tiempo real */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="border border-gray-200 rounded-md p-3">
                  <div className="text-xs text-gray-500">Total productos</div>
                  <div className="text-lg font-semibold">{totals.quantity}</div>
                </div>
                <div className="border border-gray-200 rounded-md p-3">
                  <div className="text-xs text-gray-500">Peso total (kg)</div>
                  <div className="text-lg font-semibold">{totals.weightKg}</div>
                </div>
                <div className="border border-gray-200 rounded-md p-3">
                  <div className="text-xs text-gray-500">Volumen total (m³)</div>
                  <div className="text-lg font-semibold">{totals.volumeM3}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateWave}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Crear Ola
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
