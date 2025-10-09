import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserRole, ROLE_PERMISSIONS } from '../types/roles';
import { initializeLocalUsers, authenticateUser, createLocalUser } from '../utils/localAuth';

interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  permissions: any[];
  is_active: boolean;
  last_login?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasPermission: (resource: string, action: string) => boolean;
  hasPermissionId: (permissionId: string) => boolean;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const LOCAL_USER_KEY = 'local_user';
  const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';

  // Inicializar sesión local controlada por el sistema (sin Supabase Auth)
  useEffect(() => {
    try {
      // Asegura usuarios locales por defecto si no hay backend
      if (!AUTH_BACKEND_URL) {
        initializeLocalUsers();
      }
      const raw = localStorage.getItem(LOCAL_USER_KEY);
      if (raw) {
        const parsed: AuthUser = JSON.parse(raw);
        setUser(parsed);
      }
    } catch (error) {
      console.error('Error leyendo usuario local:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      if (!AUTH_BACKEND_URL) {
        // Fallback a autenticación local cuando no hay backend configurado (demo en Vercel)
        const result = authenticateUser({ email, password });
        if (!result.success || !result.user) {
          return { error: { message: result.error || 'Credenciales inválidas' } };
        }
        const mapped: AuthUser = {
          id: result.user.id,
          email: result.user.email,
          full_name: result.user.full_name || '',
          role: (result.user.role as UserRole) || UserRole.OPERATOR,
          permissions: result.user.permissions || [],
          is_active: result.user.is_active ?? true,
          last_login: result.user.last_login,
        };
        setUser(mapped);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mapped));
        localStorage.removeItem('app_token');
        return { error: null };
      }
      const resp = await fetch(`${AUTH_BACKEND_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        return { error: { message: text || 'Credenciales inválidas' } };
      }
      const { token, user: apiUser } = await resp.json();
      const mapped: AuthUser = {
        id: apiUser.id,
        email: apiUser.email,
        full_name: apiUser.full_name || '',
        role: (apiUser.role as UserRole) || UserRole.OPERATOR,
        permissions: apiUser.permissions || [],
        is_active: apiUser.is_active ?? true,
        last_login: apiUser.last_login || undefined,
      };
      setUser(mapped);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mapped));
      localStorage.setItem('app_token', token);
      return { error: null };
    } catch (error: any) {
      console.error('Error en signIn (local):', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      if (!AUTH_BACKEND_URL) {
        // Registro local cuando no hay backend
        const res = createLocalUser({
          email,
          password,
          full_name: fullName,
          role: UserRole.OPERATOR,
          permissions: ROLE_PERMISSIONS[UserRole.OPERATOR],
          is_active: true,
        } as any);
        if (!res.success) {
          return { error: { message: res.error || 'No se pudo registrar' } };
        }
        return { error: null };
      }
      const resp = await fetch(`${AUTH_BACKEND_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        return { error: { message: text || 'No se pudo registrar' } };
      }
      return { error: null };
    } catch (error: any) {
      console.error('Error en signUp (local):', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem(LOCAL_USER_KEY);
      localStorage.removeItem('app_token');
      setUser(null);
    } catch (error) {
      console.error('Error en signOut (local):', error);
    }
  };

  const hasPermission = (resource: string, action: string): boolean => {
    if (!user) return false;
    if (user.role === UserRole.ADMIN) return true;
    const permissions = user.permissions || [];
    return permissions.some((p: any) => p?.resource === resource && p?.action === action && p?.allowed);
  };

  // Verifica permisos por identificador (por ejemplo: "inventory.view") o acceso total
  const hasPermissionId = (permissionId: string): boolean => {
    if (!user) return false;
    if (user.role === UserRole.ADMIN) return true;
    const permissions = user.permissions || [];

    // Normaliza equivalencias ("view" ≈ "read" y recursos equivalentes)
    const buildAliases = (pid: string): string[] => {
      const [rawRes, rawAct] = pid.split('.') as [string, string?];
      const action = (rawAct || 'view').toLowerCase();
      const actionAliases = action === 'view' ? ['view', 'read']
        : action === 'manage' ? ['manage', 'write', 'update']
        : [action];
      const resourceAliasesMap: Record<string, string[]> = {
        warehouse: ['warehouse', 'warehouses'],
        warehouses: ['warehouse', 'warehouses'],
        settings: ['settings', 'config'],
        config: ['settings', 'config'],
      };
      const resKey = (rawRes || '').toLowerCase();
      const resAliases = resourceAliasesMap[resKey] || [resKey];

      const out: string[] = [];
      for (const r of resAliases) {
        for (const a of actionAliases) {
          out.push(`${r}.${a}`);
          out.push(`${r}_${a}`);
        }
      }
      return Array.from(new Set(out));
    };

    const candidates = buildAliases(permissionId);
    return permissions.some((p: any) => {
      if (p === 'all') return true;
      if (typeof p === 'string') return candidates.includes(p.toLowerCase());
      if (p && typeof p === 'object') {
        // Soporta objetos con campo id o con resource/action
        if (typeof p.id === 'string') return candidates.includes(p.id.toLowerCase());
        const res = (p?.resource || '').toLowerCase();
        const act = (p?.action || '').toLowerCase();
        const combinedDot = res && act ? `${res}.${act}` : '';
        const combinedUnd = res && act ? `${res}_${act}` : '';
        return (candidates.includes(combinedDot) || candidates.includes(combinedUnd)) && (p?.allowed ?? true);
      }
      return false;
    });
  };

  const refreshUserProfile = async () => {
    try {
      const raw = localStorage.getItem(LOCAL_USER_KEY);
      if (!raw) return;
      const local = JSON.parse(raw) as AuthUser;
      const token = localStorage.getItem('app_token');
      if (!AUTH_BACKEND_URL || !token) return;
      const resp = await fetch(`${AUTH_BACKEND_URL}/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (resp.ok) {
        const { user: apiUser } = await resp.json();
        const mapped: AuthUser = {
          id: apiUser.id,
          email: apiUser.email || '',
          full_name: apiUser.full_name || '',
          role: (apiUser.role as UserRole) || UserRole.OPERATOR,
          permissions: apiUser.permissions || [],
          is_active: apiUser.is_active ?? true,
          last_login: apiUser.last_login || undefined,
        };
        setUser(mapped);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mapped));
      }
    } catch (error) {
      console.error('Error refrescando perfil (local):', error);
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    hasPermission,
    hasPermissionId,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}