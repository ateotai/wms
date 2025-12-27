import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Filter, Search, CheckCircle, ClipboardList, Truck, Layers, PlusCircle, X } from 'lucide-react';
import { TaskLabelModal } from './TaskLabelModal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type Movement = {
  id?: string;
  product_id: string;
  sku?: string;
  quantity: number;
  reference_number?: string;
  reference_type?: string;
  created_at?: string;
};

type PurchaseOrder = {
  id: string | number;
  po_number: string;
  status?: string;
};

type PurchaseOrderDetail = {
  id: string | number;
  po_number: string;
  items: Array<{ id: string | number; product_id?: string | number; quantity: number; received_quantity?: number; products?: { sku?: string; name?: string } }>;
};

export function Putaway() {
  const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
  const { user, hasPermissionId } = useAuth();
  const token = typeof window !== 'undefined' ? localStorage.getItem('app_token') : null;
  const navigate = useNavigate();
  const canManagePutaway = hasPermissionId('putaway.manage');

  const [mode, setMode] = useState<'items' | 'po'>('items');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Items recibidos (movimientos RECEIPT)
  const [movements, setMovements] = useState<Movement[]>([]);
  // Reservas de acomodo abiertas por SKU
  const [reservedBySku, setReservedBySku] = useState<Record<string, number>>({});
  // Órdenes recibidas
  const [receivedPOs, setReceivedPOs] = useState<PurchaseOrder[]>([]);
  const [poPendingById, setPoPendingById] = useState<Record<string, number>>({});
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [poDetail, setPoDetail] = useState<PurchaseOrderDetail | null>(null);
  const [poFilter, setPoFilter] = useState<'pending' | 'completed' | 'all'>('pending');

  // Estado del modal de creación
  const [showModal, setShowModal] = useState(false);
  const [modalAssignedTo, setModalAssignedTo] = useState('');
  const [modalPriority, setModalPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [modalNotes, setModalNotes] = useState('');
  const [modalItems, setModalItems] = useState<Array<{ sku: string; name: string; quantity: number; picked: number; location: string }>>([]);
  const [modalOrderNumber, setModalOrderNumber] = useState<string>('');
  const [modalOriginZone, setModalOriginZone] = useState<string>('Recepción');
  const [modalDestinationZone, setModalDestinationZone] = useState<string>('Almacenamiento');
  const [lastTaskCreatedAt, setLastTaskCreatedAt] = useState<number>(0);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelTask, setLabelTask] = useState<{ id: string; orderNumber: string; customer?: string; assignedTo?: string; location?: string; notes?: string } | null>(null);
  const handleCloseLabelModal = () => {
    setShowLabelModal(false);
    // Navegar a la subsección de tareas después de cerrar el modal de etiqueta
    navigate('/putaway/tasks?highlight=putaway');
  };

  const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || ''));
  const normalizeSku = (val: string) => String(val || '').trim().toUpperCase();

  const computeRemainingForPo = async (po: { id: string | number; po_number: string }) => {
    try {
      const detailResp = await fetch(`${AUTH_BACKEND_URL}/purchase_orders/${po.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!detailResp.ok) throw new Error(`HTTP ${detailResp.status}`);
      const detailJson = await detailResp.json();
      const d = detailJson?.purchase_order || detailJson;

      const reservedBySkuMap = new Map<string, number>(Object.entries(reservedBySku).map(([k, v]) => [normalizeSku(k), Number(v || 0)]));

      // Resolver SKU cuando viene vacío o como UUID para empatar con tareas
      const resolveSkuFromProductId = async (productId: string | number): Promise<string | null> => {
        try {
          const { data, error } = await supabase
            .from('products')
            .select('sku')
            .eq('id', String(productId))
            .single();
          if (!error && (data as any)?.sku) return String((data as any).sku);
        } catch {}
        try {
          if (AUTH_BACKEND_URL) {
            const qs = new URLSearchParams({ q: String(productId), limit: '1' });
            const resp = await fetch(`${AUTH_BACKEND_URL}/products/list?${qs.toString()}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (resp.ok) {
              const json = await resp.json();
              const p = Array.isArray(json.products) && json.products[0] ? json.products[0] : null;
              if (p?.sku) return String(p.sku);
            }
          }
        } catch {}
        return null;
      };

      const filteredItems = (d.items || []).filter((it: any) => Number(it.received_quantity || 0) > 0);
      const skuCache = new Map<string, string>();
      let remainingTotal = 0;
      for (const it of filteredItems) {
        let rawSku = normalizeSku(String((it as any).sku ?? it.products?.sku ?? ''));
        let sku = rawSku;
        if (!sku || isUuid(sku)) {
          const pid = it?.product_id ? String(it.product_id) : '';
          if (pid) {
            if (skuCache.has(pid)) {
              sku = skuCache.get(pid)!;
            } else {
              const resolved = await resolveSkuFromProductId(pid);
              if (resolved) {
                skuCache.set(pid, resolved);
                sku = normalizeSku(resolved);
              }
            }
          }
        }
        sku = sku || 'SKU';
        const received = Number((it as any).received_quantity || 0);
        const reserved = reservedBySkuMap.get(sku) || 0;
        remainingTotal += Math.max(0, received - reserved);
      }
      return remainingTotal;
    } catch (e) {
      console.warn('Error calculando pendientes de acomodo para OC:', e);
      return null;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!AUTH_BACKEND_URL) {
          setError('Backend no configurado');
          setLoading(false);
          return;
        }

        // 1. Cargar Tareas de Acomodo (Picking Tasks) PRIMERO
        // Para saber qué SKUs ya están "reservados" (en tarea pendiente, en progreso O completada)
        let reservedMap: Record<string, number> = {};
        try {
          const tasksResp = await fetch(`${AUTH_BACKEND_URL}/putaway/tasks`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (tasksResp.ok) {
            const tj = await tasksResp.json();
            const tasks = Array.isArray(tj?.tasks) ? tj.tasks : [];
            for (const t of tasks) {
              const isPutaway = String(t.customer || '').toLowerCase().includes('acomodo');
              // IMPORTANTE: Incluir 'completed' para que cuente como ya procesado y no disponible
              const isRelevant = String(t.status || 'pending') !== 'cancelled';
              
              if (isPutaway && isRelevant && Array.isArray(t.items)) {
                for (const it of t.items) {
                  const sku = normalizeSku(String(it.sku || ''));
                  const qty = Number(it.quantity || 0);
                  if (!sku) continue;
                  reservedMap[sku] = (reservedMap[sku] || 0) + qty;
                }
              }
            }
          }
        } catch (e) {
          console.warn('Error cargando tareas:', e);
        }
        setReservedBySku(reservedMap);

        if (mode === 'items') {
          const resp = await fetch(`${AUTH_BACKEND_URL}/inventory/movements?type=IN&period=30days&transaction_type=RECEIPT&limit=200`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const json = await resp.json();
          const arr = Array.isArray(json?.movements) ? json.movements : [];
          // Construir filas y normalizar SKU si viene vacío o como UUID
          let rows: Movement[] = arr.map((m: any) => ({
            id: m.id,
            product_id: String(m.product_id || ''),
            sku: String(m?.products?.sku ?? m?.sku ?? ''),
            quantity: Number(m.quantity || 0),
            reference_number: m.reference_number,
            reference_type: m.reference_type,
            created_at: m.created_at,
          }));

          const idsToResolve = Array.from(new Set(
            rows
              .filter(r => !r.sku || isUuid(String(r.sku)))
              .map(r => String(r.product_id || ''))
              .filter(Boolean)
          ));

          if (idsToResolve.length > 0) {
            try {
              const { data } = await supabase
                .from('products')
                .select('id, sku')
                .in('id', idsToResolve);
              const idToSku = new Map<string, string>();
              for (const p of data || []) {
                if (p?.id && p?.sku) idToSku.set(String(p.id), String(p.sku));
              }
              rows = rows.map(r => {
                if (!r.sku || isUuid(String(r.sku))) {
                  const resolved = idToSku.get(String(r.product_id));
                  return { ...r, sku: resolved ? String(resolved) : (r.sku || '') };
                }
                return r;
              });
            } catch {
              // noop
            }
          }

          setMovements(rows);

          // Cargar órdenes de compra con estatus de recibido para filtrar referencias
          try {
            const poResp = await fetch(`${AUTH_BACKEND_URL}/purchase_orders?status=all&received_only=true&exclude_in_appointments=false&limit=200`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (poResp.ok) {
              const poJson = await poResp.json();
              const arrPO = Array.isArray(poJson?.purchase_orders) ? poJson.purchase_orders : [];
              setReceivedPOs(arrPO.map((p: any) => ({ id: p.id, po_number: p.po_number, status: p.status })));
            } else {
              setReceivedPOs([]);
            }
          } catch {
            setReceivedPOs([]);
          }
        } else {
          const resp = await fetch(`${AUTH_BACKEND_URL}/purchase_orders?status=all&received_only=true&exclude_in_appointments=false&limit=200`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const json = await resp.json();
          const arr = Array.isArray(json?.purchase_orders) ? json.purchase_orders : [];
          const baseList = arr.map((p: any) => ({ id: p.id, po_number: p.po_number, status: p.status }));

          // Filtrar OCs que ya no tienen artículos pendientes
          // Usamos reservedMap ya calculado para evitar re-fetch
          const resolveSkuFromProductIdLocal = async (productId: string | number): Promise<string | null> => {
            try {
               const { data } = await supabase.from('products').select('sku').eq('id', String(productId)).single();
               if ((data as any)?.sku) return String((data as any).sku);
            } catch {}
            return null;
          };

          const skuCacheLocal = new Map<string, string>();

          try {
            const remainingList = await Promise.all(
              baseList.map(async (po: any) => {
                // Fetch details for items
                try {
                  const detailResp = await fetch(`${AUTH_BACKEND_URL}/purchase_orders/${po.id}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                  });
                  if (!detailResp.ok) return { po, remaining: 0 }; // Error, asumir 0
                  const detailJson = await detailResp.json();
                  const d = detailJson?.purchase_order || detailJson;
                  
                  const filteredItems = (d.items || []).filter((it: any) => Number(it.received_quantity || 0) > 0);
                  let remainingTotal = 0;
                  
                  for (const it of filteredItems) {
                    let rawSku = normalizeSku(String((it as any).sku ?? it.products?.sku ?? ''));
                    let sku = rawSku;
                    if (!sku || isUuid(sku)) {
                      const pid = it?.product_id ? String(it.product_id) : '';
                      if (pid) {
                        if (skuCacheLocal.has(pid)) {
                          sku = skuCacheLocal.get(pid)!;
                        } else {
                          const resolved = await resolveSkuFromProductIdLocal(pid);
                          if (resolved) {
                            skuCacheLocal.set(pid, resolved);
                            sku = normalizeSku(resolved);
                          }
                        }
                      }
                    }
                    sku = sku || 'SKU';
                    const received = Number((it as any).received_quantity || 0);
                    const reserved = reservedMap[sku] || 0;
                    remainingTotal += Math.max(0, received - reserved);
                  }
                  return { po, remaining: remainingTotal };
                } catch {
                  return { po, remaining: 0 };
                }
              })
            );
            
            const pendingMap: Record<string, number> = {};
            for (const r of remainingList) {
              if (typeof r.remaining === 'number') pendingMap[String(r.po.id)] = Number(r.remaining || 0);
            }
            setPoPendingById(pendingMap);
            setReceivedPOs(remainingList.map((r: any) => r.po));
          } catch {
            setReceivedPOs(baseList);
          }
        }
      } catch (e) {
        console.error('Error cargando datos de acomodo:', e);
        setError('No se pudieron cargar datos');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [AUTH_BACKEND_URL, token, mode, lastTaskCreatedAt]);

  const groupedByProduct = useMemo(() => {
    const receivedPoNumbers = new Set(
      (receivedPOs || []).map((p) => String(p.po_number))
    );
    const map = new Map<string, { received: number; refs: Set<string> }>();
    for (const m of movements) {
      const key = String(m.sku || m.product_id);
      if (!map.has(key)) map.set(key, { received: 0, refs: new Set() });
      const entry = map.get(key)!;
      entry.received += Number(m.quantity || 0);
      // Solo agregar referencias de OC con estatus recibido
      if (
        m.reference_number &&
        String(m.reference_type || '').toUpperCase() === 'PURCHASE_ORDER' &&
        receivedPoNumbers.has(String(m.reference_number))
      ) {
        entry.refs.add(String(m.reference_number));
      }
    }
    return Array.from(map.entries()).map(([sku, v]) => {
      const reserved = Number(reservedBySku[sku] || 0);
      const pending = Math.max(0, Number(v.received || 0) - reserved);
      return {
        sku,
        received: Number(v.received || 0),
        reserved,
        pending,
        quantity: pending, // compat para creaciones
        references: Array.from(v.refs),
      };
    });
  }, [movements, reservedBySku, receivedPOs]);

  const loadPoDetail = async (poId: string | number) => {
    try {
      setLoading(true);
      setError(null);
      const resp = await fetch(`${AUTH_BACKEND_URL}/purchase_orders/${poId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      const d = json?.purchase_order || json;
      setPoDetail(d);
    } catch (e) {
      console.error('Error cargando detalle de OC:', e);
      setError('No se pudo cargar el detalle de la orden');
    } finally {
      setLoading(false);
    }
  };

  const openModalFromItems = () => {
    if (!canManagePutaway) {
      alert('No tienes permiso para gestionar tareas de acomodo');
      return;
    }
    const items = groupedByProduct.map(g => ({
      sku: String(g.sku),
      name: 'Producto',
      quantity: Number(g.quantity || 0),
      picked: 0,
      location: 'Recepción',
    })).filter(it => it.quantity > 0);
    if (items.length === 0) {
      alert('No hay artículos recibidos para acomodo');
      return;
    }
    setModalItems(items);
    setModalOrderNumber(`ACOM-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Date.now()).slice(-4)}`);
    setModalAssignedTo('');
    setModalPriority('medium');
    setModalNotes('');
    setModalOriginZone('Recepción');
    setModalDestinationZone('Almacenamiento');
    setShowModal(true);
  };

  const openModalFromPO = () => {
    if (!canManagePutaway) {
      alert('No tienes permiso para gestionar tareas de acomodo');
      return;
    }
    if (!poDetail) {
      alert('Selecciona una orden de compra');
      return;
    }
    const computeRemainingItemsForPO = async () => {
      const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || ''));
      const resolveSkuFromProductId = async (productId: string | number): Promise<string | null> => {
        // 1) Intentar vía Supabase (directo por id)
        try {
          const { data, error } = await supabase
            .from('products')
            .select('sku')
            .eq('id', String(productId))
            .single();
          if (!error && (data as any)?.sku) return String((data as any).sku);
        } catch {}
        // 2) Intentar vía backend catálogo por búsqueda (puede resolver por id si indexa)
        try {
          if (AUTH_BACKEND_URL) {
            const qs = new URLSearchParams({ q: String(productId), limit: '1' });
            const resp = await fetch(`${AUTH_BACKEND_URL}/products/list?${qs.toString()}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (resp.ok) {
              const json = await resp.json();
              const p = Array.isArray(json.products) && json.products[0] ? json.products[0] : null;
              if (p?.sku) return String(p.sku);
            }
          }
        } catch {}
        return null;
      };
      // Usar reservedBySku ya cargado en el estado
      // No es necesario volver a hacer fetch de picking/tasks aquí
      
      const items = (await Promise.all(
        (poDetail.items || [])
          .filter(it => Number(it.received_quantity || 0) > 0)
          .map(async it => {
            // Preferir el campo sku del item; si es UUID o vacío, intentar resolver por product_id
            let sku = normalizeSku(String((it as any).sku ?? it.products?.sku ?? ''));
            if (!sku || isUuid(sku)) {
              const resolved = await resolveSkuFromProductId(String(it.product_id || ''));
              if (resolved) sku = normalizeSku(resolved);
            }
            // No usar product_id como SKU visible; usar marcador si no disponible
            if (!sku) sku = 'SKU';
            const received = Number(it.received_quantity || 0);
            const reserved = reservedBySku[sku] || 0;
            const remaining = Math.max(0, received - reserved);
            return {
              sku,
              name: String(it.products?.name || 'Producto'),
              quantity: remaining,
              picked: 0,
              location: 'Recepción',
              // guardamos el máximo para validar inputs
              // @ts-ignore
              _max: remaining,
            } as any;
          })
      ))
        .filter(it => Number((it as any).quantity || 0) > 0);
      return items as any[];
    };

    computeRemainingItemsForPO().then(items => {
      if (!items || items.length === 0) {
        alert('La orden seleccionada no tiene artículos pendientes de acomodo');
        return;
      }
      // Items ya incluyen 'destination' sugerido si se pudo resolver en computeRemainingItemsForPO
      setModalItems(items as any);
      setModalOrderNumber(`ACOM-${poDetail.po_number}`);
      setModalAssignedTo('');
      setModalPriority('medium');
      setModalNotes('');
      setModalOriginZone('Recepción');
      try {
        const codes = Array.from(new Set((items || []).map((i: any) => String(i?.destination || '').trim()).filter(Boolean)));
        setModalDestinationZone(codes.length === 1 ? codes[0] : 'Mixta');
      } catch { setModalDestinationZone('Almacenamiento'); }
      setShowModal(true);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center"><Package className="w-5 h-5 mr-2" /> Acomodo</h2>
          <p className="text-gray-600">Ingreso al inventario de artículos recibidos</p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setMode('items')} className={`px-3 py-2 text-sm rounded-md ${mode==='items' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}>Por artículos</button>
          <button onClick={() => setMode('po')} className={`px-3 py-2 text-sm rounded-md ${mode==='po' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}>Por orden de compra</button>
          <button
            onClick={() => { if (!canManagePutaway) { alert('No tienes permiso para gestionar tareas de acomodo'); return; } if (mode === 'items') { openModalFromItems(); } else { openModalFromPO(); } }}
            disabled={!canManagePutaway}
            className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium ${canManagePutaway ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
          >
            <PlusCircle className="w-4 h-4 mr-2" /> Nueva tarea de acomodo
          </button>
        </div>
      </div>

      {/* Se removieron los campos en línea. Ahora el formulario aparece en el modal. */}

      {mode === 'items' && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center text-gray-700 text-sm"><ClipboardList className="w-4 h-4 mr-2"/> Artículos recibidos recientes</div>
            <div className="text-sm text-gray-500">{groupedByProduct.filter(g => Number(g.quantity || 0) > 0).length} productos</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">SKU</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Recibido</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Reservado</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Pendiente</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Referencias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {groupedByProduct.filter(row => Number(row.quantity || 0) > 0).map((row) => (
                  <tr key={row.sku}>
                    <td className="px-3 py-2">
                      {row.sku}
                      {Number((row as any).reserved || 0) > 0 && (
                        <span
                          title={`Reservado: ${Number((row as any).reserved || 0)}`}
                          className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-800"
                        >
                          Res {Number((row as any).reserved || 0)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{Number((row as any).received || 0)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${Number((row as any).reserved || 0) > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                        {Number((row as any).reserved || 0)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${Number(row.quantity || 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {Number(row.quantity || 0)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{row.references.join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={openModalFromItems} disabled={!canManagePutaway} className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${canManagePutaway ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
              <CheckCircle className="w-4 h-4 mr-2"/> Crear tarea de acomodo
            </button>
          </div>
        </div>
      )}

      {mode === 'po' && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center text-gray-700 text-sm"><Truck className="w-4 h-4 mr-2"/> Órdenes de compra recibidas</div>
            <div className="flex items-center space-x-2">
              <select
                value={poFilter}
                onChange={(e) => setPoFilter(e.target.value as 'pending' | 'completed' | 'all')}
                className="text-xs border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="pending">Pendientes</option>
                <option value="completed">Completadas</option>
                <option value="all">Todas</option>
              </select>
              <div className="text-sm text-gray-500">{receivedPOs.length} total</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">Listado</div>
                <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                  {receivedPOs.filter(po => {
                    const rem = Number(poPendingById[String(po.id)]||0);
                    // Si está marcada como completed O tiene 0 pendientes, se considera completada
                    const isCompleted = po.status === 'completed' || rem === 0;

                    if (poFilter === 'all') return true;
                    if (poFilter === 'completed') return isCompleted;
                    return !isCompleted; // pending
                  }).map(po => {
                    const rem = Number(poPendingById[String(po.id)]||0);
                    const isCompleted = po.status === 'completed' || rem === 0;
                    return (
                    <button
                      key={String(po.id)}
                      onClick={() => { setSelectedPO(po); loadPoDetail(po.id); }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${selectedPO?.id===po.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                      <span>{po.po_number}</span>
                      {isCompleted ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Completado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Pendiente {rem}
                        </span>
                      )}
                    </button>
                  )})}
                  {receivedPOs.filter(po => {
                    if (poFilter === 'all') return true;
                    const rem = Number(poPendingById[String(po.id)]||0);
                    const isCompleted = po.status === 'completed' || rem === 0;
                    return !isCompleted;
                  }).length === 0 && (
                    <div className="px-3 py-4 text-center text-sm text-gray-500">
                      No hay órdenes {poFilter === 'pending' ? 'pendientes' : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              {poDetail ? (
                <div>
                  <div className="text-sm text-gray-700 mb-2">Detalle de {poDetail.po_number}</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">SKU</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Producto</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Recibido</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {poDetail.items.filter(it => Number(it.received_quantity || 0) > 0).map(it => (
                          <tr key={String(it.id)}>
                            <td className="px-3 py-2">{(it as any).sku ?? it.products?.sku ?? '-'}</td>
                            <td className="px-3 py-2">{it.products?.name || 'Producto'}</td>
                            <td className="px-3 py-2">{Number(it.received_quantity || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end mt-4">
                    <button onClick={openModalFromPO} disabled={!canManagePutaway} className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${canManagePutaway ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                      <CheckCircle className="w-4 h-4 mr-2"/> Crear tarea de acomodo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">Selecciona una orden para ver el detalle</div>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && <div className="text-sm text-gray-500">Cargando...</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {showModal && (
        <PutawayTaskModal
          onClose={() => setShowModal(false)}
          items={modalItems}
          orderNumber={modalOrderNumber}
          assignedTo={modalAssignedTo}
          priority={modalPriority}
          notes={modalNotes}
          originZone={modalOriginZone}
          destinationZone={modalDestinationZone}
          setAssignedTo={setModalAssignedTo}
          setPriority={setModalPriority}
          setNotes={setModalNotes}
          setOriginZone={setModalOriginZone}
          setDestinationZone={setModalDestinationZone}
          AUTH_BACKEND_URL={AUTH_BACKEND_URL}
          onCreated={(createdTask) => {
            setLastTaskCreatedAt(Date.now());
            if (createdTask) {
              setLabelTask({ id: createdTask.id, orderNumber: createdTask.orderNumber, customer: createdTask.customer, assignedTo: createdTask.assignedTo, location: createdTask.location, notes: createdTask.notes });
              setShowLabelModal(true);
            }
            if (selectedPO) {
              // recargar el detalle para reflejar pendientes
              loadPoDetail(selectedPO.id);
              computeRemainingForPo({ id: selectedPO.id, po_number: selectedPO.po_number }).then(rem => {
                // Actualizar contador de pendientes para la OC seleccionada
                setPoPendingById(prev => ({ ...prev, [String(selectedPO.id)]: Number(rem || 0) }));
                if (rem === 0) {
                  setReceivedPOs(prev => prev.filter(p => p.id !== selectedPO.id));
                  setSelectedPO(null);
                  setPoDetail(null);
                }
              });
            }
          }}
        />
      )}
      {showLabelModal && (
        <TaskLabelModal
          isOpen={showLabelModal}
          onClose={handleCloseLabelModal}
          autoPrint={false}
          task={labelTask}
        />
      )}
    </div>
  );
}

function PutawayTaskModal({
  onClose,
  items,
  orderNumber,
  assignedTo,
  priority,
  notes,
  originZone,
  destinationZone,
  setAssignedTo,
  setPriority,
  setNotes,
  setOriginZone,
  setDestinationZone,
  AUTH_BACKEND_URL,
  onCreated,
}: {
  onClose: () => void;
  items: { sku: string; name: string; quantity: number; picked: number; location: string; destination?: string }[];
  orderNumber: string;
  assignedTo: string;
  priority: 'high' | 'medium' | 'low';
  notes: string;
  originZone: string;
  destinationZone: string;
  setAssignedTo: (v: string) => void;
  setPriority: (v: 'high' | 'medium' | 'low') => void;
  setNotes: (v: string) => void;
  setOriginZone: (v: string) => void;
  setDestinationZone: (v: string) => void;
  AUTH_BACKEND_URL: string;
  onCreated?: (task?: any) => void;
}) {
  const { user } = useAuth();
  const token = typeof window !== 'undefined' ? localStorage.getItem('app_token') : null;

  const [location, setLocation] = useState('Recepción');
  const [estimatedTime, setEstimatedTime] = useState(Math.max(10, (items?.length || 0) * 5));
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed' | 'cancelled'>('pending');
  const [editableItems, setEditableItems] = useState(items);
  const [users, setUsers] = useState<Array<{ id: string; email: string; full_name?: string; role?: string; is_active?: boolean }>>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [zones, setZones] = useState<string[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [emptyLocationCodes, setEmptyLocationCodes] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const dueDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  useEffect(() => {
    // Cargar usuarios para autocompletado (normalizados)
    async function loadUsers() {
      if (!AUTH_BACKEND_URL || !token) return;
      try {
        setUsersLoading(true);
        const resp = await fetch(`${AUTH_BACKEND_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        const list = Array.isArray(json?.users) ? json.users : [];
        setUsers(list.filter((u: any) => u && (u.full_name || u.email)));
      } catch (e) {
        console.warn('No se pudieron cargar usuarios para autocompletado:', e);
      } finally {
        setUsersLoading(false);
      }
    }

    // Cargar zonas desde ubicaciones
    async function loadZones() {
      if (!AUTH_BACKEND_URL || !token) return;
      try {
        setZonesLoading(true);
        const resp = await fetch(`${AUTH_BACKEND_URL}/locations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        const locs = Array.isArray(json?.locations) ? json.locations : [];
        const uniqueZones = Array.from(new Set(locs.map((l: any) => String(l.zone || '').trim()).filter(Boolean)));
        setZones(uniqueZones);
        // Si la zona destino actual no está en la lista, mantén el valor actual
      } catch (e) {
        console.warn('No se pudieron cargar zonas desde ubicaciones:', e);
      } finally {
        setZonesLoading(false);
      }
    }

    loadUsers();
    loadZones();
  }, [AUTH_BACKEND_URL, token]);

  // Cargar ubicaciones vacías para sugerir destinos alternativos
  useEffect(() => {
    async function loadEmptyLocations() {
      try {
        if (!AUTH_BACKEND_URL) return;
        const locResp = await fetch(`${AUTH_BACKEND_URL}/locations`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const invResp = await fetch(`${AUTH_BACKEND_URL}/inventory/list`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const locJson = locResp.ok ? await locResp.json() : { locations: [] };
        const invJson = invResp.ok ? await invResp.json() : { inventory: [] };
        const allCodes: string[] = Array.isArray(locJson.locations)
          ? locJson.locations.map((l: any) => String(l.code || '')).filter(Boolean)
          : [];
        const occupied = new Set<string>(
          (Array.isArray(invJson.inventory) ? invJson.inventory : [])
            .filter((r: any) => Number(r.available_quantity || r.quantity || 0) > 0)
            .map((r: any) => String(r.location_code || r.location || '').trim())
            .filter(Boolean)
        );
        const empty = allCodes.filter(c => c && !occupied.has(c));
        setEmptyLocationCodes(empty);
      } catch (e) {
        console.warn('No se pudieron cargar ubicaciones vacías:', e);
        setEmptyLocationCodes([]);
      }
    }
    loadEmptyLocations();
  }, [AUTH_BACKEND_URL, token]);

  // Limpieza automática de tareas de acomodo locales (solicitado por usuario)
  useEffect(() => {
    try {
      // Forzar limpieza siempre al montar el componente
      const raw = localStorage.getItem('picking_tasks');
      if (raw) {
        const tasks = JSON.parse(raw);
        // Filtrar y eliminar CUALQUIER tarea que sea de "Acomodo"
        const filtered = tasks.filter((t: any) => String(t.customer || '').toLowerCase() !== 'acomodo');
        
        if (tasks.length !== filtered.length) {
          localStorage.setItem('picking_tasks', JSON.stringify(filtered));
          // Disparar evento para que otros componentes (como PickingTasks) se actualicen
          window.dispatchEvent(new Event('picking_tasks_updated'));
          console.log('Limpieza FORZADA: tareas de acomodo locales eliminadas.');
        }
      }
    } catch (e) {
      console.error('Error limpiando tareas locales:', e);
    }
  }, []);

  // Auto-asignación de ubicaciones destino (lógica dinámica)
  useEffect(() => {
    let isMounted = true;
    const autoAssign = async () => {
      // Solo ejecutar si hay items sin destino y tenemos capacidad de sugerir (ya cargó emptyLocationCodes o al menos intentó)
      const pendingIndices = editableItems.map((it, idx) => !it.destination ? idx : -1).filter(i => i !== -1);
      if (pendingIndices.length === 0) return;

      if (!AUTH_BACKEND_URL || !token) return;

      const newItems = [...editableItems];
      let changed = false;

      // 1. Identificar destinos ya usados para no repetir al asignar vacíos
      const usedDestinations = new Set(newItems.map(i => i.destination).filter(Boolean));
      // Filtrar emptyLocationCodes para tener solo disponibles
      const availableEmpty = emptyLocationCodes.filter(c => !usedDestinations.has(c));
      let emptyCursor = 0;

      // Cache para no consultar repetidamente el mismo SKU
      const skuLocCache = new Map<string, string>();

      for (const idx of pendingIndices) {
        if (!isMounted) break;
        const item = newItems[idx];
        const sku = item.sku;
        if (!sku) continue;

        let bestLoc = skuLocCache.get(sku);

        if (!bestLoc) {
          // A. Buscar stock existente para consolidar (Picking o Storage)
          try {
            const invResp = await fetch(`${AUTH_BACKEND_URL}/inventory/list?q=${encodeURIComponent(sku)}&limit=20`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (invResp.ok) {
              const invJson = await invResp.json();
              const candidates = (invJson.inventory || []).filter((r: any) => 
                (String(r.location_type).toLowerCase() === 'picking' || String(r.location_type).toLowerCase() === 'storage')
              );
              // Preferir la que tenga más cantidad o simplemente la primera
              if (candidates.length > 0) {
                bestLoc = candidates[0].location_code || candidates[0].location;
              }
            }
          } catch {}

          // B. Si no hay stock, buscar ubicación por defecto del producto
          if (!bestLoc) {
            try {
              const prodResp = await fetch(`${AUTH_BACKEND_URL}/products/list?q=${encodeURIComponent(sku)}&limit=1`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (prodResp.ok) {
                const prodJson = await prodResp.json();
                const prod = prodJson.products?.[0];
                if (prod?.default_location?.code) {
                  bestLoc = prod.default_location.code;
                }
              }
            } catch {}
          }
        }

        // C. Si no tiene ubicación previa ni default, asignar una vacía
        if (!bestLoc) {
           if (emptyCursor < availableEmpty.length) {
             bestLoc = availableEmpty[emptyCursor];
             emptyCursor++;
           }
        }

        if (bestLoc) {
          newItems[idx] = { ...item, destination: bestLoc };
          skuLocCache.set(sku, bestLoc);
          changed = true;
        }
      }

      if (changed && isMounted) {
        // Ordenar items por ubicación destino para optimizar recorrido
        newItems.sort((a, b) => {
          const da = a.destination || 'ZZZ';
          const db = b.destination || 'ZZZ';
          return da.localeCompare(db, undefined, { numeric: true });
        });
        setEditableItems(newItems);
      }
    };

    // Ejecutar cuando se carguen las ubicaciones vacías (señal de que podemos empezar a sugerir)
    // o si cambian los items iniciales (aunque editableItems es state)
    if (emptyLocationCodes.length > 0 || (items.length > 0 && emptyLocationCodes.length === 0)) { 
        // Delay pequeño para asegurar render y no bloquear
        const timer = setTimeout(autoAssign, 500);
        return () => { clearTimeout(timer); isMounted = false; };
    }
  }, [emptyLocationCodes, items]); // Dependencia en items para reinicio, emptyLocationCodes para disponibilidad

  // Mantener resumen de destino conforme se edita por ítem
  useEffect(() => {
    try {
      const codes = Array.from(new Set((editableItems || [])
        .map(it => String((it as any).destination || '').trim())
        .filter(Boolean)));
      setDestinationZone(codes.length === 1 ? codes[0] : 'Mixta');
    } catch {}
  }, [editableItems]);

  function normalizeUserDisplay(u: { full_name?: string; email: string }) {
    const name = String(u.full_name || '').trim();
    const email = String(u.email || '').trim();
    // Normalizado: mostrar "Nombre (email)" y guardar solo nombre o email
    return {
      display: name ? `${name} (${email})` : email,
      value: name || email,
    };
  }

  const handleCreate = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const itemsToSend = (editableItems || []).filter(it => Number(it.quantity || 0) > 0);
      if (itemsToSend.length === 0) {
        alert('Debes especificar cantidades mayores a cero para al menos un artículo');
        return;
      }
      const newTask = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        orderNumber: orderNumber || `ACOM-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Date.now()).slice(-4)}`,
        customer: 'Acomodo',
        priority,
        status,
        assignedTo: assignedTo || (user?.full_name || user?.email || 'Sin asignar'),
        zone: 'Zona de Recepción',
        location,
        items: itemsToSend,
        estimatedTime,
        createdAt: new Date().toISOString(),
        dueDate,
        notes,
        creator: user?.full_name || user?.email || 'Sistema',
        originZone,
        destinationZone,
      };
      if (AUTH_BACKEND_URL && token) {
        const resp = await fetch(`${AUTH_BACKEND_URL}/picking/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(newTask),
        });
        if (!resp.ok) {
          let serverMsg = '';
          try {
            const j = await resp.json();
            serverMsg = j?.error || '';
          } catch {}
          console.error('Error creando tarea en backend:', serverMsg || `HTTP ${resp.status}`);
          alert(`Error al crear la tarea: ${serverMsg || 'Error desconocido'}`);
          // NO guardar localmente si falla el backend
        } else {
          // Si el backend creó la tarea, intenta sincronizar ID y guardar también en local
          try {
            const j = await resp.json();
            const saved = j?.task || j;
            if (saved?.id) newTask.id = saved.id;
          } catch {}
          // No guardamos en local si se creó en backend para evitar duplicados
          alert('Tarea de acomodo creada en la base de datos');
        }
      } else {
        const raw = localStorage.getItem('picking_tasks');
        const tasks = raw ? JSON.parse(raw) : [];
        localStorage.setItem('picking_tasks', JSON.stringify([newTask, ...tasks]));
        window.dispatchEvent(new Event('picking_tasks_updated'));
        alert('Tarea de acomodo guardada localmente');
      }
      // Notificar a padre para navegar y mostrar etiqueta
      try { onCreated && onCreated(newTask); } catch {}
      onClose();
      return newTask;
    } catch (e) {
      console.error('Error creando tarea de acomodo (modal):', e);
      alert('No se pudo crear la tarea');
      return undefined;
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-16 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Nueva tarea de acomodo</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100"><X className="w-4 h-4"/></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
            <input value={orderNumber} readOnly className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asignado a</label>
            <input
              list="assigned-users-list"
              value={assignedTo}
              onChange={e=>setAssignedTo(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder={usersLoading ? 'Cargando usuarios...' : 'Buscar usuario por nombre o email'}
            />
            <datalist id="assigned-users-list">
              {users.map(u => {
                const n = normalizeUserDisplay({ full_name: u.full_name, email: u.email });
                return (
                  <option key={u.id} value={n.value}>{n.display}</option>
                );
              })}
            </datalist>
            <div className="mt-1 text-xs text-gray-500">{usersLoading ? 'Cargando usuarios…' : (users.length ? `${users.length} usuarios disponibles` : 'Sin usuarios cargados')}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
            <select value={priority} onChange={e=>setPriority(e.target.value as any)} className="w-full border border-gray-300 rounded-md px-3 py-2">
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación actual</label>
            <input value={location} onChange={e=>setLocation(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zona origen</label>
            <input value={originZone} onChange={e=>setOriginZone(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zona destino</label>
            <input value={destinationZone} readOnly className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo estimado (min)</label>
            <input type="number" min={1} value={estimatedTime} onChange={e=>setEstimatedTime(Number(e.target.value))} className="w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" rows={3} placeholder="Ej. Pasar materiales a almacenamiento y activarlos" />
          </div>
        </div>

        <div className="mt-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Artículos para acomodo</div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">SKU</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Producto</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Cantidad</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Origen</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Destino</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {editableItems.map((it, idx) => (
                  <tr key={`${it.sku}-${idx}`}>
                    <td className="px-3 py-2">{it.sku}</td>
                    <td className="px-3 py-2">{it.name}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        max={(it as any)._max ?? undefined}
                        value={Number(it.quantity || 0)}
                        onChange={e => {
                          const val = Math.max(0, Math.floor(Number(e.target.value || 0)));
                          setEditableItems(prev => prev.map((row, i) => i===idx ? { ...row, quantity: ((it as any)._max != null ? Math.min(val, (it as any)._max) : val) } : row));
                        }}
                        className="w-24 border border-gray-300 rounded-md px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">{it.location}</td>
                    <td className="px-3 py-2">
                      <input
                        list="empty-locations-list"
                        value={String((it as any).destination || '')}
                        onChange={e => {
                          const v = e.target.value;
                          setEditableItems(prev => prev.map((row, i) => i===idx ? { ...row, destination: v } as any : row));
                        }}
                        placeholder="Ej. A-01-03"
                        className="w-36 border border-gray-300 rounded-md px-2 py-1"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <datalist id="empty-locations-list">
              {emptyLocationCodes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </datalist>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Cancelar</button>
          <button onClick={handleCreate} disabled={isCreating} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300">
            {isCreating ? 'Creando...' : 'Crear tarea de acomodo'}
          </button>
        </div>
      </div>
    </div>
  );
}
