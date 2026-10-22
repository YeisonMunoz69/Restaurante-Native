import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PaymentConfigResult } from '@encanto/shared';
import { paymentApi } from '../services/payment.service';
import { useTheme } from '../theme/ThemeContext';
import { Action, Note, Panel } from './attention/Controls';

// Vuelvo a consultar contacto/cuentas al abrir el detalle y antes de salir a WhatsApp.
export function PaymentInstructions({
  codigo,
  ticket,
  active = true,
}: {
  codigo: string;
  ticket: string;
  active?: boolean;
}) {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const [data, setData] = useState<PaymentConfigResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setBusy(true);
    setData(null);
    setError('');
    try {
      const next = await paymentApi.current();
      setData(next);
      return next;
    } catch {
      setError(t('payments.loadError'));
      return null;
    } finally {
      setBusy(false);
    }
  }, [t]);
  useEffect(() => {
    if (active) load();
  }, [active, load]);
  const open = async () => {
    if (busy) return;
    const current = await load();
    if (!current) return;
    if (!current.configurada || !/^\+[1-9]\d{9,14}$/.test(current.whatsapp)) {
      setError(t('payments.unconfigured'));
      return;
    }
    const message = encodeURIComponent(
      `${codigo}\n${ticket}\n\n${current.mediosPago}\n${current.instruccionesPago}`,
    );
    const url = `https://wa.me/${current.whatsapp.slice(1)}?text=${message}`;
    try {
      if (!(await Linking.canOpenURL(url))) throw new Error('No disponible');
      await Linking.openURL(url);
    } catch {
      setError(t('reservations.whatsappUnavailable'));
    }
  };
  return (
    <Panel>
      <Note>{t('payments.currentTitle')}</Note>
      {busy && <ActivityIndicator accessibilityLabel={t('common.loading')} />}
      {!!error && (
        <Note live tone="error">
          {error}
        </Note>
      )}
      {data && (
        <>
          {!!data.mediosPago && (
            <Text
              selectable
              style={[typography.cuerpoM, { color: colors.texto.primario }]}
            >
              {data.mediosPago}
            </Text>
          )}
          {!!data.instruccionesPago && <Note>{data.instruccionesPago}</Note>}
          {!!data.whatsapp && (
            <Text
              selectable
              style={[typography.cuerpoM, { color: colors.texto.primario }]}
            >
              {data.whatsapp}
            </Text>
          )}
          {!data.configurada && (
            <Note live tone="warning">
              {t('payments.unconfigured')}
            </Note>
          )}
        </>
      )}
      <Action
        label={t('payments.reload')}
        disabled={busy}
        onPress={() => {
          load();
        }}
      />
      <Action
        label={t('reservations.sendWhatsApp')}
        disabled={busy}
        onPress={() => {
          open();
        }}
      />
    </Panel>
  );
}
