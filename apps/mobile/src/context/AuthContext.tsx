import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
import { useOnline } from './ConnectivityContext';
import type { AccountProfile, LoginDto, RegisterDto, GoogleLoginDto, ProfileUpdateDto } from '@encanto/shared';

interface AuthContextData {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  recoveryPending?: boolean;
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
  const [recoveryPending, setRecoveryPending] = useState(false);
  const online = useOnline();
  const restoration = useRef<Promise<void> | null>(null);
  const wasOnline = useRef(false);

  // intento recuperar la sesion guardada de forma segura al abrir la app
  const checkSession = useCallback(async () => {
    if (!online) return;
    if (restoration.current) return restoration.current;
    setIsLoading(true);
    restoration.current = apiRestoreSession()
      .then(session => {
        setUser(session?.user ?? null);
        setRecoveryPending(false);
      })
      .catch(error => {
        if (!(error instanceof Error && error.message === 'SESSION_CHANGED')) {
          setRecoveryPending(true);
        }
      })
      .finally(() => {
        setIsLoading(false);
        restoration.current = null;
      });
    return restoration.current;
  }, [online]);

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
      setRecoveryPending(false);
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
    const cameOnline = online && !wasOnline.current;
    wasOnline.current = online;
    if (cameOnline && !user) void checkSession();
    if (!online && !restoration.current) setIsLoading(false);
  }, [checkSession, online, user]);

  // Reintento si la red volvió antes que la API o falló temporalmente el almacén seguro.
  useEffect(() => {
    if (!online || !recoveryPending || isLoading) return;
    const retry = setTimeout(() => void checkSession(), 10000);
    return () => clearTimeout(retry);
  }, [checkSession, isLoading, online, recoveryPending]);

  useEffect(() => {
    // escuchamos si el interceptor de Axios detecta que el refresh token ya no es valido
    const unsubscribe = onSessionExpired(() => {
      console.log('Sesion expirada detectada por el cliente HTTP, limpiando estado de usuario.');
      setRecoveryPending(false);
      setUser(null);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        recoveryPending,
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
