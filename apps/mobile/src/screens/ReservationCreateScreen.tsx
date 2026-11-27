import React, { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { BackHandler, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ReservationCreateSchema, ReservationSlotsQuerySchema, RESERVATION_RECEIPT_MAX_BYTES, type MenuDish, type ReservationSlot } from '@encanto/shared';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardList, Clock3, ImagePlus, Send, Sparkles, Trash2, Users, Wallet } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { useConnection } from '../context/ConnectionContext';
import { useTheme } from '../theme/ThemeContext';
import { Action, Field, Note } from '../components/attention/Controls';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { menuApi } from '../services/menu.service';
import { menuGallery } from '../components/menu/menu-photo';
import { reservationsApi, type CreateReservationResult } from '../services/reservations.service';
import { ReservationReceiptCard } from '../components/reservations/ReservationReceipt';
import { PaymentInstructions } from '../components/PaymentInstructions';
import { Button } from '../components/ui/Button';
import { BackButton } from '../components/navigation/BackButton';
import { useOrderDraft } from '../context/OrderDraftContext';
import { receiptBridge, useReservationDraft, type DraftReceipt, type ReservationStep } from '../context/ReservationDraftContext';
import { ReservationCalendar } from '../components/calendar/ReservationCalendar';
import { ContextHelp, ContextOverlay, LoadingOverlay, TransientNotice } from '../components/feedback/ContextOverlay';
import { Feedback } from '../components/feedback/Feedback';
import { formatCivilDate, formatCop, todayInBogota } from '../utils/formatters';

const steps = ['visit', 'time', 'order', 'review'] as const;
const previousStep = { time: 'visit', order: 'time', review: 'order' } as const;

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonths(value: string, months: number) {
  const [year, month, day] = value.split('-').map(Number);
  const last = new Date(Date.UTC(year, month - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1 + months, Math.min(day, last))).toISOString().slice(0, 10);
}

function errorText(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof message === 'string' ? message : fallback;
}

export function ReservationCreateScreen({
  onBack, onCreated, isAuthenticated = true, isActive = true, onRequireLogin = () => undefined,
}: {
  onBack: () => void; onCreated: () => Promise<void> | void;
  isAuthenticated?: boolean; isActive?: boolean; onRequireLogin?: () => void;
}) {
  const { t } = useTranslation();
  const { settings } = useConnection();
  const cart = useOrderDraft();
  const { saved, saveFields, saveReceipt, clearReceipt, reset } = useReservationDraft();
  const { colors, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const today = useMemo(todayInBogota, []);
  const maxDate = useMemo(() => addMonths(today, 3), [today]);
  const initial = saved.fields;
  const dateToResume = initial?.date ?? cart.fecha;
  const mustChooseDate = !!dateToResume && (dateToResume < today || dateToResume > maxDate) && !initial?.result;
  const [date, setDate] = useState(dateToResume && !mustChooseDate ? dateToResume : shiftDate(today, 2));
  const [peopleText, setPeopleText] = useState(initial?.people ?? '2');
  const [slot, setSlot] = useState<ReservationSlot | null>(mustChooseDate ? null : initial?.slot ?? null);
  const [quantities, setQuantities] = useState<Record<string, number>>(() => ({
    ...initial?.quantities, ...Object.fromEntries(cart.lines.map(line => [line.dish.id, line.cantidad])),
  }));
  const quantitiesRef = useRef(quantities);
  const [note, setNote] = useState(initial?.note ?? '');
  const [result, setResult] = useState<CreateReservationResult | null>(initial?.result ?? null);
  const [step, setStep] = useState<ReservationStep>(mustChooseDate ? 'visit' : initial?.step ?? 'visit');
  const [available, setAvailable] = useState(false);
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [slots, setSlots] = useState<ReservationSlot[]>([]);
  const [catalog, setCatalog] = useState<{ date: string; dishes: MenuDish[] } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionLimit, setSuggestionLimit] = useState(6);
  const [category, setCategory] = useState<string | null>(null);
  const [showNote, setShowNote] = useState(!!initial?.note);
  const [showPayment, setShowPayment] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savingExit, setSavingExit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const request = useRef(0);
  const submitting = useRef(false);
  const exitRequest = useRef<symbol | null>(null);
  const clearNotice = useCallback(() => setNotice(null), []);
  const people = Number(peopleText);
  const receipt = saved.receipt;
  useEffect(() => {
    if (receipt) setShowPayment(false);
  }, [receipt]);
  const dishes = catalog?.date === date ? catalog.dishes : [];
  const selected = dishes.filter(dish => (quantities[dish.id] ?? 0) > 0);
  const requested = Object.entries(quantities).filter(([, qty]) => qty > 0);
  const remaining = dishes.filter(dish => !quantities[dish.id]);
  const suggestions = remaining.filter(dish => !category || dish.categoria.id === category);
  const categories = Array.from(new Map(remaining.map(dish => [dish.categoria.id, dish.categoria])).values());
  const total = selected.reduce((sum, dish) => sum + dish.precio * quantities[dish.id], 0);

  useEffect(() => {
    void saveFields({ step, date, people: peopleText, slot, quantities, note, result }).catch(() => {
      setError(t('reservations.draftSaveError'));
    });
  }, [step, date, peopleText, slot, quantities, note, result, saveFields, t]);

  const finish = async () => {
    if (result?.reserva.comprobante && !receipt) await reset().catch(() => {});
    await onCreated();
  };
  useEffect(() => () => { exitRequest.current = null; }, [isActive, saveFields]);

  // Confirmo la salida solo después de guardar este paso. Atrás físico cancela el diálogo.
  const leaveForm = async () => {
    if (!isActive || busy || calendarBusy || exitRequest.current) return;
    if (step === 'sent') { await finish(); return; }
    const pendingExit = Symbol();
    exitRequest.current = pendingExit;
    const release = () => {
      if (exitRequest.current !== pendingExit) return false;
      exitRequest.current = null;
      return true;
    };
    setSavingExit(true);
    try {
      await saveFields({ step, date, people: peopleText, slot, quantities, note, result });
      if (exitRequest.current !== pendingExit) return;
      Feedback.alert(t('reservations.progressSaved'), t('reservations.keepEditingPrompt'), [
        { text: t('reservations.keepEditing'), style: 'cancel', onPress: () => { release(); } },
        { text: t('reservations.leaveDraft'), onPress: () => { if (release()) onBack(); } },
      ], { kind: 'success' });
    } catch {
      if (release()) setError(t('reservations.draftSaveError'));
    } finally {
      setSavingExit(false);
    }
  };

  const backRef = useEffectEvent(() => { void leaveForm(); });
  useEffect(() => {
    if (!isActive) return undefined;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { backRef(); return true; });
    return () => listener.remove();
  }, [isActive]);

  const findSlots = async () => {
    if (!isAuthenticated) { onRequireLogin(); return; }
    const parsed = ReservationSlotsQuerySchema.safeParse({ fecha: date, numComensales: people });
    if (!parsed.success) { setError(t('reservations.invalidGroup')); return; }
    const sequence = ++request.current;
    setError(null);
    setBusy(true);
    try {
      const response = await reservationsApi.slots(parsed.data);
      if (sequence !== request.current) return;
      setSlots(response.franjas);
      setSlot(current => current ? response.franjas.find(item => item.horaInicio === current.horaInicio) ?? null : null);
      if (!response.franjas.length) setError(response.mensaje ?? t('reservations.noVisitTimes'));
    } catch (failure) {
      if (sequence === request.current) setError(errorText(failure, t('reservations.slotsError')));
    } finally {
      if (sequence === request.current) setBusy(false);
    }
  };
  const loadTimes = useEffectEvent(() => { void findSlots(); });
  useEffect(() => {
    if (step === 'time' && isActive && isAuthenticated) loadTimes();
    return () => { request.current += 1; };
  }, [step, date, people, isActive, isAuthenticated]);

  const loadDishes = async () => {
    if (!settings.restauranteId) { setError(t('menu.configureRestaurant')); return; }
    setBusy(true);
    setError(null);
    try {
      const first = await menuApi.dishes(settings.restauranteId, date, 1);
      const all = [...first.data];
      for (let page = 2; page <= first.paginacion.totalPaginas; page++) {
        all.push(...(await menuApi.dishes(settings.restauranteId, date, page)).data);
      }
      const valid = all.filter(dish => dish.disponible);
      const validIds = new Set(valid.map(dish => dish.id));
      const visible = Object.fromEntries(Object.entries(quantitiesRef.current).filter(([id]) => validIds.has(id)));
      if (Object.keys(visible).length !== Object.keys(quantitiesRef.current).length) setNotice(t('reservations.orderChanged'));
      for (const line of cart.lines) {
        const fresh = valid.find(dish => dish.id === line.dish.id);
        cart.setQuantity(fresh ?? line.dish, fresh ? visible[line.dish.id] ?? 0 : 0, date);
      }
      quantitiesRef.current = visible;
      setQuantities(visible);
      setCatalog({ date, dishes: valid });
      if (people >= 8 && !Object.values(visible).some(qty => qty > 0) && step === 'order') setShowSuggestions(true);
    } catch (failure) {
      setError(errorText(failure, t('reservations.menuError')));
    } finally {
      setBusy(false);
    }
  };
  const refreshCatalog = useEffectEvent(() => { if (catalog?.date !== date) void loadDishes(); });
  useEffect(() => {
    if ((step === 'order' || step === 'review') && isActive && (step === 'order' || Object.keys(quantitiesRef.current).length)) {
      refreshCatalog();
    }
  }, [step, date, isActive]);

  const quantity = (dish: MenuDish, delta: number) => {
    const next = Math.max(0, Math.min(99, (quantitiesRef.current[dish.id] ?? 0) + delta));
    const updated = { ...quantitiesRef.current };
    if (next) updated[dish.id] = next;
    else delete updated[dish.id];
    quantitiesRef.current = updated;
    setQuantities(updated);
    cart.setQuantity(dish, next, date);
  };

  const pick = async () => {
    if (busy) return;
    try {
      const selectedImage = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 1, assetRepresentationMode: 'compatible' });
      if (selectedImage.didCancel) return;
      const asset = selectedImage.assets?.[0];
      if (!asset?.uri) throw new Error('IMAGE_UNAVAILABLE');
      if (asset.fileSize && asset.fileSize > RESERVATION_RECEIPT_MAX_BYTES) {
        setNotice(t('reservations.receiptSize'));
        return;
      }
      setBusy(true);
      const file: DraftReceipt = receiptBridge
        ? { ...await receiptBridge.save(asset.uri), copied: true }
        : { uri: asset.uri, type: asset.type ?? 'image/png', fileName: asset.fileName ?? 'comprobante.png' };
      await saveReceipt(file);
      setNotice(t('reservations.incomingReceiptSaved'));
    } catch {
      setError(t('reservations.incomingReceiptError'));
    } finally {
      setBusy(false);
    }
  };

  const updateSent = async (reserva: CreateReservationResult['reserva'], fileName?: string) => {
    const savedResult = result ? { ...result, reserva } : null;
    if (!savedResult) return;
    // Quito el aviso del intento anterior cuando la API ya aceptó el comprobante.
    setError(null);
    setResult(savedResult);
    await saveFields({ step: 'sent', date, people: peopleText, slot, quantities, note, result: savedResult });
    if (fileName) await clearReceipt(fileName);
  };
  const submit = async () => {
    if (submitting.current || busy || !slot || result) return;
    if (!isAuthenticated) { onRequireLogin(); return; }
    const data = ReservationCreateSchema.safeParse({ fecha: date, horaInicio: slot.horaInicio,
      numComensales: people, lineas: requested.map(([platoId, cantidad]) => ({ platoId, cantidad })), nota: note.trim() || null });
    if (!data.success) { setError(t('reservations.invalidRequest')); return; }
    submitting.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const created = await reservationsApi.create(data.data);
      setResult(created);
      setStep('sent');
      cart.clear();
      await saveFields({ step: 'sent', date, people: peopleText, slot, quantities, note, result: created });
      if (receipt) {
        try {
          const reserva = await reservationsApi.uploadReceipt(created.reserva.id, receipt);
          const updated = { ...created, reserva };
          setResult(updated);
          await saveFields({ step: 'sent', date, people: peopleText, slot, quantities, note, result: updated });
          await clearReceipt(receipt.fileName);
        } catch (failure) {
          setError(errorText(failure, t('reservations.receiptQueuedRetry')));
        }
      }
    } catch (failure) {
      setError(errorText(failure, t('reservations.createError')));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const changeDate = (value: string) => {
    if (value === date) return;
    setDate(value);
    setSlot(null);
    setAvailable(false);
    setError(null);
  };
  const changePeople = (value: string) => {
    setPeopleText(value);
    setSlot(null);
  };
  const stepNumber = step === 'sent' ? 0 : steps.indexOf(step) + 1;
  const title = t(step === 'sent' ? 'reservations.sentTitle' : `reservations.steps.${step}`);
  const groupValid = Number.isInteger(people) && people >= 1 && people <= 120;
  const invalidOrder = (people >= 8 && !requested.length) || (!!requested.length && catalog?.date !== date);
  const cannotAdvance = busy || savingExit || (step === 'visit' && (!available || !groupValid || calendarBusy)) || (step === 'time' && !slot) ||
    ((step === 'order' || step === 'review') && invalidOrder);
  const advance = () => {
    if (cannotAdvance) return;
    setError(null);
    if (step === 'visit') { if (isAuthenticated) setStep('time'); else onRequireLogin(); }
    else if (step === 'time') setStep('order');
    else if (step === 'order') setStep('review');
    else if (step === 'review') void submit();
    else void finish();
  };
  const summary = (
    <View style={[styles.summary, { backgroundColor: colors.superficie.elevada, borderRadius: radii.l }]}>
      <View style={styles.row}>
        <CalendarDays size={20} color={colors.marca.primario} />
        <Text style={[typography.etiqueta, styles.flex, { color: colors.texto.primario }]}>{formatCivilDate(date)}</Text>
      </View>
      <View style={styles.row}>
        <Users size={19} color={colors.marca.primario} />
        <Text style={[typography.cuerpoM, styles.flex, { color: colors.texto.secundario }]}>{t('reservations.people', { count: people })}</Text>
        {slot && <Text style={[typography.etiqueta, { color: colors.marca.acento }]}>{slot.horaInicio}–{slot.horaFin}</Text>}
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.superficie.fondo }]}>
      <KeyboardAwareScrollView key={step} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.row}>
          <BackButton onPress={() => void leaveForm()} disabled={busy || calendarBusy || savingExit}
            accessibilityLabel={t('reservations.backToList')} />
          {!!stepNumber && <Text style={[typography.pie, { color: colors.texto.secundario }]}>
            {t('reservations.progress', { step: stepNumber })}
          </Text>}
        </View>
        <View style={styles.row}>
          <Text accessibilityRole="header" style={[typography.display, styles.flex, { color: colors.texto.primario }]}>{title}</Text>
          {step !== 'sent' && <ContextHelp title={title} text={t(`reservations.stepHelp.${step}`)} />}
        </View>
        {!!error && <Note live tone="error">{error}</Note>}
        {step === 'visit' && (
          <View style={[styles.surface, { backgroundColor: colors.superficie.elevada }]}>
            {isActive && <ReservationCalendar restauranteId={settings.restauranteId} min={today} max={maxDate} value={date}
              onAvailability={setAvailable} onLoadingChange={setCalendarBusy} compact onChange={changeDate}
              onUnavailable={() => setNotice(t('reservations.closedDayNotice'))} />}
            <Field label={t('reservations.groupSize')} keyboardType="number-pad" value={peopleText} onChangeText={changePeople} />
          </View>
        )}
        {step === 'time' && <>
          {summary}
          <TimeCards slots={slots} selected={slot} onSelect={setSlot} />
          {!busy && !slots.length && <Button label={t('common.retry')} onPress={() => void findSlots()} />}
        </>}
        {step === 'order' && <>
          <View style={styles.row}>
            <ClipboardList size={21} color={colors.marca.primario} />
            <Text accessibilityRole="header" style={[typography.tituloM, styles.flex, { color: colors.texto.primario }]}>{t('reservations.selectedDishes')}</Text>
          </View>
          {selected.map(dish => <DishRow key={dish.id} dish={dish} count={quantities[dish.id]} onChange={delta => quantity(dish, delta)} />)}
          {!selected.length && !busy && <Note>{t(people >= 8 ? 'reservations.preorderRequired' : 'reservations.noOrder')}</Note>}
          <Button variant="tertiary" icon={Sparkles} expanded={showSuggestions}
            style={{ backgroundColor: colors.marca.primarioSuave, borderRadius: radii.completo }}
            label={t(showSuggestions ? 'reservations.hideSuggestions' : 'reservations.showSuggestions')}
            onPress={() => setShowSuggestions(value => !value)} disabled={!remaining.length && !showSuggestions} />
          {showSuggestions && categories.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Button label={t('menu.allCategories')} selected={category === null} onPress={() => { setCategory(null); setSuggestionLimit(6); }} />
            {categories.map(item => <Button key={item.id} label={item.nombre} selected={category === item.id} onPress={() => { setCategory(item.id); setSuggestionLimit(6); }} />)}
          </ScrollView>}
          {showSuggestions && suggestions.slice(0, suggestionLimit).map(dish =>
            <DishRow key={dish.id} dish={dish} onChange={delta => quantity(dish, delta)} />)}
          {showSuggestions && suggestions.length > suggestionLimit &&
            <Button variant="tertiary" label={t('reservations.moreSuggestions')} onPress={() => setSuggestionLimit(limit => limit + 6)} />}
          {error && <Button label={t('common.retry')} onPress={() => void loadDishes()} disabled={busy} />}
          <Button variant="tertiary" label={t(showNote ? 'reservations.hideNote' : 'reservations.addNote')} onPress={() => setShowNote(value => !value)} />
          {showNote && <Field label={t('reservations.note')} value={note} onChangeText={setNote} multiline maxLength={500} />}
        </>}
        {step === 'review' && <>
          {summary}
          <Text accessibilityRole="header" style={[typography.tituloM, { color: colors.texto.primario }]}>{t('reservations.selectedDishes')}</Text>
          {selected.map(dish => <DishRow key={dish.id} dish={dish} count={quantities[dish.id]} />)}
          {!selected.length && !busy && <Note>{t('reservations.noOrder')}</Note>}
          {!!note && <Note>{note}</Note>}
          {catalog?.date !== date && !!requested.length && !busy && <Button label={t('common.retry')} onPress={() => void loadDishes()} />}
          <View style={[styles.surface, { backgroundColor: colors.superficie.elevada, borderRadius: radii.l }]}>
            <View style={styles.row}>
              <ImagePlus size={21} color={colors.marca.primario} />
              <Text accessibilityRole="header" style={[typography.tituloM, styles.flex, { color: colors.texto.primario }]}>
                {t(receipt ? 'reservations.receiptSavedDraft' : 'reservations.receiptField')}
              </Text>
              {receipt && <Pressable accessibilityRole="button" accessibilityLabel={t('reservations.removeDraftReceipt')}
                disabled={busy} onPress={() => { void clearReceipt(receipt.fileName).catch(() => setError(t('reservations.draftSaveError'))); }}
                style={({ pressed }) => [styles.receiptRemove, {
                  borderRadius: radii.completo,
                  backgroundColor: pressed ? colors.superficie.borde : colors.superficie.fondo,
                }]}
              >
                <Trash2 size={18} color={colors.estado.error} accessible={false} />
              </Pressable>}
            </View>
            {receipt && <Image source={{ uri: receipt.uri }} accessibilityLabel={t('reservations.receiptField')}
              resizeMode="contain" style={[styles.proof, { backgroundColor: colors.superficie.fondo }]} />}
            <View style={styles.receiptActions}>
              <Button style={[styles.receiptAction, { borderRadius: radii.completo }]} testID="reservation-step4-receipt"
                label={t(receipt ? 'reservations.changePhoto' : 'reservations.addPhoto')}
                accessibilityLabel={t(receipt ? 'reservations.receiptReplace' : 'reservations.receiptAttach')}
                icon={ImagePlus} onPress={() => void pick()} disabled={busy} />
              <Button style={[styles.receiptAction, { borderRadius: radii.completo }]} variant="tertiary"
                label={t('reservations.paymentMethods')} icon={Wallet} onPress={() => setShowPayment(true)} disabled={busy} />
            </View>
          </View>
        </>}
        {step === 'sent' && result && <>
          <View style={[styles.summary, { backgroundColor: colors.superficie.elevada, borderRadius: radii.l }]}>
            <View style={styles.row}>
              <Send size={22} color={colors.marca.primario} />
              <Text selectable style={[typography.codigo, styles.flex, { color: colors.marca.primario }]}>{result.reserva.codigo}</Text>
            </View>
            <Note>{formatCivilDate(result.reserva.fecha)} · {result.reserva.horaInicio}–{result.reserva.horaFin}</Note>
            <Note>{t('reservations.people', { count: result.reserva.numComensales })} · {formatCop(result.reserva.total)}</Note>
          </View>
          <ReservationReceiptCard reservation={result.reserva} draftReceipt={receipt} active={isActive}
            onUpdate={(updated, fileName) => { void updateSent(updated, fileName).catch(() => setError(t('reservations.draftSaveError'))); }} />
          <Action variant="tertiary" label={t('reservations.copyCode')} onPress={() => {
            Clipboard.setString(result.reserva.codigo);
            setNotice(t('reservations.codeCopied'));
          }} />
        </>}
      </KeyboardAwareScrollView>
      <View style={[styles.footer, { backgroundColor: colors.superficie.fondo, borderColor: colors.superficie.borde }]}>
        {(step === 'order' || step === 'review') && <View style={styles.row}>
          <Text style={[typography.etiqueta, styles.flex, { color: colors.texto.secundario }]}>{t('reservations.orderTotal')}</Text>
          <Text style={[typography.precio, { color: colors.marca.acento }]}>{formatCop(total)}</Text>
        </View>}
        <View style={styles.stepActions}>
          {step !== 'sent' && step !== 'visit' && <BackButton testID="reservation-previous-step"
            style={styles.previousStep} accessibilityLabel={t('reservations.previousStep')}
            disabled={busy || savingExit} onPress={() => { setError(null); setStep(previousStep[step]); }} />}
          <Button style={styles.flex} variant="primary" testID={step === 'review' ? 'reservation-submit' : `reservation-continue-${step}`}
            label={t(step === 'sent' ? 'reservations.backToList' : step === 'review' ? 'reservations.submit' : 'common.continue')}
            icon={step === 'review' ? Check : undefined}
            endIcon={stepNumber > 0 && step !== 'review' ? ChevronRight : undefined}
            accessibilityLabel={t(stepNumber > 0 && step !== 'review' ? 'reservations.nextStep'
              : step === 'review' ? 'reservations.submit' : 'reservations.backToList')}
            onPress={advance} disabled={cannotAdvance} />
        </View>
      </View>
      {showPayment && <ContextOverlay visible title={t('reservations.receiptShowPayment')} onClose={() => setShowPayment(false)}>
        <ScrollView style={styles.payment}><PaymentInstructions codigo="" ticket="" /></ScrollView>
      </ContextOverlay>}
      <LoadingOverlay visible={isActive && (busy || (step === 'visit' && calendarBusy))} />
      <TransientNotice message={notice} clear={clearNotice} top={insets.top + 4} />
    </SafeAreaView>
  );
}

function TimeCards({ slots, selected, onSelect }: {
  slots: ReservationSlot[]; selected: ReservationSlot | null; onSelect: (slot: ReservationSlot) => void;
}) {
  const { t } = useTranslation();
  const { colors, radii, typography } = useTheme();
  const [period, setPeriod] = useState<'morning' | 'afternoon'>(selected && selected.horaInicio >= '12:00' ? 'afternoon' : 'morning');
  const morning = slots.filter(item => item.horaInicio < '12:00');
  const afternoon = slots.filter(item => item.horaInicio >= '12:00');
  const chosen = morning.length && afternoon.length ? period : afternoon.length ? 'afternoon' : 'morning';
  const visibleSlots = chosen === 'morning' ? morning : afternoon;
  const visibleSelection = visibleSlots.find(item => item.horaInicio === selected?.horaInicio);
  if (!slots.length) return null;
  return (
    <View style={[styles.surface, { backgroundColor: colors.superficie.elevada, borderRadius: radii.l }]}>
      <View style={styles.row}>
        <Clock3 size={20} color={colors.marca.primario} />
        <Text accessibilityRole="header" style={[typography.tituloM, styles.flex, { color: colors.texto.primario }]}>{t('reservations.visitTimes')}</Text>
      </View>
      {!!morning.length && !!afternoon.length && <View style={styles.row}>
        <Button style={styles.flex} label={t('reservations.morning')} selected={chosen === 'morning'} onPress={() => setPeriod('morning')} />
        <Button style={styles.flex} label={t('reservations.afternoon')} selected={chosen === 'afternoon'} onPress={() => setPeriod('afternoon')} />
      </View>}
      <TimeStrip key={chosen} slots={visibleSlots} selected={selected} onSelect={onSelect} />
      {!!visibleSelection && <Text style={[typography.pie, { color: colors.texto.secundario }]}>
        {t('reservations.seatsAvailable', { count: visibleSelection.aforoDisponible })}
      </Text>}
    </View>
  );
}

// Mido el ancho real de las franjas para mostrar flechas solo cuando queda contenido por recorrer.
function TimeStrip({ slots, selected, onSelect }: {
  slots: ReservationSlot[]; selected: ReservationSlot | null; onSelect: (slot: ReservationSlot) => void;
}) {
  const { t } = useTranslation();
  const { colors, radii } = useTheme();
  const strip = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [rowWidth, setRowWidth] = useState(0);
  const [viewport, setViewport] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [offset, setOffset] = useState(0);
  const hasOverflow = rowWidth > 0 && contentWidth > rowWidth + 1;
  const end = Math.max(0, contentWidth - viewport);

  const arrow = (direction: -1 | 1) => {
    const Icon = direction < 0 ? ChevronLeft : ChevronRight;
    const disabled = direction < 0 ? offset < 1 : offset >= end - 1;
    return (
      <Pressable
        testID={direction < 0 ? 'reservation-time-earlier' : 'reservation-time-later'}
        accessibilityRole="button"
        accessibilityLabel={t(direction < 0 ? 'reservations.earlierTimes' : 'reservations.laterTimes')}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => strip.current?.scrollTo({
          x: Math.max(0, Math.min(end, offset + direction * Math.max(viewport - 28, 48))), animated: true,
        })}
        style={({ pressed }) => [styles.timeArrow, {
          opacity: disabled ? 0.35 : 1,
          borderRadius: radii.completo,
          backgroundColor: pressed ? colors.marca.primarioSuave : 'transparent',
        }]}
      >
        <Icon size={20} color={colors.marca.primario} accessible={false} />
      </Pressable>
    );
  };

  return (
    <View testID="reservation-time-strip" style={styles.timeStrip} onLayout={event => setRowWidth(event.nativeEvent.layout.width)}>
      {hasOverflow && arrow(-1)}
      <ScrollView testID="reservation-time-scroll" horizontal ref={strip} style={[styles.flex, styles.timeViewport]} showsHorizontalScrollIndicator={false}
        onLayout={event => setViewport(event.nativeEvent.layout.width)}
        onContentSizeChange={setContentWidth}
        onScroll={event => setOffset(event.nativeEvent.contentOffset.x)} scrollEventThrottle={32}
        contentContainerStyle={styles.timeChips}>
        {slots.map(item => (
          <Button key={item.horaInicio} style={styles.hour} label={item.horaInicio}
            accessibilityLabel={item.horaInicio + '–' + item.horaFin + ' · ' + t('reservations.seatsAvailable', { count: item.aforoDisponible })}
            selected={selected?.horaInicio === item.horaInicio} onPress={() => onSelect(item)} />
        ))}
      </ScrollView>
      {hasOverflow && arrow(1)}
    </View>
  );
}


function DishRow({ dish, count, onChange }: { dish: MenuDish; count?: number; onChange?: (delta: number) => void }) {
  const { t } = useTranslation();
  const { colors, radii, typography } = useTheme();
  const photo = menuGallery(dish)[0]?.source;
  return (
    <View style={[styles.dish, { borderRadius: radii.l, backgroundColor: colors.superficie.elevada }]}>
      {photo ? <Image source={photo} accessibilityLabel={dish.nombre} style={styles.thumb} /> :
        <View style={[styles.thumb, styles.placeholder, { backgroundColor: colors.marca.primarioSuave }]}>
          <ClipboardList size={21} color={colors.marca.primario} />
        </View>}
      <View style={styles.flex}>
        <Text style={[typography.etiqueta, { color: colors.texto.primario }]}>{dish.nombre}</Text>
        <Text style={[typography.pie, { color: colors.texto.secundario }]}>
          {count ? `${count} × ${formatCop(dish.precio)}` : formatCop(dish.precio)}
        </Text>
        {!onChange && !!count && <Text style={[typography.etiqueta, { color: colors.marca.acento }]}>{formatCop(dish.precio * count)}</Text>}
        {onChange && !!count && <View style={styles.quantity}>
          <Action variant="tertiary" label="−" accessibilityLabel={t('discovery.decrease', { name: dish.nombre })} onPress={() => onChange(-1)} />
          <Action variant="tertiary" label="+" accessibilityLabel={t('discovery.increase', { name: dish.nombre })} onPress={() => onChange(1)} disabled={count >= 99} />
        </View>}
      </View>
      {onChange && !count && <Button variant="tertiary" label={t('discovery.addShort')} onPress={() => onChange(1)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 16, width: '100%', maxWidth: 760, alignSelf: 'center', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  surface: { padding: 12, borderRadius: 18, gap: 10 },
  summary: { padding: 15, gap: 10 },
  chips: { gap: 8, paddingBottom: 8 },
  timeChips: { gap: 8 },
  timeStrip: { flexDirection: 'row', alignItems: 'center' },
  timeViewport: { minHeight: 48 },
  timeArrow: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  hour: { minWidth: 88 },
  stepActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  previousStep: { marginBottom: 0, alignSelf: 'center' },
  footer: { width: '100%', maxWidth: 760, alignSelf: 'center', borderTopWidth: StyleSheet.hairlineWidth, padding: 12, gap: 7 },
  dish: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  thumb: { width: 60, height: 60, borderRadius: 11 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  quantity: { flexDirection: 'row' },
  receiptActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  receiptAction: { flexGrow: 1, flexBasis: 120, paddingHorizontal: 8 },
  receiptRemove: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  proof: { width: '100%', height: 180, borderRadius: 12 },
  payment: { flexGrow: 0, maxHeight: 420 },
});
