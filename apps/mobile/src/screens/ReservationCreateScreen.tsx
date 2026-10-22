import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Share,
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
import { Send } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConnection } from '../context/ConnectionContext';
import { useTheme } from '../theme/ThemeContext';
import { Action, Field, Note, Panel } from '../components/attention/Controls';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { menuApi } from '../services/menu.service';
import { reservationsApi } from '../services/reservations.service';
import { PaymentInstructions } from '../components/PaymentInstructions';
import { BackButton } from '../components/navigation/BackButton';
import { useOrderDraft } from '../context/OrderDraftContext';
import { ReservationCalendar } from '../components/calendar/ReservationCalendar';
import { Feedback as Alert } from '../components/feedback/Feedback';
import { formatCivilDate, formatCop, todayInBogota } from '../utils/formatters';

type Step = 'date' | 'slot' | 'order' | 'review' | 'sent';

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
  const [step, setStep] = useState<Step>('date');
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
    setStep(current => current === 'slot' ? 'date'
      : current === 'order' ? 'slot'
        : current === 'review' ? 'order' : 'date');
  }, [busy, onCreated, step]);

  useEffect(() => {
    if (!isActive) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (busy) return true;
      if (step === 'date') onBack();
      else goBackStep();
      return true;
    });
    return () => subscription.remove();
  }, [busy, goBackStep, isActive, onBack, step]);

  const people = Number(peopleText);
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
    if (busy) return;
    if (!dayAvailable) { setError(t('discovery.selectOpenDay')); return; }
    setError(null);
    setMessage(null);
    setSelectedSlot(null);
    // Conservo cantidades propuestas y vuelvo a validar la carta para la fecha elegida.
    setDishes([]);
    if (!isAuthenticated) {
      setMessage(t('reservations.loginPreserveSelection'));
      onRequireLogin();
      return;
    }
    setBusy(true);
    try {
      const query = { fecha: selectedDate, numComensales: people };
      const parsed = ReservationSlotsQuerySchema.safeParse(query);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? t('reservations.invalidGroup'));
      const response = await reservationsApi.slots(parsed.data);
      setSlots(response.franjas);
      setMessage(response.mensaje);
      if (response.franjas.length) setStep('slot');
    } catch (cause) {
      setError(errorText(cause, t('reservations.slotsError')));
    } finally {
      setBusy(false);
    }
  };

  const loadDishes = async () => {
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
      for (const line of draft.lines) {
        const fresh = available.find(dish => dish.id === line.dish.id);
        draft.setQuantity(fresh ?? line.dish, fresh ? quantities[line.dish.id] ?? line.cantidad : 0, selectedDate);
      }
      setQuantities(current => Object.fromEntries(Object.entries(current).filter(([id]) => available.some(dish => dish.id === id))));
      if (draft.lines.length) setMessage(t('discovery.revalidate'));
      setStep('order');
    } catch (cause) {
      setError(errorText(cause, t('reservations.menuError')));
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (busy) return;
    if (!isAuthenticated) {
      setMessage(t('reservations.loginPreserveSelection'));
      onRequireLogin();
      return;
    }
    if (!selectedSlot) return;
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
    setError(null);
    try {
      setResult(await reservationsApi.create(parsed.data));
      draft.clear();
      setMessage(null);
      setStep('sent');
    } catch (cause) {
      setError(errorText(cause, t('reservations.createError')));
    } finally {
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
        <BackButton disabled={busy} onPress={step === 'date' ? onBack : goBackStep} />
        <Text style={[typography.display, { color: colors.texto.primario }]}>{t(step === 'sent' ? 'reservations.sentTitle' : 'reservations.createTitle')}</Text>
        {step !== 'sent' && <Note>{t(`reservations.steps.${step}`)}</Note>}
        {error && <Note live tone="error">{error}</Note>}
        {message && <Note live>{message}</Note>}
        {busy && <ActivityIndicator accessibilityLabel={t('common.loading')} color={colors.marca.primario} />}

        {step === 'date' && (
          <Panel>
            <Text style={[typography.tituloM, { color: colors.texto.primario }]}>{t('reservations.chooseDate')}</Text>
            {isActive && <ReservationCalendar restauranteId={settings.restauranteId} value={selectedDate} min={today} max={maxDate} onChange={setSelectedDate} onAvailability={setDayAvailable} />}
            <Note>{t('reservations.maxAdvance')}</Note>
            <Field label={t('reservations.groupSize')} value={peopleText} onChangeText={setPeopleText} keyboardType="number-pad" />
            <Action testID="reservation-find-slots" label={t('reservations.findSlots')} disabled={busy || !dayAvailable} onPress={() => void findSlots()} />
          </Panel>
        )}

        {step === 'slot' && (
          <Panel>
            <Text style={[typography.tituloM, { color: colors.texto.primario }]}>{formatCivilDate(selectedDate)} · {t('reservations.people', { count: people })}</Text>
            {slots.map(slot => (
              <Action key={slot.horaInicio} label={`${slot.horaInicio}–${slot.horaFin} · ${t('reservations.seatsAvailable', { count: slot.aforoDisponible })}`} selected={selectedSlot?.horaInicio === slot.horaInicio} onPress={() => setSelectedSlot(slot)} />
            ))}
            <Action testID="reservation-continue-order" label={t('reservations.chooseOrder')} disabled={!selectedSlot || busy} onPress={() => void loadDishes()} />
          </Panel>
        )}

        {step === 'order' && (
          <Panel>
            <Text style={[typography.tituloM, { color: colors.texto.primario }]}>{t('reservations.preorderTitle')}</Text>
            <Note>{people >= 8 ? t('reservations.preorderRequired') : t('reservations.preorderOptional')}</Note>
            {dishes.length === 0 ? <Note>{t('reservations.noDishes')}</Note> : dishes.map(dish => (
              <View key={dish.id} style={styles.dishRow}>
                {dish.fotos[0]?.path ? <Image source={{ uri: dish.fotos[0].path }} style={styles.thumbnail} /> : null}
                <View style={styles.flex}>
                  <Text style={[typography.cuerpoL, { color: colors.texto.primario }]}>{dish.nombre}</Text>
                  <Text style={[typography.pie, { color: colors.texto.secundario }]}>{formatCop(dish.precio)}</Text>
                </View>
                <Action label="−" accessibilityLabel={t('discovery.decrease', { name: dish.nombre })} disabled={!quantities[dish.id]} onPress={() => updateQuantity(dish.id, -1)} />
                <Text style={[typography.cuerpoL, { color: colors.texto.primario }]}>{quantities[dish.id] ?? 0}</Text>
                <Action label="+" accessibilityLabel={t('discovery.increase', { name: dish.nombre })} disabled={(quantities[dish.id] ?? 0) >= 99} onPress={() => updateQuantity(dish.id, 1)} />
              </View>
            ))}
            <Field label={t('reservations.note')} value={note} onChangeText={setNote} multiline maxLength={500} />
            <Note>{t('reservations.orderTotal')}: {formatCop(total)}</Note>
            {people < 8 && orderLines.length === 0 && (
              <Action testID="reservation-continue-without-order" label={t('reservations.continueWithoutOrder')} disabled={busy} onPress={() => setStep('review')} />
            )}
            <Action label={t('reservations.reviewRequest')} disabled={busy || (people >= 8 && orderLines.length === 0)} onPress={() => setStep('review')} />
          </Panel>
        )}

        {step === 'review' && selectedSlot && (
          <Panel>
            <Text style={[typography.tituloM, { color: colors.texto.primario }]}>{t('reservations.reviewTitle')}</Text>
            <Note>{formatCivilDate(selectedDate)} · {selectedSlot.horaInicio}–{selectedSlot.horaFin}</Note>
            <Note>{t('reservations.people', { count: people })}</Note>
            {orderLines.length ? orderLines.map(([id, quantity]) => {
              // Repaso cada plato antes de enviar; la API vuelve a validar precios y disponibilidad.
              const dish = dishes.find(item => item.id === id)!;
              return <Note key={id}>{t('reservations.orderLine', { quantity, name: dish.nombre })} · {formatCop(dish.precio * quantity)}</Note>;
            }) : <Note>{t('reservations.noOrder')}</Note>}
            <Note>{t('reservations.orderTotal')}: {formatCop(total)}</Note>
            <Note>{t('reservations.paymentNotice')}</Note>
            <Note>{t('reservations.cancellationPolicy')}</Note>
            <Action testID="reservation-submit" label={t('reservations.submit')} disabled={busy} onPress={() => void create()} />
          </Panel>
        )}

        {step === 'sent' && result && (
          <Panel>
            <Send size={32} color={colors.marca.primario} accessibilityLabel={t('reservations.sentTitle')} />
            <Text selectable style={[typography.codigo, { color: colors.marca.primario }]}>{result.reserva.codigo}</Text>
            <Note>{t('reservations.pendingApproval')}</Note>
            <Note>{t('reservations.total')}: {formatCop(result.reserva.total)}</Note>
            <Text selectable style={[typography.cuerpoM, { color: colors.texto.primario }]}>{result.reserva.ticket}</Text>
            <PaymentInstructions codigo={result.reserva.codigo} ticket={result.reserva.ticket} active={isActive} />
            <Action label={t('reservations.copyCode')} onPress={() => {
              Clipboard.setString(result.reserva.codigo);
              Alert.alert(t('reservations.codeCopied'), undefined, [], { kind: 'success' });
            }} />
            <Action label={t('reservations.copyTicket')} onPress={() => {
              Clipboard.setString(result.reserva.ticket);
              Alert.alert(t('reservations.ticketCopied'), undefined, [], { kind: 'success' });
            }} />
            <Action label={t('reservations.shareTicket')} onPress={() => Share.share({ message: result.reserva.ticket })} />
            <Action label={t('reservations.backToList')} onPress={() => void onCreated()} />
          </Panel>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, width: '100%', maxWidth: 760, alignSelf: 'center' },
  dishRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginVertical: 4 },
  thumbnail: { width: 48, height: 48, borderRadius: 8 },
  flex: { flex: 1 },
});
