import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { FeedbackMessage, type FeedbackKind } from '../feedback/Feedback';
import { Button } from '../ui/Button';

// Conservo el espacio de los formularios mientras comparto la jerarquía visual de la app.
export function Action(props: React.ComponentProps<typeof Button>) {
  return <Button {...props} style={[styles.action, props.style]} />;
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
  action: { marginVertical: 4 },
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
