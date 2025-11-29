import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Routes, Route as RouterRoute, Link, useLocation } from 'react-router-dom';
import { 
  ShoppingCart, 
  TrendingUp, 
  MapPin, 
  Package, 
  Clock, 
  Users, 
  BarChart3,
  Filter,
  Search,
  RefreshCw,
  Plus,
  Download,
  CheckCircle,
  AlertCircle,
  Target,
  Navigation,
  Layers,
  Waves
} from 'lucide-react';
import { PickingTasks } from './PickingTasks';
import { Putaway } from './Putaway';
import { BatchPicking } from './BatchPicking';
import { WavePicking } from './WavePicking';
import { RouteOptimization } from './RouteOptimization';
import OutgoingDocs from './OutgoingDocs';
import { TaskLabelModal } from './TaskLabelModal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getLocalUsers } from '../../utils/localAuth';

const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';

export function PickingDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const location = useLocation();
  const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
  const navigate = useNavigate();

  const tabs = [
    { name: 'Doc Salidas', href: '/picking/outgoing', icon: Package },
    { name: 'Lotes', href: '/picking/batches', icon: Layers },
    { name: 'Olas', href: '/picking/waves', icon: Waves },
    { name: 'Rutas', href: '/picking/routes', icon: MapPin },
    { name: 'Tareas', href: '/picking/tasks', icon: ShoppingCart },
  ];

  const isActiveTab = (href: string) => {
    return location.pathname.startsWith(href);
  };

  // Estado para métricas reales
  const [metrics, setMetrics] = useState({
    pendingTasks: 0,
    productivity: 0,
    avgTimeMinutes: 0,
    activeOperators: 0,
    completedTasks: 0,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [errorMetrics, setErrorMetrics] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!AUTH_BACKEND_URL) return;
      setLoadingMetrics(true);
      setErrorMetrics(null);
      try {
        const resp = await fetch(`${AUTH_BACKEND_URL}/picking/metrics`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        setMetrics({
          pendingTasks: Number(data?.pendingTasks ?? 0),
          productivity: Number(data?.productivity ?? 0),
          avgTimeMinutes: Number(data?.avgTimeMinutes ?? 0),
          activeOperators: Number(data?.activeOperators ?? 0),
          completedTasks: Number(data?.completedTasks ?? 0),
        });
      } catch (e: any) {
        console.error('Error cargando métricas de picking:', e);
        setErrorMetrics(e?.message || 'No se pudo cargar métricas');
      } finally {
        setLoadingMetrics(false);
      }
    };
    fetchMetrics();
  }, []);

  const stats = [
    {
      title: 'Tareas Pendientes',
      value: String(metrics.pendingTasks),
      change: '',
      changeType: 'increase' as const,
      icon: ShoppingCart,
      color: 'blue'
    },
    {
      title: 'Tareas Completadas',
      value: String(metrics.completedTasks),
      change: '',
      changeType: 'increase' as const,
      icon: CheckCircle,
      color: 'emerald',
      onClick: () => navigate('/picking/tasks?status=completed')
    },
    {
      title: 'Productividad',
      value: `${metrics.productivity.toFixed(1)}%`,
      change: '',
      changeType: 'increase' as const,
      icon: TrendingUp,
      color: 'green'
    },
    {
      title: 'Tiempo Promedio',
      value: `${metrics.avgTimeMinutes.toFixed(1)} min`,
      change: '',
      changeType: 'increase' as const,
      icon: Clock,
      color: 'purple'
    },
    {
      title: 'Operarios Activos',
      value: String(metrics.activeOperators),
      change: '',
      changeType: 'increase' as const,
      icon: Users,
      color: 'orange'
    }
  ];

  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Picking</h1>
          <p className="text-gray-600">Optimiza las operaciones de picking y rutas de almacén</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {errorMetrics && (
          <div className="md:col-span-2 lg:col-span-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {errorMetrics}
          </div>
        )}
        {!AUTH_BACKEND_URL && (
          <div className="md:col-span-2 lg:col-span-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700">
            Configura `VITE_AUTH_BACKEND_URL` para cargar métricas reales.
          </div>
        )}
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`bg-white border border-gray-200 rounded-lg p-6 ${stat.onClick ? 'cursor-pointer hover:shadow-md transition' : ''}`}
              onClick={() => stat.onClick && stat.onClick()}
            >
              <div className="flex items-center">
                <div className={`p-3 bg-${stat.color}-100 rounded-lg`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <div className="flex items-center">
                    <p className="text-2xl font-bold text-gray-900">{loadingMetrics ? '—' : stat.value}</p>
                    {stat.change && (
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
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.name}
                to={tab.href}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  isActiveTab(tab.href)
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar tareas, productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-80"
            />
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
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="in_progress">En Progreso</option>
                <option value="completed">Completado</option>
                <option value="cancelled">Cancelado</option>
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
                Operario
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Todos los operarios</option>
                <option value="user1">Juan Pérez</option>
                <option value="user2">María García</option>
                <option value="user3">Carlos López</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zona
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Todas las zonas</option>
                <option value="zone1">Zona A - Picking</option>
                <option value="zone2">Zona B - Reserva</option>
                <option value="zone3">Zona C - Devoluciones</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1">
        <Routes>
          <RouterRoute path="/tasks" element={<PickingTasks />} />
          <RouterRoute path="/batches" element={<BatchPicking />} />
          <RouterRoute path="/waves" element={<WavePicking />} />
          <RouterRoute path="/routes" element={<RouteOptimization />} />
          <RouterRoute path="/outgoing" element={<OutgoingDocs />} />
          <RouterRoute path="/" element={<PickingTasks />} />
        </Routes>
      </div>

      {/* New Picking Task Modal */}
      {showNewTaskModal && (
        <NewPickingTaskModal onClose={() => setShowNewTaskModal(false)} />
      )}
    </div>
  );
}

function NewPickingTaskModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [customer, setCustomer] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [location, setLocation] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(10);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed' | 'cancelled'>('pending');
  const [originZone, setOriginZone] = useState('Recepción');
  const [destinationZone, setDestinationZone] = useState('');
  const [creator, setCreator] = useState<string>(user?.name || user?.email || '');
  const [skuInput, setSkuInput] = useState('');
  const [qtyInput, setQtyInput] = useState<number>(1);
  const [modalItems, setModalItems] = useState<{ sku: string; name: string; quantity: number; picked: number; location: string; unit?: string | null; weight?: number | null; dimensions?: string | null }[]>([]);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelTask, setLabelTask] = useState<{ id: string; orderNumber: string; customer?: string; assignedTo?: string; location?: string; notes?: string } | null>(null);

  // Autocomplete de usuarios (dinámico y normalizado)
  const [usersCache, setUsersCache] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [userSuggestions, setUserSuggestions] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);

  // Cargar zonas destino desde BD
  const [zones, setZones] = useState<Array<{ code: string; name: string }>>([]);

  // Sugerencias de productos por SKU en tiempo real
  const [skuSuggestions, setSkuSuggestions] = useState<Array<{ sku: string; name: string }>>([]);

  const normalize = (s: string) => s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  useEffect(() => {
    // Cargar usuarios locales y, si hay backend, fusionar con lista del servidor
    const bootstrapUsers = async () => {
      try {
        const { getLocalUsers } = await import('../../utils/localAuth');
        const locals = (getLocalUsers() || []).map(u => ({ id: u.id, name: u.full_name || u.email, email: u.email }));
        let merged = [...locals];
        const token = localStorage.getItem('app_token');
        if (AUTH_BACKEND_URL && token) {
          try {
            const resp = await fetch(`${AUTH_BACKEND_URL}/users?limit=200`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (resp.ok) {
              const data = await resp.json();
              const remote = Array.isArray(data?.users) ? data.users : data;
              const mapped = (remote || []).map((u: any) => ({ id: String(u.id), name: String(u.full_name || u.email || ''), email: String(u.email || '') }));
              const byEmail = new Map<string, { id: string; name: string; email: string }>();
              [...locals, ...mapped].forEach(u => { if (u.email) byEmail.set(u.email, u); });
              merged = Array.from(byEmail.values());
            }
          } catch { /* ignore */ }
        }
        setUsersCache(merged);
      } catch { /* noop */ }
    };
    bootstrapUsers();
  }, []);

  useEffect(() => {
    // Filtrar sugerencias de usuarios de forma normalizada
    const term = assignedTo.trim();
    if (!term) { setUserSuggestions([]); return; }
    const n = normalize(term);
    const suggestions = usersCache.filter(u => normalize(u.name).includes(n) || normalize(u.email).includes(n)).slice(0, 8);
    setUserSuggestions(suggestions);
    setShowUserSuggestions(true);
  }, [assignedTo, usersCache]);

  useEffect(() => {
    // Cargar zonas
    const loadZones = async () => {
      try {
        const { data, error } = await supabase
          .from('zones')
          .select('code, name')
          .order('name', { ascending: true });
        if (!error && data) {
          const zs = (data as any[]).map(z => ({ code: String(z.code), name: String(z.name || z.code) }));
          setZones(zs);
          if (!destinationZone && zs.length > 0) setDestinationZone(zs[0].code);
          return;
        }
      } catch { /* noop */ }
      // Fallback: derivar zonas desde locations
      try {
        const { data: locs } = await supabase
          .from('locations')
          .select('zone')
          .order('zone', { ascending: true });
        const codes = Array.from(new Set((locs || []).map((l: any) => String(l.zone || '').trim()).filter(Boolean)));
        const zs = codes.map(code => ({ code, name: code === 'SIN-ZONA' ? 'Sin Zona' : code }));
        setZones(zs);
        if (!destinationZone && zs.length > 0) setDestinationZone(zs[0].code);
      } catch { /* noop */ }
    };
    loadZones();
  }, []);

  useEffect(() => {
    // Búsqueda de productos en tiempo real por SKU o nombre
    const term = skuInput.trim();
    const fetcher = setTimeout(async () => {
      if (!term || term.length < 2) { setSkuSuggestions([]); return; }
      try {
        if (AUTH_BACKEND_URL) {
          const resp = await fetch(`${AUTH_BACKEND_URL}/products/list?q=${encodeURIComponent(term)}&limit=20`);
          if (resp.ok) {
            const { products } = await resp.json();
            const sugg = (products || []).map((p: any) => ({ sku: String(p.sku), name: String(p.name || '') }));
            setSkuSuggestions(sugg.slice(0, 10));
            return;
          }
        }
        // Fallback mínimo con Supabase (puede requerir auth)
        const { data } = await supabase
          .from('products')
          .select('sku, name')
          .or(`sku.ilike.%${term}%,name.ilike.%${term}%`)
          .limit(10);
        const sugg = (data || []).map((p: any) => ({ sku: String(p.sku), name: String(p.name || '') }));
        setSkuSuggestions(sugg);
      } catch {
        setSkuSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(fetcher);
  }, [skuInput]);

  // Resolver unidad, peso, dimensiones y ubicación actual del producto por SKU
  const resolveProductInfo = async (sku: string): Promise<{ unit: string | null; weight: number | null; dimensionsStr: string | null; locationCode: string | null }> => {
    let unit: string | null = null;
    let weight: number | null = null;
    let dimensionsStr: string | null = null;
    let locationCode: string | null = null;

    // 1) Intentar obtener ubicación desde backend inventario
    try {
      if (AUTH_BACKEND_URL) {
        const qs = new URLSearchParams({ q: sku, limit: '10' });
        const respInv = await fetch(`${AUTH_BACKEND_URL}/inventory/list?${qs.toString()}`);
        if (respInv.ok) {
          const json = await respInv.json();
          const rows = Array.isArray(json.inventory) ? json.inventory : [];
          if (rows.length > 0) {
            // Usar la primera ubicación con disponibilidad, o la primera en lista
            const withAvail = rows.find((r: any) => Number(r.available_quantity || r.quantity || 0) > 0);
            locationCode = String((withAvail || rows[0]).location_code || '—');
          }
        }
      }
    } catch { /* noop */ }

    // 2) Unidad, peso y dimensiones desde catálogo (Supabase directo, ya que backend catálogo no expone estos campos)
    try {
      const { data } = await supabase
        .from('products')
        .select('unit_of_measure, weight, dimensions')
        .eq('sku', sku)
        .limit(1)
        .maybeSingle();
      if (data) {
        unit = (data as any).unit_of_measure ?? null;
        weight = (data as any).weight !== undefined && (data as any).weight !== null ? Number((data as any).weight) : null;
        const dims = (data as any).dimensions;
        if (dims && (typeof dims === 'object')) {
          const l = Number(dims.length ?? dims.l ?? dims.L ?? 0) || null;
          const w = Number(dims.width ?? dims.w ?? dims.W ?? 0) || null;
          const h = Number(dims.height ?? dims.h ?? dims.H ?? 0) || null;
          const parts = [l, w, h].filter(v => v !== null) as number[];
          dimensionsStr = parts.length > 0 ? parts.join(' × ') : null;
        } else if (typeof dims === 'string' && dims.trim()) {
          dimensionsStr = dims.trim();
        }
      }
    } catch { /* noop */ }

    // 3) Fallback para ubicación vía Supabase si backend no devolvió
    if (!locationCode) {
      try {
        const { data } = await supabase
          .from('inventory')
          .select('quantity, available_quantity, products!inner(sku), locations(code)')
          .eq('products.sku', sku)
          .limit(10);
        const rows = Array.isArray(data) ? data : [];
        if (rows.length > 0) {
          const withAvail = rows.find((r: any) => Number(r.available_quantity || r.quantity || 0) > 0);
          locationCode = String(((withAvail || rows[0]) as any)?.locations?.code || '—');
        }
      } catch { /* noop */ }
    }

    return { unit, weight, dimensionsStr, locationCode };
  };

  const addItem = async () => {
    const sku = skuInput.trim();
    const qty = Math.max(1, qtyInput || 1);
    if (!sku) return;
    const found = skuSuggestions.find(s => s.sku === sku);
    const displayName = found ? found.name : `SKU ${sku}`;
    const meta = await resolveProductInfo(sku);
    const locCode = meta.locationCode || location || '-';
    // Si no hay ubicación general establecida, tomar la del primer ítem agregado
    setLocation(prev => prev || (locCode !== '-' ? locCode : prev));
    setModalItems(prev => [{ sku, name: displayName, quantity: qty, picked: 0, location: locCode, unit: meta.unit ?? null, weight: meta.weight ?? null, dimensions: meta.dimensionsStr ?? null }, ...prev]);
    setSkuInput('');
    setQtyInput(1);
  };

  const removeItem = (sku: string) => {
    setModalItems(prev => prev.filter(it => it.sku !== sku));
  };

  const handleCreate = async () => {
    try {
      const raw = localStorage.getItem('picking_tasks');
      const tasks = raw ? JSON.parse(raw) : [];
      const orderNumber = computeNextTaskCode(tasks);
      const dueDate = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
      const newTask = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        orderNumber,
        customer: customer || 'Cliente',
        priority,
        status,
        assignedTo: assignedTo || 'Sin asignar',
        zone: 'Zona A - Picking',
        location: location || '-',
        items: modalItems,
        estimatedTime,
        createdAt: new Date().toISOString(),
        dueDate,
        notes,
        creator: creator || (user?.name || user?.email || 'Sistema'),
        originZone,
        destinationZone
      };
      // Intentar guardar en backend si está configurado y hay token
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('app_token') : null;
        if (AUTH_BACKEND_URL && token) {
          const resp = await fetch(`${AUTH_BACKEND_URL}/picking/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(newTask),
          });
          if (resp.ok) {
            const { task: saved } = await resp.json();
            if (saved?.id) newTask.id = saved.id;
          }
        }
      } catch (e) {
        // Fallback silencioso a almacenamiento local
        console.warn('Fallo al guardar en backend, usando localStorage:', e);
      }

      const updated = [newTask, ...tasks];
      localStorage.setItem('picking_tasks', JSON.stringify(updated));
      window.dispatchEvent(new Event('picking_tasks_updated'));
      setLabelTask({
        id: newTask.id,
        orderNumber: newTask.orderNumber,
        customer: newTask.customer,
        assignedTo: newTask.assignedTo,
        location: newTask.location,
        notes: newTask.notes,
      });
      setShowLabelModal(true);
    } catch (e) {
      console.warn('No se pudo crear la tarea de picking', e);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-3xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Nueva Tarea de Picking</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID Tarea</label>
            <input value={computeNextTaskCode(JSON.parse(localStorage.getItem('picking_tasks') || '[]'))} readOnly className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <input value={customer} onChange={e => setCustomer(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Cliente" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asignado a</label>
            <div className="relative">
              <input
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                onFocus={() => setShowUserSuggestions(true)}
                onBlur={() => setTimeout(() => setShowUserSuggestions(false), 150)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Buscar operario por nombre o email"
              />
              {showUserSuggestions && userSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-auto">
                  {userSuggestions.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onMouseDown={() => { setAssignedTo(u.name || u.email); setShowUserSuggestions(false); }}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <span className="font-medium">{u.name}</span>
                      <span className="text-gray-500 ml-2">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Creador</label>
            <input value={creator} onChange={e => setCreator(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Usuario creador" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full border border-gray-300 rounded-md px-3 py-2">
              <option value="pending">Pendiente</option>
              <option value="in_progress">En proceso</option>
              <option value="completed">Completada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
            <input value={location} onChange={e => setLocation(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="A-01-01" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
            <select value={priority} onChange={e => setPriority(e.target.value as any)} className="w-full border border-gray-300 rounded-md px-3 py-2">
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo Estimado (min)</label>
            <input type="number" value={estimatedTime} onChange={e => setEstimatedTime(parseInt(e.target.value || '0'))} className="w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>
        </div>

        {/* Datos de Origen y Destino */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Datos de Origen</h4>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zona de origen</label>
            <select value={originZone} onChange={e => setOriginZone(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2">
              <option>Recepción</option>
              <option>Staging</option>
            </select>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Datos de Destino</h4>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zona destino sugerida</label>
            <select value={destinationZone} onChange={e => setDestinationZone(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2">
              {zones.length === 0 && (
                <option value="">Cargando zonas...</option>
              )}
              {zones.map(z => (
                <option key={z.code} value={z.code}>{z.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Productos por SKU */}
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Productos (SKU)</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input
                value={skuInput}
                onChange={e => setSkuInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Escanear o escribir SKU y Enter"
              />
              {skuSuggestions.length > 0 && skuInput.trim().length >= 2 && (
                <div className="mt-1 border border-gray-200 rounded-md bg-white shadow-sm max-h-40 overflow-auto">
                  {skuSuggestions.map(s => (
                    <button
                      key={s.sku}
                      type="button"
                      onMouseDown={() => { setSkuInput(s.sku); }}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <span className="font-medium">{s.sku}</span>
                      <span className="text-gray-500 ml-2">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
              <input type="number" value={qtyInput} onChange={e => setQtyInput(parseInt(e.target.value || '1'))} className="w-full border border-gray-300 rounded-md px-3 py-2" />
            </div>
            <div>
              <button onClick={addItem} className="w-full px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Agregar</button>
            </div>
          </div>
          {modalItems.length > 0 && (
            <div className="mt-3 border border-gray-200 rounded-md">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left">SKU</th>
                    <th className="px-3 py-2 text-left">Cantidad</th>
                    <th className="px-3 py-2 text-left">Unidad</th>
                    <th className="px-3 py-2 text-left">Peso</th>
                    <th className="px-3 py-2 text-left">Dimensiones</th>
                    <th className="px-3 py-2 text-left">Ubicación</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {modalItems.map(it => (
                    <tr key={it.sku} className="border-t">
                      <td className="px-3 py-2">{it.sku}</td>
                      <td className="px-3 py-2">{it.quantity}</td>
                      <td className="px-3 py-2">{it.unit || '—'}</td>
                      <td className="px-3 py-2">{(it.weight ?? null) !== null ? `${it.weight}` : '—'}</td>
                      <td className="px-3 py-2">{it.dimensions || '—'}</td>
                      <td className="px-3 py-2">{it.location}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => removeItem(it.sku)} className="text-red-600 hover:text-red-800 text-xs">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de tarea</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" rows={3} placeholder="Ej. Acomodo inicial, reubicación, consolidación" />
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Cancelar</button>
          <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Crear Tarea</button>
        </div>
      </div>
      {showLabelModal && (
        <TaskLabelModal
          isOpen={showLabelModal}
          onClose={() => { setShowLabelModal(false); onClose(); }}
          task={labelTask}
        />
      )}
    </div>
  );
}

function computeNextOrderNumber(tasks: any[]): string {
  // Busca el máximo sufijo numérico en formato ORD-YYYY-XXX
  let max = 0;
  for (const t of tasks || []) {
    const m = String(t?.orderNumber || '').match(/ORD-(\d{4})-(\d{3})/);
    if (m) {
      const num = parseInt(m[2], 10);
      if (!isNaN(num)) max = Math.max(max, num);
    }
  }
  const next = String(max + 1).padStart(3, '0');
  const year = new Date().getFullYear();
  return `ORD-${year}-${next}`;
}

function computeNextTaskCode(tasks: any[]): string {
  // Genera siguiente código tipo TSK00045
  let max = 0;
  for (const t of tasks || []) {
    const code = String(t?.orderNumber || '').match(/TSK(\d{5})/);
    if (code) {
      const num = parseInt(code[1], 10);
      if (!isNaN(num)) max = Math.max(max, num);
    }
  }
  const next = String(max + 1).padStart(5, '0');
  return `TSK${next}`;
}
