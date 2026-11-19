import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { GoogleAccess } from '../components/GoogleAccess';
import { useTheme } from '../theme/ThemeContext';

type Entry = 'cart' | 'settings';
const GuestAccessContext = createContext<((entry: Entry) => void)>(() => {});
const reminderInterval = 3 * 60 * 1000;
const reminderDuration = 15 * 1000;

// Mantengo la misma Carta o Ajustes detrás del acceso, incluso al completar la sesión.
export function GuestAccessProvider({ authenticated, children, reminderOffset = 0 }: {
  authenticated: boolean;
  children: React.ReactNode;
  reminderOffset?: number;
}) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [foreground, setForeground] = useState(() => (AppState.currentState ?? 'active') === 'active');
  const [reminder, setReminder] = useState(false);
  useEffect(() => {
    if (authenticated) setEntry(null);
  }, [authenticated]);

  useEffect(() => {
    const listener = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => listener.remove();
  }, []);

  // Reinicio la cuenta cuando el invitado vuelve a la app o cierra el acceso.
  useEffect(() => {
    setReminder(false);
    if (authenticated || entry || !foreground) return;
    let hide: ReturnType<typeof setTimeout> | undefined;
    const interval = setInterval(() => {
      setReminder(true);
      hide = setTimeout(() => setReminder(false), reminderDuration);
    }, reminderInterval);
    return () => {
      clearInterval(interval);
      if (hide !== undefined) clearTimeout(hide);
    };
  }, [authenticated, entry, foreground]);

  return (
    <GuestAccessContext.Provider value={setEntry}>
      {children}
      {reminder && !authenticated && !entry && foreground && (
        <GuestReminder bottomOffset={reminderOffset} onOpen={() => setEntry('settings')}
          onDismiss={() => setReminder(false)} />
      )}
      {!authenticated && entry && <GoogleAccess entry={entry} onClose={() => setEntry(null)} />}
    </GuestAccessContext.Provider>
  );
}

export const useGuestAccess = () => useContext(GuestAccessContext);

// Coloco el aviso encima de las pestañas y dejo que siga disponible la pantalla de fondo.
function GuestReminder({ bottomOffset, onOpen, onDismiss }: {
  bottomOffset: number;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const { colors, typography, radii } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View testID="guest-sign-in-reminder" style={[styles.reminder, {
      bottom: insets.bottom + bottomOffset + 10,
      backgroundColor: colors.superficie.fondo,
      borderColor: colors.superficie.borde,
      borderRadius: radii.l,
    }]}>
      <Pressable testID="guest-reminder-open" accessibilityRole="button" onPress={onOpen} style={styles.message}>
        <Text style={[typography.etiqueta, { color: colors.marca.primario }]}>{t('auth.guestSignInTitle')}</Text>
        <Text accessibilityLiveRegion="polite" style={[typography.pie, { color: colors.texto.secundario }]}>
          {t('auth.guestReminder')}
        </Text>
      </Pressable>
      <Pressable testID="guest-reminder-dismiss" accessibilityRole="button"
        accessibilityLabel={t('common.close')} onPress={onDismiss} style={styles.close}>
        <X size={18} color={colors.texto.secundario} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  reminder: {
    position: 'absolute', left: 12, right: 12, maxWidth: 460, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth,
    elevation: 5, zIndex: 10,
  },
  message: { flex: 1, minHeight: 54, paddingVertical: 8, paddingLeft: 14, gap: 3, justifyContent: 'center' },
  close: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
});
