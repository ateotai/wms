import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Package, 
  FileText, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Search,
  Filter,
  Plus,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { PurchaseOrders } from './PurchaseOrders';
import { ASNManagement } from './ASNManagement';
import { ReceivingTasks } from './ReceivingTasks';

export const ReceptionDashboard: React.FC = () => {
  const location = useLocation();

  const isActiveTab = (path: string) => {
    return location.pathname.includes(path);
  };

  const stats = [
    {
      title: 'Órdenes Pendientes',
      value: '24',
      change: '+3',
      changeType: 'increase' as const,
      icon: FileText,
      color: 'blue'
    },
    {
      title: 'ASN Recibidos',
      value: '18',
      change: '+5',
      changeType: 'increase' as const,
      icon: Truck,
      color: 'green'
    },
    {
      title: 'En Recepción',
      value: '7',
      change: '-2',
      changeType: 'decrease' as const,
      icon: Package,
      color: 'yellow'
    },
    {
      title: 'Completados Hoy',
      value: '12',
      change: '+4',
      changeType: 'increase' as const,
      icon: CheckCircle,
      color: 'emerald'
    }
  ];

  const renderContent = () => {
    const path = location.pathname;
    
    if (path.includes('/reception/asn')) {
      return <ASNManagement />;
    } else if (path.includes('/reception/receiving')) {
      return <ReceivingTasks />;
    } else {
      return <PurchaseOrders />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recepción</h1>
          <p className="text-gray-600">Gestión de órdenes de compra, ASN y recepción de mercancía</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Orden
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {stat.changeType === 'increase' ? (
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm font-medium ${
                stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.change}
              </span>
              <span className="text-sm text-gray-500 ml-1">vs ayer</span>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <Link
              to="/reception/orders"
              className={`flex items-center px-4 py-4 text-sm font-medium border-b-2 ${
                isActiveTab('/reception/orders') || location.pathname === '/reception'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="w-4 h-4 mr-2" />
              Órdenes de Compra
            </Link>
            <Link
              to="/reception/asn"
              className={`flex items-center px-4 py-4 text-sm font-medium border-b-2 ${
                isActiveTab('/reception/asn')
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Truck className="w-4 h-4 mr-2" />
              ASN
            </Link>
            <Link
              to="/reception/receiving"
              className={`flex items-center px-4 py-4 text-sm font-medium border-b-2 ${
                isActiveTab('/reception/receiving')
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Package className="w-4 h-4 mr-2" />
              Tareas de Recepción
            </Link>
          </nav>
        </div>

        {/* Search and Filter Bar */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por número de orden, proveedor..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};