import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  PaymentConfigSchema,
  type PaymentConfig,
  type PaymentConfigResult,
} from '@encanto/shared';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { Action, Field, Note, Panel } from '../components/attention/Controls';
import { paymentApi } from '../services/payment.service';

// Separo contacto y cobro en una subpantalla del dueño, con lectura y guardado explícitos.
export function PaymentSettingsScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { colors, typography } = useTheme();
  const [form, setForm] = useState<PaymentConfig | null>(null);
  const [saved, setSaved] = useState<PaymentConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [conflict, setConflict] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const accept = (next: PaymentConfigResult) => {
    const value = {
      whatsapp: next.whatsapp,
      mediosPago: next.mediosPago,
      instruccionesPago: next.instruccionesPago,
      version: next.version,
    };
    setForm(value);
    setSaved(value);
    setConflict(false);
  };
  const load = useCallback(async () => {
    if (user?.rol !== 'ADMIN') return;
    setBusy(true);
    setMessage('');
    try {
      accept(await paymentApi.adminCurrent());
    } catch {
      setMessage(t('payments.loadError'));
    } finally {
      setBusy(false);
    }
  }, [t, user?.rol]);
  useEffect(() => {
    load();
  }, [load]);

  // Confirmo antes de descartar una edición, también con el botón físico Android.
  const leave = useCallback(() => {
    if (busy) return;
    if (!dirty) {
      onBack();
      return;
    }
    Alert.alert(t('payments.discardTitle'), t('payments.discardBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('payments.discard'), style: 'destructive', onPress: onBack },
    ]);
  }, [busy, dirty, onBack, t]);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      leave();
      return true;
    });
    return () => listener.remove();
  }, [leave]);

  const save = () => {
    if (busy || !form || conflict) return;
    const parsed = PaymentConfigSchema.safeParse(form);
    if (!parsed.success) {
      setMessage(t('payments.invalid'));
      return;
    }
    Alert.alert(t('payments.confirmTitle'), t('payments.confirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('payments.save'),
        onPress: async () => {
          setBusy(true);
          setMessage('');
          try {
            accept(await paymentApi.save(parsed.data));
            setMessage(t('payments.saved'));
          } catch (cause) {
            const status = (cause as { response?: { status?: number } })
              ?.response?.status;
            setConflict(status === 409);
            setMessage(
              t(status === 409 ? 'payments.conflict' : 'payments.saveError'),
            );
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };
  const reload = () => {
    if (!dirty) {
      load();
      return;
    }
    Alert.alert(t('payments.discardTitle'), t('payments.discardBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('payments.discard'),
        style: 'destructive',
        onPress: () => {
          load();
        },
      },
    ]);
  };
  if (user?.rol !== 'ADMIN') return <Note>{t('attention.forbidden')}</Note>;
  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.superficie.fondo }]}
    >
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Action label={t('common.back')} onPress={leave} disabled={busy} />
        <Text style={[typography.display, { color: colors.texto.primario }]}>
          {t('payments.title')}
        </Text>
        <Note>{t('payments.help')}</Note>
        {busy && <ActivityIndicator accessibilityLabel={t('common.loading')} />}
        {!!message && <Note live>{message}</Note>}
        {form && (
          <Panel>
            <Field
              label={t('payments.whatsapp')}
              value={form.whatsapp}
              editable={!busy}
              onChangeText={value => setForm({ ...form, whatsapp: value })}
              keyboardType="phone-pad"
            />
            <Field
              label={t('payments.methods')}
              value={form.mediosPago}
              editable={!busy}
              multiline
              maxLength={4000}
              onChangeText={value => setForm({ ...form, mediosPago: value })}
            />
            <Field
              label={t('payments.instructions')}
              value={form.instruccionesPago}
              editable={!busy}
              multiline
              maxLength={2000}
              onChangeText={value =>
                setForm({ ...form, instruccionesPago: value })
              }
            />
            <Action
              testID="payments-save"
              label={t('payments.save')}
              disabled={busy || !dirty || conflict}
              onPress={save}
            />
          </Panel>
        )}
        <Action label={t('payments.reload')} disabled={busy} onPress={reload} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
});
