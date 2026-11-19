import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, StyleSheet, Text } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { NewsContentSchema, type NewsPost } from '@encanto/shared';
import { Action, Field, Note, Panel } from '../components/attention/Controls';
import { Feedback } from '../components/feedback/Feedback';
import { BackButton } from '../components/navigation/BackButton';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { useConnection } from '../context/ConnectionContext';
import { useTheme } from '../theme/ThemeContext';
import { adminNewsApi } from '../services/admin-news.service';

// Abro el editor desde Ajustes. Al regresar leo el estado vigente del servidor.
export function AdminNewsScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { settings } = useConnection();
  const { colors, typography } = useTheme();
  const restaurant = settings.restauranteId;
  const [selected, setSelected] = useState<NewsPost | null | undefined>();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const editing = selected !== undefined;

  useEffect(() => {
    if (!restaurant || editing) return;
    const controller = new AbortController();
    setStatus('loading');
    adminNewsApi.list(restaurant, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setPosts(result);
      setStatus('ready');
    }).catch(() => {
      if (!controller.signal.aborted) setStatus('error');
    });
    return () => controller.abort();
  }, [restaurant, editing, attempt]);

  useEffect(() => {
    if (editing) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => handler.remove();
  }, [editing, onBack]);

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.superficie.fondo }]}>
      <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {selected !== undefined ? (
          <NewsEditor key={selected?.id ?? 'new'} initial={selected} restaurant={restaurant} onBack={() => setSelected(undefined)} />
        ) : (
          <>
            <BackButton onPress={onBack} />
            <Text accessibilityRole="header" style={[typography.display, { color: colors.texto.primario }]}>{t('newsAdmin.title')}</Text>
            {restaurant ? <Action variant="primary" label={t('newsAdmin.new')} onPress={() => setSelected(null)} /> : <Note>{t('news.noRestaurant')}</Note>}
            {!!restaurant && status === 'loading' && <ActivityIndicator accessibilityLabel={t('common.loading')} />}
            {status === 'error' && <Note live tone="error">{t('news.loadError')}</Note>}
            {status === 'error' && <Action label={t('common.retry')} onPress={() => setAttempt(value => value + 1)} />}
            {status === 'ready' && posts.length === 0 && <Note>{t('newsAdmin.empty')}</Note>}
            {status === 'ready' && posts.map(post => (
              <Panel key={post.id}>
                <Text style={[typography.tituloM, { color: colors.texto.primario }]}>{post.titulo}</Text>
                <Note>{t(post.publicada ? 'newsAdmin.published' : 'newsAdmin.draft')}</Note>
                {post.fijada && <Note>{t('news.pinned')}</Note>}
                <Action label={t('newsAdmin.edit')} accessibilityLabel={t('newsAdmin.editTitle', { title: post.titulo })} onPress={() => setSelected(post)} />
              </Panel>
            ))}
          </>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

function toForm(post: NewsPost | null) {
  return { titulo: post?.titulo ?? '', cuerpo: post?.cuerpo ?? '', enlaces: post?.enlaces.join('\n') ?? '', fijada: post?.fijada ?? false };
}

function NewsEditor({ initial, restaurant, onBack }: { initial: NewsPost | null; restaurant: string; onBack: () => void }) {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const [post, setPost] = useState(initial);
  const [form, setForm] = useState(() => toForm(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState<string>();
  const sending = useRef(false);
  const mounted = useRef(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(post));

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Confirmo el descarte también con el botón físico.
  const back = useCallback(() => {
    if (sending.current) return;
    if (!dirty) return onBack();
    Feedback.alert(t('newsAdmin.discard'), t('newsAdmin.discardBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('newsAdmin.discard'), style: 'destructive', onPress: onBack },
    ]);
  }, [dirty, onBack, t]);
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => handler.remove();
  }, [back]);

  // Bloqueo dobles envíos y mantengo el formulario si la API rechaza la operación.
  const submit = async (operation: () => Promise<NewsPost | undefined>) => {
    if (sending.current || !mounted.current) return;
    sending.current = true;
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const persisted = await operation();
      if (!persisted || !mounted.current) return;
      setPost(persisted);
      setForm(toForm(persisted));
      setSaved(true);
    } catch (cause) {
      const response = (cause as { response?: { status?: number; data?: { message?: unknown } } })?.response;
      if (mounted.current) setError(response?.status === 409 ? t('newsAdmin.conflict') :
        typeof response?.data?.message === 'string' ? response.data.message : t('newsAdmin.saveError'));
    } finally {
      sending.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const save = (published: boolean, confirmation?: string) => {
    const parsed = NewsContentSchema.safeParse({
      ...form, publicada: published, enlaces: form.enlaces.split('\n').map(line => line.trim()).filter(Boolean),
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? t('newsAdmin.saveError'));
    const persist = () => submit(() => post
      ? adminNewsApi.update(restaurant, post.id, { ...parsed.data, version: post.version })
      : adminNewsApi.create(restaurant, parsed.data));
    if (confirmation) {
      Feedback.alert(confirmation, t('newsAdmin.confirmBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: confirmation, onPress: persist },
      ]);
    } else {
      void persist();
    }
  };

  const upload = () => {
    if (!post) return;
    const select = () => submit(async () => {
      const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
      if (result.didCancel || !mounted.current) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error('Imagen no seleccionada');
      const persisted = await adminNewsApi.upload(restaurant, post.id, post.version, { ...asset, uri: asset.uri });
      if (mounted.current) setPreview(asset.uri);
      return persisted;
    });
    if (post.publicada) {
      Feedback.alert(t('newsAdmin.photo'), t('newsAdmin.confirmBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('newsAdmin.photo'), onPress: select },
      ]);
    } else {
      void select();
    }
  };

  return (
    <>
      <BackButton onPress={back} disabled={busy} />
      <Text accessibilityRole="header" style={[typography.tituloL, { color: colors.texto.primario }]}>{t(post ? 'newsAdmin.edit' : 'newsAdmin.new')}</Text>
      <Note>{t(post?.publicada ? 'newsAdmin.published' : 'newsAdmin.draft')}</Note>
      <Field label={t('newsAdmin.headline')} value={form.titulo} maxLength={120} editable={!busy} onChangeText={titulo => setForm(value => ({ ...value, titulo }))} />
      <Field label={t('newsAdmin.body')} value={form.cuerpo} multiline maxLength={4000} editable={!busy} onChangeText={cuerpo => setForm(value => ({ ...value, cuerpo }))} />
      <Field label={t('newsAdmin.links')} value={form.enlaces} multiline editable={!busy} onChangeText={enlaces => setForm(value => ({ ...value, enlaces }))} />
      <Action label={t('newsAdmin.pin')} selected={form.fijada} disabled={busy} onPress={() => setForm(value => ({ ...value, fijada: !value.fijada }))} />
      {error ? <Note live tone="error">{error}</Note> : saved && !dirty ? <Note live tone="success">{t('newsAdmin.saved')}</Note> : null}
      {busy && <ActivityIndicator accessibilityLabel={t('common.loading')} />}
      <Action variant="primary" label={t(post?.publicada ? 'newsAdmin.save' : 'newsAdmin.saveDraft')} disabled={busy || !dirty} onPress={() => save(post?.publicada ?? false, post?.publicada ? t('newsAdmin.save') : undefined)} />
      {post && (
        <>
          {preview && <Image source={{ uri: preview }} style={styles.preview} accessibilityLabel={t('newsAdmin.photo')} />}
          {!preview && post.imagen && <Note>{t('newsAdmin.hasPhoto')}</Note>}
          <Action label={t('newsAdmin.photo')} disabled={busy || dirty} onPress={upload} />
          <Action label={t(post.publicada ? 'newsAdmin.archive' : 'newsAdmin.publish')} disabled={busy || dirty} onPress={() => save(!post.publicada, t(post.publicada ? 'newsAdmin.archive' : 'newsAdmin.publish'))} />
          {dirty && <Note>{t('newsAdmin.saveFirst')}</Note>}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, maxWidth: 760, width: '100%', alignSelf: 'center' },
  preview: { width: '100%', aspectRatio: 1200 / 630, borderRadius: 8, marginVertical: 8 },
});
