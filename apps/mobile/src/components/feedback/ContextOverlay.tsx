import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CircleHelp, Info } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { LightColors } from '../../theme/tokens';
import { OverlayModal } from './OverlayModal';
import { Button } from '../ui/Button';

export function ContextOverlay({ visible, title, onClose, children }: {
  visible: boolean; title: string; onClose?: () => void; children: React.ReactNode;
}) {
  const { colors, radii, typography } = useTheme();
  const { t } = useTranslation();
  return (
    <OverlayModal visible={visible} onRequestClose={onClose ?? (() => {})}>
      <View style={styles.center}>
        {!!onClose && <Pressable style={StyleSheet.absoluteFill}
          accessible={false} importantForAccessibility="no" onPress={onClose} />}
        <View accessibilityViewIsModal style={[styles.dialog, {
          borderRadius: radii.l, backgroundColor: colors.superficie.fondo,
        }]}>
          <Text accessibilityRole="header" style={[typography.tituloL, styles.title, { color: colors.texto.primario }]}>
            {title}
          </Text>
          {children}
          {!!onClose && <Button label={t('common.close')} variant="tertiary" onPress={onClose} />}
        </View>
      </View>
    </OverlayModal>
  );
}

export function ContextHelp({ title, text, onDark = false }: { title: string; text: string; onDark?: boolean }) {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const [open, setOpen] = useState(false);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={t('common.helpFor', { title })}
      style={styles.help} onPress={() => setOpen(true)}>
      <CircleHelp size={21} color={onDark ? LightColors.texto.inverso : colors.marca.primario} />
    </Pressable>
    {open && <ContextOverlay visible title={title} onClose={() => setOpen(false)}>
      <ScrollView style={styles.helpContent}>
        <Text style={[typography.cuerpoM, { color: colors.texto.secundario }]}>{text}</Text>
      </ScrollView>
    </ContextOverlay>}
  </>;
}

export function LoadingOverlay({ visible, label }: { visible: boolean; label?: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!visible) return null;
  return (
    <ContextOverlay visible title={label ?? t('common.loading')}>
      <ActivityIndicator size="large" color={colors.marca.primario} style={styles.spinner}
        accessibilityLabel={label ?? t('common.loading')} />
    </ContextOverlay>
  );
}

export function TransientNotice({ message, clear, top = 4 }: { message: string | null; clear: () => void; top?: number }) {
  const { colors, typography, radii } = useTheme();
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(clear, 3000);
    return () => clearTimeout(timer);
  }, [message, clear]);
  if (!message) return null;
  return (
    <View pointerEvents="none" style={[styles.noticeArea, { top }]}>
      <View style={[styles.notice, { borderRadius: radii.l, backgroundColor: colors.superficie.elevada,
        borderColor: colors.superficie.borde }]}>
        <Info size={19} color={colors.marca.primario} />
        <Text accessibilityLiveRegion="polite" style={[typography.cuerpoM, styles.noticeText, { color: colors.texto.primario }]}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialog: { width: '100%', maxWidth: 440, maxHeight: '85%', padding: 18, gap: 12, elevation: 8 },
  title: { textAlign: 'center' },
  help: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  helpContent: { flexGrow: 0, maxHeight: 360 },
  spinner: { marginVertical: 10 },
  noticeArea: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 8 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12, borderWidth: StyleSheet.hairlineWidth, elevation: 8, maxWidth: 440 },
  noticeText: { flexShrink: 1 },
});
