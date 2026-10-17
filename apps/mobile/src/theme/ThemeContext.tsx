import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';
import { LightColors, DarkColors, Spacing, Radii, Typography } from './tokens';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
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
  const sistemaScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  // calculo si esta oscuro segun la eleccion del usuario o el tema del celular
  const isDark =
    themeMode === 'system' ? sistemaScheme === 'dark' : themeMode === 'dark';

  const colors = isDark ? DarkColors : LightColors;

  // funcion sencilla para alternar entre claro y oscuro desde la pantalla de Ajustes
  const toggleTheme = () => {
    setThemeMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        themeMode,
        setThemeMode,
        toggleTheme,
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
