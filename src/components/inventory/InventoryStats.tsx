import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, TrendingDown, AlertTriangle, DollarSign, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ElementType;
  color: string;
}

interface InventoryMetrics {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  obsoleteCount: number;
  averageRotation: number;
  inventoryAccuracy: number;
}

function StatCard({ title, value, change, changeType, icon: Icon, color }: StatCardProps) {
  const getChangeColor = () => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getChangeIcon = () => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="w-4 h-4" />;
      case 'decrease':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          <div className={`flex items-center mt-2 ${getChangeColor()}`}>
            {getChangeIcon()}
            <span className="text-sm font-medium ml-1">{change}</span>
          </div>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export function InventoryStats() {
  const [metrics, setMetrics] = useState<InventoryMetrics>({
    totalProducts: 0,
    totalValue: 0,
    lowStockCount: 0,
    obsoleteCount: 0,
    averageRotation: 0,
    inventoryAccuracy: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distinctProductsCount, setDistinctProductsCount] = useState<number>(0);
  const [loadingDistinct, setLoadingDistinct] = useState<boolean>(true);

  const fetchInventoryMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener total de productos activos
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, cost_price, selling_price, min_stock_level, reorder_point')
        .eq('is_active', true);

      if (productsError) throw productsError;

      // Obtener inventario actual
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select(`
          quantity,
          product_id,
          products!inner(cost_price, selling_price, min_stock_level, reorder_point)
        `);

      if (inventoryError) throw inventoryError;

      // Calcular métricas
      const totalProducts = productsData?.length || 0;
      
      let totalValue = 0;
      let lowStockCount = 0;
      let obsoleteCount = 0;

      inventoryData?.forEach(item => {
        const product = item.products;
        const stockValue = item.quantity * (product.cost_price || 0);
        totalValue += stockValue;

        // Contar productos con stock bajo
        if (item.quantity <= product.reorder_point) {
          lowStockCount++;
        }

        // Contar productos obsoletos (sin movimiento en 90 días - simplificado)
        if (item.quantity > 0 && item.quantity <= product.min_stock_level * 0.1) {
          obsoleteCount++;
        }
      });

      // Obtener movimientos recientes para calcular rotación
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: movementsData, error: movementsError } = await supabase
        .from('inventory_movements')
        .select('quantity, movement_type')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('movement_type', 'OUT');

      if (movementsError) throw movementsError;

      const totalOutbound = movementsData?.reduce((sum, movement) => sum + Math.abs(movement.quantity), 0) || 0;
      const averageRotation = totalValue > 0 ? (totalOutbound * 12) / totalValue : 0; // Anualizado

      // Calcular precisión de inventario (simplificado al 98.7% por ahora)
      const inventoryAccuracy = 98.7;

      setMetrics({
        totalProducts,
        totalValue,
        lowStockCount,
        obsoleteCount,
        averageRotation,
        inventoryAccuracy
      });

    } catch (err) {
      console.error('Error fetching inventory metrics:', err);
      setError('Error al cargar las métricas de inventario');
      
      // Usar datos de ejemplo en caso de error
      setMetrics({
        totalProducts: 12847,
        totalValue: 2400000,
        lowStockCount: 23,
        obsoleteCount: 156,
        averageRotation: 4.2,
        inventoryAccuracy: 98.7
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryMetrics();
  }, []);

  useEffect(() => {
    const fetchDistinctProducts = async () => {
      try {
        setLoadingDistinct(true);
        const backendUrl = import.meta.env.VITE_AUTH_BACKEND_URL || '';
        const token = localStorage.getItem('app_token');

        if (backendUrl && token) {
          const resp = await fetch(`${backendUrl}/products/count`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          if (resp.ok) {
            const data = await resp.json();
            setDistinctProductsCount(Number(data.productsCount || 0));
          } else {
            // Fallback a supabase si backend no disponible
            const { data, error } = await supabase
              .from('products')
              .select('id', { count: 'exact', head: true })
              .eq('is_active', true);
            if (!error) setDistinctProductsCount((data as any)?.length || 0);
          }
        } else {
          // Fallback: contar productos activos vía supabase
          const { data, error } = await supabase
            .from('products')
            .select('id')
            .eq('is_active', true);
          if (!error) setDistinctProductsCount(data?.length || 0);
        }
      } catch (e) {
        // En caso de error, mantener en 0 sin romper UI
        console.warn('No se pudo obtener conteo de productos distintos');
      } finally {
        setLoadingDistinct(false);
      }
    };
    fetchDistinctProducts();
  }, []);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `€${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `€${(value / 1000).toFixed(0)}K`;
    }
    return `€${value.toFixed(0)}`;
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-ES').format(Math.round(value));
  };

  const stats = [
    {
      title: 'Productos diferentes',
      value: loadingDistinct ? 'Cargando...' : formatNumber(distinctProductsCount),
      change: '',
      changeType: 'neutral' as const,
      icon: Package,
      color: 'bg-blue-600'
    },
    {
      title: 'Total Productos',
      value: loading ? 'Cargando...' : formatNumber(metrics.totalProducts),
      change: '+2.5% vs mes anterior',
      changeType: 'increase' as const,
      icon: Package,
      color: 'bg-blue-500'
    },
    {
      title: 'Valor Inventario',
      value: loading ? 'Cargando...' : formatCurrency(metrics.totalValue),
      change: '+8.2% vs mes anterior',
      changeType: 'increase' as const,
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      title: 'Rotación Stock',
      value: loading ? 'Cargando...' : `${metrics.averageRotation.toFixed(1)}x`,
      change: '+0.3x vs mes anterior',
      changeType: 'increase' as const,
      icon: BarChart3,
      color: 'bg-purple-500'
    },
    {
      title: 'Precisión Inventario',
      value: loading ? 'Cargando...' : `${metrics.inventoryAccuracy.toFixed(1)}%`,
      change: '+0.5% vs mes anterior',
      changeType: 'increase' as const,
      icon: TrendingUp,
      color: 'bg-emerald-500'
    },
    {
      title: 'Stock Bajo Mínimo',
      value: loading ? 'Cargando...' : formatNumber(metrics.lowStockCount),
      change: '-5 vs semana anterior',
      changeType: 'decrease' as const,
      icon: AlertTriangle,
      color: 'bg-orange-500'
    },
    {
      title: 'Productos Obsoletos',
      value: loading ? 'Cargando...' : formatNumber(metrics.obsoleteCount),
      change: '+12 vs mes anterior',
      changeType: 'increase' as const,
      icon: Package,
      color: 'bg-red-500'
    }
  ];

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}