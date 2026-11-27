import * as Keychain from 'react-native-keychain';
import { DEFAULT_CONNECTION, loadConnection, validateConnection, DEV_API_URL, connectionUrl } from '../connection';
import { clearTokens, getRefreshToken, saveRefreshToken } from '../../services/auth/token-storage';
jest.mock('../build-variant', () => ({ BUILD_ENVIRONMENT: 'dev' }));

const connectionService = { service: 'encanto.connection.v1' };
const legacyConnection = { environment: 'local', localUrl: 'http://localhost:3039/api/v1', restauranteId: '' };

beforeEach(async () => {
  await clearTokens();
  await Keychain.resetGenericPassword(connectionService);
});

it('migra la conexión local una vez y conserva la sesión VPS al reabrir', async () => {
  await Keychain.setGenericPassword('connection', JSON.stringify(legacyConnection), connectionService);
  await saveRefreshToken('token-del-servidor-local');

  expect(await loadConnection()).toEqual(DEFAULT_CONNECTION);
  expect(await getRefreshToken()).toBeNull();
  expect(connectionUrl(DEFAULT_CONNECTION)).toBe(DEV_API_URL);
  expect(() => validateConnection({ ...DEFAULT_CONNECTION, environment: 'local' })).toThrow('backend fijo');

  await saveRefreshToken('token-del-servidor-dev');
  expect(await loadConnection()).toEqual(DEFAULT_CONNECTION);
  expect(await getRefreshToken()).toBe('token-del-servidor-dev');
});

it('detiene la migración si no puede guardar la conexión de VPS y vuelve a intentarlo al abrir', async () => {
  await Keychain.setGenericPassword('connection', JSON.stringify(legacyConnection), connectionService);
  await saveRefreshToken('token-del-servidor-local');
  jest.mocked(Keychain.setGenericPassword).mockResolvedValueOnce(false);

  await expect(loadConnection()).rejects.toThrow('guardar la conexión');
  expect(await getRefreshToken()).toBeNull();

  expect(await loadConnection()).toEqual(DEFAULT_CONNECTION);
  await saveRefreshToken('token-del-servidor-dev');
  expect(await loadConnection()).toEqual(DEFAULT_CONNECTION);
  expect(await getRefreshToken()).toBe('token-del-servidor-dev');
});
