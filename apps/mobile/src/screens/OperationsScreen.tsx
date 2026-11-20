import React, { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CalendarDays, ChevronRight, ClipboardList, Crown, Newspaper, UsersRound, Utensils, Wallet,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { LightColors } from '../theme/tokens';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { ContextHelp } from '../components/feedback/ContextOverlay';
import { AdminReservationsScreen } from './AdminReservationsScreen';
import { AttentionScreen } from './AttentionScreen';
import { MenuAdminScreen } from './MenuAdminScreen';
import { AdminNewsScreen } from './AdminNewsScreen';
import { PaymentSettingsScreen } from './PaymentSettingsScreen';
import { AdminsScreen } from './AdminsScreen';

const destinations = [
  { label: 'reservations.adminTitle', icon: ClipboardList, screen: AdminReservationsScreen },
  { label: 'attention.title', icon: CalendarDays, screen: AttentionScreen },
  { label: 'menuAdmin.title', icon: Utensils, screen: MenuAdminScreen },
  { label: 'newsAdmin.title', icon: Newspaper, screen: AdminNewsScreen },
  { label: 'payments.title', icon: Wallet, screen: PaymentSettingsScreen },
  { label: 'admins.title', icon: UsersRound, screen: AdminsScreen },
] as const;

export function OperationsScreen() {
  const { user } = useAuth();
  if (user?.rol === 'STAFF') return <AdminReservationsScreen key={user.id} />;
  if (user?.rol === 'ADMIN') return <AdminHub key={user.id} />;
  return null;
}

function AdminHub() {
  const { t } = useTranslation();
  const { colors, radii, typography, spacing } = useTheme();
  const isFocused = useIsFocused();
  const [selected, setSelected] = useState<(typeof destinations)[number] | null>(null);
  useEffect(() => {
    if (!isFocused || !selected) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelected(null);
      return true;
    });
    return () => listener.remove();
  }, [isFocused, selected]);
  if (selected) {
    const Screen = selected.screen;
    return <Screen onBack={() => setSelected(null)} />;
  }
  const onBanner = LightColors.texto.inverso;
  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.superficie.fondo }]}>
      <KeyboardAwareScrollView contentContainerStyle={[styles.content, { paddingHorizontal: spacing.margenLateral }]}>
        <View style={[styles.hero, { backgroundColor: colors.admin.encabezado, borderRadius: radii.l }]}>
          <View style={styles.heroRow}>
            <Crown size={30} color={onBanner} />
            <ContextHelp title={t('reservations.adminWorkspace')} text={t('reservations.adminWorkspaceDescription')} onDark />
          </View>
          <Text accessibilityRole="header" style={[typography.display, { color: onBanner }]}>
            {t('reservations.adminWorkspace')}
          </Text>
        </View>
        {destinations.map(destination => {
          const Icon = destination.icon;
          return (
            <Pressable key={destination.label} accessibilityRole="button"
              onPress={() => setSelected(destination)}
              style={({ pressed }) => [styles.destination, {
                backgroundColor: pressed ? colors.marca.primarioSuave : colors.superficie.elevada,
                borderRadius: radii.l,
              }]}>
              <Icon size={22} color={colors.marca.primario} />
              <Text style={[typography.cuerpoL, styles.label, { color: colors.texto.primario }]}>{t(destination.label)}</Text>
              <ChevronRight size={19} color={colors.texto.secundario} />
            </Pressable>
          );
        })}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', gap: 10, paddingTop: 10, paddingBottom: 32 },
  hero: { padding: 20, gap: 10, marginBottom: 6 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  destination: { minHeight: 58, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { flex: 1 },
});
