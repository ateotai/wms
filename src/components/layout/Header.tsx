import React from 'react';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User, Menu, Bell, Package, FileText, Calendar, Truck, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifPO, setNotifPO] = React.useState<number>(0);
  const [notifProducts, setNotifProducts] = React.useState<number>(0);
  const [notifReception, setNotifReception] = React.useState<number>(0);

  const [showNotifDropdown, setShowNotifDropdown] = React.useState<boolean>(false);
  const [loadingNotifDropdown, setLoadingNotifDropdown] = React.useState<boolean>(false);
  const [notifData, setNotifData] = React.useState<{ products: any[]; purchase_orders: any[]; appointments: any[]; reception: any[] }>({ products: [], purchase_orders: [], appointments: [], reception: [] });
  const bellRef = React.useRef<HTMLDivElement | null>(null);

  // Backend URL y headers de auth (si hay token)
  const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
  const appToken = React.useMemo(() => {
    try { return localStorage.getItem('app_token') || ''; } catch { return ''; }
  }, []);
  const authHeaders = React.useMemo(() => (appToken ? { Authorization: `Bearer ${appToken}` } : {}), [appToken]);

  // Estado de últimos vistos por categoría (persistido en sessionStorage)
  const [lastSeen, setLastSeen] = React.useState<{ products: number; po: number; appointments: number; reception: number }>(() => {
    const readTS = (key: string) => {
      const v = sessionStorage.getItem(key);
      const n = v ? Number(v) : 0;
      return Number.isFinite(n) ? n : 0;
    };
    return {
      products: readTS('notify_products_seen_ts'),
      po: readTS('notify_po_seen_ts'),
      appointments: readTS('notify_appointments_seen_ts'),
      reception: readTS('notify_reception_seen_ts'),
    };
  });

  // IDs leídos por ítem (persistido en localStorage)
  const [readIds, setReadIds] = React.useState<{ products: string[]; po: string[]; appointments: string[]; reception: string[] }>(() => {
    const readList = (key: string) => {
      try {
        const raw = localStorage.getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr.filter((x: any) => typeof x === 'string').map((x: any) => String(x)) : [];
      } catch { return []; }
    };
    return {
      products: readList('notify_products_read_ids'),
      po: readList('notify_po_read_ids'),
      appointments: readList('notify_appointments_read_ids'),
      reception: readList('notify_reception_read_ids'),
    };
  });

  const showOnlyUnread = true;

  const unreadMemo = React.useMemo(() => {
     const ids = {
       products: new Set(readIds.products),
       po: new Set(readIds.po),
       appointments: new Set(readIds.appointments),
       reception: new Set(readIds.reception),
     };
     const isRead = {
       products: (p: any) => ids.products.has(String(p.id)) || (lastSeen.products > 0 && new Date(p.created_at).getTime() <= lastSeen.products),
       po: (o: any) => ids.po.has(String(o.id)) || (lastSeen.po > 0 && new Date(o.updated_at || o.order_date).getTime() <= lastSeen.po),
       appointments: (a: any) => ids.appointments.has(String(a.id)) || (lastSeen.appointments > 0 && new Date(a.updated_at || a.scheduled_at).getTime() <= lastSeen.appointments),
       reception: (r: any) => ids.reception.has(String(r.id)) || (lastSeen.reception > 0 && new Date(r.created_at).getTime() <= lastSeen.reception),
     };
     const filterUnread = {
       products: (arr: any[]) => arr.filter((p) => !isRead.products(p)),
       purchase_orders: (arr: any[]) => arr.filter((o) => !isRead.po(o)),
       appointments: (arr: any[]) => arr.filter((a) => !isRead.appointments(a)),
       reception: (arr: any[]) => arr.filter((r) => !isRead.reception(r)),
     };
     const unreadCounts = {
       products: filterUnread.products(notifData.products).length,
       purchase_orders: filterUnread.purchase_orders(notifData.purchase_orders).length,
       appointments: filterUnread.appointments(notifData.appointments).length,
       reception: filterUnread.reception(notifData.reception).length,
     };
     const productsList = showOnlyUnread ? filterUnread.products(notifData.products) : notifData.products;
     const poList = showOnlyUnread ? filterUnread.purchase_orders(notifData.purchase_orders) : notifData.purchase_orders;
     const appointmentsList = showOnlyUnread ? filterUnread.appointments(notifData.appointments) : notifData.appointments;
     const receptionList = showOnlyUnread ? filterUnread.reception(notifData.reception) : notifData.reception;
     return { unreadCounts, productsList, poList, appointmentsList, receptionList };
   }, [notifData, readIds, lastSeen]);

  const { unreadCounts, productsList, poList, appointmentsList, receptionList } = unreadMemo;

  const formatRelativeTime = (dateLike: any) => {
    try {
      const ts = dateLike ? new Date(dateLike).getTime() : Date.now();
      const diff = Date.now() - ts;
      const m = Math.floor(diff / 60000);
      if (m < 1) return 'ahora';
      if (m < 60) return `hace ${m} min`;
      const h = Math.floor(m / 60);
      if (h < 24) return `hace ${h} h`;
      const d = Math.floor(h / 24);
      return `hace ${d} d`;
    } catch { return ''; }
  };

  const loadNotifications = async () => {
    try {
      setLoadingNotifDropdown(true);
      // Primero intentamos backend si está configurado y tenemos token (para endpoints protegidos)
      if (AUTH_BACKEND_URL) {
        try {
          const [prodJson, poJson, apptJson, recvJson] = await Promise.all([
            fetch(`${AUTH_BACKEND_URL}/products/list?limit=8`, { headers: authHeaders }).then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))),
            fetch(`${AUTH_BACKEND_URL}/purchase_orders`, { headers: authHeaders }).then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))),
            fetch(`${AUTH_BACKEND_URL}/reception/appointments`, { headers: authHeaders }).then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))),
            fetch(`${AUTH_BACKEND_URL}/inventory/movements?type=IN&period=30days&transaction_type=RECEIPT&limit=8`, { headers: authHeaders }).then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))),
          ]);
          let products = Array.isArray(prodJson?.products) ? prodJson.products : [];
          let purchase_orders = Array.isArray(poJson?.purchase_orders) ? poJson.purchase_orders : [];
          let appointments = Array.isArray(apptJson?.appointments) ? apptJson.appointments : [];
          let reception = Array.isArray(recvJson?.movements) ? recvJson.movements : [];

          // Ordenar por recencia como hacía Supabase
          products = products
            .slice()
            .sort((a: any, b: any) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime())
            .slice(0, 8);
          purchase_orders = purchase_orders
            .slice()
            .sort((a: any, b: any) => new Date(b?.updated_at || b?.order_date || 0).getTime() - new Date(a?.updated_at || a?.order_date || 0).getTime())
            .slice(0, 8);
          appointments = appointments
            .slice()
            .sort((a: any, b: any) => new Date(b?.updated_at || b?.scheduled_at || 0).getTime() - new Date(a?.updated_at || a?.scheduled_at || 0).getTime())
            .slice(0, 8);
          reception = reception.slice(0, 8);

          setNotifData({ products, purchase_orders, appointments, reception });
          return; // listo con backend
        } catch (backendErr) {
          console.warn('Backend no disponible, usando Supabase como fallback:', backendErr);
        }
      }

      // Fallback: Supabase directo (omitir citas si la tabla no existe)
      const [prodRes, poRes, recvRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, sku, name, created_at, categories(name)')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('purchase_orders')
          .select('id, po_number, status, order_date, expected_date, updated_at')
          .order('updated_at', { ascending: false })
          .limit(8),
        supabase
          .from('inventory_movements')
          .select('id, created_at, transaction_type, movement_type, quantity, products:product_id(sku, name)')
          .eq('transaction_type', 'RECEIPT')
          .order('created_at', { ascending: false })
          .limit(8)
      ]);
      setNotifData({
        products: Array.isArray(prodRes.data) ? (prodRes.data as any[]) : [],
        purchase_orders: Array.isArray(poRes.data) ? (poRes.data as any[]) : [],
        appointments: [],
        reception: Array.isArray(recvRes.data) ? (recvRes.data as any[]) : [],
      });
    } catch (e) {
      console.warn('Error cargando notificaciones:', e);
    } finally {
      setLoadingNotifDropdown(false);
    }
  };

  // Estado y temporizador para toast de sincronización
  const [toast, setToast] = React.useState<{ title: string; message: string; type: 'success' | 'info' | 'error'; ts: number } | null>(null);
  const toastTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    function onNotify(e: Event) {
      const detail = (e as CustomEvent).detail || {};
      const type = (detail.type ?? detail.target) as 'products' | 'purchase_orders' | 'reception' | undefined;
      const count = Number(detail.count ?? detail.newCount ?? 0);
      const processed = Number(detail.processed ?? 0);
      const connectorId = (detail.connectorId ?? '') as string;
      if (type === 'purchase_orders') {
        setNotifPO((prev) => prev + count);
        try {
          sessionStorage.setItem('notify_po_last', JSON.stringify({ newCount: count, ts: Date.now() }));
        } catch {}
      } else if (type === 'products') {
        setNotifProducts((prev) => prev + count);
        try {
          sessionStorage.setItem('notify_products_last', JSON.stringify({ newCount: count, ts: Date.now() }));
        } catch {}
      } else if (type === 'reception') {
        setNotifReception((prev) => prev + count);
        try {
          sessionStorage.setItem('notify_reception_last', JSON.stringify({ newCount: count, ts: Date.now() }));
        } catch {}
      }
      // Toast resumen
      const label = type === 'purchase_orders' ? 'Órdenes' : type === 'products' ? 'Productos' : 'Recepción';
      const msg = `${label}: procesados ${processed}, nuevos ${count}${connectorId ? ` · Conector ${connectorId}` : ''}`;
      setToast({ title: 'Sincronización ERP', message: msg, type: 'success', ts: Date.now() });
      if (toastTimerRef.current) { clearTimeout(toastTimerRef.current); }
      toastTimerRef.current = window.setTimeout(() => setToast(null), 5000);
      // Refrescar lista si el menú está abierto
      loadNotifications().catch(() => {});
    }
    window.addEventListener('erp:notify', onNotify as EventListener);
    return () => {
      window.removeEventListener('erp:notify', onNotify as EventListener);
    };
  }, []);

  // Suscripción en tiempo real a inserciones en productos, órdenes y recepciones
  React.useEffect(() => {
    const productsChannel = supabase
      .channel('realtime:header_products')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'products' }, () => {
        const countIncrement = 1;
        setNotifProducts((prev) => prev + countIncrement);
        try {
          sessionStorage.setItem('notify_products_last', JSON.stringify({ newCount: countIncrement, ts: Date.now() }));
        } catch {}
        try { window.dispatchEvent(new Event('products:refresh')); } catch {}
        loadNotifications().catch(() => {});
      });

    const poChannel = supabase
      .channel('realtime:header_po')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'purchase_orders' }, () => {
        const countIncrement = 1;
        setNotifPO((prev) => prev + countIncrement);
        try {
          sessionStorage.setItem('notify_po_last', JSON.stringify({ newCount: countIncrement, ts: Date.now() }));
        } catch {}
        loadNotifications().catch(() => {});
      });

    const recvChannel = supabase
      .channel('realtime:header_reception')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inventory_movements' }, () => {
        // Incrementar recepción sólo si es probable que sea entrada
        setNotifReception((prev) => prev + 1);
        try {
          sessionStorage.setItem('notify_reception_last', JSON.stringify({ newCount: 1, ts: Date.now() }));
        } catch {}
        loadNotifications().catch(() => {});
      });

    productsChannel.subscribe();
    poChannel.subscribe();
    recvChannel.subscribe();

    return () => {
      try { productsChannel.unsubscribe(); } catch {}
      try { poChannel.unsubscribe(); } catch {}
      try { recvChannel.unsubscribe(); } catch {}
    };
  }, []);

  // Limpia el contador del tipo correspondiente al entrar al módulo
  React.useEffect(() => {
    const path = location.pathname;
    if (path === '/reception' || path.startsWith('/reception/orders')) {
      setNotifPO(0);
    }
    if (path.startsWith('/inventory/products')) {
      setNotifProducts(0);
    }
    if (path.startsWith('/reception/control')) {
      setNotifReception(0);
    }
    // Cerrar menú al navegar
    setShowNotifDropdown(false);
  }, [location.pathname]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!showNotifDropdown) return;
      const el = bellRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifDropdown]);

  const markCategorySeen = (key: 'products' | 'po' | 'appointments' | 'reception') => {
    const ts = Date.now();
    try {
      if (key === 'products') sessionStorage.setItem('notify_products_seen_ts', String(ts));
      else if (key === 'po') sessionStorage.setItem('notify_po_seen_ts', String(ts));
      else if (key === 'appointments') sessionStorage.setItem('notify_appointments_seen_ts', String(ts));
      else if (key === 'reception') sessionStorage.setItem('notify_reception_seen_ts', String(ts));
    } catch {}
    // Actualiza estado local para reflejar inmediatamente el cambio en UI
    try {
      setLastSeen((prev) => ({ ...prev, [key]: ts }));
    } catch {}
  };

  // Marcar ítem individual como leído y persistir en localStorage
  const markItemRead = (cat: 'products' | 'po' | 'appointments' | 'reception', id: string | number) => {
    const keyMap: Record<'products' | 'po' | 'appointments' | 'reception', string> = {
      products: 'notify_products_read_ids',
      po: 'notify_po_read_ids',
      appointments: 'notify_appointments_read_ids',
      reception: 'notify_reception_read_ids',
    };
    const idStr = String(id);
    setReadIds((prev) => {
      const arr = prev[cat] || [];
      const updatedArr = arr.includes(idStr) ? arr : [...arr, idStr];
      const next = { ...prev, [cat]: updatedArr };
      try { localStorage.setItem(keyMap[cat], JSON.stringify(updatedArr)); } catch {}
      return next;
    });
  };

  // Abrir ítem específico desde el dropdown, marcar leído y navegar
  const openProductItem = (item: any) => {
    const idStr = String(item?.id ?? item);
    markItemRead('products', idStr);
    setShowNotifDropdown(false);
    const sku = item?.sku ? String(item.sku) : null;
    if (sku) {
      navigate(`/inventory/products?openSku=${encodeURIComponent(sku)}`);
    } else {
      navigate(`/inventory/products?openId=${encodeURIComponent(idStr)}`);
    }
  };
  const openPOItem = (id: any) => { markItemRead('po', String(id)); setShowNotifDropdown(false); navigate('/reception/orders'); };
  const openAppointmentItem = (id: any) => { markItemRead('appointments', String(id)); setShowNotifDropdown(false); navigate('/reception/appointments'); };
  const openReceptionItem = (id: any) => { markItemRead('reception', String(id)); setShowNotifDropdown(false); navigate('/reception/control'); };

  // Marcar todo como leído a nivel de ítems
  const markAllAsRead = () => {
    setReadIds((prev) => {
      const nextProducts = Array.from(new Set([...(prev.products || []), ...notifData.products.map((p: any) => String(p.id))]));
      const nextPO = Array.from(new Set([...(prev.po || []), ...notifData.purchase_orders.map((o: any) => String(o.id))]));
      const nextAppointments = Array.from(new Set([...(prev.appointments || []), ...notifData.appointments.map((a: any) => String(a.id))]));
      const nextReception = Array.from(new Set([...(prev.reception || []), ...notifData.reception.map((r: any) => String(r.id))]));
      const next = { products: nextProducts, po: nextPO, appointments: nextAppointments, reception: nextReception };
      try {
        localStorage.setItem('notify_products_read_ids', JSON.stringify(nextProducts));
        localStorage.setItem('notify_po_read_ids', JSON.stringify(nextPO));
        localStorage.setItem('notify_appointments_read_ids', JSON.stringify(nextAppointments));
        localStorage.setItem('notify_reception_read_ids', JSON.stringify(nextReception));
      } catch {}
      return next;
    });
  };

  // Navegación por categoría (se mantiene para badges y "Ver todo")
  const goToPO = () => { markCategorySeen('po'); setShowNotifDropdown(false); navigate('/reception/orders'); };
  const goToProducts = () => { markCategorySeen('products'); setShowNotifDropdown(false); navigate('/inventory/products'); };
  const goToReceptionControl = () => { markCategorySeen('reception'); setShowNotifDropdown(false); navigate('/reception/control'); };
  const goToAppointments = () => { markCategorySeen('appointments'); setShowNotifDropdown(false); navigate('/reception/appointments'); };

  return (
    <React.Fragment>
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <button className="lg:hidden p-2 rounded-md hover:bg-gray-100">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              Sistema de Gestión
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div
              ref={bellRef}
              className="relative p-2 rounded-md hover:bg-gray-100"
              aria-label="Notificaciones"
              title={(unreadCounts.purchase_orders > 0 || unreadCounts.products > 0 || unreadCounts.reception > 0) ? `PO: ${unreadCounts.purchase_orders} · Prod: ${unreadCounts.products} · Rec: ${unreadCounts.reception}` : 'Sin notificaciones'}
            >
              <Bell
                className="w-5 h-5 text-gray-700 cursor-pointer"
                onClick={() => {
                  const next = !showNotifDropdown;
                  setShowNotifDropdown(next);
                  if (next) loadNotifications();
                }}
              />
              {(unreadCounts.purchase_orders > 0 || unreadCounts.products > 0 || unreadCounts.reception > 0) && (
                <div className="absolute -top-1 -right-1 flex flex-col items-end gap-[2px]">
                  {unreadCounts.purchase_orders > 0 && (
                    <button
                      onClick={goToPO}
                      className="inline-flex items-center justify-center text-[10px] font-semibold bg-blue-600 text-white rounded-full h-[18px] px-1 min-w-[28px] hover:bg-blue-700"
                      aria-label={`Ir a Órdenes de Compra (${unreadCounts.purchase_orders})`}
                      title={`Órdenes de Compra sin leer: ${unreadCounts.purchase_orders}`}
                    >
                      PO {unreadCounts.purchase_orders}
                    </button>
                  )}
                  {unreadCounts.products > 0 && (
                    <button
                      onClick={goToProducts}
                      className="inline-flex items-center justify-center text-[10px] font-semibold bg-green-600 text-white rounded-full h-[18px] px-1 min-w-[34px] hover:bg-green-700"
                      aria-label={`Ir a Productos (${unreadCounts.products})`}
                      title={`Productos sin leer: ${unreadCounts.products}`}
                    >
                      Prod {unreadCounts.products}
                    </button>
                  )}
                  {unreadCounts.reception > 0 && (
                    <button
                      onClick={goToReceptionControl}
                      className="inline-flex items-center justify-center text-[10px] font-semibold bg-purple-600 text-white rounded-full h-[18px] px-1 min-w-[30px] hover:bg-purple-700"
                      aria-label={`Ir a Control de Recepción (${unreadCounts.reception})`}
                      title={`Recepciones sin leer: ${unreadCounts.reception}`}
                    >
                      Rec {unreadCounts.reception}
                    </button>
                  )}
                </div>
              )}

              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-[380px] bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-3 flex items-center justify-between border-b">
                    <span className="text-sm font-medium text-gray-800">Notificaciones</span>
                    {loadingNotifDropdown && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
                  </div>
                  <div className="px-3 py-2 flex items-center justify-end text-xs border-b">
                    <button className="px-2 py-1 rounded hover:bg-gray-100 text-gray-700" onClick={markAllAsRead}>
                      Marcar todo leído
                    </button>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto divide-y">
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-700">
                        <Package className="w-4 h-4 text-green-600" />
                        Productos
                        {unreadCounts.products > 0 && (
                          <span className="ml-auto inline-flex items-center rounded-full bg-gray-100 text-gray-700 text-[10px] px-2 h-5">{unreadCounts.products} sin leer</span>
                        )}
                        <button onClick={goToProducts} className="ml-2 text-xs text-blue-600 hover:underline">Ver todo</button>
                      </div>
                      <ul className="space-y-2 text-sm">
                        {productsList.length === 0 ? (
                          <li className="text-gray-500">Sin novedades recientes.</li>
                        ) : (
                          productsList.slice(0, 5).map((p: any) => (
                            <li key={p.id} className="flex items-start gap-2">
                              <div className="w-6 h-6 rounded bg-green-50 border border-green-200 flex items-center justify-center">
                                <Package className="w-4 h-4 text-green-600" />
                              </div>
                              <div className="flex-1 cursor-pointer hover:text-blue-700" onClick={() => openProductItem(p)}>
                                <div className="text-gray-800">{p.name} <span className="text-gray-500">({p.sku})</span></div>
                                <div className="text-xs text-gray-500">{formatRelativeTime(p.created_at)} · {p.categories?.name || '—'}</div>
                              </div>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>

                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-700">
                        <FileText className="w-4 h-4 text-blue-600" />
                        Órdenes de Compra
                        {unreadCounts.purchase_orders > 0 && (
                          <span className="ml-auto inline-flex items-center rounded-full bg-gray-100 text-gray-700 text-[10px] px-2 h-5">{unreadCounts.purchase_orders} sin leer</span>
                        )}
                        <button onClick={goToPO} className="ml-2 text-xs text-blue-600 hover:underline">Ver todo</button>
                      </div>
                      <ul className="space-y-2 text-sm">
                        {poList.length === 0 ? (
                          <li className="text-gray-500">Sin novedades recientes.</li>
                        ) : (
                          poList.slice(0, 5).map((o: any) => (
                            <li key={o.id} className="flex items-start gap-2">
                              <div className="w-6 h-6 rounded bg-blue-50 border border-blue-200 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="flex-1 cursor-pointer hover:text-blue-700" onClick={() => openPOItem(o.id)}>
                                <div className="text-gray-800">PO {o.po_number} <span className="text-gray-500">· {o.status}</span></div>
                                <div className="text-xs text-gray-500">
                                  {o.expected_date ? `Entrega: ${new Date(o.expected_date).toLocaleDateString()}` : `Orden: ${o.order_date ? new Date(o.order_date).toLocaleDateString() : '—'}`} · {formatRelativeTime(o.updated_at || o.order_date)}
                                </div>
                              </div>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>

                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-700">
                        <Calendar className="w-4 h-4 text-orange-600" />
                        Citas
                        {unreadCounts.appointments > 0 && (
                          <span className="ml-auto inline-flex items-center rounded-full bg-gray-100 text-gray-700 text-[10px] px-2 h-5">{unreadCounts.appointments} sin leer</span>
                        )}
                        <button onClick={goToAppointments} className="ml-auto text-xs text-blue-600 hover:underline">Ver todo</button>
                      </div>
                      <ul className="space-y-2 text-sm">
                        {appointmentsList.length === 0 ? (
                          <li className="text-gray-500">Sin novedades recientes.</li>
                        ) : (
                          appointmentsList.slice(0, 5).map((a: any) => (
                            <li key={a.id} className="flex items-start gap-2">
                              <div className="w-6 h-6 rounded bg-orange-50 border border-orange-200 flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-orange-600" />
                              </div>
                              <div className="flex-1 cursor-pointer hover:text-blue-700" onClick={() => openAppointmentItem(a.id)}>
                                <div className="text-gray-800">Cita {a.appointment_number} <span className="text-gray-500">· {a.status}</span></div>
                                <div className="text-xs text-gray-500">Programada: {a.scheduled_at ? new Date(a.scheduled_at).toLocaleString() : '—'} · {formatRelativeTime(a.updated_at || a.scheduled_at)}</div>
                              </div>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>

                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-700">
                        <Truck className="w-4 h-4 text-purple-600" />
                        Recepción
                        {unreadCounts.reception > 0 && (
                          <span className="ml-auto inline-flex items-center rounded-full bg-gray-100 text-gray-700 text-[10px] px-2 h-5">{unreadCounts.reception} sin leer</span>
                        )}
                        <button onClick={goToReceptionControl} className="ml-2 text-xs text-blue-600 hover:underline">Ver todo</button>
                      </div>
                      <ul className="space-y-2 text-sm">
                        {receptionList.length === 0 ? (
                          <li className="text-gray-500">Sin novedades recientes.</li>
                        ) : (
                          receptionList.slice(0, 5).map((r: any) => (
                            <li key={r.id} className="flex items-start gap-2">
                              <div className="w-6 h-6 rounded bg-purple-50 border border-purple-200 flex items-center justify-center">
                                <Truck className="w-4 h-4 text-purple-600" />
                              </div>
                              <div className="flex-1 cursor-pointer hover:text-blue-700" onClick={() => openReceptionItem(r.id)}>
                                <div className="text-gray-800">Recepción {r.products?.sku ? `· ${r.products?.name} (${r.products?.sku})` : ''}</div>
                                <div className="text-xs text-gray-500">{formatRelativeTime(r.created_at)} · Cant: {r.quantity ?? '—'}</div>
                              </div>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">{user?.email}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut()}
              className="flex items-center space-x-1"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </Button>
          </div>
        </div>
      </div>
    {toast && (
      <div className="fixed top-4 right-4 z-50">
        <div className={['flex items-start gap-3 px-4 py-3 rounded-md shadow-lg ring-1', toast.type === 'success' ? 'bg-green-50 text-green-800 ring-green-200' : toast.type === 'error' ? 'bg-red-50 text-red-800 ring-red-200' : 'bg-blue-50 text-blue-800 ring-blue-200'].join(' ')}>
          {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : toast.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          <div className="max-w-xs">
            <div className="font-medium">{toast.title}</div>
            <div className="text-sm">{toast.message}</div>
          </div>
          <button className="ml-2 text-xs text-gray-500 hover:text-gray-700" onClick={() => setToast(null)}>Cerrar</button>
        </div>
      </div>
    )}
    </header>
    </React.Fragment>
  );
}
