import { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  TrendingUp, 
  PieChart, 
  FileText, 
  DollarSign, 
  Package,
  Activity,
  Calendar,
  Download,
  Filter,
  Search,
  RefreshCw,
  Eye,
  Settings
} from 'lucide-react';

import { KPIReports } from './KPIReports';
import { ABCAnalysis } from './ABCAnalysis';
import { InventoryReports } from './InventoryReports';
import { OperationalReports } from './OperationalReports';
import { FinancialReports } from './FinancialReports';
import { CustomReports } from './CustomReports';

export function ReportsDashboard() {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  const reportTabs = [
    { name: 'KPIs', href: '/reports/kpi', icon: TrendingUp },
    { name: 'Análisis ABC', href: '/reports/abc', icon: PieChart },
    { name: 'Inventario', href: '/reports/inventory', icon: Package },
    { name: 'Operaciones', href: '/reports/operations', icon: Activity },
    { name: 'Financiero', href: '/reports/financial', icon: DollarSign },
    { name: 'Personalizados', href: '/reports/custom', icon: Settings }
  ];

  const isActiveTab = (href: string) => {
    return location.pathname.startsWith(href);
  };

  // Mock stats data
  const stats = [
    {
      title: 'Reportes Generados',
      value: '1,247',
      change: '+12%',
      changeType: 'increase' as const,
      icon: FileText,
      color: 'blue'
    },
    {
      title: 'Rotación de Inventario',
      value: '8.5x',
      change: '+0.3',
      changeType: 'increase' as const,
      icon: RefreshCw,
      color: 'green'
    },
    {
      title: 'Precisión de Picking',
      value: '99.2%',
      change: '+0.5%',
      changeType: 'increase' as const,
      icon: Activity,
      color: 'purple'
    },
    {
      title: 'Costo por Orden',
      value: '$12.45',
      change: '-$0.85',
      changeType: 'decrease' as const,
      icon: DollarSign,
      color: 'orange'
    }
  ];

  const quickReports = [
    {
      name: 'Resumen Diario',
      description: 'Métricas operativas del día',
      icon: Calendar,
      lastGenerated: '2 horas',
      status: 'ready'
    },
    {
      name: 'Stock Crítico',
      description: 'Productos con stock bajo',
      icon: Package,
      lastGenerated: '30 min',
      status: 'ready'
    },
    {
      name: 'Rendimiento Picking',
      description: 'Análisis de productividad',
      icon: Activity,
      lastGenerated: '1 hora',
      status: 'generating'
    },
    {
      name: 'Análisis de Costos',
      description: 'Desglose de costos operativos',
      icon: DollarSign,
      lastGenerated: '4 horas',
      status: 'ready'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-green-600 bg-green-100';
      case 'generating': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ready': return 'Listo';
      case 'generating': return 'Generando';
      case 'error': return 'Error';
      default: return 'Desconocido';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes y Analítica</h1>
          <p className="text-gray-600">Análisis de rendimiento y métricas operativas</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Exportar Todo
          </button>
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {reportTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.name}
                to={tab.href}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  isActiveTab(tab.href)
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <Routes>
        <Route path="kpi" element={<KPIReports />} />
        <Route path="abc" element={<ABCAnalysis />} />
        <Route path="inventory" element={<InventoryReports />} />
        <Route path="operations" element={<OperationalReports />} />
        <Route path="financial" element={<FinancialReports />} />
        <Route path="custom" element={<CustomReports />} />
        <Route path="/" element={
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
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
                      <span className={`text-sm font-medium ${
                        stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.change}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">vs mes anterior</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg shadow border">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar reportes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
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
              </div>
              <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter className="w-4 h-4 mr-2" />
                Filtros Avanzados
              </button>
            </div>

            {/* Quick Reports */}
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Reportes Rápidos</h3>
                <p className="text-sm text-gray-600">Acceso directo a reportes frecuentes</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickReports.map((report, index) => {
                    const Icon = report.icon;
                    return (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Icon className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="ml-3">
                              <h4 className="text-sm font-medium text-gray-900">{report.name}</h4>
                              <p className="text-xs text-gray-500">{report.description}</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                              {getStatusText(report.status)}
                            </span>
                            <span className="text-xs text-gray-500">hace {report.lastGenerated}</span>
                          </div>
                          <button className="p-1 text-gray-400 hover:text-gray-600">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        } />
      </Routes>
    </div>
  );
}
