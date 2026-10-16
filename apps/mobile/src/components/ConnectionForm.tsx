import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConnection } from '../context/ConnectionContext';
import { Action, Field, Note, Panel } from './attention/Controls';

// Comparto sede y conexión; el usuario cambia de servidor únicamente antes del login.
export function ConnectionForm({
  authenticated = false,
}: {
  authenticated?: boolean;
}) {
  const { t } = useTranslation();
  const { settings, save } = useConnection();
  const [value, setValue] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return (
    <Panel>
      <Note>{t('attention.connection')}</Note>
      {!authenticated && (
        <>
          <Action
            label={t('attention.local')}
            selected={value.environment === 'local'}
            disabled={busy}
            onPress={() => {
              setValue({ ...value, environment: 'local' });
              setMessage('');
            }}
          />
          <Action
            label={t('attention.dev')}
            selected={value.environment === 'dev'}
            disabled={busy}
            onPress={() => {
              setValue({ ...value, environment: 'dev' });
              setMessage('');
            }}
          />
          {value.environment === 'local' && (
            <Field
              label={t('attention.apiUrl')}
              value={value.localUrl}
              editable={!busy}
              onChangeText={localUrl => setValue({ ...value, localUrl })}
            />
          )}
        </>
      )}
      <Field
        label={t('attention.restaurantId')}
        value={value.restauranteId}
        editable={!busy}
        onChangeText={restauranteId => setValue({ ...value, restauranteId })}
      />
      <Action
        label={t('attention.saveConnection')}
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          setMessage('');
          try {
            await save(value, authenticated);
            setMessage(t('attention.connectionSaved'));
          } catch {
            setMessage(t('attention.connectionInvalid'));
          } finally {
            setBusy(false);
          }
        }}
      />
      {!!message && <Note live>{message}</Note>}
    </Panel>
  );
}
