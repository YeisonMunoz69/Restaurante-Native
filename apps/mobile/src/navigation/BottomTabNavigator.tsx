import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { MenuScreen } from '../screens/MenuScreen';
import { ReservationsScreen } from '../screens/ReservationsScreen';
import { NewsScreen } from '../screens/NewsScreen';
import { UpcomingScreen } from '../screens/UpcomingScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import {
  UtensilsCrossed,
  CalendarDays,
  Newspaper,
  Sparkles,
  Settings,
} from 'lucide-react-native';

export type RootTabParamList = {
  Menu: undefined;
  Reservations: undefined;
  News: undefined;
  Upcoming: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

// navegador principal con cinco destinos y boton central de noticias elevado
export const BottomTabNavigator: React.FC = () => {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Menu"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.marca.primario,
        tabBarInactiveTintColor: colors.texto.secundario,
        tabBarStyle: {
          backgroundColor: colors.superficie.fondo,
          borderTopColor: colors.superficie.borde,
          // Reservo el espacio de los botones o gestos del sistema sin tapar las pestañas.
          height: (Platform.OS === 'android' ? 64 : 80) + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
          elevation: 8, // sombra en Android
        },
        tabBarLabelStyle: {
          ...typography.pie,
          fontWeight: '600',
        },
      }}
    >
      {/* 1. Carta */}
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          tabBarLabel: t('tabs.menu'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <UtensilsCrossed color={color} size={size} />
          ),
        }}
      />

      {/* 2. Reservas */}
      <Tab.Screen
        name="Reservations"
        component={ReservationsScreen}
        options={{
          tabBarLabel: t('tabs.reservations'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <CalendarDays color={color} size={size} />
          ),
        }}
      />

      {/* 3. Noticias - boton central destacado del diseno C-10 */}
      <Tab.Screen
        name="News"
        component={NewsScreen}
        options={{
          tabBarLabel: t('tabs.news'),
          tabBarIcon: ({
            focused,
          }: {
            color: string;
            focused: boolean;
          }) => (
            <View
              style={[
                styles.botonCentral,
                {
                  backgroundColor: focused
                    ? colors.marca.primario
                    : colors.marca.primarioSuave,
                  borderColor: colors.superficie.fondo,
                },
              ]}
            >
              <Newspaper
                color={focused ? colors.texto.inverso : colors.marca.primario}
                size={22}
              />
            </View>
          ),
        }}
      />

      {/* 4. Proximamente */}
      <Tab.Screen
        name="Upcoming"
        component={UpcomingScreen}
        options={{
          tabBarLabel: t('tabs.upcoming'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Sparkles color={color} size={size} />
          ),
        }}
      />

      {/* 5. Ajustes */}
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('tabs.settings'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  botonCentral: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 2,
  },
});
