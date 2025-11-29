import React, { useState, useEffect } from 'react';
import { getSortComparator } from '../../config/sorting';
import { 
  Package, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  User,
  MapPin,
  X,
  Plus,
  Search,
  Filter
} from 'lucide-react';

interface ReceivingTaskItem {
  id: string;
  sku: string;
  description: string;
  expectedQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  lotNumber?: string;
  expiryDate?: string;
  location?: string;
  notes?: string;
}

interface ReceivingTask {
  id: string;
  taskNumber: string;
  asnNumber: string;
  poNumber: string;
  supplier: string;
  assignedTo: string;
  status: 'pending' | 'in_progress' | 'quality_check' | 'completed' | 'discrepancy';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startTime?: string;
  completedTime?: string;
  dockDoor: string;
  items: ReceivingTaskItem[];
  notes?: string;
  qualityIssues?: string[];
}

export const ReceivingTasks: React.FC = () => {
  const [selectedTask, setSelectedTask] = useState<ReceivingTask | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  // Carga inicial desde localStorage o datos mock
  const initialTasks: ReceivingTask[] = [
    {
      id: '1',
      taskNumber: 'RCV-2024-001',
      asnNumber: 'ASN-2024-001',
      poNumber: 'PO-2024-001',
      supplier: 'Proveedor ABC S.A.',
      assignedTo: 'Juan Pérez',
      status: 'pending',
      priority: 'high',
      dockDoor: 'Puerta 3',
      items: [
        {
          id: '1',
          sku: 'PROD-001',
          description: 'Producto A',
          expectedQuantity: 100,
          receivedQuantity: 0,
          damagedQuantity: 0,
          lotNumber: 'LOT-001-2024',
          expiryDate: '2024-12-31',
          location: 'A-01-01'
        },
        {
          id: '2',
          sku: 'PROD-002',
          description: 'Producto B',
          expectedQuantity: 200,
          receivedQuantity: 0,
          damagedQuantity: 0,
          lotNumber: 'LOT-002-2024',
          location: 'A-01-02'
        }
      ],
      notes: 'Verificar fecha de vencimiento cuidadosamente'
    },
    {
      id: '2',
      taskNumber: 'RCV-2024-002',
      asnNumber: 'ASN-2024-002',
      poNumber: 'PO-2024-002',
      supplier: 'Distribuidora XYZ',
      assignedTo: 'María García',
      status: 'in_progress',
      priority: 'medium',
      startTime: '2024-01-22T09:30:00',
      dockDoor: 'Puerta 1',
      items: [
        {
          id: '3',
          sku: 'PROD-003',
          description: 'Producto C',
          expectedQuantity: 150,
          receivedQuantity: 75,
          damagedQuantity: 0,
          location: 'B-02-01'
        }
      ]
    },
    {
      id: '3',
      taskNumber: 'RCV-2024-003',
      asnNumber: 'ASN-2024-003',
      poNumber: 'PO-2024-003',
      supplier: 'Comercial 123',
      assignedTo: 'Carlos López',
      status: 'quality_check',
      priority: 'medium',
      startTime: '2024-01-22T08:00:00',
      dockDoor: 'Puerta 2',
      items: [
        {
          id: '4',
          sku: 'PROD-004',
          description: 'Producto D',
          expectedQuantity: 300,
          receivedQuantity: 295,
          damagedQuantity: 5,
          location: 'C-03-01',
          notes: 'Embalaje dañado en 5 unidades'
        }
      ],
      qualityIssues: ['Embalaje dañado', 'Etiquetas ilegibles']
    },
    {
      id: '4',
      taskNumber: 'RCV-2024-004',
      asnNumber: 'ASN-2024-004',
      poNumber: 'PO-2024-004',
      supplier: 'Proveedor DEF',
      assignedTo: 'Ana Martínez',
      status: 'completed',
      priority: 'low',
      startTime: '2024-01-21T14:00:00',
      completedTime: '2024-01-21T16:30:00',
      dockDoor: 'Puerta 4',
      items: [
        {
          id: '5',
          sku: 'PROD-005',
          description: 'Producto E',
          expectedQuantity: 250,
          receivedQuantity: 250,
          damagedQuantity: 0,
          location: 'D-04-01'
        }
      ]
    }
  ];

  const [tasks, setTasks] = useState<ReceivingTask[]>(() => {
    try {
      const raw = localStorage.getItem('receiving_tasks');
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('No se pudo leer receiving_tasks de localStorage', e);
    }
    return initialTasks;
  });

  // Persistencia
  useEffect(() => {
    try {
      localStorage.setItem('receiving_tasks', JSON.stringify(tasks));
    } catch (e) {
      console.warn('No se pudo guardar receiving_tasks en localStorage', e);
    }
  }, [tasks]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'quality_check': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'discrepancy': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'in_progress': return Package;
      case 'quality_check': return AlertTriangle;
      case 'completed': return CheckCircle;
      case 'discrepancy': return X;
      default: return Clock;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'in_progress': return 'En Progreso';
      case 'quality_check': return 'Control Calidad';
      case 'completed': return 'Completado';
      case 'discrepancy': return 'Discrepancia';
      default: return 'Desconocido';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'low': return 'Baja';
      case 'medium': return 'Media';
      case 'high': return 'Alta';
      case 'urgent': return 'Urgente';
      default: return 'Normal';
    }
  };

  const handleViewTask = (task: ReceivingTask) => {
    // Usa configuración central para ordenar ítems
    const sorted = { ...task, items: [...(task.items || [])].sort(getSortComparator('receiving')) };
    setSelectedTask(sorted);
    setShowTaskModal(true);
  };

  const handleStartTask = (taskId: string) => {
    setTasks(prev => prev.map(t => (
      t.id === taskId
        ? { ...t, status: 'in_progress', startTime: new Date().toISOString() }
        : t
    )));
  };

  const handleCompleteTask = (taskId: string) => {
    setTasks(prev => prev.map(t => (
      t.id === taskId
        ? { ...t, status: 'completed', completedTime: new Date().toISOString() }
        : t
    )));
  };

  const handleQualityCheck = (task: ReceivingTask) => {
    setSelectedTask(task);
    setShowQualityModal(true);
  };

  const calculateProgress = (items: ReceivingTaskItem[]) => {
    const totalExpected = items.reduce((sum, item) => sum + item.expectedQuantity, 0);
    const totalReceived = items.reduce((sum, item) => sum + item.receivedQuantity, 0);
    return totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0;
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar tareas..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </button>
        </div>
        <button onClick={() => setShowNewTaskModal(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Tarea
        </button>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {tasks.map((task) => {
          const StatusIcon = getStatusIcon(task.status);
          const progress = calculateProgress(task.items);
          
          return (
            <div key={task.id} className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{task.taskNumber}</h3>
                    <p className="text-sm text-gray-500">{task.asnNumber}</p>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {getPriorityText(task.priority)}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {getStatusText(task.status)}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="w-4 h-4 mr-2" />
                    {task.assignedTo}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    {task.dockDoor}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Package className="w-4 h-4 mr-2" />
                    {task.items.length} producto(s)
                  </div>
                </div>

                {/* Progress */}
                {task.status === 'in_progress' && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progreso</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Quality Issues */}
                {task.qualityIssues && task.qualityIssues.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center text-sm text-red-600 mb-2">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Problemas de Calidad
                    </div>
                    <ul className="text-xs text-red-600 space-y-1">
                      {task.qualityIssues.map((issue, index) => (
                        <li key={index}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Times */}
                {task.startTime && (
                  <div className="text-xs text-gray-500 mb-4">
                    <div>Iniciado: {new Date(task.startTime).toLocaleString()}</div>
                    {task.completedTime && (
                      <div>Completado: {new Date(task.completedTime).toLocaleString()}</div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => handleViewTask(task)}
                    className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                  >
                    Ver Detalles
                  </button>
                  <div className="flex space-x-2">
                    {task.status === 'pending' && (
                      <button
                        onClick={() => handleStartTask(task.id)}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        Iniciar
                      </button>
                    )}
                    {task.status === 'in_progress' && (
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        Completar
                      </button>
                    )}
                    {task.status === 'quality_check' && (
                      <button
                        onClick={() => handleQualityCheck(task)}
                        className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                      >
                        Revisar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Details Modal */}
      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Detalles de Tarea - {selectedTask.taskNumber}
              </h3>
              <button
                onClick={() => setShowTaskModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Información General</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">ASN:</span> {selectedTask.asnNumber}</div>
                  <div><span className="font-medium">Orden de Compra:</span> {selectedTask.poNumber}</div>
                  <div><span className="font-medium">Proveedor:</span> {selectedTask.supplier}</div>
                  <div><span className="font-medium">Asignado a:</span> {selectedTask.assignedTo}</div>
                  <div><span className="font-medium">Puerta:</span> {selectedTask.dockDoor}</div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Estado y Tiempos</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Estado:</span>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedTask.status)}`}>
                      {React.createElement(getStatusIcon(selectedTask.status), { className: "w-3 h-3 mr-1" })}
                      {getStatusText(selectedTask.status)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Prioridad:</span>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedTask.priority)}`}>
                      {getPriorityText(selectedTask.priority)}
                    </span>
                  </div>
                  {selectedTask.startTime && (
                    <div><span className="font-medium">Iniciado:</span> {new Date(selectedTask.startTime).toLocaleString()}</div>
                  )}
                  {selectedTask.completedTime && (
                    <div><span className="font-medium">Completado:</span> {new Date(selectedTask.completedTime).toLocaleString()}</div>
                  )}
                </div>
                {selectedTask.notes && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Notas</h4>
                    <p className="text-sm text-gray-600">{selectedTask.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-4">Productos</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Esperado</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recibido</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dañado</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lote</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {[...(selectedTask.items || [])]
                      .slice()
                      .sort(getSortComparator('receiving'))
                      .map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.sku}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.expectedQuantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.receivedQuantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.damagedQuantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.location || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.lotNumber || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowTaskModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
              {selectedTask.status === 'pending' && (
                <button
                  onClick={() => handleStartTask(selectedTask.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Iniciar Tarea
                </button>
              )}
              {selectedTask.status === 'in_progress' && (
                <button
                  onClick={() => handleCompleteTask(selectedTask.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                >
                  Completar Tarea
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Crear Nueva Tarea de Recepción</h3>
              <button onClick={() => setShowNewTaskModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <NewTaskForm
              onCancel={() => setShowNewTaskModal(false)}
              onCreate={(newTask) => {
                const nextNumber = computeNextTaskNumber(tasks);
                const task: ReceivingTask = {
                  id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
                  taskNumber: nextNumber,
                  asnNumber: newTask.asnNumber || '-',
                  poNumber: newTask.poNumber || '-',
                  supplier: newTask.supplier || '-',
                  assignedTo: newTask.assignedTo || '-',
                  status: 'pending',
                  priority: newTask.priority,
                  dockDoor: newTask.dockDoor || '-',
                  items: [],
                  notes: newTask.notes || ''
                };
                setTasks(prev => [task, ...prev]);
                setShowNewTaskModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Formulario sencillo para crear tareas
function NewTaskForm({ onCancel, onCreate }: { onCancel: () => void; onCreate: (data: {
  asnNumber?: string;
  poNumber?: string;
  supplier?: string;
  assignedTo?: string;
  dockDoor?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
}) => void }) {
  const [asnNumber, setAsnNumber] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [supplier, setSupplier] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dockDoor, setDockDoor] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [notes, setNotes] = useState('');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ASN</label>
          <input value={asnNumber} onChange={e => setAsnNumber(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="ASN-2024-XXX" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Orden de Compra</label>
          <input value={poNumber} onChange={e => setPoNumber(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="PO-2024-XXX" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
          <input value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Proveedor" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Asignado a</label>
          <input value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Operario" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Puerta</label>
          <input value={dockDoor} onChange={e => setDockDoor(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Puerta 1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
          <select value={priority} onChange={e => setPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')} className="w-full border border-gray-300 rounded-md px-3 py-2">
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" rows={3} placeholder="Notas opcionales" />
      </div>
      <div className="flex justify-end space-x-3">
        <button onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
        <button
          onClick={() => onCreate({ asnNumber, poNumber, supplier, assignedTo, dockDoor, priority, notes })}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Crear Tarea
        </button>
      </div>
    </div>
  );
}

// Genera el siguiente número de tarea basado en las existentes
function computeNextTaskNumber(tasks: ReceivingTask[]): string {
  const prefix = 'RCV-';
  // Buscar máximo sufijo numérico
  let max = 0;
  for (const t of tasks) {
    const match = t.taskNumber.match(/RCV-(\d{4})-(\d{3})/);
    if (match) {
      const num = parseInt(match[2], 10);
      if (!isNaN(num)) max = Math.max(max, num);
    }
  }
  const next = String(max + 1).padStart(3, '0');
  const year = new Date().getFullYear();
  return `${prefix}${year}-${next}`;
}