import { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Shield,
  Key,
  Bell,
  Globe,
  Sun,
  Save,
  Edit,
  Camera,
  Eye,
  EyeOff,
  Check,
  X,
  Clock,
  Activity,
  Settings
} from 'lucide-react';

interface UserProfileData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  role: string;
  avatar?: string;
  address: string;
  city: string;
  country: string;
  timezone: string;
  language: string;
  dateFormat: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    marketing: boolean;
  };
  twoFactorEnabled: boolean;
  lastLogin: string;
  accountCreated: string;
  sessionTimeout: number;
}

export function UserProfile() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'activity'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Mock user data
  const [userData, setUserData] = useState<UserProfileData>({
    id: '1',
    firstName: 'Juan',
    lastName: 'Pérez',
    email: 'juan.perez@empresa.com',
    phone: '+34 600 123 456',
    position: 'Gerente de Almacén',
    department: 'Logística',
    role: 'Administrador',
    address: 'Calle Principal 123',
    city: 'Madrid',
    country: 'España',
    timezone: 'Europe/Madrid',
    language: 'es',
    dateFormat: 'DD/MM/YYYY',
    theme: 'light',
    notifications: {
      email: true,
      push: true,
      sms: false,
      marketing: false
    },
    twoFactorEnabled: true,
    lastLogin: '2024-01-15T08:30:00Z',
    accountCreated: '2023-01-15T00:00:00Z',
    sessionTimeout: 30
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [tempUserData, setTempUserData] = useState<UserProfileData>(userData);

  // Handle profile save
  const handleSaveProfile = () => {
    setUserData(tempUserData);
    setIsEditing(false);
  };

  // Handle password change
  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      alert('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    
    // Here you would make an API call to change the password
    alert('Contraseña cambiada exitosamente');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowPasswordChange(false);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'preferences', label: 'Preferencias', icon: Settings },
    { id: 'activity', label: 'Actividad', icon: Activity }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              {userData.avatar ? (
                <img src={userData.avatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-blue-600" />
              )}
            </div>
            <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700">
              <Camera className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {userData.firstName} {userData.lastName}
            </h1>
            <p className="text-gray-600">{userData.position}</p>
            <p className="text-sm text-gray-500">{userData.department} • {userData.role}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Último acceso: {formatDate(userData.lastLogin)}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Miembro desde: {formatDate(userData.accountCreated)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Información Personal</h3>
                <button
                  onClick={() => {
                    if (isEditing) {
                      setTempUserData(userData);
                    }
                    setIsEditing(!isEditing);
                  }}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  {isEditing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                  {isEditing ? 'Cancelar' : 'Editar'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={isEditing ? tempUserData.firstName : userData.firstName}
                    onChange={(e) => isEditing && setTempUserData({ ...tempUserData, firstName: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    value={isEditing ? tempUserData.lastName : userData.lastName}
                    onChange={(e) => isEditing && setTempUserData({ ...tempUserData, lastName: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="email"
                      value={isEditing ? tempUserData.email : userData.email}
                      onChange={(e) => isEditing && setTempUserData({ ...tempUserData, email: e.target.value })}
                      disabled={!isEditing}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="tel"
                      value={isEditing ? tempUserData.phone : userData.phone}
                      onChange={(e) => isEditing && setTempUserData({ ...tempUserData, phone: e.target.value })}
                      disabled={!isEditing}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cargo
                  </label>
                  <input
                    type="text"
                    value={userData.position}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departamento
                  </label>
                  <input
                    type="text"
                    value={userData.department}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                    <textarea
                      value={isEditing ? tempUserData.address : userData.address}
                      onChange={(e) => isEditing && setTempUserData({ ...tempUserData, address: e.target.value })}
                      disabled={!isEditing}
                      rows={2}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    value={isEditing ? tempUserData.city : userData.city}
                    onChange={(e) => isEditing && setTempUserData({ ...tempUserData, city: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    País
                  </label>
                  <input
                    type="text"
                    value={isEditing ? tempUserData.country : userData.country}
                    onChange={(e) => isEditing && setTempUserData({ ...tempUserData, country: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setTempUserData(userData);
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Guardar Cambios
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Configuración de Seguridad</h3>

              {/* Password Change */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Contraseña</h4>
                    <p className="text-sm text-gray-500">Última actualización hace 30 días</p>
                  </div>
                  <button
                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Key className="w-4 h-4" />
                    Cambiar Contraseña
                  </button>
                </div>

                {showPasswordChange && (
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contraseña actual
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nueva contraseña
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirmar nueva contraseña
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => {
                          setShowPasswordChange(false);
                          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handlePasswordChange}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Actualizar Contraseña
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Two-Factor Authentication */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Autenticación de dos factores</h4>
                    <p className="text-sm text-gray-500">
                      {userData.twoFactorEnabled 
                        ? 'Protege tu cuenta con un código adicional' 
                        : 'Añade una capa extra de seguridad a tu cuenta'
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      userData.twoFactorEnabled 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {userData.twoFactorEnabled ? (
                        <>
                          <Check className="w-3 h-3" />
                          Activado
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3" />
                          Desactivado
                        </>
                      )}
                    </span>
                    <button
                      onClick={() => setUserData({ ...userData, twoFactorEnabled: !userData.twoFactorEnabled })}
                      className={`px-4 py-2 rounded-lg text-white ${
                        userData.twoFactorEnabled 
                          ? 'bg-red-600 hover:bg-red-700' 
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {userData.twoFactorEnabled ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Session Timeout */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Tiempo de sesión</h4>
                    <p className="text-sm text-gray-500">
                      Tu sesión se cerrará automáticamente después de {userData.sessionTimeout} minutos de inactividad
                    </p>
                  </div>
                  <select
                    value={userData.sessionTimeout}
                    onChange={(e) => setUserData({ ...userData, sessionTimeout: parseInt(e.target.value) })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={15}>15 minutos</option>
                    <option value={30}>30 minutos</option>
                    <option value={60}>1 hora</option>
                    <option value={120}>2 horas</option>
                    <option value={240}>4 horas</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Preferencias del Sistema</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Globe className="w-4 h-4 inline mr-2" />
                    Idioma
                  </label>
                  <select
                    value={userData.language}
                    onChange={(e) => setUserData({ ...userData, language: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Zona horaria
                  </label>
                  <select
                    value={userData.timezone}
                    onChange={(e) => setUserData({ ...userData, timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Europe/Madrid">Madrid (GMT+1)</option>
                    <option value="Europe/London">Londres (GMT+0)</option>
                    <option value="America/New_York">Nueva York (GMT-5)</option>
                    <option value="America/Los_Angeles">Los Ángeles (GMT-8)</option>
                  </select>
                </div>

                {/* Date Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Formato de fecha
                  </label>
                  <select
                    value={userData.dateFormat}
                    onChange={(e) => setUserData({ ...userData, dateFormat: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                {/* Theme */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Sun className="w-4 h-4 inline mr-2" />
                    Tema
                  </label>
                  <select
                    value={userData.theme}
                    onChange={(e) => setUserData({ ...userData, theme: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="light">Claro</option>
                    <option value="dark">Oscuro</option>
                    <option value="auto">Automático</option>
                  </select>
                </div>
              </div>

              {/* Notifications */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notificaciones
                </h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Notificaciones por email</span>
                    <input
                      type="checkbox"
                      checked={userData.notifications.email}
                      onChange={(e) => setUserData({
                        ...userData,
                        notifications: { ...userData.notifications, email: e.target.checked }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Notificaciones push</span>
                    <input
                      type="checkbox"
                      checked={userData.notifications.push}
                      onChange={(e) => setUserData({
                        ...userData,
                        notifications: { ...userData.notifications, push: e.target.checked }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Notificaciones SMS</span>
                    <input
                      type="checkbox"
                      checked={userData.notifications.sms}
                      onChange={(e) => setUserData({
                        ...userData,
                        notifications: { ...userData.notifications, sms: e.target.checked }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Marketing y promociones</span>
                    <input
                      type="checkbox"
                      checked={userData.notifications.marketing}
                      onChange={(e) => setUserData({
                        ...userData,
                        notifications: { ...userData.notifications, marketing: e.target.checked }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Actividad Reciente</h3>
              
              <div className="space-y-4">
                {[
                  { action: 'Inicio de sesión', time: '2024-01-15T08:30:00Z', ip: '192.168.1.100', status: 'success' },
                  { action: 'Modificación de perfil', time: '2024-01-14T16:45:00Z', ip: '192.168.1.100', status: 'success' },
                  { action: 'Cambio de contraseña', time: '2024-01-10T10:20:00Z', ip: '192.168.1.100', status: 'success' },
                  { action: 'Intento de acceso fallido', time: '2024-01-08T14:15:00Z', ip: '192.168.1.105', status: 'error' },
                  { action: 'Activación de 2FA', time: '2024-01-05T09:30:00Z', ip: '192.168.1.100', status: 'success' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <p className="font-medium text-gray-900">{activity.action}</p>
                        <p className="text-sm text-gray-500">IP: {activity.ip}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(activity.time)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
