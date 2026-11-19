import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { User, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConnection } from '../../context/ConnectionContext';
import { connectionUrl } from '../../config/connection';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Action, Field, Note } from '../attention/Controls';
import { Feedback, FeedbackMessage } from '../feedback/Feedback';
import { OverlayModal } from '../feedback/OverlayModal';
import { KeyboardAwareScrollView } from '../KeyboardAwareScrollView';
import { ProfileUpdateSchema } from '@encanto/shared';

// Identifico la foto local por servidor y cuenta para que no aparezca al iniciar con otra persona.
export function useLocalProfilePhoto(owner?: string) {
  const { settings } = useConnection();
  const key = owner ? `encanto.profile-photo.v1/${encodeURIComponent(connectionUrl(settings))}/${owner}` : null;
  const [stored, setStored] = useState<{ key: string; uri: string | null }>();
  const activeKey = useRef(key);
  activeKey.current = key;

  useEffect(() => {
    if (!key) return;
    let active = true;
    void AsyncStorage.getItem(key).catch(() => null).then(uri => {
      if (active) setStored({ key, uri });
    });
    return () => { active = false; };
  }, [key]);

  // Guardo una copia pequeña y duradera porque el archivo del selector vive en caché.
  async function save(uri: string | null) {
    if (!key || key !== activeKey.current) return;
    if (uri) await AsyncStorage.setItem(key, uri);
    else await AsyncStorage.removeItem(key);
    if (key === activeKey.current) setStored({ key, uri });
  }

  return { uri: stored && stored.key === key ? stored.uri : null, ready: !!key && stored?.key === key, save };
}
type LocalPhoto = ReturnType<typeof useLocalProfilePhoto>;

// Si una imagen deja de cargar, vuelvo a la foto de Google o a las iniciales.
export function ProfileAvatar({ nombre, googleUri, localUri, size = 48 }: {
  nombre?: string;
  googleUri?: string | null;
  localUri?: string | null;
  size?: number;
}) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const uri = [localUri, googleUri].find(candidate => candidate && !failed[candidate]);
  const initials = nombre?.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join('').toUpperCase();

  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.marca.primario }]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
          onError={() => setFailed(previous => ({ ...previous, [uri]: true }))}
        />
      ) : initials ? (
        <Text style={[styles.initials, { fontSize: size * 0.32, color: colors.texto.inverso }]}>{initials}</Text>
      ) : <User size={size / 2} color={colors.texto.inverso} />}
    </View>
  );
}

// Muestro los datos aunque falte alguno y separo la edición de la vista de lectura.
export function ProfileDetails({ photo }: { photo: LocalPhoto }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { colors, isDark, typography } = useTheme();
  const [editing, setEditing] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const selecting = useRef(false);
  const [message, setMessage] = useState<'saved' | 'error' | null>(null);
  if (!user) return null;

  const profile = user.perfil;
  const nombre = profile?.nombre ?? user.nombre;
  const googleUri = profile?.fotoGoogleUrl;
  const surface = isDark ? colors.superficie.elevada : colors.superficie.fondo;
  const detalle = [
    { label: 'auth.name', value: nombre },
    { label: 'auth.email', value: user.correo },
    { label: 'settings.phoneContact', value: profile?.telefono },
    { label: 'settings.city', value: profile?.ciudad },
    { label: 'auth.role', value: user.rol || 'COMENSAL' },
  ];

  // Reduzco la imagen antes de guardar y dejo el selector nativo manejar el permiso de acceso.
  async function choosePhoto(remove = false) {
    if (selecting.current || !photo.ready) return;
    selecting.current = true;
    setPhotoBusy(true);
    setMessage(null);
    try {
      if (remove) {
        await photo.save(null);
        return;
      }
      const result = await launchImageLibrary({
        mediaType: 'photo', selectionLimit: 1, maxWidth: 384, maxHeight: 384, quality: 0.8,
        assetRepresentationMode: 'compatible', includeBase64: true,
      });
      if (result.didCancel) return;
      const asset = result.assets?.[0];
      if (result.errorCode || !asset?.base64 || !asset.type ||
        !['image/jpeg', 'image/png', 'image/webp'].includes(asset.type) || asset.base64.length > 720_000) {
        setMessage('error');
        return;
      }
      await photo.save(`data:${asset.type};base64,${asset.base64}`);
    } catch {
      setMessage('error');
    } finally {
      selecting.current = false;
      setPhotoBusy(false);
    }
  }

  return (
    <View style={styles.profile}>
      <View style={[styles.card, { backgroundColor: surface }]}>
        <View style={styles.pictureRow}>
          <ProfileAvatar nombre={nombre} googleUri={googleUri} localUri={photo.uri} size={70} />
          <View style={styles.stretch}>
            <Text style={[typography.tituloM, { color: colors.texto.primario }]}>{t('settings.profilePhoto')}</Text>
            <Text style={[typography.cuerpoM, { color: colors.texto.secundario }]}>{t('settings.photoLocalHint')}</Text>
          </View>
        </View>
        <Action label={t('settings.choosePhoto')} disabled={!photo.ready || photoBusy} onPress={() => void choosePhoto()} />
        {!!photo.uri && (
          <Action label={t(googleUri ? 'settings.useGooglePhoto' : 'settings.removePhoto')} disabled={photoBusy} onPress={() => void choosePhoto(true)} />
        )}
        {message === 'error' && <Note live tone="error">{t('settings.photoError')}</Note>}
      </View>
      <View style={[styles.card, { backgroundColor: surface }]}>
        {detalle.map(({ label, value }) => (
          <View key={label} style={styles.valueRow}>
            <Text style={[typography.etiqueta, { color: colors.texto.secundario }]}>{t(label)}</Text>
            <Text style={[typography.cuerpoL, { color: colors.texto.primario }]}>
              {value || t('settings.profileEmpty')}
            </Text>
          </View>
        ))}
        {message === 'saved' && <FeedbackMessage kind="success">{t('settings.profileSaved')}</FeedbackMessage>}
        <Action label={t('settings.editProfile')} onPress={() => { setMessage(null); setEditing(true); }} />
      </View>
      {editing && (
        <ProfileEditor
          nombre={nombre ?? ''}
          telefono={profile?.telefono ?? ''}
          ciudad={profile?.ciudad ?? ''}
          onClose={() => setEditing(false)}
          onSave={() => { setEditing(false); setMessage('saved'); }}
        />
      )}
    </View>
  );
}

// Solo cierro el editor automáticamente después de que la API confirme el guardado.
function ProfileEditor({ nombre, telefono, ciudad, onClose, onSave }: {
  nombre: string;
  telefono: string;
  ciudad: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const { updateProfile } = useAuth();
  const { colors, typography } = useTheme();
  const [draft, setDraft] = useState({ nombre, telefono, ciudad });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const changes = {
    nombre: draft.nombre.trim() === nombre ? undefined : draft.nombre.trim(),
    telefono: draft.telefono.trim() === telefono ? undefined : draft.telefono.trim(),
    ciudad: draft.ciudad.trim() === ciudad ? undefined : draft.ciudad.trim() || null,
  };
  const dirty = Object.values(changes).some(value => value !== undefined);

  function close() {
    if (saving.current) return;
    if (!dirty) {
      onClose();
      return;
    }
    Feedback.alert(t('settings.discardTitle'), t('settings.discardBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.discardAction'), style: 'destructive', onPress: onClose },
    ]);
  }

  async function submit() {
    if (saving.current || !dirty) return;
    const input = ProfileUpdateSchema.safeParse(changes);
    if (!input.success) {
      setError('settings.profileInvalid');
      return;
    }
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      await updateProfile(input.data);
      onSave();
    } catch {
      setError('settings.profileError');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <OverlayModal onRequestClose={close}>
      <SafeAreaView style={styles.modalFrame}>
        <View style={[styles.modal, { backgroundColor: colors.superficie.fondo }]}>
          <KeyboardAwareScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.pictureRow}>
              <Text accessibilityRole="header" style={[typography.tituloL, styles.stretch, { color: colors.texto.primario }]}>
                {t('settings.editProfile')}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} disabled={busy}
                onPress={close} style={styles.closeButton}>
                <X color={colors.texto.primario} size={22} />
              </Pressable>
            </View>
            <Field label={t('auth.name')} value={draft.nombre} maxLength={100} autoComplete="name" editable={!busy}
              onChangeText={value => setDraft({ ...draft, nombre: value })} />
            <Field label={t('settings.phoneContact')} value={draft.telefono} maxLength={10} keyboardType="phone-pad" autoComplete="tel" editable={!busy}
              onChangeText={value => setDraft({ ...draft, telefono: value })} />
            <Field label={t('settings.cityOptional')} value={draft.ciudad} maxLength={80} editable={!busy}
              onChangeText={value => setDraft({ ...draft, ciudad: value })} />
            {!!error && <Note live tone="error">{t(error)}</Note>}
            <Action label={t('settings.saveProfile')} disabled={busy || !dirty} onPress={() => void submit()} />
          </KeyboardAwareScrollView>
        </View>
      </SafeAreaView>
    </OverlayModal>
  );
}

const styles = StyleSheet.create({
  profile: { gap: 16 },
  card: { padding: 16, borderRadius: 22, gap: 10 },
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { fontWeight: '700' },
  pictureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stretch: { flex: 1 },
  valueRow: { gap: 2, paddingVertical: 3 },
  modalFrame: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  modal: { width: '100%', maxWidth: 460, height: '78%', maxHeight: 520, borderRadius: 22, overflow: 'hidden' },
  modalContent: { padding: 18, gap: 12 },
  closeButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
