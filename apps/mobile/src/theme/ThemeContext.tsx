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
export const ThemeProvider: React.FC<{ children: React.ReactNode; accountKey?: string | null }> = ({
  children,
  accountKey,
}) => {
  const key = accountKey === null ? null : accountKey
    ? `${storageKey}/${encodeURIComponent(accountKey)}`
    : storageKey;
  const [stored, setStoredMode] = useState<{ key: string; mode: ThemeMode }>();
  const themeMode = stored?.key === key ? stored?.mode : undefined;

  // Leo la preferencia antes de mostrar el acceso para evitar un destello al abrir.
  useEffect(() => {
    if (!key) return;
    let active = true;
    void AsyncStorage.getItem(key).catch(() => null).then(saved => {
      if (active) setStoredMode({ key, mode: saved === 'dark' ? 'dark' : 'light' });
    });
    return () => { active = false; };
  }, [key]);

  const isDark = themeMode === 'dark';
  const colors = isDark ? DarkColors : LightColors;

  // La elección queda en este dispositivo y se carga nuevamente al iniciar.
  const setThemeMode = (mode: ThemeMode) => {
    if (!key) return;
    setStoredMode({ key, mode });
    void AsyncStorage.setItem(key, mode).catch(() => undefined);
  };

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        isThemeReady: !key || themeMode !== undefined,
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
