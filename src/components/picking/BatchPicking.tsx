import React, { useState } from 'react';
import { 
  Package, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Play,
  Plus,
  Eye,
  Edit,
  Trash2,
  ShoppingCart,
  MapPin,
  BarChart3
} from 'lucide-react';

interface BatchOrder {
  id: string;
  orderNumber: string;
  customer: string;
  items: number;
  priority: 'high' | 'medium' | 'low';
}

interface Batch {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignedTo: string;
  orders: BatchOrder[];
  zone: string;
  estimatedTime: number;
  actualTime?: number;
  createdAt: string;
  completedAt?: string;
  efficiency: number;
  totalItems: number;
  pickedItems: number;
}

export function BatchPicking() {
  const [batches, setBatches] = useState<Batch[]>([
    {
      id: '1',
      name: 'Lote A-001',
      status: 'in_progress',
      assignedTo: 'Juan Pérez',
      orders: [
        { id: '1', orderNumber: 'ORD-2024-001', customer: 'Distribuidora ABC', items: 10, priority: 'high' },
        { id: '2', orderNumber: 'ORD-2024-002', customer: 'Comercial XYZ', items: 8, priority: 'medium' },
        { id: '3', orderNumber: 'ORD-2024-003', customer: 'Retail 123', items: 5, priority: 'low' }
      ],
      zone: 'Zona A - Picking',
      estimatedTime: 45,
      actualTime: 32,
      createdAt: '2024-01-20T08:00:00',
      efficiency: 92,
      totalItems: 23,
      pickedItems: 18
    },
    {
      id: '2',
      name: 'Lote B-002',
      status: 'pending',
      assignedTo: 'María García',
      orders: [
        { id: '4', orderNumber: 'ORD-2024-004', customer: 'Empresa DEF', items: 12, priority: 'high' },
        { id: '5', orderNumber: 'ORD-2024-005', customer: 'Negocio GHI', items: 7, priority: 'medium' }
      ],
      zone: 'Zona A - Picking',
      estimatedTime: 35,
      createdAt: '2024-01-20T09:30:00',
      efficiency: 0,
      totalItems: 19,
      pickedItems: 0
    },
    {
      id: '3',
      name: 'Lote C-003',
      status: 'completed',
      assignedTo: 'Carlos López',
      orders: [
        { id: '6', orderNumber: 'ORD-2024-006', customer: 'Tienda JKL', items: 6, priority: 'medium' },
        { id: '7', orderNumber: 'ORD-2024-007', customer: 'Almacén MNO', items: 9, priority: 'low' },
        { id: '8', orderNumber: 'ORD-2024-008', customer: 'Centro PQR', items: 4, priority: 'high' }
      ],
      zone: 'Zona B - Reserva',
      estimatedTime: 40,
      actualTime: 38,
      createdAt: '2024-01-20T07:00:00',
      completedAt: '2024-01-20T07:38:00',
      efficiency: 95,
      totalItems: 19,
      pickedItems: 19
    }
  ]);

  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'gray';
      case 'in_progress': return 'blue';
      case 'completed': return 'green';
      default: return 'gray';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'in_progress': return 'En Progreso';
      case 'completed': return 'Completado';
      default: return 'Desconocido';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const handleStartBatch = (batchId: string) => {
    setBatches(batches.map(batch => 
      batch.id === batchId 
        ? { ...batch, status: 'in_progress' as const }
        : batch
    ));
  };

  const handleCompleteBatch = (batchId: string) => {
    setBatches(batches.map(batch => 
      batch.id === batchId 
        ? { 
            ...batch, 
            status: 'completed' as const, 
            completedAt: new Date().toISOString(),
            pickedItems: batch.totalItems,
            efficiency: 98
          }
        : batch
    ));
  };

  const handleViewDetails = (batch: Batch) => {
    setSelectedBatch(batch);
    setShowDetails(true);
  };

  const calculateProgress = (batch: Batch) => {
    return batch.totalItems > 0 ? (batch.pickedItems / batch.totalItems) * 100 : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Picking por Lotes</h2>
          <p className="text-gray-600">Agrupa múltiples órdenes para optimizar el picking</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Crear Lote
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Lotes Activos</p>
              <p className="text-2xl font-bold text-gray-900">
                {batches.filter(b => b.status === 'in_progress').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completados Hoy</p>
              <p className="text-2xl font-bold text-gray-900">
                {batches.filter(b => b.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Eficiencia Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(batches.reduce((sum, b) => sum + b.efficiency, 0) / batches.length)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tiempo Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(batches.reduce((sum, b) => sum + (b.actualTime || b.estimatedTime), 0) / batches.length)} min
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Batch List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Lotes de Picking</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {batches.map((batch) => {
            const statusColor = getStatusColor(batch.status);
            const progress = calculateProgress(batch);

            return (
              <div key={batch.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h4 className="text-lg font-medium text-gray-900">{batch.name}</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800`}>
                        {getStatusText(batch.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-2" />
                        <span className="font-medium">Asignado:</span>
                        <span className="ml-1">{batch.assignedTo}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span className="font-medium">Zona:</span>
                        <span className="ml-1">{batch.zone}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        <span className="font-medium">Órdenes:</span>
                        <span className="ml-1">{batch.orders.length}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Package className="w-4 h-4 mr-2" />
                        <span className="font-medium">Items:</span>
                        <span className="ml-1">{batch.totalItems}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {batch.status === 'in_progress' && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Progreso</span>
                          <span>{progress.toFixed(0)}% ({batch.pickedItems}/{batch.totalItems})</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Orders Preview */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {batch.orders.slice(0, 3).map((order) => (
                        <span
                          key={order.id}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs bg-${getPriorityColor(order.priority)}-100 text-${getPriorityColor(order.priority)}-800`}
                        >
                          {order.orderNumber}
                        </span>
                      ))}
                      {batch.orders.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                          +{batch.orders.length - 3} más
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>
                          {batch.actualTime ? `${batch.actualTime}/${batch.estimatedTime} min` : `${batch.estimatedTime} min est.`}
                        </span>
                      </div>
                      {batch.efficiency > 0 && (
                        <div className="flex items-center">
                          <BarChart3 className="w-4 h-4 mr-1" />
                          <span>Eficiencia: {batch.efficiency}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleViewDetails(batch)}
                      className="p-2 text-gray-400 hover:text-blue-600"
                      title="Ver detalles"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    {batch.status === 'pending' && (
                      <button
                        onClick={() => handleStartBatch(batch.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Iniciar
                      </button>
                    )}
                    
                    {batch.status === 'in_progress' && (
                      <button
                        onClick={() => handleCompleteBatch(batch.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Completar
                      </button>
                    )}

                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Batch Details Modal */}
      {showDetails && selectedBatch && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Detalles del Lote - {selectedBatch.name}
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Batch Info */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Información del Lote</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Estado:</span>
                      <span className={`text-sm font-medium text-${getStatusColor(selectedBatch.status)}-600`}>
                        {getStatusText(selectedBatch.status)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Asignado a:</span>
                      <span className="text-sm text-gray-900">{selectedBatch.assignedTo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Zona:</span>
                      <span className="text-sm text-gray-900">{selectedBatch.zone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Total Items:</span>
                      <span className="text-sm text-gray-900">{selectedBatch.totalItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Items Recogidos:</span>
                      <span className="text-sm text-gray-900">{selectedBatch.pickedItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Eficiencia:</span>
                      <span className="text-sm text-gray-900">{selectedBatch.efficiency}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Orders List */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">Órdenes en el Lote</h4>
                <div className="space-y-3">
                  {selectedBatch.orders.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-medium text-gray-900">{order.orderNumber}</h5>
                          <p className="text-sm text-gray-500">{order.customer}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${getPriorityColor(order.priority)}-100 text-${getPriorityColor(order.priority)}-800`}>
                            {order.priority === 'high' ? 'Alta' : order.priority === 'medium' ? 'Media' : 'Baja'}
                          </span>
                          <span className="text-sm text-gray-600">{order.items} items</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Batch Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Crear Nuevo Lote</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Lote
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Lote A-004"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asignar a
                  </label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">Seleccionar operario</option>
                    <option value="juan">Juan Pérez</option>
                    <option value="maria">María García</option>
                    <option value="carlos">Carlos López</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zona
                  </label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">Seleccionar zona</option>
                    <option value="zona-a">Zona A - Picking</option>
                    <option value="zona-b">Zona B - Reserva</option>
                    <option value="zona-c">Zona C - Devoluciones</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Órdenes Disponibles
                </label>
                <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
                  <div className="space-y-2">
                    {['ORD-2024-009', 'ORD-2024-010', 'ORD-2024-011', 'ORD-2024-012'].map((order) => (
                      <label key={order} className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <span className="ml-2 text-sm text-gray-900">{order}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Crear Lote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}