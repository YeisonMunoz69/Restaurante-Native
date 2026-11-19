import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightColors, DarkColors, Spacing, Radii, Typography } from './tokens';

type ThemeMode = 'light' | 'dark';
const storageKey = 'encanto.appearance.v1';

interface ThemeContextType {
  isDark: boolean;
  isThemeReady: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  colors: typeof LightColors;
  spacing: typeof Spacing;
  radii: typeof Radii;
  typography: typeof Typography;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// este proveedor envuelve toda la aplicacion para que ninguna pantalla use colores en duro
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [themeMode, setStoredMode] = useState<ThemeMode | null>(null);

  // Leo la preferencia antes de mostrar el acceso para evitar un destello al abrir.
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey).catch(() => null).then(saved => {
      if (active) setStoredMode(saved === 'dark' ? 'dark' : 'light');
    });
    return () => { active = false; };
  }, []);

  const isDark = themeMode === 'dark';
  const colors = isDark ? DarkColors : LightColors;

  // La elección queda en este dispositivo y se carga nuevamente al iniciar.
  const setThemeMode = (mode: ThemeMode) => {
    setStoredMode(mode);
    void AsyncStorage.setItem(storageKey, mode).catch(() => undefined);
  };

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        isThemeReady: themeMode !== null,
        setThemeMode,
        colors,
        spacing: Spacing,
        radii: Radii,
        typography: Typography,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// hook personalizado que usamos en cualquier componente para acceder a los colores y tokens
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  }
  return context;
};
