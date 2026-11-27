import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PaymentConfigResult } from '@encanto/shared';
import { paymentApi } from '../services/payment.service';
import { useTheme } from '../theme/ThemeContext';
import { Action, Note, Panel } from './attention/Controls';
import { PaymentAppOptions } from './PaymentAppOptions';

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
  const hasPaymentDetails = Boolean(data?.mediosPago.trim() && data?.instruccionesPago.trim());
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
    if (!/^\+[1-9]\d{9,14}$/.test(current.whatsapp)) {
      setError(t('payments.whatsappNotPublished'));
      return;
    }
    const details = current.configurada
      ? [current.mediosPago, current.instruccionesPago]
      : [t('payments.whatsappInquiry')];
    const message = encodeURIComponent(
      [codigo, ticket, ...details].filter(Boolean).join('\n'),
    );
    const url = `https://wa.me/${current.whatsapp.slice(1)}?text=${message}`;
    try {
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
          {!hasPaymentDetails && (
            <Note live tone="warning">
              {t('payments.unconfigured')}
            </Note>
          )}
        </>
      )}
      {hasPaymentDetails && <PaymentAppOptions />}
      <Action variant="tertiary"
        label={t('payments.reload')}
        disabled={busy}
        onPress={() => {
          load();
        }}
      />
      <Action variant="primary"
        label={t('reservations.sendWhatsApp')}
        disabled={busy}
        onPress={() => {
          open();
        }}
      />
    </Panel>
  );
}
