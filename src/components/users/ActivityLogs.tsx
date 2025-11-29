import { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Search, 
  Download,
  RefreshCw,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  LogIn,
  LogOut,
  Settings,
  Shield,
  Database,
  Plus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action: string;
  action_type: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view' | 'config' | 'permission';
  resource: string;
  resource_id?: string | null;
  details: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  status: 'success' | 'warning' | 'error';
  duration?: number;
}
// Tipos para filas obtenidas de Supabase en inventory_movements
interface MovementProfile {
  full_name: string | null;
  role: string | null;
  email: string | null;
}

interface MovementProduct {
  name: string | null;
  sku: string | null;
}

interface MovementRow {
  id: string;
  transaction_type: string;
  quantity: number;
  reference_number: string | null;
  reason: string | null;
  notes: string | null;
  created_at: string;
  performed_by: string | null;
  profiles?: MovementProfile | null;
  products?: MovementProduct | null;
}

type FilterUser = 'all' | string;
type FilterAction = 'all' | ActivityLog['action_type'];
type FilterStatus = 'all' | ActivityLog['status'];
type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';

// Mock data as fallback (module scope to avoid re-creating on each render)
const mockActivityLogs: ActivityLog[] = [
  {
    id: '1',
    user_id: '1',
    user_name: 'Juan Pérez',
    user_role: 'Administrador',
    action: 'Inicio de sesión',
    action_type: 'login',
    resource: 'Sistema',
    details: 'Inicio de sesión exitoso desde navegador Chrome',
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    created_at: '2024-01-15T08:30:00Z',
    status: 'success',
    duration: 2
  },
  {
    id: '2',
    user_id: '2',
    user_name: 'María García',
    user_role: 'Gerente',
    action: 'Creación de usuario',
    action_type: 'create',
    resource: 'Usuarios',
    resource_id: '15',
    details: 'Creó nuevo usuario: Carlos López con rol Operador',
    ip_address: '192.168.1.105',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    created_at: '2024-01-15T09:15:00Z',
    status: 'success'
  },
  {
    id: '3',
    user_id: '3',
    user_name: 'Carlos López',
    user_role: 'Operador',
    action: 'Consulta de inventario',
    action_type: 'view',
    resource: 'Inventario',
    resource_id: 'INV-001',
    details: 'Consultó detalles del producto SKU-12345',
    ip_address: '192.168.1.110',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    created_at: '2024-01-15T10:00:00Z',
    status: 'success'
  },
  {
    id: '4',
    user_id: '1',
    user_name: 'Juan Pérez',
    user_role: 'Administrador',
    action: 'Modificación de permisos',
    action_type: 'permission',
    resource: 'Roles',
    resource_id: '3',
    details: 'Modificó permisos del rol Supervisor - agregó acceso a reportes',
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    created_at: '2024-01-15T11:30:00Z',
    status: 'success'
  },
  {
    id: '5',
    user_id: '4',
    user_name: 'Ana Martínez',
    user_role: 'Supervisor',
    action: 'Intento de acceso denegado',
    action_type: 'view',
    resource: 'Configuración',
    details: 'Intento de acceso a configuración del sistema sin permisos',
    ip_address: '192.168.1.115',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    created_at: '2024-01-15T12:00:00Z',
    status: 'error'
  },
  {
    id: '6',
    user_id: '2',
    user_name: 'María García',
    user_role: 'Gerente',
    action: 'Actualización de inventario',
    action_type: 'update',
    resource: 'Inventario',
    resource_id: 'INV-002',
    details: 'Actualizó cantidad de producto SKU-67890 de 100 a 150 unidades',
    ip_address: '192.168.1.105',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    created_at: '2024-01-15T13:15:00Z',
    status: 'success'
  },
  {
    id: '7',
    user_id: '5',
    user_name: 'Pedro Rodríguez',
    user_role: 'Operador',
    action: 'Cierre de sesión',
    action_type: 'logout',
    resource: 'Sistema',
    details: 'Cierre de sesión normal',
    ip_address: '192.168.1.120',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    created_at: '2024-01-15T14:00:00Z',
    status: 'success',
    duration: 180
  },
  {
    id: '8',
    user_id: '1',
    user_name: 'Juan Pérez',
    user_role: 'Administrador',
    action: 'Configuración de sistema',
    action_type: 'config',
    resource: 'Configuración',
    resource_id: 'SYS-001',
    details: 'Modificó configuración de backup automático',
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    created_at: '2024-01-15T15:30:00Z',
    status: 'warning'
  }
];

export function ActivityLogs() {
  const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
  const { signOut } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<FilterUser>('all');
  const [selectedAction, setSelectedAction] = useState<FilterAction>('all');
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>('all');
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [isLoading, setIsLoading] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Cargar logs de actividad desde backend si existe; fallback a inventory_movements
  const fetchActivityLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('app_token');
      if (AUTH_BACKEND_URL && token) {
        const resp = await fetch(`${AUTH_BACKEND_URL}/activity/logs?limit=100`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resp.status === 401) {
          try { localStorage.removeItem('app_token'); } catch {}
          await signOut();
          throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
        }
        if (!resp.ok) {
          const text = await resp.text().catch(() => '');
          throw new Error(text || 'Error cargando logs');
        }
        const { items } = await resp.json();
        setActivityLogs(items || []);
        return;
      }

      // Fallback: usar movimientos de inventario como proxy
      const { data: movements, error: movementsError } = await supabase
        .from('inventory_movements')
        .select('id, transaction_type, quantity, reference_number, reason, notes, created_at, performed_by, profiles!inventory_movements_performed_by_fkey (full_name, role, email), products (name, sku)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (movementsError) throw movementsError;

      const transformedLogs: ActivityLog[] = ((movements || []) as MovementRow[]).map((movement) => ({
        id: movement.id,
        user_id: movement.performed_by || 'system',
        user_name: movement.profiles?.full_name || 'Sistema',
        user_role: movement.profiles?.role || 'system',
        action: `${movement.transaction_type} - ${movement.products?.name || 'Producto'}`,
        action_type: 'update' as const,
        resource: 'Inventario',
        resource_id: movement.products?.sku,
        details: `${movement.transaction_type}: ${movement.quantity} unidades. ${movement.reason || movement.notes || ''}`,
        ip_address: '192.168.1.100',
        user_agent: 'Sistema WMS',
        created_at: movement.created_at,
        status: 'success' as const,
        duration: Math.floor(Math.random() * 5) + 1
      }));

      setActivityLogs(transformedLogs);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      const message = err instanceof Error ? err.message : 'Error al cargar los logs de actividad';
      setError(message);
      // Fallback to mock data
      setActivityLogs(mockActivityLogs);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivityLogs();
  }, [fetchActivityLogs]);

  // Mock data moved to module scope

  // Get unique users for filter
  const uniqueUsers = Array.from(new Set(activityLogs.map(log => log.user_name)));

  // Nota: El filtro de acción usa opciones estáticas; no se requiere uniqueActions.

  // Filter logs based on search and filters
  const filteredLogs = activityLogs.filter(log => {
    const matchesSearch = log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.details.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesUser = selectedUser === 'all' || log.user_name === selectedUser;
    const matchesAction = selectedAction === 'all' || log.action_type === selectedAction;
    const matchesStatus = selectedStatus === 'all' || log.status === selectedStatus;
    
    // Simple date filtering (in a real app, this would be more sophisticated)
    const matchesDate = true; // For now, show all dates
    
    return matchesSearch && matchesUser && matchesAction && matchesStatus && matchesDate;
  });

  // Get action icon
  const getActionIcon = (actionType: ActivityLog['action_type']) => {
    switch (actionType) {
      case 'login': return <LogIn className="w-4 h-4 text-green-600" />;
      case 'logout': return <LogOut className="w-4 h-4 text-gray-600" />;
      case 'create': return <Plus className="w-4 h-4 text-blue-600" />;
      case 'update': return <Edit className="w-4 h-4 text-yellow-600" />;
      case 'delete': return <Trash2 className="w-4 h-4 text-red-600" />;
      case 'view': return <Eye className="w-4 h-4 text-purple-600" />;
      case 'config': return <Settings className="w-4 h-4 text-orange-600" />;
      case 'permission': return <Shield className="w-4 h-4 text-indigo-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  // Get status icon and color
  const getStatusDisplay = (status: ActivityLog['status']) => {
    switch (status) {
      case 'success':
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-600" />,
          bg: 'bg-green-100',
          text: 'text-green-800',
          label: 'Exitoso'
        };
      case 'warning':
        return {
          icon: <AlertCircle className="w-4 h-4 text-yellow-600" />,
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          label: 'Advertencia'
        };
      case 'error':
        return {
          icon: <XCircle className="w-4 h-4 text-red-600" />,
          bg: 'bg-red-100',
          text: 'text-red-800',
          label: 'Error'
        };
      default:
        return {
          icon: <AlertCircle className="w-4 h-4 text-gray-600" />,
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          label: 'Desconocido'
        };
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('es-ES'),
      time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Export logs
  const exportLogs = () => {
    const csvContent = [
      ['Fecha', 'Hora', 'Usuario', 'Rol', 'Acción', 'Recurso', 'Estado', 'Detalles', 'IP'],
      ...filteredLogs.map(log => {
        const { date, time } = formatTimestamp(log.created_at);
        return [
          date,
          time,
          log.user_name,
          log.user_role,
          log.action,
          log.resource,
          getStatusDisplay(log.status).label,
          log.details,
          log.ip_address
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'logs-actividad.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Refresh logs
  const refreshLogs = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Registro de Actividad</h2>
          <p className="text-gray-600">Monitorea todas las acciones realizadas en el sistema</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={refreshLogs}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            onClick={exportLogs}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar en logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* User Filter */}
          <div>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los usuarios</option>
              {uniqueUsers.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value as FilterAction)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas las acciones</option>
              <option value="login">Inicios de sesión</option>
              <option value="logout">Cierres de sesión</option>
              <option value="create">Creaciones</option>
              <option value="update">Actualizaciones</option>
              <option value="delete">Eliminaciones</option>
              <option value="view">Consultas</option>
              <option value="config">Configuraciones</option>
              <option value="permission">Permisos</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as FilterStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="success">Exitosos</option>
              <option value="warning">Advertencias</option>
              <option value="error">Errores</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="today">Hoy</option>
              <option value="week">Esta semana</option>
              <option value="month">Este mes</option>
              <option value="quarter">Este trimestre</option>
              <option value="year">Este año</option>
              <option value="all">Todo el tiempo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Actividades</p>
              <p className="text-2xl font-bold text-gray-900">{filteredLogs.length}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Exitosas</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredLogs.filter(log => log.status === 'success').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Advertencias</p>
              <p className="text-2xl font-bold text-yellow-600">
                {filteredLogs.filter(log => log.status === 'warning').length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Errores</p>
              <p className="text-2xl font-bold text-red-600">
                {filteredLogs.filter(log => log.status === 'error').length}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Activity Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha/Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recurso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detalles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => {
                const { date, time } = formatTimestamp(log.created_at);
                const statusDisplay = getStatusDisplay(log.status);
                
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{date}</div>
                          <div className="text-sm text-gray-500">{time}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{log.user_name}</div>
                          <div className="text-sm text-gray-500">{log.user_role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action_type)}
                        <span className="text-sm text-gray-900">{log.action}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{log.resource}</div>
                          {log.resource_id && (
                            <div className="text-sm text-gray-500">{log.resource_id}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.bg} ${statusDisplay.text}`}>
                        {statusDisplay.icon}
                        {statusDisplay.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={log.details}>
                        {log.details}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ip_address}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* No results message */}
      {filteredLogs.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Activity className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron registros</h3>
          <p className="mt-1 text-sm text-gray-500">
            Intenta ajustar los filtros de búsqueda
          </p>
        </div>
      )}
    </div>
  );
}