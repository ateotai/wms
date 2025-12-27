import React, { useState } from 'react';
import { 
  Database, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  X,
  Eye,
  EyeOff,
  TestTube,
  Save,
  ArrowLeft
} from 'lucide-react';

const apiBase = import.meta.env.VITE_AUTH_BACKEND_URL || '';

interface ERPConnectorFormData {
  name: string;
  type: string;
  endpoint: string;
  username: string;
  password: string;
  apiKey: string;
  version: string;
  syncInterval: number;
  syncType: 'manual' | 'automatic';
  inventoryMapping: {
    productIdField: string;
    quantityField: string;
    locationField: string;
    priceField: string;
  };
  connectionSettings: {
    timeout: number;
    retryAttempts: number;
    batchSize: number;
    direction?: 'entrada' | 'salida';
    supportedTargets?: Array<'products' | 'purchase_orders' | 'sales_orders' | 'transfers' | 'inventory'>;
    allowProducts?: boolean;
  };
  isActive: boolean;
}

interface ERPConnectorFormProps {
  onClose: () => void;
  onSave: (data: ERPConnectorFormData) => void;
  initialData?: Partial<ERPConnectorFormData>;
}

export function ERPConnectorForm({ onClose, onSave, initialData }: ERPConnectorFormProps) {
  const [formData, setFormData] = useState<ERPConnectorFormData>({
    name: initialData?.name || '',
    type: initialData?.type || 'Custom',
    endpoint: initialData?.endpoint || '',
    username: initialData?.username || '',
    password: initialData?.password || '',
    apiKey: initialData?.apiKey || '',
    version: initialData?.version || '',
    syncInterval: initialData?.syncInterval || 30,
    syncType: initialData?.syncType || 'automatic',
    inventoryMapping: {
      productIdField: initialData?.inventoryMapping?.productIdField || 'ItemCode',
      quantityField: initialData?.inventoryMapping?.quantityField || 'OnHand',
      locationField: initialData?.inventoryMapping?.locationField || 'WhsCode',
      priceField: initialData?.inventoryMapping?.priceField || 'Price'
    },
    connectionSettings: {
      timeout: initialData?.connectionSettings?.timeout || 30000,
      retryAttempts: initialData?.connectionSettings?.retryAttempts || 3,
      batchSize: initialData?.connectionSettings?.batchSize || 100,
      direction: initialData?.connectionSettings?.direction as ('entrada' | 'salida') || 'entrada',
      supportedTargets: (initialData?.connectionSettings?.supportedTargets as Array<'products' | 'purchase_orders' | 'sales_orders' | 'transfers' | 'inventory'>) || [],
      allowProducts: initialData?.connectionSettings?.allowProducts === true
    },
    isActive: initialData?.isActive ?? true
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const erpTypes = [
    { value: 'SAP B1', label: 'SAP Business One' },
    { value: 'NetSuite', label: 'Oracle NetSuite' },
    { value: 'Dynamics 365', label: 'Microsoft Dynamics 365' },
    { value: 'Odoo', label: 'Odoo ERP' },
    { value: 'QuickBooks', label: 'QuickBooks Enterprise' },
    { value: 'Sage', label: 'Sage ERP' },
    { value: 'Custom', label: 'API Personalizada' }
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleNestedInputChange = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof ERPConnectorFormData] as any,
        [field]: value
      }
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del conector es requerido';
    }

    if (!formData.endpoint.trim()) {
      newErrors.endpoint = 'El endpoint es requerido';
    } else if (!isValidUrl(formData.endpoint)) {
      newErrors.endpoint = 'El endpoint debe ser una URL válida';
    }

    // En edición, permitir guardar aunque usuario/API Key no se modifiquen
    const isEditing = !!initialData;
    if (!isEditing) {
      if (!formData.username.trim() && !formData.apiKey.trim()) {
        newErrors.auth = 'Se requiere usuario/contraseña o API Key';
      }
    }

    if (formData.syncInterval < 1) {
      newErrors.syncInterval = 'El intervalo de sincronización debe ser mayor a 0';
    }

    if (!formData.inventoryMapping.productIdField.trim()) {
      newErrors.productIdField = 'El campo ID de producto es requerido';
    }

    if (!formData.inventoryMapping.quantityField.trim()) {
      newErrors.quantityField = 'El campo cantidad es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const applySapEs5Preset = () => {
    setFormData(prev => ({
      ...prev,
      type: prev.type?.includes('SAP') ? prev.type : 'SAP B1',
      endpoint: 'https://sapes5.sap.com/sap/opu/odata/IWBEP/GWSAMPLE_BASIC',
      connectionSettings: { ...prev.connectionSettings, odataVersion: 'v2', authType: 'basic' },
      inventoryMapping: {
        ...prev.inventoryMapping,
        productIdField: 'ProductID',
        descriptionField: 'Description',
        priceField: 'Price',
      },
    }));
  };

  const handleTestConnection = async () => {
    if (!formData.endpoint || (!formData.username && !formData.apiKey)) {
      setConnectionTestResult({
        success: false,
        message: 'Complete los campos de conexión antes de probar'
      });
      return;
    }

    setIsTestingConnection(true);
    setConnectionTestResult(null);

    try {
                  const resp = await fetch(`${apiBase}/erp/sap/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: formData.endpoint,
          username: formData.username,
          password: formData.password,
          apiKey: formData.apiKey,
          timeout: formData.connectionSettings?.timeout || 30000,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.ok) {
        setConnectionTestResult({
          success: false,
          message: data?.error || 'Fallo en la conexión',
        });
      } else {
        setConnectionTestResult({
          success: true,
          message: 'Conexión exitosa',
        });
      }
    } catch (error: any) {
      setConnectionTestResult({
        success: false,
        message: error?.message || 'Error al probar la conexión',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center">
            <button
              onClick={onClose}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {initialData ? 'Editar Conector ERP' : 'Nuevo Conector ERP'}
              </h2>
              <p className="text-gray-600">
                Configure la integración para actualización automática de inventario
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Información General */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Database className="w-5 h-5 mr-2 text-blue-500" />
              Información General
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Conector *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ej: SAP Producción"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Sistema ERP *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {erpTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endpoint / URL de API *
                  <button type="button" className="ml-2 text-xs text-blue-600 underline" onClick={applySapEs5Preset}>
                    Usar servidor de prueba SAP (ES5)
                  </button>
                </label>
                <input
                  type="url"
                  value={formData.endpoint}
                  onChange={(e) => handleInputChange('endpoint', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.endpoint ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="https://api.empresa.com/erp/v1"
                />
                {errors.endpoint && (
                  <p className="mt-1 text-sm text-red-600">{errors.endpoint}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Versión del Sistema
                </label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => handleInputChange('version', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: 10.0, 2023.2"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                  Activar conector inmediatamente
                </label>
              </div>
            </div>
          </div>

          {/* Autenticación */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-blue-500" />
              Autenticación
            </h3>
            
            {errors.auth && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errors.auth}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Usuario
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Usuario del sistema ERP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key (Alternativa a usuario/contraseña)
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={formData.apiKey}
                    onChange={(e) => handleInputChange('apiKey', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="API Key del sistema ERP"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showApiKey ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Test Connection */}
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingConnection}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                <TestTube className={`w-4 h-4 mr-2 ${isTestingConnection ? 'animate-pulse' : ''}`} />
                {isTestingConnection ? 'Probando...' : 'Probar Conexión'}
              </button>
              
              {connectionTestResult && (
                <div className={`flex items-center px-3 py-2 rounded-lg ${
                  connectionTestResult.success 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-red-50 text-red-700'
                }`}>
                  {connectionTestResult.success ? (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mr-2" />
                  )}
                  <span className="text-sm">{connectionTestResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Configuración de Sincronización */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">
              Configuración de Sincronización
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Sincronización
              </label>
              <select
                value={formData.syncType}
                onChange={(e) => handleInputChange('syncType', e.target.value as 'manual' | 'automatic')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="automatic">Automática</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Permitir catálogo de productos</label>
              <div className="flex items-center h-10">
                <input
                  type="checkbox"
                  checked={Boolean((formData.connectionSettings as any).allowProducts)}
                  onChange={(e) => handleNestedInputChange('connectionSettings', 'allowProducts', e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="ml-2 text-sm text-gray-700">Habilitar sincronización de productos</span>
              </div>
            </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Intervalo (minutos) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.syncInterval}
                  onChange={(e) => handleInputChange('syncInterval', parseInt(e.target.value) || 0)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.syncInterval ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={formData.syncType === 'manual'}
                />
                {errors.syncInterval && (
                  <p className="mt-1 text-sm text-red-600">{errors.syncInterval}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tamaño de Lote
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.connectionSettings.batchSize}
                  onChange={(e) => handleNestedInputChange('connectionSettings', 'batchSize', parseInt(e.target.value) || 100)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección del Conector
                </label>
                <select
                  value={formData.connectionSettings.direction || 'entrada'}
                  onChange={(e) => handleNestedInputChange('connectionSettings', 'direction', e.target.value as 'entrada' | 'salida')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Objetivos de Sincronización Soportados
                </label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { key: 'products', label: 'Productos' },
                    { key: 'inventory', label: 'Inventario' },
                    { key: 'purchase_orders', label: 'Órdenes de Compra' },
                    { key: 'sales_orders', label: 'Pedidos' },
                    { key: 'transfers', label: 'Traspasos' },
                  ].map((t) => {
                    const checked = (formData.connectionSettings.supportedTargets || []).includes(t.key as any);
                    return (
                      <label key={t.key} className="inline-flex items-center space-x-2 px-3 py-2 border rounded-lg">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const prev = formData.connectionSettings.supportedTargets || [];
                            const next = e.target.checked
                              ? Array.from(new Set([...prev, t.key as any]))
                              : prev.filter((x) => x !== (t.key as any));
                            handleNestedInputChange('connectionSettings', 'supportedTargets', next);
                          }}
                        />
                        <span className="text-sm">{t.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Mapeo de Campos de Inventario */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">
              Mapeo de Campos de Inventario
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campo ID de Producto *
                </label>
                <input
                  type="text"
                  value={formData.inventoryMapping.productIdField}
                  onChange={(e) => handleNestedInputChange('inventoryMapping', 'productIdField', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.productIdField ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="ItemCode, ProductId, SKU"
                />
                {errors.productIdField && (
                  <p className="mt-1 text-sm text-red-600">{errors.productIdField}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campo Cantidad *
                </label>
                <input
                  type="text"
                  value={formData.inventoryMapping.quantityField}
                  onChange={(e) => handleNestedInputChange('inventoryMapping', 'quantityField', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.quantityField ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="OnHand, Quantity, Stock"
                />
                {errors.quantityField && (
                  <p className="mt-1 text-sm text-red-600">{errors.quantityField}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campo Ubicación
                </label>
                <input
                  type="text"
                  value={formData.inventoryMapping.locationField}
                  onChange={(e) => handleNestedInputChange('inventoryMapping', 'locationField', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="WhsCode, Location, Warehouse"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campo Precio
                </label>
                <input
                  type="text"
                  value={formData.inventoryMapping.priceField}
                  onChange={(e) => handleNestedInputChange('inventoryMapping', 'priceField', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Price, UnitPrice, Cost"
                />
              </div>
            </div>
          </div>

          {/* Configuración Avanzada */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">
              Configuración Avanzada
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeout (ms)
                </label>
                <input
                  type="number"
                  min="1000"
                  max="300000"
                  value={formData.connectionSettings.timeout}
                  onChange={(e) => handleNestedInputChange('connectionSettings', 'timeout', parseInt(e.target.value) || 30000)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Intentos de Reintento
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.connectionSettings.retryAttempts}
                  onChange={(e) => handleNestedInputChange('connectionSettings', 'retryAttempts', parseInt(e.target.value) || 3)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {initialData ? 'Actualizar Conector' : 'Crear Conector'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
