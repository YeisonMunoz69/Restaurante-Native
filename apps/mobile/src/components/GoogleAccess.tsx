import React, { useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { ActivityIndicator, Image, NativeModules, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BUILD_ENVIRONMENT, GOOGLE_WEB_CLIENT_ID } from '../config/build-variant';
import { useAuth } from '../context/AuthContext';
import { useConnection } from '../context/ConnectionContext';
import { useTheme } from '../theme/ThemeContext';
import { Field, Note } from './attention/Controls';
import { ConnectionForm } from './ConnectionForm';
import { OverlayModal } from './feedback/OverlayModal';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';

// Uso el símbolo multicolor del paquete oficial de Google Identity.
const googleBrand = require('../assets/google-access-light.png');
const sello = require('../../android/app/src/main/res/drawable-xxxhdpi/ic_launcher_art.png');

// Mantengo el ID token solo mientras se completa el alta y lo limpio al cancelar o terminar.
export function GoogleAccess({ link = false }: { link?: boolean }) {
  const supported = Platform.OS === 'android' &&
    Boolean(GOOGLE_WEB_CLIENT_ID && typeof NativeModules.EncantoBuild?.googleIdToken === 'function');
  const { t } = useTranslation();
  const { loginWithGoogle } = useAuth();
  const { colors, isDark, typography, radii } = useTheme();
  const { isSaving } = useConnection();
  const running = useRef(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [showConnection, setShowConnection] = useState(false);
  const [error, setError] = useState('');
  const clearSignup = () => { setPendingToken(null); setPhone(''); };
  const closeConnection = () => setShowConnection(false);
  const disabled = busy || isSaving || !supported;

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
      const apiFailure = isAxiosError(failure);
      const response = apiFailure ? failure.response : undefined;
      if (response?.data?.code === 'GOOGLE_PHONE_REQUIRED' && token && !link) {
        setPendingToken(token);
      } else {
        if (response?.status === 401 || response?.status === 409) clearSignup();
        // Distingo si falló nuestra conexión, la validación o el vínculo de una cuenta previa.
        let errorKey = link ? 'auth.googleLinkError' : 'auth.googleError';
        if (response?.data?.code === 'GOOGLE_LINK_REQUIRED') errorKey = 'auth.googleLinkRequired';
        else if (failure instanceof Error && failure.message === 'GOOGLE_INSECURE_CONNECTION') errorKey = 'auth.googleSecureConnection';
        else if (apiFailure && !response) errorKey = 'auth.googleConnectionError';
        else if (response?.status === 503) errorKey = 'auth.googleUnavailable';
        else if (response?.status === 401 && !link) errorKey = 'auth.googleVerifyError';
        setError(t(errorKey));
      }
    } finally {
      setBusy(false);
      running.current = false;
    }
  };

  const actions = (
    <View testID={link ? 'google-link' : 'google-access'} style={styles.actions}>
      {!supported && <Note>{t('auth.googleUnavailable')}</Note>}
      {!!error && <Note live tone="error">{error}</Note>}
      {pendingToken && (
        <Field label={t('auth.phone')} keyboardType="phone-pad" maxLength={10} value={phone}
          editable={!busy} onChangeText={setPhone} autoComplete="tel" />
      )}
      <Pressable
        testID="google-submit"
        accessibilityRole="button"
        accessibilityState={{ disabled, busy }}
        disabled={disabled}
        onPress={() => void submit()}
        style={({ pressed }) => [styles.button, pendingToken ? {
          backgroundColor: colors.marca.primario, borderRadius: radii.completo,
        } : styles.googleButton, {
          opacity: pressed || disabled ? 0.65 : 1,
        }]}
      >
        {busy ? <ActivityIndicator color={pendingToken ? colors.texto.inverso : '#1f1f1f'} />
          : !pendingToken && <View accessible={false} style={styles.googleMark}>
            <Image source={googleBrand} resizeMode="contain" style={styles.googleArtwork} />
          </View>}
        <Text style={[styles.buttonText, { color: pendingToken ? colors.texto.inverso : '#1f1f1f' }]}>
          {t(link ? 'auth.googleLink' : pendingToken ? 'auth.googleComplete' : 'auth.googleSignIn')}
        </Text>
      </Pressable>
      {pendingToken && (
        <Pressable
          accessibilityRole="button"
          onPress={() => { clearSignup(); setError(''); }}
          disabled={busy}
          style={styles.back}
        >
          <Text style={[typography.etiqueta, { color: colors.marca.primario }]}>{t('auth.googleChooseAnother')}</Text>
        </Pressable>
      )}
    </View>
  );

  if (link) return actions;
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: isDark ? colors.superficie.fondo : colors.superficie.elevada }]}>
      <KeyboardAwareScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <Text style={[styles.brandName, { color: colors.marca.primario }]}>{t('auth.googleWelcome')}</Text>
          {BUILD_ENVIRONMENT === 'local' && !pendingToken && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('auth.googleTestSettings')}
              disabled={busy}
              onPress={() => setShowConnection(true)}
              style={styles.iconButton}
            >
              <SlidersHorizontal size={19} color={colors.texto.secundario} />
            </Pressable>
          )}
        </View>

        <View style={styles.main}>
          {!pendingToken && (
            <View style={styles.hero} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <View style={[styles.orbit, { borderColor: colors.marca.primario + '34' }]} />
              <View style={[styles.halo, { backgroundColor: colors.marca.primarioSuave }]} />
              <View style={styles.medallion}>
                <Image source={sello} resizeMode="contain" style={styles.sello} />
              </View>
            </View>
          )}
          <View style={styles.intro}>
            <Text accessibilityRole="header" style={[styles.heading, { color: colors.texto.primario }]}>
              {t(pendingToken ? 'auth.googlePhoneHeading' : 'auth.googleHeading')}
            </Text>
            <Text style={[typography.cuerpoL, styles.introText, { color: colors.texto.secundario }]}>
              {t(pendingToken ? 'auth.googlePhonePrompt' : 'auth.googleIntro')}
            </Text>
          </View>
          {actions}
        </View>
      </KeyboardAwareScrollView>

      {showConnection && (
        <OverlayModal onRequestClose={closeConnection}>
          <SafeAreaView style={styles.modalFrame}>
            <Pressable accessible={false} onPress={closeConnection} style={StyleSheet.absoluteFill} />
            <View accessibilityViewIsModal style={[styles.modalCard, { backgroundColor: colors.superficie.fondo }]}>
              <KeyboardAwareScrollView contentContainerStyle={styles.modalContent}>
                <View style={styles.top}>
                  <Text accessibilityRole="header" style={[typography.tituloM, styles.brandName, { color: colors.texto.primario }]}>
                    {t('auth.googleTestSettings')}
                  </Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')}
                    onPress={closeConnection} style={styles.iconButton}>
                    <X size={22} color={colors.texto.primario} />
                  </Pressable>
                </View>
                <ConnectionForm />
              </KeyboardAwareScrollView>
            </View>
          </SafeAreaView>
        </OverlayModal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    width: '100%', maxWidth: 460, alignSelf: 'center', flexGrow: 1,
    paddingHorizontal: 26, paddingTop: 14, paddingBottom: 32,
  },
  top: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  brandName: { flex: 1, fontSize: 18, fontWeight: '700', letterSpacing: -0.35 },
  iconButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  main: { flexGrow: 1, justifyContent: 'center', gap: 20, paddingVertical: 16 },
  hero: { height: 228, justifyContent: 'center', alignItems: 'center' },
  orbit: { position: 'absolute', width: 226, height: 172, borderRadius: 120, borderWidth: 1, transform: [{ rotate: '-24deg' }] },
  halo: { position: 'absolute', width: 198, height: 198, borderRadius: 99 },
  medallion: {
    width: 150, height: 150, borderRadius: 75, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFCF4', elevation: 4, shadowColor: '#3C422D',
    shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 },
  },
  // El archivo del sello tiene un margen transparente: el dibujo ocupa el centro del medallón.
  sello: { width: 208, height: 208 },
  intro: { gap: 12, alignItems: 'center' },
  heading: { fontFamily: 'serif', fontSize: 38, lineHeight: 43, fontWeight: '700', letterSpacing: -1.4, textAlign: 'center' },
  introText: { maxWidth: 310, textAlign: 'center' },
  actions: { gap: 12, marginTop: 6 },
  button: { minHeight: 54, flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center', padding: 12 },
  buttonText: { flexShrink: 1, fontSize: 15, lineHeight: 21, fontWeight: '600', textAlign: 'center' },
  googleButton: { backgroundColor: '#fff', borderColor: '#747775', borderWidth: 1, borderRadius: 26 },
  googleMark: { width: 20, height: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  googleArtwork: { width: 40, height: 40 },
  back: { minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  modalFrame: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 460, height: '78%', maxHeight: 555, borderRadius: 24, overflow: 'hidden' },
  modalContent: { padding: 16, gap: 8 },
});
