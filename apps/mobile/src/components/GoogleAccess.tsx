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
import { Note } from './attention/Controls';
import { ConnectionForm } from './ConnectionForm';
import { OverlayModal } from './feedback/OverlayModal';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';
import { GoogleButton } from './ui/GoogleButton';

const sello = require('../../android/app/src/main/res/drawable-xxxhdpi/ic_launcher_art.png');

// Inicio sesión con Google sin pedir datos que corresponden al primer paso de reserva.
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
  const [busy, setBusy] = useState(false);
  const [showConnection, setShowConnection] = useState(false);
  const [error, setError] = useState('');
  const closeConnection = () => setShowConnection(false);
  const disabled = busy || isSaving || !supported;

  const submit = async () => {
    if (running.current || isSaving || !supported) return;
    running.current = true;
    setBusy(true);
    setError('');
    try {
      const token = await NativeModules.EncantoBuild.googleIdToken();
      if (!token) return;
      await loginWithGoogle({ idToken: token }, link);
    } catch (failure) {
      const apiFailure = isAxiosError(failure);
      const response = apiFailure ? failure.response : undefined;
      if (__DEV__ && BUILD_ENVIRONMENT === 'dev') {
        // Registro la etapa y el estado sin copiar el error que devolvió el proveedor.
        console.warn('[EC-75][google] sign-in failed', {
          stage: apiFailure ? 'api' : 'credential',
          status: response?.status,
        });
      }
      // Distingo si falló nuestra conexión, la validación o el vínculo de una cuenta previa.
      let errorKey = link ? 'auth.googleLinkError' : 'auth.googleError';
      if (response?.data?.code === 'GOOGLE_LINK_REQUIRED') errorKey = 'auth.googleLinkRequired';
      else if (failure instanceof Error && failure.message === 'GOOGLE_INSECURE_CONNECTION') errorKey = 'auth.googleSecureConnection';
      else if (failure instanceof Error && failure.message === 'SESSION_STORAGE_WRITE_FAILED') errorKey = 'auth.googleStorageError';
      else if (apiFailure && !response) errorKey = 'auth.googleConnectionError';
      else if (response?.status === 503) errorKey = 'auth.googleUnavailable';
      else if (response?.status === 401 && !link) errorKey = 'auth.googleVerifyError';
      setError(t(errorKey));
    } finally {
      setBusy(false);
      running.current = false;
    }
  };

  const actions = (
    <View testID={link ? 'google-link' : 'google-access'} style={styles.actions}>
      {!supported && <Note>{t('auth.googleUnavailable')}</Note>}
      {!!error && <Note live tone="error">{error}</Note>}
      <GoogleButton
        testID="google-submit"
        label={t(link ? 'auth.googleLink' : 'auth.googleSignIn')}
        disabled={disabled}
        busy={busy}
        onPress={() => void submit()}
      />
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
          style={[styles.accessCard, { height: 285, backgroundColor: colors.superficie.fondo }]}>
          <KeyboardAwareScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.top}>
              <View style={[styles.brand, { backgroundColor: colors.marca.primarioSuave }]} accessibilityElementsHidden>
                <Image source={sello} style={styles.sello} resizeMode="contain" />
              </View>
              <View style={styles.filler} />
              {BUILD_ENVIRONMENT === 'local' && (
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
              {t('auth.guestSignInTitle')}
            </Text>
            <Text style={[typography.cuerpoM, { color: colors.texto.secundario }]}>
              {t(entry === 'cart' ? 'auth.guestCartSignIn' : 'auth.guestSettingsSignIn')}
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
