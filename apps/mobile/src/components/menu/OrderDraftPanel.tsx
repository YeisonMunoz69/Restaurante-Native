import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useOrderDraft } from '../../context/OrderDraftContext';
import { useTheme } from '../../theme/ThemeContext';
import { formatCivilDate, formatCop } from '../../utils/formatters';
import { Action, Note } from '../attention/Controls';
import { Feedback } from '../feedback/Feedback';
import { BackButton } from '../navigation/BackButton';

// Comparto una revisión editable: es un borrador para reservar, nunca un checkout.
export function OrderDraftPanel({ onReserve }: { onReserve: () => void }) {
  const draft = useOrderDraft();
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const units = draft.lines.reduce((sum, line) => sum + line.cantidad, 0);
  const total = draft.lines.reduce(
    (sum, line) => sum + line.cantidad * line.dish.precio,
    0,
  );
  const reserve = () => {
    setOpen(false);
    draft.request();
    onReserve();
  };
  const tableOnly = () => {
    const proceed = () => {
      draft.clear();
      setOpen(false);
      draft.request();
      onReserve();
    };
    if (!draft.lines.length) {
      proceed();
      return;
    }
    Feedback.alert(t('discovery.clearTitle'), t('discovery.clearBody'), [
      { text: t('common.back'), style: 'cancel' },
      {
        text: t('discovery.tableOnly'),
        style: 'destructive',
        onPress: proceed,
      },
    ]);
  };
  return (
    <>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.superficie.fondo,
            borderColor: colors.superficie.borde,
          },
        ]}
      >
        <Action
          testID="order-open"
          label={`${t('discovery.title')} · ${units} · ${formatCop(total)}`}
          onPress={() => setOpen(true)}
        />
      </View>
      <Modal
        transparent
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.superficie.fondo,
                marginTop: insets.top + 16,
                marginBottom: insets.bottom + 16,
              },
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              <BackButton onPress={() => setOpen(false)} />
              <Text
                accessibilityRole="header"
                style={[typography.display, { color: colors.texto.primario }]}
              >
                {t('discovery.title')}
              </Text>
              {!!draft.fecha && (
                <Note>
                  {t('discovery.draftDate', {
                    date: formatCivilDate(draft.fecha),
                  })}
                </Note>
              )}
              {!draft.lines.length && <Note>{t('discovery.empty')}</Note>}
              {draft.lines.map(line => (
                <View key={line.dish.id} style={styles.line}>
                  <Text
                    style={[
                      typography.tituloM,
                      { color: colors.texto.primario },
                    ]}
                  >
                    {line.dish.nombre}
                  </Text>
                  <Note>{formatCop(line.dish.precio * line.cantidad)}</Note>
                  <View style={styles.quantity}>
                    <Action
                      label="−"
                      accessibilityLabel={t('discovery.decrease', {
                        name: line.dish.nombre,
                      })}
                      onPress={() =>
                        draft.setQuantity(
                          line.dish,
                          line.cantidad - 1,
                          draft.fecha!,
                        )
                      }
                    />
                    <Text
                      accessibilityLabel={t('discovery.quantity', {
                        name: line.dish.nombre,
                      })}
                      style={[
                        typography.tituloM,
                        { color: colors.texto.primario },
                      ]}
                    >
                      {line.cantidad}
                    </Text>
                    <Action
                      label="+"
                      accessibilityLabel={t('discovery.increase', {
                        name: line.dish.nombre,
                      })}
                      disabled={line.cantidad >= 99}
                      onPress={() =>
                        draft.setQuantity(
                          line.dish,
                          line.cantidad + 1,
                          draft.fecha!,
                        )
                      }
                    />
                    <Action
                      label={t('discovery.remove')}
                      onPress={() =>
                        draft.setQuantity(line.dish, 0, draft.fecha!)
                      }
                    />
                  </View>
                </View>
              ))}
              <Note>
                {t('discovery.estimate', { total: formatCop(total) })}
              </Note>
              <Action
                testID="order-reserve"
                label={t('discovery.reserve')}
                disabled={!draft.lines.length}
                onPress={reserve}
              />
              <Action
                testID="order-table-only"
                label={t('discovery.tableOnly')}
                onPress={tableOnly}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  bar: { paddingHorizontal: 16, paddingVertical: 6, borderTopWidth: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    maxHeight: '90%',
    width: '100%',
    maxWidth: 640,
    borderRadius: 24,
    overflow: 'hidden',
  },
  content: { padding: 20 },
  line: { paddingVertical: 12 },
  quantity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
  },
});
