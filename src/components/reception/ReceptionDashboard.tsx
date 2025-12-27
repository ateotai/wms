import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Package, 
  FileText, 
  Truck, 
  CheckCircle,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Calendar
} from 'lucide-react';
import { PurchaseOrders } from './PurchaseOrders';
import { ASNManagement } from './ASNManagement';
import { ReceivingTasks } from './ReceivingTasks';
import { Appointments } from './Appointments';
import { ReceptionControl } from './ReceptionControl'

export function ReceptionDashboard() {
  const location = useLocation();

  interface ReceptionMetrics {
    pendingOrders?: number;
    pendingChange?: number;
    asnReceived?: number;
    asnChange?: number;
    inReceiving?: number;
    inReceivingChange?: number;
    completedToday?: number;
    completedChange?: number;
  }
  const [metrics, setMetrics] = useState<ReceptionMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL;

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!AUTH_BACKEND_URL) return;
      setLoading(true);
      try {
        const token = localStorage.getItem('app_token');
        const resp = await fetch(`${AUTH_BACKEND_URL}/reception/metrics`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (resp.ok) {
          const data = await resp.json();
          setMetrics(data);
}
      } catch (e) {
        console.error('Error cargando métricas de recepción:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [AUTH_BACKEND_URL]);

  const isActiveTab = (path: string) => {
    return location.pathname.includes(path);
  };

  const formatChange = (n: number | undefined) => {
    if (typeof n !== 'number' || isNaN(n)) return '0';
    return n >= 0 ? `+${n}` : `${n}`;
  };

  const getChangeType = (n: number | undefined) => {
    if (typeof n !== 'number' || isNaN(n)) return 'increase';
    return n >= 0 ? 'increase' as const : 'decrease' as const;
  };

  const stats = [
    {
      title: 'Órdenes Pendientes',
      value: metrics?.pendingOrders ?? '—',
      change: formatChange(metrics?.pendingChange),
      changeType: getChangeType(metrics?.pendingChange),
      icon: FileText,
      color: 'blue'
    },
    {
      title: 'ASN Recibidos',
      value: metrics?.asnReceived ?? '—',
      change: formatChange(metrics?.asnChange),
      changeType: getChangeType(metrics?.asnChange),
      icon: Truck,
      color: 'green'
    },
    {
      title: 'En Recepción',
      value: metrics?.inReceiving ?? '—',
      change: formatChange(metrics?.inReceivingChange),
      changeType: getChangeType(metrics?.inReceivingChange),
      icon: Package,
      color: 'yellow'
    },
    {
      title: 'Completados Hoy',
      value: metrics?.completedToday ?? '—',
      change: formatChange(metrics?.completedChange),
      changeType: getChangeType(metrics?.completedChange),
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
    } else if (path.includes('/reception/appointments')) {
      return <Appointments />;
    } else if (path.includes('/reception/control')) {
      return <ReceptionControl />;
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
          <p className="text-gray-600">Gestión de órdenes de compra, citas, ASN y recepción de mercancía</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? '…' : stat.value}</p>
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
            {/* <Link
              to="/reception/asn"
              className={`flex items-center px-4 py-4 text-sm font-medium border-b-2 ${
                isActiveTab('/reception/asn')
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Truck className="w-4 h-4 mr-2" />
              ASN
            </Link> */}
            <Link
              to="/reception/appointments"
              className={`flex items-center px-4 py-4 text-sm font-medium border-b-2 ${
                isActiveTab('/reception/appointments')
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Citas
            </Link>
            {/* <Link
              to="/reception/receiving"
              className={`flex items-center px-4 py-4 text-sm font-medium border-b-2 ${
                isActiveTab('/reception/receiving')
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Package className="w-4 h-4 mr-2" />
              Tareas de Recepción
            </Link> */}
            <Link
              to="/reception/control"
              className={`flex items-center px-4 py-4 text-sm font-medium border-b-2 ${
                isActiveTab('/reception/control')
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Package className="w-4 h-4 mr-2" />
              Control de Recepción
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
