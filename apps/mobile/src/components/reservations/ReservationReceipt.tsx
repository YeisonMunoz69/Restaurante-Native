import React, { useRef, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import Share from 'react-native-share';
import { FileCheck2, ImagePlus, Share2, ZoomIn, ZoomOut } from 'lucide-react-native';
import { RESERVATION_RECEIPT_MAX_BYTES, type ReservationReceiptImage, type ReservationResult } from '@encanto/shared';
import { useTheme } from '../../theme/ThemeContext';
import { reservationsApi } from '../../services/reservations.service';
import { BackButton } from '../navigation/BackButton';
import { Button } from '../ui/Button';
import { Note } from '../attention/Controls';
import { PaymentInstructions } from '../PaymentInstructions';

export function ReservationImagePreview({ image, title, onClose, onShare, onViewed, error, busy }: {
  image: ReservationReceiptImage;
  title: string;
  onClose: () => void;
  onShare?: () => void;
  onViewed?: () => void;
  error?: string;
  busy?: boolean;
}) {
  const { t } = useTranslation();
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [zoomed, setZoomed] = useState(false);
  const [failed, setFailed] = useState(false);
  const displayWidth = Math.max(1, width - spacing.margenLateral * 2);
  const imageWidth = zoomed ? displayWidth * 2.5 : displayWidth;
  return (
    <Modal visible onRequestClose={onClose} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.preview, {
        backgroundColor: colors.superficie.fondo,
        paddingTop: insets.top, paddingBottom: insets.bottom, paddingHorizontal: spacing.margenLateral,
      }]}>
        <BackButton onPress={onClose} />
        <Text accessibilityRole="header" style={[typography.tituloL, { color: colors.texto.primario }]}>{title}</Text>
        <View style={styles.actions}>
          <Button label={t(zoomed ? 'reservations.receiptFit' : 'reservations.receiptZoom')}
            variant="secondary" icon={zoomed ? ZoomOut : ZoomIn} onPress={() => setZoomed(value => !value)} />
          {!!onShare && !failed && <Button variant="primary" label={t('reservations.receiptShare')} icon={Share2} onPress={onShare} disabled={busy} />}
        </View>
        {!!error && <Note live tone="error">{error}</Note>}
        {failed ? <Note live tone="error">{t('reservations.receiptReadError')}</Note> : (
          <ScrollView key={zoomed ? 'zoom' : 'fit'} nestedScrollEnabled>
            <ScrollView horizontal scrollEnabled={zoomed} nestedScrollEnabled>
              <Image accessibilityLabel={title} resizeMode="contain"
                source={{ uri: `data:image/png;base64,${image.imagen}` }}
                style={{ width: imageWidth, height: imageWidth * image.alto / image.ancho }}
                onLoad={onViewed} onError={() => setFailed(true)} />
            </ScrollView>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

export function ReservationReceiptCard({ reservation, onUpdate, active = true }: {
  reservation: ReservationResult;
  onUpdate: (reservation: ReservationResult) => void;
  active?: boolean;
}) {
  const { t } = useTranslation();
  const { colors, typography, radii } = useTheme();
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const [error, setError] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [preview, setPreview] = useState<ReservationReceiptImage | null>(null);
  const pending = reservation.estado === 'SOLICITADA';
  const receipt = reservation.comprobante;
  if (!pending && !receipt) return null;

  const run = async (task: () => Promise<void>, fallback: string) => {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (failure) {
      const message = (failure as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      setError(typeof message === 'string' ? message : t(fallback));
    } finally {
      operation.current = false;
      setBusy(false);
    }
  };
  const attach = () => void run(async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 1, assetRepresentationMode: 'compatible' });
    if (result.didCancel) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) throw new Error('PHOTO_NOT_SELECTED');
    if (asset.fileSize && asset.fileSize > RESERVATION_RECEIPT_MAX_BYTES) {
      setError(t('reservations.receiptSize'));
      return;
    }
    const updated = await reservationsApi.uploadReceipt(reservation.id, { ...asset, uri: asset.uri });
    onUpdate(updated);
    setShowPayment(false);
  }, 'reservations.receiptUploadError');
  const open = () => void run(async () => setPreview(await reservationsApi.receiptTicket(reservation.id)),
    'reservations.receiptReadError');
  const share = () => {
    if (!preview) return;
    void run(async () => {
      await Share.open({
        type: 'image/png', url: `data:image/png;base64,${preview.imagen}`,
        filename: `reserva-${reservation.codigo}`, failOnCancel: false, useInternalStorage: true,
      });
    }, 'reservations.receiptShareError');
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.superficie.elevada, borderRadius: radii.l }]}>
      <View style={styles.heading}>
        {receipt ? <FileCheck2 size={24} color={colors.marca.primario} /> : <ImagePlus size={24} color={colors.marca.acento} />}
        <Text accessibilityRole="header" accessibilityLiveRegion="polite"
          style={[typography.tituloM, styles.title, { color: colors.texto.primario }]}>
          {t(receipt ? (pending ? 'reservations.receiptUnderReview' : 'reservations.receiptAttached') : 'reservations.receiptMissing')}
        </Text>
      </View>
      {pending && <Note>{t(receipt ? 'reservations.receiptReviewHint' : 'reservations.receiptHelp')}</Note>}
      {!!error && <Note live tone="error">{error}</Note>}
      {!!receipt && <Button variant="primary" testID="reservation-receipt-preview" label={t('reservations.receiptViewTicket')} onPress={open} disabled={busy} />}
      {pending && <Button testID="reservation-attach-receipt" label={t(receipt ? 'reservations.receiptReplace' : 'reservations.receiptAttach')}
        variant={receipt ? 'secondary' : 'primary'} icon={ImagePlus} onPress={attach} disabled={busy} />}
      {pending && <Button variant="tertiary" label={t(showPayment ? 'reservations.receiptHidePayment' : 'reservations.receiptShowPayment')}
        onPress={() => setShowPayment(value => !value)} disabled={busy} />}
      {pending && showPayment && <PaymentInstructions codigo={reservation.codigo} ticket={reservation.ticket} active={active} />}
      {active && !!preview && <ReservationImagePreview image={preview} title={t('reservations.receiptViewTicket')}
        onClose={() => setPreview(null)} onShare={share} error={error} busy={busy} />}
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { flex: 1, gap: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { padding: 16, gap: 10 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1 },
});
