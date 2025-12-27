import React, { useEffect, useState } from 'react';
import { Package, Eye, Edit, MoreVertical, RefreshCw, AlertCircle, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/currency';
import { ProductDetailModal } from './ProductDetailModal';
import { useSearchParams } from 'react-router-dom';
import { ProductLabelModal } from './ProductLabelModal';

const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';

interface ProductsTableProps {
  searchTerm: string;
}

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  category?: string;
  cost_price?: number | null;
  selling_price?: number | null;
  min_stock_level?: number | null;
  reorder_point?: number | null;
  is_active?: boolean | null;
}

export function ProductsTable({ searchTerm }: ProductsTableProps) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'sku' | 'name'>('sku');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [highlightCount, setHighlightCount] = useState<number>(0);
  const [showHighlightBanner, setShowHighlightBanner] = useState<boolean>(false);
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // detailLoading is used inside handleViewProduct to indicate loading state
  const [detailError, setDetailError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const openedFromParamsRef = React.useRef<boolean>(false);
  const [includeInactive, setIncludeInactive] = useState<boolean>(true);
  const [inventoryInfoByProduct, setInventoryInfoByProduct] = useState<Record<string, { location: string; status: string }>>({});
  // Nuevos estados: totales y recepción por producto + agregado
  const [stockTotalsByProduct, setStockTotalsByProduct] = useState<Record<string, number>>({});
  const [receivingUnitsByProduct, setReceivingUnitsByProduct] = useState<Record<string, number>>({});
  const [receivingUnitsCount, setReceivingUnitsCount] = useState<number>(0);
  // Impresión de etiquetas
  const [showProductLabelModal, setShowProductLabelModal] = useState<boolean>(false);
  const [labelProduct, setLabelProduct] = useState<{
    id: string;
    sku: string;
    name: string;
    barcode?: string | null;
    category?: string | null;
    location?: string | null;
  } | null>(null);
  // Estados para edición
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editProduct, setEditProduct] = useState<ProductRow | null>(null);
  const [editMin, setEditMin] = useState<string>('');
  const [editReorder, setEditReorder] = useState<string>('');
  const [editMax, setEditMax] = useState<string>('');
  // Ubicación a editar
  type LocationOption = { id: string; code: string; name?: string | null; location_type?: string | null; warehouse_id?: string };
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [editLocationId, setEditLocationId] = useState<string>('');

  const [putawayQtyByProduct, setPutawayQtyByProduct] = useState<Record<string, number>>({});
  const [packingQtyByProduct, setPackingQtyByProduct] = useState<Record<string, { qty: number; status: string }>>({});

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar tareas de empaquetado desde localStorage
      try {
        const tasksStr = localStorage.getItem('packing_tasks');
        const tasks = tasksStr ? JSON.parse(tasksStr) : [];
        const packingMap: Record<string, { qty: number; status: string }> = {};
        if (Array.isArray(tasks)) {
          tasks.forEach((t: any) => {
            // Considerar tareas que no están canceladas
            if (t.status !== 'cancelled' && t.items && Array.isArray(t.items)) {
              t.items.forEach((it: any) => {
                const sku = String(it.sku || '').trim().toUpperCase();
                if (sku) {
                  const current = packingMap[sku] || { qty: 0, status: 'packing' };
                  packingMap[sku] = {
                    qty: current.qty + Number(it.quantity || 0),
                    status: (t.status === 'embarked' || t.status === 'shipped') ? 'embarked' : current.status
                  };
                }
              });
            }
          });
        }
        setPackingQtyByProduct(packingMap);
      } catch (e) {
        console.warn('Error leyendo tareas de empaquetado:', e);
      }

      // Cargar tareas de acomodo activas para calcular cantidades "En acomodo"
      let putawayMap: Record<string, number> = {};
      if (AUTH_BACKEND_URL) {
        try {
          const token = localStorage.getItem('app_token');
          // Intentar endpoint de acomodo primero
          let tasks: any[] = [];
          try {
            const resp = await fetch(`${AUTH_BACKEND_URL}/putaway/tasks`, {
               headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (resp.ok) {
              const json = await resp.json();
              tasks = Array.isArray(json.tasks) ? json.tasks : [];
            }
          } catch {}
          
          if (tasks.length === 0) {
            // Fallback a picking/tasks
             const resp = await fetch(`${AUTH_BACKEND_URL}/picking/tasks`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (resp.ok) {
              const json = await resp.json();
              tasks = Array.isArray(json.tasks) ? json.tasks : [];
            }
          }

          tasks.forEach((t: any) => {
            const isPutaway = String(t.customer || '').toLowerCase().includes('acomodo') || t.type === 'putaway';
            const isActive = t.status === 'pending' || t.status === 'in_progress';
            if (isPutaway && isActive && Array.isArray(t.items)) {
              t.items.forEach((it: any) => {
                if (it.sku) {
                  const q = Number(it.quantity || 0);
                  const p = Number(it.picked || 0);
                  const rem = Math.max(0, q - p);
                  putawayMap[it.sku] = (putawayMap[it.sku] || 0) + rem;
                }
              });
            }
          });
          setPutawayQtyByProduct(putawayMap);
        } catch (e) {
          console.warn('Error cargando tareas de acomodo:', e);
        }
      }

      let rows: ProductRow[] = [];

      // Preferir backend con service-role
      if (AUTH_BACKEND_URL) {
        try {
          const token = localStorage.getItem('app_token');
          const qs = new URLSearchParams();
          if (searchTerm) qs.set('q', searchTerm);
          qs.set('limit', '100');
          qs.set('include_inactive', includeInactive ? 'true' : 'false');
          const resp = await fetch(`${AUTH_BACKEND_URL}/products/list?${qs.toString()}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (resp.ok) {
            const json = await resp.json();
            const data = Array.isArray(json.products) ? json.products : [];
            rows = data.map((p: any) => ({
              id: String(p.id),
              sku: String(p.sku || ''),
              name: String(p.name || 'Producto'),
              category: p.categories?.name ?? 'Sin categoría',
              cost_price: p.cost_price ?? null,
              selling_price: p.selling_price ?? null,
              min_stock_level: p.min_stock_level ?? null,
              reorder_point: p.reorder_point ?? p.min_stock_level ?? null,
              is_active: p.is_active ?? true
            }));
          }
        } catch (e) {
          console.warn('Backend productos no disponible, usando supabase:', e);
        }
      }

      // Fallback a Supabase directo
      if (rows.length === 0) {
        try {
          let query = supabase
            .from('products')
            .select('id, sku, name, cost_price, selling_price, min_stock_level, reorder_point, is_active, categories(name)')
            .limit(100);

          if (!includeInactive) {
            query = query.eq('is_active', true);
          }

          if (searchTerm) {
            query.or(`sku.ilike.*${searchTerm}*,name.ilike.*${searchTerm}*`);
          }

          const { data, error: sError } = await query;
          if (sError) throw sError;
          const dataRows = Array.isArray(data) ? data : [];
          rows = dataRows.map((p: any) => ({
            id: String(p.id),
            sku: String(p.sku || ''),
            name: String(p.name || 'Producto'),
            category: p.categories?.name ?? 'Sin categoría',
            cost_price: p.cost_price ?? null,
            selling_price: p.selling_price ?? null,
            min_stock_level: p.min_stock_level ?? null,
            reorder_point: p.reorder_point ?? p.min_stock_level ?? null,
            is_active: p.is_active ?? true
          }));
        } catch (e) {
          console.error('Error consultando productos en Supabase:', e);
        }
      }

      setProducts(rows);
      await loadInventoryInfo(rows, putawayMap);
    } catch (err) {
      console.error('Error al cargar productos:', err);
      setError('Error al cargar el catálogo de productos');
    } finally {
      setLoading(false);
    }
  };

  // Nuevo helper dentro del componente
  const loadInventoryInfo = async (rows: ProductRow[], putawayMap: Record<string, number> = {}) => {
    try {
      const ids = rows
        .map((r) => r.id)
        .filter((id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
      
      const idToSku: Record<string, string> = {};
      rows.forEach(r => { idToSku[r.id] = r.sku; });

      if (ids.length === 0) {
        setInventoryInfoByProduct({});
        setStockTotalsByProduct({});
        setReceivingUnitsByProduct({});
        setReceivingUnitsCount(0);
        return;
      }

      let rowsInv: any[] = [];

      // Preferir backend (evita bloqueo por RLS en frontend)
      if (AUTH_BACKEND_URL) {
        try {
          const qs = new URLSearchParams();
          qs.set('limit', '2000');
          const resp = await fetch(`${AUTH_BACKEND_URL}/inventory/list?${qs.toString()}`);
          if (resp.ok) {
            const json = await resp.json();
            const inv = Array.isArray(json.inventory) ? json.inventory : [];
            // Filtrar solo productos visibles en la tabla
            rowsInv = inv.filter((r: any) => ids.includes(String(r.product_id)));
          }
        } catch (err) {
          console.warn('Backend inventario no disponible, usando supabase:', err);
        }
      }

      // Fallback a Supabase si backend no devolvió datos
      if (!rowsInv || rowsInv.length === 0) {
        const { data, error } = await supabase
          .from('inventory')
          .select('product_id, quantity, reserved_quantity, available_quantity, locations:location_id(code, name, location_type)')
          .in('product_id', ids)
          .limit(2000);
        if (error) throw error;
        rowsInv = data || [];
      }

      const infoMap: Record<string, { location: string; status: string }> = {};
      const totalMap: Record<string, number> = {};
      const recvMap: Record<string, number> = {};
      const locsMap: Record<string, Array<{ code: string; isRecv: boolean; qty: number }>> = {};
      let recvTotal = 0;

      (rowsInv || []).forEach((row: any) => {
        const pid = String(row.product_id);
        const qty = Number(row?.quantity ?? row?.available_quantity ?? 0);
        const reserved = Number(row?.reserved_quantity ?? 0);
        const code: string = String(row?.location_code ?? row?.locations?.code ?? '').toUpperCase();
        const locType: string = String(row?.location_type ?? row?.locations?.location_type ?? '').toLowerCase();
        // Considerar 'receiving', 'RECV' y SIN UBICACIÓN como recepción.
        // Las ubicaciones virtuales (VIRT-) y de cuarentena se considerarán RECEPCIÓN (según última corrección del usuario).
        // NOTA: No usar !row.locations porque el backend devuelve estructura plana sin objeto locations.
        const isRecv = locType === 'receiving' || locType === 'quarantine' || code === 'RECV' || code.startsWith('VIRT-') || (!row.locations && !row.location_code && !row.location_id);

        // Stock total: sumar cantidad SOLO en ubicaciones de almacenamiento (excluir recepción)
        if (!isRecv) {
          totalMap[pid] = (totalMap[pid] || 0) + qty;
        }

        // Recepción: sumar cantidad en ubicaciones de recepción (no solo reservado)
        if (isRecv) {
          recvMap[pid] = (recvMap[pid] || 0) + qty;
          recvTotal += qty;
        }

        if (!locsMap[pid]) locsMap[pid] = [];
        locsMap[pid].push({ code, isRecv, qty });
      });

      // Post-proceso para determinar el estado final y la mejor ubicación para mostrar
      const normalizeSku = (val: string) => String(val || '').trim().toUpperCase();

      Object.keys(locsMap).forEach(pid => {
        const sku = normalizeSku(idToSku[pid]);
        const rQty = recvMap[pid] || 0;
        const tQty = totalMap[pid] || 0;
        const locs = locsMap[pid] || [];
        const pQty = putawayMap[sku] || 0;
        
        let status = 'Sin inventario';
        let displayLoc = '—';
        
        if (pQty > 0) {
            // Ajustar pQty para no exceder lo que realmente hay en recepción
            const effectivePQty = Math.min(pQty, rQty);
            const remainder = Math.max(0, rQty - effectivePQty);
            
            if (effectivePQty > 0) {
                if (remainder > 0) {
                    status = `Acomodo: ${effectivePQty} / Rec: ${remainder}`;
                } else {
                    status = `Acomodo: ${effectivePQty}`;
                }
            } else if (rQty > 0) {
                 // Si hay tarea pero effective es 0 (ej. rQty=0? no, rQty>0 aqui),
                 // o pQty era > 0 pero rQty=0 (no entra aqui por rQty>0)
                 // Si effectivePQty es 0, significa que rQty es 0 (por min).
                 // Pero si rQty > 0, entonces effectivePQty > 0 (si pQty > 0).
                 // Entonces este else if solo se alcanza si pQty=0 (cubierto abajo) o lógica rara.
                 // Si pQty > 0 y rQty > 0, effective siempre > 0.
                 // Si rQty = 0, effective = 0. Remainder = 0.
                 // Entonces no entra en if (effective > 0).
                 // Cae aqui? No, porque rQty > 0 es falso.
                 // Cae al siguiente else if (tQty > 0). -> En stock. Correcto.
                 status = `En recepción: ${rQty}`;
            }
            // Si rQty es 0, cae al final (En stock o Sin inventario).
            displayLoc = '—';
        } else if (rQty > 0) {
            status = `En recepción: ${rQty}`;
            // El usuario pidió NO mostrar ubicación si está en recepción
            displayLoc = '—';
        } else if (tQty > 0) {
            status = 'En stock';
            // Priorizar ubicación con stock (no recepción)
            const l = locs.find(x => !x.isRecv && x.qty > 0) || locs.find(x => x.qty > 0);
            if (l) displayLoc = l.code;
        } else {
            // Usar cualquier ubicación disponible si no hay stock, EXCEPTO recepción
            const l = locs.find(x => !x.isRecv);
            if (l) displayLoc = l.code;
        }
        
        infoMap[pid] = { location: displayLoc || '—', status };
      });

      setInventoryInfoByProduct(infoMap);
      setStockTotalsByProduct(totalMap);
      setReceivingUnitsByProduct(recvMap);
      setReceivingUnitsCount(recvTotal);
    } catch (e) {
      console.warn('No se pudo cargar información de inventario para productos:', e);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Suscripción en tiempo real a cambios del catálogo de productos
  const refreshTimeoutRef = React.useRef<number | null>(null);
  useEffect(() => {
    const channel = supabase
      .channel('realtime:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        // Debounce para evitar múltiples refrescos en lotes
        if (refreshTimeoutRef.current) {
          window.clearTimeout(refreshTimeoutRef.current);
        }
        refreshTimeoutRef.current = window.setTimeout(() => {
          fetchProducts();
        }, 400);
      });

    channel.subscribe();

    const manualRefreshHandler = () => fetchProducts();
    window.addEventListener('products:refresh', manualRefreshHandler);

    return () => {
      try { channel.unsubscribe(); } catch {}
      window.removeEventListener('products:refresh', manualRefreshHandler);
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, []);

  const sortedProducts = [...products].sort((a, b) => {
    let aValue: string = sortBy === 'sku' ? a.sku : a.name;
    let bValue: string = sortBy === 'sku' ? b.sku : b.name;
    return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
  });

  // Handlers de edición y eliminación
  const openEditModal = async (p: ProductRow) => {
    setEditProduct(p);
    setEditMin(String(p.min_stock_level ?? 0));
    setEditReorder(String(p.reorder_point ?? (p.min_stock_level ?? 0)));
    setEditMax(String((p as any).max_stock_level ?? ''));
    // Cargar ubicaciones y default_location del producto
    await loadLocations();
    try {
      const { data } = await supabase
        .from('products')
        .select('default_location_id')
        .eq('id', p.id)
        .single();
      const defId = (data as any)?.default_location_id ? String((data as any).default_location_id) : '';
      setEditLocationId(defId || '');
    } catch {}
    setShowEditModal(true);
  };

  const loadLocations = async () => {
    try {
      // Preferir backend
      if (AUTH_BACKEND_URL) {
        const token = localStorage.getItem('app_token');
        const resp = await fetch(`${AUTH_BACKEND_URL}/locations`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (resp.ok) {
          const json = await resp.json();
          const list = Array.isArray(json.locations) ? json.locations : [];
          setLocations(
            list
              .filter((l: any) => l.is_active !== false)
              .map((l: any) => ({ id: String(l.id), code: String(l.code || ''), name: l.name || null, location_type: l.location_type || null, warehouse_id: String(l.warehouse_id || '') }))
          );
          return;
        }
      }
      // Fallback Supabase
      const { data } = await supabase
        .from('locations')
        .select('id, warehouse_id, code, name, location_type, is_active')
        .eq('is_active', true)
        .order('code', { ascending: true });
      const list = Array.isArray(data) ? data : [];
      setLocations(list.map((l: any) => ({ id: String(l.id), code: String(l.code || ''), name: l.name || null, location_type: l.location_type || null, warehouse_id: String(l.warehouse_id || '') })));
    } catch (e) {
      console.warn('No se pudieron cargar ubicaciones:', e);
    }
  };

  const saveProductThresholds = async () => {
    if (!editProduct) return;
    const id = editProduct.id;
    const payload: any = {
      min_stock_level: Number(editMin || 0),
      reorder_point: Number(editReorder || 0),
    };
    const maxVal = editMax.trim();
    if (maxVal !== '') payload.max_stock_level = Number(maxVal || 0);
    else payload.max_stock_level = null;
    // Incluir ubicación seleccionada
    payload.default_location_id = editLocationId || null;

    try {
      // Preferir backend
      const token = localStorage.getItem('app_token');
      if (AUTH_BACKEND_URL) {
        const resp = await fetch(`${AUTH_BACKEND_URL}/products/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) {
          const t = await resp.text();
          throw new Error(t || 'Error actualizando producto');
        }
      } else {
        const { error } = await supabase
          .from('products')
          .update({
            min_stock_level: payload.min_stock_level,
            reorder_point: payload.reorder_point,
            max_stock_level: payload.max_stock_level,
            default_location_id: payload.default_location_id,
          })
          .eq('id', id);
        if (error) throw error;
        // Fallback: asegurar inventario en la ubicación elegida si no existe
        if (payload.default_location_id) {
          const loc = locations.find(l => l.id === payload.default_location_id);
          if (loc && loc.warehouse_id) {
            const { data: exists } = await supabase
              .from('inventory')
              .select('id')
              .eq('product_id', id)
              .eq('location_id', loc.id)
              .eq('warehouse_id', loc.warehouse_id)
              .limit(1);
            if (!exists || exists.length === 0) {
              const nowIso = new Date().toISOString();
              await supabase
                .from('inventory')
                .insert({
                  product_id: id,
                  warehouse_id: loc.warehouse_id,
                  location_id: loc.id,
                  quantity: 0,
                  reserved_quantity: 0,
                  last_movement_at: nowIso,
                  created_at: nowIso,
                  updated_at: nowIso,
                });
            }
          }
        }
      }
      setShowEditModal(false);
      setEditProduct(null);
      await fetchProducts();
    } catch (e: any) {
      alert(`No se pudo guardar: ${e?.message || e}`);
    }
  };

  const deleteProduct = async (p: ProductRow) => {
    const confirmed = window.confirm(`¿Eliminar el producto "${p.name}" (${p.sku})? Se marcará como inactivo.`);
    if (!confirmed) return;
    try {
      // Soft delete: is_active=false
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', p.id);
      if (error) throw error;
      await fetchProducts();
    } catch (e: any) {
      alert(`No se pudo eliminar: ${e?.message || e}`);
    }
  };

  // Resaltado temporal al detectar nuevos productos tras sincronización
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('notify_products_last');
      if (!raw) return;
      const payload = JSON.parse(raw);
      const count = Number(payload?.newCount ?? payload?.count ?? 0);
      const ts = Number(payload?.ts ?? Date.now());
      const withinWindow = Date.now() - ts < 5 * 60 * 1000; // 5 minutos
      if (sortedProducts.length > 0 && count > 0 && withinWindow) {
        setHighlightCount(Math.min(count, sortedProducts.length));
        setShowHighlightBanner(true);
        window.setTimeout(() => {
          setHighlightCount(0);
          setShowHighlightBanner(false);
          try { sessionStorage.removeItem('notify_products_last'); } catch {}
        }, 3500);
      }
    } catch {
      // ignore
    }
  }, [sortedProducts]);

  // Abrir detalle automáticamente desde la URL (preferir SKU)
  useEffect(() => {
    try {
      const openSku = searchParams.get('openSku');
      const openId = searchParams.get('openId');
      if ((openSku || openId) && !openedFromParamsRef.current) {
        openedFromParamsRef.current = true;
        let prod: ProductRow | undefined;
        if (openSku) {
          prod = sortedProducts.find(p => String(p.sku) === String(openSku));
        }
        if (!prod && openId) {
          const idStr = String(openId);
          prod = sortedProducts.find(p => String(p.id) === idStr);
        }
        if (prod) {
          handleViewProduct(prod);
        } else {
          // Fallback: construir un row mínimo y dejar que handleViewProduct resuelva
          const fallback: ProductRow = {
            id: String(openId || 'unknown'),
            sku: String(openSku || ''),
            name: 'Producto',
            category: 'general',
            cost_price: null,
            selling_price: null,
            min_stock_level: null,
            reorder_point: null,
            is_active: true
          };
          handleViewProduct(fallback);
        }
      }
    } catch (e) {
      console.debug('No se pudo abrir desde parámetros de URL:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedProducts, searchParams]);

  const isUUID = (v: any) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  const openProductLabel = (p: ProductRow) => {
    const loc = inventoryInfoByProduct[p.id]?.location ?? null;
    const extended: any = p as any;
    setLabelProduct({
      id: String(p.id),
      sku: String(p.sku || ''),
      name: String(p.name || 'Producto'),
      barcode: extended.barcode || null,
      category: p.category || null,
      location: loc,
    });
    setShowProductLabelModal(true);
  };

  const handleCloseProductLabel = () => {
    setShowProductLabelModal(false);
    setLabelProduct(null);
  };
  const handleViewProduct = async (prod: ProductRow) => {
    try {
      setDetailError(null);
setDetailLoading?.(true);
      let query = supabase
        .from('products')
        .select('id, sku, name, description, unit_of_measure, cost_price, selling_price, min_stock_level, max_stock_level, reorder_point, barcode, weight, dimensions, is_active, categories(name)')
        .limit(1);
      if (prod.sku) {
        // Priorizar búsqueda por SKU
        query = query.eq('sku', prod.sku);
      } else if (isUUID(prod.id)) {
        query = query.eq('id', prod.id);
      } else {
        throw new Error('Identificador de producto inválido');
      }
      const { data, error } = await query.single();
      if (error) throw error;
      const detail = {
        ...data,
        category: (data as any)?.categories?.name ?? 'Sin categoría',
      };
      setSelectedProduct(detail);
      setShowProductModal(true);
    } catch (e: any) {
      console.error('Error al cargar detalle del producto:', e);
      setDetailError(e?.message || 'No se pudo cargar el detalle');
      setSelectedProduct({
        id: prod.id,
        sku: prod.sku,
        name: prod.name,
        category: prod.category,
        cost_price: prod.cost_price,
        selling_price: prod.selling_price,
        min_stock_level: prod.min_stock_level,
        reorder_point: prod.reorder_point,
        is_active: prod.is_active,
      });
      setShowProductModal(true);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando productos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Catálogo de Productos ({sortedProducts.length})</h3>
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Conteo agregado en recepción */}
          <div className="flex items-center flex-wrap max-w-[140px] sm:max-w-none px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            <span className="text-[10px] sm:text-xs">En recepción:</span>
            <span className="ml-1 text-[10px] sm:text-xs font-semibold">{receivingUnitsCount}</span>
          </div>
          <span className="text-sm text-gray-500">Ordenar por:</span>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as 'sku' | 'name');
              setSortOrder(order as 'asc' | 'desc');
            }}
            className="text-sm border border-gray-300 rounded-md px-2 py-1"
          >
            <option value="sku-asc">SKU (A-Z)</option>
            <option value="sku-desc">SKU (Z-A)</option>
            <option value="name-asc">Nombre (A-Z)</option>
            <option value="name-desc">Nombre (Z-A)</option>
          </select>
          <button
            onClick={fetchProducts}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </button>
          {AUTH_BACKEND_URL && (
            <button
              onClick={async () => {
                try {
                  const ok = window.confirm('¿Agregar +5 unidades a todos los productos activos?');
                  if (!ok) return;
                  const token = localStorage.getItem('app_token');
                  const resp = await fetch(`${AUTH_BACKEND_URL}/inventory/add_quantity_all`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(token ? { Authorization: `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({ quantity: 5, use_default_location: true })
                  });
                  if (!resp.ok) {
                    const t = await resp.text();
                    alert(`Error al ajustar inventario: ${t}`);
                    return;
                  }
                  const json = await resp.json();
                  const created = Number((json || {}).created || 0);
                  const errs = Array.isArray((json || {}).errors) ? (json.errors as any[]).length : 0;
                  alert(`Ajuste masivo creado: ${created} movimientos${errs ? `, errores: ${errs}` : ''}`);
                  await fetchProducts();
                } catch (e: any) {
                  alert(`No se pudo crear el ajuste masivo: ${e?.message || e}`);
                }
              }}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50"
              title="Agregar +5 a todos los productos"
            >
              +5 a todos
            </button>
          )}
          {AUTH_BACKEND_URL && (
            <button
              onClick={async () => {
                try {
                  const confirmRun = window.confirm('Asignar ubicaciones aleatorias a productos sin ubicación?');
                  if (!confirmRun) return;
                  const token = localStorage.getItem('app_token');
                  const resp = await fetch(`${AUTH_BACKEND_URL}/inventory/assign_random_locations`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(token ? { Authorization: `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({ only_missing: true })
                  });
                  if (!resp.ok) {
                    const errTxt = await resp.text();
                    alert(`Error asignando ubicaciones: ${errTxt}`);
                    return;
                  }
                  const json = await resp.json();
                  const created = Number((json || {}).created || 0);
                  alert(`Asignadas ${created} ubicaciones aleatorias`);
                  await fetchProducts();
                } catch (e: any) {
                  alert(`No se pudo asignar ubicaciones: ${e?.message || e}`);
                }
              }}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50"
              title="Asignar ubicaciones aleatorias a faltantes"
            >
              Agregar ubicaciones aleatorias
            </button>
          )}
        </div>
      </div>

      {showHighlightBanner && highlightCount > 0 && (
        <div className="flex items-center text-sm bg-yellow-100 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-md">
          <span className="font-medium mr-2">Nuevos productos:</span>
          <span>{highlightCount}</span>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entrada</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salidas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedProducts.map((p, idx) => (
                <tr key={p.id} className={`hover:bg-gray-50 ${highlightCount > 0 && idx < highlightCount ? 'bg-yellow-50 transition-colors' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{p.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-mono">{p.sku || '—'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{p.category || 'Sin categoría'}</div>
                  </td>
                  {/* Stock total */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stockTotalsByProduct[p.id] ?? 0}
                  </td>
                  {/* Ubicación */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="text-sm text-gray-900">{inventoryInfoByProduct[p.id]?.location ?? '—'}</div>
                      <button onClick={() => openProductLabel(p)} className="text-gray-600 hover:text-gray-900" title="Imprimir etiqueta">
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  {/* Estado */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const status = inventoryInfoByProduct[p.id]?.status;
                      
                      return (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          status === 'En stock'
                            ? 'bg-green-50 text-green-700'
                            : (String(status || '').includes('Acomodo') || String(status || '').includes('Recepción')) 
                                ? 'bg-blue-50 text-blue-700' 
                                : 'bg-gray-100 text-gray-600'
                        }`}>
                          {status ?? '—'}
                        </span>
                      );
                    })()}
                  </td>
                  {/* Salidas */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const data = packingQtyByProduct[String(p.sku || '').trim().toUpperCase()];
                      if (data && data.qty > 0) {
                        const isEmbarked = data.status === 'embarked' || data.status === 'shipped';
                        return (
                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                             isEmbarked ? 'bg-indigo-100 text-indigo-800' : 'bg-orange-100 text-orange-800'
                           }`}>
                             {isEmbarked ? 'Embarcado: ' : 'Empaquetado: '}{data.qty}
                           </span>
                        );
                      }
                      return <span className="text-gray-400 text-sm">—</span>;
                    })()}
                  </td>
                  {/* Precio */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(Number(p.selling_price ?? 0))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <div className="flex items-center justify-end space-x-2">
              <button onClick={() => handleViewProduct(p)} className="text-blue-600 hover:text-blue-900" title="Ver detalles">
                <Eye className="h-4 w-4" />
              </button>
              <button onClick={() => openEditModal(p)} className="text-gray-600 hover:text-gray-900" title="Editar">
                <Edit className="h-4 w-4" />
              </button>
              <button onClick={() => deleteProduct(p)} className="text-gray-600 hover:text-gray-900" title="Eliminar">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </td>
        </tr>
      ))}
            </tbody>
          </table>
        </div>
      </div>

      {sortedProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron productos</h3>
          <p className="mt-1 text-sm text-gray-500">Intenta ajustar los filtros de búsqueda.</p>
        </div>
      )}

      {showProductModal && selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          locationCode={inventoryInfoByProduct[String(selectedProduct.id)]?.location}
          onClose={() => { setShowProductModal(false); setSelectedProduct(null); }}
        />
      )}

      {showProductLabelModal && (
        <ProductLabelModal
          isOpen={showProductLabelModal}
          onClose={handleCloseProductLabel}
          autoPrint={false}
          product={labelProduct}
        />
      )}

      {showEditModal && editProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Editar producto</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700">Nivel mínimo</label>
                <input value={editMin} onChange={(e) => setEditMin(e.target.value)} type="number" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Punto de reorden</label>
                <input value={editReorder} onChange={(e) => setEditReorder(e.target.value)} type="number" className="mt-1 w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Nivel máximo (opcional)</label>
                <input value={editMax} onChange={(e) => setEditMax(e.target.value)} type="number" className="mt-1 w-full border rounded-md px-3 py-2" placeholder="" />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Ubicación por defecto</label>
                <select
                  value={editLocationId}
                  onChange={(e) => setEditLocationId(e.target.value)}
                  className="mt-1 w-full border rounded-md px-3 py-2"
                >
                  <option value="">— Sin ubicación —</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.code}{l.location_type ? ` (${l.location_type})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button onClick={() => setShowEditModal(false)} className="px-3 py-2 border rounded-md">Cancelar</button>
              <button onClick={saveProductThresholds} className="px-3 py-2 bg-blue-600 text-white rounded-md">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
