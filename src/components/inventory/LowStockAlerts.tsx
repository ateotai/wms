import React, { useState } from 'react';
import { AlertTriangle, Clock, Package, MapPin, Calendar, TrendingDown, RefreshCw } from 'lucide-react';

interface StockAlert {
  id: string;
  sku: string;
  productName: string;
  currentStock: number;
  minStock: number;
  reorderPoint: number;
  location: string;
  category: string;
  lastMovement: Date;
  expiryDate?: Date;
  alertType: 'low_stock' | 'critical_stock' | 'expiry_soon' | 'expired';
  daysUntilExpiry?: number;
}

export function LowStockAlerts() {
  const [filterType, setFilterType] = useState<'all' | 'low_stock' | 'critical_stock' | 'expiry_soon' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'stock' | 'expiry'>('priority');

  // Mock data - in real app this would come from API
  const mockAlerts: StockAlert[] = [
    {
      id: '1',
      sku: 'SKU-002',
      productName: 'Camiseta Algodón Básica',
      currentStock: 45,
      minStock: 100,
      reorderPoint: 150,
      location: 'B-02-15',
      category: 'clothing',
      lastMovement: new Date('2024-01-14'),
      alertType: 'critical_stock'
    },
    {
      id: '2',
      sku: 'SKU-003',
      productName: 'Yogur Natural Ecológico',
      currentStock: 89,
      minStock: 200,
      reorderPoint: 300,
      location: 'C-01-08',
      category: 'food',
      lastMovement: new Date('2024-01-16'),
      expiryDate: new Date('2024-02-15'),
      alertType: 'expiry_soon',
      daysUntilExpiry: 30
    },
    {
      id: '3',
      sku: 'SKU-004',
      productName: 'Leche Desnatada 1L',
      currentStock: 12,
      minStock: 50,
      reorderPoint: 75,
      location: 'C-01-12',
      category: 'food',
      lastMovement: new Date('2024-01-15'),
      expiryDate: new Date('2024-01-20'),
      alertType: 'expiry_soon',
      daysUntilExpiry: 4
    },
    {
      id: '4',
      sku: 'SKU-005',
      productName: 'Auriculares Bluetooth',
      currentStock: 8,
      minStock: 25,
      reorderPoint: 40,
      location: 'A-03-07',
      category: 'electronics',
      lastMovement: new Date('2024-01-13'),
      alertType: 'critical_stock'
    },
    {
      id: '5',
      sku: 'SKU-006',
      productName: 'Pan Integral',
      currentStock: 5,
      minStock: 30,
      reorderPoint: 50,
      location: 'C-02-01',
      category: 'food',
      lastMovement: new Date('2024-01-12'),
      expiryDate: new Date('2024-01-18'),
      alertType: 'expired',
      daysUntilExpiry: -2
    }
  ];

  const filteredAlerts = mockAlerts.filter(alert => {
    if (filterType === 'all') return true;
    return alert.alertType === filterType;
  });

  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        const priorityOrder = { 'expired': 0, 'critical_stock': 1, 'expiry_soon': 2, 'low_stock': 3 };
        return priorityOrder[a.alertType] - priorityOrder[b.alertType];
      case 'stock':
        return (a.currentStock / a.minStock) - (b.currentStock / b.minStock);
      case 'expiry':
        if (!a.daysUntilExpiry && !b.daysUntilExpiry) return 0;
        if (!a.daysUntilExpiry) return 1;
        if (!b.daysUntilExpiry) return -1;
        return a.daysUntilExpiry - b.daysUntilExpiry;
      default:
        return 0;
    }
  });

  const getAlertIcon = (alertType: StockAlert['alertType']) => {
    switch (alertType) {
      case 'expired':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'critical_stock':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      case 'expiry_soon':
        return <Clock className="w-5 h-5 text-orange-600" />;
      case 'low_stock':
        return <Package className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getAlertColor = (alertType: StockAlert['alertType']) => {
    switch (alertType) {
      case 'expired':
        return 'bg-red-50 border-red-200';
      case 'critical_stock':
        return 'bg-red-50 border-red-200';
      case 'expiry_soon':
        return 'bg-orange-50 border-orange-200';
      case 'low_stock':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getAlertLabel = (alertType: StockAlert['alertType']) => {
    switch (alertType) {
      case 'expired':
        return 'Caducado';
      case 'critical_stock':
        return 'Stock Crítico';
      case 'expiry_soon':
        return 'Próximo a Caducar';
      case 'low_stock':
        return 'Stock Bajo';
      default:
        return 'Alerta';
    }
  };

  const getStockPercentage = (current: number, min: number) => {
    return Math.round((current / min) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">Críticos</p>
              <p className="text-2xl font-bold text-red-900">
                {mockAlerts.filter(a => a.alertType === 'critical_stock' || a.alertType === 'expired').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-orange-800">Próximos a Caducar</p>
              <p className="text-2xl font-bold text-orange-900">
                {mockAlerts.filter(a => a.alertType === 'expiry_soon').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-800">Stock Bajo</p>
              <p className="text-2xl font-bold text-yellow-900">
                {mockAlerts.filter(a => a.alertType === 'low_stock').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <RefreshCw className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-800">Total Alertas</p>
              <p className="text-2xl font-bold text-blue-900">{mockAlerts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Filtrar:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">Todas las alertas</option>
              <option value="expired">Caducados</option>
              <option value="critical_stock">Stock crítico</option>
              <option value="expiry_soon">Próximos a caducar</option>
              <option value="low_stock">Stock bajo</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="priority">Por prioridad</option>
              <option value="stock">Por nivel de stock</option>
              <option value="expiry">Por fecha de caducidad</option>
            </select>
          </div>
        </div>

        <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar Alertas
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {sortedAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-lg border p-4 ${getAlertColor(alert.alertType)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {getAlertIcon(alert.alertType)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      {alert.productName}
                    </h4>
                    <span className="text-xs text-gray-500">({alert.sku})</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      alert.alertType === 'expired' || alert.alertType === 'critical_stock'
                        ? 'bg-red-100 text-red-800'
                        : alert.alertType === 'expiry_soon'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {getAlertLabel(alert.alertType)}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-600 mb-2">
                    <div className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {alert.location}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      Último mov: {alert.lastMovement.toLocaleDateString('es-ES')}
                    </div>
                    {alert.expiryDate && (
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        Caduca: {alert.expiryDate.toLocaleDateString('es-ES')}
                      </div>
                    )}
                  </div>

                  {/* Stock Level Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        alert.currentStock <= alert.reorderPoint
                          ? 'bg-red-500'
                          : alert.currentStock <= alert.minStock
                          ? 'bg-orange-500'
                          : 'bg-green-500'
                      }`}
                      style={{
                        width: `${Math.min(getStockPercentage(alert.currentStock, alert.minStock), 100)}%`
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Stock actual: {alert.currentStock}</span>
                    <span>Mínimo: {alert.minStock}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  {alert.currentStock}
                </div>
                <div className="text-xs text-gray-500">unidades</div>
                {alert.daysUntilExpiry !== undefined && (
                  <div className={`text-xs font-medium mt-1 ${
                    alert.daysUntilExpiry < 0
                      ? 'text-red-600'
                      : alert.daysUntilExpiry <= 7
                      ? 'text-orange-600'
                      : 'text-yellow-600'
                  }`}>
                    {alert.daysUntilExpiry < 0
                      ? `Caducado hace ${Math.abs(alert.daysUntilExpiry)} días`
                      : `${alert.daysUntilExpiry} días restantes`
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {sortedAlerts.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay alertas</h3>
          <p className="mt-1 text-sm text-gray-500">
            No se encontraron alertas para los filtros seleccionados.
          </p>
        </div>
      )}
    </div>
  );
}