import React, { useState } from 'react';
import { 
  Code, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Key,
  Globe,
  Activity,
  Zap,
  Copy,
  Eye,
  EyeOff,
  Calendar,
  BarChart3,
  AlertTriangle
} from 'lucide-react';

interface APIEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  status: 'active' | 'inactive' | 'error';
  lastUsed: string;
  requestsToday: number;
  totalRequests: number;
  avgResponseTime: number;
  description: string;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive' | 'error';
  lastTriggered: string;
  triggersToday: number;
  totalTriggers: number;
  secret: string;
}

export function APIManagement() {
  const [activeTab, setActiveTab] = useState<'endpoints' | 'webhooks'>('endpoints');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [showModal, setShowModal] = useState(false);

  const apiKey = "wms_api_key_1234567890abcdef";

  const [endpoints] = useState<APIEndpoint[]>([
    {
      id: '1',
      name: 'Obtener Inventario',
      method: 'GET',
      endpoint: '/api/v1/inventory',
      status: 'active',
      lastUsed: '2024-01-15 14:35:00',
      requestsToday: 247,
      totalRequests: 15847,
      avgResponseTime: 120,
      description: 'Obtiene la lista completa del inventario'
    },
    {
      id: '2',
      name: 'Crear Orden',
      method: 'POST',
      endpoint: '/api/v1/orders',
      status: 'active',
      lastUsed: '2024-01-15 14:32:00',
      requestsToday: 89,
      totalRequests: 5623,
      avgResponseTime: 340,
      description: 'Crea una nueva orden de trabajo'
    },
    {
      id: '3',
      name: 'Actualizar Stock',
      method: 'PUT',
      endpoint: '/api/v1/inventory/{id}/stock',
      status: 'active',
      lastUsed: '2024-01-15 14:28:00',
      requestsToday: 156,
      totalRequests: 8934,
      avgResponseTime: 180,
      description: 'Actualiza el stock de un producto específico'
    },
    {
      id: '4',
      name: 'Eliminar Producto',
      method: 'DELETE',
      endpoint: '/api/v1/products/{id}',
      status: 'inactive',
      lastUsed: '2024-01-14 16:15:00',
      requestsToday: 0,
      totalRequests: 234,
      avgResponseTime: 95,
      description: 'Elimina un producto del sistema'
    }
  ]);

  const [webhooks] = useState<Webhook[]>([
    {
      id: '1',
      name: 'Notificación de Orden',
      url: 'https://external-system.com/webhooks/orders',
      events: ['order.created', 'order.updated', 'order.completed'],
      status: 'active',
      lastTriggered: '2024-01-15 14:35:00',
      triggersToday: 47,
      totalTriggers: 2847,
      secret: 'whsec_1234567890abcdef'
    },
    {
      id: '2',
      name: 'Alerta de Stock Bajo',
      url: 'https://inventory-system.com/alerts/low-stock',
      events: ['inventory.low_stock', 'inventory.out_of_stock'],
      status: 'active',
      lastTriggered: '2024-01-15 14:20:00',
      triggersToday: 12,
      totalTriggers: 456,
      secret: 'whsec_abcdef1234567890'
    },
    {
      id: '3',
      name: 'Sincronización ERP',
      url: 'https://erp.company.com/sync/wms',
      events: ['product.created', 'product.updated', 'inventory.updated'],
      status: 'error',
      lastTriggered: '2024-01-15 13:15:00',
      triggersToday: 0,
      totalTriggers: 1234,
      secret: 'whsec_fedcba0987654321'
    }
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
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
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-blue-100 text-blue-800';
      case 'POST':
        return 'bg-green-100 text-green-800';
      case 'PUT':
        return 'bg-yellow-100 text-yellow-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleViewEndpointDetails = (endpoint: APIEndpoint) => {
    setSelectedEndpoint(endpoint);
    setSelectedWebhook(null);
    setShowModal(true);
  };

  const handleViewWebhookDetails = (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    setSelectedEndpoint(null);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Gestión de APIs</h2>
          <p className="text-gray-600">Administra endpoints y webhooks del sistema</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Zap className="w-4 h-4 mr-2" />
            Nuevo Webhook
          </button>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Endpoint
          </button>
        </div>
      </div>

      {/* API Key Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Clave API</h3>
          <button
            onClick={() => setShowApiKey(!showApiKey)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex-1 bg-gray-50 p-3 rounded-lg font-mono text-sm">
            {showApiKey ? apiKey : '••••••••••••••••••••••••••••••••'}
          </div>
          <button
            onClick={() => copyToClipboard(apiKey)}
            className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copiar
          </button>
          <button className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('endpoints')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'endpoints'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Code className="w-4 h-4 inline mr-2" />
            Endpoints API
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'webhooks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Zap className="w-4 h-4 inline mr-2" />
            Webhooks
          </button>
        </nav>
      </div>

      {/* Endpoints Tab */}
      {activeTab === 'endpoints' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Requests Hoy</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {endpoints.reduce((sum, ep) => sum + ep.requestsToday, 0)}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {endpoints.reduce((sum, ep) => sum + ep.totalRequests, 0).toLocaleString()}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tiempo Promedio</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(endpoints.reduce((sum, ep) => sum + ep.avgResponseTime, 0) / endpoints.length)}ms
                  </p>
                </div>
                <Clock className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Endpoints Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Endpoint
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Método
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requests Hoy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tiempo Respuesta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Último Uso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {endpoints.map((endpoint) => (
                    <tr key={endpoint.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {endpoint.name}
                          </div>
                          <div className="text-sm text-gray-500 font-mono">
                            {endpoint.endpoint}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMethodColor(endpoint.method)}`}>
                          {endpoint.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(endpoint.status)}
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(endpoint.status)}`}>
                            {getStatusText(endpoint.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {endpoint.requestsToday}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {endpoint.avgResponseTime}ms
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {endpoint.lastUsed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleViewEndpointDetails(endpoint)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button className="text-blue-600 hover:text-blue-900">
                          <Edit className="w-4 h-4" />
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
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Triggers Hoy</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {webhooks.reduce((sum, wh) => sum + wh.triggersToday, 0)}
                  </p>
                </div>
                <Zap className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Triggers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {webhooks.reduce((sum, wh) => sum + wh.totalTriggers, 0).toLocaleString()}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Webhooks Activos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {webhooks.filter(wh => wh.status === 'active').length}
                  </p>
                </div>
                <Globe className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Webhooks Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Webhook
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Eventos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Triggers Hoy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Último Trigger
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {webhooks.map((webhook) => (
                    <tr key={webhook.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {webhook.name}
                          </div>
                          <div className="text-sm text-gray-500 break-all">
                            {webhook.url}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(webhook.status)}
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(webhook.status)}`}>
                            {getStatusText(webhook.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {webhook.events.map((event, index) => (
                            <span key={index} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                              {event}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {webhook.triggersToday}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {webhook.lastTriggered}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleViewWebhookDetails(webhook)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button className="text-blue-600 hover:text-blue-900">
                          <Edit className="w-4 h-4" />
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
        </div>
      )}

      {/* Modal for Details */}
      {showModal && (selectedEndpoint || selectedWebhook) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedEndpoint ? `Endpoint: ${selectedEndpoint.name}` : `Webhook: ${selectedWebhook?.name}`}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              {selectedEndpoint && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Método</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEndpoint.method}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estado</label>
                    <div className="mt-1 flex items-center">
                      {getStatusIcon(selectedEndpoint.status)}
                      <span className="ml-2 text-sm text-gray-900">{getStatusText(selectedEndpoint.status)}</span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Endpoint</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">{selectedEndpoint.endpoint}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Descripción</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEndpoint.description}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Requests Hoy</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEndpoint.requestsToday}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Requests</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEndpoint.totalRequests.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tiempo Promedio</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEndpoint.avgResponseTime}ms</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Último Uso</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEndpoint.lastUsed}</p>
                  </div>
                </div>
              )}

              {selectedWebhook && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estado</label>
                    <div className="mt-1 flex items-center">
                      {getStatusIcon(selectedWebhook.status)}
                      <span className="ml-2 text-sm text-gray-900">{getStatusText(selectedWebhook.status)}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Triggers Hoy</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedWebhook.triggersToday}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">URL</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded break-all">{selectedWebhook.url}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Eventos</label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedWebhook.events.map((event, index) => (
                        <span key={index} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Triggers</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedWebhook.totalTriggers.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Último Trigger</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedWebhook.lastTriggered}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Secret</label>
                    <div className="mt-1 flex items-center space-x-2">
                      <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded flex-1">
                        {showApiKey ? selectedWebhook.secret : '••••••••••••••••••••••••'}
                      </p>
                      <button
                        onClick={() => copyToClipboard(selectedWebhook.secret)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cerrar
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Editar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}