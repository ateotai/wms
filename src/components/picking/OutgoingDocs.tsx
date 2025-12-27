import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Package, Shuffle, Search, RefreshCw, ListOrdered, Boxes } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

type SalesOrderRow = {
  so_number: string;
  customer_name?: string | null;
  shipping_address?: string | null;
  status?: string | null;
  order_date?: string | null;
  required_date?: string | null;
  total_amount?: number | null;
};

type TransferRow = {
  transfer_number: string;
  to_warehouse_id?: string | null;
  status?: string | null;
  transfer_date?: string | null;
  expected_date?: string | null;
};

type Warehouse = {
  id: string;
  name: string;
  code?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
};

export function OutgoingDocs() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [salesOrders, setSalesOrders] = useState<SalesOrderRow[]>([]);
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [salesItems, setSalesItems] = useState<Array<{ so_number: string; status?: string | null; sku?: string; name?: string; description?: string; quantity: number }>>([]);
  const [transferItems, setTransferItems] = useState<Array<{ transfer_number: string; status?: string | null; sku?: string; name?: string; description?: string; quantity: number }>>([]);
  const [warehousesMap, setWarehousesMap] = useState<Record<string, Warehouse>>({});

  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'documents' | 'items'>('documents');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        { data: soData, error: soErr },
        { data: trData, error: trErr },
        { data: soItemsData, error: soItemsErr },
        { data: trItemsData, error: trItemsErr }
      ] = await Promise.all([
        supabase
          .from('sales_orders')
          .select('so_number, customer_name, shipping_address, status, order_date, required_date, total_amount')
          .order('order_date', { ascending: false })
          .limit(200),
        supabase
          .from('transfers')
          .select('transfer_number, to_warehouse_id, status, transfer_date, expected_date')
          .order('transfer_date', { ascending: false })
          .limit(200),
        supabase
          .from('sales_order_items')
          .select('product_id, quantity, products:product_id(id, sku, name, description), sales_orders:sales_order_id(id, so_number, status)')
          .limit(500),
        supabase
          .from('transfer_items')
          .select('product_id, quantity, products:product_id(id, sku, name, description), transfers:transfer_id(id, transfer_number, status)')
          .limit(500)
      ]);

      if (soErr) throw soErr;
      if (trErr) throw trErr;
      if (soItemsErr) throw soItemsErr;
      if (trItemsErr) throw trItemsErr;

      setSalesOrders((soData || []) as SalesOrderRow[]);
      const transfersRows = (trData || []) as TransferRow[];
      setTransfers(transfersRows);

      // Fallback: si el join de productos no devuelve datos (por políticas RLS),
      // consultar productos por product_id y completar SKU/nombre.
      const soProdIds: string[] = Array.from(new Set((soItemsData || []).map((r: any) => r?.product_id).filter(Boolean)));
      const trProdIds: string[] = Array.from(new Set((trItemsData || []).map((r: any) => r?.product_id).filter(Boolean)));
      const allProdIds = Array.from(new Set([...(soProdIds || []), ...(trProdIds || [])]));

      let prodMap: Record<string, { sku?: string; name?: string; description?: string }> = {};
      if (allProdIds.length > 0) {
        try {
          const { data: prodData, error: prodErr } = await supabase
            .from('products')
            .select('id, sku, name, description')
            .in('id', allProdIds);
          if (!prodErr) {
            (prodData || []).forEach((p: any) => {
              prodMap[p.id] = { sku: p?.sku, name: p?.name, description: p?.description };
            });
          }
        } catch {}
        // Fallback definitivo: pedir al backend detalles de productos por IDs
        const needBackendFallback = allProdIds.some(id => !prodMap[id]);
        if (needBackendFallback) {
const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
          try {
            const resp = await fetch(`${AUTH_BACKEND_URL}/products/byIds`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids: allProdIds })
            });
            if (resp.ok) {
              const json = await resp.json();
              const items = Array.isArray(json?.items) ? json.items : [];
              (items || []).forEach((p: any) => {
                prodMap[p.id] = { sku: p?.sku, name: p?.name, description: p?.description };
              });
            }
          } catch {}
        }
      }

      const normSoItems = (soItemsData || []).map((r: any) => ({
        so_number: String(r?.sales_orders?.so_number || ''),
        status: r?.sales_orders?.status || null,
        sku: r?.products?.sku || prodMap[r?.product_id]?.sku || undefined,
        name: r?.products?.name || prodMap[r?.product_id]?.name || undefined,
        description: r?.products?.description || prodMap[r?.product_id]?.description || undefined,
        quantity: Number(r?.quantity || 0)
      })).filter((r: any) => r.so_number);
      const normTrItems = (trItemsData || []).map((r: any) => ({
        transfer_number: String(r?.transfers?.transfer_number || ''),
        status: r?.transfers?.status || null,
        sku: r?.products?.sku || prodMap[r?.product_id]?.sku || undefined,
        name: r?.products?.name || prodMap[r?.product_id]?.name || undefined,
        description: r?.products?.description || prodMap[r?.product_id]?.description || undefined,
        quantity: Number(r?.quantity || 0)
      })).filter((r: any) => r.transfer_number);
      setSalesItems(normSoItems);
      setTransferItems(normTrItems);

      // Construir mapa de warehouses destino para mostrar sucursal/dirección en traspasos
      const destIds = Array.from(new Set(transfersRows
        .map(t => t.to_warehouse_id)
        .filter((id): id is string => !!id)));
      if (destIds.length > 0) {
        const { data: whData, error: whErr } = await supabase
          .from('warehouses')
          .select('id, name, code, address, city, state')
          .in('id', destIds);
        if (whErr) throw whErr;
        const map: Record<string, Warehouse> = {};
        (whData || []).forEach((w: any) => { map[w.id] = w as Warehouse; });
        setWarehousesMap(map);
      } else {
        setWarehousesMap({});
      }
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar documentos de salida');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSales = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return salesOrders.slice(0, 3);
    return salesOrders.filter(r =>
      (r.so_number || '').toLowerCase().includes(q) ||
      (r.customer_name || '').toLowerCase().includes(q) ||
      (r.shipping_address || '').toLowerCase().includes(q) ||
      (r.status || '').toLowerCase().includes(q)
    );
  }, [search, salesOrders]);

  const filteredTransfers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transfers.slice(0, 3);
    return transfers.filter(r =>
      (r.transfer_number || '').toLowerCase().includes(q) ||
      (r.status || '').toLowerCase().includes(q) ||
      (() => {
        const wh = r.to_warehouse_id ? warehousesMap[r.to_warehouse_id] : undefined;
        const label = wh ? `${wh.name || ''}`.toLowerCase() : '';
        return label.includes(q);
      })()
    );
  }, [search, transfers, warehousesMap]);

  const filteredSalesItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      const lastThree = new Set((salesOrders || []).slice(0, 3).map(o => o.so_number));
      return salesItems.filter(r => lastThree.has(r.so_number));
    }
    return salesItems.filter(r =>
      (r.so_number || '').toLowerCase().includes(q) ||
      (r.sku || '').toLowerCase().includes(q) ||
      (r.name || '').toLowerCase().includes(q) ||
      (r.status || '').toLowerCase().includes(q)
    );
  }, [search, salesItems, salesOrders]);

  const filteredTransferItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      const lastThree = new Set((transfers || []).slice(0, 3).map(t => t.transfer_number));
      return transferItems.filter(r => lastThree.has(r.transfer_number));
    }
    return transferItems.filter(r =>
      (r.transfer_number || '').toLowerCase().includes(q) ||
      (r.sku || '').toLowerCase().includes(q) ||
      (r.name || '').toLowerCase().includes(q) ||
      (r.status || '').toLowerCase().includes(q)
    );
  }, [search, transferItems, transfers]);

  const statusBadge = (status?: string | null) => {
    const s = String(status || 'pendiente').toLowerCase();
    let color = 'bg-gray-100 text-gray-700';
    if (['open', 'pending', 'pendiente'].includes(s)) color = 'bg-yellow-100 text-yellow-800';
    else if (['released', 'ready', 'listo'].includes(s)) color = 'bg-blue-100 text-blue-800';
    else if (['in_progress', 'picking', 'en progreso'].includes(s)) color = 'bg-indigo-100 text-indigo-800';
    else if (['completed', 'closed', 'cerrado'].includes(s)) color = 'bg-green-100 text-green-800';
    else if (['cancelled', 'error'].includes(s)) color = 'bg-red-100 text-red-800';
    return <span className={`px-2 py-1 rounded text-xs ${color}`}>{status || '—'}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Doc Salidas</h2>
          <p className="text-gray-600">Pedidos de venta y traspasos listos para picking</p>
          <p className="text-xs text-gray-500 mt-1">Las olas de picking solo pueden agrupar documentos del mismo tipo.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por número, cliente o estado"
            className="pl-10 pr-3 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="ml-4 flex items-center bg-gray-100 rounded-md overflow-hidden">
          <button
            className={`inline-flex items-center px-3 py-2 text-sm ${mode==='documents' ? 'bg-white border border-gray-300' : ''}`}
            onClick={() => setMode('documents')}
          >
            <ListOrdered className="w-4 h-4 mr-2" /> Documentos
          </button>
          <button
            className={`inline-flex items-center px-3 py-2 text-sm ${mode==='items' ? 'bg-white border border-gray-300' : ''}`}
            onClick={() => setMode('items')}
          >
            <Boxes className="w-4 h-4 mr-2" /> Productos
          </button>
        </div>
      </div>

      {mode === 'documents' ? (
        <>
          {/* Sales Orders */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center">
              <Package className="w-4 h-4 text-blue-600 mr-2" />
              <h3 className="font-semibold text-gray-900">Pedidos de Venta</h3>
              <span className="ml-2 text-xs text-gray-500">{filteredSales.length} registros</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nº Pedido</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cliente</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Dirección de envío</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Requerido</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Estado</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSales.map((r) => (
                    <tr key={`so-${r.so_number}`} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{r.so_number}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{r.customer_name || '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{r.shipping_address || '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{r.order_date ? new Date(r.order_date).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{r.required_date ? new Date(r.required_date).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-2 text-sm">{statusBadge(r.status)}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{r.total_amount != null ? formatCurrency(Number(r.total_amount), 'MXN') : '—'}</td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={7}>
                        No hay pedidos de venta para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transfers */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center">
              <Shuffle className="w-4 h-4 text-indigo-600 mr-2" />
              <h3 className="font-semibold text-gray-900">Traspasos</h3>
              <span className="ml-2 text-xs text-gray-500">{filteredTransfers.length} registros</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nº Traspaso</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Destino</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Esperado</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransfers.map((r) => (
                    <tr key={`tr-${r.transfer_number}`} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{r.transfer_number}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                       {(() => {
                         const wh = r.to_warehouse_id ? warehousesMap[r.to_warehouse_id] : undefined;
                         if (!wh) return '—';
                         return wh.name || '—';
                       })()}
                     </td>
                      <td className="px-4 py-2 text-sm text-gray-700">{r.transfer_date ? new Date(r.transfer_date).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{r.expected_date ? new Date(r.expected_date).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-2 text-sm">{statusBadge(r.status)}</td>
                    </tr>
                  ))}
                  {filteredTransfers.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={5}>
                        No hay traspasos para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Productos en Pedidos de Venta */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center">
              <Boxes className="w-4 h-4 text-blue-600 mr-2" />
              <h3 className="font-semibold text-gray-900">Productos en Pedidos de Venta</h3>
              <span className="ml-2 text-xs text-gray-500">{filteredSalesItems.length} renglones</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nº Pedido</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">SKU</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Producto</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Descripción</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cantidad</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Estado Doc</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSalesItems.map((r, idx) => (
                    <tr key={`soi-${r.so_number}-${r.sku}-${idx}`} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{r.so_number}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{r.sku || '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{r.name || '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{r.description || '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{r.quantity}</td>
                      <td className="px-4 py-2 text-sm">{statusBadge(r.status)}</td>
                    </tr>
                  ))}
                  {filteredSalesItems.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={6}>
                        No hay productos de pedidos de venta para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Productos en Traspasos */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center">
              <Boxes className="w-4 h-4 text-indigo-600 mr-2" />
              <h3 className="font-semibold text-gray-900">Productos en Traspasos</h3>
              <span className="ml-2 text-xs text-gray-500">{filteredTransferItems.length} renglones</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nº Traspaso</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">SKU</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Producto</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Descripción</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cantidad</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Estado Doc</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransferItems.map((r, idx) => (
                    <tr key={`tri-${r.transfer_number}-${r.sku}-${idx}`} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{r.transfer_number}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{r.sku || '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{r.name || '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{r.description || '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{r.quantity}</td>
                      <td className="px-4 py-2 text-sm">{statusBadge(r.status)}</td>
                    </tr>
                  ))}
                  {filteredTransferItems.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={6}>
                        No hay productos de traspasos para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default OutgoingDocs;
