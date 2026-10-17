import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
} from 'lucide-react-native';
import type { MenuCategory, MenuDish } from '@encanto/shared';
import { useConnection } from '../context/ConnectionContext';
import { MenuDishDetailModal } from '../components/menu/MenuDishDetailModal';
import { menuApi } from '../services/menu.service';
import { publicMenuPhotoUrl } from '../components/menu/menu-photo';
import { useTheme } from '../theme/ThemeContext';

function todayInBogota() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: string) =>
    parts.find(part => part.type === type)?.value ?? '01';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

// Avanzo fechas civiles en UTC para que el celular no cambie de día por zona horaria.
function shiftCivilDate(fecha: string, amount: number) {
  const [year, month, day] = fecha.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + amount));
  return next.toISOString().slice(0, 10);
}

function formatCivilDate(fecha: string) {
  const [year, month, day] = fecha.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function errorStatus(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status;
}

type MenuSection = { id: string; title: string; data: MenuDish[] };

export const MenuScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors, typography, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useConnection();
  const restauranteId = settings.restauranteId;
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [dishes, setDishes] = useState<MenuDish[]>([]);
  const [fecha, setFecha] = useState<string | null>(null);
  const [dayOpen, setDayOpen] = useState<boolean | null>(null);
  const [noNextOpenDay, setNoNextOpenDay] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState(2);
  const [totalPages, setTotalPages] = useState(0);
  const requestNumber = useRef(0);
  const loadingMoreRef = useRef(false);

  // Cargo sede, próximo día, categorías y primera página para el entorno elegido.
  const loadInitial = useCallback(async () => {
    const currentRequest = ++requestNumber.current;
    setCategories([]);
    setDishes([]);
    setFecha(null);
    setDayOpen(null);
    setNoNextOpenDay(false);
    setError(null);
    loadingMoreRef.current = false;

    if (!restauranteId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [loadedCategories, next] = await Promise.all([
        menuApi.categories(restauranteId),
        menuApi.nextOpenDay(restauranteId),
      ]);
      if (currentRequest !== requestNumber.current) return;
      setCategories(loadedCategories);
      setNoNextOpenDay(next.dia === null);
      const initialDate = next.dia?.fecha ?? todayInBogota();
      setFecha(initialDate);
      const [firstPage, initialDay] = await Promise.all([
        menuApi.dishes(restauranteId, initialDate, 1),
        next.dia
          ? Promise.resolve(next.dia)
          : menuApi.day(restauranteId, initialDate),
      ]);
      if (currentRequest !== requestNumber.current) return;
      setDayOpen(initialDay.abierto);
      setDishes(firstPage.data);
      setNextPage(firstPage.paginacion.pagina + 1);
      setTotalPages(firstPage.paginacion.totalPaginas);
    } catch (requestError) {
      if (currentRequest === requestNumber.current) setError(requestError);
    } finally {
      if (currentRequest === requestNumber.current) setLoading(false);
    }
  }, [restauranteId]);

  // Ignoro una respuesta vieja si el usuario cambia de sede o sale de la pantalla.
  useEffect(() => {
    loadInitial().catch(() => undefined);
    return () => {
      requestNumber.current += 1;
      loadingMoreRef.current = false;
    };
  }, [loadInitial]);

  const loadDate = useCallback(
    async (nextDate: string) => {
      if (!restauranteId) return;
      const currentRequest = ++requestNumber.current;
      setFecha(nextDate);
      setDayOpen(null);
      setNoNextOpenDay(false);
      setDishes([]);
      setNextPage(2);
      setTotalPages(0);
      setError(null);
      setLoading(true);
      loadingMoreRef.current = false;
      try {
        const [page, day] = await Promise.all([
          menuApi.dishes(restauranteId, nextDate, 1),
          menuApi.day(restauranteId, nextDate),
        ]);
        if (currentRequest !== requestNumber.current) return;
        setDayOpen(day.abierto);
        setDishes(page.data);
        setNextPage(page.paginacion.pagina + 1);
        setTotalPages(page.paginacion.totalPaginas);
      } catch (requestError) {
        if (currentRequest === requestNumber.current) setError(requestError);
      } finally {
        if (currentRequest === requestNumber.current) setLoading(false);
      }
    },
    [restauranteId],
  );

  const refresh = useCallback(() => {
    if (fecha) {
      loadDate(fecha);
    } else {
      loadInitial();
    }
  }, [fecha, loadDate, loadInitial]);

  const loadMore = useCallback(async () => {
    if (
      !restauranteId ||
      !fecha ||
      loading ||
      error ||
      loadingMoreRef.current ||
      nextPage > totalPages
    )
      return;

    const currentRequest = requestNumber.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await menuApi.dishes(restauranteId, fecha, nextPage);
      if (currentRequest !== requestNumber.current) return;
      setDishes(current => {
        const byId = new Map(current.map(dish => [dish.id, dish]));
        page.data.forEach(dish => byId.set(dish.id, dish));
        return [...byId.values()];
      });
      setNextPage(page.paginacion.pagina + 1);
      setTotalPages(page.paginacion.totalPaginas);
    } catch (requestError) {
      if (currentRequest === requestNumber.current) setError(requestError);
    } finally {
      loadingMoreRef.current = false;
      if (currentRequest === requestNumber.current) setLoadingMore(false);
    }
  }, [restauranteId, fecha, loading, error, nextPage, totalPages]);

  const sections = useMemo<MenuSection[]>(
    () =>
      categories.map(category => ({
        id: category.id,
        title: category.nombre,
        data: dishes.filter(dish => dish.categoria.id === category.id),
      })),
    [categories, dishes],
  );

  const unavailableText = t('menu.badgeUnavailable');

  return (
    <View
      testID="menu-screen"
      style={[styles.container, { backgroundColor: colors.superficie.fondo }]}
    >
      {!restauranteId ? (
        <View style={styles.centered}>
          <UtensilsCrossed size={40} color={colors.marca.primario} />
          <Text
            testID="menu-missing-restaurant"
            style={[
              typography.cuerpoM,
              styles.centerText,
              {
                color: colors.texto.secundario,
                marginTop: spacing.m,
              },
            ]}
          >
            {t('menu.configureRestaurant')}
          </Text>
        </View>
      ) : (
        <>
          <View
            style={[
              styles.header,
              {
                paddingHorizontal: spacing.margenLateral,
                paddingTop: insets.top + spacing.l,
              },
            ]}
          >
            <Text
              style={[
                typography.display,
                { color: colors.texto.primario, marginBottom: spacing.xs },
              ]}
            >
              {t('menu.title')}
            </Text>
            <Text
              style={[typography.cuerpoM, { color: colors.texto.secundario }]}
            >
              {t('menu.subtitle')}
            </Text>

            {fecha && (
              <View
                style={[
                  styles.dateCard,
                  {
                    backgroundColor: colors.superficie.elevada,
                    borderColor: colors.superficie.borde,
                    borderRadius: radii.m,
                    marginTop: spacing.m,
                    padding: spacing.m,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.etiqueta,
                    { color: colors.marca.primario },
                  ]}
                >
                  {t('menu.nextOpenDay')}
                </Text>
                <Text
                  accessibilityRole="header"
                  style={[
                    typography.cuerpoL,
                    { color: colors.texto.primario, marginTop: spacing.xs },
                  ]}
                >
                  {formatCivilDate(fecha)}
                </Text>
                <View style={[styles.dateControls, { marginTop: spacing.s }]}>
                  <Pressable
                    testID="menu-date-previous"
                    accessibilityRole="button"
                    accessibilityLabel={t('menu.previousDay')}
                    onPress={() => {
                      loadDate(shiftCivilDate(fecha, -1));
                    }}
                    style={[
                      styles.dateButton,
                      {
                        borderColor: colors.superficie.borde,
                        borderRadius: radii.s,
                      },
                    ]}
                  >
                    <ChevronLeft size={20} color={colors.marca.primario} />
                    <Text
                      style={[typography.pie, { color: colors.texto.primario }]}
                    >
                      {t('menu.previousDay')}
                    </Text>
                  </Pressable>
                  <Pressable
                    testID="menu-date-next"
                    accessibilityRole="button"
                    accessibilityLabel={t('menu.nextDay')}
                    onPress={() => {
                      loadDate(shiftCivilDate(fecha, 1));
                    }}
                    style={[
                      styles.dateButton,
                      {
                        borderColor: colors.superficie.borde,
                        borderRadius: radii.s,
                      },
                    ]}
                  >
                    <Text
                      style={[typography.pie, { color: colors.texto.primario }]}
                    >
                      {t('menu.nextDay')}
                    </Text>
                    <ChevronRight size={20} color={colors.marca.primario} />
                  </Pressable>
                </View>
                {noNextOpenDay && (
                  <Text
                    style={[
                      typography.pie,
                      { color: colors.texto.secundario, marginTop: spacing.s },
                    ]}
                  >
                    {t('menu.noNextOpenDay')}
                  </Text>
                )}
                {dayOpen === false && (
                  <Text
                    testID="menu-day-closed"
                    style={[
                      typography.pie,
                      { color: colors.estado.error, marginTop: spacing.s },
                    ]}
                  >
                    {t('menu.dayClosed')}
                  </Text>
                )}
              </View>
            )}
          </View>

          {loading && dishes.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator
                testID="menu-loading"
                color={colors.marca.primario}
              />
              <Text
                style={[
                  typography.cuerpoM,
                  { color: colors.texto.secundario, marginTop: spacing.m },
                ]}
              >
                {t('common.loading')}
              </Text>
            </View>
          ) : error ? (
            <View style={[styles.centered, { padding: spacing.l }]}>
              <Text
                testID="menu-error"
                style={[
                  typography.cuerpoM,
                  styles.centerText,
                  { color: colors.estado.error },
                ]}
              >
                {errorStatus(error) === 404
                  ? t('menu.restaurantNotFound')
                  : t('menu.requestError')}
              </Text>
              <Pressable
                testID="menu-retry"
                accessibilityRole="button"
                onPress={refresh}
                style={[styles.retryButton, { marginTop: spacing.m }]}
              >
                <Text
                  style={[
                    typography.etiqueta,
                    { color: colors.marca.primario },
                  ]}
                >
                  {t('common.retry')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={dish => dish.id}
              renderSectionHeader={({ section }) => (
                <Text
                  style={[
                    typography.tituloM,
                    styles.sectionTitle,
                    {
                      color: colors.texto.primario,
                      backgroundColor: colors.superficie.fondo,
                      paddingHorizontal: spacing.margenLateral,
                      paddingTop: spacing.l,
                    },
                  ]}
                >
                  {section.title}
                </Text>
              )}
              renderItem={({ item }) => {
                const photoUri = publicMenuPhotoUrl(item.fotos[0]?.path);
                return (
                  <Pressable
                    testID={`menu-open-detail-${item.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={t('menu.openDish', {
                      name: item.nombre,
                    })}
                    onPress={() => setSelectedDishId(item.id)}
                    style={({ pressed }) => [
                      styles.dishCard,
                      {
                        backgroundColor: colors.superficie.elevada,
                        borderColor: colors.superficie.borde,
                        borderRadius: radii.m,
                        marginHorizontal: spacing.margenLateral,
                        marginTop: spacing.s,
                        padding: spacing.m,
                        opacity: pressed ? 0.75 : item.disponible ? 1 : 0.6,
                      },
                    ]}
                  >
                    {photoUri ? (
                      <Image
                        accessibilityLabel={t('menu.photoLabel', { number: 1 })}
                        source={{ uri: photoUri }}
                        resizeMode="cover"
                        style={styles.dishPhoto}
                      />
                    ) : (
                      <View
                        accessibilityLabel={t('menu.photoUnavailable')}
                        style={[
                          styles.dishPhoto,
                          styles.dishPhotoFallback,
                          { backgroundColor: colors.superficie.fondo },
                        ]}
                      >
                        <UtensilsCrossed
                          size={26}
                          color={colors.texto.secundario}
                        />
                      </View>
                    )}
                    <View style={styles.dishHeading}>
                      <Text
                        style={[
                          typography.tituloM,
                          styles.dishName,
                          { color: colors.texto.primario },
                        ]}
                      >
                        {item.nombre}
                      </Text>
                      <ChevronRight size={20} color={colors.texto.secundario} />
                    </View>
                    {!!item.descripcionBreve && (
                      <Text
                        numberOfLines={2}
                        style={[
                          typography.cuerpoM,
                          {
                            color: colors.texto.secundario,
                            marginTop: spacing.xs,
                          },
                        ]}
                      >
                        {item.descripcionBreve}
                      </Text>
                    )}
                    <View style={[styles.dishFooter, { marginTop: spacing.m }]}>
                      <Text
                        style={[
                          typography.precio,
                          { color: colors.marca.acento },
                        ]}
                      >
                        {formatPrice(item.precio)}
                      </Text>
                      <Text
                        style={[
                          typography.pie,
                          {
                            color: item.disponible
                              ? colors.marca.primario
                              : colors.texto.secundario,
                          },
                        ]}
                      >
                        {item.disponible
                          ? t('menu.badgeAvailable')
                          : unavailableText}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={[styles.centered, { padding: spacing.xl }]}>
                  <Text
                    testID="menu-empty"
                    style={[
                      typography.cuerpoM,
                      styles.centerText,
                      { color: colors.texto.secundario },
                    ]}
                  >
                    {t('menu.emptyState')}
                  </Text>
                </View>
              }
              ListFooterComponent={
                loadingMore ? (
                  <ActivityIndicator
                    testID="menu-loading-more"
                    style={{ margin: spacing.l }}
                    color={colors.marca.primario}
                  />
                ) : undefined
              }
              onEndReached={() => {
                loadMore();
              }}
              onEndReachedThreshold={0.4}
              refreshControl={
                <RefreshControl
                  refreshing={loading && dishes.length > 0}
                  onRefresh={refresh}
                  tintColor={colors.marca.primario}
                />
              }
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: spacing.xl },
              ]}
              stickySectionHeadersEnabled={false}
              keyboardShouldPersistTaps="handled"
            />
          )}

          <MenuDishDetailModal
            visible={selectedDishId !== null}
            dishId={selectedDishId}
            restauranteId={restauranteId}
            fecha={fecha ?? todayInBogota()}
            onClose={() => setSelectedDishId(null)}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 12 },
  dateCard: { borderWidth: 1 },
  dateControls: { flexDirection: 'row', justifyContent: 'space-between' },
  dateButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  retryButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  listContent: { flexGrow: 1 },
  sectionTitle: { paddingBottom: 8 },
  dishCard: { borderWidth: 1 },
  dishPhoto: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 8,
    marginBottom: 12,
  },
  dishPhotoFallback: { alignItems: 'center', justifyContent: 'center' },
  dishHeading: { flexDirection: 'row', alignItems: 'center' },
  dishName: { flex: 1 },
  dishFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
