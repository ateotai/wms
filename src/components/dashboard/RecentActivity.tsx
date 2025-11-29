import React, { useEffect, useState } from 'react';
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

// Estado para datos reales
const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL;

export function RecentActivity() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      if (!AUTH_BACKEND_URL) return;
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`${AUTH_BACKEND_URL}/activity/recent`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        setItems(data.items || []);
      } catch (e: any) {
        console.error('Error cargando actividad reciente:', e);
        setError(e?.message || 'No se pudo cargar la actividad');
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

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

  const renderBody = () => {
    if (!AUTH_BACKEND_URL) {
      return <p className="text-sm text-gray-600">Configura `VITE_AUTH_BACKEND_URL` en .env</p>;
    }
    if (loading) {
      return <p className="text-sm text-gray-600">Cargando actividad…</p>;
    }
    if (error) {
      return <p className="text-sm text-red-600">{error}</p>;
    }
    if (!items || items.length === 0) {
      return <p className="text-sm text-gray-600">Sin datos recientes</p>;
    }

    return (
      <div className="divide-y divide-gray-200">
        {items.map((activity) => {
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
                    <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                    <div className="flex items-center space-x-2">
                      {getPriorityBadge(activity.priority)}
                      {activity.timestamp && (
                        <span className="text-xs text-gray-500">{activity.timestamp}</span>
                      )}
                    </div>
                  </div>
                  {activity.description && (
                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                  )}
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
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Actividad Reciente</h3>
        <p className="text-sm text-gray-500">Últimas operaciones del almacén</p>
      </div>
      
      {renderBody()}
      
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          Ver toda la actividad →
        </button>
      </div>
    </div>
  );
}