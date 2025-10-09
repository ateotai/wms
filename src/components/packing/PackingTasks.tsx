import React, { useState } from 'react';
import { 
  Package, 
  User, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Play, 
  Pause, 
  Square,
  BarChart3,
  Timer,
  Weight,
  Ruler,
  QrCode,
  Camera,
  FileText,
  Plus,
  Filter,
  Search
} from 'lucide-react';

interface PackingItem {
  id: string;
  product: string;
  sku: string;
  quantity: number;
  quantityPacked: number;
  weight: number;
  dimensions: string;
  location: string;
  barcode: string;
  fragile: boolean;
  specialInstructions?: string;
}

interface PackingTask {
  id: string;
  taskNumber: string;
  orderId: string;
  orderNumber: string;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  items: PackingItem[];
  packingType: 'standard' | 'fragile' | 'oversized' | 'hazardous';
  estimatedTime: number; // minutes
  actualTime?: number; // minutes
  startTime?: string;
  endTime?: string;
  packingMaterials: string[];
  boxType: string;
  totalWeight: number;
  totalVolume: number;
  createdAt: string;
  notes?: string;
  qualityCheck: boolean;
}

export function PackingTasks() {
  const [selectedTask, setSelectedTask] = useState<PackingTask | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [newItems, setNewItems] = useState<PackingItem[]>([
    { id: `tmp-${Date.now()}`, product: '', sku: '', quantity: 1, quantityPacked: 0, weight: 0, dimensions: '', location: '', barcode: '', fragile: false }
  ]);
  const [newTaskForm, setNewTaskForm] = useState({
    orderNumber: '',
    assignedTo: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    packingType: 'standard' as 'standard' | 'fragile' | 'oversized' | 'hazardous',
    boxType: '',
    estimatedTime: 10,
    notes: ''
  });

  // Órdenes guardadas (ShippingOrders) desde localStorage
  const loadSavedOrders = (): any[] => {
    try {
      const str = localStorage.getItem('packing_orders');
      const arr = str ? JSON.parse(str) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.warn('No se pudieron leer órdenes desde localStorage:', e);
      return [];
    }
  };

  const handleLoadFromOrder = async () => {
    const orderNum = String(newTaskForm.orderNumber || '').trim();
    if (!orderNum) {
      alert('Ingresa el número de orden');
      return;
    }

    const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
    const token = typeof window !== 'undefined' ? localStorage.getItem('app_token') : null;

    // Intento 1: Backend real
    if (AUTH_BACKEND_URL && token) {
      try {
        const resp = await fetch(`${AUTH_BACKEND_URL}/sales_orders/${encodeURIComponent(orderNum)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const json = await resp.json();
          const so = json?.sales_order || null;
          if (!so) throw new Error('Respuesta inválida del backend');

          // Mapear items del backend a PackingItem
          const mappedItems: PackingItem[] = (so.items || []).map((it: any, idx: number) => ({
            id: `ord-${so.id || 'x'}-${idx}`,
            product: (it?.products?.name || it?.products?.sku || it?.product || ''),
            sku: (it?.products?.sku || it?.sku || ''),
            quantity: Number(it?.quantity || 0),
            quantityPacked: 0,
            weight: Number(it?.products?.weight || 0),
            dimensions: typeof it?.products?.dimensions === 'string' ? it?.products?.dimensions : '',
            location: '',
            barcode: (it?.products?.sku || ''),
            fragile: false,
          }));

          // Prefijar asignado/notas si vinieran en la respuesta (no obligatorio)
          setNewTaskForm((prev) => ({
            ...prev,
            assignedTo: prev.assignedTo || '',
            notes: prev.notes || '',
          }));

          if (mappedItems.length > 0) {
            setNewItems(mappedItems);
            return; // Éxito con backend, salir
          }
        }
      } catch (e) {
        console.warn('Fallo al cargar desde backend, haré fallback a localStorage:', e);
      }
    }

    // Intento 2: Fallback a órdenes guardadas en localStorage
    const list = loadSavedOrders();
    const found = list.find((o: any) => String(o.orderNumber).trim() === orderNum);
    if (!found) {
      alert('No se encontró una orden con ese número en las Órdenes de Envío.');
      return;
    }
    setNewTaskForm((prev) => ({
      ...prev,
      assignedTo: (found.assignedTo ?? prev.assignedTo ?? ''),
      notes: found.notes ?? prev.notes ?? '',
    }));
    const mappedItems: PackingItem[] = (found.items || []).map((it: any, idx: number) => ({
      id: `ord-${found.id || 'x'}-${idx}`,
      product: it.product || '',
      sku: it.sku || '',
      quantity: Number(it.quantity || 0),
      quantityPacked: 0,
      weight: Number(it.weight || 0),
      dimensions: it.dimensions || '',
      location: '',
      barcode: '',
      fragile: false,
    }));
    if (mappedItems.length > 0) {
      setNewItems(mappedItems);
    }
  };

  // Mock data
  const [tasks, setTasks] = useState<PackingTask[]>([
    {
      id: '1',
      taskNumber: 'PACK-001',
      orderId: '1',
      orderNumber: 'ORD-2024-001',
      assignedTo: 'Juan Pérez',
      status: 'in_progress',
      priority: 'high',
      items: [
        {
          id: '1',
          product: 'Laptop HP Pavilion',
          sku: 'HP-PAV-001',
          quantity: 1,
          quantityPacked: 0,
          weight: 2.5,
          dimensions: '35x25x3 cm',
          location: 'A-01-15',
          barcode: '1234567890123',
          fragile: true,
          specialInstructions: 'Usar material de protección extra'
        },
        {
          id: '2',
          product: 'Mouse Inalámbrico',
          sku: 'MS-WL-001',
          quantity: 1,
          quantityPacked: 1,
          weight: 0.1,
          dimensions: '12x8x4 cm',
          location: 'B-02-08',
          barcode: '1234567890124',
          fragile: false
        }
      ],
      packingType: 'fragile',
      estimatedTime: 15,
      actualTime: 12,
      startTime: '2024-01-15T09:00:00Z',
      packingMaterials: ['Caja mediana', 'Papel burbuja', 'Relleno', 'Cinta adhesiva'],
      boxType: 'Caja reforzada 40x30x15 cm',
      totalWeight: 2.6,
      totalVolume: 18000, // cm³
      createdAt: '2024-01-15T08:30:00Z',
      notes: 'Cliente solicita empaquetado especial',
      qualityCheck: false
    },
    {
      id: '2',
      taskNumber: 'PACK-002',
      orderId: '2',
      orderNumber: 'ORD-2024-002',
      assignedTo: 'María González',
      status: 'pending',
      priority: 'medium',
      items: [
        {
          id: '3',
          product: 'Smartphone Samsung',
          sku: 'SAM-GAL-001',
          quantity: 2,
          quantityPacked: 0,
          weight: 0.4,
          dimensions: '16x8x1 cm',
          location: 'C-03-12',
          barcode: '1234567890125',
          fragile: true
        }
      ],
      packingType: 'standard',
      estimatedTime: 10,
      packingMaterials: ['Caja pequeña', 'Papel burbuja', 'Cinta adhesiva'],
      boxType: 'Caja estándar 25x20x10 cm',
      totalWeight: 0.8,
      totalVolume: 5000,
      createdAt: '2024-01-15T10:15:00Z',
      qualityCheck: false
    },
    {
      id: '3',
      taskNumber: 'PACK-003',
      orderId: '3',
      orderNumber: 'ORD-2024-003',
      status: 'completed',
      priority: 'low',
      items: [
        {
          id: '4',
          product: 'Tablet iPad Air',
          sku: 'APL-IPD-001',
          quantity: 1,
          quantityPacked: 1,
          weight: 0.6,
          dimensions: '25x18x1 cm',
          location: 'D-04-05',
          barcode: '1234567890126',
          fragile: true
        }
      ],
      packingType: 'fragile',
      estimatedTime: 12,
      actualTime: 10,
      startTime: '2024-01-15T11:00:00Z',
      endTime: '2024-01-15T11:10:00Z',
      packingMaterials: ['Caja mediana', 'Papel burbuja', 'Cinta adhesiva'],
      boxType: 'Caja reforzada 30x25x8 cm',
      totalWeight: 0.6,
      totalVolume: 6000,
      createdAt: '2024-01-15T10:45:00Z',
      qualityCheck: true
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-gray-600 bg-gray-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'paused': return 'text-orange-600 bg-orange-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'in_progress': return 'En Progreso';
      case 'paused': return 'Pausada';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return priority;
    }
  };

  const getPackingTypeColor = (type: string) => {
    switch (type) {
      case 'standard': return 'text-blue-600 bg-blue-100';
      case 'fragile': return 'text-orange-600 bg-orange-100';
      case 'oversized': return 'text-purple-600 bg-purple-100';
      case 'hazardous': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPackingTypeText = (type: string) => {
    switch (type) {
      case 'standard': return 'Estándar';
      case 'fragile': return 'Frágil';
      case 'oversized': return 'Sobredimensionado';
      case 'hazardous': return 'Peligroso';
      default: return type;
    }
  };

  const handleViewTask = (task: PackingTask) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleStartTask = (taskId: string) => {
    setActiveTimer(taskId);
    console.log('Iniciando tarea:', taskId);
  };

  const handlePauseTask = (taskId: string) => {
    setActiveTimer(null);
    console.log('Pausando tarea:', taskId);
  };

  const handleCompleteTask = (taskId: string) => {
    setActiveTimer(null);
    console.log('Completando tarea:', taskId);
  };

  const getTaskProgress = (task: PackingTask) => {
    const totalItems = task.items.reduce((sum, item) => sum + item.quantity, 0);
    const packedItems = task.items.reduce((sum, item) => sum + item.quantityPacked, 0);
    return totalItems > 0 ? (packedItems / totalItems) * 100 : 0;
  };

  // --- Nueva Tarea: helpers y manejadores ---
  const addItem = () => {
    setNewItems((prev) => ([
      ...prev,
      { id: `tmp-${Date.now()}`, product: '', sku: '', quantity: 1, quantityPacked: 0, weight: 0, dimensions: '', location: '', barcode: '', fragile: false }
    ]));
  };

  const removeItem = (index: number) => {
    setNewItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PackingItem, value: any) => {
    setNewItems((prev) => prev.map((it, i) => i === index ? { ...it, [field]: field === 'quantity' || field === 'weight' ? Number(value) : value } : it));
  };

  const getNextTaskNumber = () => {
    const nums = tasks
      .map(t => Number(t.taskNumber.replace(/\D/g, '')))
      .filter(n => !isNaN(n));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return `PACK-${String(next).padStart(3, '0')}`;
  };

  const handleCreateNewTask = () => {
    // Validaciones mínimas
    if (!newTaskForm.orderNumber.trim()) {
      alert('Ingresa el número de orden');
      return;
    }
    if (newItems.length === 0 || newItems.every(it => !it.product || it.quantity <= 0)) {
      alert('Agrega al menos un producto con cantidad');
      return;
    }

    const totalWeight = newItems.reduce((sum, it) => sum + (it.weight || 0) * (it.quantity || 0), 0);
    const totalVolume = 0; // simplificado

    const newTask: PackingTask = {
      id: `${Date.now()}`,
      taskNumber: getNextTaskNumber(),
      orderId: `${Date.now()}`,
      orderNumber: newTaskForm.orderNumber,
      assignedTo: newTaskForm.assignedTo || undefined,
      status: 'pending',
      priority: newTaskForm.priority,
      items: newItems.map(it => ({ ...it, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, quantityPacked: 0 })),
      packingType: newTaskForm.packingType,
      estimatedTime: Number(newTaskForm.estimatedTime) || 10,
      packingMaterials: ['Caja', 'Cinta'],
      boxType: newTaskForm.boxType || 'Caja estándar',
      totalWeight,
      totalVolume,
      createdAt: new Date().toISOString(),
      notes: newTaskForm.notes || undefined,
      qualityCheck: false
    };

    setTasks(prev => [newTask, ...prev]);
    // Persistir en localStorage para métricas reales del dashboard
    try {
      const existingStr = localStorage.getItem('packing_tasks');
      const existing: PackingTask[] = existingStr ? JSON.parse(existingStr) : [];
      localStorage.setItem('packing_tasks', JSON.stringify([newTask, ...existing]));
    } catch (e) {
      console.warn('No se pudo guardar packing_tasks en localStorage:', e);
    }
    setShowNewTaskModal(false);
    // reset
    setNewTaskForm({ orderNumber: '', assignedTo: '', priority: 'medium', packingType: 'standard', boxType: '', estimatedTime: 10, notes: '' });
    setNewItems([{ id: `tmp-${Date.now()}`, product: '', sku: '', quantity: 1, quantityPacked: 0, weight: 0, dimensions: '', location: '', barcode: '', fragile: false }]);
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">Tareas de Empaquetado</h2>
          <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
            {tasks.filter(t => t.status !== 'completed').length} activas
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowNewTaskModal(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Tarea
          </button>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map((task) => (
          <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            {/* Task Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-900">{task.taskNumber}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                  {getStatusText(task.status)}
                </span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                  {getPriorityText(task.priority)}
                </span>
              </div>
            </div>

            {/* Order Info */}
            <div className="mb-4">
              <div className="text-sm text-gray-600">Orden: {task.orderNumber}</div>
              {task.assignedTo && (
                <div className="flex items-center mt-1">
                  <User className="w-4 h-4 text-gray-400 mr-1" />
                  <span className="text-sm text-gray-600">{task.assignedTo}</span>
                </div>
              )}
            </div>

            {/* Packing Type */}
            <div className="mb-4">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPackingTypeColor(task.packingType)}`}>
                {getPackingTypeText(task.packingType)}
              </span>
            </div>

            {/* Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Progreso</span>
                <span className="text-sm text-gray-900">{getTaskProgress(task).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getTaskProgress(task)}%` }}
                ></div>
              </div>
            </div>

            {/* Task Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <div className="text-gray-600">Productos</div>
                <div className="font-semibold text-gray-900">{task.items.length}</div>
              </div>
              <div>
                <div className="text-gray-600">Tiempo Est.</div>
                <div className="font-semibold text-gray-900">{task.estimatedTime} min</div>
              </div>
              <div>
                <div className="text-gray-600">Peso Total</div>
                <div className="font-semibold text-gray-900">{task.totalWeight} kg</div>
              </div>
              <div>
                <div className="text-gray-600">Caja</div>
                <div className="font-semibold text-gray-900 truncate" title={task.boxType}>
                  {task.boxType.split(' ')[0]}...
                </div>
              </div>
            </div>

            {/* Timer for active tasks */}
            {task.status === 'in_progress' && activeTimer === task.id && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Timer className="w-4 h-4 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-900">En progreso</span>
                  </div>
                  <div className="text-sm font-mono text-blue-900">
                    {task.actualTime || 0} min
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleViewTask(task)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Ver Detalles
              </button>
              
              <div className="flex items-center space-x-2">
                {task.status === 'pending' && (
                  <button
                    onClick={() => handleStartTask(task.id)}
                    className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Iniciar
                  </button>
                )}
                
                {task.status === 'in_progress' && (
                  <>
                    <button
                      onClick={() => handlePauseTask(task.id)}
                      className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-orange-600 hover:bg-orange-700"
                    >
                      <Pause className="w-3 h-3 mr-1" />
                      Pausar
                    </button>
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Completar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Task Details Modal */}
      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Detalles de Tarea - {selectedTask.taskNumber}
              </h3>
              <button
                onClick={() => setShowTaskModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Task Information */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Información General</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Orden:</span>
                      <span className="text-sm text-gray-900">{selectedTask.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Estado:</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedTask.status)}`}>
                        {getStatusText(selectedTask.status)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Prioridad:</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedTask.priority)}`}>
                        {getPriorityText(selectedTask.priority)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tipo:</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPackingTypeColor(selectedTask.packingType)}`}>
                        {getPackingTypeText(selectedTask.packingType)}
                      </span>
                    </div>
                    {selectedTask.assignedTo && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Asignado a:</span>
                        <span className="text-sm text-gray-900">{selectedTask.assignedTo}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Materiales de Empaquetado</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      <div className="text-sm text-gray-900 font-medium">{selectedTask.boxType}</div>
                      <div className="flex flex-wrap gap-1">
                        {selectedTask.packingMaterials.map((material, index) => (
                          <span key={index} className="inline-flex px-2 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded">
                            {material}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time and Progress */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Tiempo y Progreso</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tiempo estimado:</span>
                      <span className="text-sm text-gray-900">{selectedTask.estimatedTime} min</span>
                    </div>
                    {selectedTask.actualTime && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Tiempo real:</span>
                        <span className="text-sm text-gray-900">{selectedTask.actualTime} min</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Progreso:</span>
                      <span className="text-sm text-gray-900">{getTaskProgress(selectedTask).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${getTaskProgress(selectedTask)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Especificaciones</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Peso total:</span>
                      <span className="text-sm text-gray-900">{selectedTask.totalWeight} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Volumen:</span>
                      <span className="text-sm text-gray-900">{(selectedTask.totalVolume / 1000).toFixed(1)} L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Control de calidad:</span>
                      <span className={`text-sm ${selectedTask.qualityCheck ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedTask.qualityCheck ? 'Completado' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Productos a Empaquetar</h4>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Empaquetado</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedTask.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2">
                          <div>
                            <div className="text-sm text-gray-900">{item.product}</div>
                            {item.fragile && (
                              <div className="flex items-center mt-1">
                                <AlertTriangle className="w-3 h-3 text-orange-500 mr-1" />
                                <span className="text-xs text-orange-600">Frágil</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500 font-mono">{item.sku}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.location}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.quantityPacked}</td>
                        <td className="px-4 py-2">
                          {item.quantityPacked >= item.quantity ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-green-600 bg-green-100">
                              Completo
                            </span>
                          ) : item.quantityPacked > 0 ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-orange-600 bg-orange-100">
                              Parcial
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-gray-600 bg-gray-100">
                              Pendiente
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedTask.notes && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Notas</h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">{selectedTask.notes}</p>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowTaskModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
                Editar Tarea
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-3xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Nueva Tarea de Empaquetado</h3>
              <button onClick={() => setShowNewTaskModal(false)} className="text-gray-400 hover:text-gray-600" title="Cerrar">×</button>
            </div>

            {/* Datos básicos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Orden</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskForm.orderNumber}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, orderNumber: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleLoadFromOrder}
                    className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                    title="Buscar y cargar datos de la orden"
                  >
                    Buscar
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Asignado a</label>
                <input type="text" value={newTaskForm.assignedTo} onChange={(e) => setNewTaskForm({ ...newTaskForm, assignedTo: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Prioridad</label>
                <select value={newTaskForm.priority} onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value as 'low' | 'medium' | 'high' })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                  <option value="high">Alta</option>
                  <option value="medium">Media</option>
                  <option value="low">Baja</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo de Empaque</label>
                <select value={newTaskForm.packingType} onChange={(e) => setNewTaskForm({ ...newTaskForm, packingType: e.target.value as 'standard' | 'fragile' | 'oversized' | 'hazardous' })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                  <option value="standard">Estándar</option>
                  <option value="fragile">Frágil</option>
                  <option value="oversized">Sobredimensionado</option>
                  <option value="hazardous">Peligroso</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Caja/Embalaje</label>
                <input type="text" value={newTaskForm.boxType} onChange={(e) => setNewTaskForm({ ...newTaskForm, boxType: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tiempo Estimado (min)</label>
                <input type="number" min={1} value={newTaskForm.estimatedTime} onChange={(e) => setNewTaskForm({ ...newTaskForm, estimatedTime: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Productos */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">Productos a Empaquetar</h4>
                <button onClick={addItem} className="px-2 py-1 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700">Agregar producto</button>
              </div>
              <div className="space-y-3">
                {newItems.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Producto</label>
                      <input type="text" value={item.product} onChange={(e) => updateItem(idx, 'product', e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">SKU</label>
                      <input type="text" value={item.sku} onChange={(e) => updateItem(idx, 'sku', e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Ubicación</label>
                      <input type="text" value={item.location} onChange={(e) => updateItem(idx, 'location', e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Cantidad</label>
                      <input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Peso (kg)</label>
                      <input type="number" step="0.01" value={item.weight} onChange={(e) => updateItem(idx, 'weight', e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Dimensiones</label>
                      <input type="text" value={item.dimensions} onChange={(e) => updateItem(idx, 'dimensions', e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-700">Frágil</label>
                      <input type="checkbox" checked={item.fragile} onChange={(e) => updateItem(idx, 'fragile', e.target.checked)} />
                      <button onClick={() => removeItem(idx)} className="ml-auto px-2 py-1 border border-gray-300 rounded-md text-xs hover:bg-gray-50">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Notas</label>
                <input type="text" value={newTaskForm.notes} onChange={(e) => setNewTaskForm({ ...newTaskForm, notes: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowNewTaskModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleCreateNewTask} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Crear Tarea</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}