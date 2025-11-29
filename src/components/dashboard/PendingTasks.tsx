import React, { useEffect, useState, useMemo } from 'react';
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

const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL;

export function PendingTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!AUTH_BACKEND_URL) return;
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`${AUTH_BACKEND_URL}/tasks/pending`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        setTasks(data.tasks || []);
      } catch (e: any) {
        console.error('Error cargando tareas pendientes:', e);
        setError(e?.message || 'No se pudo cargar las tareas');
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

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

  const sortedTasks = [...tasks].sort((a, b) => {
    // Prioridad: overdue > urgent > high > medium > low
    const priorityOrder = { overdue: 0, urgent: 1, high: 2, medium: 3, low: 4 };
    const aPriority = a.status === 'overdue' ? 0 : priorityOrder[a.priority] + 1;
    const bPriority = b.status === 'overdue' ? 0 : priorityOrder[b.priority] + 1;
    return aPriority - bPriority;
  });

  const uniqueSortedTasks = useMemo(() => {
    const seen = new Set<string>();
    const out: Task[] = [];
    for (const t of sortedTasks) {
      const key = String(t.id || '');
      if (!seen.has(key)) {
        seen.add(key);
        out.push(t);
      }
    }
    return out;
  }, [sortedTasks]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Tareas Pendientes</h3>
            <p className="text-sm text-gray-500">
              {tasks.filter(t => t.status === 'overdue').length} vencidas, {' '}
              {tasks.filter(t => t.status === 'pending').length} pendientes
            </p>
          </div>
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            Gestionar todas
          </button>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {!AUTH_BACKEND_URL && (
          <div className="px-6 py-4 text-sm text-gray-600">Configura `VITE_AUTH_BACKEND_URL` en .env</div>
        )}
        {loading && (
          <div className="px-6 py-4 text-sm text-gray-600">Cargando tareas…</div>
        )}
        {error && (
          <div className="px-6 py-4 text-sm text-red-600">{error}</div>
        )}
        {!loading && !error && uniqueSortedTasks.length === 0 && (
          <div className="px-6 py-4 text-sm text-gray-600">Sin tareas pendientes</div>
        )}
        {uniqueSortedTasks.map((task) => {
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
            Total: {tasks.length} tareas
          </span>
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            Crear nueva tarea →
          </button>
        </div>
      </div>
    </div>
  );
}