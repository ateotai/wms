// =====================================================
// TIPOS TYPESCRIPT PARA SISTEMA DE ROLES Y PERMISOS
// =====================================================

// =====================================================
// ENUMS Y TIPOS BÁSICOS
// =====================================================

/**
 * Roles de usuario disponibles en el sistema WMS
 */
export enum UserRole {
  ADMIN = 'ADMIN',       // Acceso completo a todas las funcionalidades
  MANAGER = 'MANAGER',   // Acceso a operaciones de gestión y reportes
  OPERATOR = 'OPERATOR', // Acceso a operaciones operativas (recepciones, envíos)
  VIEWER = 'VIEWER'      // Acceso solo de lectura
}

/**
 * Recursos del sistema sobre los que se pueden aplicar permisos
 */
export enum Resource {
  USERS = 'users',
  WAREHOUSES = 'warehouses',
  PRODUCTS = 'products',
  INVENTORY = 'inventory',
  PURCHASE_ORDERS = 'purchase_orders',
  SALES_ORDERS = 'sales_orders',
  TRANSFERS = 'transfers',
  REPORTS = 'reports',
  SETTINGS = 'settings',
  CYCLE_COUNTS = 'cycle_counts'
}

/**
 * Acciones que se pueden realizar sobre los recursos
 */
export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete'
}

// =====================================================
// INTERFACES PRINCIPALES
// =====================================================

/**
 * Interfaz para un permiso específico
 */
export interface Permission {
  resource: Resource;
  action: Action;
  allowed: boolean;
}

/**
 * Interfaz para el perfil de usuario extendido con roles
 */
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  permissions?: Permission[];
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

/**
 * Interfaz para estadísticas de usuarios por rol
 */
export interface UserRoleStats {
  role: UserRole;
  total_users: number;
  active_users: number;
  inactive_users: number;
  recent_logins: number;
}

/**
 * Interfaz para la respuesta de verificación de permisos
 */
export interface PermissionCheck {
  hasPermission: boolean;
  resource: Resource;
  action: Action;
  userRole: UserRole;
}

// =====================================================
// TIPOS PARA CONTEXTO DE AUTENTICACIÓN
// =====================================================

/**
 * Contexto de usuario autenticado con roles y permisos
 */
export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  permissions: Permission[];
  is_active: boolean;
}

/**
 * Estado del contexto de autenticación
 */
export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

// =====================================================
// TIPOS PARA FORMULARIOS Y OPERACIONES
// =====================================================

/**
 * Datos para crear/actualizar usuario
 */
export interface UserFormData {
  email: string;
  full_name: string;
  role: UserRole;
  is_active?: boolean;
}

/**
 * Datos para asignar rol a usuario
 */
export interface RoleAssignment {
  userId: string;
  role: UserRole;
  assignedBy: string;
}

// =====================================================
// MAPAS DE PERMISOS POR ROL
// =====================================================

/**
 * Definición de permisos por rol
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Usuarios
    { resource: Resource.USERS, action: Action.CREATE, allowed: true },
    { resource: Resource.USERS, action: Action.READ, allowed: true },
    { resource: Resource.USERS, action: Action.UPDATE, allowed: true },
    { resource: Resource.USERS, action: Action.DELETE, allowed: true },
    // Almacenes
    { resource: Resource.WAREHOUSES, action: Action.CREATE, allowed: true },
    { resource: Resource.WAREHOUSES, action: Action.READ, allowed: true },
    { resource: Resource.WAREHOUSES, action: Action.UPDATE, allowed: true },
    { resource: Resource.WAREHOUSES, action: Action.DELETE, allowed: true },
    // Productos
    { resource: Resource.PRODUCTS, action: Action.CREATE, allowed: true },
    { resource: Resource.PRODUCTS, action: Action.READ, allowed: true },
    { resource: Resource.PRODUCTS, action: Action.UPDATE, allowed: true },
    { resource: Resource.PRODUCTS, action: Action.DELETE, allowed: true },
    // Inventario
    { resource: Resource.INVENTORY, action: Action.CREATE, allowed: true },
    { resource: Resource.INVENTORY, action: Action.READ, allowed: true },
    { resource: Resource.INVENTORY, action: Action.UPDATE, allowed: true },
    { resource: Resource.INVENTORY, action: Action.DELETE, allowed: true },
    // Órdenes de compra
    { resource: Resource.PURCHASE_ORDERS, action: Action.CREATE, allowed: true },
    { resource: Resource.PURCHASE_ORDERS, action: Action.READ, allowed: true },
    { resource: Resource.PURCHASE_ORDERS, action: Action.UPDATE, allowed: true },
    { resource: Resource.PURCHASE_ORDERS, action: Action.DELETE, allowed: true },
    // Órdenes de venta
    { resource: Resource.SALES_ORDERS, action: Action.CREATE, allowed: true },
    { resource: Resource.SALES_ORDERS, action: Action.READ, allowed: true },
    { resource: Resource.SALES_ORDERS, action: Action.UPDATE, allowed: true },
    { resource: Resource.SALES_ORDERS, action: Action.DELETE, allowed: true },
    // Transferencias
    { resource: Resource.TRANSFERS, action: Action.CREATE, allowed: true },
    { resource: Resource.TRANSFERS, action: Action.READ, allowed: true },
    { resource: Resource.TRANSFERS, action: Action.UPDATE, allowed: true },
    { resource: Resource.TRANSFERS, action: Action.DELETE, allowed: true },
    // Reportes y configuración
    { resource: Resource.REPORTS, action: Action.READ, allowed: true },
    { resource: Resource.SETTINGS, action: Action.UPDATE, allowed: true }
  ],

  [UserRole.MANAGER]: [
    // Usuarios (solo lectura)
    { resource: Resource.USERS, action: Action.READ, allowed: true },
    // Almacenes
    { resource: Resource.WAREHOUSES, action: Action.READ, allowed: true },
    { resource: Resource.WAREHOUSES, action: Action.UPDATE, allowed: true },
    // Productos
    { resource: Resource.PRODUCTS, action: Action.CREATE, allowed: true },
    { resource: Resource.PRODUCTS, action: Action.READ, allowed: true },
    { resource: Resource.PRODUCTS, action: Action.UPDATE, allowed: true },
    // Inventario
    { resource: Resource.INVENTORY, action: Action.READ, allowed: true },
    { resource: Resource.INVENTORY, action: Action.UPDATE, allowed: true },
    // Órdenes de compra
    { resource: Resource.PURCHASE_ORDERS, action: Action.CREATE, allowed: true },
    { resource: Resource.PURCHASE_ORDERS, action: Action.READ, allowed: true },
    { resource: Resource.PURCHASE_ORDERS, action: Action.UPDATE, allowed: true },
    // Órdenes de venta
    { resource: Resource.SALES_ORDERS, action: Action.CREATE, allowed: true },
    { resource: Resource.SALES_ORDERS, action: Action.READ, allowed: true },
    { resource: Resource.SALES_ORDERS, action: Action.UPDATE, allowed: true },
    // Transferencias
    { resource: Resource.TRANSFERS, action: Action.CREATE, allowed: true },
    { resource: Resource.TRANSFERS, action: Action.READ, allowed: true },
    { resource: Resource.TRANSFERS, action: Action.UPDATE, allowed: true },
    // Reportes
    { resource: Resource.REPORTS, action: Action.READ, allowed: true }
  ],

  [UserRole.OPERATOR]: [
    // Productos (solo lectura)
    { resource: Resource.PRODUCTS, action: Action.READ, allowed: true },
    // Inventario
    { resource: Resource.INVENTORY, action: Action.READ, allowed: true },
    { resource: Resource.INVENTORY, action: Action.UPDATE, allowed: true },
    // Órdenes de compra (lectura y actualización)
    { resource: Resource.PURCHASE_ORDERS, action: Action.READ, allowed: true },
    { resource: Resource.PURCHASE_ORDERS, action: Action.UPDATE, allowed: true },
    // Órdenes de venta (lectura y actualización)
    { resource: Resource.SALES_ORDERS, action: Action.READ, allowed: true },
    { resource: Resource.SALES_ORDERS, action: Action.UPDATE, allowed: true },
    // Transferencias (lectura y actualización)
    { resource: Resource.TRANSFERS, action: Action.READ, allowed: true },
    { resource: Resource.TRANSFERS, action: Action.UPDATE, allowed: true },
    // Conteos cíclicos
    { resource: Resource.CYCLE_COUNTS, action: Action.CREATE, allowed: true },
    { resource: Resource.CYCLE_COUNTS, action: Action.READ, allowed: true },
    { resource: Resource.CYCLE_COUNTS, action: Action.UPDATE, allowed: true }
  ],

  [UserRole.VIEWER]: [
    // Solo lectura en recursos principales
    { resource: Resource.PRODUCTS, action: Action.READ, allowed: true },
    { resource: Resource.INVENTORY, action: Action.READ, allowed: true },
    { resource: Resource.PURCHASE_ORDERS, action: Action.READ, allowed: true },
    { resource: Resource.SALES_ORDERS, action: Action.READ, allowed: true },
    { resource: Resource.TRANSFERS, action: Action.READ, allowed: true },
    { resource: Resource.REPORTS, action: Action.READ, allowed: true }
  ]
};

// =====================================================
// FUNCIONES UTILITARIAS
// =====================================================

/**
 * Verifica si un usuario tiene permiso para realizar una acción específica
 */
export function hasPermission(
  userRole: UserRole,
  resource: Resource,
  action: Action
): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  return rolePermissions.some(
    permission =>
      permission.resource === resource &&
      permission.action === action &&
      permission.allowed
  );
}

/**
 * Obtiene todos los permisos de un rol específico
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Verifica si un rol puede acceder a un recurso (cualquier acción)
 */
export function canAccessResource(userRole: UserRole, resource: Resource): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  return rolePermissions.some(
    permission => permission.resource === resource && permission.allowed
  );
}

/**
 * Obtiene las acciones permitidas para un rol en un recurso específico
 */
export function getAllowedActions(userRole: UserRole, resource: Resource): Action[] {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  return rolePermissions
    .filter(permission => permission.resource === resource && permission.allowed)
    .map(permission => permission.action);
}

/**
 * Verifica si un rol es superior a otro (para jerarquía de permisos)
 */
export function isHigherRole(role1: UserRole, role2: UserRole): boolean {
  const hierarchy = {
    [UserRole.ADMIN]: 4,
    [UserRole.MANAGER]: 3,
    [UserRole.OPERATOR]: 2,
    [UserRole.VIEWER]: 1
  };
  
  return hierarchy[role1] > hierarchy[role2];
}

/**
 * Obtiene la descripción de un rol
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions = {
    [UserRole.ADMIN]: 'Acceso completo a todas las funcionalidades',
    [UserRole.MANAGER]: 'Acceso a operaciones de gestión y reportes',
    [UserRole.OPERATOR]: 'Acceso a operaciones operativas (recepciones, envíos)',
    [UserRole.VIEWER]: 'Acceso solo de lectura'
  };
  
  return descriptions[role];
}

/**
 * Obtiene el color asociado a un rol (para UI)
 */
export function getRoleColor(role: UserRole): string {
  const colors = {
    [UserRole.ADMIN]: 'red',
    [UserRole.MANAGER]: 'blue',
    [UserRole.OPERATOR]: 'green',
    [UserRole.VIEWER]: 'gray'
  };
  
  return colors[role];
}