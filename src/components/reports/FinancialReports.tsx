import { useState } from 'react';
import { formatCurrency } from '../../utils/currency';
import { 
  DollarSign, 
  Calculator,
  Target,
  Download,
  RefreshCw,
  Filter,
  ArrowUp,
  ArrowDown,
  Minus,
  Package,
  Truck,
  Users,
  Building,
  CreditCard,
  Percent
} from 'lucide-react';

export function FinancialReports() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedView, setSelectedView] = useState('summary');

  const categories = [
    { id: 'all', name: 'Todas las Categorías' },
    { id: 'inventory', name: 'Inventario' },
    { id: 'operations', name: 'Operaciones' },
    { id: 'shipping', name: 'Envíos' },
    { id: 'labor', name: 'Mano de Obra' },
    { id: 'facilities', name: 'Instalaciones' }
  ];

  const views = [
    { id: 'summary', name: 'Resumen' },
    { id: 'detailed', name: 'Detallado' },
    { id: 'trends', name: 'Tendencias' },
    { id: 'comparison', name: 'Comparación' }
  ];

  // Mock financial metrics
  const financialMetrics = [
    {
      title: 'Ingresos Totales',
      value: formatCurrency(245680),
      change: 12.5,
      trend: 'up',
      icon: DollarSign,
      color: 'green',
      description: 'vs período anterior'
    },
    {
      title: 'Costos Operacionales',
      value: formatCurrency(89420),
      change: -5.2,
      trend: 'down',
      icon: Calculator,
      color: 'blue',
      description: 'reducción de costos'
    },
    {
      title: 'Margen de Beneficio',
      value: '63.6%',
      change: 8.3,
      trend: 'up',
      icon: Percent,
      color: 'purple',
      description: 'mejora en eficiencia'
    },
    {
      title: 'ROI Almacén',
      value: '24.8%',
      change: 3.1,
      trend: 'up',
      icon: Target,
      color: 'orange',
      description: 'retorno de inversión'
    }
  ];

  // Mock cost breakdown data
  const costBreakdown = [
    {
      category: 'Mano de Obra',
      amount: 35420,
      percentage: 39.6,
      change: 2.1,
      trend: 'up',
      icon: Users,
      color: 'blue'
    },
    {
      category: 'Inventario',
      amount: 28650,
      percentage: 32.0,
      change: -3.5,
      trend: 'down',
      icon: Package,
      color: 'green'
    },
    {
      category: 'Transporte',
      amount: 15230,
      percentage: 17.0,
      change: 1.8,
      trend: 'up',
      icon: Truck,
      color: 'orange'
    },
    {
      category: 'Instalaciones',
      amount: 7890,
      percentage: 8.8,
      change: -1.2,
      trend: 'down',
      icon: Building,
      color: 'purple'
    },
    {
      category: 'Otros',
      amount: 2230,
      percentage: 2.5,
      change: 0.5,
      trend: 'up',
      icon: CreditCard,
      color: 'gray'
    }
  ];

  // Mock revenue analysis data
  const revenueAnalysis = [
    {
      source: 'Ventas Online',
      revenue: 145680,
      percentage: 59.3,
      orders: 1247,
      avgOrderValue: 116.85,
      growth: 15.2
    },
    {
      source: 'Ventas B2B',
      revenue: 78450,
      percentage: 31.9,
      orders: 89,
      avgOrderValue: 881.46,
      growth: 8.7
    },
    {
      source: 'Marketplace',
      revenue: 21550,
      percentage: 8.8,
      orders: 456,
      avgOrderValue: 47.26,
      growth: 22.1
    }
  ];

  // Mock profitability analysis
  const profitabilityAnalysis = [
    {
      product: 'Electrónicos',
      revenue: 89420,
      cost: 52650,
      profit: 36770,
      margin: 41.1,
      units: 245,
      profitPerUnit: 150.08
    },
    {
      product: 'Ropa y Accesorios',
      revenue: 67890,
      cost: 38920,
      profit: 28970,
      margin: 42.7,
      units: 1247,
      profitPerUnit: 23.23
    },
    {
      product: 'Hogar y Jardín',
      revenue: 45230,
      cost: 28450,
      profit: 16780,
      margin: 37.1,
      units: 189,
      profitPerUnit: 88.78
    },
    {
      product: 'Deportes',
      revenue: 32140,
      cost: 19680,
      profit: 12460,
      margin: 38.8,
      units: 156,
      profitPerUnit: 79.87
    },
    {
      product: 'Libros',
      revenue: 11000,
      cost: 7850,
      profit: 3150,
      margin: 28.6,
      units: 567,
      profitPerUnit: 5.56
    }
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return ArrowUp;
      case 'down': return ArrowDown;
      default: return Minus;
    }
  };

  const getTrendColor = (trend: string, change: number) => {
    if (trend === 'up' && change > 0) return 'text-green-600';
    if (trend === 'down' && change < 0) return 'text-green-600';
    if (trend === 'up' && change < 0) return 'text-red-600';
    if (trend === 'down' && change > 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Usar utilidad global para formateo de moneda

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reportes Financieros</h2>
          <p className="text-gray-600">Análisis de costos, ingresos y rentabilidad</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {financialMetrics.map((metric, index) => {
          const Icon = metric.icon;
          const TrendIcon = getTrendIcon(metric.trend);
          const trendColor = getTrendColor(metric.trend, metric.change);
          
          return (
            <div key={index} className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                </div>
                <div className={`p-3 rounded-full bg-${metric.color}-100`}>
                  <Icon className={`w-6 h-6 text-${metric.color}-600`} />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                <span className={`text-sm font-medium ml-1 ${trendColor}`}>
                  {Math.abs(metric.change)}%
                </span>
                <span className="text-sm text-gray-500 ml-2">{metric.description}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center space-x-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="day">Hoy</option>
              <option value="week">Esta Semana</option>
              <option value="month">Este Mes</option>
              <option value="quarter">Este Trimestre</option>
              <option value="year">Este Año</option>
            </select>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <select
              value={selectedView}
              onChange={(e) => setSelectedView(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {views.map(view => (
                <option key={view.id} value={view.id}>{view.name}</option>
              ))}
            </select>
          </div>
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter className="w-4 h-4 mr-2" />
            Filtros Avanzados
          </button>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Desglose de Costos</h3>
          <p className="text-gray-600">Distribución de gastos operacionales</p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {costBreakdown.map((cost, index) => {
              const Icon = cost.icon;
              const TrendIcon = getTrendIcon(cost.trend);
              const trendColor = getTrendColor(cost.trend, cost.change);
              
              return (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg bg-${cost.color}-100`}>
                      <Icon className={`w-5 h-5 text-${cost.color}-600`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{cost.category}</p>
                      <p className="text-sm text-gray-600">{formatPercentage(cost.percentage)} del total</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(cost.amount)}</p>
                    <div className="flex items-center justify-end">
                      <TrendIcon className={`w-3 h-3 ${trendColor}`} />
                      <span className={`text-xs ml-1 ${trendColor}`}>
                        {Math.abs(cost.change)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Revenue Analysis */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Análisis de Ingresos</h3>
          <p className="text-gray-600">Fuentes de ingresos y rendimiento</p>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fuente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ingresos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Órdenes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Promedio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Crecimiento
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {revenueAnalysis.map((source, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {source.source}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(source.revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPercentage(source.percentage)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {source.orders.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(source.avgOrderValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ArrowUp className="w-3 h-3 text-green-600 mr-1" />
                        <span className="text-sm text-green-600 font-medium">
                          {formatPercentage(source.growth)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Profitability Analysis */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Análisis de Rentabilidad</h3>
          <p className="text-gray-600">Rentabilidad por categoría de producto</p>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ingresos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Costos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Beneficio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Margen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unidades
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Beneficio/Unidad
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {profitabilityAnalysis.map((product, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.product}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(product.revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(product.cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(product.profit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        product.margin > 40 ? 'bg-green-100 text-green-800' :
                        product.margin > 30 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {formatPercentage(product.margin)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.units.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(product.profitPerUnit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
