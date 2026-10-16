import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { clearTokens } from '../services/auth/token-storage';
import {
  DEFAULT_CONNECTION,
  loadConnection,
  saveConnection,
  type ConnectionSettings,
} from '../config/connection';

const Context = createContext({
  settings: DEFAULT_CONNECTION,
  isSaving: false,
  save: async (_value: ConnectionSettings, _authenticated: boolean) => {},
});
// Restauro el servidor antes de que autenticación intente renovar su sesión.
export function ConnectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(DEFAULT_CONNECTION);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const saving = useRef(false);
  useEffect(() => {
    loadConnection()
      .then(setSettings)
      .catch(() => setError(true))
      .finally(() => setReady(true));
  }, []);
  const save = async (value: ConnectionSettings, authenticated: boolean) => {
    if (saving.current) throw new Error('La conexión se está guardando');
    saving.current = true;
    setSaving(true);
    try {
      setSettings(await saveConnection(value, authenticated));
      setError(false);
    } finally {
      saving.current = false;
      setSaving(false);
    }
  };
  if (!ready)
    return (
      <ActivityIndicator
        accessibilityLabel={t('attention.loadingConnection')}
      />
    );
  // Si falla Keychain no restauro tokens contra un servidor distinto: dejo reconfigurar sin AuthProvider.
  if (error)
    return (
      <View>
        <Text>{t('attention.connectionLoadError')}</Text>
        <Text
          accessibilityRole="button"
          onPress={async () => {
            try {
              await clearTokens();
              await save(DEFAULT_CONNECTION, false);
            } catch {
              setError(true);
            }
          }}
        >
          {t('attention.useLocal')}
        </Text>
      </View>
    );
  return (
    <Context.Provider value={{ settings, isSaving, save }}>
      {children}
    </Context.Provider>
  );
}
export const useConnection = () => useContext(Context);
