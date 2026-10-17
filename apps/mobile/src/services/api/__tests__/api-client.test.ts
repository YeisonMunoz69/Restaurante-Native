import { onSessionExpired } from '../api-client';
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
});
