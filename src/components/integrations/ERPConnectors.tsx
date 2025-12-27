import { useState, useEffect } from 'react';
import { Plus, Eye, Pencil, Trash2, RefreshCw, Database, CheckCircle, AlertCircle, Clock, WifiOff, Calendar, BarChart3 } from 'lucide-react';
// import { supabase } from '../../lib/supabase';
import { ERPConnectorForm } from './ERPConnectorForm';

interface ERPConnector {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error' | 'syncing';
  lastSync: string;
  nextSync: string;
  recordsProcessed: number;
  errorCount: number;
  endpoint: string;
  version: string;
  direction?: 'entrada' | 'salida';
  supportedTargets?: Array<'products' | 'purchase_orders' | 'sales_orders' | 'transfers' | 'inventory'>;
  username?: string;
  password?: string;
  apiKey?: string;
  syncInterval?: number;
  syncType?: 'manual' | 'automatic';
  allowProducts?: boolean;
  inventoryMapping?: {
    productIdField?: string;
    quantityField?: string;
    locationField?: string;
    priceField?: string;
  };
}

export function ERPConnectors() {
  const [connectors, setConnectors] = useState<ERPConnector[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<ERPConnector | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showConnectorForm, setShowConnectorForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingConnector, setEditingConnector] = useState<ERPConnector | null>(null);
  const [showErrorsModal, setShowErrorsModal] = useState(false);
  const [errorsLoading, setErrorsLoading] = useState(false);
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [errorsConnector, setErrorsConnector] = useState<ERPConnector | null>(null);
  const [createMode, setCreateMode] = useState<'default' | 'outbound'>('default');

  // Cargar conectores desde la base de datos
  useEffect(() => {
    loadConnectors();
  }, []);

  const loadConnectors = async () => {
    try {
      setLoading(true);
      const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
      if (!AUTH_BACKEND_URL) {
        console.warn('[ERPConnectors] Backend no configurado, no se pueden cargar conectores');
        setConnectors([]);
        return;
      }
      const token = localStorage.getItem('app_token');
      const resp = await fetch(`${AUTH_BACKEND_URL}/erp/connectors`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(t || 'Error cargando conectores');
      }
      const json = await resp.json();
      const rows = Array.isArray(json?.connectors) ? json.connectors : [];
      const transformedConnectors: ERPConnector[] = rows.map((connector: any) => ({
        id: connector.id,
        name: connector.name,
        type: connector.type,
        status: connector.status,
        lastSync: connector.last_sync ? new Date(connector.last_sync).toLocaleString('es-ES') : '-',
        nextSync: connector.next_sync ? new Date(connector.next_sync).toLocaleString('es-ES') : '-',
        recordsProcessed: connector.records_processed || 0,
        errorCount: connector.error_count || 0,
        endpoint: connector.endpoint,
        version: connector.version || '1.0',
        direction: (connector.connection_settings || {}).direction === 'outbound' ? 'salida' : 'entrada',
        supportedTargets: (connector.connection_settings || {}).supportedTargets || [],
        allowProducts: ((connector.connection_settings || {}).allowProducts === true),
        username: connector.username || '',
        password: connector.password || '',
        apiKey: connector.api_key || '',
        syncInterval: Number(connector.sync_interval || 0) || 0,
        syncType: (connector.sync_type || 'automatic'),
        inventoryMapping: connector.inventory_mapping || {}
      }));
      setConnectors(transformedConnectors);
    } catch (error) {
      console.error('Error loading connectors:', error);
    } finally {
      setLoading(false);
    }
  };

  

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

  const handleSync = async (
    connectorId: string,
    target: 'products' | 'purchase_orders' | 'sales_orders' | 'transfers' | 'inventory' = 'products'
  ) => {
const apiBase = import.meta.env.VITE_AUTH_BACKEND_URL || '';
    setConnectors(prev => prev.map(conn => 
      conn.id === connectorId 
        ? { ...conn, status: 'syncing' as const }
        : conn
    ));
    try {
      console.info('[ERPConnectors] Sync start', { connectorId, target, apiBase });
      if (!apiBase) throw new Error('Backend no configurado: defina VITE_AUTH_BACKEND_URL');
      const resp = await fetch(`${apiBase}/erp/connectors/${connectorId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50, target })
      });
      const data = await resp.json();
      if (!resp.ok || !data?.ok) {
        throw new Error(data?.error || 'Fallo en la sincronización');
      }
      console.info('[ERPConnectors] Sync ok', { connectorId, target, status: resp.status, processed: Number(data?.processed || 0), newCount: Number(data?.newCount || 0) });
      await loadConnectors();
      // Emitir evento de notificación para Header
      try {
        window.dispatchEvent(new CustomEvent('erp:notify', { detail: { type: target, count: Number(data?.newCount || 0), processed: Number(data?.processed || 0), connectorId } }));
      } catch {}
      if (target === 'products' || target === 'purchase_orders') {
        // Notificar a la UI para refrescar el catálogo de productos
        try { window.dispatchEvent(new Event('products:refresh')); } catch {}
      }
      console.info('[ERPConnectors] Sync completed', { connectorId, target });
    } catch (e: any) {
      console.error('[ERPConnectors] Sync error', { connectorId, target, message: e?.message || String(e) });
      setConnectors(prev => prev.map(conn => 
        conn.id === connectorId 
          ? { ...conn, status: 'error' as const }
          : conn
      ));
      alert(e?.message || 'Error al sincronizar el conector');
    }
  };

  const handleViewDetails = (connector: ERPConnector) => {
    setSelectedConnector(connector);
    setShowModal(true);
  };

  const handleEditConnector = (connector: ERPConnector) => {
    setIsEditing(true);
    setEditingConnector(connector);
    setShowModal(false);
    setShowConnectorForm(true);
  };

  const handleDeleteConnector = async (connectorId: string) => {
    try {
      const confirmed = window.confirm('¿Eliminar este conector ERP? Esta acción no se puede deshacer.');
      if (!confirmed) return;
      const apiBase = import.meta.env.VITE_AUTH_BACKEND_URL || '';
      if (!apiBase) {
        alert('Backend no configurado: defina VITE_AUTH_BACKEND_URL');
        return;
      }
      const token = localStorage.getItem('app_token');
      const resp = await fetch(`${apiBase}/erp/connectors/${connectorId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!resp.ok) {
        const t = await resp.text().catch(() => '');
        throw new Error(t || 'No se pudo eliminar el conector');
      }
      await loadConnectors();
      alert('Conector eliminado');
    } catch (e: any) {
      console.error('Error al eliminar conector:', e?.message || e);
      alert(e?.message || 'No se pudo eliminar el conector');
    }
  };

  const handleShowErrors = async (connector: ERPConnector) => {
    try {
      setErrorsConnector(connector);
      setShowErrorsModal(true);
      setErrorsLoading(true);
      setErrorLogs([]);
      const apiBase = import.meta.env.VITE_AUTH_BACKEND_URL || '';
      if (!apiBase) throw new Error('Backend no configurado');
      const token = localStorage.getItem('app_token');
      const resp = await fetch(`${apiBase}/erp/connectors/${connector.id}/errors?limit=50`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await resp.json().catch(() => ({} as any));
      if (!resp.ok) throw new Error(data?.error || 'Error leyendo errores');
      const rows = Array.isArray(data?.errors) ? data.errors : [];
      setErrorLogs(rows);
    } catch (e: any) {
      setErrorLogs([]);
      alert(e?.message || 'No se pudieron cargar los errores');
    } finally {
      setErrorsLoading(false);
    }
  };

  const handleCreateConnector = async (formData: any) => {
    try {
      const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
      const payload = {
        name: formData.name,
        type: formData.type === 'Custom' ? 'API Personalizada' : formData.type,
        endpoint: formData.endpoint,
        username: formData.username,
        password: formData.password,
        api_key: formData.apiKey,
        version: formData.version || '1.0',
        sync_interval: formData.syncInterval || 60,
        sync_type: formData.syncType || 'manual',
        status: formData.isActive ? 'active' : 'inactive',
        last_sync: formData.isActive ? new Date().toISOString() : null,
        next_sync: formData.isActive && formData.syncType === 'automatic'
          ? new Date(Date.now() + (formData.syncInterval || 60) * 60000).toISOString()
          : null,
        records_processed: 0,
        error_count: 0,
        connection_settings: {
          ...formData.connectionSettings,
          direction: formData.connectionSettings.direction === 'salida' ? 'outbound' : 'inbound'
        } || {},
        inventory_mapping: formData.inventoryMapping || {},
        is_active: formData.isActive || false
      } as any;

      if (!AUTH_BACKEND_URL) throw new Error('Backend no configurado');
      const token = localStorage.getItem('app_token');
      const resp = await fetch(`${AUTH_BACKEND_URL}/erp/connectors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(t || 'Error creando conector');
      }
      await loadConnectors();

      // Recargar la lista de conectores
      await loadConnectors();
      
      // Cerrar formulario
      setShowConnectorForm(false);
      
      alert('Conector creado exitosamente');
    } catch (error) {
      console.error('Error creating connector:', error);
      alert('Error al crear el conector. Por favor, intenta de nuevo.');
    }
  };

  const handleUpdateConnector = async (formData: any) => {
    try {
      if (!editingConnector) return;
      const updates = {
        name: formData.name,
        type: formData.type === 'Custom' ? 'API Personalizada' : formData.type,
        endpoint: formData.endpoint,
        username: formData.username,
        password: formData.password,
        api_key: formData.apiKey,
        version: formData.version || '1.0',
        sync_interval: formData.syncInterval || 60,
        sync_type: formData.syncType || 'manual',
        status: formData.isActive ? 'active' : 'inactive',
        connection_settings: {
          ...formData.connectionSettings,
          direction: formData.connectionSettings.direction === 'salida' ? 'outbound' : 'inbound'
        } || {},
        inventory_mapping: formData.inventoryMapping || {},
        is_active: formData.isActive || false,
        updated_at: new Date().toISOString()
      };
      const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
      if (!AUTH_BACKEND_URL) throw new Error('Backend no configurado');
      const token = localStorage.getItem('app_token');
      const resp = await fetch(`${AUTH_BACKEND_URL}/erp/connectors/${editingConnector.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(updates)
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(t || 'Error al actualizar el conector');
      }

      await loadConnectors();
      setShowConnectorForm(false);
      setIsEditing(false);
      setEditingConnector(null);
      alert('Conector actualizado exitosamente');
    } catch (error) {
      console.error('Error updating connector:', error);
      alert('Error al actualizar el conector. Por favor, intenta de nuevo.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Conectores ERP</h2>
          <p className="text-gray-600">Gestiona las integraciones con sistemas ERP</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setIsEditing(false); setEditingConnector(null); setCreateMode('outbound'); setShowConnectorForm(true); }}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Conector de Salida
          </button>
          <button 
            onClick={() => { setIsEditing(false); setEditingConnector(null); setCreateMode('default'); setShowConnectorForm(true); }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Conector ERP
          </button>
          
        </div>
      </div>

      {/* Connectors Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sistema ERP
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Sincronización
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registros
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Errores
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mr-2" />
                      <span className="text-gray-500">Cargando conectores...</span>
                    </div>
                  </td>
                </tr>
              ) : connectors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No hay conectores configurados</p>
                      <p className="text-sm">Haz clic en "Nuevo Conector ERP" para agregar tu primer conector</p>
                    </div>
                  </td>
                </tr>
              ) : (
                connectors.map((connector) => (
                <tr key={connector.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Database className="w-8 h-8 text-blue-500 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {connector.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {connector.type} v{connector.version}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${connector.direction === 'salida' ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'}`}>
                            Dirección: {connector.direction === 'salida' ? 'Salida' : 'Entrada'}
                          </span>
                          {(connector.supportedTargets || []).map((t) => (
                            <span key={t} className="inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                              {t === 'products' && 'Productos'}
                              {t === 'purchase_orders' && 'Órdenes'}
                              {t === 'sales_orders' && 'Pedidos'}
                              {t === 'inventory' && 'Inventario'}
                              {t === 'transfers' && 'Traspasos'}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(connector.status)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(connector.status)}`}>
                        {getStatusText(connector.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      {connector.lastSync}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <BarChart3 className="w-4 h-4 text-gray-400 mr-2" />
                      {connector.recordsProcessed.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleShowErrors(connector)}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        connector.errorCount > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}
                      title="Ver errores"
                    >
                      {connector.errorCount} errores
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">

                    
                    <button
                      onClick={async () => {
                        const targets: Array<'products' | 'purchase_orders' | 'sales_orders' | 'transfers' | 'inventory'> =
                          connector.supportedTargets && connector.supportedTargets.length > 0
                            ? (connector.supportedTargets as Array<'products' | 'purchase_orders' | 'sales_orders' | 'transfers' | 'inventory'>)
                            : [];
                        for (const t of targets) {
                          await handleSync(connector.id, t);
                        }
                      }}
                      disabled={connector.status === 'syncing'}
                      className={`inline-flex items-center px-3 py-1.5 border rounded-md text-sm ${connector.status === 'syncing' ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
                    >
                      <RefreshCw className={`w-4 h-4 mr-1 ${connector.status === 'syncing' ? 'animate-spin' : ''}`} />
                      Actualizar
                    </button>
                    <button
                      onClick={() => handleViewDetails(connector)}
                      className="text-gray-600 hover:text-gray-900"
                      title="Ver"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditConnector(connector)}
                      className="text-gray-600 hover:text-gray-900"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteConnector(connector.id)} className="text-red-600 hover:text-red-900" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Connector Details */}
      {showModal && selectedConnector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Detalles del Conector: {selectedConnector.name}
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
                  <label className="block text-sm font-medium text-gray-700">Tipo de Sistema</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedConnector.type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Versión</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedConnector.version}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Endpoint</label>
                  <p className="mt-1 text-sm text-gray-900 break-all">{selectedConnector.endpoint}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <div className="mt-1 flex items-center">
                    {getStatusIcon(selectedConnector.status)}
                    <span className="ml-2 text-sm text-gray-900">{getStatusText(selectedConnector.status)}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Última Sincronización</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedConnector.lastSync}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Próxima Sincronización</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedConnector.nextSync}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Registros Procesados</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedConnector.recordsProcessed.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Errores</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedConnector.errorCount}</p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => handleEditConnector(selectedConnector)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Editar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ERP Connector Form */}
              {showConnectorForm && (
                <ERPConnectorForm
                  onClose={() => { setShowConnectorForm(false); setIsEditing(false); setEditingConnector(null); }}
                  onSave={isEditing ? handleUpdateConnector : handleCreateConnector}
                  initialData={isEditing && editingConnector ? {
                    name: editingConnector.name,
                    type: editingConnector.type,
                    endpoint: editingConnector.endpoint,
                    username: editingConnector.username || '',
                    password: editingConnector.password || '',
                    apiKey: editingConnector.apiKey || '',
                    version: editingConnector.version,
                    syncInterval: editingConnector.syncInterval || 30,
                    syncType: editingConnector.syncType || 'automatic',
                    isActive: editingConnector.status === 'active',
                    inventoryMapping: {
                      productIdField: editingConnector.inventoryMapping?.productIdField || 'ItemCode',
                      quantityField: editingConnector.inventoryMapping?.quantityField || 'OnHand',
                      locationField: editingConnector.inventoryMapping?.locationField || 'WhsCode',
                      priceField: editingConnector.inventoryMapping?.priceField || 'Price'
                    },
                    connectionSettings: {
                      direction: editingConnector.direction || 'entrada',
                      supportedTargets: editingConnector.supportedTargets || [],
                      timeout: 30000,
                      retryAttempts: 3,
                      batchSize: 50,
                      allowProducts: editingConnector.allowProducts === true
                    } as any
                  } : (createMode === 'outbound' ? {
                    type: 'SAP B1',
                    connectionSettings: {
                      direction: 'salida',
                      supportedTargets: ['purchase_orders'],
                      timeout: 30000,
                      retryAttempts: 3,
                      batchSize: 50,
                      allowProducts: false
                    } as any
                  } : undefined)}
                />
              )}

      {showErrorsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Errores del conector</h3>
                <p className="text-sm text-gray-600">{errorsConnector?.name} · {errorsConnector?.type}</p>
              </div>
              <button onClick={() => setShowErrorsModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">×</button>
            </div>

            <div className="p-6">
              {errorsLoading ? (
                <div className="flex items-center text-gray-600"><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Cargando errores…</div>
              ) : errorLogs.length === 0 ? (
                <div className="text-gray-600">No hay errores registrados para este conector.</div>
              ) : (
                <ul className="space-y-4">
                  {errorLogs.map((e: any) => {
                    const started = e.started_at ? new Date(e.started_at).toLocaleString('es-ES') : '-';
                    const endedTs = e.completed_at || e.ended_at;
                    const ended = endedTs ? new Date(endedTs).toLocaleString('es-ES') : '-';
                    const dur = e.duration_seconds != null ? `${e.duration_seconds}s` : '-';
                    const target = String(e.sync_type || '').toLowerCase();
                    let targetLabel = 'Sincronización';
                    if (target === 'products') targetLabel = 'Productos';
                    else if (target === 'purchase_orders') targetLabel = 'Órdenes de compra';
                    else if (target === 'sales_orders') targetLabel = 'Pedidos';
                    else if (target === 'transfers') targetLabel = 'Traspasos';
                    return (
                      <li key={e.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                            <span className="text-sm font-semibold text-red-700">{targetLabel}</span>
                          </div>
                          <span className="text-xs text-red-700">{String(e.status || 'error')}</span>
                        </div>
                        <div className="mt-2 text-sm text-red-800 break-words">{e.error_message || 'Sin mensaje de error'}</div>
                        <div className="mt-2 text-xs text-gray-700">Inicio: {started} · Fin: {ended} · Duración: {dur}</div>
                        <div className="mt-1 text-xs text-gray-700">Procesados: {e.records_processed ?? '-'} · Fallidos: {e.records_failed ?? '-'}</div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button onClick={() => setShowErrorsModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
