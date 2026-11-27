import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AuthProvider, useAuth } from '../AuthContext';
import { useOnline } from '../ConnectivityContext';
import { restoreSession } from '../../services/auth/auth.service';

jest.mock('../ConnectivityContext', () => ({ useOnline: jest.fn() }));
jest.mock('../../services/auth/auth.service', () => ({ restoreSession: jest.fn() }));

it('espera la red y vuelve a intentar la sesión Google si la API aún no responde', async () => {
  jest.useFakeTimers();
  jest.mocked(useOnline).mockReturnValue(false);
  const restore = jest.mocked(restoreSession);
  restore.mockRejectedValueOnce(new Error('Red interrumpida')).mockResolvedValueOnce({
    accessToken: 'access-google',
    user: { id: 'qa-admin', correo: 'qa@example.test', provider: 'google', rol: 'ADMIN' },
  });
  let auth!: ReturnType<typeof useAuth>;
  let renderer: ReactTestRenderer | undefined;
  const Probe = () => { auth = useAuth(); return null; };
  const app = () => <AuthProvider><Probe /></AuthProvider>;

  try {
    await act(async () => { renderer = create(app()); });
    expect(auth.user).toBeNull();
    expect(restore).not.toHaveBeenCalled();

    jest.mocked(useOnline).mockReturnValue(true);
    await act(async () => { renderer?.update(app()); });
    expect(auth.recoveryPending).toBe(true);
    expect(restore).toHaveBeenCalledTimes(1);

    await act(async () => { jest.advanceTimersByTime(10000); });
    expect(auth.user).toMatchObject({ id: 'qa-admin', provider: 'google', rol: 'ADMIN' });
    expect(auth.recoveryPending).toBe(false);
  } finally {
    await act(async () => { renderer?.unmount(); });
    jest.useRealTimers();
  }
});
