import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  restoreSession as apiRestoreSession,
  googleSession,
  saveAccountProfile,
  AuthUser,
} from '../services/auth/auth.service';
import { onSessionExpired } from '../services/api/api-client';
import type { AccountProfile, LoginDto, RegisterDto, GoogleLoginDto, ProfileUpdateDto } from '@encanto/shared';

interface AuthContextData {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  loginWithGoogle: (data: GoogleLoginDto, link?: boolean) => Promise<void>;
  updateProfile: (data: ProfileUpdateDto) => Promise<AccountProfile>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // intento recuperar la sesion guardada de forma segura al abrir la app
  const checkSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const session = await apiRestoreSession();
      if (session) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.warn('Error al verificar sesion inicial:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // inicio de sesion
  const handleLogin = async (credentials: LoginDto) => {
    setIsLoading(true);
    try {
      const session = await apiLogin(credentials);
      setUser(session.user);
    } finally {
      setIsLoading(false);
    }
  };

  // registro de usuario nuevo
  const handleRegister = async (data: RegisterDto) => {
    setIsLoading(true);
    try {
      await apiRegister(data);
      // despues de registrar, iniciamos sesion automaticamente
      const session = await apiLogin({ correo: data.correo, password: data.password });
      setUser(session.user);
    } finally {
      setIsLoading(false);
    }
  };

  // cierre de sesion
  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await apiLogout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Actualizo el nombre visible al guardar y descarto respuestas de una cuenta que ya salió.
  const updateProfile = async (input: ProfileUpdateDto) => {
    if (!user) throw new Error('INVALID_SESSION');
    const owner = user.id;
    const perfil = await saveAccountProfile(input);
    setUser(current => current?.id === owner ? { ...current, perfil, nombre: perfil.nombre } : current);
    return perfil;
  };

  useEffect(() => {
    // verificamos si hay sesion previa al montar el proveedor
    checkSession();

    // escuchamos si el interceptor de Axios detecta que el refresh token ya no es valido
    const unsubscribe = onSessionExpired(() => {
      console.log('Sesion expirada detectada por el cliente HTTP, limpiando estado de usuario.');
      setUser(null);
    });

    return () => {
      unsubscribe();
    };
  }, [checkSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login: handleLogin,
        register: handleRegister,
        loginWithGoogle: async (data, link) => setUser((await googleSession(data, link)).user),
        updateProfile,
        logout: handleLogout,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// hook de conveniencia para acceder facilmente al contexto de autenticacion
export const useAuth = (): AuthContextData => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
