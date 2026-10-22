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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { UtensilsCrossed } from 'lucide-react-native';
import type { MenuDish } from '@encanto/shared';
import { useTheme } from '../../theme/ThemeContext';
import { useOrderDraft } from '../../context/OrderDraftContext';
import { formatCop } from '../../utils/formatters';
import { publicMenuPhotoUrl } from './menu-photo';
import { Action, Note } from '../attention/Controls';

type Section = { id: string; title: string; data: MenuDish[] };
// Muestro tres categorías por bloque; el usuario cambia el bloque, sin rotación automática.
export function MenuCarousels({
  sections,
  fecha,
  open,
  loadingMore,
  hasMore,
  onMore,
  onRefresh,
  onDetail,
}: {
  sections: Section[];
  fecha: string;
  open: boolean;
  loadingMore: boolean;
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
  return (
    <FlatList
      testID="menu-carousels"
      data={sections.slice(group * 3, group * 3 + 3)}
      keyExtractor={section => section.id}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={onRefresh}
          tintColor={colors.marca.primario}
        />
      }
      contentContainerStyle={styles.content}
      renderItem={({ item: section }) => (
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
              if (hasMore && !loadingMore) onMore();
            }}
            onEndReachedThreshold={0.4}
            initialNumToRender={3}
            maxToRenderPerBatch={4}
            windowSize={5}
            ListEmptyComponent={<Note>{t('discovery.emptyCategory')}</Note>}
            renderItem={({ item: dish }) => {
              const photo = publicMenuPhotoUrl(dish.fotos[0]?.path);
              const count =
                draft.lines.find(line => line.dish.id === dish.id)?.cantidad ??
                0;
              return (
                <View
                  style={[
                    styles.card,
                    {
                      width: cardWidth,
                      backgroundColor: colors.superficie.elevada,
                      borderColor: colors.superficie.borde,
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
                        source={{ uri: photo }}
                        accessibilityLabel={t('menu.photoLabel', { number: 1 })}
                        style={styles.photo}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        accessibilityLabel={t('menu.photoUnavailable')}
                        style={[styles.photo, styles.fallback]}
                      >
                        <UtensilsCrossed
                          size={30}
                          color={colors.texto.secundario}
                        />
                      </View>
                    )}
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
                  <View style={styles.action}>
                    <Action
                      testID={`menu-add-${dish.id}`}
                      label={`${t('discovery.add')}${count ? ` · ${count}` : ''}`}
                      disabled={!dish.disponible || !open || count >= 99}
                      onPress={() => draft.setQuantity(dish, count + 1, fecha)}
                    />
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}
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
              label={t('discovery.loadMore')}
              disabled={loadingMore}
              onPress={onMore}
            />
          )}
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
  content: { paddingVertical: 12, flexGrow: 1 },
  section: { marginBottom: 24 },
  heading: { marginHorizontal: 16, marginBottom: 12 },
  row: { paddingHorizontal: 16, gap: 12 },
  card: { borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  photo: { width: '100%', aspectRatio: 4 / 3 },
  fallback: { justifyContent: 'center', alignItems: 'center' },
  body: { padding: 14, gap: 8 },
  action: { paddingHorizontal: 12, paddingBottom: 10 },
  footer: { padding: 16 },
  pager: { flexDirection: 'row', gap: 12 },
  pagerAction: { flex: 1 },
});
