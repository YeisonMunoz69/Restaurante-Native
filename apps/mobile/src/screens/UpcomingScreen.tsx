import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { Sparkles, Bike, Fish, MessageCircle } from 'lucide-react-native';

// pantalla de proximamente con las tarjetas informativas de la pista y la pesca
export const UpcomingScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors, typography, spacing, radii } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.contenedor, { backgroundColor: colors.superficie.fondo }]}
      contentContainerStyle={[
        styles.scrollContent,
        {
          padding: spacing.margenLateral,
          paddingTop: insets.top + spacing.l,
        },
      ]}
    >
      <View style={styles.header}>
        <Text
          style={[
            typography.display,
            width < 360 ? styles.tituloCompacto : undefined,
            width >= 600 ? styles.tituloAmplio : undefined,
            { color: colors.texto.primario },
          ]}
        >
          {t('upcoming.title')}
        </Text>
        <Text
          style={[
            typography.cuerpoM,
            { color: colors.texto.secundario, marginTop: 4 },
          ]}
        >
          {t('upcoming.subtitle')}
        </Text>
      </View>

      {/* tarjeta 1: pista de motocross */}
      <View
        style={[
          styles.tarjeta,
          {
            backgroundColor: colors.superficie.elevada,
            borderColor: colors.superficie.borde,
            borderRadius: radii.l,
            padding: spacing.l,
            marginTop: spacing.l,
          },
        ]}
      >
        <View style={styles.filaIcono}>
          <Bike size={24} color={colors.marca.acento} />
          <View
            style={[
              styles.badgeProximamente,
              {
                backgroundColor: colors.marca.primarioSuave,
                borderRadius: radii.s,
              },
            ]}
          >
            <Sparkles size={12} color={colors.marca.primario} />
            <Text
              style={[
                typography.pie,
                {
                  color: colors.marca.primario,
                  fontWeight: '700',
                  marginLeft: 4,
                },
              ]}
            >
              {t('upcoming.comingSoon')}
            </Text>
          </View>
        </View>

        <Text
          style={[
            typography.tituloM,
            { color: colors.texto.primario, marginTop: spacing.m },
          ]}
        >
          {t('upcoming.motocrossTitle')}
        </Text>
        <Text
          style={[
            typography.cuerpoM,
            { color: colors.texto.secundario, marginTop: spacing.s },
          ]}
        >
          {t('upcoming.motocrossDesc')}
        </Text>
      </View>

      {/* tarjeta 2: pesca deportiva */}
      <View
        style={[
          styles.tarjeta,
          {
            backgroundColor: colors.superficie.elevada,
            borderColor: colors.superficie.borde,
            borderRadius: radii.l,
            padding: spacing.l,
            marginTop: spacing.l,
          },
        ]}
      >
        <View style={styles.filaIcono}>
          <Fish size={24} color={colors.estado.exito} />
          <View
            style={[
              styles.badgeProximamente,
              {
                backgroundColor: colors.marca.primarioSuave,
                borderRadius: radii.s,
              },
            ]}
          >
            <Sparkles size={12} color={colors.marca.primario} />
            <Text
              style={[
                typography.pie,
                {
                  color: colors.marca.primario,
                  fontWeight: '700',
                  marginLeft: 4,
                },
              ]}
            >
              {t('upcoming.comingSoon')}
            </Text>
          </View>
        </View>

        <Text
          style={[
            typography.tituloM,
            { color: colors.texto.primario, marginTop: spacing.m },
          ]}
        >
          {t('upcoming.fishingTitle')}
        </Text>
        <Text
          style={[
            typography.cuerpoM,
            { color: colors.texto.secundario, marginTop: spacing.s },
          ]}
        >
          {t('upcoming.fishingDesc')}
        </Text>
      </View>

      {/* nota al pie */}
      <View style={[styles.notaPie, { marginTop: spacing.xl }]}>
        <MessageCircle size={18} color={colors.texto.secundario} />
        <Text
          style={[
            typography.pie,
            { color: colors.texto.secundario, marginLeft: spacing.s, flex: 1 },
          ]}
        >
          {t('upcoming.inquiryNote')}
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
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  header: {
    marginTop: 0,
  },
  tituloCompacto: {
    fontSize: 26,
    lineHeight: 32,
  },
  tituloAmplio: {
    fontSize: 32,
    lineHeight: 40,
  },
  tarjeta: {
    borderWidth: 1,
  },
  filaIcono: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeProximamente: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  notaPie: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
