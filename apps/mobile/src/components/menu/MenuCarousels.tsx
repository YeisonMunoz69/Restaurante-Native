import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, UtensilsCrossed } from 'lucide-react-native';
import type { MenuDish } from '@encanto/shared';
import { useTheme } from '../../theme/ThemeContext';
import { useOrderDraft } from '../../context/OrderDraftContext';
import { formatCop } from '../../utils/formatters';
import { menuGallery } from './menu-photo';
import { Action, Note } from '../attention/Controls';

type Section = { id: string; title: string; data: MenuDish[] };
// Muestro tres categorías por bloque; el usuario cambia el bloque, sin rotación automática.
export function MenuCarousels({
  header,
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
  const [group, setGroup] = useState(0);
  const { width } = useWindowDimensions();
  const draft = useOrderDraft();
  useEffect(() => {
    setGroup(0);
  }, [sections.length, fecha]);
  const max = Math.max(0, Math.ceil(sections.length / 3) - 1);
  const cardWidth = Math.min(300, Math.max(210, width - 64));
  // Mantengo el encuadre 4:3 aunque las fotos incluidas traigan dimensiones propias.
  const photoHeight = (cardWidth * 3) / 4;
  return (
    <FlatList
      testID="menu-carousels"
      data={sections.slice(group * 3, group * 3 + 3)}
      keyExtractor={section => section.id}
      ListHeaderComponent={header}
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
                if (hasMore && !loadingMore && !loadMoreFailed) onMore();
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
        <Note>
          <Text testID="menu-empty">{t('menu.emptyState')}</Text>
        </Note>
      }
      ListFooterComponent={
        <View style={styles.footer}>
          {loadingMore && (
            <ActivityIndicator
              testID="menu-loading-more"
              accessibilityLabel={t('common.loading')}
              color={colors.marca.primario}
            />
          )}
          {hasMore && (
            <Action
              label={t(loadMoreFailed ? 'common.retry' : 'discovery.loadMore')}
              disabled={loadingMore}
              onPress={onMore}
            />
          )}
          {loadMoreFailed && <Note live>{t('discovery.loadMoreFailed')}</Note>}
          {max > 0 && (
            <View style={styles.pager}>
              <View style={styles.pagerAction}>
                <Action
                  label={t('discovery.previousCategories')}
                  disabled={group === 0}
                  onPress={() => setGroup(value => value - 1)}
                />
              </View>
              <View style={styles.pagerAction}>
                <Action
                  testID="menu-next-categories"
                  label={t('discovery.moreCategories')}
                  disabled={group >= max}
                  onPress={() => setGroup(value => value + 1)}
                />
              </View>
            </View>
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
  card: { borderRadius: 20, overflow: 'hidden' },
  fallback: { justifyContent: 'center', alignItems: 'center' },
  body: { padding: 14, gap: 6 },
  add: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    alignSelf: 'flex-start', marginTop: 'auto', marginHorizontal: 14, marginBottom: 12,
    minHeight: 44, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 6,
  },
  footer: { padding: 16 },
  pager: { flexDirection: 'row', gap: 12 },
  pagerAction: { flex: 1 },
});
