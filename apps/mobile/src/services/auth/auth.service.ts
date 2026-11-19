import axios from 'axios';
import { apiClient } from '../api/api-client';
import { API_CONFIG } from '../../config/api.config';
import {
  setInMemoryAccessToken,
  saveRefreshToken,
  getRefreshToken,
  clearTokens,
} from './token-storage';
import type { AccountProfile, GoogleLoginDto, LoginDto, ProfileUpdateDto, RegisterDto } from '@encanto/shared';
import { BUILD_ENVIRONMENT } from '../../config/build-variant';

// estructura del usuario autenticado en la aplicacion movil
export interface AuthUser {
  id: string;
  correo: string;
  nombre?: string;
  perfil?: AccountProfile;
  rol?: string;
  provider?: 'google' | 'password';
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
}

type SessionResponse = { accessToken: string; refreshToken?: string; perfil?: AccountProfile };

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
async function acceptSession({ accessToken, refreshToken, perfil }: SessionResponse, correo = ''): Promise<AuthSession> {
  const payload = decodeJwtPayload(accessToken);
  if (!payload?.sub) throw new Error('INVALID_SESSION');
  // guardo el access token estrictamente en memoria (RAM)
  setInMemoryAccessToken(accessToken);

  // guardo el refresh token de forma segura y cifrada en el Keychain/Keystore
  if (refreshToken) {
    await saveRefreshToken(refreshToken);
  }

  // decodifico los datos del usuario incluidos en el token
  const user: AuthUser = {
    id: payload.sub,
    correo: payload.correo || correo,
    nombre: perfil?.nombre,
    perfil,
    rol: payload?.rol || 'COMENSAL',
    provider: payload?.provider === 'google' ? 'google' : 'password',
  };

  return { user, accessToken };
}

export const login = async (credentials: LoginDto): Promise<AuthSession> => {
  const { data } = await apiClient.post(API_CONFIG.endpoints.login, credentials);
  return acceptSession(data, credentials.correo);
};

// Solo transmito credenciales sobre HTTPS o por la conexión USB/emulador de la variante local.
export async function googleSession(input: GoogleLoginDto, link = false) {
  const destination = new URL(API_CONFIG.baseUrl);
  const viaLocalTransport = BUILD_ENVIRONMENT === 'local' && destination.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '10.0.2.2'].includes(destination.hostname);
  if (destination.protocol !== 'https:' && !viaLocalTransport) throw new Error('GOOGLE_INSECURE_CONNECTION');
  const { data } = await apiClient.post(link ? API_CONFIG.endpoints.googleLink : API_CONFIG.endpoints.google, input);
  return acceptSession(data);
}

// Actualizo el perfil con la sesión actual; la API decide quién es su dueño.
export async function saveAccountProfile(input: ProfileUpdateDto) {
  const { data } = await apiClient.patch<AccountProfile>(API_CONFIG.endpoints.me, input);
  return data;
}

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

    const { accessToken } = response.data;

    if (!accessToken) {
      await clearTokens();
      return null;
    }

    return await acceptSession(response.data);
  } catch {
    console.log('No se pudo restaurar la sesion previa, se iniciara como invitado.');
    await clearTokens();
    return null;
  }
};
