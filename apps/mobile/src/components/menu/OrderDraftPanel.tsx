import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Minus, Plus, ShoppingBasket, UtensilsCrossed, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { MenuDish } from '@encanto/shared';
import { useOrderDraft } from '../../context/OrderDraftContext';
import { useTheme } from '../../theme/ThemeContext';
import { formatCivilDate, formatCop } from '../../utils/formatters';
import { Feedback } from '../feedback/Feedback';
import { OverlayModal } from '../feedback/OverlayModal';
import { MenuDishDetailModal } from './MenuDishDetailModal';
import { menuGallery } from './menu-photo';

export const ORDER_BUTTON_CLEARANCE = 80;

// Dejo la carta libre para recorrerla y abro el borrador solo al pulsar la cesta.
export function OrderDraftPanel({ restauranteId, onReserve }: { restauranteId: string; onReserve: () => void }) {
  const draft = useOrderDraft();
  const [open, setOpen] = useState(false);
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const { t } = useTranslation();
  const { colors, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const units = draft.lines.reduce((sum, line) => sum + line.cantidad, 0);
  const total = draft.lines.reduce((sum, line) => sum + line.cantidad * line.dish.precio, 0);
  const close = () => {
    setSelectedDishId(null);
    setOpen(false);
  };

  const reserve = () => {
    close();
    draft.request();
    onReserve();
  };

  // Solo borro los platos al continuar con la opción de reservar únicamente la mesa.
  const tableOnly = () => {
    const proceed = () => {
      draft.clear();
      reserve();
    };
    if (!draft.lines.length) {
      proceed();
      return;
    }
    Feedback.alert(t('discovery.clearTitle'), t('discovery.clearBody'), [
      { text: t('common.back'), style: 'cancel' },
      { text: t('discovery.tableOnly'), style: 'destructive', onPress: proceed },
    ]);
  };

  if (!open) {
    return (
      <Pressable
        testID="order-open"
        accessibilityRole="button"
        accessibilityLabel={t(units === 1 ? 'discovery.openSummarySingle' : 'discovery.openSummary', {
          count: units, total: formatCop(total),
        })}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.marca.primario, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <ShoppingBasket size={25} color={colors.texto.inverso} />
        {units > 0 && (
          <View
            importantForAccessibility="no-hide-descendants"
            style={[styles.count, { backgroundColor: colors.marca.acento }]}
          >
            <Text style={[typography.etiqueta, { color: colors.texto.inverso }]}>
              {units > 99 ? '99+' : units}
            </Text>
          </View>
        )}
      </Pressable>
    );
  }

  // Aíslo el diálogo de la carta y las pestañas, también al navegar con lector de pantalla.
  return (
    <OverlayModal onRequestClose={close}>
      <View testID="order-sheet" style={[styles.overlay, {
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 16,
      }]}>
        <Pressable
          testID="order-dismiss"
          accessible={false}
          importantForAccessibility="no"
          style={styles.backdrop}
          onPress={close}
        />
        <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.superficie.fondo }]}>
          <View style={styles.header}>
            <View style={styles.heading}>
              <View style={[styles.orderIcon, { backgroundColor: colors.marca.primarioSuave }]}>
                <ShoppingBasket size={22} color={colors.marca.primario} />
              </View>
              <View style={styles.title}>
                <Text accessibilityRole="header" style={[typography.tituloL, { color: colors.texto.primario }]}>
                  {t('discovery.title')}
                </Text>
                {!!draft.fecha && (
                  <Text style={[typography.pie, { color: colors.texto.secundario }]}>
                    {t('discovery.draftDate', { date: formatCivilDate(draft.fecha) })}
                  </Text>
                )}
              </View>
            </View>
            <Pressable
              testID="order-close"
              accessibilityRole="button"
              accessibilityLabel={t('discovery.close')}
              onPress={close}
              style={styles.iconButton}
            >
              <X size={23} color={colors.texto.secundario} />
            </Pressable>
          </View>

          <ScrollView
            bounces={false}
            style={styles.body}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {!draft.lines.length && (
              <Text style={[typography.cuerpoM, { color: colors.texto.secundario }]}>
                {t('discovery.empty')}
              </Text>
            )}
            {draft.lines.map(line => (
              <View key={line.dish.id} style={[styles.line, { borderBottomColor: colors.superficie.borde }]}>
                <Pressable
                  testID={`order-dish-${line.dish.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={t('menu.openDish', { name: line.dish.nombre })}
                  onPress={() => setSelectedDishId(line.dish.id)}
                  style={({ pressed }) => [styles.preview, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={[styles.thumbnail, { backgroundColor: colors.superficie.elevada }]}>
                    <DishThumbnail dish={line.dish} />
                  </View>
                  <Text style={[typography.tituloM, styles.previewTitle, { color: colors.texto.primario }]}>
                    {line.dish.nombre}
                  </Text>
                  <ChevronRight size={18} color={colors.marca.primario} />
                </Pressable>
                <View style={styles.lineInfo}>
                  <Text style={[typography.cuerpoM, { color: colors.texto.secundario }]}>
                    {formatCop(line.dish.precio * line.cantidad)}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('discovery.removeDish', { name: line.dish.nombre })}
                    onPress={() => draft.setQuantity(line.dish, 0, draft.fecha!)}
                    style={styles.remove}
                  >
                    <Text style={[typography.pie, { color: colors.marca.primario }]}>
                      {t('discovery.remove')}
                    </Text>
                  </Pressable>
                </View>
                <View style={[styles.quantity, {
                  backgroundColor: colors.superficie.elevada,
                  borderRadius: radii.completo,
                }]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('discovery.decrease', { name: line.dish.nombre })}
                    onPress={() => draft.setQuantity(line.dish, line.cantidad - 1, draft.fecha!)}
                    style={styles.iconButton}
                  >
                    <Minus size={18} color={colors.texto.primario} />
                  </Pressable>
                  <Text
                    accessibilityLabel={t('discovery.quantity', { name: line.dish.nombre })}
                    style={[typography.etiqueta, { color: colors.texto.primario }]}
                  >
                    {line.cantidad}
                  </Text>
                  <Pressable
                    testID={`order-increase-${line.dish.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={t('discovery.increase', { name: line.dish.nombre })}
                    disabled={line.cantidad >= 99}
                    accessibilityState={{ disabled: line.cantidad >= 99 }}
                    onPress={() => draft.setQuantity(line.dish, line.cantidad + 1, draft.fecha!)}
                    style={[styles.iconButton, line.cantidad >= 99 && styles.disabled]}
                  >
                    <Plus size={18} color={colors.texto.primario} />
                  </Pressable>
                </View>
              </View>
            ))}
            {!!draft.lines.length && (
              <>
                <View style={styles.total}>
                  <Text style={[typography.cuerpoM, { color: colors.texto.secundario }]}>
                    {t('discovery.estimatedTotal')}
                  </Text>
                  <Text style={[typography.precio, { color: colors.texto.primario }]}>
                    {formatCop(total)}
                  </Text>
                </View>
                <Text style={[typography.pie, { color: colors.texto.secundario }]}>
                  {t('discovery.estimateNote')}
                </Text>
                <Pressable
                  testID="order-reserve"
                  accessibilityRole="button"
                  style={[styles.primary, { backgroundColor: colors.marca.primario }]}
                  onPress={reserve}
                >
                  <Text style={[typography.etiqueta, styles.buttonText, { color: colors.texto.inverso }]}>
                    {t('discovery.reserve')}
                  </Text>
                </Pressable>
              </>
            )}
            <Pressable
              testID="order-table-only"
              accessibilityRole="button"
              style={[
                styles.primary,
                { backgroundColor: draft.lines.length ? colors.superficie.elevada : colors.marca.primario },
              ]}
              onPress={tableOnly}
            >
              <Text style={[typography.etiqueta, styles.buttonText, {
                color: draft.lines.length ? colors.texto.primario : colors.texto.inverso,
              }]}>
                {t('discovery.tableOnly')}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
      {selectedDishId && draft.fecha && (
        // Abro la ficha encima para volver al mismo borrador al cerrarla.
        <MenuDishDetailModal
          visible
          restauranteId={restauranteId}
          fecha={draft.fecha}
          dishId={selectedDishId}
          onClose={() => setSelectedDishId(null)}
        />
      )}
    </OverlayModal>
  );
}

// Reutilizo la portada de la carta y dejo un icono si todavía no hay foto.
function DishThumbnail({ dish }: { dish: MenuDish }) {
  const { colors } = useTheme();
  const photo = menuGallery(dish)[0]?.source;
  const [failed, setFailed] = useState(false);
  if (!photo || failed) return <UtensilsCrossed size={20} color={colors.texto.secundario} />;
  return <Image testID="order-dish-photo" source={photo} style={styles.thumbnailImage} resizeMode="contain" onError={() => setFailed(true)} />;
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute', bottom: 14, right: 16, zIndex: 5,
    width: 56, height: 56, borderRadius: 28, elevation: 5,
    alignItems: 'center', justifyContent: 'center',
  },
  count: {
    position: 'absolute', top: -3, right: -3, minWidth: 22, minHeight: 22,
    paddingHorizontal: 4, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
  },
  overlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16,
  },
  backdrop: { ...StyleSheet.absoluteFill },
  sheet: { maxHeight: '90%', width: '100%', maxWidth: 420, borderRadius: 24, overflow: 'hidden' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 4, paddingTop: 12, paddingLeft: 16, paddingRight: 8,
  },
  heading: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1 },
  orderIcon: { alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 20 },
  body: { flexGrow: 0, flexShrink: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 10 },
  line: {
    paddingTop: 8, borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8,
  },
  preview: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewTitle: { flex: 1 },
  thumbnail: { width: 56, height: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbnailImage: { width: 56, height: 56 },
  lineInfo: { flexGrow: 1, flexShrink: 1, flexBasis: 120 },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  remove: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  quantity: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  disabled: { opacity: 0.45 },
  total: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  primary: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, padding: 10 },
  buttonText: { textAlign: 'center' },
});
