import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Search, Package, FileText, Calendar, X, CheckCircle, Bell, MapPin } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

// Tipos mínimos necesarios para trabajar con órdenes y citas
interface BackendPurchaseOrderItem {
  id: string | number;
  sku?: string;
  product_name?: string;
  quantity: number;
  received_quantity?: number;
}

interface BackendPurchaseOrderDetail {
  id: string | number;
  po_number: string;
  warehouse_id?: string | number | null;
  items: BackendPurchaseOrderItem[];
  receiving_location?: { id: string | number; code?: string } | null;
}

interface BackendAppointment {
  id: string;
  appointment_number: string;
  scheduled_at: string;
  orders?: { id: string | number; po_number: string; status?: string }[];
}

export const ReceptionControl: React.FC = () => {
  const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
  const { hasPermissionId } = useAuth();

  // Búsqueda
  const [mode, setMode] = useState<'appointment' | 'order'>('appointment');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resultados
  const [appointmentResult, setAppointmentResult] = useState<BackendAppointment | null>(null);
  const [orderDetail, setOrderDetail] = useState<BackendPurchaseOrderDetail | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | number | null>(null);
  const [receivingMap, setReceivingMap] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Filtros
  const [statusFilter, setStatusFilter] = useState<'todos'|'pendiente'|'parcial'|'completada'>('todos');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

// Listas de coincidencias para citas y órdenes
const [appointmentsList, setAppointmentsList] = useState<BackendAppointment[]>([]);
const [ordersList, setOrdersList] = useState<any[]>([]);

// Helpers de estado y rango de fechas
const normalizeOrderStatus = (s?: string): 'pendiente'|'parcial'|'completada' => {
  const x = (s || '').toLowerCase();
  if (['completed','received','closed'].includes(x)) return 'completada';
  if (['partial','partially_received','partial_received'].includes(x)) return 'parcial';
  return 'pendiente';
};

const deriveAppointmentStatus = (a: BackendAppointment): 'pendiente'|'parcial'|'completada' => {
  const statuses = (a.orders || []).map(o => normalizeOrderStatus(o.status));
  if (statuses.length === 0) return 'pendiente';
  if (statuses.every(s => s === 'completada')) return 'completada';
  if (statuses.some(s => s === 'parcial') || (statuses.some(s => s === 'completada') && statuses.some(s => s === 'pendiente'))) return 'parcial';
  return 'pendiente';
};

const inDateRange = (dateStr?: string): boolean => {
  if (!dateStr) return true;
  const val = (dateStr.length >= 10 ? dateStr.slice(0,10) : dateStr);
  if (startDate && val < startDate) return false;
  if (endDate && val > endDate) return false;
  return true;
};

const statusBadgeClass = (st: 'pendiente'|'parcial'|'completada' | string): string => {
  switch (st) {
    case 'pendiente': return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200';
    case 'parcial': return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200';
    case 'completada': return 'bg-green-50 text-green-700 ring-1 ring-green-200';
    default: return 'bg-gray-50 text-gray-600 ring-1 ring-gray-200';
  }
};

// Zonas temporales (selector y asignación)
type ZoneOption = { id: string; code: string; name?: string | null; zone_type?: string | null };
const [zones, setZones] = useState<ZoneOption[]>([]);
const [zonesLoading, setZonesLoading] = useState<boolean>(false);
const [zonesError, setZonesError] = useState<string | null>(null);
const [selectedZoneId, setSelectedZoneId] = useState<string>('');
const [poZoneAssignment, setPoZoneAssignment] = useState<{ zone_id: string | null; zone_code: string | null; purchased_quantity_total?: number } | null>(null);
const [savingZone, setSavingZone] = useState<boolean>(false);
const [saveZoneError, setSaveZoneError] = useState<string | null>(null);

const location = useLocation();
const navigate = useNavigate();

const notificationsSupported = typeof Notification !== 'undefined';
const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
  try {
    return sessionStorage.getItem('reception.notifications') === 'on';
  } catch {
    return false;
  }
});

function handleToggleNotifications() {
  if (!notificationsSupported) return;
  if (Notification.permission === 'granted') {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    try { sessionStorage.setItem('reception.notifications', next ? 'on' : 'off'); } catch {}
  } else {
    Notification.requestPermission().then(p => {
      const next = p === 'granted';
      setNotificationsEnabled(next);
      try { sessionStorage.setItem('reception.notifications', next ? 'on' : 'off'); } catch {}
    });
  }
}

useEffect(() => {
  const params = new URLSearchParams(location.search);
  const modeQ = params.get('mode');
  if (modeQ === 'appointment' || modeQ === 'order') {
    setMode(modeQ);
  }
  const q = params.get('q');
  if (q !== null) setQuery(q);
  const status = params.get('status');
  if (status) setStatusFilter(status as any);
  const from = params.get('from');
  if (from) setStartDate(from);
  const to = params.get('to');
  if (to) setEndDate(to);
}, []);

useEffect(() => {
  const params = new URLSearchParams(location.search);
  params.set('mode', mode);
  if (query) params.set('q', query); else params.delete('q');
  if (statusFilter && statusFilter !== 'todos') params.set('status', statusFilter); else params.delete('status');
  if (startDate) params.set('from', startDate); else params.delete('from');
  if (endDate) params.set('to', endDate); else params.delete('to');
  navigate({ search: params.toString() }, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [mode, query, statusFilter, startDate, endDate]);

  const pendingForItem = (it: BackendPurchaseOrderItem) => {
    const pending = Math.max(0, (it.quantity || 0) - (it.received_quantity || 0));
    return pending;
  };

  const totals = useMemo(() => {
    if (!orderDetail) return { totalPendiente: 0, totalRecibir: 0, totalFaltante: 0 };
    let p = 0, r = 0, f = 0;
    for (const it of orderDetail.items || []) {
      const pend = pendingForItem(it);
      const rec = Number(receivingMap[String(it.id)] || 0);
      p += pend;
      r += rec;
      f += Math.max(0, pend - rec);
    }
    return { totalPendiente: p, totalRecibir: r, totalFaltante: f };
  }, [orderDetail, receivingMap]);

  const fetchOrderDetail = async (orderId: string | number): Promise<BackendPurchaseOrderDetail | null> => {
    if (!AUTH_BACKEND_URL) return null;
    try {
      const token = localStorage.getItem('app_token');
      const resp = await fetch(`${AUTH_BACKEND_URL}/purchase_orders/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error(await resp.text());
      const json = await resp.json();
      const po = (json.purchase_order || json) as any;
      // Normalizar estructura de items: flatten products.sku/name -> sku/product_name
      const cleanedItems: BackendPurchaseOrderItem[] = (po.items || []).map((it: any) => ({
        id: it.id,
        sku: it.sku ?? it.products?.sku ?? it.product?.sku ?? '',
        product_name: it.product_name ?? it.products?.name ?? it.product?.name ?? '',
        quantity: Number(it.quantity || 0),
        received_quantity: Number(it.received_quantity || 0),
      }));
      const detail: BackendPurchaseOrderDetail = {
        id: po.id,
        po_number: po.po_number,
        warehouse_id: po.warehouse_id ?? null,
        items: cleanedItems,
        receiving_location: null,
      };
      return detail;
    } catch (e) {
      console.error('Error cargando orden:', e);
      return null;
    }
  };

  const ensureDefaultReceivingLocation = async (warehouseId: string | number | null) => {
    if (!AUTH_BACKEND_URL || warehouseId == null) return null;
    try {
      const token = localStorage.getItem('app_token');
      // 1) Buscar cualquier ubicación activa de tipo 'receiving' en el almacén, sin depender de zone
      const respAll = await fetch(`${AUTH_BACKEND_URL}/locations?warehouse_id=${warehouseId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!respAll.ok) throw new Error(await respAll.text());
      const jAll = await respAll.json();
      let loc = (jAll.locations || []).find((l: any) => String(l.location_type || '').toLowerCase() === 'receiving' && l.is_active) || null;

      // 2) Fallback: por código 'RECV' activo
      if (!loc) {
        loc = (jAll.locations || []).find((l: any) => String(l.code || '').toUpperCase() === 'RECV' && l.is_active) || null;
      }

      // 3) Fallback: crear la ubicación por defecto
      if (!loc) {
        const create = await fetch(`${AUTH_BACKEND_URL}/locations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ warehouse_id: warehouseId, code: 'RECV', name: 'Recepción', location_type: 'receiving', is_active: true }),
        });
        if (create.ok) {
          const cj = await create.json();
          loc = cj.location || cj;
        } else if (create.status === 409) {
          // Si existe duplicado, volver a listar y tomar la existente
          const respAgain = await fetch(`${AUTH_BACKEND_URL}/locations?warehouse_id=${warehouseId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (respAgain.ok) {
            const jAgain = await respAgain.json();
            loc = (jAgain.locations || []).find((l: any) => String(l.code || '').toUpperCase() === 'RECV' && l.is_active) || null;
          }
        }
      }

      return loc || null;
    } catch (e) {
      console.warn('No se pudo asegurar ubicación de recepción:', e);
      return null;
    }
  };

  const openReceiving = async (orderId: string | number) => {
    setSubmitError(null);
    setSubmitting(false);
    const detail = await fetchOrderDetail(orderId);
    if (!detail) return;
    const loc = await ensureDefaultReceivingLocation(detail.warehouse_id || null);
    const map: Record<string, number> = {};
    for (const it of detail.items || []) {
      const pending = pendingForItem(it);
      map[String(it.id)] = pending;
    }
    setOrderDetail({ ...detail, receiving_location: loc });
    setExpandedOrderId(orderId);
    setReceivingMap(map);

    // Cargar zonas y asignación existente al abrir la orden
    try {
      await loadZonesForWarehouse(detail.warehouse_id || null);
      await loadExistingPoZoneAssignment(String(detail.id));
    } catch (e) {
      // Silencioso: la UI mostrará errores específicos
    }
  };

  const submitReceiving = async () => {
    if (!AUTH_BACKEND_URL || !orderDetail) return;
    try {
      setSubmitting(true);
      setSubmitError(null);
      const token = localStorage.getItem('app_token');
      const payloadItems = Object.entries(receivingMap)
        .map(([item_id, qty]) => ({
          item_id,
          quantity: Number(qty) || 0,
          location_id: orderDetail?.receiving_location?.id || null,
        }))
        .filter(x => x.quantity > 0);
      if (payloadItems.length === 0) {
        setSubmitError('No hay cantidades válidas para recibir');
        setSubmitting(false);
        return;
      }
      const resp = await fetch(`${AUTH_BACKEND_URL}/purchase_orders/${orderDetail.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ items: payloadItems }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || 'Error recibiendo ítems');
      }
      const j = await resp.json();
      if ((j as any).status === 'partial') {
        // Intentar backorder automático
        await fetch(`${AUTH_BACKEND_URL}/purchase_orders/${orderDetail.id}/backorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ notes: `Backorder generado automáticamente desde recepción` }),
        }).catch(() => {});
      }
      // Reset y listo
      setOrderDetail(null);
      setReceivingMap({});
      setAppointmentResult(null);
      // Notificaciones: evento y push
      try {
        if (notificationsEnabled && typeof window !== 'undefined') {
          const ev = new CustomEvent('erp:notify', {
            detail: {
              type: 'reception',
              count: 1,
              processed: true,
              connectorId: 'reception-control'
            },
          });
          window.dispatchEvent(ev);
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Recepción guardada', {
              body: 'Se registró la recepción correctamente.',
            });
          }
        }
      } catch {}

    } catch (e: any) {
      setSubmitError(e?.message || 'Error enviando recepción');
    } finally {
      setSubmitting(false);
    }
  };

  // Cargar zonas activas por almacén desde Supabase
  const loadZonesForWarehouse = async (warehouseId: string | number | null) => {
    setZonesError(null);
    setZonesLoading(true);
    setZones([]);
    try {
      // Consulta principal: si hay warehouseId, filtrar; si no, traer todas activas
      let query = supabase
        .from('zones')
        .select('id, code, name, zone_type, warehouse_id')
        .eq('is_active', true)
        .order('code', { ascending: true });
      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }
      const { data, error } = await query;
      if (error) throw error;
      let rows = Array.isArray(data) ? data : [];

      // Fallback: si se filtró por almacén y no hay resultados, intentar sin filtro de almacén
      if (warehouseId && rows.length === 0) {
        const { data: allData, error: allErr } = await supabase
          .from('zones')
          .select('id, code, name, zone_type, warehouse_id')
          .eq('is_active', true)
          .order('code', { ascending: true });
        if (!allErr && Array.isArray(allData)) {
          rows = allData;
        }
      }

      setZones(rows.map((z: any) => ({ id: String(z.id), code: String(z.code || ''), name: z.name ?? null, zone_type: z.zone_type ?? null })));
    } catch (e: any) {
      setZonesError(e?.message || 'Error cargando zonas');
    } finally {
      setZonesLoading(false);
    }
  };

  // Consultar asignación existente de zona temporal para la orden
  const loadExistingPoZoneAssignment = async (purchaseOrderId: string) => {
    setPoZoneAssignment(null);
    try {
      const { data, error } = await supabase
        .from('po_temp_zones')
        .select('id, zone_id, zone_code, purchased_quantity_total, assigned_at')
        .eq('purchase_order_id', purchaseOrderId)
        .order('assigned_at', { ascending: false })
        .limit(1);
      if (error) {
        const msg = String((error as any)?.message || '');
        // Fallback: si la columna no existe en el esquema, reintentar sin ella
        if (msg.includes('purchased_quantity_total') || msg.includes('schema cache')) {
          const { data: data2, error: error2 } = await supabase
            .from('po_temp_zones')
            .select('id, zone_id, zone_code, assigned_at')
            .eq('purchase_order_id', purchaseOrderId)
            .order('assigned_at', { ascending: false })
            .limit(1);
          if (error2) throw error2;
          const row2 = Array.isArray(data2) && data2.length > 0 ? data2[0] : null;
          if (row2) {
            setPoZoneAssignment({ 
              zone_id: row2.zone_id ? String(row2.zone_id) : null, 
              zone_code: row2.zone_code ? String(row2.zone_code) : null,
            });
            setSelectedZoneId(row2.zone_id ? String(row2.zone_id) : '');
          } else {
            setSelectedZoneId('');
          }
          return;
        }
        throw error;
      }
      const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
      if (row) {
        setPoZoneAssignment({ 
          zone_id: row.zone_id ? String(row.zone_id) : null, 
          zone_code: row.zone_code ? String(row.zone_code) : null,
          purchased_quantity_total: typeof row.purchased_quantity_total === 'number' ? row.purchased_quantity_total : undefined
        });
        setSelectedZoneId(row.zone_id ? String(row.zone_id) : '');
      } else {
        setSelectedZoneId('');
      }
    } catch (e) {
      // Si la tabla no existe, ignorar y mostrar UI sin asignación
    }
  };

  // Guardar asignación de zona temporal
  const saveTempZoneAssignment = async () => {
    if (!orderDetail || !selectedZoneId) {
      setSaveZoneError('Selecciona una zona');
      return;
    }
    setSavingZone(true);
    setSaveZoneError(null);
    try {
      const selectedZone = zones.find(z => z.id === selectedZoneId);
      const purchasedTotal = (orderDetail.items || []).reduce((acc, it: any) => acc + Number(it.quantity || 0), 0);
      const payload: any = {
        purchase_order_id: String(orderDetail.id),
        zone_id: selectedZoneId,
        zone_code: selectedZone?.code || null,
        purchased_quantity_total: purchasedTotal,
        assigned_at: new Date().toISOString(),
      };
      // Si existe profiles y usuario con id, lo guardamos
      try {
        const rawAuth = localStorage.getItem('app_profile_id');
        if (rawAuth) payload.assigned_by = rawAuth;
      } catch {}

      // Intentar upsert por purchase_order_id (requiere constraint único)
      const { error } = await supabase
        .from('po_temp_zones')
        .upsert(payload, { onConflict: 'purchase_order_id' });
      if (error) {
        const msg = String((error as any)?.message || '');
        // Si falla por columna inexistente en el esquema, reintentar sin purchased_quantity_total
        const payloadClean: any = { ...payload };
        delete payloadClean.purchased_quantity_total;
        if (msg.includes('purchased_quantity_total') || msg.includes('schema cache')) {
          const { error: up2err } = await supabase
            .from('po_temp_zones')
            .upsert(payloadClean, { onConflict: 'purchase_order_id' });
          if (up2err) {
            const { error: ins2err } = await supabase
              .from('po_temp_zones')
              .insert(payloadClean);
            if (ins2err) throw ins2err;
          }
        } else {
          // Fallback: si no existe el constraint único, insertar (permitiendo historial)
          const { error: insErr } = await supabase
            .from('po_temp_zones')
            .insert(payload);
          if (insErr) throw insErr;
        }
      }

      setPoZoneAssignment({ zone_id: selectedZoneId, zone_code: selectedZone?.code || null, purchased_quantity_total: purchasedTotal });
    } catch (e: any) {
      setSaveZoneError(e?.message || 'Error guardando zona temporal');
    } finally {
      setSavingZone(false);
    }
  };

  useEffect(() => {
    // Al cambiar modo, limpiar resultados y cargar listas
    setAppointmentResult(null);
    setOrderDetail(null);
    setReceivingMap({});
    setError(null);
    const loadLists = async () => {
      try {
        const token = localStorage.getItem('app_token');
        if (mode === 'appointment') {
          const resp = await fetch(`${AUTH_BACKEND_URL}/reception/appointments`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (resp.status === 204) {
            setAppointmentsList([]);
          } else if (resp.ok) {
            const j = await resp.json();
            setAppointmentsList(j.appointments || []);
          }
        } else {
          const resp = await fetch(`${AUTH_BACKEND_URL}/purchase_orders`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (resp.ok) {
            const j = await resp.json();
            setOrdersList(j.purchase_orders || []);
          }
        }
      } catch {}
    };
    loadLists();
  }, [mode]);

  // Búsqueda manual desde el botón "Buscar"
  const search = async () => {
    setError(null);
    setAppointmentResult(null);
    setOrderDetail(null);
    setReceivingMap({});
    if (!AUTH_BACKEND_URL) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('app_token');
      if (mode === 'appointment') {
        const resp = await fetch(`${AUTH_BACKEND_URL}/reception/appointments`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        let list: BackendAppointment[] = [];
        if (resp.status === 204) {
          setAppointmentsList([]);
        } else if (resp.ok) {
          const j = await resp.json();
          list = j.appointments || [];
          setAppointmentsList(list);
        } else {
          throw new Error(await resp.text());
        }
        const qx = query.trim().toLowerCase();
        const ap = list.find(a => String(a.appointment_number).toLowerCase() === qx) || null;
        setAppointmentResult(ap);
        if (!ap) setError('No se encontró la cita exacta. Revisa coincidencias abajo.');
      } else {
        const resp = await fetch(`${AUTH_BACKEND_URL}/purchase_orders`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!resp.ok) throw new Error(await resp.text());
        const j = await resp.json();
        const list: any[] = j.purchase_orders || [];
        setOrdersList(list);
        const qx = query.trim().toLowerCase();
        const po = list.find(o => String(o.po_number).toLowerCase() === qx);
        if (!po) {
          setError('No se encontró la orden exacta. Revisa coincidencias abajo.');
        } else {
          await openReceiving(po.id);
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Error en búsqueda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Control de la Recepción</h2>
        <p className="text-gray-600">Buscar por número de cita o por orden de compra, contabilizar recibidos y faltantes, y guardar recepción.</p>
      </div>

      {/* Selector de modo y búsqueda */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center gap-4">
          <button
            className={`px-3 py-2 rounded border ${mode === 'appointment' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700'}`}
            onClick={() => setMode('appointment')}
          >
            Por número de cita
          </button>
          <button
            className={`px-3 py-2 rounded border ${mode === 'order' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700'}`}
            onClick={() => setMode('order')}
          >
            Por orden de compra
          </button>
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mode === 'appointment' ? 'Número de cita (ej. CITA-001)' : 'Número de orden de compra (ej. PO-123)'}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={search}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            disabled={loading}
          >
            Buscar
          </button>
        </div>
        {/* Filtros por estado y fecha */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="todos">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="parcial">Recibida parcial</option>
              <option value="completada">Completada</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Desde</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Hasta</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
  {notificationsSupported && (
    <button
      type="button"
      onClick={handleToggleNotifications}
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm ${notificationsEnabled ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'}`}
      title={notificationsEnabled ? 'Notificaciones activadas' : 'Activar notificaciones'}
    >
      <Bell className="h-4 w-4" />
      {notificationsEnabled ? 'Notificaciones: ON' : 'Notificaciones: OFF'}
    </button>
  )}
</div>
{error && <div className="text-sm text-red-600">{error}</div>}
      </div>

      {/* Listado de coincidencias cuando no hay selección exacta */}
      {mode === 'appointment' && !appointmentResult && (
        <div className="bg-white rounded-lg shadow p-6 space-y-2">
          <div className="text-sm font-medium text-gray-700">Coincidencias de citas</div>
          {appointmentsList
            .filter(a => !query.trim() || String(a.appointment_number).toLowerCase().includes(query.trim().toLowerCase()))
            .filter(a => statusFilter === 'todos' || deriveAppointmentStatus(a) === statusFilter)
            .filter(a => inDateRange(a.scheduled_at))
            .map(a => {
              const st = deriveAppointmentStatus(a);
              return (
                <div key={a.id} className="border rounded">
                  <div className="flex items-center justify-between p-2">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <span>{a.appointment_number}</span>
                      <span className={`text-xs px-2 py-1 rounded ${statusBadgeClass(st)}`}>
                        {st === 'parcial' ? 'Recibida parcial' : st === 'completada' ? 'Completada' : 'Pendiente'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">Programada: {new Date(a.scheduled_at).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(a.orders || []).length > 0 ? (
                      hasPermissionId('reception.manage') && (
                        <button
                          className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100"
                          onClick={() => {
                            const first = (a.orders || [])[0];
                            if (first) openReceiving(first.id);
                          }}
                        >
                          Ver y recibir
                        </button>
                      )
                    ) : (
                      <span className="text-xs text-gray-500">Sin órdenes vinculadas</span>
                    )}
                  </div>
                  </div>
                  {orderDetail && expandedOrderId === ((a.orders || [])[0]?.id) && orderDetail.id === ((a.orders || [])[0]?.id) && (
                    <div className="border-t bg-white p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-700">Orden: {orderDetail.po_number}</div>
                          <div className="text-sm text-gray-700">Ubicación de recepción: {orderDetail?.receiving_location?.code || '—'}</div>
                        </div>
                        <button className="p-2 rounded hover:bg-gray-100" onClick={() => { setOrderDetail(null); setReceivingMap({}); setExpandedOrderId(null); }}>
                          <X className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                      {normalizeOrderStatus(((a.orders || [])[0]?.status) || '') === 'completada' && (
                        <div className="border rounded p-3 bg-gray-50">
                          <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                            <MapPin className="w-4 h-4 text-gray-600" />
                            <span>Zona temporal:</span>
                            {poZoneAssignment?.zone_code ? (
                              <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700">Asignada: {poZoneAssignment.zone_code}</span>
                            ) : (
                              <span className="text-xs text-gray-500">Sin asignación</span>
                            )}
                            <span className="text-xs text-gray-600">Comprados: {(poZoneAssignment?.purchased_quantity_total ?? (orderDetail.items || []).reduce((a, it: any) => a + Number(it.quantity || 0), 0))}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                              value={selectedZoneId}
                              onChange={(e) => setSelectedZoneId(e.target.value)}
                            >
                              <option value="">Seleccione zona</option>
                              {zones.map((z) => (
                                <option key={z.id} value={z.id}>{z.code} • {z.name || z.zone_type || ''}</option>
                              ))}
                            </select>
                            <button
                              className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm disabled:opacity-50"
                              onClick={saveTempZoneAssignment}
                              disabled={savingZone || !selectedZoneId}
                            >
                              Asignar zona temporal
                            </button>
                          </div>
                          {zonesLoading && <div className="text-xs text-gray-500 mt-1">Cargando zonas...</div>}
                          {zonesError && <div className="text-xs text-red-600 mt-1">{zonesError}</div>}
                          {saveZoneError && <div className="text-xs text-red-600 mt-1">{saveZoneError}</div>}
                        </div>
                      )}
                      <div className="max-h-64 overflow-y-auto border rounded">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left">SKU</th>
                              <th className="px-3 py-2 text-left">Producto</th>
                              <th className="px-3 py-2 text-left">Comprados</th>
                              <th className="px-3 py-2 text-left">Pendiente</th>
                              <th className="px-3 py-2 text-left">Recibir</th>
                              <th className="px-3 py-2 text-left">Faltante</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(orderDetail.items || []).map((it) => {
                              const pend = pendingForItem(it);
                              const rec = Number(receivingMap[String(it.id)] || 0);
                              const missing = Math.max(0, pend - rec);
                              const isCompleted = normalizeOrderStatus(((a.orders || [])[0]?.status) || '') === 'completada';
                              return (
                                <tr key={String(it.id)} className="border-t">
                                  <td className="px-3 py-2">{it.sku || '—'}</td>
                                  <td className="px-3 py-2">{it.product_name || '—'}</td>
                                  <td className="px-3 py-2">{Number(it.quantity || 0)}</td>
                                  <td className="px-3 py-2">{pend}</td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="number"
                                      min={0}
                                      max={pend}
                                      value={rec}
                                      onChange={(e) => {
                                        const val = Number(e.target.value) || 0;
                                        setReceivingMap((m) => ({ ...m, [String(it.id)]: Math.max(0, Math.min(pend, val)) }));
                                      }}
                                      className="w-24 px-2 py-1 border border-gray-300 rounded"
                                      disabled={isCompleted}
                                    />
                                    <div className="text-xs text-gray-500 mt-1">Recibidos: {Number(it.received_quantity || 0)}</div>
                                  </td>
                                  <td className="px-3 py-2">{missing}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-700">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" /> Pendiente: {totals.totalPendiente}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-700 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" /> Recibir: {totals.totalRecibir}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded bg-yellow-100 text-yellow-700 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" /> Faltante: {totals.totalFaltante}
                        </span>
                      </div>
                      {submitError && <div className="text-sm text-red-600">{submitError}</div>}
                      {hasPermissionId('reception.manage') && normalizeOrderStatus(((a.orders || [])[0]?.status) || '') !== 'completada' && (
                        <div className="flex justify-end">
                          <button
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            onClick={submitReceiving}
                            disabled={submitting}
                          >
                            Guardar recepción
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          {appointmentsList.length === 0 && (
            <div className="text-sm text-gray-500">No hay citas disponibles.</div>
          )}
        </div>
      )}

      {mode === 'order' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-2">
          <div className="text-sm font-medium text-gray-700">Coincidencias de órdenes</div>
          {ordersList
            .filter(o => !query.trim() || String(o.po_number).toLowerCase().includes(query.trim().toLowerCase()))
            .filter(o => {
              const st = normalizeOrderStatus(o.status);
              return statusFilter === 'todos' || st === statusFilter;
            })
            .filter(o => inDateRange(o.expected_date || o.created_at))
            .map(o => {
              const st = normalizeOrderStatus(o.status);
              return (
                <div key={String(o.id)} className="border rounded">
                  <div className="flex items-center justify-between p-2">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <span>{o.po_number}</span>
                        <span className={`text-xs px-2 py-1 rounded ${statusBadgeClass(st)}`}>
                          {st === 'parcial' ? 'Recibida parcial' : st === 'completada' ? 'Completada' : 'Pendiente'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">Orden de compra{(o.expected_date || o.created_at) ? ` • ${new Date(o.expected_date || o.created_at).toLocaleDateString()}` : ''}</div>
                    </div>
                    {hasPermissionId('reception.manage') && (
                      <button
                        className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100"
                        onClick={() => openReceiving(o.id)}
                      >
                        Ver y recibir
                      </button>
                    )}
                  </div>
                  {orderDetail && expandedOrderId === o.id && orderDetail.id === o.id && (
                    <div className="border-t bg-white p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-700">Orden: {orderDetail.po_number}</div>
                          <div className="text-sm text-gray-700">Ubicación de recepción: {orderDetail?.receiving_location?.code || '—'}</div>
                        </div>
                        <button className="p-2 rounded hover:bg-gray-100" onClick={() => { setOrderDetail(null); setReceivingMap({}); setExpandedOrderId(null); }}>
                          <X className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                      {normalizeOrderStatus(o.status) === 'completada' && (
                        <div className="border rounded p-3 bg-gray-50">
                          <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                            <MapPin className="w-4 h-4 text-gray-600" />
                            <span>Zona temporal:</span>
                            {poZoneAssignment?.zone_code ? (
                              <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700">Asignada: {poZoneAssignment.zone_code}</span>
                            ) : (
                              <span className="text-xs text-gray-500">Sin asignación</span>
                            )}
                            <span className="text-xs text-gray-600">Comprados: {(poZoneAssignment?.purchased_quantity_total ?? (orderDetail.items || []).reduce((a, it: any) => a + Number(it.quantity || 0), 0))}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                              value={selectedZoneId}
                              onChange={(e) => setSelectedZoneId(e.target.value)}
                            >
                              <option value="">Seleccione zona</option>
                              {zones.map((z) => (
                                <option key={z.id} value={z.id}>{z.code} • {z.name || z.zone_type || ''}</option>
                              ))}
                            </select>
                            <button
                              className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm disabled:opacity-50"
                              onClick={saveTempZoneAssignment}
                              disabled={savingZone || !selectedZoneId}
                            >
                              Asignar zona temporal
                            </button>
                          </div>
                          {zonesLoading && <div className="text-xs text-gray-500 mt-1">Cargando zonas...</div>}
                          {zonesError && <div className="text-xs text-red-600 mt-1">{zonesError}</div>}
                          {saveZoneError && <div className="text-xs text-red-600 mt-1">{saveZoneError}</div>}
                        </div>
                      )}
                      <div className="max-h-64 overflow-y-auto border rounded">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left">SKU</th>
                              <th className="px-3 py-2 text-left">Producto</th>
                              <th className="px-3 py-2 text-left">Comprados</th>
                              <th className="px-3 py-2 text-left">Pendiente</th>
                              <th className="px-3 py-2 text-left">Recibir</th>
                              <th className="px-3 py-2 text-left">Faltante</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(orderDetail.items || []).map((it) => {
                              const pend = pendingForItem(it);
                              const rec = Number(receivingMap[String(it.id)] || 0);
                              const missing = Math.max(0, pend - rec);
                              const isCompleted = normalizeOrderStatus(o.status) === 'completada';
                              return (
                                <tr key={String(it.id)} className="border-t">
                                  <td className="px-3 py-2">{it.sku || '—'}</td>
                                  <td className="px-3 py-2">{it.product_name || '—'}</td>
                                  <td className="px-3 py-2">{Number(it.quantity || 0)}</td>
                                  <td className="px-3 py-2">{pend}</td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="number"
                                      min={0}
                                      max={pend}
                                      value={rec}
                                      onChange={(e) => {
                                        const val = Number(e.target.value) || 0;
                                        setReceivingMap((m) => ({ ...m, [String(it.id)]: Math.max(0, Math.min(pend, val)) }));
                                      }}
                                      className="w-24 px-2 py-1 border border-gray-300 rounded"
                                      disabled={isCompleted}
                                    />
                                    <div className="text-xs text-gray-500 mt-1">Recibidos: {Number(it.received_quantity || 0)}</div>
                                  </td>
                                  <td className="px-3 py-2">{missing}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-700">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" /> Pendiente: {totals.totalPendiente}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-700 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" /> Recibir: {totals.totalRecibir}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded bg-yellow-100 text-yellow-700 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" /> Faltante: {totals.totalFaltante}
                        </span>
                      </div>
                      {submitError && <div className="text-sm text-red-600">{submitError}</div>}
                      {hasPermissionId('reception.manage') && normalizeOrderStatus(o.status) !== 'completada' && (
                        <div className="flex justify-end">
                          <button
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            onClick={submitReceiving}
                            disabled={submitting}
                          >
                            Guardar recepción
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          {ordersList.length === 0 && (
            <div className="text-sm text-gray-500">No hay órdenes disponibles.</div>
          )}
        </div>
      )}

      {/* Panel de detalle inline bajo la fila seleccionada en citas */}
      {mode === 'appointment' && !appointmentResult && (
        <></>
      )}
    </div>
  );
};