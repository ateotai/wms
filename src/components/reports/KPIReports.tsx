import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  DollarSign, 
  Users, 
  Clock, 
  Target,
  Download,
  RefreshCw,
  Filter,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';

export function KPIReports() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Mock KPI data
  const kpiCategories = [
    { id: 'all', name: 'Todos los KPIs' },
    { id: 'inventory', name: 'Inventario' },
    { id: 'operations', name: 'Operaciones' },
    { id: 'financial', name: 'Financiero' },
    { id: 'quality', name: 'Calidad' }
  ];

  const kpiData = [
    {
      category: 'inventory',
      title: 'Rotación de Inventario',
      value: '8.5',
      unit: 'veces/año',
      change: 12.5,
      trend: 'up',
      target: 10,
      description: 'Número de veces que se renueva el inventario por año',
      icon: Package,
      color: 'blue'
    },
    {
      category: 'inventory',
      title: 'Precisión de Inventario',
      value: '99.2',
      unit: '%',
      change: 0.8,
      trend: 'up',
      target: 99.5,
      description: 'Exactitud entre inventario físico y sistema',
      icon: Target,
      color: 'green'
    },
    {
      category: 'operations',
      title: 'Tiempo Promedio de Picking',
      value: '4.2',
      unit: 'min/orden',
      change: -8.3,
      trend: 'down',
      target: 4.0,
      description: 'Tiempo promedio para completar una orden de picking',
      icon: Clock,
      color: 'purple'
    },
    {
      category: 'operations',
      title: 'Precisión de Picking',
      value: '99.7',
      unit: '%',
      change: 0.3,
      trend: 'up',
      target: 99.8,
      description: 'Porcentaje de órdenes de picking sin errores',
      icon: Target,
      color: 'green'
    },
    {
      category: 'operations',
      title: 'Órdenes Procesadas/Hora',
      value: '45',
      unit: 'órdenes/h',
      change: 15.2,
      trend: 'up',
      target: 50,
      description: 'Productividad promedio del equipo de picking',
      icon: TrendingUp,
      color: 'blue'
    },
    {
      category: 'financial',
      title: 'Costo por Orden',
      value: '$12.45',
      unit: '',
      change: -6.8,
      trend: 'down',
      target: 12.0,
      description: 'Costo operativo promedio por orden procesada',
      icon: DollarSign,
      color: 'orange'
    },
    {
      category: 'financial',
      title: 'Costo de Almacenamiento',
      value: '$2.15',
      unit: '/m²/mes',
      change: 2.1,
      trend: 'up',
      target: 2.0,
      description: 'Costo mensual por metro cuadrado de almacenamiento',
      icon: DollarSign,
      color: 'red'
    },
    {
      category: 'quality',
      title: 'Devoluciones',
      value: '0.8',
      unit: '%',
      change: -15.2,
      trend: 'down',
      target: 0.5,
      description: 'Porcentaje de órdenes devueltas por errores',
      icon: TrendingDown,
      color: 'red'
    },
    {
      category: 'quality',
      title: 'Satisfacción del Cliente',
      value: '4.7',
      unit: '/5.0',
      change: 4.2,
      trend: 'up',
      target: 4.8,
      description: 'Calificación promedio de satisfacción del cliente',
      icon: Users,
      color: 'green'
    }
  ];

  const filteredKPIs = selectedCategory === 'all' 
    ? kpiData 
    : kpiData.filter(kpi => kpi.category === selectedCategory);

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

  const getTargetStatus = (value: number, target: number, trend: string) => {
    const percentage = (value / target) * 100;
    if (trend === 'up') {
      return percentage >= 100 ? 'Objetivo alcanzado' : `${(100 - percentage).toFixed(1)}% para objetivo`;
    } else {
      return percentage <= 100 ? 'Objetivo alcanzado' : `${(percentage - 100).toFixed(1)}% sobre objetivo`;
    }
  };

  const getProgressColor = (value: number, target: number, trend: string) => {
    const percentage = (value / target) * 100;
    if (trend === 'up') {
      return percentage >= 100 ? 'bg-green-500' : percentage >= 80 ? 'bg-yellow-500' : 'bg-red-500';
    } else {
      return percentage <= 100 ? 'bg-green-500' : percentage <= 120 ? 'bg-yellow-500' : 'bg-red-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Indicadores Clave de Rendimiento (KPIs)</h2>
          <p className="text-gray-600">Métricas principales para evaluar el rendimiento operativo</p>
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg shadow border">
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
            {kpiCategories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
        <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <Filter className="w-4 h-4 mr-2" />
          Filtros Avanzados
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredKPIs.map((kpi, index) => {
          const Icon = kpi.icon;
          const TrendIcon = getTrendIcon(kpi.trend);
          const trendColor = getTrendColor(kpi.trend, kpi.change);
          const progressColor = getProgressColor(parseFloat(kpi.value), kpi.target, kpi.trend);
          const targetStatus = getTargetStatus(parseFloat(kpi.value), kpi.target, kpi.trend);
          
          return (
            <div key={index} className="bg-white p-6 rounded-lg shadow border hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg bg-${kpi.color}-100`}>
                      <Icon className={`w-5 h-5 text-${kpi.color}-600`} />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-gray-900">{kpi.title}</h3>
                      <p className="text-xs text-gray-500">{kpi.description}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-baseline">
                      <span className="text-2xl font-bold text-gray-900">{kpi.value}</span>
                      <span className="text-sm text-gray-500 ml-1">{kpi.unit}</span>
                    </div>
                    
                    <div className="flex items-center mt-2">
                      <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                      <span className={`text-sm font-medium ml-1 ${trendColor}`}>
                        {Math.abs(kpi.change)}%
                      </span>
                      <span className="text-sm text-gray-500 ml-2">vs período anterior</span>
                    </div>
                  </div>

                  {/* Progress to Target */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Objetivo: {kpi.target}{kpi.unit}</span>
                      <span>{targetStatus}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${progressColor}`}
                        style={{ 
                          width: `${Math.min(100, (parseFloat(kpi.value) / kpi.target) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Section */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Resumen de Rendimiento</h3>
          <p className="text-sm text-gray-600">Análisis general de los KPIs principales</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="mt-2 text-lg font-semibold text-gray-900">6</h4>
              <p className="text-sm text-gray-600">KPIs Mejorando</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full">
                <Minus className="w-6 h-6 text-yellow-600" />
              </div>
              <h4 className="mt-2 text-lg font-semibold text-gray-900">2</h4>
              <p className="text-sm text-gray-600">KPIs Estables</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
              <h4 className="mt-2 text-lg font-semibold text-gray-900">1</h4>
              <p className="text-sm text-gray-600">KPIs Requieren Atención</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}