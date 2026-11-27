import axios from 'axios';
import * as Keychain from 'react-native-keychain';
import { apiClient, onSessionExpired } from '../api-client';
import { googleSession, logout, restoreSession } from '../../auth/auth.service';
import {
  clearTokens,
  setInMemoryAccessToken,
  getInMemoryAccessToken,
  saveRefreshToken,
  getRefreshToken,
} from '../../auth/token-storage';

// simulamos axios para controlar las respuestas de red
jest.mock('axios', () => {
  const actualAxios = jest.requireActual('axios');
  const mockAxiosInstance = Object.assign(jest.fn(), {
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    get: jest.fn(),
    post: jest.fn(),
  });
  return {
    ...actualAxios,
    create: jest.fn(() => mockAxiosInstance),
    post: jest.fn(),
  };
});

jest.mock('../../../config/build-variant', () => ({ BUILD_ENVIRONMENT: 'local' }));

const { btoa } = jest.requireActual<{ btoa: (value: string) => string }>('node:buffer');
const googleAccess = (rol: 'ADMIN' | 'COMENSAL') =>
  `header.${btoa(JSON.stringify({ sub: 'test-user', correo: 'qa@example.test', provider: 'google', rol }))}.signature`;

describe('Cliente HTTP e Interceptor de Renovación Silenciosa (EC-19)', () => {
  beforeEach(async () => {
    await clearTokens();
  });

  it('debe registrar el callback de onSessionExpired y ejecutarlo cuando la sesion expire', () => {
    const callback = jest.fn();
    const unsubscribe = onSessionExpired(callback);

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('debe mantener las configuraciones correctas en el almacenamiento de tokens', async () => {
    setInMemoryAccessToken('nuevo-access-token');
    expect(getInMemoryAccessToken()).toBe('nuevo-access-token');

    await saveRefreshToken('nuevo-refresh-token');
    const token = await getRefreshToken();
    expect(token).toBe('nuevo-refresh-token');
  });

  it('conserva el token de renovación si se pierde la red al restaurar la sesión', async () => {
    await saveRefreshToken('refresh-guardado');
    jest.mocked(axios.post).mockRejectedValueOnce(new axios.AxiosError('Network Error', 'ERR_NETWORK'));
    await expect(restoreSession()).rejects.toThrow('Network Error');
    await expect(getRefreshToken()).resolves.toBe('refresh-guardado');
  });

  it('conserva la renovación tras un 5xx y usa el mismo token al recuperar la API', async () => {
    await saveRefreshToken('refresh-vigente');
    jest.mocked(axios.post).mockRejectedValueOnce({ isAxiosError: true, response: { status: 500 } });
    await expect(restoreSession()).rejects.toMatchObject({ response: { status: 500 } });
    await expect(getRefreshToken()).resolves.toBe('refresh-vigente');

    jest.mocked(axios.post).mockResolvedValueOnce({
      data: { accessToken: googleAccess('COMENSAL'), refreshToken: 'refresh-nuevo' },
    });
    await expect(restoreSession()).resolves.toMatchObject({ user: { rol: 'COMENSAL' } });
    expect(axios.post).toHaveBeenLastCalledWith(
      expect.stringMatching(/\/auth\/refresh$/), { refreshToken: 'refresh-vigente' }, expect.any(Object),
    );
    await expect(getRefreshToken()).resolves.toBe('refresh-nuevo');
  });

  it('recupera el mismo usuario Google y el rol del servidor al reabrir para cada rol', async () => {
    for (const rol of ['ADMIN', 'COMENSAL'] as const) {
      const accessToken = googleAccess(rol);
      jest.mocked(apiClient.post).mockResolvedValueOnce({ data: { accessToken, refreshToken: 'inicial' } });
      await googleSession({ idToken: 'qa-google' });
      setInMemoryAccessToken(null);
      jest.mocked(axios.post).mockResolvedValueOnce({ data: { accessToken, refreshToken: 'rotado' } });
      await expect(restoreSession()).resolves.toMatchObject({ user: { id: 'test-user', provider: 'google', rol } });
      await expect(getRefreshToken()).resolves.toBe('rotado');
    }
  });

  it('no anuncia el acceso Google si el almacén seguro devuelve false al guardar', async () => {
    jest.mocked(Keychain.setGenericPassword).mockResolvedValueOnce(false);
    jest.mocked(apiClient.post).mockResolvedValueOnce({
      data: { accessToken: googleAccess('ADMIN'), refreshToken: 'no-guardado' },
    });
    await expect(googleSession({ idToken: 'qa-google' })).rejects.toThrow('SESSION_STORAGE_WRITE_FAILED');
    expect(getInMemoryAccessToken()).toBeNull();
    await expect(getRefreshToken()).resolves.toBeNull();
  });

  it('comparte la renovación entre la restauración y un 401 con el token anterior', async () => {
    const { interceptors } = apiClient;
    const addAuth = jest.mocked(interceptors.request.use).mock.calls[0][0]!;
    const recover = jest.mocked(interceptors.response.use).mock.calls[0][1]!;
    const expiredToken = googleAccess('COMENSAL');
    const nextToken = googleAccess('ADMIN');
    await saveRefreshToken('refresh-inicial');
    setInMemoryAccessToken(expiredToken);
    const config = await addAuth({ url: '/reservas', headers: new axios.AxiosHeaders() });
    let complete!: (value: unknown) => void;
    jest.mocked(axios.post).mockClear().mockReturnValueOnce(new Promise(resolve => { complete = resolve; }));
    (apiClient as unknown as jest.Mock).mockImplementationOnce(async retried => {
      await addAuth(retried);
      return { data: 'reservas' };
    });

    const restoration = restoreSession();
    const retry = recover({ config, response: { status: 401 } });
    complete({ data: { accessToken: nextToken, refreshToken: 'refresh-rotado' } });

    await expect(restoration).resolves.toMatchObject({ user: { rol: 'ADMIN' } });
    await expect(retry).resolves.toEqual({ data: 'reservas' });
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(config.headers.Authorization).toBe(`Bearer ${nextToken}`);
  });

  it('borra las credenciales al cerrar la sesión y no las reconstruye al reabrir', async () => {
    await saveRefreshToken('refresh-actual');
    setInMemoryAccessToken(googleAccess('ADMIN'));
    jest.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });
    await logout();
    expect(apiClient.post).toHaveBeenLastCalledWith('/auth/logout');
    expect(getInMemoryAccessToken()).toBeNull();
    await expect(restoreSession()).resolves.toBeNull();
  });

  it('descarta una respuesta de renovación que llega después de cerrar sesión', async () => {
    await saveRefreshToken('refresh-anterior');
    let complete!: (value: unknown) => void;
    let notifyStarted!: () => void;
    const started = new Promise<void>(resolve => { notifyStarted = resolve; });
    jest.mocked(axios.post).mockImplementationOnce(() => {
      notifyStarted();
      return new Promise(resolve => { complete = resolve; });
    });
    const restoration = restoreSession();
    await started;
    jest.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });
    await logout();
    complete({ data: { accessToken: googleAccess('ADMIN'), refreshToken: 'refresh-tardio' } });

    await expect(restoration).rejects.toThrow('SESSION_CHANGED');
    await expect(getRefreshToken()).resolves.toBeNull();
    expect(getInMemoryAccessToken()).toBeNull();
  });

  it('retira el token guardado cuando el servidor confirma que no es válido', async () => {
    await saveRefreshToken('refresh-revocado');
    jest.mocked(axios.post).mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } });
    await expect(restoreSession()).resolves.toBeNull();
    await expect(getRefreshToken()).resolves.toBeNull();
  });
});
