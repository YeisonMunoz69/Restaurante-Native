import React, { useCallback, useEffect, useRef, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  ActivityIndicator,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import type { ReservationResult } from '@encanto/shared';
import { useTranslation } from 'react-i18next';
import { CalendarCheck } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { Action, Note, Panel } from '../components/attention/Controls';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { reservationsApi } from '../services/reservations.service';
import { Feedback as Alert } from '../components/feedback/Feedback';
import { ReservationCreateScreen } from './ReservationCreateScreen';
import { formatCop, formatDateDdMmYyyy } from '../utils/formatters';

type ReservationTab = 'upcoming' | 'history';
const upcomingStates = new Set(['SOLICITADA', 'CONFIRMADA', 'EN_CURSO']);

function requestMessage(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  return typeof message === 'string' ? message : fallback;
}

// Muestro el historial del usuario; el servidor vuelve a validar cada cancelación antes de guardarla.
export const ReservationsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { colors, typography, spacing } = useTheme();
  const { width } = useWindowDimensions();
  const [items, setItems] = useState<ReservationResult[]>([]);
  const [details, setDetails] = useState<Record<string, ReservationResult>>({});
  const [detailOpenId, setDetailOpenId] = useState<string | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [detailErrorId, setDetailErrorId] = useState<string | null>(null);
  const [tab, setTab] = useState<ReservationTab>('upcoming');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const [clock, setClock] = useState(Date.now());

  // Quito datos de la sesión anterior e invalido respuestas pendientes al cambiar de cuenta.
  useEffect(() => {
    requestVersion.current += 1;
    setItems([]);
    setDetails({});
    setDetailOpenId(null);
    setDetailErrorId(null);
    return () => { requestVersion.current += 1; };
  }, [user?.id]);

  useEffect(() => {
    if (!isFocused) return;
    setClock(Date.now());
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isFocused]);

  const load = useCallback(async () => {
    if (!user) return;
    const version = requestVersion.current;
    setLoading(true);
    setError(null);
    try {
      const next = await reservationsApi.mine();
      if (version !== requestVersion.current) return;
      setItems(next);
      setDetails({});
    } catch (cause) {
      if (version === requestVersion.current) setError(requestMessage(cause, t('reservations.loadError')));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [user, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const cancel = (reservation: ReservationResult) => {
    Alert.alert(t('reservations.cancelTitle'), t('reservations.cancelConfirm'), [
      { text: t('common.close'), style: 'cancel' },
      {
        text: t('reservations.cancelAction'),
        style: 'destructive',
        onPress: async () => {
          const version = requestVersion.current;
          try {
            setError(null);
            await reservationsApi.cancel(reservation.id);
            if (version !== requestVersion.current) return;
            await load();
          } catch (cause) {
            if (version !== requestVersion.current) return;
            setError(requestMessage(cause, t('reservations.cancelError')));
            // Recargo después de un conflicto para mostrar el estado más reciente del servidor.
            try {
              const next = await reservationsApi.mine();
              if (version === requestVersion.current) setItems(next);
            } catch {
              // Conservo el error de cancelación si tampoco hay conexión para recargar.
            }
          }
        },
      },
    ]);
  };

  const toggleDetails = async (id: string) => {
    const version = requestVersion.current;
    if (detailOpenId === id && detailErrorId !== id) {
      setDetailOpenId(null);
      return;
    }
    setDetailOpenId(id);
    setDetailLoadingId(id);
    setDetailErrorId(null);
    try {
      const detail = await reservationsApi.detail(id);
      if (version !== requestVersion.current) return;
      setDetails(current => ({ ...current, [id]: detail }));
      // La respuesta de detalle puede reflejar una aprobación o rechazo posterior a la lista.
      setItems(current => current.map(item => item.id === id ? detail : item));
    } catch {
      if (version === requestVersion.current) setDetailErrorId(id);
    } finally {
      if (version === requestVersion.current) setDetailLoadingId(null);
    }
  };

  const visible = items.filter(item =>
    tab === 'upcoming'
      ? upcomingStates.has(item.estado)
      : !upcomingStates.has(item.estado),
  );
  const ordered = [...visible].sort((left, right) => {
    if (tab === 'upcoming') {
      const pendingFirst = Number(right.estado === 'SOLICITADA') - Number(left.estado === 'SOLICITADA');
      if (pendingFirst) return pendingFirst;
      return `${left.fecha}T${left.horaInicio}`.localeCompare(`${right.fecha}T${right.horaInicio}`);
    }
    return `${right.fecha}T${right.horaInicio}`.localeCompare(`${left.fecha}T${left.horaInicio}`);
  });

  if (creating) {
    return (
      <ReservationCreateScreen
        onBack={() => setCreating(false)}
        isAuthenticated={Boolean(user)}
        isActive={isFocused}
        onRequireLogin={() => navigation.navigate('Settings', { returnTo: 'Reservations' })}
        onCreated={async () => {
          setCreating(false);
          setTab('upcoming');
          await load();
        }}
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.superficie.fondo }]}>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: spacing.margenLateral, paddingTop: spacing.l }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[typography.display, width < 360 ? styles.compactTitle : null, width >= 600 ? styles.wideTitle : null, { color: colors.texto.primario }]}>
          {t('reservations.title')}
        </Text>
        <Text style={[typography.cuerpoM, { color: colors.texto.secundario, marginTop: spacing.xs }]}>
          {t('reservations.subtitle')}
        </Text>

        {authLoading ? (
          <ActivityIndicator accessibilityLabel={t('common.loading')} color={colors.marca.primario} />
        ) : !user ? (
          <Panel>
            <CalendarCheck size={40} color={colors.marca.primario} />
            <Text style={[typography.tituloM, { color: colors.texto.primario, marginTop: spacing.m }]}>{t('reservations.loginRequired')}</Text>
            <Note>{t('reservations.loginDescription')}</Note>
            <Action testID="reservation-new" label={t('reservations.btnNewReservation')} onPress={() => setCreating(true)} />
            <Action label={t('reservations.openSettings')} onPress={() => navigation.navigate('Settings')} />
          </Panel>
        ) : (
          <>
            <Action
              testID="reservation-new"
              label={t('reservations.btnNewReservation')}
              onPress={() => setCreating(true)}
            />
            <View style={styles.row}>
              <View style={styles.flex}><Action label={t('reservations.tabUpcoming')} selected={tab === 'upcoming'} onPress={() => setTab('upcoming')} /></View>
              <View style={styles.flex}><Action label={t('reservations.tabHistory')} selected={tab === 'history'} onPress={() => setTab('history')} /></View>
            </View>
            {error && <Note live tone="error">{error}</Note>}
            {loading && <ActivityIndicator accessibilityLabel={t('common.loading')} color={colors.marca.primario} />}
            {!loading && ordered.length === 0 ? (
              <Panel>
                <CalendarCheck size={40} color={colors.texto.secundario} />
                <Text style={[typography.tituloM, { color: colors.texto.primario, marginTop: spacing.m, textAlign: 'center' }]}>
                  {t(tab === 'upcoming' ? 'reservations.emptyUpcoming' : 'reservations.emptyHistory')}
                </Text>
              </Panel>
            ) : ordered.map(reservation => {
              const detail = details[reservation.id] ?? reservation;
              const minutesRemaining = minutesUntilReservation(reservation, clock);
              const cancellationTooLate = reservation.estado === 'CONFIRMADA' && minutesRemaining < 60;
              return (
              <Panel key={reservation.id}>
                <Text style={[typography.codigo, { color: colors.marca.primario }]}>{reservation.codigo}</Text>
                <Text style={[typography.tituloM, { color: colors.texto.primario }]}>{formatDateDdMmYyyy(reservation.fecha)} · {reservation.horaInicio}–{reservation.horaFin}</Text>
                <Note>{t('reservations.people', { count: reservation.numComensales })} · {t(`reservations.status.${reservation.estado}`)}</Note>
                <Note>{t('reservations.total')}: {formatCop(reservation.total)}</Note>
                {reservation.motivoRechazo && <Note>{t('reservations.rejectionReason')}: {reservation.motivoRechazo}</Note>}
                {detailOpenId === reservation.id && (
                  <>
                    {detailLoadingId === reservation.id ? (
                      <ActivityIndicator accessibilityLabel={t('common.loading')} color={colors.marca.primario} />
                    ) : detailErrorId === reservation.id ? (
                      <Note live>{t('reservations.detailError')}</Note>
                    ) : (
                      <>
                        {detail.lineas.length ? detail.lineas.map(line => (
                          <Note key={line.platoId}>{t('reservations.orderLine', { quantity: line.cantidad, name: line.nombre })} · {formatCop(line.subtotal)}</Note>
                        )) : <Note>{t('reservations.noOrder')}</Note>}
                        {detail.nota && <Note>{t('reservations.note')}: {detail.nota}</Note>}
                      </>
                    )}
                  </>
                )}
                <Action
                  label={detailErrorId === reservation.id ? t('reservations.retryDetails') : detailOpenId === reservation.id ? t('reservations.hideDetails') : t('reservations.viewDetails')}
                  disabled={detailLoadingId === reservation.id}
                  onPress={() => void toggleDetails(reservation.id)}
                />
                {reservation.estado === 'SOLICITADA' || reservation.estado === 'CONFIRMADA' ? (
                  <>
                    {cancellationTooLate && <Note>{t('reservations.cancelTooLate')}</Note>}
                    <Action label={t('reservations.cancelAction')} disabled={cancellationTooLate} onPress={() => cancel(reservation)} />
                  </>
                ) : null}
                <Action label={t('reservations.copyTicket')} onPress={() => {
                  Clipboard.setString(reservation.ticket);
                  Alert.alert(t('reservations.ticketCopied'), undefined, [], { kind: 'success' });
                }} />
                <Action label={t('reservations.shareTicket')} onPress={() => Share.share({ message: reservation.ticket })} />
              </Panel>
              );
            })}
            <Action label={t('common.retry')} onPress={() => void load()} disabled={loading} />
          </>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 24, paddingBottom: 40, width: '100%', maxWidth: 760, alignSelf: 'center' },
  compactTitle: { fontSize: 26, lineHeight: 32 },
  wideTitle: { fontSize: 32, lineHeight: 40 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  flex: { flex: 1 },
});

function minutesUntilReservation(reservation: ReservationResult, now: number) {
  const start = Date.parse(`${reservation.fecha}T${reservation.horaInicio}:00-05:00`);
  return (start - now) / 60_000;
}
