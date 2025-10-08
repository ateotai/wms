import React from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  BarChart3, 
  Settings, 
  Truck, 
  Package, 
  ShoppingCart,
  RefreshCw,
  MapPin,
  Users,
  AlertTriangle
} from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  href: string;
  badge?: string;
}

const quickActions: QuickAction[] = [
  {
    id: '1',
    title: 'Nueva Recepción',
    description: 'Registrar entrada de mercancía',
    icon: Truck,
    color: 'bg-blue-500 hover:bg-blue-600',
    href: '#receiving/new'
  },
  {
    id: '2',
    title: 'Crear Picking',
    description: 'Generar nueva tarea de picking',
    icon: ShoppingCart,
    color: 'bg-green-500 hover:bg-green-600',
    href: '#picking/new'
  },
  {
    id: '3',
    title: 'Buscar Producto',
    description: 'Localizar SKU en almacén',
    icon: Search,
    color: 'bg-purple-500 hover:bg-purple-600',
    href: '#inventory/search'
  },
  {
    id: '4',
    title: 'Ajuste Inventario',
    description: 'Corregir cantidades de stock',
    icon: Package,
    color: 'bg-orange-500 hover:bg-orange-600',
    href: '#inventory/adjustment'
  },
  {
    id: '5',
    title: 'Reposición',
    description: 'Gestionar reabastecimiento',
    icon: RefreshCw,
    color: 'bg-indigo-500 hover:bg-indigo-600',
    href: '#replenishment',
    badge: '12'
  },
  {
    id: '6',
    title: 'Mapa Almacén',
    description: 'Ver layout y ubicaciones',
    icon: MapPin,
    color: 'bg-teal-500 hover:bg-teal-600',
    href: '#warehouse/map'
  },
  {
    id: '7',
    title: 'Reportes',
    description: 'Generar informes y KPIs',
    icon: BarChart3,
    color: 'bg-pink-500 hover:bg-pink-600',
    href: '#reports'
  },
  {
    id: '8',
    title: 'Alertas',
    description: 'Revisar notificaciones',
    icon: AlertTriangle,
    color: 'bg-red-500 hover:bg-red-600',
    href: '#alerts',
    badge: '5'
  }
];

export function QuickActions() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Acciones Rápidas</h3>
        <p className="text-sm text-gray-500">Operaciones frecuentes del almacén</p>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            
            return (
              <a
                key={action.id}
                href={action.href}
                className="relative group block p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={`p-3 rounded-lg ${action.color} transition-colors`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                      {action.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {action.description}
                    </p>
                  </div>
                </div>
                
                {action.badge && (
                  <div className="absolute -top-2 -right-2">
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                      {action.badge}
                    </span>
                  </div>
                )}
              </a>
            );
          })}
        </div>
      </div>
      
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          Personalizar acciones →
        </button>
      </div>
    </div>
  );
}