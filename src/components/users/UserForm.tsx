import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Save, 
  X, 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Eye, 
  EyeOff,
  AlertCircle,
  CheckCircle,
  Building,
  MapPin,
  RefreshCw
} from 'lucide-react';
const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';

interface UserFormData {
  full_name: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';
  is_active: boolean;
  password: string;
  confirmPassword: string;
  department: string;
  permissions: string[];
}

interface FormErrors {
  [key: string]: string;
}

export function UserForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  
  const [formData, setFormData] = useState<UserFormData>({
    full_name: '',
    email: '',
    phone: '',
    role: 'OPERATOR',
    is_active: true,
    password: '',
    confirmPassword: '',
    department: '',
    permissions: []
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [availableRoles, setAvailableRoles] = useState<string[]>(['ADMIN','MANAGER','OPERATOR','VIEWER']);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const token = localStorage.getItem('app_token');
        if (!AUTH_BACKEND_URL || !token) return;
        const resp = await fetch(`${AUTH_BACKEND_URL}/roles`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resp.ok) {
          const json = await resp.json();
          const names = (json.roles || []).map((r: any) => r.name).filter(Boolean);
          if (names.length) setAvailableRoles(names);
        }
      } catch (e) {
        console.warn('No se pudieron cargar roles desde backend, usando valores por defecto');
      }
    };
    loadRoles();
  }, []);

  const departments = [
    'Almacén',
    'Logística',
    'Inventario',
    'Recepción',
    'Picking',
    'Packing',
    'Administración',
    'IT'
  ];

  const locations = [
    'Almacén Principal',
    'Almacén Secundario',
    'Centro de Distribución Norte',
    'Centro de Distribución Sur',
    'Oficinas Centrales'
  ];

  const permissions = [
    { id: 'inventory_read', label: 'Ver inventario', category: 'Inventario' },
    { id: 'inventory_write', label: 'Modificar inventario', category: 'Inventario' },
    { id: 'orders_read', label: 'Ver pedidos', category: 'Pedidos' },
    { id: 'orders_write', label: 'Gestionar pedidos', category: 'Pedidos' },
    { id: 'reports_read', label: 'Ver reportes', category: 'Reportes' },
    { id: 'reports_write', label: 'Crear reportes', category: 'Reportes' },
    { id: 'users_read', label: 'Ver usuarios', category: 'Usuarios' },
    { id: 'users_write', label: 'Gestionar usuarios', category: 'Usuarios' },
    { id: 'config_read', label: 'Ver configuración', category: 'Configuración' },
    { id: 'config_write', label: 'Modificar configuración', category: 'Configuración' }
  ];

  useEffect(() => {
    if (isEditing && id) {
      fetchUser(id);
    }
  }, [isEditing, id]);

  const fetchUser = async (userId: string) => {
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem('app_token');
      if (!AUTH_BACKEND_URL) throw new Error('Backend no configurado');
      const resp = await fetch(`${AUTH_BACKEND_URL}/users/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(text || 'Error al cargar el usuario');
      }
      const { user: data } = await resp.json();
      if (data) {
        setFormData({
          full_name: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          role: data.role || 'OPERATOR',
          is_active: data.is_active ?? true,
          password: '',
          confirmPassword: '',
          department: data.department || '',
          permissions: data.permissions || []
        });
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      setErrors({ general: 'Error al cargar los datos del usuario' });
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'El nombre es obligatorio';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El formato del email no es válido';
    }

    if (!isEditing) {
      if (!formData.password) {
        newErrors.password = 'La contraseña es obligatoria';
      } else if (formData.password.length < 8) {
        newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('app_token');
      if (!AUTH_BACKEND_URL) throw new Error('Backend no configurado');
      if (isEditing && id) {
        const resp = await fetch(`${AUTH_BACKEND_URL}/users/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            full_name: formData.full_name,
            phone: formData.phone,
            role: formData.role,
            department: formData.department,
            is_active: formData.is_active,
            permissions: formData.permissions
          })
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => '');
          throw new Error(text || 'Error al actualizar el usuario');
        }
      } else {
        const resp = await fetch(`${AUTH_BACKEND_URL}/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            email: formData.email,
            full_name: formData.full_name,
            phone: formData.phone,
            role: formData.role,
            department: formData.department,
            is_active: formData.is_active,
            password: formData.password,
            permissions: formData.permissions
          })
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => '');
          throw new Error(text || 'Error al crear el usuario');
        }
      }
      
      navigate('/users');
    } catch (error: any) {
      console.error('Error saving user:', error);
      setErrors({ general: error.message || 'Error al guardar el usuario' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof UserFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePermissionChange = (permissionId: string) => {
    const newPermissions = formData.permissions.includes(permissionId)
      ? formData.permissions.filter(p => p !== permissionId)
      : [...formData.permissions, permissionId];
    
    handleInputChange('permissions', newPermissions);
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, typeof permissions>);

  if (isLoading && isEditing) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando datos del usuario...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {isEditing 
                  ? 'Modifica la información del usuario y sus permisos'
                  : 'Completa la información para crear un nuevo usuario'
                }
              </p>
            </div>
            <button
              onClick={() => navigate('/users')}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información Básica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.full_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Ingresa el nombre completo"
                />
                {errors.full_name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.full_name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="usuario@empresa.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="+34 600 123 456"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.phone}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={formData.is_active ? 'active' : 'inactive'}
                  onChange={(e) => handleInputChange('is_active', e.target.value === 'active')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Password Section */}
          {!isEditing && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contraseña</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.password ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar contraseña *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Repite la contraseña"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Work Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información Laboral</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building className="w-4 h-4 inline mr-1" />
                  Departamento
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.department ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Selecciona un departamento</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                {errors.department && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.department}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Role and Permissions */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Rol y Permisos</h3>
            
            {/* Role Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Shield className="w-4 h-4 inline mr-1" />
                Rol del usuario
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableRoles.map(roleName => (
                  <div
                    key={roleName}
                    className={`relative rounded-lg border p-4 cursor-pointer transition-colors ${
                      formData.role === roleName
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleInputChange('role', roleName)}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="role"
                        value={roleName}
                        checked={formData.role === roleName}
                        onChange={() => handleInputChange('role', roleName)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div className="ml-3">
                        <label className="block text-sm font-medium text-gray-900">
                          {roleName}
                        </label>
                        <p className="text-sm text-gray-500">Selecciona el rol adecuado para este usuario</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Permisos específicos
              </label>
              <div className="space-y-4">
                {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
                  <div key={category} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">{category}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categoryPermissions.map(permission => (
                        <label key={permission.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(permission.id)}
                            onChange={() => handlePermissionChange(permission.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{permission.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/users')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEditing ? 'Actualizar Usuario' : 'Crear Usuario'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}