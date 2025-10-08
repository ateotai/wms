import React from 'react';
import { 
  Package, 
  Truck, 
  ShoppingCart, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  User,
  MapPin
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'inbound' | 'outbound' | 'picking' | 'alert' | 'completed' | 'pending';
  title: string;
  description: string;
  user?: string;
  location?: string;
  timestamp: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

const activityData: ActivityItem[] = [
  {
    id: '1',
    type: 'inbound',
    title: 'Recepción completada',
    description: 'PO-2024-001 - 150 unidades recibidas',
    user: 'María García',
    location: 'Muelle A-1',
    timestamp: '2 min',
    priority: 'medium'
  },
  {
    id: '2',
    type: 'picking',
    title: 'Picking en progreso',
    description: 'Ola W-240115 - 23 órdenes asignadas',
    user: 'Carlos López',
    location: 'Zona A',
    timestamp: '5 min',
    priority: 'high'
  },
  {
    id: '3',
    type: 'alert',
    title: 'Stock bajo detectado',
    description: 'SKU-12345 - Solo 5 unidades disponibles',
    location: 'A-01-02-03',
    timestamp: '8 min',
    priority: 'critical'
  },
  {
    id: '4',
    type: 'outbound',
    title: 'Envío preparado',
    description: 'SO-2024-0892 - Listo para transporte',
    user: 'Ana Martín',
    location: 'Muelle B-2',
    timestamp: '12 min',
    priority: 'medium'
  },
  {
    id: '5',
    type: 'completed',
    title: 'Reconteo completado',
    description: 'Zona C - 98.5% de precisión',
    user: 'Pedro Ruiz',
    location: 'Zona C',
    timestamp: '15 min',
    priority: 'low'
  },
  {
    id: '6',
    type: 'pending',
    title: 'Reposición pendiente',
    description: '12 tareas de reabastecimiento',
    location: 'Múltiples zonas',
    timestamp: '18 min',
    priority: 'medium'
  }
];

function getActivityIcon(type: ActivityItem['type']) {
  switch (type) {
    case 'inbound': return Truck;
    case 'outbound': return Package;
    case 'picking': return ShoppingCart;
    case 'alert': return AlertTriangle;
    case 'completed': return CheckCircle;
    case 'pending': return Clock;
    default: return Package;
  }
}

function getActivityColor(type: ActivityItem['type'], priority?: ActivityItem['priority']) {
  if (type === 'alert' && priority === 'critical') return 'bg-red-100 text-red-800 border-red-200';
  if (priority === 'high') return 'bg-orange-100 text-orange-800 border-orange-200';
  
  switch (type) {
    case 'inbound': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'outbound': return 'bg-green-100 text-green-800 border-green-200';
    case 'picking': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'alert': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'completed': return 'bg-green-100 text-green-800 border-green-200';
    case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getPriorityBadge(priority?: ActivityItem['priority']) {
  if (!priority) return null;
  
  const colors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  };
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[priority]}`}>
      {priority.toUpperCase()}
    </span>
  );
}

export function RecentActivity() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Actividad Reciente</h3>
        <p className="text-sm text-gray-500">Últimas operaciones del almacén</p>
      </div>
      
      <div className="divide-y divide-gray-200">
        {activityData.map((activity) => {
          const Icon = getActivityIcon(activity.type);
          const colorClass = getActivityColor(activity.type, activity.priority);
          
          return (
            <div key={activity.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 p-2 rounded-lg border ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </p>
                    <div className="flex items-center space-x-2">
                      {getPriorityBadge(activity.priority)}
                      <span className="text-xs text-gray-500">{activity.timestamp}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-1">
                    {activity.description}
                  </p>
                  
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    {activity.user && (
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>{activity.user}</span>
                      </div>
                    )}
                    {activity.location && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>{activity.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          Ver toda la actividad →
        </button>
      </div>
    </div>
  );
}