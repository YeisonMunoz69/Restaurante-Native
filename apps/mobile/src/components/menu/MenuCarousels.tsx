import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Plus, RefreshCw, UtensilsCrossed } from 'lucide-react-native';
import type { MenuDish } from '@encanto/shared';
import { useTheme } from '../../theme/ThemeContext';
import { useOrderDraft } from '../../context/OrderDraftContext';
import { formatCop } from '../../utils/formatters';
import { menuGallery } from './menu-photo';
import { Note } from '../attention/Controls';

type Section = { id: string; title: string; data: MenuDish[] };
const DOUBLE_TAP_MS = 400;
// Permito elegir cualquier categoría desde arriba y conservo los carruseles horizontales.
export function MenuCarousels({
  header,
  onHeaderLayout,
  onScroll,
  bottomInset = 0,
  sections,
  fecha,
  open,
  loadingMore,
  loadMoreFailed = false,
  hasMore,
  onMore,
  onRefresh,
  onDetail,
}: {
  header?: React.ReactElement;
  onHeaderLayout?: (event: LayoutChangeEvent) => void;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  bottomInset?: number;
  sections: Section[];
  fecha: string;
  open: boolean;
  loadingMore: boolean;
  loadMoreFailed?: boolean;
  hasMore: boolean;
  onMore: () => void;
  onRefresh: () => void;
  onDetail: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const pendingTap = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { width } = useWindowDimensions();
  const draft = useOrderDraft();
  const selectedIndex = sections.findIndex(section => section.id === categoryId);
  const selectedCategory = sections[selectedIndex];
  const lastLoadedIndex = sections.reduce((last, section, index) => section.data.length ? index : last, -1);
  const awaitingCategory = selectedIndex > lastLoadedIndex && hasMore;
  const canLoadMore = hasMore && (selectedIndex < 0 || selectedIndex >= lastLoadedIndex);
  const visibleSections = selectedCategory
    ? (awaitingCategory ? [] : [selectedCategory])
    : sections.filter(section => section.data.length > 0);

  useEffect(() => {
    // Las páginas llegan agrupadas por categoría. Busco hasta alcanzar la elegida.
    if (awaitingCategory && !loadingMore && !loadMoreFailed) onMore();
  }, [awaitingCategory, loadingMore, loadMoreFailed, onMore]);

  useEffect(() => () => {
    if (pendingTap.current !== null) {
      clearTimeout(pendingTap.current);
      pendingTap.current = null;
    }
  }, [fecha, categoryId, onMore]);

  // Espero el segundo toque antes de pedir otra página; si llega, recargo desde la primera.
  const pressLoad = () => {
    if (!canLoadMore) {
      onRefresh();
      return;
    }
    if (pendingTap.current !== null) {
      clearTimeout(pendingTap.current);
      pendingTap.current = null;
      onRefresh();
      return;
    }
    pendingTap.current = setTimeout(() => {
      pendingTap.current = null;
      if (!loadingMore) onMore();
    }, DOUBLE_TAP_MS);
  };
  const cardWidth = Math.min(300, Math.max(210, width - 64));
  // Mantengo el encuadre 4:3 aunque las fotos incluidas traigan dimensiones propias.
  const photoHeight = (cardWidth * 3) / 4;
  return (
    <FlatList
      testID="menu-carousels"
      data={visibleSections}
      keyExtractor={section => section.id}
      ListHeaderComponent={
        <View onLayout={onHeaderLayout}>
          {header}
          {sections.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
              {[{ id: null, title: t('menu.allCategories') }, ...sections].map(category => {
                const selected = category.id === (selectedCategory?.id ?? null);
                return (
                  <Pressable
                    key={category.id ?? 'all'}
                    testID={`menu-category-${category.id ?? 'all'}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setCategoryId(category.id)}
                    style={[styles.categoryChip, {
                      backgroundColor: selected ? colors.marca.primarioSuave : colors.superficie.elevada,
                    }]}
                  >
                    <Text style={[typography.etiqueta, {
                      color: selected ? colors.marca.primario : colors.texto.secundario,
                    }]}>
                      {category.title}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      }
      onScroll={onScroll}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={onRefresh}
          tintColor={colors.marca.primario}
        />
      }
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
      renderItem={({ item: section }) => {
        // Solo reservo el espacio de una foto cuando la categoría tiene portadas.
        const sectionHasPhotos = section.data.some(dish => menuGallery(dish).length > 0);
        return (
          <View style={styles.section}>
            <Text
              accessibilityRole="header"
              style={[
                typography.tituloL,
                styles.heading,
                { color: colors.texto.primario },
              ]}
            >
              {section.title}
            </Text>
            <FlatList
              horizontal
              data={section.data}
              key={`${section.id}/${fecha}`}
              keyExtractor={dish => dish.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.row}
              onEndReached={() => {
                if (selectedCategory && canLoadMore && !loadingMore && !loadMoreFailed) onMore();
              }}
              onEndReachedThreshold={0.4}
              initialNumToRender={3}
              maxToRenderPerBatch={4}
              windowSize={5}
              ListEmptyComponent={<Note>{t('discovery.emptyCategory')}</Note>}
              renderItem={({ item: dish }) => {
                const photo = menuGallery(dish)[0]?.source;
                const localPhoto = typeof photo === 'number' ? Image.resolveAssetSource(photo) : null;
                const portrait = (localPhoto?.height ?? 0) > (localPhoto?.width ?? 0);
                const count =
                  draft.lines.find(line => line.dish.id === dish.id)?.cantidad ??
                  0;
                const canAdd = dish.disponible && open && count < 99;
                return (
                  <View
                    style={[
                      styles.card,
                      {
                        width: cardWidth,
                        backgroundColor: colors.superficie.elevada,
                      },
                    ]}
                  >
                    <Pressable
                      testID={`menu-open-detail-${dish.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={t('menu.openDish', {
                        name: dish.nombre,
                      })}
                      onPress={() => onDetail(dish.id)}
                      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                    >
                      {photo ? (
                        <Image
                          source={photo}
                          accessibilityLabel={t('menu.photoLabel', { number: 1 })}
                          style={{ width: '100%', height: photoHeight }}
                          resizeMode={portrait ? 'contain' : 'cover'}
                        />
                      ) : sectionHasPhotos ? (
                        <View
                          accessibilityLabel={t('menu.photoUnavailable')}
                          style={[styles.fallback, { height: photoHeight }]}
                        >
                          <UtensilsCrossed
                            size={30}
                            color={colors.texto.secundario}
                          />
                        </View>
                      ) : null}
                      <View style={styles.body}>
                        <Text
                          numberOfLines={2}
                          style={[
                            typography.tituloM,
                            { color: colors.texto.primario },
                          ]}
                        >
                          {dish.nombre}
                        </Text>
                        {!!dish.descripcionBreve && (
                          <Text
                            numberOfLines={2}
                            style={[
                              typography.cuerpoM,
                              { color: colors.texto.secundario },
                            ]}
                          >
                            {dish.descripcionBreve}
                          </Text>
                        )}
                        <Text
                          style={[
                            typography.precio,
                            { color: colors.marca.acento },
                          ]}
                        >
                          {formatCop(dish.precio)}
                        </Text>
                        <Text
                          style={[
                            typography.pie,
                            { color: colors.texto.secundario },
                          ]}
                        >
                          {t(
                            dish.disponible && open
                              ? 'menu.badgeAvailable'
                              : 'menu.badgeUnavailable',
                          )}
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      testID={`menu-add-${dish.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={t('discovery.addDish', { name: dish.nombre })}
                      accessibilityState={{ disabled: !canAdd }}
                      disabled={!canAdd}
                      onPress={() => draft.setQuantity(dish, count + 1, fecha)}
                      style={({ pressed }) => [
                        styles.add,
                        { backgroundColor: colors.marca.primarioSuave, opacity: pressed || !canAdd ? 0.55 : 1 },
                      ]}
                    >
                      <Plus size={17} color={colors.marca.primario} />
                      <Text style={[typography.etiqueta, { color: colors.marca.primario }]}>
                        {t('discovery.addShort')}{count ? ` · ${count}` : ''}
                      </Text>
                    </Pressable>
                  </View>
                );
              }}
            />
          </View>
        );
      }}
      ListEmptyComponent={
        awaitingCategory ? undefined : (
          <Note>
            <Text testID="menu-empty">{t('menu.emptyState')}</Text>
          </Note>
        )
      }
      ListFooterComponent={
        <View style={styles.footer}>
          {awaitingCategory && !loadMoreFailed ? (
            <ActivityIndicator
              testID="menu-loading-more"
              accessibilityLabel={t('common.loading')}
              color={colors.marca.primario}
            />
          ) : (
            <Pressable
              testID="menu-load-control"
              accessibilityRole="button"
              accessibilityState={{ busy: loadingMore }}
              accessibilityHint={canLoadMore ? t('menu.doubleTapReload') : undefined}
              accessibilityActions={canLoadMore ? [{ name: 'refresh', label: t('menu.reloadMenu') }] : undefined}
              onAccessibilityAction={event => {
                if (event.nativeEvent.actionName === 'refresh') onRefresh();
              }}
              onPress={pressLoad}
              style={({ pressed }) => [styles.loadControl, { opacity: pressed ? 0.6 : 1 }]}
            >
              {loadingMore ? (
                <ActivityIndicator testID="menu-loading-more" color={colors.marca.primario} />
              ) : canLoadMore && !loadMoreFailed ? (
                <ChevronDown size={17} color={colors.marca.primario} />
              ) : (
                <RefreshCw size={16} color={colors.marca.primario} />
              )}
              <Text style={[typography.etiqueta, { color: colors.marca.primario }]}>
                {t(canLoadMore ? (loadMoreFailed ? 'common.retry' : 'discovery.loadMore') : 'menu.reloadMenu')}
              </Text>
            </Pressable>
          )}
          {loadMoreFailed && (
            <Text accessibilityRole="alert" style={[typography.pie, styles.footerMessage, { color: colors.texto.secundario }]}>
              {t('discovery.loadMoreFailed')}
            </Text>
          )}
        </View>
      }
    />
  );
}
const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  section: { marginBottom: 24 },
  heading: { marginHorizontal: 16, marginBottom: 12 },
  row: { paddingHorizontal: 16, gap: 12 },
  categories: { paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  categoryChip: { borderRadius: 24, minHeight: 44, justifyContent: 'center', paddingHorizontal: 15, paddingVertical: 6 },
  card: { borderRadius: 20, overflow: 'hidden' },
  fallback: { justifyContent: 'center', alignItems: 'center' },
  body: { padding: 14, gap: 6 },
  add: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    alignSelf: 'flex-start', marginTop: 'auto', marginHorizontal: 14, marginBottom: 12,
    minHeight: 44, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 6,
  },
  footer: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  loadControl: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: 48, paddingHorizontal: 16,
  },
  footerMessage: { textAlign: 'center' },
});
