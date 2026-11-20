import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';

type Variant = 'primary' | 'secondary' | 'tertiary';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  tone?: 'normal' | 'danger';
  icon?: LucideIcon;
  endIcon?: LucideIcon;
  disabled?: boolean;
  busy?: boolean;
  selected?: boolean;
  expanded?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

// Reservo el acento para la acción principal y centro todas las etiquetas, incluso en varias líneas.
export function Button({
  label, onPress, variant = 'secondary', tone = 'normal', icon: Icon, endIcon: EndIcon, disabled, busy,
  selected, expanded, testID, accessibilityLabel, style,
}: ButtonProps) {
  const { colors, typography, radii } = useTheme();
  const unavailable = !!(disabled || busy);
  const accent = tone === 'danger' ? colors.estado.error : colors.marca.acento;
  const support = tone === 'danger' ? colors.estado.error : colors.marca.primario;
  const foreground = {
    primary: colors.texto.inverso,
    secondary: selected || tone === 'danger' ? support : colors.texto.primario,
    tertiary: support,
  }[variant];

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: unavailable, selected, expanded, busy }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          borderRadius: radii.m,
          backgroundColor: {
            primary: accent,
            secondary: selected || pressed ? colors.marca.primarioSuave : colors.superficie.elevada,
            tertiary: pressed ? colors.marca.primarioSuave : 'transparent',
          }[variant],
          borderColor: {
            primary: accent,
            secondary: selected ? support : colors.superficie.borde,
            tertiary: 'transparent',
          }[variant],
        },
        pressed && variant === 'primary' && styles.pressed,
        unavailable && styles.disabled,
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={foreground} /> : Icon && (
        <Icon size={19} color={foreground} accessible={false} />
      )}
      <Text style={[typography.cuerpoL, styles.label, { color: foreground }]}>{label}</Text>
      {!busy && EndIcon && <EndIcon size={19} color={foreground} accessible={false} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48, minWidth: 48, paddingVertical: 10, paddingHorizontal: 14,
    borderWidth: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
  },
  label: { flexShrink: 1, textAlign: 'center', fontWeight: '600' },
  disabled: { opacity: 0.5 },
  pressed: { transform: [{ scale: 0.99 }] },
});
