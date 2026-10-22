import React from 'react';
import { StatusBar } from 'react-native';
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
import { ConnectionProvider } from './src/context/ConnectionContext';

// componente interno que conecta el tema de React Navigation con nuestro ThemeContext
const AppContent: React.FC = () => {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();

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
    <NavigationContainer theme={navTheme}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <BottomTabNavigator />
      <FeedbackHost scope={user?.id} />
    </NavigationContainer>
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
