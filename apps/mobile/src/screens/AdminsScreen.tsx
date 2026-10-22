import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { BackButton } from '../components/navigation/BackButton';
import { Action, Field, Note, Panel } from '../components/attention/Controls';
import { Feedback } from '../components/feedback/Feedback';
import { adminsApi } from '../services/admins.service';

// Gestiono permisos, no borro la cuenta ni las reservas de la persona.
export function AdminsScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const [data, setData] = useState<Awaited<ReturnType<typeof adminsApi.list>> | null>(null);
  const [correo, setCorreo] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const sending = useRef(false);
  const load = useCallback(async () => {
    if (user?.rol !== 'ADMIN') return;
    setBusy(true);
    try { setData(await adminsApi.list()); setMessage(''); }
    catch { setMessage(t('admins.loadError')); }
    finally { setBusy(false); }
  }, [t, user?.rol]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { if (!sending.current) onBack(); return true; });
    return () => listener.remove();
  }, [onBack]);
  const change = (email: string, grant: boolean) => {
    if (busy || sending.current || !email.trim()) return;
    Feedback.alert(t(grant ? 'admins.grantTitle' : 'admins.removeTitle'), t('admins.confirmBody', { correo: email.trim() }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('admins.confirm'), style: grant ? 'default' : 'destructive', onPress: async () => {
        if (sending.current) return;
        sending.current = true; setBusy(true);
        try {
          await adminsApi.change(email.trim(), grant);
          setCorreo('');
          if (email.trim().toLowerCase() === user?.correo.toLowerCase() && !grant) { setData(null); setMessage(t('admins.relogin')); return; }
          setData(await adminsApi.list()); setMessage(t('admins.saved'));
        } catch (cause) {
          const text = (cause as { response?: { data?: { message?: unknown } } }).response?.data?.message;
          setMessage(typeof text === 'string' ? text : t('admins.saveError'));
          // Un conflicto concurrente puede cambiar el número; refresco sin ocultar su motivo.
          try { setData(await adminsApi.list()); } catch { setData(null); }
        } finally { sending.current = false; setBusy(false); }
      } },
    ]);
  };
  if (user?.rol !== 'ADMIN') return <Note>{t('attention.forbidden')}</Note>;
  return <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.superficie.fondo }]}>
    <KeyboardAwareScrollView contentContainerStyle={styles.content}>
      <BackButton onPress={onBack} disabled={busy} />
      <Text style={[typography.display, { color: colors.texto.primario }]}>{t('admins.title')}</Text>
      <Note>{t('admins.help')}</Note>
      {busy && <ActivityIndicator accessibilityLabel={t('common.loading')} />}
      {!!message && <Note live tone={message === t('admins.saved') ? 'success' : 'error'}>{message}</Note>}
      <Action label={t('common.retry')} disabled={busy} onPress={() => void load()} />
      {data && <>
        <Note>{t('admins.count', { count: data.activos, minimo: data.minimo })}</Note>
        <Panel>
          <Field label={t('admins.email')} value={correo} onChangeText={setCorreo} autoCapitalize="none" keyboardType="email-address" editable={!busy} />
          <Action label={t('admins.grantTitle')} disabled={busy || !correo.trim()} onPress={() => change(correo, true)} />
        </Panel>
        {data.usuarios.map(account => <Panel key={account.id}>
          <Text style={[typography.tituloM, { color: colors.texto.primario }]}>{account.nombre}</Text>
          <Note>{account.correo}</Note>
          <Note>{t(account.activo ? 'admins.active' : 'admins.inactive')}</Note>
          <Action label={t('admins.removeTitle')} disabled={busy || !account.activo || data.activos <= data.minimo} onPress={() => change(account.correo, false)} />
        </Panel>)}
      </>}
    </KeyboardAwareScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ container: { flex: 1 }, content: { padding: 16, paddingBottom: 40, width: '100%', maxWidth: 760, alignSelf: 'center' } });
