import React, { useState } from 'react';
import { Routes, Route as RouterRoute, Link, useLocation } from 'react-router-dom';
import { 
  ShoppingCart, 
  TrendingUp, 
  MapPin, 
  Package, 
  Clock, 
  Users, 
  BarChart3,
  Filter,
  Search,
  RefreshCw,
  Plus,
  Download,
  CheckCircle,
  AlertCircle,
  Target,
  Navigation,
  Layers,
  Waves
} from 'lucide-react';
import { PickingTasks } from './PickingTasks';
import { BatchPicking } from './BatchPicking';
import { WavePicking } from './WavePicking';
import { RouteOptimization } from './RouteOptimization';

export function PickingDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const location = useLocation();

  const tabs = [
    { name: 'Tareas', href: '/picking/tasks', icon: ShoppingCart },
    { name: 'Lotes', href: '/picking/batches', icon: Layers },
    { name: 'Olas', href: '/picking/waves', icon: Waves },
    { name: 'Rutas', href: '/picking/routes', icon: MapPin }
  ];

  const isActiveTab = (href: string) => {
    return location.pathname.startsWith(href);
  };

  // Mock stats data
  const stats = [
    {
      title: 'Tareas Pendientes',
      value: '47',
      change: '+12%',
      changeType: 'increase' as const,
      icon: ShoppingCart,
      color: 'blue'
    },
    {
      title: 'Productividad',
      value: '94.2%',
      change: '+2.1%',
      changeType: 'increase' as const,
      icon: TrendingUp,
      color: 'green'
    },
    {
      title: 'Tiempo Promedio',
      value: '8.5 min',
      change: '-1.2 min',
      changeType: 'decrease' as const,
      icon: Clock,
      color: 'purple'
    },
    {
      title: 'Operarios Activos',
      value: '12',
      change: '+2',
      changeType: 'increase' as const,
      icon: Users,
      color: 'orange'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Picking</h1>
          <p className="text-gray-600">Optimiza las operaciones de picking y rutas de almacén</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Tarea
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className={`p-3 bg-${stat.color}-100 rounded-lg`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <div className="flex items-center">
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <span className={`ml-2 text-sm font-medium ${
                      stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
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

      {/* Search and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar tareas, productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-80"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium ${
              showFilters
                ? 'border-blue-300 text-blue-700 bg-blue-50'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </button>
        </div>
        <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="in_progress">En Progreso</option>
                <option value="completed">Completado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioridad
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Todas las prioridades</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operario
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Todos los operarios</option>
                <option value="user1">Juan Pérez</option>
                <option value="user2">María García</option>
                <option value="user3">Carlos López</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zona
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Todas las zonas</option>
                <option value="zone1">Zona A - Picking</option>
                <option value="zone2">Zona B - Reserva</option>
                <option value="zone3">Zona C - Devoluciones</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1">
        <Routes>
          <RouterRoute path="/tasks" element={<PickingTasks />} />
          <RouterRoute path="/batches" element={<BatchPicking />} />
          <RouterRoute path="/waves" element={<WavePicking />} />
          <RouterRoute path="/routes" element={<RouteOptimization />} />
          <RouterRoute path="/" element={<PickingTasks />} />
        </Routes>
      </div>
    </div>
  );
}