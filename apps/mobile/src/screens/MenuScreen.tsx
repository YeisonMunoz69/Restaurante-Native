import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useIsFocused, useNavigation, type RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootTabParamList } from '../navigation/BottomTabNavigator';
import { isAxiosError } from 'axios';
import { ORDER_BUTTON_CLEARANCE, OrderDraftPanel } from '../components/menu/OrderDraftPanel';
import { MenuCarousels } from '../components/menu/MenuCarousels';
import { MenuDateTicker } from '../components/menu/MenuDateTicker';
import { MenuCalendarModal } from '../components/menu/MenuCalendarModal';
import { TabPageHeader } from '../components/navigation/TabPageHeader';
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
  ChevronRight,
  UtensilsCrossed,
} from 'lucide-react-native';
import type { MenuCategory, MenuDish } from '@encanto/shared';
import { useConnection } from '../context/ConnectionContext';
import { connectionUrl } from '../config/connection';
import { useOnline } from '../context/ConnectivityContext';
import { useAuth } from '../context/AuthContext';
import { useGuestAccess } from '../context/GuestAccessContext';
import { MenuDishDetailModal } from '../components/menu/MenuDishDetailModal';
import { menuApi } from '../services/menu.service';
import { bundledMenu, offlineMenuKey, readOfflineMenu, saveOfflineMenu } from '../services/offline-menu';
import { useTheme } from '../theme/ThemeContext';
import { Button } from '../components/ui/Button';
import { formatCivilDate, todayInBogota } from '../utils/formatters';

function errorStatus(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status;
}

function logMenuRequestError(error: unknown) {
  if (!__DEV__) return;
  if (isAxiosError(error)) {
    console.warn('[Carta] Falló una consulta remota', {
      codigo: error.code ?? null,
      estadoHttp: error.response?.status ?? null,
      tieneRespuesta: Boolean(error.response),
      tieneSolicitud: Boolean(error.request),
    });
    return;
  }
  console.warn('[Carta] Falló una consulta remota', {
    tipo: error instanceof Error ? error.name : 'Error desconocido',
  });
}

type MenuSection = { id: string; title: string; data: MenuDish[] };

export const MenuScreen: React.FC<{ route?: RouteProp<RootTabParamList, 'Menu'> }> = ({ route }) => {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { colors, typography, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useConnection();
  const { user } = useAuth();
  const requestSignIn = useGuestAccess();
  const restauranteId = settings.restauranteId;
  const online = useOnline();
  const cacheKey = offlineMenuKey(connectionUrl(settings), restauranteId);
  const [cached, setCached] = useState<{ key: string; menu: typeof bundledMenu }>();
  const [loadedKey, setLoadedKey] = useState<string>();
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
  const [showCalendar, setShowCalendar] = useState(false);
  const openCalendar = () => setShowCalendar(true);
  const closeCalendar = () => setShowCalendar(false);
  const headerHeight = useRef(Infinity);
  const requestNumber = useRef(0);
  const loadingMoreRef = useRef(false);
  const unavailableAfterRequest = online && isAxiosError(error) &&
    (!error.response || error.response.status >= 500);
  const readOnly = !online || unavailableAfterRequest;
  const cachedMenu = cached?.key === cacheKey ? cached.menu : null;
  let readOnlyMessageKey: string;
  if (unavailableAfterRequest) {
    readOnlyMessageKey = cachedMenu ? 'menu.requestFallbackSaved' : 'menu.requestFallbackBundled';
  } else {
    readOnlyMessageKey = cachedMenu ? 'menu.offlineSaved' : 'menu.offlineBundled';
  }

  useEffect(() => {
    if (!isFocused || readOnly) setShowCalendar(false);
  }, [isFocused, readOnly]);

  useEffect(() => {
    let current = true;
    void readOfflineMenu(cacheKey).then(menu => {
      if (current && menu) setCached(previous => previous?.key === cacheKey ? previous : { key: cacheKey, menu });
    });
    return () => { current = false; };
  }, [cacheKey]);

  useEffect(() => {
    // Solo reemplazo la copia cuando terminó la paginación de esta sede y esta fecha.
    if (!online || loadedKey !== cacheKey || !fecha || dayOpen !== true || loading || error ||
      loadingMore || loadMoreFailed || nextPage <= totalPages || !dishes.length) return;
    const menu = { categories, dishes };
    setCached({ key: cacheKey, menu });
    void saveOfflineMenu(cacheKey, menu).catch(() => undefined);
  }, [online, cacheKey, loadedKey, fecha, dayOpen, loading, error, loadingMore, loadMoreFailed,
    nextPage, totalPages, categories, dishes]);

  // Cargo sede, próximo día, categorías y primera página para el entorno elegido.
  const loadInitial = useCallback(async () => {
    const currentRequest = ++requestNumber.current;
    setLoadedKey(undefined);
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
      setLoadedKey(cacheKey);
    } catch (requestError) {
      logMenuRequestError(requestError);
      if (currentRequest === requestNumber.current) setError(requestError);
    } finally {
      if (currentRequest === requestNumber.current) setLoading(false);
    }
  }, [restauranteId, cacheKey]);

  // Ignoro una respuesta vieja si el usuario cambia de sede o sale de la pantalla.
  useEffect(() => {
    if (online) void loadInitial();
    return () => {
      requestNumber.current += 1;
      loadingMoreRef.current = false;
    };
  }, [loadInitial, online]);

  const loadDate = useCallback(
    async (nextDate: string, reloadCategories = false) => {
      if (!online || !restauranteId) return;
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
        const [page, day, refreshedCategories] = await Promise.all([
          menuApi.dishes(restauranteId, nextDate, 1),
          menuApi.day(restauranteId, nextDate),
          reloadCategories ? menuApi.categories(restauranteId) : undefined,
        ]);
        if (currentRequest !== requestNumber.current) return;
        if (refreshedCategories) setCategories(refreshedCategories);
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
        logMenuRequestError(requestError);
        if (currentRequest === requestNumber.current) setError(requestError);
      } finally {
        if (currentRequest === requestNumber.current) setLoading(false);
      }
    },
    [online, restauranteId],
  );

  const refresh = useCallback(() => {
    if (fecha) {
      loadDate(fecha, true);
    } else {
      loadInitial();
    }
  }, [fecha, loadDate, loadInitial]);

  const loadMore = useCallback(async () => {
    if (
      !online || !restauranteId ||
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
    } catch (requestError) {
      logMenuRequestError(requestError);
      // Si falla una página adicional, conservo los platos que ya cargaron.
      if (currentRequest === requestNumber.current) setLoadMoreFailed(true);
    } finally {
      if (currentRequest === requestNumber.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [online, restauranteId, fecha, loading, error, nextPage, totalPages]);

  const displayed = readOnly ? cachedMenu ?? bundledMenu : undefined;
  const activeCategories = displayed?.categories ?? categories;
  const activeDishes = displayed?.dishes ?? dishes;
  const selectedSlug = route?.params?.slug;
  const offlineDish = readOnly
    ? activeDishes.find(dish => selectedSlug ? dish.slug === selectedSlug : dish.id === selectedDishId) ??
      dishes.find(dish => selectedSlug ? dish.slug === selectedSlug : dish.id === selectedDishId) ?? null
    : bundledMenu.dishes.find(dish => dish.id === selectedDishId);

  const sections = useMemo<MenuSection[]>(
    () =>
      activeCategories.map(category => ({
        id: category.id,
        title: category.nombre,
        data: activeDishes.filter(dish => dish.categoria.id === category.id),
      })),
    [activeCategories, activeDishes],
  );


  const dateLabel = fecha ? formatCivilDate(fecha) : '';
  const compactDate = fecha ? formatCivilDate(fecha, {
    weekday: 'short', day: 'numeric', month: 'short',
  }) : '';
  const hours = dayHours.join(' · ');
  const header = (
    <View
      testID="menu-scroll-header"
      style={[styles.header, { paddingHorizontal: spacing.margenLateral }]}
    >
      <TabPageHeader title={t('menu.title')} />
      {readOnly && (
        <View style={[styles.date, { backgroundColor: colors.superficie.elevada, borderRadius: radii.l }]}>
          <Text accessibilityRole="header" style={[typography.etiqueta, { color: colors.texto.primario }]}>
            {t(unavailableAfterRequest ? 'menu.requestFallbackTitle' : 'menu.offlineTitle')}
          </Text>
          <Text style={[typography.pie, { color: colors.texto.secundario }]}>
            {t(readOnlyMessageKey)}
          </Text>
          {online && <Button testID="menu-retry" label={t('common.retry')} variant="tertiary"
            onPress={() => void loadInitial()} style={styles.nextOpen} />}
        </View>
      )}
      {!readOnly && fecha && restauranteId && (
        <View style={[styles.date, { backgroundColor: colors.superficie.elevada, borderRadius: radii.l }]}>
          <Pressable testID="menu-open-calendar" accessibilityRole="button"
            accessibilityLabel={t('menu.openServiceCalendar', { date: dateLabel })} onPress={openCalendar}
            style={styles.dateRow}>
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
            <ChevronRight size={21} color={colors.marca.primario} />
          </Pressable>
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
            <Button
              testID="menu-next-open-date"
              label={t('menu.goToNextOpenDay', { date: formatCivilDate(nextAvailableDay) })}
              variant="tertiary"
              onPress={() => loadDate(nextAvailableDay)}
              style={styles.nextOpen}
            />
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
      {!restauranteId && !readOnly ? (
        <>
          {header}
          <View style={styles.centered}>
            <UtensilsCrossed size={40} color={colors.marca.primario} />
            <Text
              testID="menu-missing-restaurant"
              style={[typography.cuerpoM, styles.centerText, {
                color: colors.texto.secundario, marginTop: spacing.m,
              }]}
            >
              {t('menu.configureRestaurant')}
            </Text>
          </View>
        </>
      ) : (
        <>
          {!readOnly && loading && dishes.length === 0 ? (
            <ScrollView contentContainerStyle={styles.statusContent}>
              {header}
              <View style={styles.centered}>
                <ActivityIndicator testID="menu-loading" color={colors.marca.primario} />
                <Text style={[typography.cuerpoM, { color: colors.texto.secundario, marginTop: spacing.m }]}>
                  {t('common.loading')}
                </Text>
              </View>
            </ScrollView>
          ) : !readOnly && error ? (
            <ScrollView contentContainerStyle={styles.statusContent}>
              {header}
              <View style={[styles.centered, { padding: spacing.l }]}>
                <Text
                  testID="menu-error"
                  style={[typography.cuerpoM, styles.centerText, { color: colors.estado.error }]}
                >
                  {errorStatus(error) === 404 ? t('menu.restaurantNotFound') : t('menu.requestError')}
                </Text>
                <Button
                  testID="menu-retry"
                  label={t('common.retry')}
                  variant="primary"
                  onPress={refresh}
                  style={{ marginTop: spacing.m }}
                />
              </View>
            </ScrollView>
          ) : (
            <MenuCarousels
              header={header}
              onHeaderLayout={event => { headerHeight.current = event.nativeEvent.layout.height; }}
              bottomInset={user && !readOnly ? ORDER_BUTTON_CLEARANCE : 12}
              onScroll={event => {
                // Solo fijo una línea cuando ya salió toda la cabecera de la lista.
                setShowCompactDate(event.nativeEvent.contentOffset.y >= headerHeight.current);
              }}
              sections={sections}
              fecha={fecha ?? todayInBogota()}
              open={dayOpen === true}
              loadingMore={loadingMore}
              loadMoreFailed={loadMoreFailed}
              hasMore={!readOnly && nextPage <= totalPages}
              onMore={loadMore}
              onRefresh={refresh}
              onDetail={setSelectedDishId}
              onRequireSignIn={user ? undefined : () => requestSignIn('cart')}
              readOnly={readOnly}
            />
          )}

          {!readOnly && showCompactDate && fecha && !loading && !error && (
            <Pressable
              testID="menu-compact-date"
              accessibilityRole="button"
              accessibilityLabel={t('menu.openServiceCalendar', { date: dateLabel })}
              onPress={openCalendar}
              style={[styles.compactDate, {
                top: insets.top,
                backgroundColor: colors.superficie.elevada,
                paddingHorizontal: spacing.margenLateral,
              }]}
            >
              <CalendarDays size={14} color={colors.marca.primario} />
              <MenuDateTicker
                active={isFocused}
                label={[compactDate, dayOpen === false ? t('discovery.closed') : hours].filter(Boolean).join(' · ')}
              />
            </Pressable>
          )}

          <MenuDishDetailModal
            visible={selectedDishId !== null || !!route?.params?.slug}
            dishId={selectedDishId}
            slug={route?.params?.slug}
            offlineDish={offlineDish}
            restauranteId={restauranteId}
            fecha={route?.params?.slug ? route.params.fecha ?? todayInBogota() : fecha ?? todayInBogota()}
            onClose={() => {
              setSelectedDishId(null);
              if (route?.params?.slug) navigation.setParams({ slug: undefined, fecha: undefined });
            }}
          />
        </>
      )}
      {!readOnly && !!user && !!restauranteId && <OrderDraftPanel restauranteId={restauranteId} onReserve={() => navigation.navigate('Reservations')} />}
      {!readOnly && showCalendar && !!restauranteId && !!fecha && isFocused && (
        <MenuCalendarModal restauranteId={restauranteId} value={fecha} onClose={closeCalendar}
          onSelect={date => { closeCalendar(); void loadDate(date); }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 8, paddingBottom: 14 },
  date: { paddingVertical: 10, paddingHorizontal: 12, gap: 6 },
  dateRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInfo: { flex: 1 },
  nextOpen: { alignSelf: 'flex-start' },
  compactDate: {
    position: 'absolute', left: 0, right: 0, zIndex: 2,
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7,
  },
  statusContent: { flexGrow: 1, paddingBottom: ORDER_BUTTON_CLEARANCE },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
});
