import React, { useState } from 'react';
import { 
  Truck, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Package,
  Calendar,
  DollarSign,
  Route,
  Timer,
  AlertTriangle
} from 'lucide-react';

interface TMSIntegration {
  id: string;
  name: string;
  provider: string;
  status: 'active' | 'inactive' | 'error' | 'syncing';
  lastSync: string;
  shipmentsToday: number;
  totalShipments: number;
  avgDeliveryTime: number;
  cost: number;
  apiEndpoint: string;
  trackingUrl: string;
}

export function TMSIntegrations() {
  const [integrations, setIntegrations] = useState<TMSIntegration[]>([
    {
      id: '1',
      name: 'DHL Express',
      provider: 'DHL',
      status: 'active',
      lastSync: '2024-01-15 14:35:00',
      shipmentsToday: 23,
      totalShipments: 1847,
      avgDeliveryTime: 2.5,
      cost: 15430.50,
      apiEndpoint: 'https://api.dhl.com/mydhlapi',
      trackingUrl: 'https://www.dhl.com/tracking'
    },
    {
      id: '2',
      name: 'FedEx International',
      provider: 'FedEx',
      status: 'active',
      lastSync: '2024-01-15 14:32:00',
      shipmentsToday: 18,
      totalShipments: 1256,
      avgDeliveryTime: 3.2,
      cost: 12750.25,
      apiEndpoint: 'https://apis.fedex.com/ship/v1',
      trackingUrl: 'https://www.fedex.com/tracking'
    },
    {
      id: '3',
      name: 'UPS Worldwide',
      provider: 'UPS',
      status: 'syncing',
      lastSync: '2024-01-15 14:28:00',
      shipmentsToday: 31,
      totalShipments: 2892,
      avgDeliveryTime: 2.8,
      cost: 18250.75,
      apiEndpoint: 'https://onlinetools.ups.com/api',
      trackingUrl: 'https://www.ups.com/track'
    },
    {
      id: '4',
      name: 'Correos Express',
      provider: 'Correos',
      status: 'error',
      lastSync: '2024-01-15 13:15:00',
      shipmentsToday: 0,
      totalShipments: 421,
      avgDeliveryTime: 4.1,
      cost: 3780.90,
      apiEndpoint: 'https://api.correosexpress.com/v2',
      trackingUrl: 'https://www.correosexpress.com/seguimiento'
    },
    {
      id: '5',
      name: 'SEUR Nacional',
      provider: 'SEUR',
      status: 'active',
      lastSync: '2024-01-15 14:20:00',
      shipmentsToday: 15,
      totalShipments: 987,
      avgDeliveryTime: 1.8,
      cost: 8950.40,
      apiEndpoint: 'https://ws.seur.com/webseur',
      trackingUrl: 'https://www.seur.com/seguimiento'
    }
  ]);

  const [selectedIntegration, setSelectedIntegration] = useState<TMSIntegration | null>(null);
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
        return <AlertTriangle className="w-4 h-4 text-gray-400" />;
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

  const getProviderIcon = (provider: string) => {
    // In a real app, you'd use actual provider icons
    return <Truck className="w-8 h-8 text-blue-500" />;
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
              shipmentsToday: integration.shipmentsToday + Math.floor(Math.random() * 5)
            }
          : integration
      ));
    }, 3000);
  };

  const handleViewDetails = (integration: TMSIntegration) => {
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
          <h2 className="text-xl font-semibold text-gray-900">Integraciones TMS</h2>
          <p className="text-gray-600">Gestiona las integraciones con sistemas de transporte</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Integración
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Envíos Hoy</p>
              <p className="text-2xl font-bold text-gray-900">
                {integrations.reduce((sum, int) => sum + int.shipmentsToday, 0)}
              </p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Envíos</p>
              <p className="text-2xl font-bold text-gray-900">
                {integrations.reduce((sum, int) => sum + int.totalShipments, 0).toLocaleString()}
              </p>
            </div>
            <Truck className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tiempo Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {(integrations.reduce((sum, int) => sum + int.avgDeliveryTime, 0) / integrations.length).toFixed(1)} días
              </p>
            </div>
            <Timer className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Costo Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(integrations.reduce((sum, int) => sum + int.cost, 0))}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-orange-500" />
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
                  Proveedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Envíos Hoy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Envíos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tiempo Promedio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Costo
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
                      {getProviderIcon(integration.provider)}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {integration.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {integration.provider}
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
                      {integration.shipmentsToday}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Truck className="w-4 h-4 text-gray-400 mr-2" />
                      {integration.totalShipments.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Timer className="w-4 h-4 text-gray-400 mr-2" />
                      {integration.avgDeliveryTime} días
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 text-gray-400 mr-2" />
                      {formatCurrency(integration.cost)}
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
                  <label className="block text-sm font-medium text-gray-700">Proveedor</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedIntegration.provider}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <div className="mt-1 flex items-center">
                    {getStatusIcon(selectedIntegration.status)}
                    <span className="ml-2 text-sm text-gray-900">{getStatusText(selectedIntegration.status)}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Endpoint API</label>
                  <p className="mt-1 text-sm text-gray-900 break-all">{selectedIntegration.apiEndpoint}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">URL de Seguimiento</label>
                  <p className="mt-1 text-sm text-gray-900 break-all">{selectedIntegration.trackingUrl}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Envíos Hoy</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedIntegration.shipmentsToday}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Envíos</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedIntegration.totalShipments.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tiempo Promedio de Entrega</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedIntegration.avgDeliveryTime} días</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Costo Total</label>
                  <p className="mt-1 text-sm text-gray-900">{formatCurrency(selectedIntegration.cost)}</p>
                </div>
                <div className="col-span-2">
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