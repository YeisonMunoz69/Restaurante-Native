import React, { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ReservationCreateSchema,
  ReservationSlotsQuerySchema,
  type MenuDish,
  type ReservationSlot,
} from '@encanto/shared';
import type { CreateReservationResult } from '../services/reservations.service';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Check, ClipboardList, CircleCheck, Send, Users } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConnection } from '../context/ConnectionContext';
import { useTheme } from '../theme/ThemeContext';
import { Action, Field, Note } from '../components/attention/Controls';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { menuApi } from '../services/menu.service';
import { menuGallery } from '../components/menu/menu-photo';
import { reservationsApi } from '../services/reservations.service';
import { ReservationReceiptCard } from '../components/reservations/ReservationReceipt';
import { Button } from '../components/ui/Button';
import { BackButton } from '../components/navigation/BackButton';
import { useOrderDraft } from '../context/OrderDraftContext';
import { ReservationCalendar } from '../components/calendar/ReservationCalendar';
import { Feedback as Alert } from '../components/feedback/Feedback';
import { formatCivilDate, formatCop, todayInBogota } from '../utils/formatters';

type Step = 'visit' | 'review' | 'sent';

function shiftDate(value: string, days: number) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function addMonths(value: string, months: number) {
  const [year, month, day] = value.split('-').map(Number);
  const index = month - 1 + months;
  const targetYear = year + Math.floor(index / 12);
  const targetMonth = ((index % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay)))
    .toISOString()
    .slice(0, 10);
}

function errorText(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  return typeof message === 'string' ? message : fallback;
}

// Guío fecha, aforo, pedido y confirmación en pasos para que quepa en móviles pequeños.
export function ReservationCreateScreen({
  onBack,
  onCreated,
  isAuthenticated = true,
  isActive = true,
  onRequireLogin = () => undefined,
}: {
  onBack: () => void;
  onCreated: () => Promise<void> | void;
  isAuthenticated?: boolean;
  isActive?: boolean;
  onRequireLogin?: () => void;
}) {
  const { t } = useTranslation();
  const { settings } = useConnection();
  const draft = useOrderDraft();
  const { colors, typography } = useTheme();
  const today = useMemo(todayInBogota, []);
  const maxDate = useMemo(() => addMonths(today, 3), [today]);
  const [selectedDate, setSelectedDate] = useState(draft.fecha && draft.fecha >= today && draft.fecha <= maxDate ? draft.fecha : shiftDate(today, 2));
  const [dayAvailable, setDayAvailable] = useState(false);
  const [peopleText, setPeopleText] = useState('2');
  const [slots, setSlots] = useState<ReservationSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<ReservationSlot | null>(null);
  const [dishes, setDishes] = useState<MenuDish[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>(() => Object.fromEntries(draft.lines.map(line => [line.dish.id, line.cantidad])));
  const quantitiesRef = useRef(quantities);
  quantitiesRef.current = quantities;
  const [note, setNote] = useState('');
  const [result, setResult] = useState<CreateReservationResult | null>(null);
  const [step, setStep] = useState<Step>('visit');
  const [showCalendar, setShowCalendar] = useState(!draft.fecha);
  const [showDishes, setShowDishes] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [slotsBusy, setSlotsBusy] = useState(false);
  const slotSequence = useRef(0);
  const requestedSlots = useRef('');
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Al regresar autenticado retiro el aviso del desvío, sin borrar selección ni pedido.
  useEffect(() => {
    if (isAuthenticated) setMessage(current => current === t('reservations.loginPreserveSelection') ? null : current);
  }, [isAuthenticated, t]);

  const goBackStep = useCallback(() => {
    if (busy) return;
    if (step === 'sent') {
      void onCreated();
      return;
    }
    setStep('visit');
  }, [busy, onCreated, step]);

  useEffect(() => {
    if (!isActive) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (busy) return true;
      if (step === 'visit') onBack();
      else goBackStep();
      return true;
    });
    return () => subscription.remove();
  }, [busy, goBackStep, isActive, onBack, step]);

  const people = Number(peopleText);
  const slotKey = `${selectedDate}/${people}`;
  const orderLines = useMemo(
    () => Object.entries(quantities).filter(([, quantity]) => quantity > 0),
    [quantities],
  );
  const total = useMemo(
    () => orderLines.reduce((sum, [id, quantity]) => {
      const dish = dishes.find(item => item.id === id);
      return sum + (dish?.precio ?? 0) * quantity;
    }, 0),
    [dishes, orderLines],
  );

  const findSlots = async () => {
    if (!dayAvailable) { setError(t('discovery.selectOpenDay')); return; }
    const sequence = ++slotSequence.current;
    setError(null);
    setMessage(null);
    setSelectedSlot(null);
    setSlots([]);
    if (!isAuthenticated) {
      setMessage(t('reservations.loginPreserveSelection'));
      onRequireLogin();
      return;
    }
    requestedSlots.current = slotKey;
    setSlotsBusy(true);
    try {
      const query = { fecha: selectedDate, numComensales: people };
      const parsed = ReservationSlotsQuerySchema.safeParse(query);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? t('reservations.invalidGroup'));
      const response = await reservationsApi.slots(parsed.data);
      if (sequence !== slotSequence.current) return;
      setSlots(response.franjas);
      setMessage(response.mensaje);
    } catch (cause) {
      if (sequence === slotSequence.current) setError(errorText(cause, t('reservations.slotsError')));
    } finally {
      if (sequence === slotSequence.current) setSlotsBusy(false);
    }
  };

  const automaticallyLoadSlots = useEffectEvent(() => {
    if (requestedSlots.current !== slotKey) void findSlots();
  });
  useEffect(() => {
    if (step !== 'visit' || !isActive || !isAuthenticated || !dayAvailable ||
      !Number.isInteger(people) || people < 1 || people > 120) return;
    const timer = setTimeout(automaticallyLoadSlots, 320);
    return () => clearTimeout(timer);
  }, [step, isActive, isAuthenticated, dayAvailable, slotKey, people]);

  const resetSlots = () => {
    slotSequence.current += 1;
    requestedSlots.current = '';
    setSelectedSlot(null);
    setSlots([]);
    setSlotsBusy(false);
    setMessage(null);
    setError(null);
  };

  const loadDishes = async (edit = false) => {
    if (!settings.restauranteId) {
      setError(t('menu.configureRestaurant'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const first = await menuApi.dishes(settings.restauranteId, selectedDate, 1);
      const all = [...first.data];
      for (let page = 2; page <= first.paginacion.totalPaginas; page += 1) {
        const next = await menuApi.dishes(settings.restauranteId, selectedDate, page);
        all.push(...next.data);
      }
      const available = all.filter(dish => dish.disponible);
      setDishes(available);
      setCatalogLoaded(true);
      for (const line of draft.lines) {
        const fresh = available.find(dish => dish.id === line.dish.id);
        draft.setQuantity(fresh ?? line.dish, fresh ? quantities[line.dish.id] ?? line.cantidad : 0, selectedDate);
      }
      setQuantities(current => Object.fromEntries(Object.entries(current).filter(([id]) => available.some(dish => dish.id === id))));
      if (draft.lines.length) setMessage(t('discovery.revalidate'));
      setShowDishes(edit);
    } catch (cause) {
      setError(errorText(cause, t('reservations.menuError')));
    } finally {
      setBusy(false);
    }
  };

  const review = async () => {
    if (!selectedSlot || busy) return;
    setMessage(null);
    setStep('review');
    if (!catalogLoaded && (orderLines.length || people >= 8)) await loadDishes(people >= 8 && !orderLines.length);
  };

  const create = async () => {
    if (busy || submitting.current) return;
    if (!isAuthenticated) {
      setMessage(t('reservations.loginPreserveSelection'));
      onRequireLogin();
      return;
    }
    if (!selectedSlot) return;
    if (orderLines.length && !catalogLoaded) return;
    const payload = {
      fecha: selectedDate,
      horaInicio: selectedSlot.horaInicio,
      numComensales: people,
      lineas: orderLines.map(([platoId, cantidad]) => ({ platoId, cantidad })),
      nota: note.trim() || null,
    };
    const parsed = ReservationCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t('reservations.invalidRequest'));
      return;
    }
    setBusy(true);
    submitting.current = true;
    setError(null);
    try {
      setResult(await reservationsApi.create(parsed.data));
      draft.clear();
      setMessage(null);
      setStep('sent');
    } catch (cause) {
      setError(errorText(cause, t('reservations.createError')));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    const next = Math.min(99, Math.max(0, (quantitiesRef.current[id] ?? 0) + delta));
    quantitiesRef.current = { ...quantitiesRef.current, [id]: next };
    const dish = dishes.find(item => item.id === id);
    if (dish) draft.setQuantity(dish, next, selectedDate);
    setQuantities(quantitiesRef.current);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.superficie.fondo }]}>
      <KeyboardAwareScrollView key={step} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BackButton disabled={busy} onPress={step === 'visit' ? onBack : goBackStep} />
        <Text accessibilityRole="header" style={[typography.display, { color: colors.texto.primario }]}>
          {t(step === 'sent' ? 'reservations.sentTitle' : `reservations.steps.${step}`)}
        </Text>
        {error && <Note live tone="error">{error}</Note>}
        {message && <Note live>{message}</Note>}
        {busy && <ActivityIndicator accessibilityLabel={t('common.loading')} color={colors.marca.primario} />}

        {step === 'visit' && (
          <>
            <View style={[styles.surface, { backgroundColor: colors.superficie.elevada }]}>
              <Button label={formatCivilDate(selectedDate)} accessibilityLabel={t('reservations.chooseDate')}
                icon={CalendarDays} variant="secondary" onPress={() => setShowCalendar(value => !value)} />
              {isActive && <View style={!showCalendar && styles.hidden}>
                <ReservationCalendar restauranteId={settings.restauranteId} value={selectedDate} min={today} max={maxDate}
                  onChange={date => {
                    if (date !== selectedDate) {
                      resetSlots();
                      setDayAvailable(false);
                      setCatalogLoaded(false);
                      setDishes([]);
                      setSelectedDate(date);
                    }
                    setShowCalendar(false);
                  }} onAvailability={setDayAvailable} />
              </View>}
              <Field label={t('reservations.groupSize')} value={peopleText}
                onChangeText={value => { resetSlots(); setPeopleText(value); }} keyboardType="number-pad" />
            </View>
            {slotsBusy && <ActivityIndicator accessibilityLabel={t('common.loading')} color={colors.marca.primario} />}
            {slots.length ? (
              <View style={styles.section}>
                <Text accessibilityRole="header" style={[typography.tituloM, { color: colors.texto.primario }]}>{t('reservations.visitTimes')}</Text>
                <View style={styles.slotGrid}>{slots.map(slot => (
                  <Action key={slot.horaInicio} label={`${slot.horaInicio}–${slot.horaFin}`}
                    accessibilityLabel={`${slot.horaInicio}–${slot.horaFin} · ${t('reservations.seatsAvailable', { count: slot.aforoDisponible })}`}
                    selected={selectedSlot?.horaInicio === slot.horaInicio} onPress={() => setSelectedSlot(slot)} />
                ))}</View>
                <Button variant="primary" testID="reservation-continue-order" label={t('reservations.continueReview')} disabled={!selectedSlot || busy}
                  onPress={() => void review()} />
              </View>
            ) : <Button variant="primary" testID="reservation-find-slots" label={t('reservations.findSlots')}
              disabled={slotsBusy || !dayAvailable} onPress={() => void findSlots()} />}
          </>
        )}

        {step === 'review' && selectedSlot && (
          <>
            <View style={[styles.surface, { backgroundColor: colors.superficie.elevada }]}>
              <View style={styles.summaryLine}>
                <CalendarDays size={20} color={colors.marca.primario} />
                <Text style={[typography.etiqueta, styles.flex, { color: colors.texto.primario }]}>
                  {formatCivilDate(selectedDate)} · {selectedSlot.horaInicio}–{selectedSlot.horaFin}
                </Text>
              </View>
              <View style={styles.summaryLine}>
                <Users size={19} color={colors.marca.primario} />
                <Text style={[typography.cuerpoM, { color: colors.texto.secundario }]}>{t('reservations.people', { count: people })}</Text>
              </View>
            </View>
            <View style={styles.section}>
              <View style={styles.summaryLine}>
                <ClipboardList size={20} color={colors.marca.primario} />
                <Text accessibilityRole="header" style={[typography.tituloM, { color: colors.texto.primario }]}>{t('reservations.preorderTitle')}</Text>
              </View>
              {!showDishes && orderLines.length ? orderLines.map(([id, quantity]) => {
                const dish = dishes.find(item => item.id === id) ?? draft.lines.find(item => item.dish.id === id)?.dish;
                return dish && <Text key={id} style={[typography.cuerpoM, { color: colors.texto.primario }]}>
                  {t('reservations.orderLine', { quantity, name: dish.nombre })} · {formatCop(dish.precio * quantity)}
                </Text>;
              }) : !showDishes && <Note>{people >= 8 ? t('reservations.preorderRequired') : t('reservations.noOrder')}</Note>}
              <Button testID="reservation-toggle-dishes" variant="secondary"
                label={t(showDishes ? 'reservations.finishEditingOrder' : 'reservations.editOrder')}
                disabled={busy} onPress={() => catalogLoaded ? setShowDishes(value => !value) : void loadDishes(true)} />
            </View>
            {showDishes && <View style={[styles.surface, { backgroundColor: colors.superficie.elevada }]}>
              {dishes.length === 0 ? <Note>{t('reservations.noDishes')}</Note> : dishes.map(dish => {
              const photo = menuGallery(dish)[0]?.source;
              return (
                <View key={dish.id} style={styles.dishRow}>
                  {photo ? <Image source={photo} style={styles.thumbnail} /> : null}
                  <View style={styles.flex}>
                    <Text style={[typography.cuerpoL, { color: colors.texto.primario }]}>{dish.nombre}</Text>
                    <Text style={[typography.pie, { color: colors.texto.secundario }]}>{formatCop(dish.precio)}</Text>
                  </View>
                  <Action label="−" accessibilityLabel={t('discovery.decrease', { name: dish.nombre })} disabled={!quantities[dish.id]} onPress={() => updateQuantity(dish.id, -1)} />
                  <Text style={[typography.cuerpoL, { color: colors.texto.primario }]}>{quantities[dish.id] ?? 0}</Text>
                  <Action label="+" accessibilityLabel={t('discovery.increase', { name: dish.nombre })} disabled={(quantities[dish.id] ?? 0) >= 99} onPress={() => updateQuantity(dish.id, 1)} />
                </View>
              );
              })}
            </View>}
            <Button variant="tertiary" label={t(showNote ? 'reservations.hideNote' : 'reservations.addNote')}
              onPress={() => setShowNote(value => !value)} />
            {showNote && <Field label={t('reservations.note')} value={note} onChangeText={setNote} multiline maxLength={500} />}
            <View style={[styles.surface, { backgroundColor: colors.superficie.elevada }]}>
              <View style={styles.total}>
                <Text style={[typography.etiqueta, styles.flex, { color: colors.texto.secundario }]}>{t('reservations.orderTotal')}</Text>
                <Text style={[typography.precio, { color: colors.marca.acento }]}>{formatCop(total)}</Text>
              </View>
              <Note>{t('reservations.paymentNotice')}</Note>
              <Button variant="primary" testID="reservation-submit" label={t('reservations.submit')} icon={Check}
                disabled={busy || (people >= 8 && !orderLines.length) || (!!orderLines.length && !catalogLoaded)}
                onPress={() => void create()} />
            </View>
          </>
        )}

        {step === 'sent' && result && (
          <>
            <View style={[styles.surface, { backgroundColor: colors.superficie.elevada }]}>
              <View style={styles.summaryLine}>
                <Send size={22} color={colors.marca.primario} />
                <Text selectable style={[typography.codigo, styles.flex, { color: colors.marca.primario }]}>{result.reserva.codigo}</Text>
              </View>
              <Note>{formatCivilDate(result.reserva.fecha)} · {result.reserva.horaInicio}–{result.reserva.horaFin}</Note>
              <Note>{t('reservations.people', { count: result.reserva.numComensales })} · {formatCop(result.reserva.total)}</Note>
            </View>
            <ReservationReceiptCard reservation={result.reserva} active={isActive}
              onUpdate={reserva => setResult(current => current ? { ...current, reserva } : current)} />
            <Action variant="tertiary" label={t('reservations.copyCode')} onPress={() => {
              Clipboard.setString(result.reserva.codigo);
              Alert.alert(t('reservations.codeCopied'), undefined, [], { kind: 'success' });
            }} />
            <Button variant="tertiary" label={t('reservations.backToList')} icon={CircleCheck} onPress={() => void onCreated()} />
          </>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, width: '100%', maxWidth: 760, alignSelf: 'center', gap: 14 },
  surface: { padding: 14, borderRadius: 20, gap: 10 },
  section: { gap: 10 },
  hidden: { display: 'none' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  summaryLine: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  total: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dishRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginVertical: 4 },
  thumbnail: { width: 48, height: 48, borderRadius: 8 },
  flex: { flex: 1 },
});
