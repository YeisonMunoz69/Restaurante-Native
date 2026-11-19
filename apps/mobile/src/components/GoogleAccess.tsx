import React, { useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { ActivityIndicator, Image, NativeModules, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BUILD_ENVIRONMENT, GOOGLE_WEB_CLIENT_ID } from '../config/build-variant';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { Action, Field, Note } from './attention/Controls';
import { ConnectionForm } from './ConnectionForm';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';
import { TabPageHeader } from './navigation/TabPageHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConnection } from '../context/ConnectionContext';

// Uso el símbolo multicolor del paquete oficial de Google Identity.
const googleBrand = require('../assets/google-access-light.png');

// Mantengo el ID token solo mientras se completa el alta y lo limpio al cancelar o terminar.
export function GoogleAccess({ link = false }: { link?: boolean }) {
  const supported = Platform.OS === 'android' &&
    Boolean(GOOGLE_WEB_CLIENT_ID && typeof NativeModules.EncantoBuild?.googleIdToken === 'function');
  const { t } = useTranslation();
  const { loginWithGoogle } = useAuth();
  const { colors, typography, radii } = useTheme();
  const { isSaving } = useConnection();
  const running = useRef(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [showConnection, setShowConnection] = useState(false);
  const [error, setError] = useState('');
  const clearSignup = () => { setPendingToken(null); setPhone(''); };

  const submit = async () => {
    if (running.current || isSaving || !supported) return;
    if (pendingToken && !/^\d{10}$/.test(phone.trim())) {
      setError(t('auth.googlePhoneInvalid'));
      return;
    }
    running.current = true;
    setBusy(true);
    setError('');
    let token = pendingToken;
    try {
      token ??= await NativeModules.EncantoBuild.googleIdToken();
      if (!token) return;
      await loginWithGoogle(pendingToken ? { idToken: token, telefono: phone.trim() } : { idToken: token }, link);
      clearSignup();
    } catch (failure) {
      const response = isAxiosError(failure) ? failure.response : undefined;
      if (response?.data?.code === 'GOOGLE_PHONE_REQUIRED' && token && !link) {
        setPendingToken(token);
      } else {
        if (response?.status === 401 || response?.status === 409) clearSignup();
        setError(t(
          response?.data?.code === 'GOOGLE_LINK_REQUIRED' ? 'auth.googleLinkRequired'
            : failure instanceof Error && failure.message === 'GOOGLE_INSECURE_CONNECTION'
              ? 'auth.googleSecureConnection'
              : response?.status === 503 ? 'auth.googleUnavailable'
                : link ? 'auth.googleLinkError' : 'auth.googleError',
        ));
      }
    } finally {
      setBusy(false);
      running.current = false;
    }
  };

  const actions = (
    <View testID={link ? 'google-link' : 'google-access'} style={styles.actions}>
      {!supported && <Note>{t('auth.googleUnavailable')}</Note>}
      {error && <Note live tone="error">{error}</Note>}
      {pendingToken && (
        <>
          <Text style={[typography.cuerpoM, { color: colors.texto.secundario }]}>{t('auth.googlePhonePrompt')}</Text>
          <Field label={t('auth.phone')} keyboardType="phone-pad" maxLength={10} value={phone}
            editable={!busy} onChangeText={setPhone} autoComplete="tel" />
        </>
      )}
      <Pressable
        testID="google-submit"
        accessibilityRole="button"
        accessibilityState={{ disabled: busy || isSaving || !supported, busy }}
        disabled={busy || isSaving || !supported}
        onPress={() => void submit()}
        style={({ pressed }) => [styles.button, pendingToken ? {
          backgroundColor: colors.marca.primario, borderRadius: radii.completo,
        } : styles.googleButton, {
          opacity: pressed || !supported ? 0.55 : 1,
        }]}
      >
        {busy ? <ActivityIndicator color={pendingToken ? colors.texto.inverso : '#1f1f1f'} />
          : !pendingToken && <View accessible={false} style={styles.googleMark}>
            <Image source={googleBrand} resizeMode="contain" style={styles.googleArtwork} />
          </View>}
        <Text style={[typography.etiqueta, { color: pendingToken ? colors.texto.inverso : '#1f1f1f' }]}>
          {t(link ? 'auth.googleLink' : pendingToken ? 'auth.googleComplete' : 'auth.googleSignIn')}
        </Text>
      </Pressable>
      {pendingToken && <Action label={t('common.back')} disabled={busy} onPress={() => { clearSignup(); setError(''); }} />}
    </View>
  );

  if (link) return actions;
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.superficie.fondo }]}>
      <KeyboardAwareScrollView contentContainerStyle={styles.content}>
        <TabPageHeader title={t('auth.googleWelcome')} />
        <Text accessibilityRole="header" style={[typography.display, { color: colors.texto.primario }]}>
          {t('auth.googleHeading')}
        </Text>
        <Text style={[typography.cuerpoM, { color: colors.texto.secundario }]}>
          {t('auth.googleIntro')}
        </Text>
        {actions}
        {BUILD_ENVIRONMENT === 'local' && !pendingToken && (
          <>
            <Action label={t('attention.connection')} disabled={busy}
              onPress={() => setShowConnection(value => !value)} />
            {showConnection && !busy && <ConnectionForm />}
          </>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    width: '100%', maxWidth: 460, alignSelf: 'center', flexGrow: 1,
    justifyContent: 'center', padding: 24, gap: 12,
  },
  actions: { gap: 8, marginVertical: 8 },
  button: { minHeight: 48, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', padding: 12 },
  googleButton: { backgroundColor: '#fff', borderColor: '#747775', borderWidth: 1, borderRadius: 24 },
  googleMark: { width: 20, height: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  googleArtwork: { width: 40, height: 40 },
});
