import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigation, type RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootTabParamList } from '../navigation/BottomTabNavigator';
import { ORDER_BUTTON_CLEARANCE, OrderDraftPanel } from '../components/menu/OrderDraftPanel';
import { MenuCarousels } from '../components/menu/MenuCarousels';
import {
  ActivityIndicator,
  ScrollView,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
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

export const MenuScreen: React.FC<{ route?: RouteProp<RootTabParamList, 'Menu'> }> = ({ route }) => {
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
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState(2);
  const [totalPages, setTotalPages] = useState(0);
  const [showCompactDate, setShowCompactDate] = useState(false);
  const headerHeight = useRef(Infinity);
  const requestNumber = useRef(0);
  const loadingMoreRef = useRef(false);

  // Cargo sede, próximo día, categorías y primera página para el entorno elegido.
  const loadInitial = useCallback(async () => {
    const currentRequest = ++requestNumber.current;
    setShowCompactDate(false);
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
    setLoadingMore(false);
    setLoadMoreFailed(false);

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
      setShowCompactDate(false);
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
      setLoadingMore(false);
      setLoadMoreFailed(false);
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
    setLoadMoreFailed(false);
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
    } catch {
      // Si falla una página adicional, conservo los platos que ya cargaron.
      if (currentRequest === requestNumber.current) setLoadMoreFailed(true);
    } finally {
      if (currentRequest === requestNumber.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
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


  const dateLabel = fecha ? formatCivilDate(fecha) : '';
  const compactDate = fecha ? formatCivilDate(fecha, {
    weekday: 'short', day: 'numeric', month: 'short',
  }) : '';
  const hours = dayHours.join(' · ');
  const header = (
    <View
      testID="menu-scroll-header"
      onLayout={event => { headerHeight.current = event.nativeEvent.layout.height; }}
      style={[styles.header, { paddingHorizontal: spacing.margenLateral }]}
    >
      <Text accessibilityRole="header" style={[typography.display, { color: colors.texto.primario }]}>
        {t('menu.title')}
      </Text>
      <Text style={[typography.cuerpoM, { color: colors.texto.secundario }]}>
        {t('menu.subtitle')}
      </Text>
      {fecha && (
        <View style={[styles.date, { backgroundColor: colors.superficie.elevada, borderRadius: radii.l }]}>
          <View style={styles.dateRow}>
            <CalendarDays size={20} color={colors.marca.primario} />
            <View style={styles.dateInfo}>
              <Text style={[typography.etiqueta, { color: colors.marca.primario }]}>
                {t(fecha === nextOpenDate ? 'menu.nextOpenDay' : 'menu.selectedDate')}
              </Text>
              <Text style={[typography.cuerpoM, { color: colors.texto.primario }]}>{dateLabel}</Text>
              {!!hours && (
                <Text testID="menu-day-hours" style={[typography.pie, { color: colors.texto.secundario }]}>
                  {hours}
                </Text>
              )}
            </View>
            <View style={styles.dateControls}>
              <Pressable
                testID="menu-date-previous"
                accessibilityRole="button"
                accessibilityLabel={t('menu.previousDay')}
                onPress={() => loadDate(shiftCivilDate(fecha, -1))}
                style={styles.dateButton}
              >
                <ChevronLeft size={21} color={colors.marca.primario} />
              </Pressable>
              <Pressable
                testID="menu-date-next"
                accessibilityRole="button"
                accessibilityLabel={t('menu.nextDay')}
                onPress={() => loadDate(shiftCivilDate(fecha, 1))}
                style={styles.dateButton}
              >
                <ChevronRight size={21} color={colors.marca.primario} />
              </Pressable>
            </View>
          </View>
          {noNextOpenDay && (
            <Text style={[typography.pie, { color: colors.texto.secundario }]}>
              {t('menu.noNextOpenDay')}
            </Text>
          )}
          {dayOpen === false && (
            <Text testID="menu-day-closed" style={[typography.pie, { color: colors.estado.error }]}>
              {t('menu.dayClosed')}
            </Text>
          )}
          {dayOpen === false && nextAvailableDay && (
            <Pressable
              testID="menu-next-open-date"
              accessibilityRole="button"
              onPress={() => loadDate(nextAvailableDay)}
              style={styles.nextOpen}
            >
              <Text style={[typography.etiqueta, { color: colors.marca.primario }]}>
                {t('menu.goToNextOpenDay', { date: formatCivilDate(nextAvailableDay) })}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View
      testID="menu-screen"
      style={[styles.container, { backgroundColor: colors.superficie.fondo, paddingTop: insets.top }]}
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
          {loading && dishes.length === 0 ? (
            <ScrollView contentContainerStyle={styles.statusContent}>
              {header}
              <View style={styles.centered}>
                <ActivityIndicator testID="menu-loading" color={colors.marca.primario} />
                <Text style={[typography.cuerpoM, { color: colors.texto.secundario, marginTop: spacing.m }]}>
                  {t('common.loading')}
                </Text>
              </View>
            </ScrollView>
          ) : error ? (
            <ScrollView contentContainerStyle={styles.statusContent}>
              {header}
              <View style={[styles.centered, { padding: spacing.l }]}>
                <Text
                  testID="menu-error"
                  style={[typography.cuerpoM, styles.centerText, { color: colors.estado.error }]}
                >
                  {errorStatus(error) === 404 ? t('menu.restaurantNotFound') : t('menu.requestError')}
                </Text>
                <Pressable
                  testID="menu-retry"
                  accessibilityRole="button"
                  onPress={refresh}
                  style={[styles.retryButton, { marginTop: spacing.m }]}
                >
                  <Text style={[typography.etiqueta, { color: colors.marca.primario }]}>
                    {t('common.retry')}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : (
            <MenuCarousels
              header={header}
              bottomInset={ORDER_BUTTON_CLEARANCE}
              onScroll={event => {
                // Solo fijo una línea cuando ya salió toda la cabecera de la lista.
                setShowCompactDate(event.nativeEvent.contentOffset.y >= headerHeight.current);
              }}
              sections={sections}
              fecha={fecha ?? todayInBogota()}
              open={dayOpen === true}
              loadingMore={loadingMore}
              loadMoreFailed={loadMoreFailed}
              hasMore={nextPage <= totalPages}
              onMore={() => void loadMore()}
              onRefresh={refresh}
              onDetail={setSelectedDishId}
            />
          )}

          {showCompactDate && fecha && !loading && !error && (
            <View
              pointerEvents="none"
              testID="menu-compact-date"
              style={[styles.compactDate, {
                top: insets.top,
                backgroundColor: colors.superficie.elevada,
                paddingHorizontal: spacing.margenLateral,
              }]}
            >
              <CalendarDays size={14} color={colors.marca.primario} />
              <Text style={[typography.pie, styles.dateInfo, { color: colors.texto.primario }]}>
                {[compactDate, dayOpen === false ? t('discovery.closed') : hours].filter(Boolean).join(' · ')}
              </Text>
            </View>
          )}

          <MenuDishDetailModal
            visible={selectedDishId !== null || !!route?.params?.slug}
            dishId={selectedDishId}
            slug={route?.params?.slug}
            restauranteId={restauranteId}
            fecha={route?.params?.slug ? route.params.fecha ?? todayInBogota() : fecha ?? todayInBogota()}
            onClose={() => {
              setSelectedDishId(null);
              if (route?.params?.slug) navigation.setParams({ slug: undefined, fecha: undefined });
            }}
          />
        </>
      )}
      {!!restauranteId && <OrderDraftPanel onReserve={() => navigation.navigate('Reservations')} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 10, paddingBottom: 16, gap: 4 },
  date: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 12, gap: 6 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInfo: { flex: 1 },
  dateControls: { flexDirection: 'row' },
  dateButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  nextOpen: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  compactDate: {
    position: 'absolute', left: 0, right: 0, zIndex: 2,
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7,
  },
  statusContent: { flexGrow: 1, paddingBottom: ORDER_BUTTON_CLEARANCE },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  retryButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
});
