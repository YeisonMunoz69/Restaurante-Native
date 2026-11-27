import React, { useState } from 'react';
import { NativeModules } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Action, Note } from './attention/Controls';

type PaymentApp = { packageName: string; name: string };
type PaymentAppsBridge = {
  available: () => Promise<PaymentApp[]>;
  open: (packageName: string) => Promise<void>;
};

// La consulta empieza al tocar el botón y se limita a las apps del puente Android.
export function PaymentAppOptions() {
  const { t } = useTranslation();
  const [apps, setApps] = useState<PaymentApp[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bridge = NativeModules.EncantoPaymentApps as PaymentAppsBridge | undefined;
  if (!bridge) return null;

  const detect = async () => {
    setBusy(true);
    setError('');
    try {
      setApps(await bridge.available());
    } catch {
      setApps(null);
      setError(t('payments.paymentAppsLoadError'));
    } finally {
      setBusy(false);
    }
  };

  const open = async (app: PaymentApp) => {
    setBusy(true);
    setError('');
    try {
      await bridge.open(app.packageName);
    } catch {
      setError(t('payments.paymentAppOpenError', { name: app.name }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Action variant="secondary" label={t('payments.openPaymentApps')} disabled={busy} onPress={detect} />
      {apps?.map(app => (
        <Action
          key={app.packageName}
          variant="tertiary"
          label={t('payments.openPaymentApp', { name: app.name })}
          disabled={busy}
          onPress={() => open(app)}
        />
      ))}
      {apps && <Note live>{t(apps.length ? 'payments.shareAfterPayment' : 'payments.noPaymentApps')}</Note>}
      {!!error && <Note live tone="error">{error}</Note>}
    </>
  );
}
