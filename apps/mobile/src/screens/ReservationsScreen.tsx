import React, { useCallback, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  ActivityIndicator,
  Alert,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { ReservationResult } from '@encanto/shared';
import { useTranslation } from 'react-i18next';
import { CalendarCheck } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { Action, Note, Panel } from '../components/attention/Controls';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { reservationsApi } from '../services/reservations.service';
import { ReservationCreateScreen } from './ReservationCreateScreen';

type ReservationTab = 'upcoming' | 'history';
const upcomingStates = new Set(['SOLICITADA', 'CONFIRMADA', 'EN_CURSO']);

function price(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

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
  const { colors, typography, spacing } = useTheme();
  const { width } = useWindowDimensions();
  const [items, setItems] = useState<ReservationResult[]>([]);
  const [tab, setTab] = useState<ReservationTab>('upcoming');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setItems(await reservationsApi.mine());
    } catch (cause) {
      setError(requestMessage(cause, t('reservations.loadError')));
    } finally {
      setLoading(false);
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
          try {
            setError(null);
            await reservationsApi.cancel(reservation.id);
            await load();
          } catch (cause) {
            setError(requestMessage(cause, t('reservations.cancelError')));
          }
        },
      },
    ]);
  };

  const visible = items.filter(item =>
    tab === 'upcoming'
      ? upcomingStates.has(item.estado)
      : !upcomingStates.has(item.estado),
  );

  if (creating) {
    return (
      <ReservationCreateScreen
        onBack={() => setCreating(false)}
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
        contentContainerStyle={[styles.content, { padding: spacing.margenLateral }]}
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
            {error && <Note live>{error}</Note>}
            {loading && <ActivityIndicator accessibilityLabel={t('common.loading')} color={colors.marca.primario} />}
            {!loading && visible.length === 0 ? (
              <Panel>
                <CalendarCheck size={40} color={colors.texto.secundario} />
                <Text style={[typography.tituloM, { color: colors.texto.primario, marginTop: spacing.m, textAlign: 'center' }]}>
                  {t(tab === 'upcoming' ? 'reservations.emptyUpcoming' : 'reservations.emptyHistory')}
                </Text>
              </Panel>
            ) : visible.map(reservation => (
              <Panel key={reservation.id}>
                <Text style={[typography.codigo, { color: colors.marca.primario }]}>{reservation.codigo}</Text>
                <Text style={[typography.tituloM, { color: colors.texto.primario }]}>{formatReservationDate(reservation.fecha)} · {reservation.horaInicio}–{reservation.horaFin}</Text>
                <Note>{t('reservations.people', { count: reservation.numComensales })} · {t(`reservations.status.${reservation.estado}`)}</Note>
                <Note>{t('reservations.total')}: {price(reservation.total)}</Note>
                {reservation.motivoRechazo && <Note>{t('reservations.rejectionReason')}: {reservation.motivoRechazo}</Note>}
                <Text selectable style={[typography.pie, { color: colors.texto.secundario }]}>{reservation.ticket}</Text>
                {reservation.estado === 'SOLICITADA' || reservation.estado === 'CONFIRMADA' ? (
                  <Action label={t('reservations.cancelAction')} onPress={() => cancel(reservation)} />
                ) : null}
                <Action label={t('reservations.copyTicket')} onPress={() => {
                  Clipboard.setString(reservation.ticket);
                  Alert.alert(t('reservations.ticketCopied'));
                }} />
                <Action label={t('reservations.shareTicket')} onPress={() => Share.share({ message: reservation.ticket })} />
              </Panel>
            ))}
            <Action label={t('common.retry')} onPress={() => void load()} disabled={loading} />
          </>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

function formatReservationDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 24, paddingBottom: 40, width: '100%', maxWidth: 760, alignSelf: 'center' },
  compactTitle: { fontSize: 26, lineHeight: 32 },
  wideTitle: { fontSize: 32, lineHeight: 40 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  flex: { flex: 1 },
});
