// =====================================================
// SISTEMA DE AUTENTICACIÓN LOCAL
// =====================================================

import { UserRole, Permission, ROLE_PERMISSIONS } from '../types/roles';

export interface LocalUser {
  id: string;
  email: string;
  password: string; // En producción, esto debería estar hasheado
  full_name: string;
  role: UserRole;
  permissions: Permission[];
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: Omit<LocalUser, 'password'>;
  error?: string;
}

const STORAGE_KEY = 'wms_local_users';
const CURRENT_USER_KEY = 'wms_current_user';

// =====================================================
// FUNCIONES DE GESTIÓN DE USUARIOS LOCALES
// =====================================================

/**
 * Inicializa el sistema con usuarios por defecto
 */
export function initializeLocalUsers(): void {
  const existingUsers = getLocalUsers();
  
  if (existingUsers.length === 0) {
    const defaultUsers: LocalUser[] = [
      {
        id: 'admin-001',
        email: 'admin@wms.com',
        password: 'Admin123!', // En producción usar hash
        full_name: 'Administrador Principal',
        role: UserRole.ADMIN,
        permissions: ROLE_PERMISSIONS[UserRole.ADMIN],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'manager-001',
        email: 'manager@wms.com',
        password: 'Manager123!',
        full_name: 'Gerente de Almacén',
        role: UserRole.MANAGER,
        permissions: ROLE_PERMISSIONS[UserRole.MANAGER],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'operator-001',
        email: 'operator@wms.com',
        password: 'Operator123!',
        full_name: 'Operador de Almacén',
        role: UserRole.OPERATOR,
        permissions: ROLE_PERMISSIONS[UserRole.OPERATOR],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultUsers));
  }
}

/**
 * Obtiene todos los usuarios locales
 */
export function getLocalUsers(): LocalUser[] {
  try {
    const users = localStorage.getItem(STORAGE_KEY);
    return users ? JSON.parse(users) : [];
  } catch (error) {
    console.error('Error al obtener usuarios locales:', error);
    return [];
  }
}

/**
 * Guarda usuarios en localStorage
 */
export function saveLocalUsers(users: LocalUser[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Error al guardar usuarios locales:', error);
  }
}

/**
 * Busca un usuario por email
 */
export function findUserByEmail(email: string): LocalUser | null {
  const users = getLocalUsers();
  return users.find(user => user.email.toLowerCase() === email.toLowerCase()) || null;
}

/**
 * Autentica un usuario con email y contraseña
 */
export function authenticateUser(credentials: LoginCredentials): AuthResult {
  try {
    const user = findUserByEmail(credentials.email);
    
    if (!user) {
      return {
        success: false,
        error: 'Usuario no encontrado'
      };
    }

    if (!user.is_active) {
      return {
        success: false,
        error: 'Usuario inactivo'
      };
    }

    // En producción, aquí se compararía con hash
    if (user.password !== credentials.password) {
      return {
        success: false,
        error: 'Contraseña incorrecta'
      };
    }

    // Actualizar último login
    const users = getLocalUsers();
    const userIndex = users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      users[userIndex].last_login = new Date().toISOString();
      saveLocalUsers(users);
    }

    // Remover password del resultado sin variables no usadas
    const userWithoutPassword: Omit<LocalUser, 'password'> = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      permissions: user.permissions,
      is_active: user.is_active,
      last_login: user.last_login,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
    
    return {
      success: true,
      user: {
        ...userWithoutPassword,
        last_login: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error en autenticación:', error);
    return {
      success: false,
      error: 'Error interno de autenticación'
    };
  }
}

/**
 * Crea un nuevo usuario local
 */
export function createLocalUser(userData: Omit<LocalUser, 'id' | 'created_at' | 'updated_at'>): AuthResult {
  try {
    const existingUser = findUserByEmail(userData.email);
    
    if (existingUser) {
      return {
        success: false,
        error: 'El email ya está registrado'
      };
    }

    const newUser: LocalUser = {
      ...userData,
      id: `user-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const users = getLocalUsers();
    users.push(newUser);
    saveLocalUsers(users);

    const userWithoutPassword: Omit<LocalUser, 'password'> = {
      id: newUser.id,
      email: newUser.email,
      full_name: newUser.full_name,
      role: newUser.role,
      permissions: newUser.permissions,
      is_active: newUser.is_active,
      last_login: newUser.last_login,
      created_at: newUser.created_at,
      updated_at: newUser.updated_at
    };
    
    return {
      success: true,
      user: userWithoutPassword
    };
  } catch (error) {
    console.error('Error al crear usuario:', error);
    return {
      success: false,
      error: 'Error al crear usuario'
    };
  }
}

/**
 * Guarda el usuario actual en sesión
 */
export function setCurrentUser(user: Omit<LocalUser, 'password'> | null): void {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (error) {
    console.error('Error al guardar usuario actual:', error);
  }
}

/**
 * Obtiene el usuario actual de la sesión
 */
export function getCurrentUser(): Omit<LocalUser, 'password'> | null {
  try {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error al obtener usuario actual:', error);
    return null;
  }
}

/**
 * Cierra la sesión del usuario actual
 */
export function signOut(): void {
  setCurrentUser(null);
}

/**
 * Verifica si el usuario tiene un permiso específico
 */
export function hasPermission(user: Omit<LocalUser, 'password'>, resource: string, action: string): boolean {
  if (!user || !user.permissions) return false;
  
  return user.permissions.some(permission => 
    permission.resource === resource && 
    permission.action === action && 
    permission.allowed
  );
}

/**
 * Obtiene todos los permisos del usuario
 */
export function getUserPermissions(user: Omit<LocalUser, 'password'>): Permission[] {
  return user?.permissions || [];
}