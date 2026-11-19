import React, { useCallback, useEffect, useRef, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { ActivityIndicator, Share, StyleSheet, Text, View } from 'react-native';
import { Feedback as Alert } from '../components/feedback/Feedback';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { Action, Field, Note, Panel } from '../components/attention/Controls';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { reservationsApi, type ReservationWithCustomer } from '../services/reservations.service';
import { formatCivilDate, todayInBogota } from '../utils/formatters';
import { BackButton } from '../components/navigation/BackButton';

type Tab = 'requests' | 'agenda';

function errorText(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  return typeof message === 'string' ? message : fallback;
}

// Doy al dueño la cola de revisión y al personal la agenda/check-in que permite su rol.
export function AdminReservationsScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { colors, typography } = useTheme();
  const isAdmin = user?.rol === 'ADMIN';
  const isStaff = user?.rol === 'STAFF';
  const [tab, setTab] = useState<Tab>(isAdmin ? 'requests' : 'agenda');
  const [date, setDate] = useState(todayInBogota());
  const [requests, setRequests] = useState<ReservationWithCustomer[]>([]);
  const [agenda, setAgenda] = useState<ReservationWithCustomer[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const agendaDate = tab === 'agenda' ? date : null;
  const loadSequence = useRef(0);
  const activeLoader = useRef<(() => Promise<void>) | null>(null);

  const load = useCallback(async () => {
    if (!isAdmin && !isStaff) return;
    const sequence = ++loadSequence.current;
    setLoading(true);
    setError(null);
    try {
      const [nextRequests, nextAgenda] = await Promise.all([
        // Reviso las solicitudes de cualquier fecha. El filtro solo aplica a la agenda.
        isAdmin && !agendaDate ? reservationsApi.requests() : Promise.resolve([]),
        agendaDate ? reservationsApi.agenda(agendaDate) : Promise.resolve([]),
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
  }, [agendaDate, isAdmin, isStaff, t]);

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
    if (busyId) return;
    setBusyId(id);
    setError(null);
    try {
      await operation();
      await activeLoader.current?.();
    } catch (cause) {
      setError(errorText(cause, t('reservations.adminActionError')));
    } finally {
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

  if (!isAdmin && !isStaff) return <Note>{t('menuAdmin.forbidden')}</Note>;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.superficie.fondo }]}>
      <KeyboardAwareScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BackButton onPress={onBack} />
        <Text style={[typography.display, { color: colors.texto.primario }]}>{t('reservations.adminTitle')}</Text>
        {isAdmin && (
          <View style={styles.row}>
            <View style={styles.flex}><Action label={t('reservations.requests')} selected={tab === 'requests'} onPress={() => setTab('requests')} /></View>
            <View style={styles.flex}><Action label={t('reservations.agenda')} selected={tab === 'agenda'} onPress={() => setTab('agenda')} /></View>
          </View>
        )}
        {tab === 'agenda' && <Field label={t('reservations.agendaDate')} value={date} onChangeText={setDate} placeholder={t('reservations.datePlaceholder')} />}
        {error && <Note live>{error}</Note>}
        {loading && <ActivityIndicator accessibilityLabel={t('common.loading')} color={colors.marca.primario} />}
        {!loading && tab === 'requests' && isAdmin && requests.length === 0 && <Note>{t('reservations.noRequests')}</Note>}
        {!loading && tab === 'agenda' && agenda.length === 0 && <Note>{t('reservations.noAgenda')}</Note>}

        {isAdmin && tab === 'requests' && requests.map(reservation => {
          const remaining = reservation.expiraEn ? Date.parse(reservation.expiraEn) - now : Infinity;
          return (
          <Panel key={reservation.id}>
            <Text style={[typography.codigo, { color: colors.marca.primario }]}>{reservation.codigo}</Text>
            <Text style={[typography.tituloM, { color: colors.texto.primario }]}>{reservation.cliente.nombre} · {reservation.horaInicio}–{reservation.horaFin}</Text>
            <Note>{formatCivilDate(reservation.fecha)}</Note>
            <Note>{reservation.cliente.telefono} · {t('reservations.people', { count: reservation.numComensales })}</Note>
            {remaining <= 3_600_000 && (
              <Text style={[typography.cuerpoM, { color: colors.texto.primario, fontWeight: '700' }]}>
                {t(remaining > 0 ? 'reservations.expiringSoon' : 'reservations.expirationReached')}
              </Text>
            )}
            {(reservation.cliente.cancelaciones > 0 || reservation.cliente.inasistencias > 0) && <Note>{t('reservations.previousRecords', { cancellations: reservation.cliente.cancelaciones, noShows: reservation.cliente.inasistencias })}</Note>}
            <Text selectable style={[typography.pie, { color: colors.texto.secundario }]}>{reservation.ticket}</Text>
            <Action label={t('reservations.approve')} disabled={busyId === reservation.id} onPress={() => act(reservation.id, () => reservationsApi.approve(reservation.id), t('reservations.approve'))} />
            <Field label={t('reservations.rejectionReason')} value={reasons[reservation.id] ?? ''} onChangeText={value => setReasons(current => ({ ...current, [reservation.id]: value }))} maxLength={500} />
            <Action label={t('reservations.reject')} disabled={busyId === reservation.id || (reasons[reservation.id] ?? '').trim().length < 3} onPress={() => act(reservation.id, () => reservationsApi.reject(reservation.id, { motivo: reasons[reservation.id].trim() }), t('reservations.reject'))} />
            <Action label={t('reservations.copyTicket')} onPress={() => {
              Clipboard.setString(reservation.ticket);
              Alert.alert(t('reservations.ticketCopied'), undefined, [], { kind: 'success' });
            }} />
            <Action label={t('reservations.shareTicket')} onPress={() => Share.share({ message: reservation.ticket })} />
          </Panel>
          );
        })}

        {tab === 'agenda' && agenda.map(reservation => (
          <Panel key={reservation.id}>
            <Text style={[typography.codigo, { color: colors.marca.primario }]}>{reservation.horaInicio} · {reservation.codigo}</Text>
            <Text style={[typography.tituloM, { color: colors.texto.primario }]}>{reservation.cliente.nombre}</Text>
            <Note>{reservation.cliente.telefono} · {t('reservations.people', { count: reservation.numComensales })} · {t(`reservations.status.${reservation.estado}`)}</Note>
            {(reservation.cliente.cancelaciones > 0 || reservation.cliente.inasistencias > 0) && <Note>{t('reservations.previousRecords', { cancellations: reservation.cliente.cancelaciones, noShows: reservation.cliente.inasistencias })}</Note>}
            <Text selectable style={[typography.pie, { color: colors.texto.secundario }]}>{reservation.ticket}</Text>
            {reservation.estado === 'CONFIRMADA' && <Action label={t('reservations.markArrival')} disabled={busyId === reservation.id} onPress={() => act(reservation.id, () => reservationsApi.markArrival(reservation.id), t('reservations.markArrival'))} />}
            {reservation.estado === 'CONFIRMADA' && reservation.puedeMarcarInasistencia && <Action label={t('reservations.markNoShow')} disabled={busyId === reservation.id} onPress={() => act(reservation.id, () => reservationsApi.markNoShow(reservation.id), t('reservations.markNoShow'))} />}
            {reservation.estado === 'EN_CURSO' && <Action label={t('reservations.complete')} disabled={busyId === reservation.id} onPress={() => act(reservation.id, () => reservationsApi.complete(reservation.id), t('reservations.complete'))} />}
            <Action label={t('reservations.copyTicket')} onPress={() => {
              Clipboard.setString(reservation.ticket);
              Alert.alert(t('reservations.ticketCopied'), undefined, [], { kind: 'success' });
            }} />
            <Action label={t('reservations.shareTicket')} onPress={() => Share.share({ message: reservation.ticket })} />
          </Panel>
        ))}
        <Action label={t('common.retry')} disabled={loading} onPress={() => void load()} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, width: '100%', maxWidth: 760, alignSelf: 'center' },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
