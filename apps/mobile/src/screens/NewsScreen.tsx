import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Linking, Modal, ScrollView, Share, StyleSheet, Text } from 'react-native';
import { useFocusEffect, type RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type NewsPost } from '@encanto/shared';
import { Action, Note, Panel } from '../components/attention/Controls';
import { BackButton } from '../components/navigation/BackButton';
import { TabPageHeader } from '../components/navigation/TabPageHeader';
import { Feedback } from '../components/feedback/Feedback';
import { useConnection } from '../context/ConnectionContext';
import { connectionUrl } from '../config/connection';
import { useTheme } from '../theme/ThemeContext';
import { newsImageUrl, readNews } from '../services/news.service';
import { newsLink } from '../config/web-links';
import type { RootTabParamList } from '../navigation/BottomTabNavigator';

// Reinicio la vista cuando cambia el destino para no mezclar publicaciones entre entornos.
export function NewsScreen({ route, navigation }: {
  route?: RouteProp<RootTabParamList, 'News'>;
  navigation?: BottomTabNavigationProp<RootTabParamList, 'News'>;
}) {
  const { settings } = useConnection();
  const base = connectionUrl(settings);
  return <NewsFeed key={base + '/' + settings.restauranteId} base={base} restaurant={settings.restauranteId}
    linkedId={route?.params?.id} clearLink={() => navigation?.setParams({ id: undefined })} />;
}

function NewsFeed({ base, restaurant, linkedId, clearLink }: {
  base: string; restaurant: string; linkedId?: string; clearLink: () => void;
}) {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [cached, setCached] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = posts.find(post => post.id === (linkedId ?? selectedId));
  const closeDetail = () => {
    setSelectedId(null);
    if (linkedId) clearLink();
  };

  // Actualizo al abrir la pestaña y cancelo la lectura si cambia la conexión.
  useFocusEffect(useCallback(() => {
    if (!restaurant) return;
    const controller = new AbortController();
    setStatus('loading');
    readNews(base, restaurant, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setPosts(result.posts);
      setCached(result.cached);
      setStatus('ready');
    }).catch(() => {
      if (controller.signal.aborted) return;
      setPosts([]);
      setCached(false);
      setStatus('error');
    });
    return () => controller.abort();
  }, [base, restaurant, attempt]));

  const renderImage = (post: NewsPost) => {
    const uri = newsImageUrl(post, base, restaurant);
    return uri && <Image source={{ uri }} style={styles.image} accessibilityLabel={post.titulo} />;
  };

  const act = (operation: Promise<unknown>) => {
    void operation.catch(() => Feedback.alert(t('news.actionError'), undefined, [], { kind: 'error' }));
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.superficie.fondo }]}>
      <FlatList
        data={posts}
        keyExtractor={post => post.id}
        onRefresh={restaurant ? () => setAttempt(count => count + 1) : undefined}
        refreshing={!!restaurant && status === 'loading' && posts.length > 0}
        contentContainerStyle={[styles.content, styles.feed]}
        ListHeaderComponent={
          <>
            <TabPageHeader title={t('news.title')} />
            {cached && <Note live tone="warning">{t('news.offline')}</Note>}
            {linkedId && status === 'ready' && !selected && (
              <>
                <Note live tone="warning">{t('news.notFound')}</Note>
                <Action variant="tertiary" label={t('common.back')} onPress={closeDetail} />
              </>
            )}
            {status === 'error' && (
              <>
                <Note live tone="error">{t('news.loadError')}</Note>
                <Action label={t('common.retry')} onPress={() => setAttempt(count => count + 1)} />
              </>
            )}
          </>
        }
        ListEmptyComponent={
          !restaurant ? <Note>{t('news.noRestaurant')}</Note> :
          status === 'ready' ? <Note>{t('news.empty')}</Note> :
          status === 'loading' ? <ActivityIndicator accessibilityLabel={t('common.loading')} /> : undefined
        }
        renderItem={({ item }) => (
          <Panel>
            {renderImage(item)}
            {item.fijada && <Note>{t('news.pinned')}</Note>}
            <Text accessibilityRole="header" style={[typography.tituloM, { color: colors.texto.primario }]}>{item.titulo}</Text>
            <Note>{new Date(item.publicadaEn).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}</Note>
            <Text numberOfLines={3} style={[typography.cuerpoM, { color: colors.texto.secundario }]}>{item.cuerpo}</Text>
            <Action label={t('news.read')} accessibilityLabel={t('news.readTitle', { title: item.titulo })} onPress={() => {
              if (linkedId) clearLink();
              setSelectedId(item.id);
            }} />
          </Panel>
        )}
      />
      {selected && (
        <Modal visible animationType="slide" onRequestClose={closeDetail}>
          <SafeAreaView style={[styles.screen, { backgroundColor: colors.superficie.fondo }]}>
            <ScrollView contentContainerStyle={styles.content}>
              <BackButton onPress={closeDetail} />
              <Text accessibilityRole="header" style={[typography.tituloL, { color: colors.texto.primario }]}>{selected.titulo}</Text>
              {renderImage(selected)}
              <Note>{selected.cuerpo}</Note>
              {selected.enlaces.map((url, index) => (
                <Action key={url + index} label={url} onPress={() => act(Linking.openURL(url))} />
              ))}
              <Action label={t('news.share')} onPress={() => act(Share.share({
                message: [selected.titulo, newsLink(selected.id) ?? selected.cuerpo, ...selected.enlaces].join('\n\n'),
              }))} />
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 36, maxWidth: 760, width: '100%', alignSelf: 'center' },
  feed: { paddingTop: 8 },
  image: { width: '100%', aspectRatio: 1200 / 630, borderRadius: 8, marginVertical: 8 },
});
