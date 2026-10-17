import axios from 'axios';
import { apiClient } from '../api/api-client';
import { API_CONFIG } from '../../config/api.config';
import {
  setInMemoryAccessToken,
  saveRefreshToken,
  getRefreshToken,
  clearTokens,
} from './token-storage';
import type { LoginDto, RegisterDto } from '@encanto/shared';

// estructura del usuario autenticado en la aplicacion movil
export interface AuthUser {
  id: string;
  correo: string;
  nombre?: string;
  rol?: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
}

// funcion auxiliar para decodificar el payload del token JWT sin dependencias externas
const decodeJwtPayload = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    // ajusto caracteres de base64url a base64 estandar
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

    // decodificador de base64 a cadena de texto
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    let buffer = 0;
    let bits = 0;

    for (let i = 0; i < padded.length; i++) {
      const char = padded.charAt(i);
      if (char === '=') break;
      const index = chars.indexOf(char);
      if (index === -1) continue;

      buffer = (buffer << 6) | index;
      bits += 6;

      if (bits >= 8) {
        bits -= 8;
        output += String.fromCharCode((buffer >> bits) & 0xff);
      }
    }

    return JSON.parse(output);
  } catch (error) {
    console.error('Error al decodificar el payload del JWT:', error);
    return null;
  }
};

// inicio de sesion con correo y contrasena
export const login = async (credentials: LoginDto): Promise<AuthSession> => {
  const response = await apiClient.post(API_CONFIG.endpoints.login, credentials);
  const { accessToken, refreshToken } = response.data;

  // guardo el access token estrictamente en memoria (RAM)
  setInMemoryAccessToken(accessToken);

  // guardo el refresh token de forma segura y cifrada en el Keychain/Keystore
  if (refreshToken) {
    await saveRefreshToken(refreshToken);
  }

  // decodifico los datos del usuario incluidos en el token
  const payload = decodeJwtPayload(accessToken);
  const user: AuthUser = {
    id: payload?.sub || '',
    correo: payload?.correo || credentials.correo,
    rol: payload?.rol || 'COMENSAL',
  };

  return { user, accessToken };
};

// registro de nuevo usuario
export const register = async (data: RegisterDto): Promise<any> => {
  const response = await apiClient.post(API_CONFIG.endpoints.register, data);
  return response.data;
};

// cierre de sesion: invalido en backend y limpio memoria y almacenamiento seguro
export const logout = async (): Promise<void> => {
  try {
    // llamamos al endpoint de logout para invalidar tokens de refresco en la BD
    await apiClient.post(API_CONFIG.endpoints.logout);
  } catch (error) {
    console.warn('No se pudo completar el logout en backend (posible falta de red):', error);
  } finally {
    // limpiamos siempre las credenciales locales
    await clearTokens();
  }
};

// restauracion automatica de sesion al abrir la app
export const restoreSession = async (): Promise<AuthSession | null> => {
  try {
    const storedRefreshToken = await getRefreshToken();
    if (!storedRefreshToken) {
      return null;
    }

    // llamamos al endpoint de refresh para verificar si el token sigue activo y vigente
    const response = await axios.post(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.refresh}`,
      { refreshToken: storedRefreshToken },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: API_CONFIG.timeoutMs,
      }
    );

    const { accessToken, refreshToken: newRefreshToken } = response.data;

    if (!accessToken) {
      await clearTokens();
      return null;
    }

    // actualizo la memoria con el token renovado
    setInMemoryAccessToken(accessToken);

    // guardo el nuevo refresh token rotativo
    if (newRefreshToken) {
      await saveRefreshToken(newRefreshToken);
    }

    const payload = decodeJwtPayload(accessToken);
    const user: AuthUser = {
      id: payload?.sub || '',
      correo: payload?.correo || '',
      rol: payload?.rol || 'COMENSAL',
    };

    return { user, accessToken };
  } catch {
    console.log('No se pudo restaurar la sesion previa, se iniciara como invitado.');
    await clearTokens();
    return null;
  }
};
