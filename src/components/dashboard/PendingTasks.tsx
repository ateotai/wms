import React from 'react';
import { 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Package, 
  ShoppingCart,
  CheckCircle2,
  User,
  Calendar
} from 'lucide-react';

interface Task {
  id: string;
  type: 'picking' | 'receiving' | 'replenishment' | 'count' | 'maintenance';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  dueDate: string;
  estimatedTime: string;
  location: string;
  status: 'pending' | 'in_progress' | 'overdue';
}

const pendingTasks: Task[] = [
  {
    id: '1',
    type: 'picking',
    title: 'Picking Urgente',
    description: 'Orden SO-2024-0895 - Cliente Premium',
    priority: 'urgent',
    assignedTo: 'Carlos López',
    dueDate: '14:30',
    estimatedTime: '25 min',
    location: 'Zona A-B',
    status: 'in_progress'
  },
  {
    id: '2',
    type: 'replenishment',
    title: 'Reposición Automática',
    description: '8 ubicaciones requieren reabastecimiento',
    priority: 'high',
    dueDate: '15:00',
    estimatedTime: '45 min',
    location: 'Zonas A, B, C',
    status: 'pending'
  },
  {
    id: '3',
    type: 'receiving',
    title: 'Recepción Programada',
    description: 'PO-2024-002 - Proveedor ABC Corp',
    priority: 'medium',
    assignedTo: 'María García',
    dueDate: '16:00',
    estimatedTime: '30 min',
    location: 'Muelle A-1',
    status: 'pending'
  },
  {
    id: '4',
    type: 'count',
    title: 'Recuento Cíclico',
    description: 'Zona C - Productos categoría A',
    priority: 'medium',
    dueDate: '17:00',
    estimatedTime: '60 min',
    location: 'Zona C',
    status: 'pending'
  },
  {
    id: '5',
    type: 'picking',
    title: 'Batch Picking',
    description: 'Ola W-240115 - 15 órdenes agrupadas',
    priority: 'high',
    assignedTo: 'Ana Martín',
    dueDate: '13:45',
    estimatedTime: '40 min',
    location: 'Zona A',
    status: 'overdue'
  },
  {
    id: '6',
    type: 'maintenance',
    title: 'Mantenimiento Preventivo',
    description: 'Revisión montacargas MC-003',
    priority: 'low',
    dueDate: '18:00',
    estimatedTime: '20 min',
    location: 'Taller',
    status: 'pending'
  }
];

function getTaskIcon(type: Task['type']) {
  switch (type) {
    case 'picking': return ShoppingCart;
    case 'receiving': return Package;
    case 'replenishment': return RefreshCw;
    case 'count': return CheckCircle2;
    case 'maintenance': return AlertTriangle;
    default: return Clock;
  }
}

function getPriorityColor(priority: Task['priority']) {
  switch (priority) {
    case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getStatusColor(status: Task['status']) {
  switch (status) {
    case 'in_progress': return 'bg-blue-100 text-blue-800';
    case 'overdue': return 'bg-red-100 text-red-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getStatusText(status: Task['status']) {
  switch (status) {
    case 'in_progress': return 'En Progreso';
    case 'overdue': return 'Vencida';
    case 'pending': return 'Pendiente';
    default: return 'Desconocido';
  }
}

export function PendingTasks() {
  const sortedTasks = [...pendingTasks].sort((a, b) => {
    // Prioridad: overdue > urgent > high > medium > low
    const priorityOrder = { overdue: 0, urgent: 1, high: 2, medium: 3, low: 4 };
    const aPriority = a.status === 'overdue' ? 0 : priorityOrder[a.priority] + 1;
    const bPriority = b.status === 'overdue' ? 0 : priorityOrder[b.priority] + 1;
    return aPriority - bPriority;
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Tareas Pendientes</h3>
            <p className="text-sm text-gray-500">
              {pendingTasks.filter(t => t.status === 'overdue').length} vencidas, {' '}
              {pendingTasks.filter(t => t.status === 'pending').length} pendientes
            </p>
          </div>
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            Gestionar todas
          </button>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {sortedTasks.map((task) => {
          const Icon = getTaskIcon(task.type);
          const priorityColor = getPriorityColor(task.priority);
          const statusColor = getStatusColor(task.status);
          
          return (
            <div key={task.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 p-2 rounded-lg border ${priorityColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {task.title}
                    </p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                      {getStatusText(task.status)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-1">
                    {task.description}
                  </p>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      {task.assignedTo && (
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{task.assignedTo}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{task.dueDate}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{task.estimatedTime}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priorityColor}`}>
                        {task.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">📍 {task.location}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Total: {pendingTasks.length} tareas
          </span>
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            Crear nueva tarea →
          </button>
        </div>
      </div>
    </div>
  );
}