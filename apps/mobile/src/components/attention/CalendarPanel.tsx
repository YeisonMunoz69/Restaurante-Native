import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  CalendarDateSchema,
  CalendarExceptionInputSchema,
  CalendarRulesInputSchema,
  type CalendarClosureWarning,
  type CalendarDayResult,
  type CalendarExceptionInput,
  type CalendarRuleInput,
} from '@encanto/shared';
import {
  attentionApi,
  attentionError,
  closureWarning,
  type AdminException,
  type AdminRule,
} from '../../services/attention.service';
import { Action, Field, Note, Panel } from './Controls';
import { useTheme } from '../../theme/ThemeContext';

// Tomo la fecha comercial por componentes para evitar cambiarla por el huso del teléfono.
export const commercialToday = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  return ['year', 'month', 'day']
    .map(type => parts.find(part => part.type === type)!.value)
    .join('-');
};
type Pending = {
  warning: CalendarClosureWarning;
  execute: (count?: number) => Promise<unknown>;
};
export function CalendarPanel({ restauranteId }: { restauranteId: string }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [weekday, setWeekday] = useState(0);
  const [allRules, setAllRules] = useState<AdminRule[]>([]);
  const [rules, setRules] = useState<CalendarRuleInput[]>([]);
  const [fecha, setFecha] = useState(commercialToday);
  const [loadedDate, setLoadedDate] = useState('');
  const [day, setDay] = useState<CalendarDayResult | null>(null);
  const [exception, setException] = useState<AdminException | null>(null);
  const [form, setForm] = useState<CalendarExceptionInput>({
    abierto: true,
    horaApertura: '10:00',
    horaCierre: '18:00',
    soloPorReserva: false,
    motivo: '',
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const [ready, setReady] = useState(false);
  // Muestro errores también como diálogo para que se vean desde cualquier parte del formulario.
  const showError = (error: unknown) => {
    const text = t(`attention.${attentionError(error)}`);
    setMessage(text);
    Alert.alert(t('attention.errorTitle'), text);
  };
  // Recargo del servidor para recuperar también los IDs recién creados.
  const load = async () => {
    CalendarDateSchema.parse(fecha);
    const [rs, effective, saved] = await Promise.all([
      attentionApi.rules(restauranteId),
      attentionApi.day(restauranteId, fecha),
      attentionApi.exception(restauranteId, fecha),
    ]);
    setAllRules(rs);
    setRules(
      rs
        .filter(rule => rule.diaSemana === weekday)
        .map(({ diaSemana: _weekday, ...rule }) => rule),
    );
    setDay(effective);
    setException(saved);
    setLoadedDate(fecha);
    setReady(true);
    setForm(
      saved
        ? {
            abierto: saved.abierto,
            horaApertura: saved.horaApertura,
            horaCierre: saved.horaCierre,
            soloPorReserva: saved.soloPorReserva,
            motivo: saved.motivo,
          }
        : {
            abierto: true,
            horaApertura: '10:00',
            horaCierre: '18:00',
            soloPorReserva: false,
            motivo: '',
          },
    );
  };
  const run = async (operation: () => Promise<unknown>, success = false) => {
    setBusy(true);
    setMessage('');
    try {
      await operation();
      if (success) {
        await load();
        setMessage(t('attention.saved'));
      }
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    run(
      load,
    ); /* La sede monta un panel nuevo; el resto se recarga explícitamente. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restauranteId]);
  // Congelo la operación advertida y bloqueo su edición hasta confirmar o cancelar.
  const write = async (execute: Pending['execute'], count?: number) => {
    setBusy(true);
    setMessage('');
    setPending(null);
    try {
      await execute(count);
      await load();
      setMessage(t('attention.saved'));
    } catch (error) {
      const warning = closureWarning(error);
      if (warning) setPending({ warning, execute });
      else showError(error);
    } finally {
      setBusy(false);
    }
  };
  const locked = busy || !!pending;
  const updateRule = (index: number, patch: Partial<CalendarRuleInput>) =>
    setRules(
      rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
    );
  return (
    <View>
      <Note>{t('attention.calendarIntro')}</Note>
      <Action
        label={t('attention.reload')}
        disabled={locked}
        onPress={() => {
          run(load);
        }}
      />
      {!!message && <Note live>{message}</Note>}
      <Modal
        visible={!!pending}
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setPending(null);
        }}
      >
        {pending && (
          <ScrollView
            style={{ backgroundColor: colors.superficie.fondo }}
            contentContainerStyle={[
              styles.confirmation,
              {
                paddingTop: insets.top + 16,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <Panel>
              <Note live>
                {t('attention.closureWarning', {
                  count: pending.warning.reservasAfectadas,
                })}
              </Note>
              <Note>
                {pending.warning.fechas
                  .map(item => `${item.fecha}: ${item.cantidad}`)
                  .join('\n')}
              </Note>
              <Note>{t('attention.noCancellation')}</Note>
              <Action
                testID="calendar-confirm"
                label={t('attention.confirmClosure')}
                disabled={busy}
                onPress={() => {
                  write(
                    pending.execute,
                    pending.warning.reservasAfectadas,
                  );
                }}
              />
              <Action
                testID="calendar-cancel"
                label={t('attention.cancel')}
                disabled={busy}
                onPress={() => setPending(null)}
              />
            </Panel>
          </ScrollView>
        )}
      </Modal>
      <Panel>
        <Note>{t('attention.weeklyRules')}</Note>
        <View style={styles.weekdays}>
          {Array.from({ length: 7 }, (_, value) => (
            <View key={value} style={styles.weekday}>
              <Action
                key={value}
                label={t(`attention.weekday${value}`)}
                selected={weekday === value}
                disabled={locked}
                onPress={() => {
                  setWeekday(value);
                  setRules(
                    allRules
                      .filter(rule => rule.diaSemana === value)
                      .map(({ diaSemana: _weekday, ...rule }) => rule),
                  );
                  setMessage('');
                }}
              />
            </View>
          ))}
        </View>
        {rules.map((rule, index) => (
          <Panel key={rule.id ?? `new-${index}`}>
            <Note>{t('attention.ruleNumber', { count: index + 1 })}</Note>
            <Field
              label={t('attention.opens')}
              value={rule.horaApertura}
              editable={!locked}
              onChangeText={horaApertura => updateRule(index, { horaApertura })}
            />
            <Field
              label={t('attention.closes')}
              value={rule.horaCierre}
              editable={!locked}
              onChangeText={horaCierre => updateRule(index, { horaCierre })}
            />
            <Note>{t('attention.open')}</Note>
            <Switch
              accessibilityLabel={t('attention.open')}
              disabled={locked}
              value={rule.abierto}
              onValueChange={abierto => updateRule(index, { abierto })}
            />
            <Note>{t('attention.active')}</Note>
            <Switch
              accessibilityLabel={t('attention.active')}
              disabled={locked}
              value={rule.activo}
              onValueChange={activo => updateRule(index, { activo })}
            />
            <Action
              label={t('attention.removeRule')}
              disabled={locked}
              onPress={() => setRules(rules.filter((_, i) => i !== index))}
            />
          </Panel>
        ))}
        {!rules.length && <Note>{t('attention.noRules')}</Note>}
        <Action
          label={t('attention.addRule')}
          disabled={locked || !ready || rules.length >= 48}
          onPress={() =>
            setRules([
              ...rules,
              {
                horaApertura: '10:00',
                horaCierre: '18:00',
                abierto: true,
                activo: true,
              },
            ])
          }
        />
        <Action
          testID="calendar-save-rules"
          label={t('attention.saveRules')}
          disabled={locked || !ready}
          onPress={() => {
            try {
              const body = CalendarRulesInputSchema.parse({ reglas: rules });
              write(count =>
                attentionApi.rulesSave(restauranteId, weekday, {
                  ...body,
                  ...(count === undefined
                    ? {}
                    : { confirmarReservasAfectadas: count }),
                }),
              );
            } catch (error) {
              showError(error);
            }
          }}
        />
      </Panel>
      <Panel>
        <Note>{t('attention.exceptionTitle')}</Note>
        <Field
          label={t('attention.date')}
          value={fecha}
          editable={!locked}
          onChangeText={value => {
            setFecha(value);
            setDay(null);
            setLoadedDate('');
          }}
        />
        <Action
          label={t('attention.loadDate')}
          disabled={locked}
          onPress={() => {
            run(load);
          }}
        />
        {fecha === loadedDate && (
          <>
            {day && (
              <Note>
                {t(`attention.origin${day.origen}`)} ·{' '}
                {t(day.abierto ? 'attention.open' : 'attention.closed')}
                {day.soloPorReserva
                  ? ` · ${t('attention.reservationOnly')}`
                  : ''}
                {day.horarios
                  .map(hours => `\n${hours.horaApertura}–${hours.horaCierre}`)
                  .join('')}
              </Note>
            )}
            <Note>
              {t(
                exception
                  ? 'attention.savedException'
                  : 'attention.noException',
              )}
            </Note>
            <Note>{t('attention.open')}</Note>
            <Switch
              accessibilityLabel={t('attention.exceptionOpen')}
              disabled={locked}
              value={form.abierto}
              onValueChange={abierto =>
                setForm({
                  ...form,
                  abierto,
                  horaApertura: abierto ? '10:00' : null,
                  horaCierre: abierto ? '18:00' : null,
                  soloPorReserva: false,
                })
              }
            />
            {form.abierto && (
              <>
                <Field
                  label={t('attention.exceptionOpens')}
                  value={form.horaApertura ?? ''}
                  editable={!locked}
                  onChangeText={horaApertura =>
                    setForm({ ...form, horaApertura })
                  }
                />
                <Field
                  label={t('attention.exceptionCloses')}
                  value={form.horaCierre ?? ''}
                  editable={!locked}
                  onChangeText={horaCierre => setForm({ ...form, horaCierre })}
                />
                <Note>{t('attention.reservationOnly')}</Note>
                <Switch
                  accessibilityLabel={t('attention.reservationOnly')}
                  disabled={locked}
                  value={form.soloPorReserva}
                  onValueChange={soloPorReserva =>
                    setForm({ ...form, soloPorReserva })
                  }
                />
              </>
            )}
            <Field
              label={t('attention.reason')}
              value={form.motivo ?? ''}
              maxLength={500}
              editable={!locked}
              onChangeText={motivo => setForm({ ...form, motivo })}
            />
            <Action
              testID="calendar-save-exception"
              label={t('attention.saveException')}
              disabled={locked || fecha !== loadedDate}
              onPress={() => {
                try {
                  const date = CalendarDateSchema.parse(fecha),
                    body = CalendarExceptionInputSchema.parse(form);
                  write(count =>
                    attentionApi.exceptionSave(restauranteId, date, {
                      ...body,
                      ...(count === undefined
                        ? {}
                        : { confirmarReservasAfectadas: count }),
                    }),
                  );
                } catch (error) {
                  showError(error);
                }
              }}
            />
            <Action
              label={t('attention.removeException')}
              disabled={locked || !exception || fecha !== loadedDate}
              onPress={() => {
                const date = fecha;
                write(count =>
                  attentionApi.exceptionDelete(restauranteId, date, count),
                );
              }}
            />
          </>
        )}
      </Panel>
    </View>
  );
}
const styles = StyleSheet.create({
  weekdays: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  weekday: { width: '47%' },
  confirmation: { padding: 16 },
});
