import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Edit, 
  Trash2, 
  Eye, 
  MoreHorizontal, 
  UserCheck, 
  UserX, 
  Shield,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';
  department: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  avatar_url: string | null;
}

interface UserListProps {
  searchTerm: string;
  selectedRole: string;
}

export function UserList({ searchTerm, selectedRole }: UserListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showActions, setShowActions] = useState<string | null>(null);

  // Fetch users from database
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('app_token');
      if (!AUTH_BACKEND_URL) {
        throw new Error('Backend de autenticación no configurado');
      }
      const resp = await fetch(`${AUTH_BACKEND_URL}/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(text || 'Error al cargar los usuarios');
      }
      const { users } = await resp.json();
      setUsers((users || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name || null,
        role: (u.role || 'OPERATOR'),
        department: u.department || null,
        phone: u.phone || null,
        is_active: u.is_active ?? true,
        created_at: u.created_at,
        updated_at: u.updated_at || u.created_at,
        last_login: u.last_login || null,
        avatar_url: u.avatar_url || null,
      })));
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  // Mock data for users (fallback)
  const mockUsers: User[] = [
    {
      id: '1',
      name: 'Ana García',
      email: 'ana.garcia@empresa.com',
      phone: '+34 600 123 456',
      role: 'admin',
      status: 'active',
      lastLogin: '2024-01-15 09:30',
      createdAt: '2023-06-15'
    },
    {
      id: '2',
      name: 'Carlos Rodríguez',
      email: 'carlos.rodriguez@empresa.com',
      phone: '+34 600 234 567',
      role: 'manager',
      status: 'active',
      lastLogin: '2024-01-15 08:45',
      createdAt: '2023-07-20'
    },
    {
      id: '3',
      name: 'María López',
      email: 'maria.lopez@empresa.com',
      phone: '+34 600 345 678',
      role: 'supervisor',
      status: 'inactive',
      lastLogin: '2024-01-10 16:20',
      createdAt: '2023-08-10'
    },
    {
      id: '4',
      name: 'David Martín',
      email: 'david.martin@empresa.com',
      phone: '+34 600 456 789',
      role: 'operator',
      status: 'active',
      lastLogin: '2024-01-15 07:15',
      createdAt: '2023-09-05'
    },
    {
      id: '5',
      name: 'Laura Sánchez',
      email: 'laura.sanchez@empresa.com',
      phone: '+34 600 567 890',
      role: 'viewer',
      status: 'pending',
      lastLogin: 'Nunca',
      createdAt: '2024-01-14'
    }
  ];

  const roleLabels = {
    admin: 'Administrador',
    manager: 'Gerente',
    supervisor: 'Supervisor',
    operator: 'Operador',
    viewer: 'Solo lectura'
  };

  const statusLabels = {
    active: 'Activo',
    inactive: 'Inactivo',
    pending: 'Pendiente'
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = !searchTerm || 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = selectedRole === 'all' || user.role === selectedRole;
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, selectedRole]);

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  const getRoleLabel = (role: string) => {
    const roleLabels = {
      'ADMIN': 'Administrador',
      'MANAGER': 'Gerente',
      'OPERATOR': 'Operador',
      'VIEWER': 'Visualizador'
    };
    return roleLabels[role as keyof typeof roleLabels] || role;
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Activo
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Inactivo
        </span>
      );
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-8 text-center">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Lista de Usuarios ({filteredUsers.length})
          </h3>
          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedUsers.length} seleccionados
              </span>
              <button className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200">
                Eliminar seleccionados
              </button>
              <button className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200">
                Desactivar seleccionados
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Último acceso
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha registro
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => handleSelectUser(user.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {user.full_name ? user.full_name.split(' ').map(n => n[0]).join('') : user.email[0].toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.full_name || user.email}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </div>
                      {user.phone && (
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {user.phone}
                        </div>
                      )}
                      {user.department && (
                        <div className="text-sm text-gray-500">
                          {user.department}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <Shield className="w-3 h-3 mr-1" />
                    {getRoleLabel(user.role)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(user.is_active)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    {formatDate(user.last_login)}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    {formatDate(user.created_at)}
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <div className="relative">
                    <button
                      onClick={() => setShowActions(showActions === user.id ? null : user.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                    {showActions === user.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                        <div className="py-1">
                          <Link
                            to={`/users/edit/${user.id}`}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar usuario
                          </Link>
                          <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <Eye className="w-4 h-4 mr-2" />
                            Ver detalles
                          </button>
                          <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            {user.is_active ? (
                              <>
                                <UserX className="w-4 h-4 mr-2" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-4 h-4 mr-2" />
                                Activar
                              </>
                            )}
                          </button>
                          <button className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron usuarios</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedRole !== 'all' 
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Comienza agregando un nuevo usuario al sistema'
            }
          </p>
          {(!searchTerm && selectedRole === 'all') && (
            <div className="mt-6">
              <Link
                to="/users/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Agregar usuario
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {filteredUsers.length > 0 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Anterior
            </button>
            <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Siguiente
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Mostrando <span className="font-medium">1</span> a <span className="font-medium">{filteredUsers.length}</span> de{' '}
                <span className="font-medium">{filteredUsers.length}</span> resultados
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  Anterior
                </button>
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-blue-50 text-sm font-medium text-blue-600">
                  1
                </button>
                <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  Siguiente
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}