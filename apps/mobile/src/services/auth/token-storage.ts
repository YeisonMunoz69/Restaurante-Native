import * as Keychain from 'react-native-keychain';

// identificador de servicio para separar nuestras credenciales en el Keystore de Android o Keychain de iOS
const KEYCHAIN_SERVICE = 'com.encanto.auth.refreshtoken';

// Guardo el access token en memoria y ordeno las escrituras al almacén seguro.
let inMemoryAccessToken: string | null = null;
let unpersistedRefreshToken: string | null = null;
let sessionRevision = 0;
let pendingWrite = Promise.resolve();

export const getSessionRevision = () => sessionRevision;

function writeInOrder(write: () => Promise<void>) {
  const result = pendingWrite.then(write);
  pendingWrite = result.catch(() => {});
  return result;
}

// funcion para actualizar o limpiar el access token en memoria
export const setInMemoryAccessToken = (token: string | null): void => {
  inMemoryAccessToken = token;
};

// funcion para consultar el access token activo sin tocar el disco
export const getInMemoryAccessToken = (): string | null => {
  return inMemoryAccessToken;
};

// guardo el refresh token en el hardware seguro del celular usando react-native-keychain
// en Android esto usa el AndroidKeyStore con cifrado por hardware (o software seguro si no hay TEE)
export const saveRefreshToken = async (token: string): Promise<boolean> => {
  try {
    const options = {
      service: KEYCHAIN_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
    };

    // guardamos como 'refreshToken' el username y el token como password
    return Boolean(await Keychain.setGenericPassword('refreshToken', token, options));
  } catch {
    return false;
  }
};

// Distingo una lectura fallida de una sesión que nunca se guardó.
export const getRefreshToken = async (): Promise<string | null> => {
  await pendingWrite;
  if (unpersistedRefreshToken) return unpersistedRefreshToken;
  const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
  return credentials && credentials.password ? credentials.password : null;
};

// Publico el access token solo cuando el refresh está guardado para la próxima apertura.
export function persistSessionTokens(accessToken: string, refreshToken: string, revision?: number) {
  const expectedRevision = revision ?? ++sessionRevision;
  return writeInOrder(async () => {
    if (expectedRevision !== sessionRevision) throw new Error('SESSION_CHANGED');
    const saved = await saveRefreshToken(refreshToken);
    if (expectedRevision !== sessionRevision) throw new Error('SESSION_CHANGED');
    if (!saved) {
      // Si la API ya rotó el token, conservo el más reciente para reintentar mientras la app siga abierta.
      if (revision !== undefined) unpersistedRefreshToken = refreshToken;
      throw new Error('SESSION_STORAGE_WRITE_FAILED');
    }
    unpersistedRefreshToken = null;
    setInMemoryAccessToken(accessToken);
  });
}

// Invalido renovaciones previas antes de encolar la limpieza del almacén seguro.
export const clearTokens = (): Promise<void> => {
  sessionRevision += 1;
  inMemoryAccessToken = null;
  unpersistedRefreshToken = null;
  return writeInOrder(async () => {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
  });
};
