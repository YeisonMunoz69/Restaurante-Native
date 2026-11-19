import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { todayInBogota } from '../../utils/formatters';
import { ReservationCalendar } from '../calendar/ReservationCalendar';
import { OverlayModal } from '../feedback/OverlayModal';

// Reutilizo el fondo del carrito y consulto las aperturas efectivas del restaurante.
export function MenuCalendarModal({ restauranteId, value, onClose, onSelect }: {
  restauranteId: string;
  value: string;
  onClose: () => void;
  onSelect: (date: string) => void;
}) {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const today = todayInBogota();
  return (
    <OverlayModal onRequestClose={onClose}>
      <SafeAreaView style={styles.frame}>
        <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />
        <View testID="menu-calendar-modal" accessibilityViewIsModal
          style={[styles.card, { backgroundColor: colors.superficie.fondo }]}>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={[typography.tituloL, styles.title, { color: colors.texto.primario }]}>
              {t('menu.serviceCalendar')}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')}
              style={styles.close} onPress={onClose}>
              <X size={22} color={colors.texto.secundario} />
            </Pressable>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
            <ReservationCalendar restauranteId={restauranteId} value={value} min={today}
              mode="menu" onChange={onSelect} />
          </ScrollView>
        </View>
      </SafeAreaView>
    </OverlayModal>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14 },
  card: { maxHeight: '92%', width: '100%', maxWidth: 460, borderRadius: 24, overflow: 'hidden' },
  heading: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingLeft: 18, paddingRight: 8 },
  title: { flex: 1 },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 0, flexShrink: 1 },
  body: { paddingHorizontal: 12, paddingBottom: 14 },
});
