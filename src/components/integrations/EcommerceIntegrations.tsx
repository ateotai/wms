import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Activity,
  Wifi,
  WifiOff,
  Calendar,
  BarChart3,
  Package,
  TrendingUp,
  DollarSign
} from 'lucide-react';

interface EcommerceIntegration {
  id: string;
  name: string;
  platform: string;
  status: 'active' | 'inactive' | 'error' | 'syncing';
  lastSync: string;
  ordersToday: number;
  totalOrders: number;
  revenue: number;
  endpoint: string;
  storeUrl: string;
}

export function EcommerceIntegrations() {
  const [integrations, setIntegrations] = useState<EcommerceIntegration[]>([
    {
      id: '1',
      name: 'Tienda Principal',
      platform: 'Shopify',
      status: 'active',
      lastSync: '2024-01-15 14:35:00',
      ordersToday: 47,
      totalOrders: 2847,
      revenue: 125430.50,
      endpoint: 'https://tienda.myshopify.com/admin/api/2023-10',
      storeUrl: 'https://tienda.com'
    },
    {
      id: '2',
      name: 'Marketplace B2B',
      platform: 'Magento',
      status: 'syncing',
      lastSync: '2024-01-15 14:30:00',
      ordersToday: 23,
      totalOrders: 1456,
      revenue: 89750.25,
      endpoint: 'https://b2b.empresa.com/rest/V1',
      storeUrl: 'https://b2b.empresa.com'
    },
    {
      id: '3',
      name: 'Tienda Móvil',
      platform: 'WooCommerce',
      status: 'active',
      lastSync: '2024-01-15 14:28:00',
      ordersToday: 18,
      totalOrders: 892,
      revenue: 34250.75,
      endpoint: 'https://movil.empresa.com/wp-json/wc/v3',
      storeUrl: 'https://movil.empresa.com'
    },
    {
      id: '4',
      name: 'Amazon Store',
      platform: 'Amazon MWS',
      status: 'error',
      lastSync: '2024-01-15 13:15:00',
      ordersToday: 0,
      totalOrders: 3421,
      revenue: 156780.90,
      endpoint: 'https://mws.amazonservices.com',
      storeUrl: 'https://amazon.com/seller'
    }
  ]);

  const [selectedIntegration, setSelectedIntegration] = useState<EcommerceIntegration | null>(null);
  const [showModal, setShowModal] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'inactive':
        return <WifiOff className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'syncing':
        return 'Sincronizando';
      case 'error':
        return 'Error';
      case 'inactive':
        return 'Inactivo';
      default:
        return 'Desconocido';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'syncing':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlatformIcon = (platform: string) => {
    // In a real app, you'd use actual platform icons
    return <ShoppingCart className="w-8 h-8 text-purple-500" />;
  };

  const handleSync = (integrationId: string) => {
    setIntegrations(prev => prev.map(integration => 
      integration.id === integrationId 
        ? { ...integration, status: 'syncing' as const }
        : integration
    ));
    
    // Simulate sync completion after 3 seconds
    setTimeout(() => {
      setIntegrations(prev => prev.map(integration => 
        integration.id === integrationId 
          ? { 
              ...integration, 
              status: 'active' as const, 
              lastSync: new Date().toLocaleString('es-ES'),
              ordersToday: integration.ordersToday + Math.floor(Math.random() * 10)
            }
          : integration
      ));
    }, 3000);
  };

  const handleViewDetails = (integration: EcommerceIntegration) => {
    setSelectedIntegration(integration);
    setShowModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Integraciones E-commerce</h2>
          <p className="text-gray-600">Gestiona las integraciones con tiendas online</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Integración
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Órdenes Hoy</p>
              <p className="text-2xl font-bold text-gray-900">
                {integrations.reduce((sum, int) => sum + int.ordersToday, 0)}
              </p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Órdenes</p>
              <p className="text-2xl font-bold text-gray-900">
                {integrations.reduce((sum, int) => sum + int.totalOrders, 0).toLocaleString()}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(integrations.reduce((sum, int) => sum + int.revenue, 0))}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Integrations Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tienda
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Órdenes Hoy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Órdenes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ingresos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Sync
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {integrations.map((integration) => (
                <tr key={integration.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getPlatformIcon(integration.platform)}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {integration.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {integration.platform}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(integration.status)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(integration.status)}`}>
                        {getStatusText(integration.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Package className="w-4 h-4 text-gray-400 mr-2" />
                      {integration.ordersToday}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <BarChart3 className="w-4 h-4 text-gray-400 mr-2" />
                      {integration.totalOrders.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 text-gray-400 mr-2" />
                      {formatCurrency(integration.revenue)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      {integration.lastSync}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleSync(integration.id)}
                      disabled={integration.status === 'syncing'}
                      className="text-blue-600 hover:text-blue-900 disabled:text-gray-400"
                    >
                      <RefreshCw className={`w-4 h-4 ${integration.status === 'syncing' ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleViewDetails(integration)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Integration Details */}
      {showModal && selectedIntegration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Detalles de Integración: {selectedIntegration.name}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Plataforma</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedIntegration.platform}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <div className="mt-1 flex items-center">
                    {getStatusIcon(selectedIntegration.status)}
                    <span className="ml-2 text-sm text-gray-900">{getStatusText(selectedIntegration.status)}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">URL de la Tienda</label>
                  <p className="mt-1 text-sm text-gray-900 break-all">{selectedIntegration.storeUrl}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Endpoint API</label>
                  <p className="mt-1 text-sm text-gray-900 break-all">{selectedIntegration.endpoint}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Órdenes Hoy</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedIntegration.ordersToday}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Órdenes</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedIntegration.totalOrders.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ingresos Totales</label>
                  <p className="mt-1 text-sm text-gray-900">{formatCurrency(selectedIntegration.revenue)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Última Sincronización</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedIntegration.lastSync}</p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cerrar
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Configurar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}