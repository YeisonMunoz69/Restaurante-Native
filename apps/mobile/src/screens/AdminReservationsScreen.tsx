import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarDays, ChevronRight, ClipboardCheck, FileCheck2 } from 'lucide-react-native';
import { CalendarDateSchema } from '@encanto/shared';
import { Feedback as Alert } from '../components/feedback/Feedback';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { LightColors } from '../theme/tokens';
import { Action, Field, Note } from '../components/attention/Controls';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { reservationsApi, type ReceiptPreview, type ReservationWithCustomer } from '../services/reservations.service';
import { formatCivilDate, todayInBogota } from '../utils/formatters';
import { BackButton } from '../components/navigation/BackButton';
import { ReservationImagePreview } from '../components/reservations/ReservationReceipt';
import { AgendaReservationDetail } from '../components/reservations/AgendaReservationDetail';
import { ContextHelp, LoadingOverlay } from '../components/feedback/ContextOverlay';

type Tab = 'requests' | 'agenda';

function errorText(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  return typeof message === 'string' ? message : fallback;
}

// Doy al dueño la cola de revisión y al personal la agenda/check-in que permite su rol.
export function AdminReservationsScreen({ onBack }: { onBack?: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { colors, typography } = useTheme();
  const isAdmin = user?.rol === 'ADMIN';
  const isStaff = user?.rol === 'STAFF';
  const [tab, setTab] = useState<Tab>(isAdmin ? 'requests' : 'agenda');
  const [date, setDate] = useState<string | null>(null);
  const [draftDate, setDraftDate] = useState<string | null>(null);
  const [requests, setRequests] = useState<ReservationWithCustomer[]>([]);
  const [agenda, setAgenda] = useState<ReservationWithCustomer[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [selectedAgendaItem, setSelectedAgendaItem] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ id: string; image: ReceiptPreview } | null>(null);
  const [reading, setReading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const showingAgenda = tab === 'agenda';
  const agendaDate = showingAgenda ? date : null;
  const loadSequence = useRef(0);
  const activeLoader = useRef<(() => Promise<void>) | null>(null);
  const readingRef = useRef(false);
  const actionRef = useRef(false);

  const load = useCallback(async () => {
    if (!isAdmin && !isStaff) return;
    const sequence = ++loadSequence.current;
    setLoading(true);
    setError(null);
    try {
      const [nextRequests, nextAgenda] = await Promise.all([
        // Reviso las solicitudes de cualquier fecha. El filtro solo aplica a la agenda.
        isAdmin && !showingAgenda ? reservationsApi.requests() : Promise.resolve([]),
        showingAgenda ? reservationsApi.agenda(agendaDate ?? undefined) : Promise.resolve([]),
      ]);
      // Descarto una respuesta anterior si ya se cambió de vista o fecha.
      if (sequence !== loadSequence.current) return;
      setRequests(nextRequests);
      setAgenda(nextAgenda);
    } catch (cause) {
      if (sequence === loadSequence.current) {
        setError(errorText(cause, t('reservations.adminLoadError')));
      }
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }, [agendaDate, isAdmin, isStaff, showingAgenda, t]);

  useEffect(() => {
    activeLoader.current = load;
    void load();
    return () => {
      activeLoader.current = null;
      loadSequence.current += 1;
    };
  }, [load]);

  useEffect(() => {
    if (!isAdmin || tab !== 'requests') return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [isAdmin, tab]);

  const executeAct = async (id: string, operation: () => Promise<unknown>) => {
    if (actionRef.current) return;
    actionRef.current = true;
    setBusyId(id);
    setError(null);
    try {
      await operation();
      await activeLoader.current?.();
    } catch (cause) {
      await activeLoader.current?.();
      setError(errorText(cause, t('reservations.adminActionError')));
    } finally {
      actionRef.current = false;
      setBusyId(null);
    }
  };

  // Una pulsación abre la confirmación; el cambio solo se envía al aceptar expresamente.
  const act = (id: string, operation: () => Promise<unknown>, label: string) => {
    if (busyId) return;
    const reservation = [...requests, ...agenda].find(item => item.id === id);
    Alert.alert(label, t('reservations.confirmOperation', { code: reservation?.codigo ?? id }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: label, onPress: () => executeAct(id, operation) },
    ]);
  };

  const inspectReceipt = async (id: string) => {
    if (readingRef.current) return;
    readingRef.current = true;
    setReading(true);
    setError(null);
    try {
      const image = await reservationsApi.reviewReceipt(id);
      setPreview({ id, image });
    } catch (cause) {
      setError(errorText(cause, t('reservations.receiptReadError')));
    } finally {
      readingRef.current = false;
      setReading(false);
    }
  };

  const changeAgendaDate = (value: string | null) => {
    if (value !== null && !CalendarDateSchema.safeParse(value).success) {
      setError(t('reservations.invalidAgendaDate'));
      return;
    }
    setSelectedAgendaItem(null);
    setDraftDate(null);
    setError(null);
    setDate(value);
  };

  if (!isAdmin && !isStaff) return <Note>{t('menuAdmin.forbidden')}</Note>;
  const detail = showingAgenda ? agenda.find(item => item.id === selectedAgendaItem) : undefined;
  const today = todayInBogota();
  const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  const EntryIcon = isAdmin ? ClipboardCheck : CalendarDays;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.superficie.fondo }]}>
      <KeyboardAwareScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!!onBack && <BackButton onPress={onBack} />}
        <View style={[styles.hero, { backgroundColor: isAdmin ? colors.admin.encabezado : colors.marca.primarioSuave }]}>
          <EntryIcon size={22} color={isAdmin ? LightColors.texto.inverso : colors.marca.primario} />
          <Text accessibilityRole="header" style={[typography.tituloL, styles.flex, {
            color: isAdmin ? LightColors.texto.inverso : colors.texto.primario,
          }]}>{t(isAdmin ? 'reservations.adminTitle' : 'reservations.staffWorkspace')}</Text>
          <ContextHelp onDark={isAdmin} title={t(isAdmin ? 'reservations.adminTitle' : 'reservations.staffWorkspace')}
            text={t(isAdmin ? 'reservations.adminProofHelp' : 'reservations.staffWorkspaceDescription')} />
        </View>
        {isAdmin && (
          <View style={styles.row}>
            <View style={styles.flex}><Action label={t('reservations.requests')} selected={tab === 'requests'} onPress={() => { setSelectedAgendaItem(null); setTab('requests'); }} /></View>
            <View style={styles.flex}><Action label={t('reservations.agenda')} selected={tab === 'agenda'} onPress={() => setTab('agenda')} /></View>
          </View>
        )}
        {tab === 'agenda' && (
          <View style={styles.section}>
            {date && <Text style={[typography.etiqueta, { color: colors.texto.secundario }]}>{formatCivilDate(date)}</Text>}
            <View style={styles.wrap}>
              <Action label={t('reservations.upcomingAgenda')} selected={date === null} onPress={() => changeAgendaDate(null)} />
              <Action label={t('reservations.todayAgenda')} selected={date === today} onPress={() => changeAgendaDate(today)} />
              <Action label={t('reservations.tomorrowAgenda')} selected={date === tomorrow} onPress={() => changeAgendaDate(tomorrow)} />
              <Action variant="tertiary" label={t('reservations.changeAgendaDate')} onPress={() => setDraftDate(date ?? today)} />
            </View>
            {draftDate !== null && <>
              <Field label={t('reservations.agendaDate')} value={draftDate} onChangeText={setDraftDate} placeholder={t('reservations.datePlaceholder')} />
              <Action label={t('reservations.applyAgendaDate')} onPress={() => changeAgendaDate(draftDate)} />
            </>}
          </View>
        )}
        {error && <Note live tone="error">{error}</Note>}
        {!loading && tab === 'requests' && isAdmin && requests.length === 0 && <Note>{t('reservations.noRequests')}</Note>}
        {!loading && !error && showingAgenda && agenda.length === 0 && (
          <Note>{t(date ? 'reservations.noAgenda' : 'reservations.noUpcomingAgenda')}</Note>
        )}

        {isAdmin && tab === 'requests' && requests.map(reservation => {
          const remaining = reservation.expiraEn ? Date.parse(reservation.expiraEn) - now : Infinity;
          const expanded = selectedRequest === reservation.id;
          const receipt = reservation.comprobante;
          const checked = !!receipt && reviewed[reservation.id] === receipt.id;
          const expires = remaining <= 0;
          return (
          <View key={reservation.id} style={[styles.entry, { backgroundColor: colors.superficie.elevada }]}>
            <Text style={[typography.codigo, { color: colors.marca.primario }]}>{reservation.codigo}</Text>
            <Text style={[typography.tituloM, { color: colors.texto.primario }]}>{reservation.cliente.nombre} · {reservation.horaInicio}–{reservation.horaFin}</Text>
            <Note>{formatCivilDate(reservation.fecha)}</Note>
            <Text style={[typography.pie, { color: colors.texto.secundario }]}>{t('reservations.people', { count: reservation.numComensales })}</Text>
            <View style={styles.status}>
              {!!receipt && <FileCheck2 size={16} color={colors.marca.primario} />}
              <Text style={[typography.etiqueta, { color: receipt ? colors.marca.primario : colors.texto.secundario }]}>
                {t(receipt ? 'reservations.receiptAttached' : 'reservations.receiptMissing')}
              </Text>
            </View>
            {remaining <= 3_600_000 && (
              <Text style={[typography.cuerpoM, { color: colors.texto.primario, fontWeight: '700' }]}>
                {t(remaining > 0 ? 'reservations.expiringSoon' : 'reservations.expirationReached')}
              </Text>
            )}
            <Action variant="tertiary" label={t(expanded ? 'reservations.requestClose' : 'reservations.requestDetail')}
              onPress={() => setSelectedRequest(expanded ? null : reservation.id)} />
            {expanded && <>
              {!!reservation.cliente.telefono && <Note>{reservation.cliente.telefono}</Note>}
              {(reservation.cliente.cancelaciones > 0 || reservation.cliente.inasistencias > 0) && <Note>{t('reservations.previousRecords', { cancellations: reservation.cliente.cancelaciones, noShows: reservation.cliente.inasistencias })}</Note>}
              <Text selectable style={[typography.pie, { color: colors.texto.secundario }]}>{reservation.ticket}</Text>
              {!!receipt && (
                <Action label={t('reservations.receiptReview')} disabled={reading} onPress={() => void inspectReceipt(reservation.id)} />
              )}
              {checked && <Text style={[typography.pie, { color: colors.marca.primario }]}>{t('reservations.receiptReviewed')}</Text>}
              <Action variant="primary" label={t('reservations.approve')} disabled={!checked || !!busyId || expires}
                onPress={() => { if (receipt && checked) act(reservation.id,
                  () => reservationsApi.approve(reservation.id, receipt.id), t('reservations.approve')); }} />
              <Field label={t('reservations.rejectionReason')} value={reasons[reservation.id] ?? ''}
                onChangeText={value => setReasons(current => ({ ...current, [reservation.id]: value }))} maxLength={500} />
              <Action variant="tertiary" tone="danger" label={t('reservations.reject')} disabled={!!busyId || expires || (reasons[reservation.id] ?? '').trim().length < 3}
                onPress={() => act(reservation.id, () => reservationsApi.reject(reservation.id, { motivo: reasons[reservation.id].trim() }), t('reservations.reject'))} />
            </>}
          </View>
          );
        })}

        {showingAgenda && agenda.map((reservation, index) => (
          <React.Fragment key={reservation.id}>
            {!date && agenda[index - 1]?.fecha !== reservation.fecha && (
              <Text accessibilityRole="header" style={[typography.etiqueta, { color: colors.texto.secundario }]}>
                {formatCivilDate(reservation.fecha)}
              </Text>
            )}
            <Pressable testID={`agenda-card-${reservation.id}`} accessibilityRole="button"
              accessibilityHint={t('reservations.viewDetails')} onPress={() => setSelectedAgendaItem(reservation.id)}
              style={({ pressed }) => [styles.agendaEntry, {
                backgroundColor: pressed ? colors.marca.primarioSuave : colors.superficie.elevada,
              }]}>
              <View style={styles.agendaTime}>
                <Text style={[typography.tituloM, { color: colors.marca.primario }]}>{reservation.horaInicio}</Text>
              </View>
              <View style={styles.agendaCopy}>
                <Text style={[typography.cuerpoL, { color: colors.texto.primario }]}>{reservation.cliente.nombre}</Text>
                <Text style={[typography.pie, { color: colors.texto.secundario }]}>
                  {t('reservations.people', { count: reservation.numComensales })} · {t(`reservations.status.${reservation.estado}`)}
                </Text>
              </View>
              <ChevronRight size={20} color={colors.texto.secundario} />
            </Pressable>
          </React.Fragment>
        ))}
        <Action label={t(error ? 'common.retry' : 'reservations.reloadAgenda')} variant="tertiary" disabled={loading} onPress={() => void load()} />
      </KeyboardAwareScrollView>
      <LoadingOverlay visible={(loading || reading || !!busyId) && !preview} />
      {!!detail && (
        <AgendaReservationDetail key={detail.id} reservation={detail} onClose={() => setSelectedAgendaItem(null)}>
          {detail.estado === 'CONFIRMADA' && (
            <Action label={t('reservations.markArrival')} disabled={!!busyId} onPress={() => {
              setSelectedAgendaItem(null);
              act(detail.id, () => reservationsApi.markArrival(detail.id), t('reservations.markArrival'));
            }} />
          )}
          {detail.estado === 'CONFIRMADA' && detail.puedeMarcarInasistencia && (
            <Action variant="tertiary" tone="danger" label={t('reservations.markNoShow')} disabled={!!busyId}
              onPress={() => {
                setSelectedAgendaItem(null);
                act(detail.id, () => reservationsApi.markNoShow(detail.id), t('reservations.markNoShow'));
              }} />
          )}
          {detail.estado === 'EN_CURSO' && (
            <Action label={t('reservations.complete')} disabled={!!busyId} onPress={() => {
              setSelectedAgendaItem(null);
              act(detail.id, () => reservationsApi.complete(detail.id), t('reservations.complete'));
            }} />
          )}
        </AgendaReservationDetail>
      )}
      {isAdmin && !!preview && <ReservationImagePreview image={preview.image} title={t('reservations.receiptReview')}
        onViewed={() => setReviewed(current => ({ ...current, [preview.id]: preview.image.id }))}
        onClose={() => setPreview(null)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, width: '100%', maxWidth: 760, alignSelf: 'center', gap: 12 },
  hero: { borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  entry: { padding: 16, borderRadius: 18, gap: 5 },
  agendaEntry: { padding: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  agendaTime: { gap: 3, minWidth: 52 },
  agendaCopy: { flex: 1, gap: 2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  section: { gap: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
