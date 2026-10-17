import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosError,
} from 'axios';
import { API_CONFIG } from '../../config/api.config';
import {
  getInMemoryAccessToken,
  setInMemoryAccessToken,
  getRefreshToken,
  saveRefreshToken,
  clearTokens,
} from '../auth/token-storage';

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

// variables para controlar el estado de refresco concurrente y evitar llamadas repetidas
let isRefreshing = false;
interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: any) => void;
}
let failedQueue: QueueItem[] = [];

// proceso todas las peticiones que quedaron esperando mientras se renovaba el token
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// INTERCEPTOR DE PETICIONES:
// inyectamos el access token que tenemos en memoria en el header Authorization
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getInMemoryAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
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
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // si no hay configuracion de peticion o la respuesta no es 401, lo dejamos pasar
    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // si el 401 ocurrio en la ruta de login o en el mismo refresh, no intentamos renovar
    const requestUrl = originalRequest.url || '';
    if (
      requestUrl.includes(API_CONFIG.endpoints.login) ||
      requestUrl.includes(API_CONFIG.endpoints.refresh)
    ) {
      return Promise.reject(error);
    }

    // evitamos bucles infinitos si la misma peticion ya fue reintentada una vez
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // si ya hay un refresco en marcha, encolamos esta peticion para reintentarla apenas termine
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newAccessToken) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    // marcamos que iniciamos el proceso de renovacion para que otras peticiones esperen
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // leemos el refresh token que guardamos de forma segura en el hardware del celular
      const storedRefreshToken = await getRefreshToken();

      if (!storedRefreshToken) {
        // si no tenemos refresh token, cerramos la sesion limpiamente
        await clearTokens();
        notifySessionExpired();
        processQueue(new Error('No hay refresh token almacenado en Keychain'), null);
        return Promise.reject(error);
      }

      // llamamos al endpoint de refresh usando axios plano (sin pasar por este interceptor)
      const refreshResponse = await axios.post(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.refresh}`,
        { refreshToken: storedRefreshToken },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: API_CONFIG.timeoutMs,
        }
      );

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
        refreshResponse.data;

      // actualizamos el access token en la memoria RAM
      setInMemoryAccessToken(newAccessToken);

      // actualizamos el nuevo refresh token en el Keychain (rotacion de seguridad)
      if (newRefreshToken) {
        await saveRefreshToken(newRefreshToken);
      }

      // actualizamos el header de la peticion original y la reintentamos
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }

      // reanudamos y resolvemos todas las peticiones que se quedaron esperando en la cola
      processQueue(null, newAccessToken);

      return apiClient(originalRequest);
    } catch (refreshError) {
      // si el refresh token expiro o fue revocado en backend, limpiamos todo y avisamos a la app
      console.warn('Fallo la renovacion automatica del token:', refreshError);
      await clearTokens();
      notifySessionExpired();
      processQueue(refreshError, null);
      return Promise.reject(refreshError);
    } finally {
      // liberamos la bandera de refresco para futuras peticiones
      isRefreshing = false;
    }
  }
);
