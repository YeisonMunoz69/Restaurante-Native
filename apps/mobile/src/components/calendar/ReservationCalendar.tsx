import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { CalendarDayResult } from '@encanto/shared';
import { attentionApi } from '../../services/attention.service';
import { useTheme } from '../../theme/ThemeContext';
import { Action, Note } from '../attention/Controls';
import { formatCivilDate } from '../../utils/formatters';

const dateKey = (date: Date) => date.toISOString().slice(0, 10);
// Dibujo seis semanas completas y mantengo las fechas civiles fuera de la zona local.
export function monthDates(month: string) {
  const start = new Date(`${month}-01T00:00:00Z`);
  start.setUTCDate(1 - ((start.getUTCDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) =>
    dateKey(new Date(start.getTime() + i * 86400000)),
  );
}
export function ReservationCalendar({
  restauranteId,
  value,
  min,
  max,
  onChange,
  onAvailability,
}: {
  restauranteId: string;
  value: string;
  min: string;
  max: string;
  onChange: (date: string) => void;
  onAvailability: (available: boolean) => void;
}) {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const [month, setMonth] = useState(value.slice(0, 7));
  const [days, setDays] = useState<CalendarDayResult[]>([]);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  const dates = useMemo(() => monthDates(month), [month]);
  useEffect(() => {
    let live = true;
    setBusy(true);
    setError(false);
    setDays([]);
    setPhone('');
    onAvailability(false);
    attentionApi
      .range(restauranteId, dates[0], dates[41])
      .then(result => {
        if (live) {
          setDays(result.dias);
          setPhone(result.whatsapp ?? '');
        }
      })
      .catch(() => {
        if (live) setError(true);
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [restauranteId, dates, retry, onAvailability]);
  const day = days.find(item => item.fecha === value);
  const reservable = (item?: CalendarDayResult) =>
    !!item?.abierto &&
    (item.servicios ?? ['RESTAURANTE']).includes('RESTAURANTE');
  useEffect(() => {
    onAvailability(
      !busy && !error && value >= min && value <= max && reservable(day),
    );
  }, [day, busy, error, value, min, max, onAvailability]);
  const move = (delta: number) => {
    const date = new Date(`${month}-01T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + delta);
    setMonth(dateKey(date).slice(0, 7));
  };
  return (
    <View>
      <View style={styles.heading}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('discovery.previousMonth')}
          disabled={month <= min.slice(0, 7)}
          onPress={() => move(-1)}
          style={styles.arrow}
        >
          <ChevronLeft color={colors.marca.primario} size={24} />
        </Pressable>
        <Text
          accessibilityRole="header"
          style={[
            typography.tituloM,
            styles.month,
            { color: colors.texto.primario },
          ]}
        >
          {new Intl.DateTimeFormat('es-CO', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          }).format(new Date(`${month}-01T00:00:00Z`))}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('discovery.nextMonth')}
          disabled={month >= max.slice(0, 7)}
          onPress={() => move(1)}
          style={styles.arrow}
        >
          <ChevronRight color={colors.marca.primario} size={24} />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {Array.from({ length: 7 }, (_, i) => (
          <Text
            key={i}
            style={[styles.weekday, { color: colors.texto.secundario }]}
          >
            {t(`discovery.weekdays.${i}`)}
          </Text>
        ))}
      </View>
      {busy ? (
        <ActivityIndicator accessibilityLabel={t('common.loading')} />
      ) : error ? (
        <>
          <Note live tone="error">
            {t('discovery.calendarError')}
          </Note>
          <Action
            label={t('common.retry')}
            onPress={() => setRetry(n => n + 1)}
          />
        </>
      ) : (
        <View style={styles.grid}>
          {dates.map(date => {
            const item = days.find(entry => entry.fecha === date),
              outside = !date.startsWith(month),
              disabled = outside || date < min || date > max;
            const selected = date === value;
            return (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityLabel={`${formatCivilDate(date)}. ${t(item?.abierto ? 'discovery.open' : 'discovery.closed')}. ${(item?.servicios ?? []).map(service => t(`discovery.service_${service}`)).join(', ')}`}
                accessibilityState={{ disabled, selected }}
                disabled={disabled}
                testID={`calendar-date-${date}`}
                onPress={() => onChange(date)}
                style={[
                  styles.cell,
                  {
                    backgroundColor: selected
                      ? colors.marca.primarioSuave
                      : 'transparent',
                    opacity: disabled ? 0.3 : 1,
                    borderColor: selected
                      ? colors.marca.primario
                      : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    typography.cuerpoL,
                    {
                      color: item?.abierto
                        ? colors.texto.primario
                        : colors.texto.secundario,
                    },
                  ]}
                >
                  {Number(date.slice(8))}
                </Text>
                <View style={styles.dots}>
                  {(item?.servicios ?? []).map(service => (
                    <View
                      key={service}
                      style={[
                        styles.dot,
                        {
                          backgroundColor:
                            service === 'RESTAURANTE'
                              ? colors.marca.primario
                              : service === 'PESCA'
                                ? colors.marca.acento
                                : colors.estado.atencion,
                        },
                      ]}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
      <Note>{t('discovery.calendarLegend')}</Note>
      {day && !busy && (
        <>
          <Text style={[typography.tituloM, { color: colors.texto.primario }]}>
            {formatCivilDate(value)}
          </Text>
          <Note>
            {(day.servicios ?? [])
              .map(service => t(`discovery.service_${service}`))
              .join(' · ') || t('discovery.closed')}
          </Note>
          <Note>
            {day.horarios
              .map(hours => `${hours.horaApertura}–${hours.horaCierre}`)
              .join(' · ')}
          </Note>
          {!!day.motivo && <Note>{day.motivo}</Note>}
          {!reservable(day) && (
            <>
              <Note>{t('discovery.noRestaurant')}</Note>
              {/^[+][1-9][0-9]{9,14}$/.test(phone) ? (
                <Action
                  label={t('discovery.contact')}
                  onPress={() => {
                    Linking.openURL(
                      `https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(t('discovery.contactMessage', { date: formatCivilDate(value) }))}`,
                    ).catch(() => setError(true));
                  }}
                />
              ) : (
                <Note>{t('discovery.noContact')}</Note>
              )}
            </>
          )}
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  month: { flex: 1, textAlign: 'center', textTransform: 'capitalize' },
  arrow: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: {
    width: '14.2857%',
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 13,
  },
  cell: {
    width: '14.2857%',
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  dots: { flexDirection: 'row', gap: 3, height: 7, marginTop: 3 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
