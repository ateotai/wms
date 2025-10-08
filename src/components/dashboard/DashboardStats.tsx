import React from 'react';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  Truck, 
  BarChart3,
  Target,
  Activity
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  color: string;
}

function StatCard({ title, value, change, changeType, icon: Icon, color }: StatCardProps) {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${getChangeColor()}`}>
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export function DashboardStats() {
  const stats = [
    {
      title: 'Inventario Total',
      value: '€2,847,392',
      change: '+12.5% vs mes anterior',
      changeType: 'positive' as const,
      icon: Package,
      color: 'bg-blue-500'
    },
    {
      title: 'Precisión Inventario',
      value: '99.2%',
      change: '+0.3% vs mes anterior',
      changeType: 'positive' as const,
      icon: Target,
      color: 'bg-green-500'
    },
    {
      title: 'Órdenes Procesadas',
      value: '1,247',
      change: '+8.2% vs ayer',
      changeType: 'positive' as const,
      icon: CheckCircle,
      color: 'bg-purple-500'
    },
    {
      title: 'Productividad Picking',
      value: '156 líneas/h',
      change: '+5.1% vs semana anterior',
      changeType: 'positive' as const,
      icon: Activity,
      color: 'bg-orange-500'
    },
    {
      title: 'OTIF Performance',
      value: '94.8%',
      change: '-1.2% vs mes anterior',
      changeType: 'negative' as const,
      icon: Clock,
      color: 'bg-red-500'
    },
    {
      title: 'Rotación Stock',
      value: '8.4x',
      change: '+0.6x vs trimestre anterior',
      changeType: 'positive' as const,
      icon: TrendingUp,
      color: 'bg-indigo-500'
    },
    {
      title: 'Alertas Activas',
      value: '23',
      change: '5 críticas',
      changeType: 'negative' as const,
      icon: AlertTriangle,
      color: 'bg-yellow-500'
    },
    {
      title: 'Operarios Activos',
      value: '47',
      change: '12 en picking',
      changeType: 'neutral' as const,
      icon: Users,
      color: 'bg-gray-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}