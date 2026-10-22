import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { FeedbackMessage, type FeedbackKind } from '../feedback/Feedback';

// Mantengo etiquetas visibles, contraste del tema y objetivos táctiles de al menos 48 dp.
export function Action({
  label,
  onPress,
  disabled,
  selected,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        disabled && styles.disabled,
        {
          backgroundColor: selected
            ? colors.marca.primarioSuave
            : colors.superficie.elevada,
          borderColor: colors.marca.primario,
        },
      ]}
    >
      <Text style={[styles.label, { color: colors.texto.primario }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={{ color: colors.texto.secundario }}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.input,
          {
            color: colors.texto.primario,
            borderColor: colors.superficie.borde,
            backgroundColor: colors.superficie.fondo,
          },
        ]}
      />
    </View>
  );
}
export function Note({
  children,
  live,
  tone,
}: {
  children: React.ReactNode;
  live?: boolean;
  tone?: FeedbackKind;
}) {
  const { colors } = useTheme();
  if (live) return <FeedbackMessage kind={tone}>{children}</FeedbackMessage>;
  return (
    <Text
      accessibilityLiveRegion={live ? 'polite' : 'none'}
      style={[styles.note, { color: colors.texto.primario }]}
    >
      {children}
    </Text>
  );
}
export function Panel({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: colors.superficie.elevada,
          borderColor: colors.superficie.borde,
        },
      ]}
    >
      {children}
    </View>
  );
}
const styles = StyleSheet.create({
  disabled: { opacity: 0.5 },
  button: {
    minHeight: 48,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
  },
  label: { fontSize: 16, fontWeight: '600' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  field: { marginVertical: 8 },
  panel: { borderWidth: 1, borderRadius: 12, padding: 16, marginVertical: 12 },
  note: { fontSize: 16, marginVertical: 6 },
});
