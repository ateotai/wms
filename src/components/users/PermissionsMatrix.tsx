import { useState } from 'react';
import { 
  Check, 
  X, 
  Shield, 
  Lock, 
  Search, 
  Filter,
  Download,
  Eye,
  EyeOff,
  AlertTriangle
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  isSystem: boolean;
}

interface PermissionsMatrixProps {
  roles: Role[];
  permissions: Permission[];
}

export function PermissionsMatrix({ roles, permissions }: PermissionsMatrixProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSystemRoles, setShowSystemRoles] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(permissions.map(p => p.category)))];

  // Filter permissions based on search and category
  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || permission.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Filter roles based on system role visibility
  const filteredRoles = roles.filter(role => showSystemRoles || !role.isSystem);

  // Check if role has permission
  const hasPermission = (role: Role, permissionId: string): boolean => {
    return role.permissions.includes('all') || role.permissions.includes(permissionId);
  };

  // Get permission coverage statistics
  const getPermissionStats = (permissionId: string) => {
    const rolesWithPermission = filteredRoles.filter(role => hasPermission(role, permissionId));
    const totalUsers = rolesWithPermission.reduce((sum, role) => sum + role.userCount, 0);
    return {
      rolesCount: rolesWithPermission.length,
      usersCount: totalUsers,
      coverage: filteredRoles.length > 0 ? (rolesWithPermission.length / filteredRoles.length) * 100 : 0
    };
  };

  // Get role statistics
  const getRoleStats = (role: Role) => {
    const rolePermissions = role.permissions.includes('all') 
      ? filteredPermissions.length 
      : filteredPermissions.filter(p => role.permissions.includes(p.id)).length;
    
    return {
      permissionsCount: rolePermissions,
      coverage: filteredPermissions.length > 0 ? (rolePermissions / filteredPermissions.length) * 100 : 0
    };
  };

  // Export matrix data
  const exportMatrix = () => {
    const csvContent = [
      ['Rol', ...filteredPermissions.map(p => p.name)],
      ...filteredRoles.map(role => [
        role.name,
        ...filteredPermissions.map(permission => 
          hasPermission(role, permission.id) ? 'Sí' : 'No'
        )
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'matriz-permisos.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar permisos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'Todas las categorías' : category}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle System Roles */}
          <button
            onClick={() => setShowSystemRoles(!showSystemRoles)}
            className={`px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
              showSystemRoles 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}
          >
            {showSystemRoles ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Roles del sistema
          </button>

          {/* Toggle Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`px-3 py-2 rounded-lg border transition-colors ${
              showDetails 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}
          >
            {showDetails ? 'Ocultar detalles' : 'Mostrar detalles'}
          </button>

          {/* Export */}
          <button
            onClick={exportMatrix}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Roles</p>
              <p className="text-2xl font-bold text-gray-900">{filteredRoles.length}</p>
            </div>
            <Shield className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Permisos</p>
              <p className="text-2xl font-bold text-gray-900">{filteredPermissions.length}</p>
            </div>
            <Lock className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Usuarios Totales</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredRoles.reduce((sum, role) => sum + role.userCount, 0)}
              </p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-bold">U</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Roles con Acceso Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredRoles.filter(role => role.permissions.includes('all')).length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky left-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 z-10">
                  Permisos / Roles
                </th>
                {filteredRoles.map((role) => (
                  <th key={role.id} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-32">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1">
                        {role.isSystem ? (
                          <Lock className="w-3 h-3 text-gray-400" />
                        ) : (
                          <Shield className="w-3 h-3 text-blue-500" />
                        )}
                        <span className="truncate max-w-20" title={role.name}>
                          {role.name}
                        </span>
                      </div>
                      {showDetails && (
                        <div className="text-xs text-gray-400">
                          <div>{role.userCount} usuarios</div>
                          <div>{getRoleStats(role).permissionsCount} permisos</div>
                          <div>{getRoleStats(role).coverage.toFixed(0)}% cobertura</div>
                        </div>
                      )}
                    </div>
                  </th>
                ))}
                {showDetails && (
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estadísticas
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPermissions.map((permission, index) => {
                const stats = getPermissionStats(permission.id);
                return (
                  <tr key={permission.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="sticky left-0 bg-inherit px-6 py-4 whitespace-nowrap border-r border-gray-200 z-10">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900">{permission.name}</div>
                        <div className="text-xs text-gray-500">{permission.category}</div>
                        {showDetails && (
                          <div className="text-xs text-gray-400 mt-1">{permission.description}</div>
                        )}
                      </div>
                    </td>
                    {filteredRoles.map((role) => (
                      <td key={role.id} className="px-3 py-4 whitespace-nowrap text-center">
                        {hasPermission(role, permission.id) ? (
                          <div className="flex justify-center">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-green-600" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                              <X className="w-4 h-4 text-red-600" />
                            </div>
                          </div>
                        )}
                      </td>
                    ))}
                    {showDetails && (
                      <td className="px-3 py-4 whitespace-nowrap text-center">
                        <div className="text-xs text-gray-600">
                          <div>{stats.rolesCount} roles</div>
                          <div>{stats.usersCount} usuarios</div>
                          <div className="flex items-center justify-center gap-1">
                            <div 
                              className={`w-2 h-2 rounded-full ${
                                stats.coverage >= 75 ? 'bg-green-500' :
                                stats.coverage >= 50 ? 'bg-yellow-500' :
                                stats.coverage >= 25 ? 'bg-orange-500' : 'bg-red-500'
                              }`}
                            />
                            {stats.coverage.toFixed(0)}%
                          </div>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Leyenda</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-gray-700">Permiso concedido</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
              <X className="w-4 h-4 text-red-600" />
            </div>
            <span className="text-gray-700">Permiso denegado</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-500" />
            <span className="text-gray-700">Rol del sistema</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="text-gray-700">Rol personalizado</span>
          </div>
        </div>
        
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Indicadores de cobertura</h4>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>≥75% Alta cobertura</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span>50-74% Media cobertura</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span>25-49% Baja cobertura</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span>&lt;25% Muy baja cobertura</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* No results message */}
      {filteredPermissions.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Search className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron permisos</h3>
          <p className="mt-1 text-sm text-gray-500">
            Intenta ajustar los filtros de búsqueda o categoría
          </p>
        </div>
      )}
    </div>
  );
}
