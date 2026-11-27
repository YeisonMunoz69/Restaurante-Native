import axios from 'axios';
import type { AccountProfile } from '@encanto/shared';
import { API_CONFIG } from '../../config/api.config';
import {
  clearTokens,
  getInMemoryAccessToken,
  getRefreshToken,
  getSessionRevision,
  persistSessionTokens,
} from './token-storage';

export interface SessionResponse {
  accessToken: string;
  refreshToken: string;
  perfil?: AccountProfile;
}

let inFlight: { revision: number; request: Promise<SessionResponse | null> } | undefined;

// El arranque y los 401 comparten la misma rotación del token guardado.
export function refreshSessionTokens() {
  const revision = getSessionRevision();
  if (inFlight?.revision === revision) return inFlight.request;

  const request = renew(revision).finally(() => {
    if (inFlight?.revision === revision) inFlight = undefined;
  });
  inFlight = { revision, request };
  return request;
}

async function renew(revision: number): Promise<SessionResponse | null> {
  const refreshToken = await getRefreshToken();
  if (revision !== getSessionRevision()) throw new Error('SESSION_CHANGED');
  if (!refreshToken) {
    if (getInMemoryAccessToken()) await clearTokens();
    return null;
  }

  let data: SessionResponse;
  try {
    ({ data } = await axios.post<SessionResponse>(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.refresh}`,
      { refreshToken },
      { timeout: API_CONFIG.timeoutMs },
    ));
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (revision !== getSessionRevision() || (status !== 401 && status !== 403)) throw error;
    await clearTokens();
    return null;
  }

  if (!data?.accessToken || !data.refreshToken) throw new Error('INVALID_SESSION');
  await persistSessionTokens(data.accessToken, data.refreshToken, revision);
  return data;
}
