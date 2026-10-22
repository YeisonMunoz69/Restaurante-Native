import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  Alert,
  ActivityIndicator,
  BackHandler,
  Image,
  Linking,
  ScrollView,
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
  const { colors, typography } = useTheme();
  const today = useMemo(todayInBogota, []);
  const maxDate = useMemo(() => addMonths(today, 3), [today]);
  const [selectedDate, setSelectedDate] = useState(shiftDate(today, 2));
  const [windowOffset, setWindowOffset] = useState(0);
  const [peopleText, setPeopleText] = useState('2');
  const [slots, setSlots] = useState<ReservationSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<ReservationSlot | null>(null);
  const [dishes, setDishes] = useState<MenuDish[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const [result, setResult] = useState<CreateReservationResult | null>(null);
  const [step, setStep] = useState<Step>('date');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
    setError(null);
    setMessage(null);
    setSelectedSlot(null);
    // Al volver a consultar no arrastro platos de una fecha o grupo anterior.
    setQuantities({});
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
      setDishes(all.filter(dish => dish.disponible));
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
      setStep('sent');
    } catch (cause) {
      setError(errorText(cause, t('reservations.createError')));
    } finally {
      setBusy(false);
    }
  };

  const launchWhatsApp = async () => {
    if (!result) return;
    const phone = result.whatsapp.replace(/\D/g, '');
    const text = encodeURIComponent(`${result.reserva.ticket}\n\n${result.instruccionesPago}`);
    const url = `https://wa.me/${phone}?text=${text}`;
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
  };

  const updateQuantity = (id: string, delta: number) => {
    setQuantities(current => {
      const next = Math.max(0, (current[id] ?? 0) + delta);
      return { ...current, [id]: next };
    });
  };

  const days = Array.from({ length: 7 }, (_, index) => shiftDate(today, windowOffset + index))
    .filter(day => day <= maxDate);

  // Al cambiar de semana mantengo la selección si sigue visible; de lo contrario
  // selecciono el primer día de la nueva semana para que la consulta coincida.
  const moveWindow = (nextOffset: number) => {
    const firstDay = shiftDate(today, nextOffset);
    const lastDay = shiftDate(today, nextOffset + 6);
    setWindowOffset(nextOffset);
    setSelectedDate(current =>
      current < firstDay || current > lastDay ? firstDay : current,
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.superficie.fondo }]}>
      <KeyboardAwareScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Action label={t('common.back')} disabled={busy} onPress={step === 'date' ? onBack : goBackStep} />
        <Text style={[typography.display, { color: colors.texto.primario }]}>{t(step === 'sent' ? 'reservations.sentTitle' : 'reservations.createTitle')}</Text>
        {step !== 'sent' && <Note>{t(`reservations.steps.${step}`)}</Note>}
        {error && <Note live>{error}</Note>}
        {message && <Note live>{message}</Note>}
        {busy && <ActivityIndicator accessibilityLabel={t('common.loading')} color={colors.marca.primario} />}

        {step === 'date' && (
          <Panel>
            <Text style={[typography.tituloM, { color: colors.texto.primario }]}>{t('reservations.chooseDate')}</Text>
            <View style={styles.weekHeader}>
              <Action label="‹" disabled={windowOffset === 0} onPress={() => moveWindow(Math.max(0, windowOffset - 7))} />
              <Text style={[typography.cuerpoM, styles.weekLabel, { color: colors.texto.primario }]}>{formatCivilDate(days[0])}</Text>
              <Action label="›" disabled={shiftDate(today, windowOffset + 7) > maxDate} onPress={() => moveWindow(windowOffset + 7)} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.days}
            >
              {days.map(day => (
                <View key={day} style={styles.day}>
                  <Action label={formatCivilDate(day, { weekday: 'short', day: 'numeric' })} selected={selectedDate === day} onPress={() => setSelectedDate(day)} />
                </View>
              ))}
            </ScrollView>
            <Note>{t('reservations.maxAdvance')}</Note>
            <Field label={t('reservations.groupSize')} value={peopleText} onChangeText={setPeopleText} keyboardType="number-pad" />
            {people >= 15 && <Note>{t('reservations.weekdayGroup')}</Note>}
            <Action testID="reservation-find-slots" label={t('reservations.findSlots')} disabled={busy} onPress={() => void findSlots()} />
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
                <Action label="−" disabled={!quantities[dish.id]} onPress={() => updateQuantity(dish.id, -1)} />
                <Text style={[typography.cuerpoL, { color: colors.texto.primario }]}>{quantities[dish.id] ?? 0}</Text>
                <Action label="+" onPress={() => updateQuantity(dish.id, 1)} />
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
            <Note>{result.instruccionesPago}</Note>
            <Action label={t('reservations.copyCode')} onPress={() => {
              Clipboard.setString(result.reserva.codigo);
              Alert.alert(t('reservations.codeCopied'));
            }} />
            <Action label={t('reservations.copyTicket')} onPress={() => {
              Clipboard.setString(result.reserva.ticket);
              Alert.alert(t('reservations.ticketCopied'));
            }} />
            <Action label={t('reservations.sendWhatsApp')} onPress={() => void launchWhatsApp()} />
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
  weekHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // Dejo que la fecha ocupe varias líneas sin empujar las flechas fuera del panel.
  weekLabel: { flex: 1, textAlign: 'center', marginHorizontal: 8 },
  days: { flexDirection: 'row', paddingVertical: 4 },
  day: { width: 76, marginRight: 8 },
  dishRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginVertical: 4 },
  thumbnail: { width: 48, height: 48, borderRadius: 8 },
  flex: { flex: 1 },
});
