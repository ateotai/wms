import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Activity, 
  Settings,
  Search,
  Filter,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UserList } from './UserList';
import { UserForm } from './UserForm';
import { RoleManagement } from './RoleManagement';
import { ActivityLogs } from './ActivityLogs';

export function UserManagementDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    newUsersThisMonth: 0,
    adminUsers: 0,
    managerUsers: 0,
    operatorUsers: 0,
    viewerUsers: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch user statistics from database
  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      
      // Get all users
      const { data: users, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) {
        throw error;
      }

      if (users) {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const totalUsers = users.length;
        const activeUsers = users.filter(user => user.is_active).length;
        const inactiveUsers = totalUsers - activeUsers;
        const newUsersThisMonth = users.filter(user => 
          new Date(user.created_at) >= thisMonth
        ).length;
        
        // Count users by role
        const adminUsers = users.filter(user => user.role === 'ADMIN').length;
        const managerUsers = users.filter(user => user.role === 'MANAGER').length;
        const operatorUsers = users.filter(user => user.role === 'OPERATOR').length;
        const viewerUsers = users.filter(user => user.role === 'VIEWER').length;

        setUserStats({
          totalUsers,
          activeUsers,
          inactiveUsers,
          newUsersThisMonth,
          adminUsers,
          managerUsers,
          operatorUsers,
          viewerUsers
        });
      }
    } catch (err) {
      console.error('Error fetching user stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Statistics cards data
  const statsCards = [
    {
      title: 'Total Usuarios',
      value: loading ? '...' : userStats.totalUsers.toString(),
      change: '+12%',
      changeType: 'positive' as const,
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Usuarios Activos',
      value: loading ? '...' : userStats.activeUsers.toString(),
      change: '+8%',
      changeType: 'positive' as const,
      icon: Users,
      color: 'green'
    },
    {
      title: 'Usuarios Inactivos',
      value: loading ? '...' : userStats.inactiveUsers.toString(),
      change: '-3%',
      changeType: 'negative' as const,
      icon: Users,
      color: 'red'
    },
    {
      title: 'Nuevos este mes',
      value: loading ? '...' : userStats.newUsersThisMonth.toString(),
      change: '+23%',
      changeType: 'positive' as const,
      icon: UserPlus,
      color: 'purple'
    }
  ];

  const tabs = [
    { name: 'Todos los Usuarios', path: '/users', icon: Users },
    { name: 'Nuevo Usuario', path: '/users/new', icon: UserPlus },
    { name: 'Roles y Permisos', path: '/users/roles', icon: Shield },
    { name: 'Registro de Actividad', path: '/users/activity', icon: Activity }
  ];

  const quickActions = [
    { name: 'Nuevo Usuario', icon: UserPlus, action: () => navigate('/users/new') },
    { name: 'Importar Usuarios', icon: Download, action: () => {} },
    { name: 'Configurar Roles', icon: Settings, action: () => navigate('/users/roles') }
  ];

  const isActiveTab = (path: string) => {
    if (path === '/users') {
      return location.pathname === '/users' || location.pathname === '/users/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
            <p className="mt-2 text-gray-600">
              Administra usuarios, roles y permisos del sistema WMS
            </p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${
                  stat.color === 'blue' ? 'bg-blue-100' :
                  stat.color === 'green' ? 'bg-green-100' :
                  stat.color === 'red' ? 'bg-red-100' :
                  'bg-purple-100'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    stat.color === 'blue' ? 'text-blue-600' :
                    stat.color === 'green' ? 'text-green-600' :
                    stat.color === 'red' ? 'text-red-600' :
                    'text-purple-600'
                  }`} />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                {stat.changeType === 'positive' ? (
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                ) : stat.changeType === 'negative' ? (
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                ) : null}
                <span className={`text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-green-600' :
                  stat.changeType === 'negative' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 ml-2">vs mes anterior</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.name}
                to={tab.path}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  isActiveTab(tab.path)
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar usuarios por nombre, email, rol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los roles</option>
              <option value="admin">Administrador</option>
              <option value="manager">Gerente</option>
              <option value="supervisor">Supervisor</option>
              <option value="operator">Operador</option>
              <option value="viewer">Solo lectura</option>
            </select>
            <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.name}
                onClick={action.action}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-medium text-gray-900">{action.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Routes */}
      <Routes>
        <Route path="/" element={<UserList searchTerm={searchTerm} selectedRole={selectedRole} />} />
        <Route path="/new" element={<UserForm />} />
        <Route path="/edit/:id" element={<UserForm />} />
        <Route path="/roles" element={<RoleManagement />} />
        <Route path="/activity" element={<ActivityLogs />} />
      </Routes>
    </div>
  );
}