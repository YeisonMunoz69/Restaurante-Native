import React, { useCallback, useRef, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { Modal, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { CalendarDays, ClipboardList, Clock3, Copy, Share2, Ticket, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReservationResult } from '@encanto/shared';
import { useTheme } from '../../theme/ThemeContext';
import { formatCivilDate, formatCop } from '../../utils/formatters';
import { BackButton } from '../navigation/BackButton';
import { Button } from '../ui/Button';
import { TransientNotice } from '../feedback/ContextOverlay';
import { FeedbackMessage } from '../feedback/Feedback';

// Presento los datos de la API como ticket y conservo su versión de texto para copiar y compartir.
export function ReservationTicketView({ reservation, onClose }: {
  reservation: ReservationResult; onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState<string | null>(null);
  const [shareError, setShareError] = useState(false);
  const [sharing, setSharing] = useState(false);
  const shareInProgress = useRef(false);
  const clearNotice = useCallback(() => setNotice(null), []);
  const status = t('reservations.status.' + reservation.estado);
  const date = formatCivilDate(reservation.fecha);
  const time = reservation.horaInicio + '–' + reservation.horaFin;

  const shareTicket = async () => {
    if (shareInProgress.current) return;
    shareInProgress.current = true;
    setShareError(false);
    setSharing(true);
    try {
      await Share.share({ message: reservation.ticket });
    } catch {
      setShareError(true);
    } finally {
      shareInProgress.current = false;
      setSharing(false);
    }
  };

  return (
    <Modal visible onRequestClose={onClose} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.superficie.fondo }]}>
        <View style={[styles.header, { borderColor: colors.superficie.borde }]}>
          <BackButton onPress={onClose} style={styles.back} accessibilityLabel={t('common.close')} />
          <Text accessibilityRole="header" style={[typography.tituloL, styles.flex, { color: colors.texto.primario }]}>
            {t('reservations.ticketTitle')}
          </Text>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.ticket, { borderRadius: radii.l, borderColor: colors.superficie.borde }]}>
            <View style={[styles.identity, { backgroundColor: colors.marca.primarioSuave }]}>
              <View style={styles.identityHeading}>
                <Ticket size={23} color={colors.marca.primario} accessible={false} />
                <Text style={[typography.etiqueta, styles.flex, { color: colors.marca.primario }]}>{t('reservations.ticketVenue')}</Text>
              </View>
              <Text selectable style={[typography.display, { color: colors.texto.primario }]}>{reservation.codigo}</Text>
              <View style={[styles.badge, { backgroundColor: colors.superficie.fondo, borderRadius: radii.completo }]}>
                <Text style={[typography.etiqueta, { color: colors.marca.primario }]}>{status}</Text>
              </View>
            </View>
            <View style={styles.section}>
              {[
                { Icon: CalendarDays, text: date },
                { Icon: Clock3, text: time },
                { Icon: Users, text: t('reservations.people', { count: reservation.numComensales }) },
              ].map(({ Icon, text }) => (
                <View key={text} style={styles.info}>
                  <Icon size={19} color={colors.marca.primario} accessible={false} />
                  <Text style={[typography.cuerpoL, styles.flex, { color: colors.texto.primario }]}>{text}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.section, styles.divider, { borderColor: colors.superficie.borde }]}>
              <View style={styles.info}>
                <ClipboardList size={20} color={colors.marca.primario} accessible={false} />
                <Text accessibilityRole="header" style={[typography.tituloM, { color: colors.texto.primario }]}>
                  {t('reservations.preorderTitle')}
                </Text>
              </View>
              {!reservation.lineas.length && <Text style={[typography.cuerpoM, { color: colors.texto.secundario }]}>{t('reservations.noOrder')}</Text>}
              {reservation.lineas.map(line => (
                <View key={line.platoId} style={[styles.line, { borderColor: colors.superficie.borde }]}>
                  <Text style={[typography.etiqueta, styles.quantity, { color: colors.marca.primario,
                    backgroundColor: colors.marca.primarioSuave, borderRadius: radii.s }]}>
                    {line.cantidad} ×
                  </Text>
                  <Text style={[typography.cuerpoM, styles.flex, { color: colors.texto.primario }]}>{line.nombre}</Text>
                  <Text style={[typography.etiqueta, { color: colors.texto.primario }]}>{formatCop(line.subtotal)}</Text>
                </View>
              ))}
              {!!reservation.nota && <View style={styles.info}>
                <Text style={[typography.cuerpoM, styles.flex, { color: colors.texto.secundario }]}>
                  {t('reservations.ticketNote', { note: reservation.nota })}
                </Text>
              </View>}
            </View>
            <View style={[styles.section, styles.total, { backgroundColor: colors.superficie.elevada }]}>
              <Text style={[typography.etiqueta, styles.flex, { color: colors.texto.primario }]}>{t('reservations.orderTotal')}</Text>
              <Text style={[typography.precio, { color: colors.marca.acento }]}>{formatCop(reservation.total)}</Text>
            </View>
          </View>
        </ScrollView>
        {shareError && <FeedbackMessage kind="error">{t('reservations.ticketShareError')}</FeedbackMessage>}
        <View style={[styles.footer, { borderColor: colors.superficie.borde }]}>
          <Button style={styles.footerAction} icon={Copy} label={t('common.copy')} accessibilityLabel={t('reservations.copyTicket')}
            onPress={() => { Clipboard.setString(reservation.ticket); setNotice(t('reservations.ticketCopied')); }} />
          <Button style={styles.footerAction} variant="primary" icon={Share2} label={t('common.share')}
            accessibilityLabel={t('reservations.shareTicket')} busy={sharing} onPress={() => void shareTicket()} />
        </View>
        <TransientNotice message={notice} clear={clearNotice} top={insets.top + 54} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, padding: 12 },
  back: { marginBottom: 0 },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', padding: 16 },
  ticket: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  identity: { padding: 18, gap: 8 },
  identityHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6 },
  section: { padding: 16, gap: 10 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 9 },
  quantity: { paddingHorizontal: 6, paddingVertical: 3 },
  total: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, borderTopWidth: StyleSheet.hairlineWidth,
    width: '100%', maxWidth: 620, alignSelf: 'center' },
  footerAction: { flexGrow: 1, flexBasis: 120 },
});
