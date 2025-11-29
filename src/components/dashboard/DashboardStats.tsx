import React, { useEffect, useState } from 'react';
import { formatCurrency } from '../../utils/currency';
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
  const [metrics, setMetrics] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL;

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!AUTH_BACKEND_URL) return;
      setLoading(true);
      try {
        const resp = await fetch(`${AUTH_BACKEND_URL}/metrics/dashboard`);
        if (resp.ok) {
          const data = await resp.json();
          setMetrics(data);
        }
      } catch (e) {
        console.error('Error cargando métricas del dashboard:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [AUTH_BACKEND_URL]);

  const toCurrency = (n: number | null | undefined) => {
    if (typeof n !== 'number') return '—';
    return formatCurrency(n);
  };
  const toPercent = (n: number | null | undefined) => {
    if (typeof n !== 'number') return '—';
    return `${n.toFixed(1)}%`;
  };
  const toLinesPerHour = (n: number | null | undefined) => {
    if (typeof n !== 'number') return '—';
    return `${Math.round(n)} líneas/h`;
  };
  const toFactor = (n: number | null | undefined) => {
    if (typeof n !== 'number') return '—';
    return `${n.toFixed(1)}x`;
  };

  const stats = [
    {
      title: 'Inventario Total',
      value: toCurrency(metrics?.inventory_total_value),
      change: loading ? 'Actualizando…' : 'vs mes anterior',
      changeType: 'neutral' as const,
      icon: Package,
      color: 'bg-blue-500'
    },
    {
      title: 'Precisión Inventario',
      value: toPercent(metrics?.inventory_accuracy),
      change: loading ? 'Actualizando…' : 'últimos 30 días',
      changeType: 'neutral' as const,
      icon: Target,
      color: 'bg-green-500'
    },
    {
      title: 'Órdenes Procesadas',
      value: typeof metrics?.orders_processed_last_day === 'number' ? metrics.orders_processed_last_day : '—',
      change: loading ? 'Actualizando…' : 'últimas 24h',
      changeType: 'neutral' as const,
      icon: CheckCircle,
      color: 'bg-purple-500'
    },
    {
      title: 'Productividad Picking',
      value: toLinesPerHour(metrics?.picking_productivity_lines_per_hour),
      change: loading ? 'Actualizando…' : 'hoy',
      changeType: 'neutral' as const,
      icon: Activity,
      color: 'bg-orange-500'
    },
    {
      title: 'OTIF Performance',
      value: toPercent(metrics?.otif_percentage),
      change: loading ? 'Actualizando…' : 'últimos 30 días',
      changeType: 'neutral' as const,
      icon: Clock,
      color: 'bg-red-500'
    },
    {
      title: 'Rotación Stock',
      value: toFactor(metrics?.stock_rotation_x),
      change: loading ? 'Actualizando…' : 'últimos 90 días',
      changeType: 'neutral' as const,
      icon: TrendingUp,
      color: 'bg-indigo-500'
    },
    {
      title: 'Alertas Activas',
      value: typeof metrics?.alerts_active === 'number' ? metrics.alerts_active : '—',
      change: loading ? 'Actualizando…' : 'stock bajo',
      changeType: 'neutral' as const,
      icon: AlertTriangle,
      color: 'bg-yellow-500'
    },
    {
      title: 'Operarios Activos',
      value: typeof metrics?.operators_active === 'number' ? metrics.operators_active : '—',
      change: loading ? 'Actualizando…' : 'usuarios con rol operador',
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