import React, { useCallback, useEffect, useState } from 'react';
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
import { todayInBogota } from '../utils/formatters';

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

  const load = useCallback(async () => {
    if (!isAdmin && !isStaff) return;
    setLoading(true);
    setError(null);
    try {
      const [nextRequests, nextAgenda] = await Promise.all([
        isAdmin ? reservationsApi.requests({ fecha: date }) : Promise.resolve([]),
        reservationsApi.agenda(date),
      ]);
      setRequests(nextRequests);
      setAgenda(nextAgenda);
    } catch (cause) {
      setError(errorText(cause, t('reservations.adminLoadError')));
    } finally {
      setLoading(false);
    }
  }, [date, isAdmin, isStaff, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const executeAct = async (id: string, operation: () => Promise<unknown>) => {
    if (busyId) return;
    setBusyId(id);
    setError(null);
    try {
      await operation();
      await load();
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
        <Action label={t('common.back')} onPress={onBack} />
        <Text style={[typography.display, { color: colors.texto.primario }]}>{t('reservations.adminTitle')}</Text>
        <Field label={t('reservations.agendaDate')} value={date} onChangeText={setDate} placeholder={t('reservations.datePlaceholder')} />
        {isAdmin && (
          <View style={styles.row}>
            <View style={styles.flex}><Action label={t('reservations.requests')} selected={tab === 'requests'} onPress={() => setTab('requests')} /></View>
            <View style={styles.flex}><Action label={t('reservations.agenda')} selected={tab === 'agenda'} onPress={() => setTab('agenda')} /></View>
          </View>
        )}
        {error && <Note live>{error}</Note>}
        {loading && <ActivityIndicator accessibilityLabel={t('common.loading')} color={colors.marca.primario} />}
        {!loading && tab === 'requests' && isAdmin && requests.length === 0 && <Note>{t('reservations.noRequests')}</Note>}
        {!loading && tab === 'agenda' && agenda.length === 0 && <Note>{t('reservations.noAgenda')}</Note>}

        {tab === 'requests' && requests.map(reservation => (
          <Panel key={reservation.id}>
            <Text style={[typography.codigo, { color: colors.marca.primario }]}>{reservation.codigo}</Text>
            <Text style={[typography.tituloM, { color: colors.texto.primario }]}>{reservation.cliente.nombre} · {reservation.horaInicio}–{reservation.horaFin}</Text>
            <Note>{reservation.cliente.telefono} · {t('reservations.people', { count: reservation.numComensales })}</Note>
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
        ))}

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
