import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LoginSchema, RegisterSchema } from '@encanto/shared';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
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

// pantalla de ajustes con gestion de tema, idioma y estado de autenticacion segura
export const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { isDark, toggleTheme, colors, typography, spacing, radii } =
    useTheme();
  const { user, isAuthenticated, isLoading, login, register, logout } =
    useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<'login' | 'register'>('login');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');

  // Valido los campos con el mismo esquema compartido por la API.
  const handleSubmit = async () => {
    try {
      setErrorMessage(null);
      if (formMode === 'register') {
        const data = RegisterSchema.parse({
          nombre,
          correo,
          telefono,
          password,
        });
        await register(data);
      } else {
        const credentials = LoginSchema.parse({ correo, password });
        await login(credentials);
      }
    } catch (error: any) {
      const validationMessage = error?.issues?.[0]?.message;
      const serverMessage = error?.response?.data?.message;
      setErrorMessage(
        validationMessage ||
          (typeof serverMessage === 'string' ? serverMessage : null) ||
          t('auth.requestError'),
      );
    }
  };

  return (
    <ScrollView
      style={[styles.contenedor, { backgroundColor: colors.superficie.fondo }]}
      contentContainerStyle={[
        styles.scrollContent,
        { padding: spacing.margenLateral },
      ]}
    >
      <View style={styles.header}>
        <Text style={[typography.display, { color: colors.texto.primario }]}>
          {t('settings.title')}
        </Text>
      </View>

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
        ) : (
          <View>
            <Text
              style={[
                typography.cuerpoM,
                { color: colors.texto.secundario, marginBottom: spacing.m },
              ]}
            >
              {t('auth.guestDesc')}
            </Text>

            {errorMessage && (
              <View
                style={[
                  styles.errorContenedor,
                  {
                    backgroundColor: colors.estado.error + '20',
                    borderColor: colors.estado.error,
                    borderRadius: radii.m,
                    padding: spacing.m,
                    marginBottom: spacing.m,
                  },
                ]}
              >
                <Text style={[typography.pie, { color: colors.estado.error }]}>
                  {errorMessage}
                </Text>
              </View>
            )}

            {formMode === 'register' && (
              <TextInput
                accessibilityLabel={t('auth.name')}
                value={nombre}
                onChangeText={setNombre}
                placeholder={t('auth.name')}
                placeholderTextColor={colors.texto.secundario}
                autoCapitalize="words"
                style={[
                  styles.campo,
                  typography.cuerpoM,
                  {
                    color: colors.texto.primario,
                    borderColor: colors.superficie.borde,
                    borderRadius: radii.m,
                    marginBottom: spacing.s,
                  },
                ]}
              />
            )}
            <TextInput
              accessibilityLabel={t('auth.email')}
              value={correo}
              onChangeText={setCorreo}
              placeholder={t('auth.email')}
              placeholderTextColor={colors.texto.secundario}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              style={[
                styles.campo,
                typography.cuerpoM,
                {
                  color: colors.texto.primario,
                  borderColor: colors.superficie.borde,
                  borderRadius: radii.m,
                  marginBottom: spacing.s,
                },
              ]}
            />
            {formMode === 'register' && (
              <TextInput
                accessibilityLabel={t('auth.phone')}
                value={telefono}
                onChangeText={setTelefono}
                placeholder={t('auth.phone')}
                placeholderTextColor={colors.texto.secundario}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                style={[
                  styles.campo,
                  typography.cuerpoM,
                  {
                    color: colors.texto.primario,
                    borderColor: colors.superficie.borde,
                    borderRadius: radii.m,
                    marginBottom: spacing.s,
                  },
                ]}
              />
            )}
            <TextInput
              accessibilityLabel={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.password')}
              placeholderTextColor={colors.texto.secundario}
              autoCapitalize="none"
              secureTextEntry
              textContentType={
                formMode === 'register' ? 'newPassword' : 'password'
              }
              style={[
                styles.campo,
                typography.cuerpoM,
                {
                  color: colors.texto.primario,
                  borderColor: colors.superficie.borde,
                  borderRadius: radii.m,
                  marginBottom: spacing.m,
                },
              ]}
            />

            <TouchableOpacity
              testID="auth-submit"
              onPress={handleSubmit}
              disabled={isLoading}
              style={[
                styles.botonAccion,
                {
                  backgroundColor: colors.marca.primario,
                  borderRadius: radii.m,
                  padding: spacing.m,
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.texto.inverso} />
              ) : (
                <Text
                  style={[typography.etiqueta, { color: colors.texto.inverso }]}
                >
                  {t(formMode === 'login' ? 'auth.login' : 'auth.register')}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              testID="auth-toggle-mode"
              accessibilityRole="button"
              onPress={() => {
                setErrorMessage(null);
                setFormMode(formMode === 'login' ? 'register' : 'login');
              }}
              disabled={isLoading}
              style={{ alignItems: 'center', paddingTop: spacing.m }}
            >
              <Text style={[typography.pie, { color: colors.marca.primario }]}>
                {t(
                  formMode === 'login'
                    ? 'auth.needAccount'
                    : 'auth.haveAccount',
                )}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    marginTop: 10,
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
  errorContenedor: {
    borderWidth: 1,
  },
  campo: {
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
