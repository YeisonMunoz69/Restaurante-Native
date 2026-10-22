import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootTabParamList } from '../navigation/BottomTabNavigator';
import { OrderDraftPanel } from '../components/menu/OrderDraftPanel';
import { MenuCarousels } from '../components/menu/MenuCarousels';
import {
  ActivityIndicator,
  Pressable,
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
import { useTheme } from '../theme/ThemeContext';
import { formatCivilDate, todayInBogota } from '../utils/formatters';

// Avanzo fechas civiles en UTC para que el celular no cambie de día por zona horaria.
function shiftCivilDate(fecha: string, amount: number) {
  const [year, month, day] = fecha.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + amount));
  return next.toISOString().slice(0, 10);
}

function errorStatus(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status;
}

type MenuSection = { id: string; title: string; data: MenuDish[] };

export const MenuScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { t } = useTranslation();
  const { colors, typography, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useConnection();
  const restauranteId = settings.restauranteId;
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [dishes, setDishes] = useState<MenuDish[]>([]);
  const [fecha, setFecha] = useState<string | null>(null);
  const [nextOpenDate, setNextOpenDate] = useState<string | null>(null);
  const [dayOpen, setDayOpen] = useState<boolean | null>(null);
  const [dayHours, setDayHours] = useState<string[]>([]);
  const [nextAvailableDay, setNextAvailableDay] = useState<string | null>(null);
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
    setNextOpenDate(null);
    setDayOpen(null);
    setDayHours([]);
    setNextAvailableDay(null);
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
      setNextOpenDate(next.dia?.fecha ?? null);
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
      setDayHours(initialDay.horarios.map(hours => `${hours.horaApertura}–${hours.horaCierre}`));
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
      setDayHours([]);
      setNextAvailableDay(null);
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
        setDayHours(day.horarios.map(hours => `${hours.horaApertura}–${hours.horaCierre}`));
        setDishes(page.data);
        setNextPage(page.paginacion.pagina + 1);
        setTotalPages(page.paginacion.totalPaginas);
        if (!day.abierto) {
          // Busco desde la fecha consultada para ofrecer la próxima apertura real, sin horarios fijos.
          const next = await menuApi.nextOpenDay(restauranteId, nextDate);
          if (currentRequest !== requestNumber.current) return;
          setNextAvailableDay(next.dia?.fecha ?? null);
          setNoNextOpenDay(next.dia === null);
          if (next.dia) setNextOpenDate(next.dia.fecha);
        }
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
                  {t(
                    fecha === nextOpenDate
                      ? 'menu.nextOpenDay'
                      : 'menu.selectedDate',
                  )}
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
                {dayHours.length > 0 && (
                  <Text testID="menu-day-hours" style={[typography.pie, { color: colors.texto.secundario, marginTop: spacing.xs }]}>
                    {dayHours.join(' · ')}
                  </Text>
                )}
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
                {dayOpen === false && nextAvailableDay && (
                  <Pressable
                    testID="menu-next-open-date"
                    accessibilityRole="button"
                    onPress={() => loadDate(nextAvailableDay)}
                    style={[styles.retryButton, { marginTop: spacing.s }]}
                  >
                    <Text style={[typography.pie, { color: colors.marca.primario }]}>
                      {t('menu.goToNextOpenDay', { date: formatCivilDate(nextAvailableDay) })}
                    </Text>
                  </Pressable>
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
            <MenuCarousels sections={sections} fecha={fecha ?? todayInBogota()} open={dayOpen === true} loadingMore={loadingMore} hasMore={nextPage <= totalPages} onMore={() => void loadMore()} onRefresh={refresh} onDetail={setSelectedDishId} />
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
      {!!restauranteId && <OrderDraftPanel onReserve={() => navigation.navigate('Reservations')} />}
    </View>
  );
};

const styles = StyleSheet.create({
  addOrder: { marginHorizontal: 16, marginBottom: 8 },
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
