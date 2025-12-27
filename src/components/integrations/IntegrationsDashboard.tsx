import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Database, 
  ShoppingCart, 
  Truck, 
  Code, 
  Settings, 
  Activity,
  CheckCircle,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Zap,
  Download
} from 'lucide-react';

import { ERPConnectors } from './ERPConnectors';
import { supabase } from '../../lib/supabase';

export function IntegrationsDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { name: 'Conectores ERP', href: '/integrations/erp', icon: Database }
  ];

  // KPI: datos reales
  type StatCard = {
    title: string;
    value: string;
    change: string;
    changeType: 'increase' | 'decrease';
    icon: any;
    color: 'blue' | 'green' | 'purple' | 'orange';
  };
  const [stats, setStats] = useState<StatCard[]>([
    { title: 'Integraciones Activas', value: '—', change: '—', changeType: 'increase', icon: CheckCircle, color: 'green' },
    { title: 'Sincronizaciones Hoy', value: '—', change: '—', changeType: 'increase', icon: RefreshCw, color: 'blue' },
    { title: 'APIs Disponibles', value: '—', change: '—', changeType: 'increase', icon: Zap, color: 'purple' },
    { title: 'Tiempo Respuesta', value: '—', change: '—', changeType: 'decrease', icon: Clock, color: 'orange' },
  ]);

  function formatMs(ms: number | null) {
    if (ms == null || ms <= 0) return '—';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  React.useEffect(() => {
    let cancelled = false;
    const loadStats = async () => {
      try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Conectores (fallback si la tabla no existe)
        let connectors: any[] = [];
        try {
          const { data, error } = await supabase
            .from('erp_connectors')
            .select('id,status,is_active,type,created_at,updated_at');
          if (error) throw error;
          connectors = data || [];
        } catch (e) {
          connectors = [];
        }

        const activeConnectors = (connectors || []).filter((c: any) => c?.status === 'active' || c?.is_active === true);
        const activeCount = activeConnectors.length;
        const apisCount = new Set((connectors || []).map((c: any) => String(c?.type || '').trim()).filter(Boolean)).size;
        const prevMonthActives = (connectors || []).filter((c: any) => {
          const up = c?.updated_at ? new Date(c.updated_at) : null;
          return (c?.status === 'active' || c?.is_active === true) && up && up >= startOfPrevMonth && up < startOfThisMonth;
        }).length;
        const apisPrevCount = new Set(
          (connectors || [])
            .filter((c: any) => c?.created_at && new Date(c.created_at) >= startOfPrevMonth && new Date(c.created_at) < startOfThisMonth)
            .map((c: any) => String(c?.type || '').trim())
            .filter(Boolean)
        ).size;

        // Logs de sincronización (fallback si la tabla no existe)
        let todayLogs: any[] = [];
        try {
          const { data, error } = await supabase
            .from('erp_sync_logs')
            .select('id,duration_seconds,started_at,completed_at,created_at')
            .gte('started_at', startOfToday.toISOString());
          if (error) throw error;
          todayLogs = data || [];
        } catch (e) {
          todayLogs = [];
        }
        const todaySyncs = (todayLogs || []).length;
          const todayDurations = (todayLogs || []).map((r: any) => {
            if (r?.duration_seconds) return Number(r.duration_seconds) * 1000;
            const startTs = r?.started_at || r?.created_at;
            const endTs = r?.completed_at || r?.created_at;
            if (startTs && endTs) return Math.max(0, new Date(endTs).getTime() - new Date(startTs).getTime());
            return 0;
          }).filter((x: number) => x > 0);
        const avgTodayMs = todayDurations.length ? Math.round(todayDurations.reduce((a: number, b: number) => a + b, 0) / todayDurations.length) : null;

        let prevMonthLogs: any[] = [];
        try {
          const { data, error } = await supabase
            .from('erp_sync_logs')
            .select('id,duration_seconds,started_at,completed_at,created_at')
            .gte('started_at', startOfPrevMonth.toISOString())
            .lt('started_at', startOfThisMonth.toISOString());
          if (error) throw error;
          prevMonthLogs = data || [];
        } catch (e) {
          prevMonthLogs = [];
        }
        const prevDays = endOfPrevMonth.getDate() || 1;
        const prevMonthDailyAvg = (prevMonthLogs || []).length / prevDays;
          const prevDurations = (prevMonthLogs || []).map((r: any) => {
            if (r?.duration_seconds) return Number(r.duration_seconds) * 1000;
            const startTs = r?.started_at || r?.created_at;
            const endTs = r?.completed_at || r?.created_at;
            if (startTs && endTs) return Math.max(0, new Date(endTs).getTime() - new Date(startTs).getTime());
            return 0;
          }).filter((x: number) => x > 0);
        const avgPrevMs = prevDurations.length ? Math.round(prevDurations.reduce((a: number, b: number) => a + b, 0) / prevDurations.length) : null;

        // Construir tarjetas
        const activeDelta = prevMonthActives ? activeCount - prevMonthActives : null;
        const apisDelta = apisPrevCount ? apisCount - apisPrevCount : null;
        const syncPct = prevMonthDailyAvg ? Math.round(((todaySyncs - prevMonthDailyAvg) / prevMonthDailyAvg) * 100) : null;
        const respDeltaMs = (avgTodayMs != null && avgPrevMs != null) ? (avgTodayMs - avgPrevMs) : null;

        const newStats: StatCard[] = [
          {
            title: 'Integraciones Activas',
            value: String(activeCount),
            change: activeDelta == null ? '—' : `${activeDelta >= 0 ? '+' : ''}${activeDelta}`,
            changeType: activeDelta == null ? 'increase' : (activeDelta >= 0 ? 'increase' : 'decrease'),
            icon: CheckCircle,
            color: 'green'
          },
          {
            title: 'Sincronizaciones Hoy',
            value: todaySyncs.toLocaleString('es-ES'),
            change: syncPct == null ? '—' : `${syncPct >= 0 ? '+' : ''}${syncPct}%`,
            changeType: syncPct == null ? 'increase' : (syncPct >= 0 ? 'increase' : 'decrease'),
            icon: RefreshCw,
            color: 'blue'
          },
          {
            title: 'APIs Disponibles',
            value: String(apisCount),
            change: apisDelta == null ? '—' : `${apisDelta >= 0 ? '+' : ''}${apisDelta}`,
            changeType: apisDelta == null ? 'increase' : (apisDelta >= 0 ? 'increase' : 'decrease'),
            icon: Zap,
            color: 'purple'
          },
          {
            title: 'Tiempo Respuesta',
            value: formatMs(avgTodayMs),
            change: respDeltaMs == null ? '—' : `${respDeltaMs >= 0 ? '+' : ''}${respDeltaMs}ms`,
            changeType: respDeltaMs == null ? 'decrease' : (avgTodayMs != null && avgPrevMs != null && avgTodayMs <= avgPrevMs ? 'decrease' : 'increase'),
            icon: Clock,
            color: 'orange'
          },
        ];

        if (!cancelled) setStats(newStats);
      } catch (e) {
        // En caso de error inesperado, mantener valores por defecto sin romper la UI
        console.error('Error cargando métricas de integraciones:', e);
      }
    };
    loadStats();
    return () => { cancelled = true; };
  }, []);
  const isActiveTab = (href: string) => {
    return location.pathname.startsWith(href);
  };



  const getStatColor = (color: string) => {
    const colors = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500'
    };
    return colors[color as keyof typeof colors] || 'bg-gray-500';
  };

  const getChangeColor = (changeType: 'increase' | 'decrease') => {
    return changeType === 'increase' ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conectores ERP</h1>
          <p className="text-gray-600">Gestiona las integraciones con sistemas ERP empresariales</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => navigate('/integrations/erp')} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Conector ERP
            </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${getStatColor(stat.color)}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-medium ${getChangeColor(stat.changeType)}`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 ml-2">vs mes anterior</span>
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

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar conectores ERP, sistemas, proveedores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-4 py-2 border border-gray-300 rounded-lg transition-colors ${
              showFilters ? 'bg-gray-100 text-gray-900' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Todos los estados</option>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="error">Con errores</option>
                <option value="syncing">Sincronizando</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Todos los tipos</option>
                <option value="erp">ERP</option>
                <option value="ecommerce">E-commerce</option>
                <option value="tms">TMS</option>
                <option value="api">API</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proveedor
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Todos los proveedores</option>
                <option value="sap">SAP</option>
                <option value="oracle">Oracle</option>
                <option value="shopify">Shopify</option>
                <option value="magento">Magento</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Última Sincronización
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Cualquier fecha</option>
                <option value="today">Hoy</option>
                <option value="week">Esta semana</option>
                <option value="month">Este mes</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <Routes>
          <Route path="/" element={<IntegrationsOverview />} />
          <Route path="/erp" element={<ERPConnectors />} />
        </Routes>
      </div>
    </div>
  );
}

// IntegrationsOverview component for the default route
function IntegrationsOverview() {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = React.useState<Array<{
    id: string | number;
    name: string;
    type: string;
    status: string;
    lastSync: string;
    records: string;
    provider: string;
    description: string;
  }>>([]);
  const [loading, setLoading] = React.useState(true);

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      syncing: 'bg-blue-100 text-blue-800',
      error: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ERP':
        return <Database className="w-5 h-5 text-blue-600" />;
      case 'E-commerce':
        return <ShoppingCart className="w-5 h-5 text-green-600" />;
      case 'TMS':
        return <Truck className="w-5 h-5 text-purple-600" />;
      case 'API':
        return <Zap className="w-5 h-5 text-orange-600" />;
      default:
        return <Code className="w-5 h-5 text-gray-600" />;
    }
  };

  const providerFromType = (type: string | null) => {
    const t = (type || '').toLowerCase();
    if (t.includes('sap')) return 'SAP';
    if (t.includes('netsuite')) return 'NetSuite';
    if (t.includes('dynamics')) return 'Microsoft';
    if (t.includes('odoo')) return 'Odoo';
    if (t.includes('sage')) return 'Sage';
    return type || '—';
  };

  React.useEffect(() => {
    let mounted = true;
    const loadConnectors = async () => {
      try {
        const { data, error } = await supabase
          .from('erp_connectors')
          .select('id,name,type,status,last_sync,records_processed,version')
          .order('created_at', { ascending: false });
        if (error) throw error;
        const items = (data || []).map((c: any) => ({
          id: c.id,
          name: c.name || 'Conector ERP',
          type: 'ERP',
          status: c.status || 'inactive',
          lastSync: c.last_sync ? new Date(c.last_sync).toLocaleString('es-ES') : '-',
          records: (c.records_processed || 0).toLocaleString('es-ES'),
          provider: providerFromType(c.type),
          description: `${c.type || 'ERP'}${c.version ? ` · v${c.version}` : ''}`
        }));
        if (mounted) setIntegrations(items);
      } catch (e) {
        console.error('Error cargando conectores ERP:', e);
        if (mounted) setIntegrations([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadConnectors();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSync = async (id: string | number) => {
const apiBase = import.meta.env.VITE_AUTH_BACKEND_URL || '';
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, status: 'syncing' } : i));
    try {
      console.info('[Dashboard] Sync start', { id, apiBase });
      if (!apiBase) throw new Error('Backend no configurado: defina VITE_AUTH_BACKEND_URL');
      for (const target of ['products', 'purchase_orders'] as const) {
        console.info('[Dashboard] Syncing target', { id, target });
        const resp = await fetch(`${apiBase}/erp/connectors/${id}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 50, target })
        });
        const data = await resp.json();
        if (!resp.ok || !data?.ok) {
          throw new Error(data?.error || `Fallo en la sincronización de ${target}`);
        }
        console.info('[Dashboard] Target synced', { id, target, status: resp.status, processed: Number(data?.processed || 0), newCount: Number(data?.newCount || 0) });
        // Notificación al Header
        try {
          window.dispatchEvent(new CustomEvent('erp:notify', { detail: { type: target, count: Number(data?.newCount || 0), processed: Number(data?.processed || 0), connectorId: id } }));
        } catch {}
        if (target === 'products') {
          try { window.dispatchEvent(new Event('products:refresh')); } catch {}
        }
      }
      const { data: connectors, error } = await supabase
        .from('erp_connectors')
        .select('id,name,type,status,last_sync,records_processed,version')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const items = (connectors || []).map((c: any) => ({
        id: c.id,
        name: c.name || 'Conector ERP',
        type: 'ERP',
        status: c.status || 'inactive',
        lastSync: c.last_sync ? new Date(c.last_sync).toLocaleString('es-ES') : '-',
        records: (c.records_processed || 0).toLocaleString('es-ES'),
        provider: providerFromType(c.type),
        description: `${c.type || 'ERP'}${c.version ? ` · v${c.version}` : ''}`
      }));
      setIntegrations(items);
      console.info('[Dashboard] Sync finished', { id });
    } catch (e: any) {
      console.error('[Dashboard] Sync error', { id, message: e?.message || String(e) });
      setIntegrations(prev => prev.map(i => i.id === id ? { ...i, status: 'error' } : i));
      alert(e?.message || 'Error al sincronizar el conector');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Conectores ERP</h2>
        <div className="text-sm text-gray-500">
          {loading ? 'Cargando…' : `${integrations.length} integraciones configuradas`}
        </div>
      </div>

      <div className="grid gap-4">
        {integrations.map((integration) => (
          <div key={integration.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getTypeIcon(integration.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {integration.name}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(integration.status)}`}>
                      {integration.status === 'active' && 'Activo'}
                      {integration.status === 'syncing' && 'Sincronizando'}
                      {integration.status === 'error' && 'Error'}
                      {integration.status === 'inactive' && 'Inactivo'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {integration.description}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span>Tipo: {integration.type}</span>
                    <span>Proveedor: {integration.provider}</span>
                    <span>Registros: {integration.records}</span>
                    <span>Última sync: {integration.lastSync}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                {getStatusIcon(integration.status)}
                <button
                  onClick={() => handleSync(integration.id)}
                  className={`inline-flex items-center px-2.5 py-1 text-sm border rounded-md ${integration.status === 'syncing' ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${integration.status === 'syncing' ? 'animate-spin' : ''}`} />
                  Actualizar
                </button>
                <button onClick={() => navigate('/integrations/erp')} className="text-gray-400 hover:text-gray-600">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {!loading && integrations.length === 0 && (
          <div className="border border-gray-200 rounded-lg p-6 text-center text-sm text-gray-600">
            No hay conectores configurados.
          </div>
        )}
      </div>

      {/* Quick Actions */}
       <div className="bg-gray-50 rounded-lg p-4">
         <h3 className="text-sm font-medium text-gray-900 mb-3">Acciones Rápidas</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
           <button onClick={() => navigate('/integrations/erp')} className="flex items-center justify-center px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
             <Database className="w-4 h-4 mr-2 text-blue-600" />
             Nuevo Conector ERP
           </button>
           <button className="flex items-center justify-center px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
             <Settings className="w-4 h-4 mr-2 text-gray-600" />
             Configurar Sincronización
           </button>
           <button className="flex items-center justify-center px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
             <Activity className="w-4 h-4 mr-2 text-green-600" />
             Ver Logs de Actividad
           </button>
         </div>
       </div>
    </div>
  );
}
