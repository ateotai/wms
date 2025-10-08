import React, { useEffect, useState } from 'react';
import { 
  Shield, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  CheckCircle,
  AlertCircle,
  Eye,
  Settings,
  Lock,
  Unlock
} from 'lucide-react';
import { PermissionsMatrix } from './PermissionsMatrix';

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

export function RoleManagement() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showPermissionsMatrix, setShowPermissionsMatrix] = useState(false);

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';

  const token = typeof window !== 'undefined' ? localStorage.getItem('app_token') : null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!AUTH_BACKEND_URL || !token) return;
        // Load roles
        const rolesResp = await fetch(`${AUTH_BACKEND_URL}/roles`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (rolesResp.ok) {
          const json = await rolesResp.json();
          const fetched = (json.roles || []).map((r: any, idx: number) => ({
            id: `${r.name}-${idx}`,
            name: r.name,
            description: r.description || '',
            userCount: r.userCount || 0,
            permissions: r.permissions || [],
            isSystem: !!r.isSystem,
            createdAt: r.createdAt || new Date().toISOString().split('T')[0],
            updatedAt: r.updatedAt || new Date().toISOString().split('T')[0]
          })) as Role[];
          setRoles(fetched);
        }
        // Load available permissions
        const permResp = await fetch(`${AUTH_BACKEND_URL}/permissions/available`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (permResp.ok) {
          const json = await permResp.json();
          setPermissions(json.permissions || []);
        }
      } catch (e) {
        console.error('Error cargando roles/permissions:', e);
      }
    };
    fetchData();
  }, [AUTH_BACKEND_URL, token]);

  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  });

  const handleCreateRole = () => {
    setIsCreating(true);
    setNewRole({ name: '', description: '', permissions: [] });
    setSelectedRole(null);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleSaveRole = async () => {
    try {
      if (!AUTH_BACKEND_URL || !token) return;
      if (isCreating) {
        const role: Role = {
          id: Date.now().toString(),
          name: newRole.name,
          description: newRole.description,
          permissions: newRole.permissions,
          userCount: 0,
          isSystem: false,
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0]
        };
        // Crear rol en backend
        await fetch(`${AUTH_BACKEND_URL}/roles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ name: role.name, description: role.description, permissions: role.permissions, is_system: false })
        }).catch(() => {});
        setRoles([...roles, role]);
        setIsCreating(false);
        setNewRole({ name: '', description: '', permissions: [] });
      } else if (selectedRole && isEditing) {
        // Guardar cambios del rol en backend
        await fetch(`${AUTH_BACKEND_URL}/roles/${encodeURIComponent(selectedRole.name)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ description: selectedRole.description, permissions: selectedRole.permissions, is_system: selectedRole.isSystem })
        });
        setRoles(roles.map(role => 
          role.id === selectedRole.id 
            ? { ...selectedRole, updatedAt: new Date().toISOString().split('T')[0] }
            : role
        ));
        setIsEditing(false);
      }
    } catch (e) {
      console.error('Error guardando rol:', e);
    }
  };

  const handleDeleteRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role?.isSystem) return;
    
    if (confirm('¿Estás seguro de que quieres eliminar este rol? Esta acción no se puede deshacer.')) {
      setRoles(roles.filter(r => r.id !== roleId));
      if (selectedRole?.id === roleId) {
        setSelectedRole(null);
      }
    }
  };

  const handlePermissionToggle = (permissionId: string, isForNewRole = false) => {
    if (isForNewRole) {
      setNewRole(prev => ({
        ...prev,
        permissions: prev.permissions.includes(permissionId)
          ? prev.permissions.filter(p => p !== permissionId)
          : [...prev.permissions, permissionId]
      }));
    } else if (selectedRole) {
      setSelectedRole({
        ...selectedRole,
        permissions: selectedRole.permissions.includes(permissionId)
          ? selectedRole.permissions.filter(p => p !== permissionId)
          : [...selectedRole.permissions, permissionId]
      });
    }
  };

  const getPermissionsByCategory = () => {
    return permissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
  };

  const getRoleIcon = (role: Role) => {
    if (role.isSystem) {
      return <Lock className="w-4 h-4 text-gray-500" />;
    }
    return <Shield className="w-4 h-4 text-blue-500" />;
  };

  if (showPermissionsMatrix) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Matriz de Permisos</h2>
            <p className="text-gray-600">Vista detallada de permisos por rol</p>
          </div>
          <button
            onClick={() => setShowPermissionsMatrix(false)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Volver a Roles
          </button>
        </div>
        <PermissionsMatrix roles={roles} permissions={permissions} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Roles</h2>
          <p className="text-gray-600">Administra los roles y permisos del sistema</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPermissionsMatrix(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Matriz de Permisos
          </button>
          <button
            onClick={handleCreateRole}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Rol
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Roles del Sistema</h3>
              <p className="text-sm text-gray-600">{roles.length} roles configurados</p>
            </div>
            <div className="divide-y divide-gray-200">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedRole?.id === role.id ? 'bg-blue-50 border-r-2 border-blue-500' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setSelectedRole(role);
                    setIsEditing(false);
                    setIsCreating(false);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(role)}
                      <div>
                        <h4 className="font-medium text-gray-900">{role.name}</h4>
                        <p className="text-sm text-gray-500">{role.userCount} usuarios</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditRole(role);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {!role.isSystem && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRole(role.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Role Details/Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {isCreating ? (
              // Create Role Form
              <div>
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Crear Nuevo Rol</h3>
                    <button
                      onClick={() => setIsCreating(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del rol *
                    </label>
                    <input
                      type="text"
                      value={newRole.name}
                      onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: Coordinador de almacén"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <textarea
                      value={newRole.description}
                      onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe las responsabilidades de este rol..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Permisos
                    </label>
                    <div className="space-y-4">
                      {Object.entries(getPermissionsByCategory()).map(([category, categoryPermissions]) => (
                        <div key={category} className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3">{category}</h4>
                          <div className="space-y-2">
                            {categoryPermissions.map(permission => (
                              <label key={permission.id} className="flex items-start">
                                <input
                                  type="checkbox"
                                  checked={newRole.permissions.includes(permission.id)}
                                  onChange={() => handlePermissionToggle(permission.id, true)}
                                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <div className="ml-3">
                                  <span className="text-sm font-medium text-gray-700">{permission.name}</span>
                                  <p className="text-xs text-gray-500">{permission.description}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setIsCreating(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveRole}
                      disabled={!newRole.name.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Crear Rol
                    </button>
                  </div>
                </div>
              </div>
            ) : selectedRole ? (
              // Role Details/Edit
              <div>
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getRoleIcon(selectedRole)}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{selectedRole.name}</h3>
                        <p className="text-sm text-gray-600">{selectedRole.userCount} usuarios asignados</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => setIsEditing(false)}
                            className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleSaveRole}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-1"
                          >
                            <Save className="w-3 h-3" />
                            Guardar
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          Editar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  {/* Mensaje opcional sobre rol del sistema; edición permitida */}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    {isEditing ? (
                      <textarea
                        value={selectedRole.description}
                        onChange={(e) => setSelectedRole({ ...selectedRole, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-600">{selectedRole.description}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Permisos asignados
                    </label>
                    {selectedRole.permissions.includes('all') ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <p className="text-sm text-green-800 font-medium">
                            Este rol tiene acceso completo a todas las funcionalidades del sistema.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(getPermissionsByCategory()).map(([category, categoryPermissions]) => (
                          <div key={category} className="border border-gray-200 rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 mb-3">{category}</h4>
                            <div className="space-y-2">
                              {categoryPermissions.map(permission => (
                                <label key={permission.id} className="flex items-start">
                                  <input
                                    type="checkbox"
                                    checked={selectedRole.permissions.includes(permission.id)}
                                    onChange={() => handlePermissionToggle(permission.id)}
                                    disabled={!isEditing}
                                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                                  />
                                  <div className="ml-3">
                                    <span className="text-sm font-medium text-gray-700">{permission.name}</span>
                                    <p className="text-xs text-gray-500">{permission.description}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Fecha de creación</p>
                      <p className="text-sm text-gray-600">{selectedRole.createdAt}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Última modificación</p>
                      <p className="text-sm text-gray-600">{selectedRole.updatedAt}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // No role selected
              <div className="p-12 text-center">
                <Shield className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Selecciona un rol</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Elige un rol de la lista para ver sus detalles y permisos
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}