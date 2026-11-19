import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { GoogleButtonColors } from '../../theme/tokens';

const googleBrand = require('../../assets/google-access-light.png');

// Reutilizo el mismo tratamiento visual de Google en el acceso y en Ajustes.
export function GoogleButton({ label, onPress, testID, disabled = false, busy = false }: {
  label: string;
  onPress: () => void;
  testID?: string;
  disabled?: boolean;
  busy?: boolean;
}) {
  const unavailable = disabled || busy;
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: unavailable, busy }} disabled={unavailable} onPress={onPress}
      style={({ pressed }) => [styles.button, (pressed || disabled) && styles.dim]}>
      {busy ? <ActivityIndicator color={GoogleButtonColors.text} />
        : <View style={styles.mark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Image source={googleBrand} resizeMode="contain" style={styles.artwork} />
        </View>}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54, flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center', padding: 12,
    backgroundColor: GoogleButtonColors.background, borderColor: GoogleButtonColors.border, borderWidth: 1, borderRadius: 26,
  },
  dim: { opacity: 0.65 },
  label: { flexShrink: 1, fontSize: 15, lineHeight: 21, fontWeight: '600', textAlign: 'center', color: GoogleButtonColors.text },
  mark: { width: 20, height: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  artwork: { width: 40, height: 40 },
});
