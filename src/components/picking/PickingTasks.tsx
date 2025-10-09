import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  MapPin, 
  Clock, 
  User, 
  Package, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Play,
  Pause,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';

interface PickingTask {
  id: string;
  orderNumber: string;
  customer: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo: string;
  zone: string;
  location: string;
  items: {
    sku: string;
    name: string;
    quantity: number;
    picked: number;
    location: string;
  }[];
  estimatedTime: number;
  actualTime?: number;
  createdAt: string;
  dueDate: string;
  notes?: string;
}

export function PickingTasks() {
  const initialTasks: PickingTask[] = [
    {
      id: '1',
      orderNumber: 'ORD-2024-001',
      customer: 'Distribuidora ABC',
      priority: 'high',
      status: 'pending',
      assignedTo: 'Juan Pérez',
      zone: 'Zona A - Picking',
      location: 'A-01-15',
      items: [
        { sku: 'PROD-001', name: 'Producto A', quantity: 5, picked: 0, location: 'A-01-15' },
        { sku: 'PROD-002', name: 'Producto B', quantity: 3, picked: 0, location: 'A-02-08' },
        { sku: 'PROD-003', name: 'Producto C', quantity: 2, picked: 0, location: 'A-03-12' }
      ],
      estimatedTime: 15,
      createdAt: '2024-01-20T08:30:00',
      dueDate: '2024-01-20T12:00:00'
    },
    {
      id: '2',
      orderNumber: 'ORD-2024-002',
      customer: 'Comercial XYZ',
      priority: 'medium',
      status: 'in_progress',
      assignedTo: 'María García',
      zone: 'Zona A - Picking',
      location: 'A-04-20',
      items: [
        { sku: 'PROD-004', name: 'Producto D', quantity: 8, picked: 5, location: 'A-04-20' },
        { sku: 'PROD-005', name: 'Producto E', quantity: 4, picked: 4, location: 'A-05-03' }
      ],
      estimatedTime: 20,
      actualTime: 12,
      createdAt: '2024-01-20T09:15:00',
      dueDate: '2024-01-20T14:00:00'
    },
    {
      id: '3',
      orderNumber: 'ORD-2024-003',
      customer: 'Retail 123',
      priority: 'low',
      status: 'completed',
      assignedTo: 'Carlos López',
      zone: 'Zona B - Reserva',
      location: 'B-01-05',
      items: [
        { sku: 'PROD-006', name: 'Producto F', quantity: 1, picked: 1, location: 'B-01-05' }
      ],
      estimatedTime: 8,
      actualTime: 6,
      createdAt: '2024-01-20T07:45:00',
      dueDate: '2024-01-20T11:00:00',
      notes: 'Completado sin incidencias'
    }
  ];

  const [tasks, setTasks] = useState<PickingTask[]>(() => {
    try {
      const raw = localStorage.getItem('picking_tasks');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('No se pudo leer picking_tasks de localStorage', e);
    }
    return initialTasks;
  });

  useEffect(() => {
    try {
      localStorage.setItem('picking_tasks', JSON.stringify(tasks));
    } catch (e) {
      console.warn('No se pudo guardar picking_tasks en localStorage', e);
    }
  }, [tasks]);

  // Escucha actualizaciones externas (creación desde el dashboard)
  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem('picking_tasks');
        if (raw) setTasks(JSON.parse(raw));
      } catch {}
    };
    window.addEventListener('picking_tasks_updated', handler as EventListener);
    return () => window.removeEventListener('picking_tasks_updated', handler as EventListener);
  }, []);

  const [selectedTask, setSelectedTask] = useState<PickingTask | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'gray';
      case 'in_progress': return 'blue';
      case 'completed': return 'green';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'in_progress': return Play;
      case 'completed': return CheckCircle;
      case 'cancelled': return XCircle;
      default: return AlertCircle;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'in_progress': return 'En Progreso';
      case 'completed': return 'Completado';
      case 'cancelled': return 'Cancelado';
      default: return 'Desconocido';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return 'Normal';
    }
  };

  const handleStartTask = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, status: 'in_progress' as const }
        : task
    ));
  };

  const handleCompleteTask = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, status: 'completed' as const, actualTime: task.estimatedTime }
        : task
    ));
  };

  const handleViewDetails = (task: PickingTask) => {
    setSelectedTask(task);
    setShowDetails(true);
  };

  const calculateProgress = (items: PickingTask['items']) => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const pickedItems = items.reduce((sum, item) => sum + item.picked, 0);
    return totalItems > 0 ? (pickedItems / totalItems) * 100 : 0;
  };

  return (
    <div className="space-y-6">
      {/* Task List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Tareas de Picking</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {tasks.map((task) => {
            const StatusIcon = getStatusIcon(task.status);
            const priorityColor = getPriorityColor(task.priority);
            const statusColor = getStatusColor(task.status);
            const progress = calculateProgress(task.items);

            return (
              <div key={task.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{task.orderNumber}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${priorityColor}-100 text-${priorityColor}-800`}>
                        {getPriorityText(task.priority)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {getStatusText(task.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="w-4 h-4 mr-2" />
                        <span className="font-medium">Cliente:</span>
                        <span className="ml-1">{task.customer}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="w-4 h-4 mr-2" />
                        <span className="font-medium">Asignado:</span>
                        <span className="ml-1">{task.assignedTo}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span className="font-medium">Zona:</span>
                        <span className="ml-1">{task.zone}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Package className="w-4 h-4 mr-2" />
                        <span className="font-medium">Items:</span>
                        <span className="ml-1">{task.items.length} productos</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="font-medium">Tiempo est.:</span>
                        <span className="ml-1">{task.estimatedTime} min</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="font-medium">Vencimiento:</span>
                        <span className="ml-1">{new Date(task.dueDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {task.status === 'in_progress' && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Progreso</span>
                          <span>{progress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Items Summary */}
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Productos:</span>
                      <span className="ml-1">
                        {task.items.map(item => `${item.name} (${item.picked}/${item.quantity})`).join(', ')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleViewDetails(task)}
                      className="p-2 text-gray-400 hover:text-blue-600"
                      title="Ver detalles"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    {task.status === 'pending' && (
                      <button
                        onClick={() => handleStartTask(task.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Iniciar
                      </button>
                    )}
                    
                    {task.status === 'in_progress' && (
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Completar
                      </button>
                    )}

                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Details Modal */}
      {showDetails && selectedTask && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Detalles de Tarea - {selectedTask.orderNumber}
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Task Info */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Información General</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Cliente:</span>
                      <span className="text-sm text-gray-900">{selectedTask.customer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Asignado a:</span>
                      <span className="text-sm text-gray-900">{selectedTask.assignedTo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Zona:</span>
                      <span className="text-sm text-gray-900">{selectedTask.zone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Prioridad:</span>
                      <span className={`text-sm font-medium text-${getPriorityColor(selectedTask.priority)}-600`}>
                        {getPriorityText(selectedTask.priority)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Estado:</span>
                      <span className={`text-sm font-medium text-${getStatusColor(selectedTask.status)}-600`}>
                        {getStatusText(selectedTask.status)}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedTask.notes && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Notas</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                      {selectedTask.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">Productos a Recoger</h4>
                <div className="space-y-3">
                  {selectedTask.items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-medium text-gray-900">{item.name}</h5>
                          <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {item.picked}/{item.quantity}
                          </p>
                          <p className="text-xs text-gray-500">unidades</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-1" />
                          {item.location}
                        </div>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(item.picked / item.quantity) * 100}%` }}
                          />
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
              {selectedTask.status === 'pending' && (
                <button
                  onClick={() => {
                    handleStartTask(selectedTask.id);
                    setShowDetails(false);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Iniciar Tarea
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}