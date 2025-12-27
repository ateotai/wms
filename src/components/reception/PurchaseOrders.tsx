import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FileText, 
  Eye, 
  Edit, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  X,
  Search,
  Filter
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';

// Moneda desde configuración
type Currency = 'MXN' | 'USD' | 'EUR';
const getCurrencyLocale = (c: Currency) => ({ MXN: 'es-MX', USD: 'en-US', EUR: 'es-ES' }[c]);
const getCurrencyCode = (c: Currency) => ({ MXN: 'MXN', USD: 'USD', EUR: 'EUR' }[c]);

interface PurchaseOrderItem {
  id: string;
  sku: string;
  description: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: number;
  totalPrice: number;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplier: string;
  status: string;
  orderDate: string;
  expectedDate: string;
  totalAmount: number;
  items: PurchaseOrderItem[];
  notes?: string;
}

type WarehouseOption = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

// Tipos de backend mínimos usados para mapear respuestas
type BackendPurchaseOrder = {
  id: string | number;
  po_number: string;
  supplier_id?: string | number | null;
  status?: string;
  order_date: string;
  expected_date: string;
  total_amount?: number;
  items?: BackendPurchaseOrderItem[];
  notes?: string | null;
};

type BackendPurchaseOrderItem = {
  id: string | number;
  products?: { sku?: string; description?: string; name?: string };
  quantity?: number;
  received_quantity?: number;
  unit_price?: number;
  total_price?: number;
};

export const PurchaseOrders: React.FC = () => {
  const { signOut } = useAuth();
  const [currency, setCurrency] = useState<Currency>('MXN');
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    supplierId: '',
    warehouseId: '',
    expectedDate: '',
    notes: ''
  });
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);

  // Notificaciones Push
  const [, setNotificationsEnabled] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  // Resaltado temporal tras sincronización
  const [highlightCount, setHighlightCount] = useState<number>(0);
  const [showHighlightBanner, setShowHighlightBanner] = useState<boolean>(false);
  const [appointmentOrderIds, setAppointmentOrderIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editingStatusValue, setEditingStatusValue] = useState<string>('pending');
  const ORDER_STATUS_OPTIONS = ['pending','partial','received','cancelled','draft','sent','confirmed'];
  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return orders.filter((o) =>
      (statusFilter === 'all' || String(o.status || '').toLowerCase() === statusFilter) &&
      (term === '' ||
        o.orderNumber.toLowerCase().includes(term) ||
        o.supplier.toLowerCase().includes(term))
    );
  }, [orders, statusFilter, searchTerm]);

  useEffect(() => {
    const supported = 'Notification' in window;
    if (!supported) return;
    if (Notification.permission === 'granted') {
      setNotificationsEnabled(true);
      // Si ya hay permiso, asegurar suscripción registrada en backend
      subscribePush();
    } else if (Notification.permission === 'default') {
      // Solicitar permiso automáticamente para activar notificaciones por defecto
      Notification.requestPermission()
        .then((permission) => {
          const granted = permission === 'granted';
          setNotificationsEnabled(granted);
          if (granted) {
            subscribePush();
          } else {
            setNotificationError('Permiso de notificaciones denegado.');
          }
        })
        .catch(() => {
          setNotificationError('No se pudo solicitar permiso de notificaciones.');
        });
    }
  }, []);

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const ensureServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    try {
      if (!('serviceWorker' in navigator)) return null;
      const existing = await navigator.serviceWorker.getRegistration();
      if (existing) return existing;
      return await navigator.serviceWorker.register('/sw.js');
    } catch {
      return null;
    }
  };

  const subscribePush = async () => {
    try {
      setNotificationError(null);
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setNotificationError('El navegador no soporta Push API.');
        return;
      }
      const reg = await ensureServiceWorker();
      if (!reg) {
        setNotificationError('No se pudo registrar el Service Worker.');
        return;
      }

      // Obtener clave pública VAPID desde backend o env
      let publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
      if (!publicKey && AUTH_BACKEND_URL) {
        try {
          const resp = await fetch(`${AUTH_BACKEND_URL}/push/vapidPublicKey`);
          if (resp.ok) {
            const json = await resp.json();
            publicKey = json?.publicKey || '';
          }
        } catch {
          // noop
        }
      }
      if (!publicKey) {
        setNotificationError('No hay clave pública VAPID configurada.');
        return;
      }

      // Reusar suscripción existente si la hay
      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      // Enviar suscripción al backend
      if (AUTH_BACKEND_URL && subscription) {
        await fetch(`${AUTH_BACKEND_URL}/push/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription }),
        });
      }
      setNotificationsEnabled(true);
    } catch (e) {
      console.warn('Error suscribiendo a Push:', e);
      setNotificationError('No se pudo registrar la suscripción Push.');
    }
  };

  

  const isValidUUID = (v: string): boolean => {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v.trim());
  };

  const loadWarehouses = useCallback(async () => {
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
  }, [createForm.warehouseId]);

  const loadActiveAppointments = useCallback(async () => {
    try {
      if (!AUTH_BACKEND_URL) return;
      const token = localStorage.getItem('app_token');
      const resp = await fetch(`${AUTH_BACKEND_URL}/reception/appointments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) return;
      const json = await resp.json();
      const active = new Set(['scheduled', 'arrived', 'receiving', 'validated']);
      const ids = new Set<string>();
      for (const a of (json.appointments || [])) {
        const st = String(a?.status || '').toLowerCase();
        if (!active.has(st)) continue;
        for (const o of (a.orders || [])) ids.add(String(o.id));
        for (const id of (a.order_ids || [])) ids.add(String(id));
      }
      setAppointmentOrderIds(ids);
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('app_token');
      if (!AUTH_BACKEND_URL) throw new Error('Backend no configurado');
      const resp = await fetch(`${AUTH_BACKEND_URL}/purchase_orders`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) {
        if (resp.status === 401) {
          try { localStorage.removeItem('app_token'); } catch {}
          await signOut();
          setError('Sesión expirada. Vuelve a iniciar sesión.');
          setLoading(false);
          return;
        }
        const text = await resp.text().catch(() => '');
        throw new Error(text || 'Error al cargar órdenes de compra');
      }
      const json = await resp.json();
      const rawList: BackendPurchaseOrder[] = (json.purchase_orders || []) as BackendPurchaseOrder[];
      const list = rawList.map((po: BackendPurchaseOrder) => ({
        id: String(po.id),
        orderNumber: po.po_number,
        supplier: po.supplier_id ? `Proveedor #${po.supplier_id}` : 'Proveedor',
        status: (po.status || 'pending'),
        orderDate: po.order_date,
        expectedDate: po.expected_date,
        totalAmount: Number(po.total_amount || 0),
        items: [],
        notes: po.notes || undefined,
      })) as PurchaseOrder[];
      setOrders(list);
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
      const message = err instanceof Error ? err.message : 'Error al cargar órdenes de compra';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetail = async (orderId: string): Promise<PurchaseOrder | null> => {
    try {
      const token = localStorage.getItem('app_token');
      if (!AUTH_BACKEND_URL) throw new Error('Backend no configurado');
      const resp = await fetch(`${AUTH_BACKEND_URL}/purchase_orders/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) {
        if (resp.status === 401) {
          try { localStorage.removeItem('app_token'); } catch {}
          await signOut();
          throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
        }
        const text = await resp.text().catch(() => '');
        throw new Error(text || 'Error al cargar detalles de la orden');
      }
      const { purchase_order } = await resp.json();
      const mapped: PurchaseOrder = {
        id: String(purchase_order.id),
        orderNumber: purchase_order.po_number,
        supplier: purchase_order.supplier_id ? `Proveedor #${purchase_order.supplier_id}` : 'Proveedor',
        status: (purchase_order.status || 'pending'),
        orderDate: purchase_order.order_date,
        expectedDate: purchase_order.expected_date,
        totalAmount: Number(purchase_order.total_amount || 0),
        items: (purchase_order.items || []).map((it: BackendPurchaseOrderItem) => ({
          id: String(it.id),
          sku: it.products?.sku || '',
          description: it.products?.description || it.products?.name || '',
          quantityOrdered: Number(it.quantity || 0),
          quantityReceived: Number(it.received_quantity || 0),
          unitPrice: Number(it.unit_price || 0),
          totalPrice: Number(it.total_price || 0),
        })),
        notes: purchase_order.notes || undefined,
      };
      return mapped;
    } catch (err) {
      console.error('Error fetchOrderDetail:', err);
      return null;
    }
  };

  const handleReceiveOrder = async (orderId: string) => {
    try {
      const detail = await fetchOrderDetail(orderId);
      if (!detail) throw new Error('No se pudo cargar la orden');
      const itemsPayload = detail.items
        .map((it) => ({
          item_id: it.id,
          quantity: Math.max(0, it.quantityOrdered - it.quantityReceived),
        }))
        .filter((it) => it.quantity > 0);
      if (itemsPayload.length === 0) {
        alert('No hay cantidades pendientes por recibir.');
        return;
      }
      const token = localStorage.getItem('app_token');
      if (!AUTH_BACKEND_URL) throw new Error('Backend no configurado');
      const resp = await fetch(`${AUTH_BACKEND_URL}/purchase_orders/${orderId}/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ items: itemsPayload }),
      });
      if (!resp.ok) {
        if (resp.status === 401) {
          try { localStorage.removeItem('app_token'); } catch {}
          await signOut();
          alert('Sesión expirada. Vuelve a iniciar sesión.');
          return;
        }
        const text = await resp.text().catch(() => '');
        throw new Error(text || 'Error al recepcionar la orden');
      }
      const json = await resp.json();
      alert(`Recepción exitosa: ${json.receivedQty} unidades. Estado: ${json.status}`);
      await fetchOrders();
      if (showOrderModal) {
        const updated = await fetchOrderDetail(orderId);
        if (updated) setSelectedOrder(updated);
      }
    } catch (err) {
      console.error('Error receiving order:', err);
      const message = err instanceof Error ? err.message : 'Error al recepcionar la orden';
      alert(message);
    }
  };

  const handleCreateOrder = async () => {
    try {
      const token = localStorage.getItem('app_token');
      if (!AUTH_BACKEND_URL) throw new Error('Backend no configurado');
      type CreatePurchaseOrderPayload = {
        supplier_id: string | null;
        warehouse_id: string;
        expected_date: string | null;
        notes: string | null;
      };
      const payload: CreatePurchaseOrderPayload = {
        supplier_id: isValidUUID(createForm.supplierId) ? createForm.supplierId.trim() : null,
        warehouse_id: createForm.warehouseId,
        expected_date: createForm.expectedDate || null,
        notes: createForm.notes || null,
      };
      if (!payload.warehouse_id) {
        alert('Selecciona un almacén');
        return;
      }
      const resp = await fetch(`${AUTH_BACKEND_URL}/purchase_orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        if (resp.status === 401) {
          try { localStorage.removeItem('app_token'); } catch {}
          await signOut();
          alert('Sesión expirada. Vuelve a iniciar sesión.');
          return;
        }
        const text = await resp.text().catch(() => '');
        throw new Error(text || 'Error al crear la orden');
      }
      const { purchase_order } = await resp.json();
      setShowCreateModal(false);
      setCreateForm({ supplierId: '', warehouseId: '', expectedDate: '', notes: '' });
      await fetchOrders();
      alert(`Orden creada: ${purchase_order.po_number}`);
    } catch (err) {
      console.error('Error creating order:', err);
      const message = err instanceof Error ? err.message : 'Error al crear la orden';
      alert(message);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('app_token');
      if (!AUTH_BACKEND_URL) throw new Error('Backend no configurado');
      setLoading(true);
      setError(null);
      const resp = await fetch(`${AUTH_BACKEND_URL}/purchase_orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!resp.ok) {
        if (resp.status === 401) {
          try { localStorage.removeItem('app_token'); } catch {}
          await signOut();
          setError('Sesión expirada. Vuelve a iniciar sesión.');
          setLoading(false);
          return;
        }
        const text = await resp.text().catch(() => '');
        throw new Error(text || 'Error al actualizar estado de la orden');
      }
      setEditingStatusId(null);
      await fetchOrders();
      if (showOrderModal && selectedOrder && selectedOrder.id === orderId) {
        const updated = await fetchOrderDetail(orderId);
        if (updated) setSelectedOrder(updated);
      }
    } catch (err) {
      console.error('Error updateOrderStatus:', err);
      const message = err instanceof Error ? err.message : 'Error al actualizar estado';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    try {
      const c = (localStorage.getItem('system_currency') as Currency) || 'MXN';
      setCurrency(c);
    } catch (e) {
      // ignore
    }
    loadActiveAppointments();
  }, []);

  // Resaltado temporal al detectar nuevas órdenes tras sincronización
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('notify_po_last');
      if (!raw) return;
      const payload = JSON.parse(raw);
      const count = Number(payload?.newCount ?? payload?.count ?? 0);
      const ts = Number(payload?.ts ?? Date.now());
      const withinWindow = Date.now() - ts < 5 * 60 * 1000; // 5 minutos
      if (orders.length > 0 && count > 0 && withinWindow) {
        setHighlightCount(Math.min(count, orders.length));
        setShowHighlightBanner(true);
        window.setTimeout(() => {
          setHighlightCount(0);
          setShowHighlightBanner(false);
          try { sessionStorage.removeItem('notify_po_last'); } catch {}
        }, 3500);
      }
    } catch {
      // ignore
    }
  }, [orders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'partial': return 'bg-blue-100 text-blue-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'draft': return Clock;
      case 'sent': return Clock;
      case 'confirmed': return CheckCircle;
      case 'partial': return AlertTriangle;
      case 'received': return CheckCircle;
      case 'cancelled': return X;
      default: return Clock;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'draft': return 'Borrador';
      case 'sent': return 'Enviada';
      case 'confirmed': return 'Confirmada';
      case 'partial': return 'Parcial';
      case 'received': return 'Recibida';
      case 'cancelled': return 'Cancelada';
      default: return 'Desconocido';
    }
  };

  const isInActiveAppointment = (id: string) => appointmentOrderIds.has(String(id));

  const handleViewOrder = async (order: PurchaseOrder) => {
    const detail = await fetchOrderDetail(order.id);
    setSelectedOrder(detail || order);
    setShowOrderModal(true);
  };




  const SelectedStatusIcon = selectedOrder ? getStatusIcon(selectedOrder.status) : null;

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar órdenes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </button>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="ml-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            title="Filtrar por estado"
          >
            <option value="all">Todos</option>
            {ORDER_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{getStatusText(s)}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-2">
          {/* Botón de crear nueva orden removido por requerimiento */}
        </div>
      </div>

      {notificationError && (
        <div className="text-sm text-red-600">{notificationError}</div>
      )}

      {showHighlightBanner && highlightCount > 0 && (
        <div className="flex items-center text-sm bg-yellow-100 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-md">
          <span className="font-medium mr-2">Nuevas órdenes:</span>
          <span>{highlightCount}</span>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Orden
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Proveedor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha Esperada
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-sm text-gray-500">Cargando órdenes...</td>
              </tr>
            )}
            {error && !loading && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-sm text-red-600">{error}</td>
              </tr>
            )}
            {!loading && !error && orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-sm text-gray-500">No hay órdenes de compra</td>
              </tr>
            )}
            {!loading && !error && filteredOrders.map((order, idx) => {
              const StatusIcon = getStatusIcon(order.status);
              return (
                <tr key={order.id} className={`hover:bg-gray-50 ${highlightCount > 0 && idx < highlightCount ? 'bg-yellow-50 transition-colors' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {order.orderNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(order.orderDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{order.supplier}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {getStatusText(order.status)}
                    </span>
                    {isInActiveAppointment(order.id) && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        En cita
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(order.expectedDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Intl.NumberFormat(getCurrencyLocale(currency), { style: 'currency', currency: getCurrencyCode(currency) }).format(order.totalAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewOrder(order)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {editingStatusId === order.id ? (
                        <div className="flex items-center space-x-2">
                          <select
                            value={editingStatusValue}
                            onChange={(e) => setEditingStatusValue(e.target.value)}
                            className="text-xs border border-gray-300 rounded px-2 py-1"
                          >
                            {ORDER_STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>{getStatusText(s)}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => updateOrderStatus(order.id, editingStatusValue)}
                            className="text-blue-600 hover:text-blue-900 text-xs"
                            title="Guardar estado"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditingStatusId(null)}
                            className="text-gray-600 hover:text-gray-900 text-xs"
                            title="Cancelar"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          className="text-gray-600 hover:text-gray-900"
                          onClick={() => { setEditingStatusId(order.id); setEditingStatusValue(order.status); }}
                          title="Cambiar estado"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {order.status === 'pending' && !isInActiveAppointment(order.id) && (
                        <button
                          onClick={() => handleReceiveOrder(order.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Iniciar recepción"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Nueva Orden de Compra</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Proveedor ID (opcional)</label>
          <input
            type="text"
            value={createForm.supplierId}
            onChange={(e) => setCreateForm({ ...createForm, supplierId: e.target.value })}
            placeholder="UUID del proveedor"
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Almacén</label>
          <select
            value={createForm.warehouseId}
            onChange={(e) => setCreateForm({ ...createForm, warehouseId: e.target.value })}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            {warehouses.length === 0 && (
              <option value="">No hay almacenes activos</option>
            )}
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fecha Esperada</label>
          <input
            type="date"
            value={createForm.expectedDate}
            onChange={(e) => setCreateForm({ ...createForm, expectedDate: e.target.value })}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Notas</label>
          <textarea
            value={createForm.notes}
            onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
            rows={3}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleCreateOrder} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Crear Orden</button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Detalles de Orden - {selectedOrder.orderNumber}
              </h3>
              <button
                onClick={() => setShowOrderModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Información General</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Proveedor:</span> {selectedOrder.supplier}</div>
                  <div><span className="font-medium">Fecha de Orden:</span> {new Date(selectedOrder.orderDate).toLocaleDateString()}</div>
                  <div><span className="font-medium">Fecha Esperada:</span> {new Date(selectedOrder.expectedDate).toLocaleDateString()}</div>
                  <div><span className="font-medium">Total:</span> {new Intl.NumberFormat(getCurrencyLocale(currency), { style: 'currency', currency: getCurrencyCode(currency) }).format(selectedOrder.totalAmount)}</div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Estado</h4>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                  {SelectedStatusIcon && <SelectedStatusIcon className="w-3 h-3 mr-1" />}
                  {getStatusText(selectedOrder.status)}
                </span>
                {selectedOrder.notes && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Notas</h4>
                    <p className="text-sm text-gray-600">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-4">Productos</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ordenado</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recibido</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedOrder.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.sku}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.quantityOrdered}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.quantityReceived}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {new Intl.NumberFormat(getCurrencyLocale(currency), { style: 'currency', currency: getCurrencyCode(currency) }).format(item.unitPrice)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {new Intl.NumberFormat(getCurrencyLocale(currency), { style: 'currency', currency: getCurrencyCode(currency) }).format(item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowOrderModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
              {selectedOrder.status === 'pending' && !isInActiveAppointment(selectedOrder.id) && (
                <button
                  onClick={() => handleReceiveOrder(selectedOrder.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Iniciar Recepción
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
