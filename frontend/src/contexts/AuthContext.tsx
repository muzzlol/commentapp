import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authService } from '@/services/auth';

interface User {
  id: string;
  email: string;
  pfpUrl?: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({
          id: payload.sub,
          email: payload.email,
          pfpUrl: payload.pfpUrl,
        });
      } catch (error) {
        console.error('Invalid token:', error);
        authService.removeToken();
      }
    }
    setIsLoading(false);
  }, []);

  const login = (token: string, userData: User) => {
    authService.setToken(token);
    setUser(userData);
  };

  const logout = () => {
    authService.removeToken();
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}