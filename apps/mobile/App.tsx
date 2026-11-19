import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Linking, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import './src/i18n'; // cargamos la configuracion de internacionalizacion
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { FeedbackHost } from './src/components/feedback/Feedback';
import { BottomTabNavigator } from './src/navigation/BottomTabNavigator';
import { isAppLink, WEB_LINKING } from './src/navigation/app-links';
import { WEB_ORIGIN } from './src/config/web-links';
import { GoogleAccess } from './src/components/GoogleAccess';
import { ConnectionProvider } from './src/context/ConnectionContext';
import { useConnection } from './src/context/ConnectionContext';
import { OrderDraftProvider } from './src/context/OrderDraftContext';

// componente interno que conecta el tema de React Navigation con nuestro ThemeContext
const AppContent: React.FC = () => {
  const { isDark, colors } = useTheme();
  const { user, isLoading } = useAuth();
  const { settings } = useConnection();
  const pendingLink = useRef<string | null>(null);
  const readInitialLink = useRef(false);

  // Guardo el enlace válido recibido mientras la puerta de acceso está abierta.
  useEffect(() => {
    if (user || !WEB_ORIGIN) return;
    const origin = WEB_ORIGIN;
    const listener = Linking.addEventListener('url', ({ url }) => {
      if (isAppLink(url, origin)) pendingLink.current = url;
    });
    return () => listener.remove();
  }, [user]);

  // adaptamos el tema de navegacion para que coincida con nuestros tokens
  const navTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: colors.superficie.fondo,
          card: colors.superficie.fondo,
          text: colors.texto.primario,
          border: colors.superficie.borde,
          primary: colors.marca.primario,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: colors.superficie.fondo,
          card: colors.superficie.fondo,
          text: colors.texto.primario,
          border: colors.superficie.borde,
          primary: colors.marca.primario,
        },
      };

  const linking = WEB_LINKING && {
    ...WEB_LINKING,
    getInitialURL: async () => {
      const waiting = pendingLink.current;
      pendingLink.current = null;
      const url = waiting ?? (readInitialLink.current ? null : await Linking.getInitialURL());
      readInitialLink.current = true;
      return url && WEB_ORIGIN && isAppLink(url, WEB_ORIGIN) ? url : null;
    },
  };

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {user ? (
        <NavigationContainer theme={navTheme} linking={linking}>
          <OrderDraftProvider scope={`${settings.environment}/${settings.localUrl}/${settings.restauranteId}`} ownerId={user.id}>
            <BottomTabNavigator />
          </OrderDraftProvider>
        </NavigationContainer>
      ) : isLoading ? (
        <ActivityIndicator color={colors.marca.primario} style={{ flex: 1, backgroundColor: colors.superficie.fondo }} />
      ) : <GoogleAccess />}
      <FeedbackHost scope={user?.id} />
    </>
  );
};

// componente raiz con los proveedores de area segura, tema dinamico y autenticacion segura
const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ConnectionProvider><AuthProvider>
          <AppContent />
        </AuthProvider></ConnectionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;
