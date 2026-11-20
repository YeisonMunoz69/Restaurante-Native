import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { BackButton } from '../components/navigation/BackButton';
import { Action, Field, Note, Panel } from '../components/attention/Controls';
import { ContextHelp, LoadingOverlay } from '../components/feedback/ContextOverlay';
import { Feedback } from '../components/feedback/Feedback';
import { adminsApi, type AccountRole } from '../services/admins.service';

const roles: AccountRole[] = ['COMENSAL', 'STAFF', 'ADMIN'];

// Gestiono permisos, no borro la cuenta ni las reservas de la persona.
export function AdminsScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const [data, setData] = useState<Awaited<ReturnType<typeof adminsApi.list>> | null>(null);
  const [correo, setCorreo] = useState('');
  const [role, setRole] = useState<AccountRole | null>(null);
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
  const change = (email: string, nextRole: AccountRole) => {
    if (busy || sending.current || !email.trim()) return;
    Feedback.alert(t('admins.changeTitle'), t('admins.confirmBody', {
      correo: email.trim(), role: t(`admins.roles.${nextRole}`),
    }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('admins.confirm'), style: nextRole === 'COMENSAL' ? 'destructive' : 'default', onPress: async () => {
        if (sending.current) return;
        sending.current = true; setBusy(true);
        try {
          await adminsApi.change(email.trim(), nextRole);
          setCorreo('');
          setRole(null);
          if (email.trim().toLowerCase() === user?.correo.toLowerCase() && nextRole !== 'ADMIN') {
            setData(null); setMessage(t('admins.relogin')); return;
          }
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
  const account = data?.usuarios.find(entry => entry.correo.toLowerCase() === correo.trim().toLowerCase());
  const atMinimum = data ? data.activos <= data.minimo : false;
  const roleLocked = !!account?.protegido || (account?.rol === 'ADMIN' && atMinimum && role !== 'ADMIN');
  return <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.superficie.fondo }]}>
    <KeyboardAwareScrollView contentContainerStyle={styles.content}>
      <BackButton onPress={onBack} disabled={busy} />
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={[typography.display, styles.title, { color: colors.texto.primario }]}>{t('admins.title')}</Text>
        <ContextHelp title={t('admins.title')} text={t('admins.help')} />
      </View>
      {!!message && <Note live tone={message === t('admins.saved') ? 'success' : 'error'}>{message}</Note>}
      {!data && <Action label={t('common.retry')} disabled={busy} onPress={() => void load()} />}
      {data && <>
        <Note>{t('admins.count', { count: data.activos, minimo: data.minimo })}</Note>
        <Panel>
          <Field label={t('admins.email')} value={correo} onChangeText={setCorreo} autoCapitalize="none" keyboardType="email-address" editable={!busy} />
          <View style={styles.roles}>
            {roles.map(option => <Action key={option}
              label={t(`admins.roles.${option}`)} selected={role === option}
              disabled={busy} onPress={() => setRole(option)} />)}
          </View>
          {account?.protegido && <Note>{t('admins.protected')}</Note>}
          {!account?.protegido && roleLocked && <Note>{t('admins.minReached')}</Note>}
          <Action variant="primary" label={t('admins.changeTitle')}
            disabled={busy || !correo.trim() || !role || roleLocked || role === account?.rol}
            onPress={() => { if (role) change(correo, role); }} />
        </Panel>
        {data.usuarios.map(account => <Panel key={account.id}>
          <Text style={[typography.tituloM, { color: colors.texto.primario }]}>{account.nombre}</Text>
          <Note>{account.correo}</Note>
          <Note>{t(`admins.roles.${account.rol}`)}</Note>
          <Note>{t(account.activo ? 'admins.active' : 'admins.inactive')}</Note>
          {account.protegido ? <Note>{t('admins.protected')}</Note> :
            <Action tone="danger" label={t('admins.removeTitle')}
              disabled={busy || !account.activo || (account.rol === 'ADMIN' && atMinimum)}
              onPress={() => change(account.correo, 'COMENSAL')} />}
        </Panel>)}
      </>}
    </KeyboardAwareScrollView>
    <LoadingOverlay visible={busy} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, width: '100%', maxWidth: 760, alignSelf: 'center' },
  heading: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1 },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
