import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '../types';
import { getMe } from '../api/endpoints';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  // Granular permissions: superusers always have all; others check role flags
  canCreateProjects: boolean;
  canManageAssignments: boolean;
  canViewAllTimecards: boolean;
  canManageUsers: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function derivePermission(user: User | null, flag: keyof NonNullable<User['role']>): boolean {
  if (!user) return false;
  if (user.is_superuser) return true;
  return (user.role as unknown as Record<string, unknown>)?.[flag as string] === true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    getMe()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('access_token');
        setToken(null);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const login = async (newToken: string) => {
    localStorage.setItem('access_token', newToken);
    setToken(newToken);
    const me = await getMe();
    setUser(me);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        isAdmin: !!user?.is_superuser,
        canCreateProjects: derivePermission(user, 'can_create_projects'),
        canManageAssignments: derivePermission(user, 'can_manage_assignments'),
        canViewAllTimecards: derivePermission(user, 'can_view_all_timecards'),
        canManageUsers: derivePermission(user, 'can_manage_users'),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
