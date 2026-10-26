import * as Keychain from 'react-native-keychain';
import { CalendarRestaurantSchema } from '@encanto/shared';
import { API_CONFIG } from './api.config';
import { apiClient } from '../services/api/api-client';
import { clearTokens } from '../services/auth/token-storage';
import { BUILD_ENVIRONMENT } from './build-variant';

export interface ConnectionSettings {
  environment: 'local' | 'dev';
  localUrl: string;
  restauranteId: string;
}
export const DEV_API_URL =
  'https://encanto-campestre-dev.apolobyte.online/api/v1';
export const DEFAULT_CONNECTION: ConnectionSettings = {
  environment: BUILD_ENVIRONMENT ?? 'local',
  localUrl: BUILD_ENVIRONMENT === 'local' ? 'http://localhost:3000/api/v1' : API_CONFIG.baseUrl,
  restauranteId: BUILD_ENVIRONMENT === 'dev' ? '6933b63c-24cf-495b-b396-f88c4956624c' : '',
};
const SERVICE = 'encanto.connection.v1';

// Valido una URL sin credenciales y la sede una sola vez para todos los consumidores.
export function validateConnection(
  value: ConnectionSettings,
): ConnectionSettings {
  if (!['local', 'dev'].includes(value.environment))
    throw new Error('Entorno inválido');
  if (BUILD_ENVIRONMENT && value.environment !== BUILD_ENVIRONMENT)
    throw new Error('Esta instalación tiene un backend fijo. Use la otra app para cambiar de entorno');
  const localUrl = value.localUrl.trim().replace(/\/+$/, '');
  const url = new URL(localUrl);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/api/v1'
  )
    throw new Error(
      'Use una URL http/https terminada en /api/v1, sin credenciales ni parámetros',
    );
  const restauranteId = value.restauranteId.trim();
  if (restauranteId) CalendarRestaurantSchema.parse({ restauranteId });
  return { environment: value.environment, localUrl, restauranteId };
}
export const connectionUrl = (settings: ConnectionSettings) =>
  settings.environment === 'dev' ? DEV_API_URL : settings.localUrl;

// Sincronizo Axios y el refresco existente antes de montar AuthProvider.
function activate(settings: ConnectionSettings) {
  API_CONFIG.baseUrl = connectionUrl(settings);
  apiClient.defaults.baseURL = API_CONFIG.baseUrl;
}
export async function loadConnection(): Promise<ConnectionSettings> {
  const stored = await Keychain.getGenericPassword({ service: SERVICE });
  const previous = stored ? JSON.parse(stored.password) : null;
  const wrongVariant = Boolean(previous && BUILD_ENVIRONMENT && previous.environment !== BUILD_ENVIRONMENT);
  // Al convertir el APK anterior en VPS no envío su refresh token local al servidor compartido.
  if (wrongVariant) await clearTokens();
  // Una actualización del APK original a VPS no debe heredar la conexión local antigua.
  const settings = previous && !wrongVariant
    ? validateConnection(previous)
    : DEFAULT_CONNECTION;
  activate(settings);
  return settings;
}
// Solo permito cambiar servidor sin sesión; no traslado tokens entre entornos.
export async function saveConnection(
  value: ConnectionSettings,
  authenticated: boolean,
) {
  const settings = validateConnection(value);
  const changed = connectionUrl(settings) !== API_CONFIG.baseUrl;
  if (authenticated && changed)
    throw new Error('Cierre la sesión antes de cambiar el entorno');
  if (changed) await clearTokens();
  const saved = await Keychain.setGenericPassword(
    'connection',
    JSON.stringify(settings),
    {
      service: SERVICE,
    },
  );
  if (!saved) throw new Error('No pudimos guardar la conexión');
  activate(settings);
  return settings;
}
