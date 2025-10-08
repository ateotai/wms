import React, { useEffect, useState } from 'react';
import { Routes, Route as RouterRoute, Link, useLocation } from 'react-router-dom';
import { 
  Package, 
  Truck, 
  FileText, 
  BarChart3,
  Clock, 
  Users, 
  TrendingUp,
  Filter,
  Search,
  RefreshCw,
  Plus,
  Download,
  CheckCircle,
  AlertCircle,
  MapPin,
  Calendar,
  Layers
} from 'lucide-react';
import { ShippingOrders } from './ShippingOrders';
import { PackingTasks } from './PackingTasks';
import { CarrierManagement } from './CarrierManagement';
import { ShippingDocuments } from './ShippingDocuments';

export function PackingDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const location = useLocation();

  const tabs = [
    { name: 'Órdenes de Envío', href: '/packing/orders', icon: FileText },
    { name: 'Empaquetado', href: '/packing/tasks', icon: Package },
    { name: 'Transportistas', href: '/packing/carriers', icon: Truck },
    { name: 'Documentos', href: '/packing/documents', icon: Layers }
  ];

  const isActiveTab = (href: string) => {
    return location.pathname.startsWith(href);
  };

  // Métricas reales con fallback a cero
  const [stats, setStats] = useState<Array<{
    title: string;
    value: string;
    change: string;
    changeType: 'increase' | 'decrease';
    icon: any;
    color: 'blue' | 'orange' | 'green' | 'purple';
  }>>([
    { title: 'Órdenes Pendientes', value: '0', change: '', changeType: 'increase', icon: FileText, color: 'blue' },
    { title: 'En Empaquetado', value: '0', change: '', changeType: 'increase', icon: Package, color: 'orange' },
    { title: 'Enviados Hoy', value: '0', change: '', changeType: 'increase', icon: Truck, color: 'green' },
    { title: 'Tiempo Promedio', value: '0.0 min', change: '', changeType: 'increase', icon: Clock, color: 'purple' }
  ]);

  useEffect(() => {
    try {
      const ordersStr = localStorage.getItem('packing_orders');
      const tasksStr = localStorage.getItem('packing_tasks');
      const orders = ordersStr ? JSON.parse(ordersStr) : [];
      const tasks = tasksStr ? JSON.parse(tasksStr) : [];

      const pendingOrders = orders.filter((o: any) => o?.status === 'pending').length;
      const inProgressTasks = tasks.filter((t: any) => t?.status === 'in_progress').length;
      const today = new Date();
      const shippedToday = orders.filter((o: any) => {
        if (o?.status !== 'shipped' || !o?.shippedAt) return false;
        const d = new Date(o.shippedAt);
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
      }).length;
      const avgTime = tasks.length
        ? (tasks.reduce((sum: number, t: any) => sum + (Number(t?.estimatedTime) || 0), 0) / tasks.length)
        : 0;

      setStats([
        { title: 'Órdenes Pendientes', value: String(pendingOrders), change: '', changeType: 'increase', icon: FileText, color: 'blue' },
        { title: 'En Empaquetado', value: String(inProgressTasks), change: '', changeType: 'increase', icon: Package, color: 'orange' },
        { title: 'Enviados Hoy', value: String(shippedToday), change: '', changeType: 'increase', icon: Truck, color: 'green' },
        { title: 'Tiempo Promedio', value: `${avgTime.toFixed(1)} min`, change: '', changeType: 'increase', icon: Clock, color: 'purple' }
      ]);
    } catch {}
  }, [location.pathname]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Packing y Envíos</h1>
          <p className="text-gray-600">Gestiona el empaquetado, envíos y coordinación de transporte</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Orden
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
                    {stat.change !== '' && (
                      <span className={`ml-2 text-sm font-medium ${
                        stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.change}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <nav className="flex space-x-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = isActiveTab(tab.href);
            return (
              <Link
                key={tab.name}
                to={tab.href}
                className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-all duration-200 ${
                  isActive
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
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
              placeholder="Buscar órdenes, productos, transportistas..."
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
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="packing">Empaquetando</option>
                <option value="ready">Listo para envío</option>
                <option value="shipped">Enviado</option>
                <option value="delivered">Entregado</option>
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
                Transportista
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Todos los transportistas</option>
                <option value="dhl">DHL Express</option>
                <option value="fedex">FedEx</option>
                <option value="ups">UPS</option>
                <option value="correos">Correos</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Envío
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <Routes>
          <RouterRoute path="/orders" element={<ShippingOrders />} />
          <RouterRoute path="/tasks" element={<PackingTasks />} />
          <RouterRoute path="/carriers" element={<CarrierManagement />} />
          <RouterRoute path="/documents" element={<ShippingDocuments />} />
          <RouterRoute path="/" element={<ShippingOrders />} />
        </Routes>
      </div>
    </div>
  );
}