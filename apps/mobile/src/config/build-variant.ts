import { NativeModules } from 'react-native';
// Mantengo compatibilidad con el APK anterior mientras instalamos las dos variantes.
export const BUILD_ENVIRONMENT: 'local' | 'dev' | undefined = NativeModules.EncantoBuild?.environment;
export const GOOGLE_WEB_CLIENT_ID: string = NativeModules.EncantoBuild?.googleWebClientId ?? '';
export const BUILD_WEB_ORIGIN: string = NativeModules.EncantoBuild?.webOrigin ?? '';
