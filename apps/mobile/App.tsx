import React from 'react';
import { ActivityIndicator, StatusBar } from 'react-native';
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
import { WEB_LINKING } from './src/navigation/app-links';
import { GuestAccessProvider } from './src/context/GuestAccessContext';
import { ConnectionProvider } from './src/context/ConnectionContext';
import { useConnection } from './src/context/ConnectionContext';
import { OrderDraftProvider } from './src/context/OrderDraftContext';
import { connectionUrl } from './src/config/connection';

// componente interno que conecta el tema de React Navigation con nuestro ThemeContext
const AppContent: React.FC = () => {
  const { isDark, colors } = useTheme();
  const { user, isLoading } = useAuth();
  const { settings } = useConnection();

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

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {!user && isLoading ? (
        <ActivityIndicator color={colors.marca.primario} style={{ flex: 1, backgroundColor: colors.superficie.fondo }} />
      ) : (
        <GuestAccessProvider authenticated={!!user}>
          <NavigationContainer theme={navTheme} linking={WEB_LINKING}>
            <OrderDraftProvider scope={`${settings.environment}/${settings.localUrl}/${settings.restauranteId}`} ownerId={user?.id}>
              <BottomTabNavigator />
            </OrderDraftProvider>
          </NavigationContainer>
        </GuestAccessProvider>
      )}
      <FeedbackHost scope={user?.id} />
    </>
  );
};

// Aplico el claro fijo al invitado y guardo preferencias por cuenta y servidor.
function ThemedApp() {
  const { user } = useAuth();
  const { settings } = useConnection();
  return (
    <ThemeProvider accountKey={user ? `${connectionUrl(settings)}/${user.id}` : null}>
      <AppContent />
    </ThemeProvider>
  );
}

// componente raiz con los proveedores de area segura, tema dinamico y autenticacion segura
const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <ConnectionProvider><AuthProvider>
        <ThemedApp />
      </AuthProvider></ConnectionProvider>
    </SafeAreaProvider>
  );
};

export default App;
