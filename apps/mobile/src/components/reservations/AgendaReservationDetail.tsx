import React, { useState } from 'react';
import { Image, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Copy, Share2, UtensilsCrossed } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import type { ReservationWithCustomer } from '../../services/reservations.service';
import { formatCivilDate, formatCop } from '../../utils/formatters';
import { ContextOverlay } from '../feedback/ContextOverlay';
import { Button } from '../ui/Button';
import { menuGallery } from '../menu/menu-photo';

export function AgendaReservationDetail({ reservation, onClose, children }: {
  reservation: ReservationWithCustomer;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  const { colors, typography, radii } = useTheme();
  const { t } = useTranslation();
  const [message, setMessage] = useState('');

  return (
    <ContextOverlay visible title={reservation.cliente.nombre} onClose={onClose}>
      <ScrollView testID="agenda-reservation-detail" style={styles.body}
        contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.visit}>
          <Text style={[typography.cuerpoM, { color: colors.texto.primario }]}>
            {formatCivilDate(reservation.fecha)} · {reservation.horaInicio}–{reservation.horaFin}
          </Text>
          <Text style={[typography.pie, { color: colors.texto.secundario }]}>
            {t('reservations.people', { count: reservation.numComensales })} · {t(`reservations.status.${reservation.estado}`)}
          </Text>
          <Text selectable style={[typography.codigo, { color: colors.marca.primario }]}>{reservation.codigo}</Text>
          {!!reservation.cliente.telefono && (
            <Text selectable style={[typography.pie, { color: colors.texto.secundario }]}>{reservation.cliente.telefono}</Text>
          )}
          {(reservation.cliente.cancelaciones > 0 || reservation.cliente.inasistencias > 0) && (
            <Text style={[typography.pie, { color: colors.texto.secundario }]}>
              {t('reservations.previousRecords', { cancellations: reservation.cliente.cancelaciones, noShows: reservation.cliente.inasistencias })}
            </Text>
          )}
          {!!reservation.nota && (
            <Text style={[typography.cuerpoM, { color: colors.texto.primario }]}>
              {t('reservations.ticketNote', { note: reservation.nota })}
            </Text>
          )}
        </View>

        <Text accessibilityRole="header" style={[typography.tituloM, { color: colors.texto.primario }]}>
          {t('reservations.agendaOrder')}
        </Text>
        {!reservation.lineas.length && (
          <Text style={[typography.cuerpoM, { color: colors.texto.secundario }]}>{t('reservations.noOrder')}</Text>
        )}
        {reservation.lineas.map(line => {
          // Uso la misma portada que en Carta, incluso si el plato viene del catálogo inicial.
          const cover = menuGallery({
            slug: line.platoSlug, nombre: line.nombre,
            fotos: line.fotoUrl ? [{ id: line.platoId, path: line.fotoUrl, pathOg: null }] : [],
          })[0]?.source;
          return (
            <View key={line.platoId} style={styles.line}>
              <View style={[styles.thumbnail, { backgroundColor: colors.marca.primarioSuave, borderRadius: radii.m }]}>
                {cover ? (
                  <Image testID="agenda-dish-photo" source={cover} style={styles.image} resizeMode="cover" accessible={false} />
                ) : <UtensilsCrossed size={21} color={colors.marca.primario} />}
              </View>
              <View style={styles.title}>
                <Text style={[typography.cuerpoM, { color: colors.texto.primario }]}>
                  {t('reservations.orderLine', { quantity: line.cantidad, name: line.nombre })}
                </Text>
                <Text style={[typography.pie, { color: colors.texto.secundario }]}>{formatCop(line.subtotal)}</Text>
              </View>
            </View>
          );
        })}
        {!!reservation.lineas.length && (
          <View style={[styles.total, { borderTopColor: colors.superficie.borde }]}>
            <Text style={[typography.cuerpoM, { color: colors.texto.secundario }]}>{t('reservations.total')}</Text>
            <Text style={[typography.tituloM, { color: colors.texto.primario }]}>{formatCop(reservation.total)}</Text>
          </View>
        )}
        {children}
        <View style={styles.actions}>
          <Button style={styles.action} variant="secondary" icon={Copy} label={t('reservations.copyTicket')}
            onPress={() => { Clipboard.setString(reservation.ticket); setMessage(t('reservations.ticketCopied')); }} />
          <Button style={styles.action} variant="tertiary" icon={Share2} label={t('reservations.shareTicket')}
            onPress={() => { void Share.share({ message: reservation.ticket }).catch(() => setMessage(t('reservations.ticketShareError'))); }} />
        </View>
        {!!message && <Text accessibilityLiveRegion="polite"
          style={[typography.pie, { color: colors.texto.secundario }]}>{message}</Text>}
      </ScrollView>
    </ContextOverlay>
  );
}

const styles = StyleSheet.create({
  body: { flexGrow: 0, flexShrink: 1 },
  content: { gap: 12 },
  visit: { alignItems: 'center', gap: 3, paddingBottom: 6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumbnail: { width: 58, height: 48, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  title: { flex: 1 },
  total: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  action: { flexGrow: 1 },
});
