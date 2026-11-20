import React from 'react';
import { I18nManager, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';

// Comparto el regreso visual sin cambiar la navegación ni el botón físico de Android.
export function BackButton({ onPress, disabled = false, accessibilityLabel, style, testID }: {
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const Chevron = I18nManager.isRTL ? ChevronRight : ChevronLeft;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? t('common.back')}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? colors.marca.primarioSuave : colors.superficie.elevada,
          borderColor: colors.superficie.borde,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <Chevron size={25} strokeWidth={2.4} color={colors.marca.primario} accessible={false} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
});
