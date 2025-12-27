import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BatchLabelModal } from './BatchLabelModal';
import { 
  Package, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Play,
  Plus,
  Eye,
  Edit,
  Trash2,
  ShoppingCart,
  MapPin,
  BarChart3,
  Printer
} from 'lucide-react';

interface BatchOrder {
  id: string;
  orderNumber: string;
  customer: string;
  items: number;
  priority: 'high' | 'medium' | 'low';
}

interface Batch {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo: string;
  orders: BatchOrder[];
  zone: string;
  estimatedTime: number;
  actualTime?: number;
  createdAt: string;
  completedAt?: string;
  efficiency: number;
  totalItems: number;
  pickedItems: number;
}
// Ítems del lote para escaneo y conteo
interface BatchItem {
  id: string;
  productId: string;
  sku: string;
  description: string;
  quantity: number;
  unit?: string;
  sourceLocation: string | null;
  expiryDate?: string | null;
  pickedQuantity: number;
  status: 'picking_pending' | 'picking_confirmed' | 'cancelled';
  // Características del producto y detalles de ubicación
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
}

export function BatchPicking() {
  const { token, user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [refreshToken, setRefreshToken] = useState(0);
  const [showBatchLabel, setShowBatchLabel] = useState(false);
  const [labelBatch, setLabelBatch] = useState<Batch | null>(null);

  useEffect(() => {
const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
    const buildQuery = () => {
      const qs: string[] = [];
      if (filterStatus !== 'all') qs.push(`status=${filterStatus}`);
      if (filterPriority !== 'all') qs.push(`priority=${filterPriority}`);
      return qs.length ? `?${qs.join('&')}` : '';
    };
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`${AUTH_BACKEND_URL}/picking/batches${buildQuery()}` , {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        const arr = Array.isArray(json?.batches) ? json.batches : [];
        const mapped: Batch[] = (arr || []).map((b: any) => ({
          id: String(b.id || ''),
          name: String(b.name || ''),
          status: (b.status || 'pending') as 'pending' | 'in_progress' | 'completed',
          assignedTo: String(b.assignedTo || ''),
          zone: String(b.zone || 'Zona A - Picking'),
          estimatedTime: Number(b.estimatedTime || 0) || 0,
          actualTime: b.actualTime ? Number(b.actualTime) || undefined : undefined,
          createdAt: String(b.createdAt || new Date().toISOString()),
          completedAt: b.completedAt ? String(b.completedAt) : undefined,
          efficiency: Number(b.efficiency || 0) || 0,
          totalItems: Number(b.totalItems || 0) || 0,
          pickedItems: Number(b.pickedItems || 0) || 0,
          orders: Array.isArray(b.orders) ? b.orders.map((o: any) => ({
            id: String(o.id || ''),
            orderNumber: String(o.number || o.orderNumber || ''),
            customer: String(o.customer || ''),
            items: Number(o.items || 0) || 0,
            priority: (o.priority || 'medium') as 'high' | 'medium' | 'low',
          })) : [],
        }));
        setBatches(mapped);
      } catch (e: any) {
        setError(e?.message || 'No se pudo cargar lotes');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filterStatus, filterPriority, refreshToken]);

  // Suscripción SSE para refrescar en tiempo real
  useEffect(() => {
const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
    const es = new EventSource(`${AUTH_BACKEND_URL}/picking/batches/stream`);
    es.onmessage = () => setRefreshToken((t) => t + 1);
    es.onerror = () => {
      // Silenciar errores y cerrar
      es.close();
    };
    return () => es.close();
  }, []);

  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  // Form state
  const [formName, setFormName] = useState('');
  const [formAssignedTo, setFormAssignedTo] = useState('');
  const [assignedUserId, setAssignedUserId] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<Array<{ id: string; email: string; name?: string | null }>>([]);
  const [formZone, setFormZone] = useState('');
  const [formPriority, setFormPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [availableOrders, setAvailableOrders] = useState<{ id: string; number: string; customer: string; }[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [orderItemsMap, setOrderItemsMap] = useState<Record<string, { number: string; items: { sku: string; name: string; quantity: number }[] }>>({});
  const [skuAggregates, setSkuAggregates] = useState<{ sku: string; name: string; totalQty: number; perOrder: { orderId: string; orderNumber: string; quantity: number }[] }[]>([]);
  const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
  const [skuInventory, setSkuInventory] = useState<Record<string, { totalAvailable: number; bestLocation: string | null; earliestExpiry: string | null }>>({});
  const [skuLocationOptions, setSkuLocationOptions] = useState<Record<string, { code: string; available: number }[]>>({});
  const [selectedSkuLocation, setSelectedSkuLocation] = useState<Record<string, string>>({});
  const [productDefaultLocationBySku, setProductDefaultLocationBySku] = useState<Record<string, string | null>>({});
  // Estado para ítems del lote, inputs y temporizador por ítem
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [barcodeInputs, setBarcodeInputs] = useState<Record<string, string>>({});
  const [locationInputs, setLocationInputs] = useState<Record<string, string>>({});
  const [itemTimers, setItemTimers] = useState<Record<string, { startAt?: number; endAt?: number; locationVerified?: boolean }>>({});
  const [nowTick, setNowTick] = useState<number>(Date.now());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'gray';
      case 'in_progress': return 'blue';
      case 'completed': return 'green';
      default: return 'gray';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'in_progress': return 'En Progreso';
      case 'completed': return 'Completado';
      case 'cancelled': return 'Cancelado';
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

  const handleStartBatch = async (batchId: string) => {
const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
    try {
      const resp = await fetch(`${AUTH_BACKEND_URL}/picking/batches/${batchId}/start`, { 
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setBatches(prev => prev.map(batch => batch.id === batchId ? { ...batch, status: 'in_progress' as const } : batch));
    } catch (e: any) {
      setError(e?.message || 'No se pudo iniciar el lote');
    }
  };

  const handleCompleteBatch = async (batchId: string) => {
const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
    try {
      const resp = await fetch(`${AUTH_BACKEND_URL}/picking/batches/${batchId}/complete`, { 
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setBatches(prev => prev.map(batch => batch.id === batchId ? { 
        ...batch, 
        status: 'completed' as const, 
        completedAt: new Date().toISOString(),
        pickedItems: batch.totalItems,
        efficiency: 100
      } : batch));
    } catch (e: any) {
      setError(e?.message || 'No se pudo completar el lote');
    }
  };

  const handleViewDetails = (batch: Batch) => {
    setSelectedBatch(batch);
    setShowDetails(true);
  };

  const calculateProgress = (batch: Batch) => {
    return batch.totalItems > 0 ? (batch.pickedItems / batch.totalItems) * 100 : 0;
  };

  // Cargar órdenes disponibles cuando se abre el modal
  useEffect(() => {
    if (!showCreateForm) return;
const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
    const loadOrders = async () => {
      try {
        const resp = await fetch(`${AUTH_BACKEND_URL}/picking/tasks?status=pending`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        const tasks = Array.isArray(json?.tasks) ? json.tasks : [];
        const normalized = tasks.map((t: any) => ({
          id: String(t.id),
          number: String(t.orderNumber || ''),
          customer: String(t.customer || ''),
          items: Array.isArray(t.items) ? t.items.map((i: any) => ({ sku: String(i.sku || ''), name: String(i.name || ''), quantity: Number(i.quantity || 0) })) : [],
        }));
        setAvailableOrders(normalized.map((o: any) => ({ id: o.id, number: o.number, customer: o.customer })));
        const mapObj: Record<string, { number: string; items: { sku: string; name: string; quantity: number }[] }> = {};
        for (const o of normalized) {
          mapObj[o.id] = { number: o.number, items: o.items };
        }
        setOrderItemsMap(mapObj);
      } catch (e: any) {
        // Silenciar en el formulario
      }
    };
    loadOrders();
  }, [showCreateForm]);

  // Cargar ítems del lote cuando se abre el modal de detalles
  useEffect(() => {
    if (!showDetails || !selectedBatch) return;
const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
    let mounted = true;
    const loadItems = async () => {
      try {
        const resp = await fetch(`${AUTH_BACKEND_URL}/picking/batches/${selectedBatch.id}/items`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        let items: BatchItem[] = Array.isArray(json.items) ? json.items.map((i: any) => ({
          id: String(i.id),
          productId: String(i.productId || ''),
          sku: String(i.sku || ''),
          description: String(i.description || ''),
          quantity: Number(i.quantity || 0) || 0,
          unit: i.unit || undefined,
          sourceLocation: i.sourceLocation ?? null,
          expiryDate: i.expiryDate ?? null,
          pickedQuantity: Number(i.pickedQuantity || 0) || 0,
          status: (i.status || 'picking_pending') as BatchItem['status'],
          weight: typeof i.weight !== 'undefined' ? (i.weight === null ? null : Number(i.weight)) : undefined,
          dimensions: i.dimensions ?? undefined,
          barcode: i.barcode ?? undefined,
          locationDetails: i.locationDetails ?? null,
        })) : [];
        // Asegurar orden por ubicación en cliente (por si el backend cambia)
        const locKey = (ld: BatchItem['locationDetails']) => {
          if (!ld) return '~~~~~';
          const parts = [ld.zone, ld.aisle, ld.rack, ld.shelf, ld.bin, ld.code]
            .map(x => (x || '').toString().padStart(4, ' '));
          return parts.join('|');
        };
        items = items.sort((a, b) => {
          const ka = locKey(a.locationDetails);
          const kb = locKey(b.locationDetails);
          if (ka < kb) return -1;
          if (ka > kb) return 1;
          const sa = (a.sku || '').toString();
          const sb = (b.sku || '').toString();
          if (sa < sb) return -1;
          if (sa > sb) return 1;
          return 0;
        });
        if (!mounted) return;
        setBatchItems(items);
        // Inicializar inputs y temporizadores
        const bi: Record<string, string> = {};
        const li: Record<string, string> = {};
        const tm: Record<string, { startAt?: number; endAt?: number; locationVerified?: boolean }> = {};
        for (const it of items) {
          bi[it.id] = '';
          li[it.id] = '';
          tm[it.id] = {};
        }
        setBarcodeInputs(bi);
        setLocationInputs(li);
        setItemTimers(tm);
        // Actualizar progreso del lote a partir de ítems
        const total = items.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
        const picked = items.reduce((acc, it) => acc + Number(it.pickedQuantity || 0), 0);
        setSelectedBatch((prev) => prev ? { ...prev, totalItems: total, pickedItems: picked } : prev);
      } catch {
        setBatchItems([]);
      }
    };
    loadItems();
    const iv = setInterval(() => setNowTick(Date.now()), 1000);
    return () => { mounted = false; clearInterval(iv); };
  }, [showDetails, selectedBatch, token]);

  const formatElapsed = (start?: number, end?: number) => {
    if (!start) return '—';
    const till = end ?? nowTick;
    const sec = Math.max(0, Math.floor((till - start) / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  const updateBatchProgressFromItems = (items: BatchItem[]) => {
    const total = items.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
    const picked = items.reduce((acc, it) => acc + Number(it.pickedQuantity || 0), 0);
    setSelectedBatch((prev) => prev ? { ...prev, totalItems: total, pickedItems: picked } : prev);
  };

  // Mapa de refs para inputs de ubicación por ítem
  const locationInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const focusNextItem = (currentItemId: string) => {
    // Buscar el siguiente ítem no completado; si no hay, mantener foco actual
    const idx = batchItems.findIndex(i => i.id === currentItemId);
    const tryFocus = (id?: string) => {
      if (!id) return;
      const el = locationInputRefs.current[id];
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
    // Primero hacia adelante
    for (let i = idx + 1; i < batchItems.length; i++) {
      const it = batchItems[i];
      if (Number(it.pickedQuantity || 0) < Number(it.quantity || 0)) {
        tryFocus(it.id);
        return;
      }
    }
    // Luego hacia atrás
    for (let i = 0; i < idx; i++) {
      const it = batchItems[i];
      if (Number(it.pickedQuantity || 0) < Number(it.quantity || 0)) {
        tryFocus(it.id);
        return;
      }
    }
  };

  const confirmItemQuantity = async (item: BatchItem, qty: number) => {
    if (!selectedBatch || qty <= 0) return;
const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8082' : '');
    try {
      const resp = await fetch(`${AUTH_BACKEND_URL}/picking/batches/${selectedBatch.id}/items/${item.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ quantity: qty })
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      const newPicked = Number(json?.picked_quantity ?? (item.pickedQuantity + qty));
      const newStatus = (json?.status || item.status) as BatchItem['status'];
      setBatchItems((prev) => {
        const next = prev.map((it) => it.id === item.id ? { ...it, pickedQuantity: newPicked, status: newStatus } : it);
        updateBatchProgressFromItems(next);
        return next;
      });
      setItemTimers((prev) => {
        const curr = prev[item.id] || {};
        const isDone = newPicked >= item.quantity;
        return { ...prev, [item.id]: { ...curr, endAt: isDone && !curr.endAt ? Date.now() : curr.endAt } };
      });
    } catch {
      // Ignorar errores de confirmación en UX
    }
  };

  // Completa la cantidad restante del ítem de una vez
  const fillItemAllQuantity = async (item: BatchItem) => {
    const remaining = Math.max(0, Number(item.quantity || 0) - Number(item.pickedQuantity || 0));
    if (remaining > 0) {
      await confirmItemQuantity(item, remaining);
      focusNextItem(item.id);
    }
  };

  const handleLocationInput = (item: BatchItem, value: string) => {
    setLocationInputs((prev) => ({ ...prev, [item.id]: value }));
    const normalized = String(value || '').trim();
    const expected = String(item.sourceLocation || '').trim();
    if (normalized && expected && normalized.toUpperCase() === expected.toUpperCase()) {
      setItemTimers((prev) => {
        const curr = prev[item.id] || {};
        return { ...prev, [item.id]: { ...curr, locationVerified: true, startAt: curr.startAt || Date.now() } };
      });
    }
  };

  const handleBarcodeInput = (item: BatchItem, value: string) => {
    setBarcodeInputs((prev) => ({ ...prev, [item.id]: value }));
    const normalized = String(value || '').trim();
    const sku = String(item.sku || '').trim();
    if (!normalized) return;
    const matches = normalized.toUpperCase().includes(sku.toUpperCase());
    if (matches) {
      setItemTimers((prev) => {
        const curr = prev[item.id] || {};
        return { ...prev, [item.id]: { ...curr, startAt: curr.startAt || Date.now() } };
      });
      confirmItemQuantity(item, 1);
      setBarcodeInputs((prev) => ({ ...prev, [item.id]: '' }));
    }
  };

  // Agregar desglose por SKU con cantidades por documento
  useEffect(() => {
    const perSku = new Map<string, { sku: string; name: string; totalQty: number; perOrder: { orderId: string; orderNumber: string; quantity: number }[] }>();
    for (const id of selectedOrderIds) {
      const info = orderItemsMap[id];
      if (!info) continue;
      for (const it of info.items) {
        const key = it.sku || '';
        const prev = perSku.get(key) || { sku: key, name: it.name || '', totalQty: 0, perOrder: [] };
        prev.totalQty += Number(it.quantity || 0);
        prev.perOrder.push({ orderId: id, orderNumber: info.number, quantity: Number(it.quantity || 0) });
        perSku.set(key, prev);
      }
    }
    const arr = Array.from(perSku.values()).sort((a, b) => a.sku.localeCompare(b.sku));
    setSkuAggregates(arr);
    if (arr.length && selectedSkus.length === 0) {
      setSelectedSkus(arr.map(x => x.sku));
    }
    if (arr.length === 0) {
      setSelectedSkus([]);
    }
    // Consultar inventario resumido por SKU al cambiar el conjunto
const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8082' : '');
    const fetchInventory = async () => {
      try {
        if (!arr.length) { setSkuInventory({}); return; }
        const resp = await fetch(`${AUTH_BACKEND_URL}/inventory/bySkus`, {
          method: 'POST',
          headers: token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skus: arr.map(s => s.sku) }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        const inv = Array.isArray(json?.inventory) ? json.inventory : [];
        const map: Record<string, { totalAvailable: number; bestLocation: string | null; earliestExpiry: string | null }> = {};
        const opts: Record<string, { code: string; available: number }[]> = {};
        for (const r of inv) {
          map[String(r.sku || '')] = {
            totalAvailable: Number(r.totalAvailable || 0),
            bestLocation: r.bestLocation || null,
            earliestExpiry: r.earliestExpiry || null,
          };
          // Solo mostrar ubicaciones con stock disponible de ese SKU
          opts[String(r.sku || '')] = Array.isArray(r.locations) ? r.locations
            .filter((x: any) => x && x.code && Number(x.available || 0) > 0)
            .map((x: any) => ({ code: String(x.code), available: Number(x.available || 0) })) : [];
        }

        // Enriquecer con inventario detallado por SKU (incluyendo ubicaciones virtuales)
        await Promise.all(arr.map(async (s) => {
          const sku = s.sku;
          try {
            const qs = new URLSearchParams({ q: sku, limit: '100' });
            const r = await fetch(`${AUTH_BACKEND_URL}/inventory/list?${qs.toString()}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (r.ok) {
              const j = await r.json();
              const rows = Array.isArray(j?.inventory) ? j.inventory : [];
              const perLocation = new Map<string, number>();
              for (const row of rows) {
                const code = String(row?.location?.code || row?.location_code || '');
                const avail = Number(row?.available_quantity || row?.available || 0);
                if (!code || avail <= 0) continue;
                perLocation.set(code, (perLocation.get(code) || 0) + avail);
              }
              const enriched = Array.from(perLocation.entries())
                .map(([code, available]) => ({ code, available }))
                .sort((a, b) => b.available - a.available);
              if (enriched.length) opts[sku] = enriched; // reemplazar si hay datos más completos
            }
          } catch {}
        }));
        setSkuInventory(map);
        setSkuLocationOptions(opts);
      } catch (_) {
        // Silenciar errores en UI del modal
      }
    };
    const fetchDefaults = async () => {
      try {
        if (!arr.length) { setProductDefaultLocationBySku({}); return; }
        const results: Record<string, string | null> = {};
        await Promise.all(arr.map(async (s) => {
          try {
            const r = await fetch(`${AUTH_BACKEND_URL}/products/bySku/${encodeURIComponent(s.sku)}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (r.ok) {
              const j = await r.json();
              const code = j?.product?.default_location?.code || null;
              results[s.sku] = code ? String(code) : null;
            } else {
              results[s.sku] = null;
            }
          } catch {
            results[s.sku] = null;
          }
        }));
        setProductDefaultLocationBySku(results);
      } catch (_) {
        // Silenciar
      }
    };
    (async () => {
      await Promise.all([fetchInventory(), fetchDefaults()]);
      // Preselección estricta por SKU: si la mejor ubicación existe en opciones, usarla; si no, usar la primera opción
      setSelectedSkuLocation(prev => {
        const next = { ...prev };
        for (const s of arr) {
          const sku = s.sku;
          if (next[sku]) continue;
          const options = skuLocationOptions[sku] || [];
          const best = skuInventory[sku]?.bestLocation || null;
          const hasBest = !!(best && options.some(o => o.code === best));
          if (hasBest) next[sku] = String(best);
          else if (options.length) next[sku] = String(options[0].code);
          else next[sku] = '';
        }
        return next;
      });
    })();
  }, [selectedOrderIds, orderItemsMap]);

  // Recalcular sugerencia cuando cambien opciones/inventario
  useEffect(() => {
    setSelectedSkuLocation(prev => {
      const next = { ...prev };
      for (const agg of skuAggregates) {
        const sku = agg.sku;
        if (next[sku]) continue;
        const options = skuLocationOptions[sku] || [];
        const best = skuInventory[sku]?.bestLocation || null;
        const hasBest = !!(best && options.some(o => o.code === best));
        if (hasBest) next[sku] = String(best);
        else if (options.length) next[sku] = String(options[0].code);
        else next[sku] = '';
      }
      return next;
    });
  }, [skuAggregates, skuLocationOptions, skuInventory]);

  const handleCreateBatch = async () => {
    const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8080' : '');
    try {
      if (selectedOrderIds.length === 0) {
        setError('Selecciona al menos una orden');
        return;
      }
      const fallbackAssignedTo = (formAssignedTo || user?.full_name || user?.email || '').trim();
      const payload = {
        assignedTo: fallbackAssignedTo ? fallbackAssignedTo : undefined,
        assigned_to_user_id: assignedUserId || user?.id || undefined,
        zone: formZone || undefined,
        order_ids: selectedOrderIds,
        priority: formPriority,
        selected_skus: selectedSkus,
        selected_locations: selectedSkus
          .map(sku => ({ sku, location_code: selectedSkuLocation[sku] }))
          .filter(x => x.location_code),
      };
      const resp = await fetch(`${AUTH_BACKEND_URL}/picking/batches`, {
        method: 'POST',
        headers: token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (!json?.id) throw new Error('No se pudo crear el lote');
      setShowCreateForm(false);
      setFormName('');
      setFormAssignedTo('');
      setAssignedUserId(null);
      setUserQuery('');
      setUserResults([]);
      setFormZone('');
      setFormPriority('medium');
      setSelectedOrderIds([]);
      setRefreshToken(t => t + 1);
    } catch (e: any) {
      setError(e?.message || 'No se pudo crear el lote');
    }
  };

  // Búsqueda en tiempo real de usuarios para "Asignar a"
  useEffect(() => {
    const q = (userQuery || '').trim();
    const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:8080' : '');
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
    }, 300);
    return () => { clearTimeout(id); ctrl.abort(); };
  }, [userQuery]);

  return (
    <div className="space-y-6">
      {loading && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded">Cargando lotes reales…</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded">{error}</div>
      )}
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Ola por SKU</h2>
          <p className="text-gray-600">Agrupa múltiples órdenes para optimizar el picking</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ola por SKU
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-4">
        <div>
          <label className="block text-sm text-gray-600">Estado</label>
          <select
            className="mt-1 px-3 py-2 border rounded"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="all">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="in_progress">En proceso</option>
            <option value="completed">Completados</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600">Prioridad</label>
          <select
            className="mt-1 px-3 py-2 border rounded"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as any)}
          >
            <option value="all">Todas</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Lotes Activos</p>
              <p className="text-2xl font-bold text-gray-900">
                {batches.filter(b => b.status === 'in_progress').length}
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
              <p className="text-sm font-medium text-gray-600">Completados Hoy</p>
              <p className="text-2xl font-bold text-gray-900">
                {batches.filter(b => b.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Eficiencia Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {batches.length ? Math.round(batches.reduce((sum, b) => sum + b.efficiency, 0) / batches.length) : 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tiempo Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {batches.length ? Math.round(batches.reduce((sum, b) => sum + (b.actualTime || b.estimatedTime), 0) / batches.length) : 0} min
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Batch List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Lotes de Picking</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {batches.map((batch) => {
            const statusColor = getStatusColor(batch.status);
            const progress = calculateProgress(batch);

            return (
              <div key={batch.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h4 className="text-lg font-medium text-gray-900">{batch.name}</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800`}>
                        {getStatusText(batch.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-2" />
                        <span className="font-medium">Asignado:</span>
                        <span className="ml-1">{batch.assignedTo}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span className="font-medium">Zona:</span>
                        <span className="ml-1">{batch.zone}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        <span className="font-medium">Órdenes:</span>
                        <span className="ml-1">{batch.orders.length}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Package className="w-4 h-4 mr-2" />
                        <span className="font-medium">Items:</span>
                        <span className="ml-1">{batch.totalItems}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {batch.status === 'in_progress' && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Progreso</span>
                          <span>{progress.toFixed(0)}% ({batch.pickedItems}/{batch.totalItems})</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Orders Preview */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {batch.orders.slice(0, 3).map((order) => (
                        <span
                          key={order.id}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs bg-${getPriorityColor(order.priority)}-100 text-${getPriorityColor(order.priority)}-800`}
                        >
                          {order.orderNumber}
                        </span>
                      ))}
                      {batch.orders.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                          +{batch.orders.length - 3} más
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>
                          {batch.actualTime ? `${batch.actualTime}/${batch.estimatedTime} min` : `${batch.estimatedTime} min est.`}
                        </span>
                      </div>
                      {batch.efficiency > 0 && (
                        <div className="flex items-center">
                          <BarChart3 className="w-4 h-4 mr-1" />
                          <span>Eficiencia: {batch.efficiency}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleViewDetails(batch)}
                      className="p-2 text-gray-400 hover:text-blue-600"
                      title="Ver detalles"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Imprimir etiqueta QR + código de barra */}
                    <button
                      onClick={() => { setLabelBatch(batch); setShowBatchLabel(true); }}
                      className="p-2 text-gray-400 hover:text-gray-700"
                      title="Imprimir etiqueta"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    
                    {batch.status === 'pending' && (
                      <button
                        onClick={() => handleStartBatch(batch.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Iniciar
                      </button>
                    )}
                    
                    {batch.status === 'in_progress' && (
                      <button
                        onClick={() => handleCompleteBatch(batch.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Completar
                      </button>
                    )}

                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Batch Details Modal */}
      {showDetails && selectedBatch && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Detalles del Lote - {selectedBatch.name}
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Batch Info */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Información del Lote</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Estado:</span>
                      <span className={`text-sm font-medium text-${getStatusColor(selectedBatch.status)}-600`}>
                        {getStatusText(selectedBatch.status)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Asignado a:</span>
                      <span className="text-sm text-gray-900">{selectedBatch.assignedTo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Zona:</span>
                      <span className="text-sm text-gray-900">{selectedBatch.zone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Total Items:</span>
                      <span className="text-sm text-gray-900">{selectedBatch.totalItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Items Recogidos:</span>
                      <span className="text-sm text-gray-900">{selectedBatch.pickedItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Eficiencia:</span>
                      <span className="text-sm text-gray-900">{selectedBatch.efficiency}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Orders List */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">Órdenes en el Lote</h4>
                <div className="space-y-3">
                  {selectedBatch.orders.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-medium text-gray-900">{order.orderNumber}</h5>
                          <p className="text-sm text-gray-500">{order.customer}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${getPriorityColor(order.priority)}-100 text-${getPriorityColor(order.priority)}-800`}>
                            {order.priority === 'high' ? 'Alta' : order.priority === 'medium' ? 'Media' : 'Baja'}
                          </span>
                          <span className="text-sm text-gray-600">{order.items} items</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Items List inside Details Modal */}
            <div className="mt-6">
              <h4 className="text-lg font-medium text-gray-900 mb-3">Artículos en el Lote (ordenados por ubicación)</h4>
              {batchItems.length === 0 ? (
                <p className="text-sm text-gray-600">No hay artículos o no se pudieron cargar.</p>
              ) : (
                <div className="space-y-3">
                  {batchItems.map((item) => {
                    const pct = item.quantity > 0 ? Math.min(100, Math.round((item.pickedQuantity / item.quantity) * 100)) : 0;
                    const tm = itemTimers[item.id] || {};
                    const done = item.pickedQuantity >= item.quantity;
                    return (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-900">{item.sku}</span>
                              <span className="text-sm text-gray-600">{item.description}</span>
                            </div>
                            <div className="mt-1 text-sm text-gray-600">
                              <span className="font-medium">Ubicación:</span> {item.sourceLocation || '—'}
                              {item.locationDetails && (
                                <span className="ml-2 text-xs text-gray-500">
                                  [
                                  {item.locationDetails.zone || '-'} /
                                  {item.locationDetails.aisle || '-'} /
                                  {item.locationDetails.rack || '-'} /
                                  {item.locationDetails.shelf || '-'} /
                                  {item.locationDetails.bin || '-'}
                                  ]
                                </span>
                              )}
                            </div>
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Cantidad:</span> {item.pickedQuantity}/{item.quantity}
                              <span className="ml-3 font-medium">Avance:</span> {pct}%
                            </div>
                            <div className="mt-2 text-xs text-gray-700 space-x-3">
                              {item.unit && (
                                <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700">UM: {item.unit}</span>
                              )}
                              {typeof item.weight !== 'undefined' && item.weight !== null && (
                                <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700">Peso: {item.weight}</span>
                              )}
                              {item.dimensions && (
                                <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700">Dimensiones: {item.dimensions}</span>
                              )}
                              {item.barcode && (
                                <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700">Barcode: {item.barcode}</span>
                              )}
                              {item.expiryDate && (
                                <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700">Vence: {item.expiryDate}</span>
                              )}
                            </div>
                            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                              <div className={`h-2 rounded-full ${done ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <div className="mt-2 text-xs text-gray-600">
                              <Clock className="inline-block w-4 h-4 mr-1" />
                              Tiempo: {formatElapsed(tm.startAt, tm.endAt)}
                              {tm.locationVerified ? (
                                <span className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-700">Ubicación verificada</span>
                              ) : (
                                <span className="ml-2 px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">Verifique ubicación</span>
                              )}
                            </div>
                          </div>
                          <div className="w-72">
                            <label className="block text-xs text-gray-600">Leer ubicación</label>
                            <input
                              type="text"
                              className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm"
                              placeholder="Escanee/ingrese código de ubicación"
                              value={locationInputs[item.id] || ''}
                              onChange={(e) => handleLocationInput(item, e.target.value)}
                              disabled={done}
                              ref={(el) => { locationInputRefs.current[item.id] = el; }}
                            />
                            <label className="block mt-3 text-xs text-gray-600">Leer código de barras del artículo</label>
                          <input
                              type="text"
                              className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm"
                              placeholder={`Escanee SKU ${item.sku} (incrementa +1)`}
                              value={barcodeInputs[item.id] || ''}
                              onChange={(e) => handleBarcodeInput(item, e.target.value)}
                              disabled={done}
                            />
                            <button
                              type="button"
                              className="mt-3 w-full px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
                              onClick={() => fillItemAllQuantity(item)}
                              disabled={done}
                            >
                              Llenar cantidad
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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

      {/* Batch Label Modal */}
      {showBatchLabel && labelBatch && (
        <BatchLabelModal
          isOpen={showBatchLabel}
          onClose={() => { setShowBatchLabel(false); setLabelBatch(null); }}
          batch={{
            id: labelBatch.id,
            name: labelBatch.name,
            assignedTo: labelBatch.assignedTo,
            zone: labelBatch.zone,
            totalItems: labelBatch.totalItems,
            orders: labelBatch.orders,
          }}
        />
      )}

      {/* Create Batch Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Crear Nuevo Lote</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Campo de nombre eliminado: el código del lote se genera automáticamente en backend */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asignar a
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Buscar usuario (email o nombre)"
                      value={userQuery}
                      onChange={(e) => {
                        setAssignedUserId(null);
                        setFormAssignedTo(e.target.value);
                        setUserQuery(e.target.value);
                      }}
                    />
                    {userResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {userResults.map(u => (
                          <button
                            key={u.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-gray-50"
                            onClick={() => {
                              setAssignedUserId(u.id);
                              const display = u.name || u.email;
                              setFormAssignedTo(display);
                              setUserQuery(display);
                              setUserResults([]);
                            }}
                          >
                            <div className="text-sm text-gray-900">{u.name || u.email}</div>
                            {u.email ? (<div className="text-xs text-gray-600">{u.email}</div>) : null}
                          </button>
                        ))}
                      </div>
                    )}
                    {assignedUserId && (
                      <div className="mt-1 text-xs text-gray-600">Usuario seleccionado: {formAssignedTo}</div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zona
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Zona A - Picking"
                    value={formZone}
                    onChange={(e) => setFormZone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridad
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                  >
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                  </select>
                </div>
                
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Órdenes Disponibles
                </label>
                <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
                  <div className="space-y-2">
                    {availableOrders.map((order) => (
                      <label key={order.id} className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSelectedOrderIds(prev => checked ? [...prev, order.id] : prev.filter(id => id !== order.id));
                          }}
                        />
                        <span className="ml-2 text-sm text-gray-900">{order.number} — {order.customer}</span>
                      </label>
                    ))}
                    {availableOrders.length === 0 && (
                      <p className="text-sm text-gray-500">No hay órdenes pendientes disponibles.</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Productos (SKU) de Órdenes Seleccionadas
                </label>
                <div className="border border-gray-300 rounded-md p-3 max-h-56 overflow-y-auto">
                  {skuAggregates.length > 0 ? (
                    <div className="space-y-2">
                      {skuAggregates.map((agg) => (
                        <label key={agg.sku} className="flex items-start">
                          <input
                            type="checkbox"
                            className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={selectedSkus.includes(agg.sku)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSelectedSkus(prev => checked ? [...prev, agg.sku] : prev.filter(s => s !== agg.sku));
                            }}
                          />
                          <div className="ml-2 flex-1">
                            <div className="text-sm font-medium text-gray-900">{agg.sku} — {agg.name}</div>
                            <div className="text-xs text-gray-600">Total órdenes: {agg.totalQty}</div>
                            <div className="text-xs text-gray-600">Disponibilidad: {skuInventory[agg.sku]?.totalAvailable ?? '—'}{skuInventory[agg.sku]?.bestLocation ? ` en ${skuInventory[agg.sku]?.bestLocation}` : ''}</div>
                            <div className="text-xs text-gray-600">{agg.perOrder.map(po => `${po.orderNumber}: ${po.quantity}`).join(', ')}</div>
                            {skuLocationOptions[agg.sku]?.length ? (
                              <div className="mt-2">
                                <label className="text-xs text-gray-600 mr-2">Ubicación:</label>
                                <select
                                  className="text-sm border border-gray-300 rounded px-2 py-1"
                                  value={selectedSkuLocation[agg.sku] || ''}
                                  onChange={(e) => setSelectedSkuLocation(prev => ({ ...prev, [agg.sku]: e.target.value }))}
                                >
                                  <option value="">Sugerida ({selectedSkuLocation[agg.sku] || '—'})</option>
                                  {skuLocationOptions[agg.sku].map(opt => (
                                    <option key={opt.code} value={opt.code}>{opt.code} — disp {opt.available}</option>
                                  ))}
                                </select>
                                {(() => {
                                  const chosenCode = (selectedSkuLocation[agg.sku] || '') as string;
                                  const chosenAvail = (skuLocationOptions[agg.sku] || []).find(o => o.code === chosenCode)?.available ?? 0;
                                  const shortage = Math.max(0, agg.totalQty - chosenAvail);
                                  return (
                                    <div className="mt-1">
                                      <div className={`text-xs ${chosenAvail < agg.totalQty ? 'text-red-600' : 'text-green-600'}`}>
                                        Demanda: {agg.totalQty} · Elegida: {chosenAvail}
                                      </div>
                                      {shortage > 0 && (
                                        <div className="text-xs text-red-600">Disponibilidad insuficiente: faltan {shortage}</div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : null}
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Selecciona órdenes para ver sus productos.</p>
                  )}
                </div>
                {skuAggregates.length > 0 && (
                  <div className="flex items-center justify-between mt-2">
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:text-blue-700"
                      onClick={() => setSelectedSkus(skuAggregates.map(s => s.sku))}
                    >
                      Seleccionar todos
                    </button>
                    <button
                      type="button"
                      className="text-sm text-gray-600 hover:text-gray-700"
                      onClick={() => setSelectedSkus([])}
                    >
                      Quitar todos
                    </button>
                  </div>
                )}
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
                onClick={handleCreateBatch}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Crear Lote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
