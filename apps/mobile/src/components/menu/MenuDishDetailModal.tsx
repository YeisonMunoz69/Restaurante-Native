import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { ChevronLeft, CircleCheck, Share2, UtensilsCrossed } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MenuDish } from '@encanto/shared';
import { useTheme } from '../../theme/ThemeContext';
import { menuApi } from '../../services/menu.service';
import { menuGallery } from './menu-photo';
import { formatCop } from '../../utils/formatters';
import { dishLink } from '../../config/web-links';
import { Feedback } from '../feedback/Feedback';

export function MenuDishDetailModal({
  visible,
  restauranteId,
  fecha,
  dishId,
  slug,
  onClose,
}: {
  visible: boolean;
  restauranteId: string;
  fecha: string;
  dishId: string | null;
  slug?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors, typography, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [dish, setDish] = useState<MenuDish | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const shareUrl = dish?.disponible ? dishLink(dish.slug, fecha) : null;
  const photos = dish ? menuGallery(dish) : [];
  const galleryWidth = Math.min(520, width - spacing.margenLateral * 2);
  const photoHeight = Math.min(360, Math.round(galleryWidth * 0.85));
  const description = dish?.descripcion?.trim() || dish?.descripcionBreve?.trim();

  // Vuelvo a la primera foto cuando cambia el plato y descarto respuestas de una ficha cerrada.
  useEffect(() => {
    if (!visible || (!dishId && !slug) || !restauranteId) return;
    let current = true;
    setDish(null);
    setPhotoIndex(0);
    setError(false);
    setLoading(true);

    const request = slug
      ? menuApi.dishBySlug(restauranteId, fecha, slug)
      : menuApi.dish(restauranteId, fecha, dishId!);
    request
      .then(result => {
        if (current) setDish(result);
      })
      .catch(() => {
        if (current) setError(true);
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [visible, restauranteId, fecha, dishId, slug, attempt]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View
        testID="menu-detail-modal"
        style={[styles.container, { backgroundColor: colors.superficie.fondo }]}
      >
        <View style={[styles.topBar, {
          paddingHorizontal: spacing.margenLateral,
          paddingTop: insets.top + spacing.xs,
        }]}>
          <TouchableOpacity
            testID="menu-detail-close"
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={onClose}
            style={styles.backButton}
          >
            <ChevronLeft size={22} color={colors.texto.primario} />
            <Text style={[typography.etiqueta, { color: colors.texto.primario }]}>
              {t('common.back')}
            </Text>
          </TouchableOpacity>
          {shareUrl && dish && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('menu.shareDish')}
              style={styles.iconButton}
              onPress={() => {
                void Share.share({ message: t('menu.shareMessage', { name: dish.nombre, url: shareUrl }) })
                  .catch(() => Feedback.alert(t('news.actionError'), undefined, [], { kind: 'error' }));
              }}
            >
              <Share2 size={21} color={colors.texto.primario} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator testID="menu-detail-loading" color={colors.marca.primario} />
            <Text style={[typography.cuerpoM, { color: colors.texto.secundario }]}>
              {t('menu.loadingDetail')}
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text testID="menu-detail-error" style={[typography.cuerpoM, { color: colors.estado.error }]}>
              {t('menu.detailError')}
            </Text>
            <TouchableOpacity
              testID="menu-detail-retry"
              accessibilityRole="button"
              onPress={() => setAttempt(value => value + 1)}
              style={styles.retryButton}
            >
              <Text style={[typography.etiqueta, { color: colors.marca.primario }]}>
                {t('common.retry')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : dish ? (
          <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}>
            <View style={[styles.detail, { width: galleryWidth, gap: spacing.l }]}>
              <View style={{ gap: spacing.s }}>
                <Text accessibilityRole="header" style={[typography.tituloL, { color: colors.texto.primario }]}>
                  {dish.nombre}
                </Text>
                <View style={styles.summary}>
                  <Text style={[typography.precio, { color: colors.marca.acento }]}>
                    {formatCop(dish.precio)}
                  </Text>
                  <View style={[styles.availability, {
                    backgroundColor: dish.disponible ? colors.marca.primarioSuave : colors.superficie.elevada,
                    borderRadius: radii.completo,
                  }]}>
                    {dish.disponible && <CircleCheck size={15} color={colors.marca.primario} />}
                    <Text style={[typography.pie, styles.badgeText, {
                      color: dish.disponible ? colors.marca.primario : colors.texto.secundario,
                    }]}>
                      {t(dish.disponible ? 'menu.badgeAvailable' : 'menu.badgeUnavailable')}
                    </Text>
                  </View>
                </View>
              </View>
              {photos.length ? (
                <View>
                  {/* Doy a cada foto el ancho de la galería para centrarla y conservar el encuadre. */}
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    accessibilityLabel={t('menu.photos')}
                    onMomentumScrollEnd={({ nativeEvent }) => {
                      const index = Math.round(nativeEvent.contentOffset.x / galleryWidth);
                      setPhotoIndex(Math.max(0, Math.min(photos.length - 1, index)));
                    }}
                    style={{ borderRadius: radii.l, backgroundColor: colors.superficie.elevada }}
                  >
                    {photos.map((photo, index) => (
                      <Image
                        key={photo.id}
                        accessibilityLabel={t('menu.photoLabel', { number: index + 1 })}
                        source={photo.source}
                        resizeMode="contain"
                        style={{ width: galleryWidth, height: photoHeight }}
                      />
                    ))}
                  </ScrollView>
                  {photos.length > 1 && (
                    <Text
                      accessibilityLiveRegion="polite"
                      style={[typography.pie, styles.photoPosition, { color: colors.texto.secundario }]}
                    >
                      {t('menu.photoPosition', { number: photoIndex + 1, total: photos.length })}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={[styles.noPhotos, { backgroundColor: colors.superficie.elevada, borderRadius: radii.l }]}>
                  <UtensilsCrossed size={25} color={colors.texto.secundario} />
                  <Text style={[typography.pie, { color: colors.texto.secundario, textAlign: 'center' }]}>
                    {t('menu.noPhotos')}
                  </Text>
                </View>
              )}
              {!!description && (
                <Text style={[typography.cuerpoM, { color: colors.texto.secundario }]}>
                  {description}
                </Text>
              )}
              {!!dish.alergenos && (
                <View style={{ gap: spacing.xs }}>
                  <Text accessibilityRole="header" style={[typography.etiqueta, { color: colors.texto.primario }]}>
                    {t('menu.allergens')}
                  </Text>
                  <Text style={[typography.cuerpoM, { color: colors.texto.secundario }]}>
                    {dish.alergenos}
                  </Text>
                </View>
              )}
              {!!dish.etiquetas.length && (
                <View style={styles.tags}>
                  {dish.etiquetas.map(tag => (
                    <Text
                      key={tag.id}
                      style={[typography.pie, styles.tag, {
                        color: colors.texto.primario,
                        backgroundColor: colors.superficie.elevada,
                        borderRadius: radii.completo,
                      }]}
                    >
                      {tag.nombre}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  backButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 5 },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  detail: { alignSelf: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  retryButton: { minHeight: 48, justifyContent: 'center', padding: 12 },
  summary: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  availability: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, maxWidth: '100%',
  },
  badgeText: { flexShrink: 1 },
  photoPosition: { textAlign: 'center', marginTop: 8 },
  noPhotos: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 6 },
});
