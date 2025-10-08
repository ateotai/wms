import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
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

export function IntegrationsDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const location = useLocation();

  const tabs = [
    { name: 'Conectores ERP', href: '/integrations/erp', icon: Database }
  ];

  const isActiveTab = (href: string) => {
    return location.pathname.startsWith(href);
  };

  // Mock stats data
  const stats = [
    {
      title: 'Integraciones Activas',
      value: '12',
      change: '+2',
      changeType: 'increase' as const,
      icon: CheckCircle,
      color: 'green'
    },
    {
      title: 'Sincronizaciones Hoy',
      value: '1,247',
      change: '+18%',
      changeType: 'increase' as const,
      icon: RefreshCw,
      color: 'blue'
    },
    {
      title: 'APIs Disponibles',
      value: '8',
      change: '+1',
      changeType: 'increase' as const,
      icon: Zap,
      color: 'purple'
    },
    {
      title: 'Tiempo Respuesta',
      value: '245ms',
      change: '-12ms',
      changeType: 'decrease' as const,
      icon: Clock,
      color: 'orange'
    }
  ];

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
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
          <button className="flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
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
  const integrations = [
    {
      id: 1,
      name: 'SAP ERP',
      type: 'ERP',
      status: 'active',
      lastSync: '2024-01-15 14:30',
      records: '1,247',
      provider: 'SAP',
      description: 'Integración con sistema SAP para sincronización de productos y órdenes'
    },
    {
      id: 3,
      name: 'Oracle WMS',
      type: 'ERP',
      status: 'syncing',
      lastSync: '2024-01-15 14:20',
      records: '2,156',
      provider: 'Oracle',
      description: 'Sistema de gestión de almacén Oracle para operaciones avanzadas'
    },
    {
      id: 7,
      name: 'Microsoft Dynamics',
      type: 'ERP',
      status: 'active',
      lastSync: '2024-01-15 14:00',
      records: '3,421',
      provider: 'Microsoft',
      description: 'Integración con Dynamics 365 para gestión empresarial completa'
    },
    {
      id: 8,
      name: 'NetSuite ERP',
      type: 'ERP',
      status: 'error',
      lastSync: '2024-01-15 12:15',
      records: '0',
      provider: 'NetSuite',
      description: 'Sistema ERP en la nube con error de conexión - requiere atención'
    }
  ];

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Conectores ERP</h2>
        <div className="text-sm text-gray-500">
          {integrations.length} integraciones configuradas
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
                <button className="text-gray-400 hover:text-gray-600">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
       <div className="bg-gray-50 rounded-lg p-4">
         <h3 className="text-sm font-medium text-gray-900 mb-3">Acciones Rápidas</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
           <button className="flex items-center justify-center px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
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