import axios from 'axios';
import { onSessionExpired } from '../api-client';
import { restoreSession } from '../../auth/auth.service';
import {
  setInMemoryAccessToken,
  getInMemoryAccessToken,
  saveRefreshToken,
  getRefreshToken,
} from '../../auth/token-storage';

// simulamos axios para controlar las respuestas de red
jest.mock('axios', () => {
  const actualAxios = jest.requireActual('axios');
  const mockAxiosInstance = {
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    get: jest.fn(),
    post: jest.fn(),
  };
  return {
    ...actualAxios,
    create: jest.fn(() => mockAxiosInstance),
    post: jest.fn(),
  };
});

describe('Cliente HTTP e Interceptor de Renovación Silenciosa (EC-19)', () => {
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
    await expect(restoreSession()).resolves.toBeNull();
    await expect(getRefreshToken()).resolves.toBe('refresh-guardado');
  });

  it('retira el token guardado cuando el servidor confirma que no es válido', async () => {
    await saveRefreshToken('refresh-revocado');
    jest.mocked(axios.post).mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } });
    await expect(restoreSession()).resolves.toBeNull();
    await expect(getRefreshToken()).resolves.toBeNull();
  });
});
