import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosError,
} from 'axios';
import { API_CONFIG } from '../../config/api.config';
import { getInMemoryAccessToken, getSessionRevision } from '../auth/token-storage';
import { refreshSessionTokens } from '../auth/session-refresh';

// creo la instancia base de Axios apuntando al backend de NestJS
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseUrl,
  timeout: API_CONFIG.timeoutMs,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// manejador de listeners para avisar a la interfaz cuando la sesion expire por completo
type SessionExpiredListener = () => void;
const sessionExpiredListeners: SessionExpiredListener[] = [];

export const onSessionExpired = (listener: SessionExpiredListener) => {
  sessionExpiredListeners.push(listener);
  return () => {
    const index = sessionExpiredListeners.indexOf(listener);
    if (index > -1) {
      sessionExpiredListeners.splice(index, 1);
    }
  };
};

const notifySessionExpired = () => {
  sessionExpiredListeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error al notificar expiracion de sesion:', e);
    }
  });
};

interface SessionRequest extends InternalAxiosRequestConfig {
  _sessionRevision?: number;
  _retry?: boolean;
}

// INTERCEPTOR DE PETICIONES:
// inyectamos el access token que tenemos en memoria en el header Authorization
apiClient.interceptors.request.use(
  (config: SessionRequest) => {
    if (config._retry && config._sessionRevision !== getSessionRevision()) {
      throw new Error('SESSION_CHANGED');
    }
    const token = getInMemoryAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      config._sessionRevision = getSessionRevision();
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// INTERCEPTOR DE RESPUESTAS:
// si recibimos un error 401 Unauthorized, renovamos el token de forma silenciosa
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as SessionRequest | undefined;

    // Solo recupero peticiones autenticadas de la sesión que originó el 401.
    if (
      !originalRequest ||
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest._sessionRevision !== getSessionRevision()
    ) {
      return Promise.reject(error);
    }

    // si el 401 ocurrio en la ruta de login o en el mismo refresh, no intentamos renovar
    const requestUrl = originalRequest.url || '';
    if (
      requestUrl.includes(API_CONFIG.endpoints.login) ||
      requestUrl === API_CONFIG.endpoints.google ||
      requestUrl.includes(API_CONFIG.endpoints.refresh)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const currentToken = getInMemoryAccessToken();
    // Si el 401 llegó tarde, reutilizo la renovación que ya terminó.
    if (currentToken && originalRequest.headers.Authorization !== `Bearer ${currentToken}`) {
      return apiClient(originalRequest);
    }
    const renewed = await refreshSessionTokens();
    if (!renewed) {
      notifySessionExpired();
      return Promise.reject(error);
    }
    return apiClient(originalRequest);
  }
);
