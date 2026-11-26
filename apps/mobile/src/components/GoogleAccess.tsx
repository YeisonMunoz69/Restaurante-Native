import React, { useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { Image, NativeModules, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { Button } from './ui/Button';
import { GoogleButton } from './ui/GoogleButton';

const sello = require('../../android/app/src/main/res/drawable-xxxhdpi/ic_launcher_art.png');

// Mantengo el ID token solo mientras se completa el alta y lo limpio al cancelar o terminar.
export function GoogleAccess({ link = false, entry = 'settings', onClose }: {
  link?: boolean;
  entry?: 'cart' | 'settings';
  onClose?: () => void;
}) {
  const supported = Platform.OS === 'android' &&
    Boolean(GOOGLE_WEB_CLIENT_ID && typeof NativeModules.EncantoBuild?.googleIdToken === 'function');
  const { t } = useTranslation();
  const { loginWithGoogle } = useAuth();
  const { colors, typography } = useTheme();
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
      if (__DEV__ && BUILD_ENVIRONMENT === 'dev') {
        console.warn('[EC-75][google] sign-in failed', {
          stage: apiFailure ? 'api' : 'credential',
          name: failure instanceof Error ? failure.name : 'Unknown',
          message: failure instanceof Error ? failure.message.slice(0, 120) : 'Unknown',
          code: apiFailure ? failure.code : undefined,
          status: typeof response?.status === 'number' ? response.status : undefined,
        });
      }
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
      {pendingToken ? (
        <Button
          testID="google-submit"
          variant="primary"
          label={t('auth.googleComplete')}
          onPress={() => void submit()}
          disabled={disabled}
          busy={busy}
        />
      ) : <GoogleButton
        testID="google-submit"
        label={t(link ? 'auth.googleLink' : 'auth.googleSignIn')}
        disabled={disabled}
        busy={busy}
        onPress={() => void submit()}
      />}
      {pendingToken && (
        <Button
          variant="tertiary"
          label={t('auth.googleChooseAnother')}
          onPress={() => { clearSignup(); setError(''); }}
          disabled={busy}
        />
      )}
    </View>
  );

  if (link || !onClose) return actions;

  // Cierro sin dejar pendiente un alta; mientras hay una solicitud espero su respuesta.
  const closeAccess = () => { if (!running.current) onClose(); };
  return (
    <OverlayModal onRequestClose={closeAccess}>
      <SafeAreaView style={styles.modalFrame}>
        <Pressable accessible={false} onPress={closeAccess} style={StyleSheet.absoluteFill} />
        <View testID="guest-access-modal" accessibilityViewIsModal
          style={[styles.accessCard, { height: pendingToken ? 390 : 285, backgroundColor: colors.superficie.fondo }]}>
          <KeyboardAwareScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.top}>
              <View style={[styles.brand, { backgroundColor: colors.marca.primarioSuave }]} accessibilityElementsHidden>
                <Image source={sello} style={styles.sello} resizeMode="contain" />
              </View>
              <View style={styles.filler} />
              {BUILD_ENVIRONMENT === 'local' && !pendingToken && (
                <Pressable accessibilityRole="button" accessibilityLabel={t('auth.googleTestSettings')}
                  disabled={busy} onPress={() => setShowConnection(true)} style={styles.iconButton}>
                  <SlidersHorizontal size={19} color={colors.texto.secundario} />
                </Pressable>
              )}
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')}
                disabled={busy} onPress={closeAccess} style={styles.iconButton}>
                <X size={22} color={colors.texto.primario} />
              </Pressable>
            </View>
            <Text accessibilityRole="header" style={[typography.tituloL, { color: colors.texto.primario }]}>
              {t(pendingToken ? 'auth.googlePhoneHeading' : 'auth.guestSignInTitle')}
            </Text>
            <Text style={[typography.cuerpoM, { color: colors.texto.secundario }]}>
              {t(pendingToken ? 'auth.googlePhonePrompt' : entry === 'cart' ? 'auth.guestCartSignIn' : 'auth.guestSettingsSignIn')}
            </Text>
            {actions}
          </KeyboardAwareScrollView>
        </View>
      </SafeAreaView>

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
    </OverlayModal>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  brandName: { flex: 1, fontSize: 18, fontWeight: '700', letterSpacing: -0.35 },
  iconButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  filler: { flex: 1 },
  brand: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sello: { width: 64, height: 64 },
  actions: { gap: 12, marginTop: 6 },
  modalFrame: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  accessCard: { width: '100%', maxWidth: 420, maxHeight: '90%', borderRadius: 24, overflow: 'hidden' },
  modalCard: { width: '100%', maxWidth: 460, height: '78%', maxHeight: 555, borderRadius: 24, overflow: 'hidden' },
  modalContent: { padding: 16, gap: 8 },
});
