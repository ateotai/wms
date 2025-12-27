import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserRole, ROLE_PERMISSIONS } from '../types/roles';
import type { LocalUser } from '../utils/localAuth';

interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  permissions: Array<{ resource: string; action: string; allowed?: boolean } | string>;
  is_active: boolean;
  last_login?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: { message: string } | null }>;
  signOut: () => Promise<void>;
  hasPermission: (resource: string, action: string) => boolean;
  hasPermissionId: (permissionId: string) => boolean;
  refreshUserProfile: () => Promise<void>;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const LOCAL_USER_KEY = 'local_user';
  const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';

  // Helper: normalize permissions (fallback to role defaults when empty)
  const normalizePermissions = (
    role: UserRole,
    perms?: Array<{ resource: string; action: string; allowed?: boolean } | string>
  ) => {
    return Array.isArray(perms) && perms.length > 0 ? perms : ROLE_PERMISSIONS[role] || [];
  };

  // Inicializar sesión local controlada por el sistema (sin Supabase Auth)
  useEffect(() => {
    const init = async () => {
      try {
        if (!AUTH_BACKEND_URL) {
          try {
            const { initializeLocalUsers } = await import('../utils/localAuth');
            initializeLocalUsers();
          } catch { void 0; }
        }
        const raw = localStorage.getItem(LOCAL_USER_KEY);
        if (raw) {
          const parsed: AuthUser = JSON.parse(raw);
          const perms = normalizePermissions(parsed.role, parsed.permissions);
          setUser({ ...parsed, permissions: perms });
        }
        const t = localStorage.getItem('app_token');
        setToken(t || null);
      } catch (error) {
        console.error('Error leyendo usuario local:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [AUTH_BACKEND_URL]);

  // Verificar token y perfil al iniciar cuando hay backend
  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = localStorage.getItem('app_token');
        if (!AUTH_BACKEND_URL || !token) return;
        const resp = await fetch(`${AUTH_BACKEND_URL}/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (resp.status === 401) {
          localStorage.removeItem('app_token');
          localStorage.removeItem(LOCAL_USER_KEY);
          setUser(null);
        } else if (resp.ok) {
          const { user: apiUser } = await resp.json();
          // En entorno de desarrollo, promover rol si se desea
          const devRole = (import.meta.env.VITE_DEV_ROLE || '') as UserRole;
          try {
            if (import.meta.env.DEV && devRole && apiUser.role !== devRole) {
              await fetch(`${AUTH_BACKEND_URL}/users/${apiUser.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ role: devRole }),
              }).catch(() => {});
              // Releer perfil actualizado
              const meResp = await fetch(`${AUTH_BACKEND_URL}/me`, { headers: { Authorization: `Bearer ${token}` } });
              if (meResp.ok) {
                const { user: updated } = await meResp.json();
                apiUser.role = updated.role || devRole;
                apiUser.permissions = updated.permissions || apiUser.permissions;
              } else {
                apiUser.role = devRole;
              }
            }
          } catch {}
          const mapped: AuthUser = {
            id: apiUser.id,
            email: apiUser.email || '',
            full_name: apiUser.full_name || '',
            role: (apiUser.role as UserRole) || UserRole.OPERATOR,
            permissions: normalizePermissions((apiUser.role as UserRole) || UserRole.OPERATOR, apiUser.permissions),
            is_active: apiUser.is_active ?? true,
            last_login: apiUser.last_login || undefined,
          };
          setUser(mapped);
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mapped));
        }
      } catch {
        // Silenciar errores de red inicialmente
      }
    };
    checkToken();
  }, [AUTH_BACKEND_URL]);

  // Auto-login de desarrollo: crea/inicia sesión si no hay token
  useEffect(() => {
    const bootstrapDevUser = async () => {
      try {
        if (!import.meta.env.DEV) return;
        if (!AUTH_BACKEND_URL) return;
        const token = localStorage.getItem('app_token');
        const raw = localStorage.getItem(LOCAL_USER_KEY);
        if (token && raw) return;
        const email = import.meta.env.VITE_DEV_EMAIL || 'admin@local.dev';
        const password = import.meta.env.VITE_DEV_PASSWORD || 'Test1234!';
        const devRole = (import.meta.env.VITE_DEV_ROLE || 'ADMIN') as UserRole;
        let resp = await fetch(`${AUTH_BACKEND_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (resp.status === 401 || resp.status === 404) {
          await fetch(`${AUTH_BACKEND_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Crear usuario de desarrollo con rol configurable (por defecto ADMIN)
            body: JSON.stringify({ email, password, full_name: 'Dev User', role: devRole }),
          }).catch(() => { void 0; });
          resp = await fetch(`${AUTH_BACKEND_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
        }
        if (!resp.ok) return;
        const { token: tk, user: apiUser } = await resp.json();
        // Si el usuario existe y su rol no coincide con el deseado, actualizarlo
        try {
          const currentRole = (apiUser.role as UserRole) || UserRole.OPERATOR;
          if (currentRole !== devRole) {
            await fetch(`${AUTH_BACKEND_URL}/users/${apiUser.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${tk}`,
              },
              body: JSON.stringify({ role: devRole }),
            }).catch(() => { void 0; });
            // Refrescar el perfil tras actualizar rol
            const meResp = await fetch(`${AUTH_BACKEND_URL}/me`, { headers: { Authorization: `Bearer ${tk}` } });
            if (meResp.ok) {
              const { user: updated } = await meResp.json();
              apiUser.role = updated.role || devRole;
              apiUser.permissions = updated.permissions || apiUser.permissions;
            } else {
              apiUser.role = devRole;
            }
          }
        } catch { void 0; }
        const mapped: AuthUser = {
          id: apiUser.id,
          email: apiUser.email || email,
          full_name: apiUser.full_name || 'Dev User',
          role: (apiUser.role as UserRole) || devRole || UserRole.OPERATOR,
          permissions: normalizePermissions((apiUser.role as UserRole) || UserRole.OPERATOR, apiUser.permissions),
          is_active: apiUser.is_active ?? true,
          last_login: apiUser.last_login || undefined,
        };
        setUser(mapped);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mapped));
        localStorage.setItem('app_token', tk);
        setToken(tk);
      } catch { void 0; }
    };
    bootstrapDevUser();
  }, [AUTH_BACKEND_URL]);

  const signIn = async (email: string, password: string): Promise<{ error: { message: string } | null }> => {
    try {
      if (!AUTH_BACKEND_URL) {
        const { authenticateUser } = await import('../utils/localAuth');
        const result = authenticateUser({ email, password });
        if (!result.success || !result.user) {
          return { error: { message: result.error || 'Credenciales inválidas' } };
        }
        const mapped: AuthUser = {
          id: result.user.id,
          email: result.user.email,
          full_name: result.user.full_name || '',
          role: (result.user.role as UserRole) || UserRole.OPERATOR,
          permissions: normalizePermissions((result.user.role as UserRole) || UserRole.OPERATOR, Array.isArray((result.user as unknown as { permissions?: unknown }).permissions) ? ((result.user as unknown as { permissions?: Array<{ resource: string; action: string; allowed?: boolean } | string> }).permissions) : []),
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
        permissions: normalizePermissions((apiUser.role as UserRole) || UserRole.OPERATOR, apiUser.permissions),
        is_active: apiUser.is_active ?? true,
        last_login: apiUser.last_login || undefined,
      };
      setUser(mapped);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mapped));
      localStorage.setItem('app_token', token);
      setToken(token);
      return { error: null };
    } catch (error: unknown) {
      console.error('Error en signIn (local):', error);
      const message = error instanceof Error ? error.message : 'Error desconocido en inicio de sesión';
      return { error: { message } };
    }
  };

  const signUp = async (email: string, password: string, fullName: string): Promise<{ error: { message: string } | null }> => {
    try {
      if (!AUTH_BACKEND_URL) {
        const { createLocalUser } = await import('../utils/localAuth');
        const res = createLocalUser({
          email,
          password,
          full_name: fullName,
          role: UserRole.OPERATOR,
          permissions: ROLE_PERMISSIONS[UserRole.OPERATOR],
          is_active: true,
        } as Omit<LocalUser, 'id' | 'created_at' | 'updated_at'>);
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
    } catch (error: unknown) {
      console.error('Error en signUp (local):', error);
      const message = error instanceof Error ? error.message : 'Error desconocido en registro';
      return { error: { message } };
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem(LOCAL_USER_KEY);
      localStorage.removeItem('app_token');
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Error en signOut (local):', error);
    }
  };

  const hasPermission = (resource: string, action: string): boolean => {
    if (!user) return false;
    if (user.role === UserRole.ADMIN) return true;
    const permissions = user.permissions || [];
    return permissions.some((p) => {
      if (typeof p === 'string') return p === 'all';
      if (p && typeof p === 'object') {
        const res = (p as { resource?: string }).resource || '';
        const act = (p as { action?: string }).action || '';
        const allowed = (p as { allowed?: boolean }).allowed;
        return res === resource && act === action && (allowed ?? true);
      }
      return false;
    });
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
    return permissions.some((p) => {
      if (p === 'all') return true;
      if (typeof p === 'string') return candidates.includes(p.toLowerCase());
      if (p && typeof p === 'object') {
        const pid = (p as { id?: string }).id;
        if (typeof pid === 'string') return candidates.includes(pid.toLowerCase());
        const res = ((p as { resource?: string }).resource || '').toLowerCase();
        const act = ((p as { action?: string }).action || '').toLowerCase();
        const combinedDot = res && act ? `${res}.${act}` : '';
        const combinedUnd = res && act ? `${res}_${act}` : '';
        const allowed = (p as { allowed?: boolean }).allowed;
        return (candidates.includes(combinedDot) || candidates.includes(combinedUnd)) && (allowed ?? true);
      }
      return false;
    });
  };

  const refreshUserProfile = async () => {
    try {
      const raw = localStorage.getItem(LOCAL_USER_KEY);
      if (!raw) return;
      const token = localStorage.getItem('app_token');
      if (!AUTH_BACKEND_URL || !token) return;
      const resp = await fetch(`${AUTH_BACKEND_URL}/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (resp.status === 401) {
        localStorage.removeItem('app_token');
        localStorage.removeItem(LOCAL_USER_KEY);
        setUser(null);
        return;
      }
      if (resp.ok) {
        const { user: apiUser } = await resp.json();
        const mapped: AuthUser = {
          id: apiUser.id,
          email: apiUser.email || '',
          full_name: apiUser.full_name || '',
          role: (apiUser.role as UserRole) || UserRole.OPERATOR,
          permissions: normalizePermissions((apiUser.role as UserRole) || UserRole.OPERATOR, apiUser.permissions),
          is_active: apiUser.is_active ?? true,
          last_login: apiUser.last_login || undefined,
        };
        setUser(mapped);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mapped));
      }
    } catch (error: unknown) {
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
    token,
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
