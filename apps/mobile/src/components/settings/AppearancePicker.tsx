import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Check, Moon, Sun } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { DarkColors, LightColors } from '../../theme/tokens';

const choices = [
  { mode: 'light', label: 'settings.themeLight', icon: Sun, palette: LightColors },
  { mode: 'dark', label: 'settings.themeDark', icon: Moon, palette: DarkColors },
] as const;

// Comparo ambos temas con una miniatura de sus colores y marco claramente el que se aplica.
export function AppearancePicker() {
  const { t } = useTranslation();
  const { colors, isDark, setThemeMode, typography } = useTheme();
  const { width, fontScale } = useWindowDimensions();

  return (
    <View accessibilityRole="radiogroup" style={[styles.options, (width < 340 || fontScale > 1.3) && styles.vertical]}>
      {choices.map(({ mode, label, icon: Icon, palette }) => {
        const checked = mode === (isDark ? 'dark' : 'light');
        return (
          <Pressable
            key={mode}
            testID={`appearance-${mode}`}
            accessibilityLabel={t(label)}
            accessibilityRole="radio"
            accessibilityState={{ checked }}
            onPress={() => setThemeMode(mode)}
            style={({ pressed }) => [styles.choice, {
              backgroundColor: pressed ? colors.marca.primarioSuave : colors.superficie.elevada,
              borderColor: checked ? colors.marca.primario : colors.superficie.borde,
            }]}
          >
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
              style={[styles.preview, { backgroundColor: palette.superficie.fondo }]}
            >
              <View style={[styles.previewHeader, { backgroundColor: palette.marca.primarioSuave }]}>
                <View style={[styles.previewDot, { backgroundColor: palette.marca.primario }]} />
                <View style={[styles.previewTitle, { backgroundColor: palette.texto.secundario }]} />
              </View>
              <View style={[styles.previewContent, { backgroundColor: palette.superficie.elevada }]}>
                <View style={[styles.previewLine, { backgroundColor: palette.texto.primario }]} />
                <View style={[styles.previewLine, styles.previewSecondary, { backgroundColor: palette.texto.secundario }]} />
              </View>
            </View>
            <View style={styles.caption}>
              <Icon size={18} color={colors.marca.primario} accessible={false} />
              <Text style={[typography.etiqueta, styles.label, { color: colors.texto.primario }]}>
                {t(label)}
              </Text>
              <View style={styles.check}>
                {checked && <Check size={18} strokeWidth={2.6} color={colors.marca.primario} accessible={false} />}
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', gap: 12 },
  vertical: { flexDirection: 'column' },
  choice: { flex: 1, padding: 9, borderWidth: 2, borderRadius: 19, gap: 10 },
  preview: { borderRadius: 12, minHeight: 110, padding: 10, gap: 10, justifyContent: 'center' },
  previewHeader: { borderRadius: 7, flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6 },
  previewDot: { width: 11, height: 11, borderRadius: 6 },
  previewTitle: { flex: 1, maxWidth: 38, height: 3, borderRadius: 2 },
  previewContent: { padding: 9, gap: 6, borderRadius: 7 },
  previewLine: { height: 3, borderRadius: 2, width: '72%' },
  previewSecondary: { width: '46%' },
  caption: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { flex: 1, textAlign: 'center' },
  check: { width: 18 },
});
