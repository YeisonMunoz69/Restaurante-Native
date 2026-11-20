import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useOnline } from '../context/ConnectivityContext';
import { SlidingPillTabBar } from '../components/navigation/SlidingPillTabBar';
import { MenuScreen } from '../screens/MenuScreen';
import { ReservationsScreen } from '../screens/ReservationsScreen';
import { NewsScreen } from '../screens/NewsScreen';
import { UpcomingScreen } from '../screens/UpcomingScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { OperationsScreen } from '../screens/OperationsScreen';
import {
  UtensilsCrossed,
  CalendarDays,
  Newspaper,
  Sparkles,
  Settings,
  Crown,
  ClipboardCheck,
} from 'lucide-react-native';

export type RootTabParamList = {
  Menu: { slug?: string; fecha?: string } | undefined;
  Reservations: undefined;
  News: { id?: string } | undefined;
  Upcoming: undefined;
  Operations: undefined;
  Settings: { returnTo?: 'Reservations' } | undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
export const TAB_BAR_HEIGHT = Platform.OS === 'android' ? 64 : 80;

// Uso un único indicador elevado para todos los destinos visibles.
export const BottomTabNavigator: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const online = useOnline();
  const canUsePrivateTabs = !!user && online;
  const isAdmin = user?.rol === 'ADMIN';
  const hasOperations = canUsePrivateTabs && (isAdmin || user?.rol === 'STAFF');

  return (
    <Tab.Navigator
      initialRouteName="Menu"
      screenOptions={{ headerShown: false }}
      tabBar={props => <SlidingPillTabBar {...props} height={TAB_BAR_HEIGHT} />}
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
      {canUsePrivateTabs && <Tab.Screen
        name="Reservations"
        component={ReservationsScreen}
        options={{
          tabBarLabel: t('tabs.reservations'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <CalendarDays color={color} size={size} />
          ),
        }}
      />}

      {/* 3. Noticias */}
      <Tab.Screen
        name="News"
        component={NewsScreen}
        options={{
          tabBarLabel: t('tabs.news'),
          tabBarIcon: ({ color, size }) => (
            <Newspaper color={color} size={size} />
          ),
        }}
      />

      {/* 4. Proximamente */}
      {canUsePrivateTabs && <Tab.Screen
        name="Upcoming"
        component={UpcomingScreen}
        options={{
          tabBarLabel: t(hasOperations ? 'tabs.upcomingShort' : 'tabs.upcoming'),
          tabBarAccessibilityLabel: t('tabs.upcoming'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Sparkles color={color} size={size} />
          ),
        }}
      />}

      {hasOperations && <Tab.Screen name="Operations" component={OperationsScreen}
        options={{
          tabBarLabel: t(isAdmin ? 'tabs.adminPanel' : 'tabs.staffAgenda'),
          tabBarIcon: ({ color, size }) => isAdmin
            ? <Crown color={color} size={size} />
            : <ClipboardCheck color={color} size={size} />,
        }} />}

      {/* Ajustes */}
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
