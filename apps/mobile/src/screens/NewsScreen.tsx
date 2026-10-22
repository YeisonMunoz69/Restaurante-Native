import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Pin } from 'lucide-react-native';

// pantalla de noticias correspondiente al boton central de la navegacion
export const NewsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors, typography, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.contenedor, { backgroundColor: colors.superficie.fondo }]}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingHorizontal: spacing.margenLateral,
          paddingTop: insets.top + spacing.l,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[typography.display, { color: colors.texto.primario }]}>
          {t('news.title')}
        </Text>
        <Text
          style={[
            typography.cuerpoM,
            { color: colors.texto.secundario, marginTop: 4 },
          ]}
        >
          {t('news.subtitle')}
        </Text>
      </View>

      {/* publicacion fijada de ejemplo */}
      <View
        style={[
          styles.tarjetaNoticia,
          {
            backgroundColor: colors.superficie.elevada,
            borderColor: colors.marca.primario,
            borderRadius: radii.l,
            padding: spacing.l,
            marginTop: spacing.l,
          },
        ]}
      >
        <View style={styles.badgeFijada}>
          <Pin size={14} color={colors.marca.primario} />
          <Text
            style={[
              typography.etiqueta,
              { color: colors.marca.primario, marginLeft: spacing.xs },
            ]}
          >
            {t('news.pinned')}
          </Text>
        </View>

        <Text
          style={[
            typography.tituloM,
            { color: colors.texto.primario, marginTop: spacing.s },
          ]}
        >
          {t('news.sampleTitle')}
        </Text>

        <Text
          style={[
            typography.cuerpoM,
            { color: colors.texto.secundario, marginTop: spacing.s },
          ]}
        >
          {t('news.sampleBody')}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    marginTop: 0,
  },
  tarjetaNoticia: {
    borderWidth: 1.5,
  },
  badgeFijada: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
