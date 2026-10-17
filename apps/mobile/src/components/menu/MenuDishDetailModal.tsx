import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MenuDish } from '@encanto/shared';
import { useTheme } from '../../theme/ThemeContext';
import { menuApi } from '../../services/menu.service';
import { publicMenuPhotoUrl } from './menu-photo';

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function MenuDishDetailModal({
  visible,
  restauranteId,
  fecha,
  dishId,
  onClose,
}: {
  visible: boolean;
  restauranteId: string;
  fecha: string;
  dishId: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors, typography, spacing, radii } = useTheme();
  const [dish, setDish] = useState<MenuDish | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!visible || !dishId || !restauranteId) return;
    let current = true;
    setDish(null);
    setError(false);
    setLoading(true);

    menuApi
      .dish(restauranteId, fecha, dishId)
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
  }, [visible, restauranteId, fecha, dishId, attempt]);

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
        <View style={[styles.topBar, { padding: spacing.margenLateral }]}>
          <TouchableOpacity
            testID="menu-detail-close"
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={onClose}
            style={[
              styles.backButton,
              {
                borderColor: colors.superficie.borde,
                borderRadius: radii.m,
                backgroundColor: colors.superficie.elevada,
              },
            ]}
          >
            <Text
              style={[typography.etiqueta, { color: colors.texto.primario }]}
            >
              {t('common.back')}
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator
              testID="menu-detail-loading"
              color={colors.marca.primario}
            />
            <Text
              style={[
                typography.cuerpoM,
                { color: colors.texto.secundario, marginTop: spacing.m },
              ]}
            >
              {t('menu.loadingDetail')}
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text
              testID="menu-detail-error"
              style={[typography.cuerpoM, { color: colors.estado.error }]}
            >
              {t('menu.detailError')}
            </Text>
            <TouchableOpacity
              testID="menu-detail-retry"
              accessibilityRole="button"
              onPress={() => setAttempt(value => value + 1)}
              style={styles.retryButton}
            >
              <Text
                style={[typography.etiqueta, { color: colors.marca.primario }]}
              >
                {t('common.retry')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : dish ? (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: spacing.margenLateral,
              paddingBottom: spacing.xxl,
            }}
          >
            <Text
              style={[
                typography.display,
                { color: colors.texto.primario, marginBottom: spacing.s },
              ]}
            >
              {dish.nombre}
            </Text>
            <Text style={[typography.tituloM, { color: colors.marca.acento }]}>
              {formatPrice(dish.precio)}
            </Text>
            <Text
              style={[
                typography.cuerpoM,
                { color: colors.texto.secundario, marginTop: spacing.m },
              ]}
            >
              {dish.descripcionBreve || dish.descripcion}
            </Text>
            {dish.descripcionBreve && (
              <Text
                style={[
                  typography.cuerpoM,
                  { color: colors.texto.primario, marginTop: spacing.m },
                ]}
              >
                {dish.descripcion}
              </Text>
            )}

            <View
              style={[
                styles.availability,
                {
                  backgroundColor: dish.disponible
                    ? colors.marca.primarioSuave
                    : colors.superficie.elevada,
                  borderRadius: radii.s,
                  marginTop: spacing.l,
                  padding: spacing.s,
                },
              ]}
            >
              <Text
                style={[
                  typography.etiqueta,
                  {
                    color: dish.disponible
                      ? colors.marca.primario
                      : colors.texto.secundario,
                  },
                ]}
              >
                {t(
                  dish.disponible
                    ? 'menu.badgeAvailable'
                    : 'menu.badgeUnavailable',
                )}
              </Text>
            </View>

            <Text
              style={[
                typography.tituloM,
                { color: colors.texto.primario, marginTop: spacing.xl },
              ]}
            >
              {t('menu.photos')}
            </Text>
            {dish.fotos.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: spacing.m }}
              >
                {dish.fotos.slice(0, 10).map((photo, index) => {
                  const uri = publicMenuPhotoUrl(photo.pathOg || photo.path);
                  return (
                    <View
                      key={photo.id}
                      style={[
                        styles.photoCard,
                        {
                          backgroundColor: colors.superficie.elevada,
                          borderColor: colors.superficie.borde,
                          borderRadius: radii.m,
                          marginRight: spacing.m,
                        },
                      ]}
                    >
                      {uri ? (
                        <Image
                          accessibilityLabel={t('menu.photoLabel', {
                            number: index + 1,
                          })}
                          source={{ uri }}
                          resizeMode="cover"
                          style={styles.photo}
                        />
                      ) : (
                        <View style={styles.photoFallback}>
                          <Text
                            style={[
                              typography.cuerpoM,
                              { color: colors.texto.secundario },
                            ]}
                          >
                            {t('menu.photoUnavailable')}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <Text
                style={[
                  typography.cuerpoM,
                  { color: colors.texto.secundario, marginTop: spacing.s },
                ]}
              >
                {t('menu.noPhotos')}
              </Text>
            )}

            {dish.alergenos && (
              <View style={{ marginTop: spacing.l }}>
                <Text
                  style={[
                    typography.etiqueta,
                    { color: colors.texto.primario },
                  ]}
                >
                  {t('menu.allergens')}
                </Text>
                <Text
                  style={[
                    typography.cuerpoM,
                    { color: colors.texto.secundario, marginTop: spacing.xs },
                  ]}
                >
                  {dish.alergenos}
                </Text>
              </View>
            )}
            {!!dish.etiquetas.length && (
              <View style={styles.tags}>
                {dish.etiquetas.map(tag => (
                  <View
                    key={tag.id}
                    style={[
                      styles.tag,
                      {
                        backgroundColor: colors.superficie.elevada,
                        borderColor: colors.superficie.borde,
                        borderRadius: radii.s,
                      },
                    ]}
                  >
                    <Text
                      style={[typography.pie, { color: colors.texto.primario }]}
                    >
                      {tag.nombre}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { alignItems: 'flex-start' },
  backButton: {
    minHeight: 48,
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  retryButton: { minHeight: 48, justifyContent: 'center', padding: 12 },
  availability: { alignSelf: 'flex-start' },
  photoCard: { width: 280, height: 210, overflow: 'hidden', borderWidth: 1 },
  photo: { width: '100%', height: '100%' },
  photoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16 },
  tag: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
});
