import * as Keychain from 'react-native-keychain';
import { API_CONFIG } from '../api.config';
import {
  connectionUrl,
  DEFAULT_CONNECTION,
  DEV_API_URL,
  loadConnection,
  saveConnection,
  validateConnection,
} from '../connection';
import { apiClient } from '../../services/api/api-client';
import { clearTokens } from '../../services/auth/token-storage';

jest.mock('../../services/auth/token-storage', () => ({
  clearTokens: jest.fn(),
  getInMemoryAccessToken: jest.fn(),
}));
afterEach(async () => {
  await saveConnection(DEFAULT_CONNECTION, false);
  jest.clearAllMocks();
});
it('sincroniza cliente y refresh, persiste en servicio separado y restaura antes del login', async () => {
  const settings = {
    ...DEFAULT_CONNECTION,
    environment: 'dev' as const,
    restauranteId: '11111111-1111-4111-8111-111111111111',
  };
  await saveConnection(settings, false);
  expect(API_CONFIG.baseUrl).toBe(DEV_API_URL);
  expect(apiClient.defaults.baseURL).toBe(DEV_API_URL);
  expect(clearTokens).toHaveBeenCalled();
  expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
    'connection',
    JSON.stringify(settings),
    { service: 'encanto.connection.v1' },
  );
  expect(await loadConnection()).toEqual(settings);
  expect(connectionUrl(settings)).toBe(DEV_API_URL);
});
it('impide trasladar sesión a otro entorno', async () => {
  await expect(
    saveConnection({ ...DEFAULT_CONNECTION, environment: 'dev' }, true),
  ).rejects.toThrow('Cierre la sesión');
  expect(apiClient.defaults.baseURL).toBe(DEFAULT_CONNECTION.localUrl);
});
it('no activa otro servidor si Keychain rechaza persistir la configuración', async () => {
  jest.mocked(Keychain.setGenericPassword).mockResolvedValueOnce(false);
  await expect(
    saveConnection({ ...DEFAULT_CONNECTION, environment: 'dev' }, false),
  ).rejects.toThrow('guardar la conexión');
  expect(apiClient.defaults.baseURL).toBe(DEFAULT_CONNECTION.localUrl);
});
it.each([
  'ftp://localhost/api/v1',
  'http://usuario:clave@localhost/api/v1',
  'https://localhost/api/v1?token=x',
  'http://localhost',
])('rechaza conexión %s', localUrl => {
  expect(() =>
    validateConnection({ ...DEFAULT_CONNECTION, localUrl }),
  ).toThrow();
});
