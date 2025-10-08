import React, { useState } from 'react';
import { 
  Activity, 
  Clock, 
  Users, 
  Package, 
  Truck, 
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Download,
  RefreshCw,
  Filter,
  Search,
  Eye,
  ArrowUp,
  ArrowDown,
  Minus,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export function OperationalReports() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedOperation, setSelectedOperation] = useState('picking');
  const [selectedShift, setSelectedShift] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const operationTypes = [
    { id: 'picking', name: 'Picking', icon: Package },
    { id: 'packing', name: 'Packing', icon: Package },
    { id: 'shipping', name: 'Envíos', icon: Truck },
    { id: 'receiving', name: 'Recepción', icon: Activity }
  ];

  const shifts = [
    { id: 'all', name: 'Todos los Turnos' },
    { id: 'morning', name: 'Mañana (06:00-14:00)' },
    { id: 'afternoon', name: 'Tarde (14:00-22:00)' },
    { id: 'night', name: 'Noche (22:00-06:00)' }
  ];

  // Mock operational stats
  const operationalStats = [
    {
      title: 'Órdenes Procesadas',
      value: '1,247',
      change: 12.5,
      trend: 'up',
      icon: Package,
      color: 'blue'
    },
    {
      title: 'Tiempo Promedio',
      value: '4.2 min',
      change: -8.3,
      trend: 'down',
      icon: Clock,
      color: 'green'
    },
    {
      title: 'Precisión',
      value: '99.2%',
      change: 0.8,
      trend: 'up',
      icon: Target,
      color: 'purple'
    },
    {
      title: 'Productividad',
      value: '45 ord/h',
      change: 15.2,
      trend: 'up',
      icon: TrendingUp,
      color: 'orange'
    }
  ];

  // Mock picking performance data
  const pickingPerformance = [
    {
      operator: 'Juan Pérez',
      shift: 'morning',
      ordersCompleted: 85,
      averageTime: 3.8,
      accuracy: 99.5,
      productivity: 52,
      errors: 1,
      status: 'excellent'
    },
    {
      operator: 'María García',
      shift: 'morning',
      ordersCompleted: 78,
      averageTime: 4.2,
      accuracy: 98.8,
      productivity: 48,
      errors: 2,
      status: 'good'
    },
    {
      operator: 'Carlos López',
      shift: 'afternoon',
      ordersCompleted: 72,
      averageTime: 4.8,
      accuracy: 97.2,
      productivity: 42,
      errors: 4,
      status: 'average'
    },
    {
      operator: 'Ana Martín',
      shift: 'afternoon',
      ordersCompleted: 68,
      averageTime: 5.2,
      accuracy: 96.5,
      productivity: 38,
      errors: 6,
      status: 'needs_improvement'
    }
  ];

  // Mock packing performance data
  const packingPerformance = [
    {
      operator: 'Luis Rodríguez',
      shift: 'morning',
      packagesCompleted: 120,
      averageTime: 2.5,
      accuracy: 99.8,
      productivity: 65,
      errors: 0,
      status: 'excellent'
    },
    {
      operator: 'Carmen Ruiz',
      shift: 'morning',
      packagesCompleted: 115,
      averageTime: 2.8,
      accuracy: 99.2,
      productivity: 62,
      errors: 1,
      status: 'excellent'
    },
    {
      operator: 'Pedro Sánchez',
      shift: 'afternoon',
      packagesCompleted: 98,
      averageTime: 3.2,
      accuracy: 98.5,
      productivity: 55,
      errors: 2,
      status: 'good'
    }
  ];

  // Mock shipping performance data
  const shippingPerformance = [
    {
      carrier: 'Express Delivery',
      shipmentsToday: 145,
      onTimeDelivery: 98.5,
      averageDeliveryTime: 1.2,
      cost: 8.50,
      customerSatisfaction: 4.8,
      status: 'excellent'
    },
    {
      carrier: 'Standard Shipping',
      shipmentsToday: 89,
      onTimeDelivery: 95.2,
      averageDeliveryTime: 2.8,
      cost: 5.25,
      customerSatisfaction: 4.5,
      status: 'good'
    },
    {
      carrier: 'Economy Post',
      shipmentsToday: 67,
      onTimeDelivery: 92.1,
      averageDeliveryTime: 4.5,
      cost: 3.75,
      customerSatisfaction: 4.2,
      status: 'average'
    }
  ];

  const getPerformanceStatus = (status: string) => {
    switch (status) {
      case 'excellent': return { color: 'green', text: 'Excelente' };
      case 'good': return { color: 'blue', text: 'Bueno' };
      case 'average': return { color: 'yellow', text: 'Promedio' };
      case 'needs_improvement': return { color: 'red', text: 'Necesita Mejora' };
      default: return { color: 'gray', text: 'Sin Datos' };
    }
  };

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reportes Operacionales</h2>
          <p className="text-gray-600">Análisis de rendimiento de picking, packing y envíos</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {operationalStats.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = getTrendIcon(stat.trend);
          const trendColor = getTrendColor(stat.trend, stat.change);
          
          return (
            <div key={index} className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                <span className={`text-sm font-medium ml-1 ${trendColor}`}>
                  {Math.abs(stat.change)}%
                </span>
                <span className="text-sm text-gray-500 ml-2">vs período anterior</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Operation Type Tabs */}
      <div className="bg-white rounded-lg shadow border">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {operationTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedOperation(type.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    selectedOperation === type.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {type.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar operadores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {shifts.map(shift => (
                  <option key={shift.id} value={shift.id}>{shift.name}</option>
                ))}
              </select>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="day">Hoy</option>
                <option value="week">Esta Semana</option>
                <option value="month">Este Mes</option>
                <option value="quarter">Este Trimestre</option>
              </select>
            </div>
            <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4 mr-2" />
              Filtros Avanzados
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="p-6">
          {selectedOperation === 'picking' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Turno
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Órdenes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tiempo Promedio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precisión
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Productividad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Errores
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pickingPerformance.map((operator, index) => {
                    const status = getPerformanceStatus(operator.status);
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {operator.operator}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {operator.shift === 'morning' ? 'Mañana' : operator.shift === 'afternoon' ? 'Tarde' : 'Noche'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {operator.ordersCompleted}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {operator.averageTime} min
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {operator.accuracy}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {operator.productivity} ord/h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {operator.errors}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${status.color}-100 text-${status.color}-800`}>
                            {status.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {selectedOperation === 'packing' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Turno
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paquetes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tiempo Promedio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precisión
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Productividad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Errores
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {packingPerformance.map((operator, index) => {
                    const status = getPerformanceStatus(operator.status);
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {operator.operator}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {operator.shift === 'morning' ? 'Mañana' : operator.shift === 'afternoon' ? 'Tarde' : 'Noche'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {operator.packagesCompleted}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {operator.averageTime} min
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {operator.accuracy}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {operator.productivity} paq/h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {operator.errors}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${status.color}-100 text-${status.color}-800`}>
                            {status.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {selectedOperation === 'shipping' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transportista
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Envíos Hoy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entrega a Tiempo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tiempo Promedio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Costo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Satisfacción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {shippingPerformance.map((carrier, index) => {
                    const status = getPerformanceStatus(carrier.status);
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {carrier.carrier}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {carrier.shipmentsToday}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {carrier.onTimeDelivery}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {carrier.averageDeliveryTime} días
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(carrier.cost)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {carrier.customerSatisfaction}/5.0
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${status.color}-100 text-${status.color}-800`}>
                            {status.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}