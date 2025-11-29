import { useEffect, useRef, useState } from 'react';
import { Routes, Route as RouterRoute, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Package, 
  Truck, 
  FileText, 
  Clock, 
  Filter,
  Search,
  RefreshCw,
  Plus,
  Download,
  Layers
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ShippingOrders } from './ShippingOrders';
import { PackingTasks } from './PackingTasks';
import { Labeling } from './Labeling';
import { useAuth } from '../../contexts/AuthContext';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

export function PackingDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const location = useLocation();
  const { token, user } = useAuth();
  const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
  const [packingMode, setPackingMode] = useState<'single_order' | 'batch' | 'wave' | 'multistep'>('single_order');
  const [batchList, setBatchList] = useState<Array<{ id: string; name: string; orders: number; items: number; status: string; zone?: string }>>([]);
  const [waveList, setWaveList] = useState<Array<{ id: string; name: string; batches: number; totalOrders: number; totalItems: number; status: string }>>([]);
  const [waveBatches, setWaveBatches] = useState<Record<string, string[]>>({});
  const [loadingModes, setLoadingModes] = useState(false);
  const [availableDocs, setAvailableDocs] = useState<Array<{ id: string; type: 'order' | 'transfer'; docNumber: string; status?: string }>>([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [selectedWaveIds, setSelectedWaveIds] = useState<string[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<Array<{ type: 'order' | 'transfer'; id: string; docNumber: string; status?: string }>>([]);
  const [showNewPackageModal, setShowNewPackageModal] = useState(false);
  const [newPackageItems, setNewPackageItems] = useState<Array<{ id: string; product: string; sku: string; quantity: number; weight: number; dimensions: string; doc?: string }>>([]);
  const [newPackageMeta, setNewPackageMeta] = useState<{ model: string; batchCodes: string[]; operator: string; station: string; status: 'pending'|'in_process'|'completed'; totalOrders: number; totalItems: number }>({ model: 'Empaque por Lote', batchCodes: [], operator: '', station: 'E-01', status: 'pending', totalOrders: 0, totalItems: 0 });
  const [printData, setPrintData] = useState<{ packageId: string; model: string; batchCodes: string[]; operator: string; station: string; status: string; totalOrders: number; totalItems: number; createdAt: string } | null>(null);
  const qrRef = useRef<HTMLCanvasElement | null>(null);
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  useEffect(() => {
    if (!printData) return;
    try {
      if (qrRef.current) {
        const payload = JSON.stringify(printData);
        QRCode.toCanvas(qrRef.current, payload, { width: 180 }).catch(() => {});
      }
      if (barcodeRef.current) {
        JsBarcode(barcodeRef.current, printData.packageId, { format: 'CODE128', width: 2, height: 50, displayValue: true });
      }
    } catch {}
  }, [printData]);

  const tabs = [
    { name: 'Preparación de Paquetes', href: '/packing/orders', icon: FileText },
    { name: 'Empaquetado', href: '/packing/tasks', icon: Package },
    { name: 'Etiquetar', href: '/packing/labeling', icon: FileText }
  ];

  const isActiveTab = (href: string) => {
    return location.pathname.startsWith(href);
  };
  const navigate = useNavigate();

  const openNewPackage = async () => {
    const AUTH = AUTH_BACKEND_URL;
    const t = token;
    if (packingMode === 'single_order' && selectedDocs.length === 0) { alert('Selecciona al menos un documento (pedido o traspaso)'); return; }
    if (packingMode === 'batch' && selectedBatchIds.length === 0) { alert('Selecciona al menos un lote de picking'); return; }
    if (packingMode === 'wave' && selectedWaveIds.length === 0) { alert('Selecciona al menos una ola de picking'); return; }
    if (packingMode === 'multistep' && selectedBatchIds.length === 0 && selectedWaveIds.length === 0) { alert('Selecciona al menos un lote u ola de picking'); return; }
    const fetchItems = async (batchId: string) => {
      try {
        const r = await fetch(`${AUTH}/picking/batches/${batchId}/items`, { headers: t ? { Authorization: `Bearer ${t}` } : undefined });
        if (!r.ok) return [] as Array<{ id: string; product: string; sku: string; quantity: number; weight: number; dimensions: string }>;
        const j = await r.json();
        const items = Array.isArray(j?.items) ? j.items : [];
        const ids = Array.from(new Set(items.map((it: any) => String(it.productId || '')).filter(Boolean)));
        let names: Record<string, { name?: string; sku?: string }> = {};
        if (ids.length > 0) {
          const rr = await fetch(`${AUTH}/products/byIds`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
          const jj = await rr.json().catch(() => ({} as any));
          const arr = Array.isArray(jj?.items) ? jj.items : [];
          for (const a of arr) names[String(a.id)] = { name: a.name, sku: a.sku };
        }
        return items.map((it: any) => ({ id: String(it.id || ''), product: names[String(it.productId)]?.name || String(it.sku || it.productId), sku: names[String(it.productId)]?.sku || String(it.sku || ''), quantity: Number(it.quantity ?? it.pickedQuantity ?? 1), weight: Number(it.weight ?? 0), dimensions: String(it.dimensions ?? '') }));
      } catch { return [] as Array<{ id: string; product: string; sku: string; quantity: number; weight: number; dimensions: string }>; }
    };
    let compiled: Array<{ id: string; product: string; sku: string; quantity: number; weight: number; dimensions: string }> = [];
    let batchIds: string[] = [];
    let batchCodes: string[] = [];
    let totalItems = 0;
    let ordersNumbers: string[] = [];
    const docBySku: Record<string, string> = {};
    if (packingMode === 'batch') {
      for (const id of selectedBatchIds) { compiled = compiled.concat(await fetchItems(id)); batchIds.push(id); const name = (batchList.find(b => b.id === id)?.name) || id; batchCodes.push(name); }
      totalItems = compiled.reduce((s, it) => s + Number(it.quantity || 0), 0);
      try {
        const r = await fetch(`${AUTH}/picking/batches?status=completed`, { headers: t ? { Authorization: `Bearer ${t}` } : undefined });
        const j = await r.json().catch(() => ({} as any));
        const arr = Array.isArray(j?.batches) ? j.batches : [];
        for (const bid of batchIds) {
          const bb = arr.find((b: any) => String(b.id) === String(bid));
          const nums = Array.isArray(bb?.orders) ? bb.orders.map((o: any) => String(o.number || '')).filter(Boolean) : [];
          ordersNumbers = Array.from(new Set([...ordersNumbers, ...nums]));
        }
        for (const num of ordersNumbers) {
          try {
            const rr = await fetch(`${AUTH}/sales_orders/${encodeURIComponent(num)}`, { headers: t ? { Authorization: `Bearer ${t}` } : undefined });
            const jj = await rr.json().catch(() => ({} as any));
            const items = Array.isArray(jj?.sales_order?.items) ? jj.sales_order.items : [];
            for (const it of items) {
              const sku = String(it?.products?.sku || it?.sku || '').trim();
              if (sku) docBySku[sku] = num;
            }
          } catch {}
        }
      } catch {}
    } else if (packingMode === 'wave') {
      for (const wid of selectedWaveIds) {
        const bIds = waveBatches[wid] || [];
        for (const id of bIds) { compiled = compiled.concat(await fetchItems(id)); batchIds.push(id); const name = (batchList.find(b => b.id === id)?.name) || id; batchCodes.push(name); }
      }
      totalItems = compiled.reduce((s, it) => s + Number(it.quantity || 0), 0);
      try {
        const r = await fetch(`${AUTH}/picking/batches?status=completed`, { headers: t ? { Authorization: `Bearer ${t}` } : undefined });
        const j = await r.json().catch(() => ({} as any));
        const arr = Array.isArray(j?.batches) ? j.batches : [];
        for (const bid of batchIds) {
          const bb = arr.find((b: any) => String(b.id) === String(bid));
          const nums = Array.isArray(bb?.orders) ? bb.orders.map((o: any) => String(o.number || '')).filter(Boolean) : [];
          ordersNumbers = Array.from(new Set([...ordersNumbers, ...nums]));
        }
        for (const num of ordersNumbers) {
          try {
            const rr = await fetch(`${AUTH}/sales_orders/${encodeURIComponent(num)}`, { headers: t ? { Authorization: `Bearer ${t}` } : undefined });
            const jj = await rr.json().catch(() => ({} as any));
            const items = Array.isArray(jj?.sales_order?.items) ? jj.sales_order.items : [];
            for (const it of items) {
              const sku = String(it?.products?.sku || it?.sku || '').trim();
              if (sku) docBySku[sku] = num;
            }
          } catch {}
        }
      } catch {}
    } else if (packingMode === 'multistep') {
      const allBatchIds: string[] = [];
      for (const id of selectedBatchIds) { compiled = compiled.concat(await fetchItems(id)); allBatchIds.push(id); const name = (batchList.find(b => b.id === id)?.name) || id; batchCodes.push(name); }
      for (const wid of selectedWaveIds) {
        const bIds = waveBatches[wid] || [];
        for (const id of bIds) { compiled = compiled.concat(await fetchItems(id)); allBatchIds.push(id); }
        batchCodes.push(wid);
      }
      totalItems = compiled.reduce((s, it) => s + Number(it.quantity || 0), 0);
      try {
        const r = await fetch(`${AUTH}/picking/batches?status=completed`, { headers: t ? { Authorization: `Bearer ${t}` } : undefined });
        const j = await r.json().catch(() => ({} as any));
        const arr = Array.isArray(j?.batches) ? j.batches : [];
        for (const bid of allBatchIds) {
          const bb = arr.find((b: any) => String(b.id) === String(bid));
          const nums = Array.isArray(bb?.orders) ? bb.orders.map((o: any) => String(o.number || '')).filter(Boolean) : [];
          ordersNumbers = Array.from(new Set([...ordersNumbers, ...nums]));
        }
        for (const num of ordersNumbers) {
          try {
            const rr = await fetch(`${AUTH}/sales_orders/${encodeURIComponent(num)}`, { headers: t ? { Authorization: `Bearer ${t}` } : undefined });
            const jj = await rr.json().catch(() => ({} as any));
            const items = Array.isArray(jj?.sales_order?.items) ? jj.sales_order.items : [];
            for (const it of items) {
              const sku = String(it?.products?.sku || it?.sku || '').trim();
              if (sku) docBySku[sku] = num;
            }
          } catch {}
        }
      } catch {}
    } else if (packingMode === 'single_order') {
      const docNumbers: string[] = selectedDocs.map(d => d.docNumber).filter(Boolean);
      for (const doc of selectedDocs) {
        try {
          if (doc.type === 'order') {
            const isSO = String(doc.status || '').toUpperCase() === 'SO' || /^SO/i.test(String(doc.docNumber));
            const isPO = String(doc.status || '').toUpperCase() === 'PO' || /^PO/i.test(String(doc.docNumber));
            if (isPO) {
              const rr = await fetch(`${AUTH}/purchase_orders/${encodeURIComponent(doc.docNumber)}`, { headers: t ? { Authorization: `Bearer ${t}` } : undefined });
              const jj = await rr.json().catch(() => ({} as any));
              const items = Array.isArray(jj?.purchase_order?.items) ? jj.purchase_order.items : [];
              for (const it of items) {
                const sku = String(it?.products?.sku || it?.sku || '').trim();
                const name = String(it?.products?.name || it?.name || sku || '').trim();
                const qty = Number(it?.quantity || 1);
                if (sku) docBySku[sku] = doc.docNumber;
                compiled.push({ id: `${doc.docNumber}-${sku}`, product: name || sku, sku, quantity: qty, weight: 0, dimensions: '' });
              }
            } else {
              const rr = await fetch(`${AUTH}/sales_orders/${encodeURIComponent(doc.docNumber)}`, { headers: t ? { Authorization: `Bearer ${t}` } : undefined });
              const jj = await rr.json().catch(() => ({} as any));
              const items = Array.isArray(jj?.sales_order?.items) ? jj.sales_order.items : [];
              for (const it of items) {
                const sku = String(it?.products?.sku || it?.sku || '').trim();
                const name = String(it?.products?.name || it?.name || sku || '').trim();
                const qty = Number(it?.quantity || 1);
                if (sku) docBySku[sku] = doc.docNumber;
                compiled.push({ id: `${doc.docNumber}-${sku}`, product: name || sku, sku, quantity: qty, weight: 0, dimensions: '' });
              }
            }
          } else if (doc.type === 'transfer') {
            const rr = await fetch(`${AUTH}/transfers/${encodeURIComponent(doc.docNumber)}`, { headers: t ? { Authorization: `Bearer ${t}` } : undefined });
            const jj = await rr.json().catch(() => ({} as any));
            const items = Array.isArray(jj?.transfer?.items) ? jj.transfer.items : [];
            const ids = Array.from(new Set(items.map((it: any) => String(it.product_id || '')).filter(Boolean)));
            let names: Record<string, { name?: string; sku?: string }> = {};
            if (ids.length > 0) {
              const rnames = await fetch(`${AUTH}/products/byIds`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
              const jnames = await rnames.json().catch(() => ({} as any));
              const arr = Array.isArray(jnames?.items) ? jnames.items : [];
              for (const a of arr) names[String(a.id)] = { name: a.name, sku: a.sku };
            }
            for (const it of items) {
              const pid = String(it?.product_id || '');
              const sku = names[pid]?.sku || pid;
              const name = names[pid]?.name || sku;
              const qty = Number(it?.quantity || 1);
              if (sku) docBySku[sku] = doc.docNumber;
              compiled.push({ id: `${doc.docNumber}-${sku}`, product: name, sku, quantity: qty, weight: 0, dimensions: '' });
            }
          }
        } catch {}
      }
      totalItems = compiled.reduce((s, it) => s + Number(it.quantity || 0), 0);
      ordersNumbers = Array.from(new Set(docNumbers));
    }
    const itemsWithDoc = compiled.map((x) => ({ ...x, doc: docBySku[String(x.sku || '')] || '' }));
    setNewPackageItems(itemsWithDoc);
    const docCodes = packingMode === 'single_order' ? ordersNumbers : (packingMode === 'multistep' ? [...batchCodes] : batchCodes);
    const modelLabel = packingMode === 'batch' ? 'Empaque por Lote' : (packingMode === 'wave' ? 'Empaque por Ola' : (packingMode === 'multistep' ? 'Empaque Multietapa' : 'Empaque por Pedido'));
    setNewPackageMeta({ model: modelLabel, batchCodes: docCodes, operator: String((user?.full_name || user?.email || '') || ''), station: 'E-01', status: 'pending', totalOrders: ordersNumbers.length, totalItems });
    setShowNewPackageModal(true);
  };

  // Métricas reales con fallback a cero
  const [stats, setStats] = useState<Array<{
    title: string;
    value: string;
    change: string;
    changeType: 'increase' | 'decrease';
    icon: LucideIcon;
    color: 'blue' | 'orange' | 'green' | 'purple';
  }>>([
    { title: 'Paquetes Pendientes', value: '0', change: '', changeType: 'increase', icon: Package, color: 'blue' },
    { title: 'En Empaquetado', value: '0', change: '', changeType: 'increase', icon: Package, color: 'orange' },
    { title: 'Listos Hoy', value: '0', change: '', changeType: 'increase', icon: Package, color: 'green' },
    { title: 'Tiempo Promedio Empaque', value: '0.0 min', change: '', changeType: 'increase', icon: Clock, color: 'purple' }
  ]);

  useEffect(() => {
    try {
      const packagesStr = localStorage.getItem('packing_packages');
      const tasksStr = localStorage.getItem('packing_tasks');
      type PackageLocal = { status?: string; createdAt?: string };
      type TasksLocal = { status?: string; estimatedTime?: number; actualTime?: number };
      const packages: PackageLocal[] = packagesStr ? (JSON.parse(packagesStr) as PackageLocal[]) : [];
      const tasks: TasksLocal[] = tasksStr ? (JSON.parse(tasksStr) as TasksLocal[]) : [];

      const pendingPackages = packages.filter((p) => p?.status === 'pending').length;
      const inProgressTasks = tasks.filter((t) => t?.status === 'in_progress').length;
      const today = new Date();
      const readyToday = packages.filter((p) => {
        if (p?.status !== 'completed' || !p?.createdAt) return false;
        const d = new Date(p.createdAt);
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
      }).length;
      const avgTime = tasks.length
        ? (tasks.reduce((sum: number, t) => sum + (Number(t?.actualTime ?? t?.estimatedTime ?? 0)), 0) / tasks.length)
        : 0;

      setStats([
        { title: 'Paquetes Pendientes', value: String(pendingPackages), change: '', changeType: 'increase', icon: Package, color: 'blue' },
        { title: 'En Empaquetado', value: String(inProgressTasks), change: '', changeType: 'increase', icon: Package, color: 'orange' },
        { title: 'Listos Hoy', value: String(readyToday), change: '', changeType: 'increase', icon: Package, color: 'green' },
        { title: 'Tiempo Promedio Empaque', value: `${avgTime.toFixed(1)} min`, change: '', changeType: 'increase', icon: Clock, color: 'purple' }
      ]);
    } catch {}
  }, [location.pathname]);

  useEffect(() => {
    const loadBatches = async () => {
      if (!AUTH_BACKEND_URL) { setBatchList([]); setWaveList([]); return; }
      setLoadingModes(true);
      try {
        const resp = await fetch(`${AUTH_BACKEND_URL}/picking/batches?status=completed`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        if (!resp.ok) throw new Error(String(resp.status));
        const json = await resp.json();
        const arr = Array.isArray(json?.batches) ? json.batches : [];
        const mappedBatches = arr.map((b: any) => ({ id: String(b.id || ''), name: String(b.name || ''), orders: Array.isArray(b.orders) ? b.orders.length : 0, items: Number(b.total_items || 0), status: String(b.status || 'completed'), zone: String(b.zone || '') }));
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const counts = await Promise.all(mappedBatches.map(async (b) => {
          try {
            const r = await fetch(`${AUTH_BACKEND_URL}/picking/batches/${b.id}/items`, { headers });
            if (!r.ok) return { id: b.id, itemsCount: b.items };
            const j = await r.json();
            const items = Array.isArray(j?.items) ? j.items : [];
            const itemsCount = items.reduce((sum: number, it: any) => sum + Number(it?.quantity || 0), 0);
            return { id: b.id, itemsCount };
          } catch { return { id: b.id, itemsCount: b.items }; }
        }));
        const countMap = new Map(counts.map(c => [c.id, c.itemsCount]));
        // Solo lotes que empiezan con PB
        setBatchList(mappedBatches.filter((b) => /^PB/i.test(b.name)).map(b => ({ ...b, items: countMap.get(b.id) ?? b.items })));
        const groups = new Map<string, { name: string; batches: number; totalOrders: number; totalItems: number; status: string }>();
        const wb: Record<string, string[]> = {};
        // Solo olas que empiezan con OLA-
        for (const b of mappedBatches.filter((x) => /^OLA-/i.test(x.name))) {
          const m = b.name.match(/^OLA-(\d{8})-(\d{3})/);
          const key = m ? `${m[0]}` : `WAVE-${new Date().toISOString().slice(0,10)}`;
          const g = groups.get(key) || { name: key, batches: 0, totalOrders: 0, totalItems: 0, status: 'completed' };
          g.batches += 1; g.totalOrders += Number(b.orders || 0); g.totalItems += Number((countMap.get(b.id) ?? b.items) ?? 0);
          groups.set(key, g);
          wb[key] = [...(wb[key] || []), b.id];
        }
        setWaveList(Array.from(groups.values()).map(g => ({ id: g.name, name: g.name, batches: g.batches, totalOrders: g.totalOrders, totalItems: g.totalItems, status: g.status })));
        setWaveBatches(wb);
      } catch {
        setBatchList([]); setWaveList([]);
      } finally { setLoadingModes(false); }
    };
    if (packingMode === 'batch' || packingMode === 'wave' || packingMode === 'multistep') loadBatches();
  }, [packingMode, AUTH_BACKEND_URL, token]);

  useEffect(() => {
    const loadAvailableDocs = async () => {
      if (!AUTH_BACKEND_URL) { setAvailableDocs([]); return; }
      setLoadingModes(true);
      try {
        // IDs usados en picking activo para excluir
        const usedResp = await fetch(`${AUTH_BACKEND_URL}/picking/batches/used-docs`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        const usedJson = await usedResp.json().catch(() => ({} as any));
        const usedIds: string[] = Array.isArray(usedJson?.doc_ids) ? usedJson.doc_ids.map((x: any) => String(x)) : [];

        // Pedidos y traspasos de mock SAP
        const poResp = await fetch(`${AUTH_BACKEND_URL}/mock/sap/PurchaseOrderSet?$top=50`);
        const poJson = await poResp.json().catch(() => ({ d: { results: [] } }));
        const poItems = Array.isArray(poJson?.d?.results) ? poJson.d.results : [];
        const soResp = await fetch(`${AUTH_BACKEND_URL}/mock/sap/SalesOrderSet?$top=50`);
        const soJson = await soResp.json().catch(() => ({ d: { results: [] } }));
        const soItems = Array.isArray(soJson?.d?.results) ? soJson.d.results : [];
        const trResp = await fetch(`${AUTH_BACKEND_URL}/mock/sap/TransferSet?$top=50`);
        const trJson = await trResp.json().catch(() => ({ d: { results: [] } }));
        const trItems = Array.isArray(trJson?.d?.results) ? trJson.d.results : [];

        const docs: Array<{ id: string; type: 'order' | 'transfer'; docNumber: string; status?: string }> = [];
        for (const p of poItems) {
          const id = String(p?.PurchaseOrderID || p?.DocNum || p?.id || '');
          const num = id;
          if (id && !usedIds.includes(id)) docs.push({ id, type: 'order', docNumber: num, status: 'PO' });
        }
        for (const s of soItems) {
          const id = String(s?.SalesOrderID || s?.DocNum || s?.id || '');
          const num = id;
          if (id && !usedIds.includes(id)) docs.push({ id, type: 'order', docNumber: num, status: 'SO' });
        }
        for (const t of trItems) {
          const id = String(t?.TransferID || t?.TransferNum || t?.id || '');
          const num = id;
          if (id && !usedIds.includes(id)) docs.push({ id, type: 'transfer', docNumber: num, status: 'TR' });
        }
        setAvailableDocs(docs);
      } catch {
        setAvailableDocs([]);
      } finally { setLoadingModes(false); }
    };
    if (packingMode === 'single_order') loadAvailableDocs();
  }, [packingMode, AUTH_BACKEND_URL, token]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Preparación de Paquetes</h1>
          <p className="text-gray-600">Gestiona la preparación y empaquetado de pedidos</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
          <button onClick={openNewPackage} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Paquete
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className={`p-3 bg-${stat.color}-100 rounded-lg`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <div className="flex items-center">
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    {stat.change !== '' && (
                      <span className={`ml-2 text-sm font-medium ${
                        stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.change}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <nav className="flex space-x-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = isActiveTab(tab.href);
            return (
              <Link
                key={tab.name}
                to={tab.href}
                className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-all duration-200 ${
                  isActive
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Search and Filters: solo en Preparación de Envíos */}
      {isActiveTab('/packing/orders') && (
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar órdenes, productos, transportistas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-80"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Método de empaque</label>
            <select value={packingMode} onChange={(e) => setPackingMode(e.target.value as any)} className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="single_order">Empaquetamiento por Pedido</option>
              <option value="batch">Empaquetamiento por SKU</option>
              <option value="wave">Empaquetamiento por Ola</option>
              <option value="multistep">Empaquetamiento Multietapa</option>
            </select>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium ${
              showFilters
                ? 'border-blue-300 text-blue-700 bg-blue-50'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </button>
        </div>
        <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </button>
      </div>
      )}

      {/* Filters Panel: solo en Preparación de Envíos */}
      {isActiveTab('/packing/orders') && showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="packing">Empaquetando</option>
                <option value="ready">Listo para envío</option>
                <option value="shipped">Enviado</option>
                <option value="delivered">Entregado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioridad
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Todas las prioridades</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transportista
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Todos los transportistas</option>
                <option value="dhl">DHL Express</option>
                <option value="fedex">FedEx</option>
                <option value="ups">UPS</option>
                <option value="correos">Correos</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Envío
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {isActiveTab('/packing/orders') && packingMode === 'single_order' && (
          <div className="space-y-6">
            <Routes>
              <RouterRoute path="/orders" element={<ShippingOrders openNewPackage={openNewPackage} />} />
              <RouterRoute path="/tasks" element={<PackingTasks />} />
              <RouterRoute path="/" element={<ShippingOrders openNewPackage={openNewPackage} />} />
            </Routes>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Pedidos y traspasos disponibles (no asignados a picking)</h3>
              {loadingModes ? (
                <div className="text-sm text-gray-600">Cargando...</div>
              ) : availableDocs.length === 0 ? (
                <div className="text-sm text-gray-600">Sin documentos disponibles</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600 border-b">
                        <th className="py-2 px-3">Tipo</th>
                        <th className="py-2 px-3">Documento</th>
                        <th className="py-2 px-3">Estado</th>
                        <th className="py-2 px-3">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableDocs.map(d => (
                        <tr key={`${d.type}-${d.id}`} className="border-b">
                          <td className="py-2 px-3">{d.type === 'order' ? 'Pedido' : 'Traspaso'}</td>
                          <td className="py-2 px-3 font-mono">{d.docNumber}</td>
                          <td className="py-2 px-3">{d.status || '-'}</td>
                          <td className="py-2 px-3"><button onClick={() => setSelectedDocs(prev => prev.find(p => p.id === d.id && p.type === d.type) ? prev.filter(p => !(p.id === d.id && p.type === d.type)) : [...prev, { type: d.type, id: d.id, docNumber: d.docNumber, status: d.status }])} className={`px-2 py-1 rounded ${selectedDocs.find(p => p.id === d.id && p.type === d.type) ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>{selectedDocs.find(p => p.id === d.id && p.type === d.type) ? 'Seleccionado' : 'Seleccionar'}</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {isActiveTab('/packing/orders') && packingMode === 'batch' && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Lotes de picking completados</h3>
            {loadingModes ? (
              <div className="text-sm text-gray-600">Cargando...</div>
            ) : batchList.length === 0 ? (
              <div className="text-sm text-gray-600">Sin lotes completados</div>
            ) : (
              <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-gray-600 border-b"><th className="py-2 px-3">Lote</th><th className="py-2 px-3">Órdenes</th><th className="py-2 px-3">Ítems</th><th className="py-2 px-3">Acción</th></tr></thead><tbody>{batchList.map(b => (<tr key={b.id} className="border-b"><td className="py-2 px-3 font-mono">{b.name}</td><td className="py-2 px-3">{b.orders}</td><td className="py-2 px-3">{b.items}</td><td className="py-2 px-3"><button onClick={() => setSelectedBatchIds(prev => prev.includes(b.id) ? prev.filter(x => x !== b.id) : [...prev, b.id])} className={`px-2 py-1 rounded ${selectedBatchIds.includes(b.id) ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>{selectedBatchIds.includes(b.id) ? 'Seleccionado' : 'Seleccionar'}</button></td></tr>))}</tbody></table></div>
            )}
          </div>
        )}

        {isActiveTab('/packing/orders') && packingMode === 'wave' && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Olas de picking completadas</h3>
            {loadingModes ? (
              <div className="text-sm text-gray-600">Cargando...</div>
            ) : waveList.length === 0 ? (
              <div className="text-sm text-gray-600">Sin olas completadas</div>
            ) : (
              <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-gray-600 border-b"><th className="py-2 px-3">Ola</th><th className="py-2 px-3">Lotes</th><th className="py-2 px-3">Órdenes</th><th className="py-2 px-3">Ítems</th><th className="py-2 px-3">Acción</th></tr></thead><tbody>{waveList.map(w => (<tr key={w.id} className="border-b"><td className="py-2 px-3 font-mono">{w.name}</td><td className="py-2 px-3">{w.batches}</td><td className="py-2 px-3">{w.totalOrders}</td><td className="py-2 px-3">{w.totalItems}</td><td className="py-2 px-3"><button onClick={() => setSelectedWaveIds(prev => prev.includes(w.id) ? prev.filter(x => x !== w.id) : [...prev, w.id])} className={`px-2 py-1 rounded ${selectedWaveIds.includes(w.id) ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>{selectedWaveIds.includes(w.id) ? 'Seleccionado' : 'Seleccionar'}</button></td></tr>))}</tbody></table></div>
            )}
          </div>
        )}

        {isActiveTab('/packing/orders') && packingMode === 'multistep' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Lotes completados</h3>
              {loadingModes ? (<div className="text-sm text-gray-600">Cargando...</div>) : (
                <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-gray-600 border-b"><th className="py-2 px-3">Lote</th><th className="py-2 px-3">Órdenes</th><th className="py-2 px-3">Ítems</th><th className="py-2 px-3">Acción</th></tr></thead><tbody>{batchList.map(b => (
                  <tr key={b.id} className="border-b">
                    <td className="py-2 px-3 font-mono">{b.name}</td>
                    <td className="py-2 px-3">{b.orders}</td>
                    <td className="py-2 px-3">{b.items}</td>
                    <td className="py-2 px-3"><button onClick={() => setSelectedBatchIds(prev => prev.includes(b.id) ? prev.filter(x => x !== b.id) : [...prev, b.id])} className={`px-2 py-1 rounded ${selectedBatchIds.includes(b.id) ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>{selectedBatchIds.includes(b.id) ? 'Seleccionado' : 'Seleccionar'}</button></td>
                  </tr>
                ))}</tbody></table></div>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Olas completadas</h3>
              {loadingModes ? (<div className="text-sm text-gray-600">Cargando...</div>) : (
                <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-gray-600 border-b"><th className="py-2 px-3">Ola</th><th className="py-2 px-3">Lotes</th><th className="py-2 px-3">Órdenes</th><th className="py-2 px-3">Ítems</th><th className="py-2 px-3">Acción</th></tr></thead><tbody>{waveList.map(w => (
                  <tr key={w.id} className="border-b">
                    <td className="py-2 px-3 font-mono">{w.name}</td>
                    <td className="py-2 px-3">{w.batches}</td>
                    <td className="py-2 px-3">{w.totalOrders}</td>
                    <td className="py-2 px-3">{w.totalItems}</td>
                    <td className="py-2 px-3"><button onClick={() => setSelectedWaveIds(prev => prev.includes(w.id) ? prev.filter(x => x !== w.id) : [...prev, w.id])} className={`px-2 py-1 rounded ${selectedWaveIds.includes(w.id) ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>{selectedWaveIds.includes(w.id) ? 'Seleccionado' : 'Seleccionar'}</button></td>
                  </tr>
                ))}</tbody></table></div>
              )}
            </div>
          </div>
        )}
      </div>
      {isActiveTab('/packing/orders') && (
        <div className="mt-4 flex justify-end">
          <button onClick={openNewPackage} className="px-4 py-2 bg-blue-600 text-white rounded-md">Nuevo Paquete</button>
        </div>
      )}
      {isActiveTab('/packing/tasks') && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <PackingTasks />
        </div>
      )}
      {isActiveTab('/packing/labeling') && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <Labeling />
        </div>
      )}
      {showNewPackageModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-3xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Nuevo Paquete</h3>
              <button onClick={() => setShowNewPackageModal(false)} className="text-gray-400 hover:text-gray-600" title="Cerrar">×</button>
            </div>
            <div className="space-y-3">
              {(packingMode === 'batch' || packingMode === 'wave' || packingMode === 'single_order' || packingMode === 'multistep') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Modelo de empaquetamiento</label>
                    <input type="text" value={newPackageMeta.model} readOnly className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{packingMode === 'batch' ? 'ID del Lote de Picking' : packingMode === 'wave' ? 'ID de la Ola de Picking' : packingMode === 'multistep' ? 'Lotes/Olas seleccionados' : 'Folio(s) de pedido seleccionados'}</label>
                    <input type="text" value={packingMode === 'batch' ? newPackageMeta.batchCodes.join(', ') : packingMode === 'wave' ? selectedWaveIds.join(', ') : packingMode === 'multistep' ? newPackageMeta.batchCodes.join(', ') : newPackageMeta.batchCodes.join(', ')} readOnly className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Operario</label>
                    <input type="text" value={newPackageMeta.operator} onChange={(e) => setNewPackageMeta({ ...newPackageMeta, operator: e.target.value })} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estación de empaque</label>
                    <input type="text" value={newPackageMeta.station} onChange={(e) => setNewPackageMeta({ ...newPackageMeta, station: e.target.value })} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estado</label>
                    <select value={newPackageMeta.status} onChange={(e) => setNewPackageMeta({ ...newPackageMeta, status: e.target.value as any })} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md">
                      <option value="pending">Pendiente</option>
                      <option value="in_process">En proceso</option>
                      <option value="completed">Completado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Número total de pedidos</label>
                    <input type="text" value={String(newPackageMeta.totalOrders)} readOnly className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cantidad total de items</label>
                    <input type="text" value={String(newPackageMeta.totalItems)} readOnly className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                </div>
              )}
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-2 px-3">SKU</th>
                    <th className="py-2 px-3">Producto</th>
                    <th className="py-2 px-3">Cantidad</th>
                    <th className="py-2 px-3">Documento</th>
                  </tr>
                </thead>
                <tbody>
                  {newPackageItems.map((it) => (
                    <tr key={it.id} className="border-b">
                      <td className="py-2 px-3 font-mono">{it.sku}</td>
                      <td className="py-2 px-3">{it.product}</td>
                      <td className="py-2 px-3">{it.quantity}</td>
                      <td className="py-2 px-3">{it.doc || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowNewPackageModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cerrar</button>
              <button onClick={async () => {
                const now = new Date();
                const y = now.getFullYear();
                const m = String(now.getMonth()+1).padStart(2,'0');
                const d = String(now.getDate()).padStart(2,'0');
                const rand = Math.random().toString(36).slice(2,6).toUpperCase();
                const packageId = `PKG-${y}${m}${d}-${rand}`;
                setPrintData({ packageId, model: newPackageMeta.model, batchCodes: newPackageMeta.batchCodes, operator: newPackageMeta.operator, station: newPackageMeta.station, status: newPackageMeta.status, totalOrders: newPackageMeta.totalOrders, totalItems: newPackageMeta.totalItems, createdAt: now.toISOString() });
                const orderNumber = (newPackageItems.find(x => x.doc)?.doc) || (newPackageMeta.batchCodes[0] ? `BATCH ${newPackageMeta.batchCodes[0]}` : packageId);
                const task = {
                  id: `${Date.now()}`,
                  taskNumber: `PACK-${String(Math.floor(Math.random()*1000)).padStart(3,'0')}`,
                  orderId: `${Date.now()}`,
                  orderNumber,
                  assignedTo: newPackageMeta.operator,
                  status: (newPackageMeta.status === 'in_process' ? 'in_progress' : newPackageMeta.status),
                  priority: 'medium',
                  items: newPackageItems.map(it => ({ id: it.id, product: it.product, sku: it.sku, quantity: it.quantity, quantityPacked: (newPackageMeta.status === 'completed' ? it.quantity : 0), weight: it.weight || 0, dimensions: it.dimensions || '', location: '', barcode: it.sku || '', fragile: false })),
                  packingType: 'standard',
                  estimatedTime: 10,
                  packingMaterials: ['Caja', 'Cinta'],
                  boxType: 'Caja estándar',
                  totalWeight: newPackageItems.reduce((s, it) => s + (it.weight || 0) * (it.quantity || 0), 0),
                  totalVolume: 0,
                  createdAt: now.toISOString(),
                  notes: undefined,
                  qualityCheck: false,
                  meta: { model: newPackageMeta.model, batchCodes: newPackageMeta.batchCodes, station: newPackageMeta.station, status: newPackageMeta.status, totalOrders: newPackageMeta.totalOrders, totalItems: newPackageMeta.totalItems }
                };
                try {
                  const existingStr = localStorage.getItem('packing_tasks');
                  const existing = existingStr ? JSON.parse(existingStr) : [];
                  localStorage.setItem('packing_tasks', JSON.stringify([task, ...existing]));
                } catch {}
                try {
                  const pkgExistingStr = localStorage.getItem('packing_packages');
                  const pkgExisting = pkgExistingStr ? JSON.parse(pkgExistingStr) : [];
                  const pkgRecord = { packageId, model: newPackageMeta.model, batchCodes: newPackageMeta.batchCodes, operator: newPackageMeta.operator, station: newPackageMeta.station, status: newPackageMeta.status, totalOrders: newPackageMeta.totalOrders, totalItems: newPackageMeta.totalItems, createdAt: now.toISOString(), items: newPackageItems, orderNumber };
                  localStorage.setItem('packing_packages', JSON.stringify([pkgRecord, ...pkgExisting]));
                  try { window.dispatchEvent(new CustomEvent('packingPackageCreated', { detail: { package: pkgRecord } })); } catch {}
                } catch {}
                try {
                  const payload = {
                    order_number: orderNumber || null,
                    packing_id: task.taskNumber,
                    packing_model: newPackageMeta.model === 'Empaque por Lote' ? 'consolidation' : newPackageMeta.model === 'Empaque por Ola' ? 'wave' : 'consolidation',
                    packing_wave_id: newPackageMeta.batchCodes.join(', '),
                    packing_station: newPackageMeta.station,
                    packing_operator: newPackageMeta.operator,
                    packing_status: newPackageMeta.status,
                    status: (newPackageMeta.status === 'completed' ? 'ready' : 'packing'),
                    priority: 'medium',
                    total_weight: task.totalWeight || 0,
                    items_json: newPackageItems.map(it => ({ sku: it.sku, product: it.product, quantity: it.quantity })),
                  } as any;
                  await supabase.from('packing_orders').upsert(payload, { onConflict: 'packing_id' });
                } catch {}
                try { window.dispatchEvent(new CustomEvent('packingTaskFromBatch', { detail: { task } })); } catch {}
                setShowNewPackageModal(false);
                setShowPrintModal(true);
              }} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Crear paquete</button>
            </div>
          </div>
        </div>
      )}

      {showPrintModal && printData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-3xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Paquete Creado</h3>
              <button onClick={() => setShowPrintModal(false)} className="text-gray-400 hover:text-gray-600" title="Cerrar">×</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <div className="text-sm font-medium text-gray-700">QR</div>
                <canvas ref={qrRef} className="mt-2 border border-gray-200 rounded" width={180} height={180}></canvas>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm font-medium text-gray-700">Código de barras</div>
                <svg ref={barcodeRef} className="mt-2 w-full h-20"></svg>
                <div className="text-xs text-gray-600 mt-2">{printData.packageId} • {newPackageMeta.model} • {newPackageMeta.batchCodes.join(', ')} • {newPackageMeta.operator} • {newPackageMeta.station} • {newPackageMeta.status} • Pedidos: {newPackageMeta.totalOrders} • Ítems: {newPackageMeta.totalItems}</div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => window.print()} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Imprimir</button>
              <button onClick={() => navigate('/packing/tasks')} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Ir a Empaquetado</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
