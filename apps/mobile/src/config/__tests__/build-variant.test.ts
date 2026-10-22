import * as Keychain from 'react-native-keychain';
import { DEFAULT_CONNECTION, loadConnection, validateConnection, DEV_API_URL, connectionUrl } from '../connection';
import { clearTokens } from '../../services/auth/token-storage';
jest.mock('../build-variant', () => ({ BUILD_ENVIRONMENT: 'dev' }));
jest.mock('../../services/auth/token-storage', () => ({ clearTokens: jest.fn(), getInMemoryAccessToken: jest.fn() }));

it('VPS fija HTTPS y no transporta la sesión del APK local antiguo', async () => {
  jest.mocked(Keychain.getGenericPassword).mockResolvedValueOnce({ username: 'connection', password: JSON.stringify({ environment: 'local', localUrl: 'http://localhost:3039/api/v1', restauranteId: '' }), service: 'encanto.connection.v1', storage: 'KeystoreAESGCM' } as never);
  expect(await loadConnection()).toEqual(DEFAULT_CONNECTION);
  expect(clearTokens).toHaveBeenCalledTimes(1);
  expect(connectionUrl(DEFAULT_CONNECTION)).toBe(DEV_API_URL);
  expect(() => validateConnection({ ...DEFAULT_CONNECTION, environment: 'local' })).toThrow('backend fijo');
});
