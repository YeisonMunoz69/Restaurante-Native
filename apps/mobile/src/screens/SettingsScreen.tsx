import React, { useEffect, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { GoogleAccess } from '../components/GoogleAccess';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { TabPageHeader } from '../components/navigation/TabPageHeader';
import { Action } from '../components/attention/Controls';
import { AttentionScreen } from './AttentionScreen';
import { MenuAdminScreen } from './MenuAdminScreen';
import { AdminReservationsScreen } from './AdminReservationsScreen';
import { PaymentSettingsScreen } from './PaymentSettingsScreen';
import { AdminsScreen } from './AdminsScreen';
import { AdminNewsScreen } from './AdminNewsScreen';
import {
  Moon,
  Sun,
  Globe,
  MapPin,
  Info,
  ShieldCheck,
  User,
  LogOut,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// pantalla de ajustes con gestion de tema, idioma y estado de autenticacion segura
export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useTranslation();
  const { isDark, toggleTheme, colors, typography, spacing, radii } =
    useTheme();
  const { user, isAuthenticated, isLoading, logout } =
    useAuth();
  const insets = useSafeAreaInsets();
  const [adminView, setAdminView] = useState<'attention' | 'menu' | 'reservations' | 'payments' | 'admins' | 'news' | null>(null);

  // Regreso al formulario que quedó montado en Reservas después de autenticar.
  useEffect(() => {
    if (isAuthenticated && route.params?.returnTo === 'Reservations') {
      navigation.setParams({ returnTo: undefined });
      navigation.navigate('Reservations');
    }
  }, [isAuthenticated, navigation, route.params?.returnTo]);

  if (adminView === 'attention' && user?.rol === 'ADMIN')
    return <AttentionScreen onBack={() => setAdminView(null)} />;
  if (adminView === 'admins' && user?.rol === 'ADMIN')
    return <AdminsScreen onBack={() => setAdminView(null)} />;
  if (adminView === 'payments' && user?.rol === 'ADMIN')
    return <PaymentSettingsScreen onBack={() => setAdminView(null)} />;
  if (adminView === 'menu' && user?.rol === 'ADMIN')
    return <MenuAdminScreen onBack={() => setAdminView(null)} />;
  if (adminView === 'news' && user?.rol === 'ADMIN')
    return <AdminNewsScreen onBack={() => setAdminView(null)} />;
  if (adminView === 'reservations' && (user?.rol === 'ADMIN' || user?.rol === 'STAFF'))
    return <AdminReservationsScreen onBack={() => setAdminView(null)} />;
  return (
    <KeyboardAwareScrollView
      style={[styles.contenedor, { backgroundColor: colors.superficie.fondo }]}
      contentContainerStyle={[
        styles.scrollContent,
        {
          padding: spacing.margenLateral,
          paddingTop: insets.top + spacing.s,
        },
      ]}
    >
      <TabPageHeader title={t('settings.title')} />

      {user?.rol === 'ADMIN' && (
        <View>
          <Action label={t('menuAdmin.title')} onPress={() => setAdminView('menu')} />
          <Action label={t('newsAdmin.title')} onPress={() => setAdminView('news')} />
          <Action label={t('payments.title')} onPress={() => setAdminView('payments')} />
          <Action label={t('admins.title')} onPress={() => setAdminView('admins')} />
          <Action label={t('reservations.adminTitle')} onPress={() => setAdminView('reservations')} />
          <Action
            label={t('attention.title')}
            onPress={() => setAdminView('attention')}
          />
        </View>
      )}
      {user?.rol === 'STAFF' && (
        <Action label={t('reservations.agenda')} onPress={() => setAdminView('reservations')} />
      )}

      {/* Presento el estado de cuenta y el formulario de autenticacion. */}
      <View
        style={[
          styles.seccion,
          {
            backgroundColor: colors.superficie.elevada,
            borderColor: colors.superficie.borde,
            borderRadius: radii.l,
            padding: spacing.l,
            marginTop: spacing.l,
          },
        ]}
      >
        <Text
          style={[
            typography.etiqueta,
            {
              color: colors.texto.secundario,
              textTransform: 'uppercase',
              marginBottom: spacing.m,
            },
          ]}
        >
          {t('auth.title')}
        </Text>

        {isAuthenticated && user ? (
          <View>
            <View style={styles.filaUsuario}>
              <View
                style={[
                  styles.avatarContenedor,
                  {
                    backgroundColor: colors.marca.primario + '20',
                    borderRadius: radii.completo,
                    padding: spacing.s,
                  },
                ]}
              >
                <User size={24} color={colors.marca.primario} />
              </View>

              <View style={{ marginLeft: spacing.m, flex: 1 }}>
                <Text
                  style={[typography.tituloM, { color: colors.texto.primario }]}
                >
                  {user.correo}
                </Text>
                <View
                  style={[
                    styles.badgeRol,
                    {
                      backgroundColor: colors.marca.acento + '30',
                      borderRadius: radii.s,
                      marginTop: 4,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.pie,
                      { color: colors.marca.acento, fontWeight: 'bold' },
                    ]}
                  >
                    {user.rol || 'COMENSAL'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Informo que las credenciales quedan en el almacenamiento seguro. */}
            <View
              style={[
                styles.alertaSegura,
                {
                  backgroundColor: colors.superficie.fondo,
                  borderColor: colors.superficie.borde,
                  borderRadius: radii.m,
                  padding: spacing.m,
                  marginTop: spacing.m,
                },
              ]}
            >
              <ShieldCheck size={18} color={colors.marca.primario} />
              <Text
                style={[
                  typography.pie,
                  {
                    color: colors.texto.secundario,
                    marginLeft: spacing.s,
                    flex: 1,
                  },
                ]}
              >
                {t('auth.secureStorage')}
              </Text>
            </View>

            {user.provider !== 'google' && <GoogleAccess link />}

            {/* boton de cerrar sesion */}
            <TouchableOpacity
              onPress={logout}
              disabled={isLoading}
              style={[
                styles.botonAccion,
                {
                  backgroundColor: colors.estado.error + '15',
                  borderColor: colors.estado.error + '40',
                  borderRadius: radii.m,
                  marginTop: spacing.m,
                  padding: spacing.m,
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.estado.error} />
              ) : (
                <>
                  <LogOut size={18} color={colors.estado.error} />
                  <Text
                    style={[
                      typography.etiqueta,
                      {
                        color: colors.estado.error,
                        marginLeft: spacing.s,
                      },
                    ]}
                  >
                    {t('auth.logout')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* seccion de apariencia */}
      <View
        style={[
          styles.seccion,
          {
            backgroundColor: colors.superficie.elevada,
            borderColor: colors.superficie.borde,
            borderRadius: radii.l,
            padding: spacing.l,
            marginTop: spacing.l,
          },
        ]}
      >
        <Text
          style={[
            typography.etiqueta,
            {
              color: colors.texto.secundario,
              textTransform: 'uppercase',
              marginBottom: spacing.m,
            },
          ]}
        >
          {t('settings.appearance')}
        </Text>

        <View style={styles.filaOpcion}>
          <View style={styles.filaIzquierda}>
            {isDark ? (
              <Moon size={22} color={colors.marca.primario} />
            ) : (
              <Sun size={22} color={colors.marca.primario} />
            )}
            <Text
              style={[
                typography.cuerpoL,
                { color: colors.texto.primario, marginLeft: spacing.m },
              ]}
            >
              {isDark ? t('settings.themeDark') : t('settings.themeLight')}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{
              false: colors.superficie.borde,
              true: colors.marca.primario,
            }}
            thumbColor={colors.texto.inverso}
          />
        </View>
      </View>

      {/* seccion de idioma */}
      <View
        style={[
          styles.seccion,
          {
            backgroundColor: colors.superficie.elevada,
            borderColor: colors.superficie.borde,
            borderRadius: radii.l,
            padding: spacing.l,
            marginTop: spacing.l,
          },
        ]}
      >
        <Text
          style={[
            typography.etiqueta,
            {
              color: colors.texto.secundario,
              textTransform: 'uppercase',
              marginBottom: spacing.m,
            },
          ]}
        >
          {t('settings.language')}
        </Text>

        <View style={styles.filaOpcion}>
          <View style={styles.filaIzquierda}>
            <Globe size={22} color={colors.marca.primario} />
            <Text
              style={[
                typography.cuerpoL,
                { color: colors.texto.primario, marginLeft: spacing.m },
              ]}
            >
              {t('settings.langSpanish')}
            </Text>
          </View>
        </View>
      </View>

      {/* informacion y contacto */}
      <View
        style={[
          styles.seccion,
          {
            backgroundColor: colors.superficie.elevada,
            borderColor: colors.superficie.borde,
            borderRadius: radii.l,
            padding: spacing.l,
            marginTop: spacing.l,
          },
        ]}
      >
        <Text
          style={[
            typography.etiqueta,
            {
              color: colors.texto.secundario,
              textTransform: 'uppercase',
              marginBottom: spacing.m,
            },
          ]}
        >
          {t('settings.contact')}
        </Text>

        <View style={styles.filaOpcion}>
          <View style={styles.filaIzquierda}>
            <MapPin size={22} color={colors.marca.primario} />
            <Text
              style={[
                typography.cuerpoM,
                {
                  color: colors.texto.primario,
                  marginLeft: spacing.m,
                  flex: 1,
                },
              ]}
            >
              {t('settings.location')}
            </Text>
          </View>
        </View>

        <View style={[styles.filaOpcion, { marginTop: spacing.m }]}>
          <View style={styles.filaIzquierda}>
            <Info size={22} color={colors.texto.secundario} />
            <Text
              style={[
                typography.pie,
                { color: colors.texto.secundario, marginLeft: spacing.m },
              ]}
            >
              {t('settings.version')}
            </Text>
          </View>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  seccion: {
    borderWidth: 1,
  },
  filaOpcion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filaIzquierda: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filaUsuario: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContenedor: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRol: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  alertaSegura: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  botonAccion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
