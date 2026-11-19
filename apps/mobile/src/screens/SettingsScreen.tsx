import React, { useEffect, useState } from 'react';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays, ChevronRight, ClipboardList, Globe, Info, LogOut, MapPin, Moon,
  Newspaper, ShieldCheck, SlidersHorizontal, Sun, User, Users, Utensils, Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { GoogleAccess } from '../components/GoogleAccess';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { BackButton } from '../components/navigation/BackButton';
import { TabPageHeader } from '../components/navigation/TabPageHeader';
import { ProfileAvatar, ProfileDetails, useLocalProfilePhoto } from '../components/settings/AccountProfile';
import { AppearancePicker } from '../components/settings/AppearancePicker';
import { AttentionScreen } from './AttentionScreen';
import { MenuAdminScreen } from './MenuAdminScreen';
import { AdminReservationsScreen } from './AdminReservationsScreen';
import { PaymentSettingsScreen } from './PaymentSettingsScreen';
import { AdminsScreen } from './AdminsScreen';
import { AdminNewsScreen } from './AdminNewsScreen';

const sections = {
  profile: { label: 'settings.profile', icon: User },
  preferences: { label: 'settings.preferences', icon: SlidersHorizontal },
  application: { label: 'settings.appearance', icon: Sun },
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
  const { colors, isDark, spacing } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const photo = useLocalProfilePhoto(user?.id);
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
      style={{ backgroundColor: isDark ? colors.superficie.fondo : colors.superficie.elevada }}
      contentContainerStyle={[styles.content, {
        paddingHorizontal: spacing.margenLateral,
          paddingTop: insets.top + spacing.l,
      }]}
    >
      {section ? (
        <>
          <BackButton onPress={() => setSection(null)} />
          <TabPageHeader title={t(sections[section].label)} />
          {section === 'profile' ? <ProfileDetails photo={photo} /> : <SettingsDetails section={section} />}
        </>
      ) : <SettingsIndex openSection={setSection} openAdminView={setAdminView} localPhoto={photo.uri} />}
    </KeyboardAwareScrollView>
  );
};

type SettingsEntry = {
  id: Section | AdminView;
  title: string;
  summary?: string;
  icon: LucideIcon;
  onPress: () => void;
};

// En el índice muestro el estado actual y dejo los controles en su subpantalla.
function SettingsIndex({ openSection, openAdminView, localPhoto }: {
  openSection: (section: Section) => void;
  openAdminView: (view: AdminView) => void;
  localPhoto: string | null;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { colors, isDark, typography } = useTheme();
  const name = user?.nombre?.trim();
  const personalEntry = (id: Section, summary: string): SettingsEntry => ({
    id,
    title: t(sections[id].label),
    icon: id === 'application' && isDark ? Moon : sections[id].icon,
    onPress: () => openSection(id),
    summary,
  });
  const adminEntry = (id: AdminView, label: string, icon: LucideIcon): SettingsEntry => ({
    id, title: t(label), icon, onPress: () => openAdminView(id),
  });

  return (
    <View style={styles.index}>
      <Text accessibilityRole="header" style={[styles.indexTitle, { color: colors.texto.primario }]}>
        {t('settings.title')}
      </Text>
      {user && (
        <View style={[styles.accountCard, { backgroundColor: colors.marca.primarioSuave }]}>
          <ProfileAvatar nombre={name} googleUri={user.perfil?.fotoGoogleUrl} localUri={localPhoto} size={54} />
          <View style={styles.label}>
            <Text style={[typography.tituloM, { color: colors.texto.primario }]}>
              {name || t('settings.signedIn')}
            </Text>
            <Text style={[typography.cuerpoM, { color: colors.texto.secundario }]}>{user.correo}</Text>
          </View>
        </View>
      )}
      <SettingsGroup title={t('settings.accountGroup')} entries={[
        personalEntry('profile', t('settings.profileSummary')),
        personalEntry('security', t(user?.provider === 'google' ? 'settings.googleConnected' : 'settings.securitySummary')),
      ]} />
      <SettingsGroup title={t('settings.experienceGroup')} entries={[
        personalEntry('application', t(isDark ? 'settings.themeDark' : 'settings.themeLight')),
        personalEntry('preferences', t('settings.languageSummary', { language: t('settings.langSpanish') })),
      ]} />
      <SettingsGroup title={t('settings.helpGroup')} entries={[
        personalEntry('information', t('settings.informationSummary')),
      ]} />
      {user?.rol === 'ADMIN' && (
        <SettingsGroup title={t('settings.adminGroup')} entries={[
          adminEntry('menu', 'menuAdmin.title', Utensils),
          adminEntry('news', 'newsAdmin.title', Newspaper),
          adminEntry('payments', 'payments.title', Wallet),
          adminEntry('admins', 'admins.title', Users),
          adminEntry('reservations', 'reservations.adminTitle', ClipboardList),
          adminEntry('attention', 'attention.title', CalendarDays),
        ]} />
      )}
      {user?.rol === 'STAFF' && (
        <SettingsGroup title={t('settings.operationsGroup')} entries={[
          adminEntry('reservations', 'reservations.agenda', ClipboardList),
        ]} />
      )}
      {!!user && <SettingsLogout />}
    </View>
  );
}

// Comparto el tratamiento de las filas para que cada categoría tenga el mismo gesto de entrada.
function SettingsGroup({ title, entries }: { title: string; entries: SettingsEntry[] }) {
  const { colors, isDark, typography } = useTheme();
  const surface = isDark ? colors.superficie.elevada : colors.superficie.fondo;
  return (
    <View style={styles.group}>
      <Text accessibilityRole="header" style={[typography.etiqueta, styles.groupTitle, { color: colors.texto.secundario }]}>
        {title}
      </Text>
      <View style={[styles.groupCard, { backgroundColor: surface }]}>
        {entries.map(({ id, title: label, summary, icon: Icon, onPress }, index) => (
          <View key={id}>
            {index > 0 && <View style={[styles.divider, { backgroundColor: colors.superficie.borde }]} />}
            <Pressable
              testID={`settings-${id}`}
              accessibilityRole="button"
              onPress={onPress}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.marca.primarioSuave }]}
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.marca.primarioSuave }]}>
                <Icon size={20} strokeWidth={1.8} color={colors.marca.primario} accessible={false} />
              </View>
              <View style={styles.label}>
                <Text style={[typography.cuerpoL, styles.rowTitle, { color: colors.texto.primario }]}>
                  {label}
                </Text>
                {!!summary && <Text style={[typography.cuerpoM, { color: colors.texto.secundario }]}>{summary}</Text>}
              </View>
              <ChevronRight size={18} strokeWidth={1.8} color={colors.texto.secundario} accessible={false} />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

// Dejo la salida al final del índice, después de las opciones disponibles para la cuenta.
function SettingsLogout() {
  const { t } = useTranslation();
  const { isLoading, logout } = useAuth();
  const { colors, typography, radii } = useTheme();
  return (
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
        : <LogOut size={19} color={colors.estado.error} accessible={false} />}
      <Text style={[typography.cuerpoM, styles.rowTitle, { color: colors.estado.error }]}>
        {t('auth.logout')}
      </Text>
    </Pressable>
  );
}

// Muestro los datos y acciones de la sección abierta, sin montar los formularios de las demás.
function SettingsDetails({ section }: { section: Exclude<Section, 'profile'> }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { colors, typography, radii, isDark } = useTheme();
  const primary = { color: colors.texto.primario };
  const secondary = { color: colors.texto.secundario };
  const accent = colors.marca.primario;
  const detailSurface = isDark ? colors.superficie.elevada : colors.superficie.fondo;
  const card = { backgroundColor: detailSurface, borderRadius: radii.l };

  switch (section) {
    case 'preferences':
      return (
        <View style={[styles.detailRow, card]}>
          <Globe size={22} color={accent} />
          <View style={styles.label}>
            <Text style={[typography.cuerpoL, primary]}>{t('settings.language')}</Text>
            <Text style={[typography.cuerpoM, secondary]}>{t('settings.langSpanish')}</Text>
          </View>
        </View>
      );
    case 'application':
      return <AppearancePicker />;
    case 'security':
      return user && (
        <View style={styles.list}>
          <View style={[styles.detailRow, card]}>
            <ShieldCheck size={22} color={accent} />
            <Text style={[typography.cuerpoM, styles.label, secondary]}>{t('auth.secureStorage')}</Text>
          </View>
          {user.provider !== 'google' && <GoogleAccess link />}
        </View>
      );
    case 'information':
      return (
        <View style={[styles.list, card]}>
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
  index: { gap: 21 },
  indexTitle: { fontSize: 34, lineHeight: 41, letterSpacing: -1.1, fontWeight: '700', paddingHorizontal: 4 },
  accountCard: {
    minHeight: 76, borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  group: { gap: 8 },
  groupTitle: { paddingHorizontal: 4, letterSpacing: 0.7, textTransform: 'uppercase' },
  groupCard: { borderRadius: 22, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64,
    paddingVertical: 11, paddingHorizontal: 14,
  },
  rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontWeight: '600' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 12 },
  label: { flex: 1 },
  logout: { marginTop: 4, minHeight: 52, justifyContent: 'center' },
});
