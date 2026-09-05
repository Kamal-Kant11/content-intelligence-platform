import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { AuthContextType, LoginPayload, RegisterPayload, User } from '../types/auth';
import { getMeApi, loginApi, registerApi, tokenStorage } from '../services/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Authentication initialization on application startup
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      const token = tokenStorage.get();

      if (!token) {
        if (isMounted) {
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
        }
        return;
      }

      try {
        const userData = await getMeApi(token);
        if (isMounted) {
          setUser(userData);
          setIsAuthenticated(true);
        }
      } catch {
        // If token is invalid or expired, purge token and reset state
        tokenStorage.remove();
        if (isMounted) {
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload): Promise<void> => {
    // 1. POST /auth/login -> store access_token
    const loginRes = await loginApi(payload);
    tokenStorage.set(loginRes.access_token);

    try {
      // 2. GET /auth/me -> only after this succeeds is the user authenticated
      const userData = await getMeApi(loginRes.access_token);
      setUser(userData);
      setIsAuthenticated(true);
    } catch (err) {
      tokenStorage.remove();
      setUser(null);
      setIsAuthenticated(false);
      throw err;
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload): Promise<User> => {
    // Registration returns user data but does NOT log the user in
    const newUser = await registerApi(payload);
    return newUser;
  }, []);

  const logout = useCallback((): void => {
    tokenStorage.remove();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
