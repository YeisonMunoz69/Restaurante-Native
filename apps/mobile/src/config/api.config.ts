import { Platform } from 'react-native';

// definimos la direccion base del backend para desarrollo local
// si usamos emulador de Android, 10.0.2.2 apunta al localhost de la maquina
// si conectamos un telefono real por USB con 'adb reverse tcp:3000 tcp:3000', usamos localhost
const DEFAULT_DEV_API_URL = Platform.select({
  android: 'http://10.0.2.2:3000/api/v1',
  ios: 'http://localhost:3000/api/v1',
  default: 'http://localhost:3000/api/v1',
});

// permitimos sobreescribir la URL facilmente si se prueba en red local Wi-Fi o USB
export const API_CONFIG = {
  baseUrl: DEFAULT_DEV_API_URL,
  timeoutMs: 15000,
  endpoints: {
    login: '/auth/login',
    google: '/auth/google',
    googleLink: '/auth/google/vincular',
    register: '/auth/register',
    refresh: '/auth/refresh',
    me: '/auth/me',
    logout: '/auth/logout',
  },
};
