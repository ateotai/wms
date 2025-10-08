import React, { useState } from 'react';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Clock, 
  BarChart3,
  Download,
  RefreshCw,
  Filter,
  Search,
  Eye,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';

export function InventoryReports() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedWarehouse, setSelectedWarehouse] = useState('all');
  const [selectedReport, setSelectedReport] = useState('levels');
  const [searchTerm, setSearchTerm] = useState('');

  const reportTypes = [
    { id: 'levels', name: 'Niveles de Stock', icon: Package },
    { id: 'movements', name: 'Movimientos', icon: TrendingUp },
    { id: 'aging', name: 'Antigüedad', icon: Clock },
    { id: 'alerts', name: 'Alertas', icon: AlertTriangle }
  ];

  const warehouses = [
    { id: 'all', name: 'Todos los Almacenes' },
    { id: 'main', name: 'Almacén Principal' },
    { id: 'secondary', name: 'Almacén Secundario' },
    { id: 'returns', name: 'Almacén de Devoluciones' }
  ];

  // Mock inventory data
  const inventoryStats = [
    {
      title: 'Valor Total Inventario',
      value: '€2,450,000',
      change: 5.2,
      trend: 'up',
      icon: Package,
      color: 'blue'
    },
    {
      title: 'Productos en Stock',
      value: '12,847',
      change: -2.1,
      trend: 'down',
      icon: Package,
      color: 'green'
    },
    {
      title: 'Rotación Promedio',
      value: '8.5x',
      change: 12.3,
      trend: 'up',
      icon: TrendingUp,
      color: 'purple'
    },
    {
      title: 'Stock Crítico',
      value: '23',
      change: -15.2,
      trend: 'down',
      icon: AlertTriangle,
      color: 'red'
    }
  ];

  const stockLevels = [
    {
      id: 'PROD001',
      name: 'Smartphone Premium X1',
      category: 'Electrónicos',
      currentStock: 45,
      minStock: 20,
      maxStock: 100,
      reservedStock: 8,
      availableStock: 37,
      value: 125000,
      location: 'A-01-15',
      status: 'normal'
    },
    {
      id: 'PROD002',
      name: 'Laptop Gaming Pro',
      category: 'Electrónicos',
      currentStock: 12,
      minStock: 15,
      maxStock: 50,
      reservedStock: 3,
      availableStock: 9,
      value: 42000,
      location: 'A-02-08',
      status: 'low'
    },
    {
      id: 'PROD003',
      name: 'Auriculares Bluetooth',
      category: 'Electrónicos',
      currentStock: 180,
      minStock: 50,
      maxStock: 200,
      reservedStock: 25,
      availableStock: 155,
      value: 45000,
      location: 'B-01-22',
      status: 'normal'
    },
    {
      id: 'PROD004',
      name: 'Camiseta Deportiva',
      category: 'Ropa',
      currentStock: 5,
      minStock: 25,
      maxStock: 150,
      reservedStock: 2,
      availableStock: 3,
      value: 500,
      location: 'C-03-12',
      status: 'critical'
    }
  ];

  const movements = [
    {
      date: '2024-01-15',
      product: 'Smartphone Premium X1',
      type: 'entrada',
      quantity: 50,
      reason: 'Recepción de compra',
      reference: 'PO-2024-001',
      user: 'Juan Pérez'
    },
    {
      date: '2024-01-15',
      product: 'Laptop Gaming Pro',
      type: 'salida',
      quantity: -8,
      reason: 'Venta',
      reference: 'SO-2024-045',
      user: 'María García'
    },
    {
      date: '2024-01-14',
      product: 'Auriculares Bluetooth',
      type: 'ajuste',
      quantity: -2,
      reason: 'Ajuste por inventario',
      reference: 'ADJ-2024-003',
      user: 'Carlos López'
    },
    {
      date: '2024-01-14',
      product: 'Camiseta Deportiva',
      type: 'salida',
      quantity: -15,
      reason: 'Venta',
      reference: 'SO-2024-044',
      user: 'Ana Martín'
    }
  ];

  const agingData = [
    {
      product: 'Smartphone Premium X1',
      totalStock: 45,
      age0to30: 35,
      age31to60: 8,
      age61to90: 2,
      age90plus: 0,
      avgAge: 18,
      riskLevel: 'low'
    },
    {
      product: 'Laptop Gaming Pro',
      totalStock: 12,
      age0to30: 5,
      age31to60: 4,
      age61to90: 2,
      age90plus: 1,
      avgAge: 45,
      riskLevel: 'medium'
    },
    {
      product: 'Auriculares Bluetooth',
      totalStock: 180,
      age0to30: 150,
      age31to60: 25,
      age61to90: 5,
      age90plus: 0,
      avgAge: 12,
      riskLevel: 'low'
    },
    {
      product: 'Camiseta Deportiva',
      totalStock: 5,
      age0to30: 0,
      age31to60: 2,
      age61to90: 2,
      age90plus: 1,
      avgAge: 75,
      riskLevel: 'high'
    }
  ];

  const getStockStatus = (current: number, min: number, max: number) => {
    if (current <= min * 0.5) return { status: 'critical', color: 'red', text: 'Crítico' };
    if (current <= min) return { status: 'low', color: 'yellow', text: 'Bajo' };
    if (current >= max * 0.9) return { status: 'high', color: 'blue', text: 'Alto' };
    return { status: 'normal', color: 'green', text: 'Normal' };
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'entrada': return 'text-green-600 bg-green-100';
      case 'salida': return 'text-red-600 bg-red-100';
      case 'ajuste': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reportes de Inventario</h2>
          <p className="text-gray-600">Análisis detallado de stock, movimientos y antigüedad</p>
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
        {inventoryStats.map((stat, index) => {
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
                <span className="text-sm text-gray-500 ml-2">vs mes anterior</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Report Type Tabs */}
      <div className="bg-white rounded-lg shadow border">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {reportTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedReport(type.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    selectedReport === type.id
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
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
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
          {selectedReport === 'levels' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Actual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Disponible
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Min/Max
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stockLevels.map((item) => {
                    const stockStatus = getStockStatus(item.currentStock, item.minStock, item.maxStock);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-500">{item.id} - {item.location}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.currentStock}</div>
                          <div className="text-sm text-gray-500">Reservado: {item.reservedStock}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.availableStock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.minStock} / {item.maxStock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.value)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${stockStatus.color}-100 text-${stockStatus.color}-800`}>
                            {stockStatus.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-900">
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {selectedReport === 'movements' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Motivo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movements.map((movement, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {movement.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {movement.product}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getMovementColor(movement.type)}`}>
                          {movement.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {movement.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{movement.reason}</div>
                        <div className="text-sm text-gray-500">{movement.reference}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {movement.user}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedReport === 'aging' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      0-30 días
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      31-60 días
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      61-90 días
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      +90 días
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Edad Promedio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Riesgo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {agingData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.product}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.totalStock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.age0to30}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.age31to60}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.age61to90}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.age90plus}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.avgAge} días
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(item.riskLevel)}`}>
                          {item.riskLevel === 'low' ? 'Bajo' : item.riskLevel === 'medium' ? 'Medio' : 'Alto'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}