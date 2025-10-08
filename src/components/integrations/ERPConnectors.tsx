import React, { useState, useEffect } from 'react';
import { Plus, Settings, Trash2, RefreshCw, Database, CheckCircle, AlertCircle, Clock, WifiOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
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
}

export function ERPConnectors() {
  const [connectors, setConnectors] = useState<ERPConnector[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<ERPConnector | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showConnectorForm, setShowConnectorForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cargar conectores desde la base de datos
  useEffect(() => {
    loadConnectors();
  }, []);

  const loadConnectors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('erp_connectors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading connectors:', error);
        return;
      }

      // Transformar los datos de la base de datos al formato esperado
      const transformedConnectors: ERPConnector[] = (data || []).map(connector => ({
        id: connector.id,
        name: connector.name,
        type: connector.type,
        status: connector.status,
        lastSync: connector.last_sync ? new Date(connector.last_sync).toLocaleString('es-ES') : '-',
        nextSync: connector.next_sync ? new Date(connector.next_sync).toLocaleString('es-ES') : '-',
        recordsProcessed: connector.records_processed || 0,
        errorCount: connector.error_count || 0,
        endpoint: connector.endpoint,
        version: connector.version || '1.0'
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

  const handleSync = (connectorId: string) => {
    setConnectors(prev => prev.map(conn => 
      conn.id === connectorId 
        ? { ...conn, status: 'syncing' as const }
        : conn
    ));
    
    // Simulate sync completion after 3 seconds
    setTimeout(() => {
      setConnectors(prev => prev.map(conn => 
        conn.id === connectorId 
          ? { 
              ...conn, 
              status: 'active' as const, 
              lastSync: new Date().toLocaleString('es-ES'),
              recordsProcessed: conn.recordsProcessed + Math.floor(Math.random() * 100)
            }
          : conn
      ));
    }, 3000);
  };

  const handleViewDetails = (connector: ERPConnector) => {
    setSelectedConnector(connector);
    setShowModal(true);
  };

  const handleCreateConnector = async (formData: any) => {
    try {
      // Preparar datos para la base de datos
      const connectorData = {
        name: formData.name,
        type: formData.type,
        endpoint: formData.endpoint,
        username: formData.username,
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
        connection_settings: formData.connectionSettings || {},
        inventory_mapping: formData.inventoryMapping || {},
        is_active: formData.isActive || false
      };

      // Insertar en la base de datos
      const { data, error } = await supabase
        .from('erp_connectors')
        .insert([connectorData])
        .select()
        .single();

      if (error) {
        console.error('Error creating connector:', error);
        alert('Error al crear el conector. Por favor, intenta de nuevo.');
        return;
      }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Conectores ERP</h2>
          <p className="text-gray-600">Gestiona las integraciones con sistemas ERP</p>
        </div>
        <button 
          onClick={() => setShowConnectorForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Conector ERP
        </button>
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
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      connector.errorCount > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {connector.errorCount} errores
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleSync(connector.id)}
                      disabled={connector.status === 'syncing'}
                      className="text-blue-600 hover:text-blue-900 disabled:text-gray-400"
                    >
                      <RefreshCw className={`w-4 h-4 ${connector.status === 'syncing' ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleViewDetails(connector)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
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
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Configurar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ERP Connector Form */}
      {showConnectorForm && (
        <ERPConnectorForm
          onClose={() => setShowConnectorForm(false)}
          onSave={handleCreateConnector}
        />
      )}
    </div>
  );
}