import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const brand = require('../../../android/app/src/main/res/drawable-xxxhdpi/ic_launcher_art.png');

// Uso el mismo sello de la aplicación para identificar las cinco pestañas en una sola fila.
export function TabPageHeader({ title }: { title: string }) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.row, { gap: spacing.m, marginBottom: spacing.s }]}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.brand}
      >
        <Image source={brand} style={styles.brandArtwork} resizeMode="contain" />
      </View>
      <Text accessibilityRole="header" style={[typography.tituloL, styles.title, { color: colors.texto.primario }]}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  brand: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  // El recurso del lanzador trae área transparente alrededor del sello.
  brandArtwork: { width: 68, height: 68 },
  title: { flex: 1 },
});
