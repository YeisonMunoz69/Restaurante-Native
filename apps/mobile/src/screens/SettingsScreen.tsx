import React, { useEffect, useState } from 'react';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppWindow, ChevronRight, Globe, Info, LogOut, MapPin, Moon, ShieldCheck, SlidersHorizontal, Sun, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { GoogleAccess } from '../components/GoogleAccess';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { BackButton } from '../components/navigation/BackButton';
import { TabPageHeader } from '../components/navigation/TabPageHeader';
import { Action } from '../components/attention/Controls';
import { AttentionScreen } from './AttentionScreen';
import { MenuAdminScreen } from './MenuAdminScreen';
import { AdminReservationsScreen } from './AdminReservationsScreen';
import { PaymentSettingsScreen } from './PaymentSettingsScreen';
import { AdminsScreen } from './AdminsScreen';
import { AdminNewsScreen } from './AdminNewsScreen';

const sections = {
  profile: { label: 'settings.profile', icon: User },
  preferences: { label: 'settings.preferences', icon: SlidersHorizontal },
  application: { label: 'settings.application', icon: AppWindow },
  security: { label: 'auth.title', icon: ShieldCheck },
  information: { label: 'settings.information', icon: Info },
} as const;
type Section = keyof typeof sections;
type AdminView = 'attention' | 'menu' | 'reservations' | 'payments' | 'admins' | 'news';

// Reúno las opciones en Ajustes y conservo los accesos administrativos según el rol.
export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { colors, typography, spacing } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<Section | null>(null);
  const [adminView, setAdminView] = useState<AdminView | null>(null);
  const closeAdminView = () => setAdminView(null);

  // Regreso al formulario que quedó montado en Reservas después de autenticar.
  useEffect(() => {
    if (isAuthenticated && route.params?.returnTo === 'Reservations') {
      navigation.setParams({ returnTo: undefined });
      navigation.navigate('Reservations');
    }
  }, [isAuthenticated, navigation, route.params?.returnTo]);

  // Solo intercepto Atrás si el usuario está leyendo una subpantalla de esta pestaña.
  useEffect(() => {
    if (!isFocused || !section) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      setSection(null);
      return true;
    });
    return () => listener.remove();
  }, [isFocused, section]);

  if (adminView === 'attention' && user?.rol === 'ADMIN')
    return <AttentionScreen onBack={closeAdminView} />;
  if (adminView === 'admins' && user?.rol === 'ADMIN')
    return <AdminsScreen onBack={closeAdminView} />;
  if (adminView === 'payments' && user?.rol === 'ADMIN')
    return <PaymentSettingsScreen onBack={closeAdminView} />;
  if (adminView === 'menu' && user?.rol === 'ADMIN')
    return <MenuAdminScreen onBack={closeAdminView} />;
  if (adminView === 'news' && user?.rol === 'ADMIN')
    return <AdminNewsScreen onBack={closeAdminView} />;
  if (adminView === 'reservations' && (user?.rol === 'ADMIN' || user?.rol === 'STAFF'))
    return <AdminReservationsScreen onBack={closeAdminView} />;

  return (
    <KeyboardAwareScrollView
      key={section ?? 'index'}
      style={{ backgroundColor: colors.superficie.fondo }}
      contentContainerStyle={[styles.content, {
        paddingHorizontal: spacing.margenLateral,
        paddingTop: insets.top + spacing.s,
      }]}
    >
      {section ? (
        <>
          <BackButton onPress={() => setSection(null)} />
          <TabPageHeader title={t(sections[section].label)} />
          <SettingsDetails section={section} />
        </>
      ) : (
        <>
          <TabPageHeader title={t('settings.title')} />
          <View style={styles.list}>
            {(Object.keys(sections) as Section[]).map(key => {
              const { label, icon: Icon } = sections[key];
              return (
                <Pressable
                  key={key}
                  testID={`settings-${key}`}
                  accessibilityRole="button"
                  onPress={() => setSection(key)}
                  style={({ pressed }) => [styles.row, {
                    borderBottomColor: colors.superficie.borde,
                    backgroundColor: pressed ? colors.superficie.elevada : colors.superficie.fondo,
                  }]}
                >
                  <Icon size={21} color={colors.marca.primario} accessible={false} />
                  <Text style={[typography.cuerpoL, styles.label, { color: colors.texto.primario }]}>
                    {t(label)}
                  </Text>
                  <ChevronRight size={18} color={colors.texto.secundario} accessible={false} />
                </Pressable>
              );
            })}
          </View>
          {user?.rol === 'ADMIN' && (
            <View>
              <Action label={t('menuAdmin.title')} onPress={() => setAdminView('menu')} />
              <Action label={t('newsAdmin.title')} onPress={() => setAdminView('news')} />
              <Action label={t('payments.title')} onPress={() => setAdminView('payments')} />
              <Action label={t('admins.title')} onPress={() => setAdminView('admins')} />
              <Action label={t('reservations.adminTitle')} onPress={() => setAdminView('reservations')} />
              <Action label={t('attention.title')} onPress={() => setAdminView('attention')} />
            </View>
          )}
          {user?.rol === 'STAFF' && (
            <Action label={t('reservations.agenda')} onPress={() => setAdminView('reservations')} />
          )}
        </>
      )}
    </KeyboardAwareScrollView>
  );
};

// Muestro los datos y acciones de la sección abierta, sin montar los formularios de las demás.
function SettingsDetails({ section }: { section: Section }) {
  const { t } = useTranslation();
  const { user, isLoading, logout } = useAuth();
  const { colors, typography, radii, isDark, setThemeMode } = useTheme();
  const primary = { color: colors.texto.primario };
  const secondary = { color: colors.texto.secundario };
  const accent = colors.marca.primario;

  switch (section) {
    case 'profile':
      return user && (
        <View style={[styles.panel, { backgroundColor: colors.superficie.elevada, borderRadius: radii.l }]}>
          <View style={styles.detailRow}>
            <User color={accent} size={22} />
            <View style={styles.label}>
              <Text style={[typography.etiqueta, secondary]}>{t('auth.email')}</Text>
              <Text style={[typography.cuerpoL, primary]}>{user.correo}</Text>
            </View>
          </View>
          <Text style={[typography.cuerpoM, secondary]}>{t('auth.role')} · {user.rol || 'COMENSAL'}</Text>
        </View>
      );
    case 'preferences':
      return (
        <View style={styles.detailRow}>
          <Globe size={22} color={accent} />
          <View style={styles.label}>
            <Text style={[typography.cuerpoL, primary]}>{t('settings.language')}</Text>
            <Text style={[typography.cuerpoM, secondary]}>{t('settings.langSpanish')}</Text>
          </View>
        </View>
      );
    case 'application': {
      const ThemeIcon = isDark ? Moon : Sun;
      return (
        <View style={styles.detailRow}>
          <ThemeIcon size={22} color={accent} />
          <View style={styles.label}>
            <Text style={[typography.cuerpoL, primary]}>{t('settings.appearance')}</Text>
            <Text style={[typography.cuerpoM, secondary]}>
              {t(isDark ? 'settings.themeDark' : 'settings.themeLight')}
            </Text>
          </View>
          <Switch
            accessibilityLabel={t('settings.themeDark')}
            value={isDark}
            onValueChange={value => setThemeMode(value ? 'dark' : 'light')}
            trackColor={{ false: colors.superficie.borde, true: accent }}
            thumbColor={colors.texto.inverso}
          />
        </View>
      );
    }
    case 'security':
      return user && (
        <View style={styles.list}>
          <View style={styles.detailRow}>
            <ShieldCheck size={22} color={accent} />
            <Text style={[typography.cuerpoM, styles.label, secondary]}>{t('auth.secureStorage')}</Text>
          </View>
          {user.provider !== 'google' && <GoogleAccess link />}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('auth.logout')}
            accessibilityState={{ disabled: isLoading, busy: isLoading }}
            disabled={isLoading}
            onPress={logout}
            style={({ pressed }) => [styles.detailRow, styles.logout, {
              backgroundColor: colors.estado.error + (pressed ? '20' : '12'),
              borderRadius: radii.l,
            }]}
          >
            {isLoading
              ? <ActivityIndicator color={colors.estado.error} />
              : <LogOut size={19} color={colors.estado.error} />}
            <Text style={[typography.etiqueta, { color: colors.estado.error }]}>{t('auth.logout')}</Text>
          </Pressable>
        </View>
      );
    case 'information':
      return (
        <View style={styles.list}>
          <View style={styles.detailRow}>
            <MapPin size={22} color={accent} />
            <Text style={[typography.cuerpoL, styles.label, primary]}>{t('settings.location')}</Text>
          </View>
          <View style={styles.detailRow}>
            <Info size={22} color={accent} />
            <Text style={[typography.cuerpoM, styles.label, secondary]}>{t('settings.version')}</Text>
          </View>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40, width: '100%', maxWidth: 600, alignSelf: 'center', gap: 8 },
  list: { marginVertical: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 58,
    padding: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 12 },
  panel: { paddingHorizontal: 8, paddingBottom: 12 },
  label: { flex: 1 },
  logout: { marginTop: 16, justifyContent: 'center' },
});
