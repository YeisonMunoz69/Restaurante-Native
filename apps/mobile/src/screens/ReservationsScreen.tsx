import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { CalendarCheck, Plus } from 'lucide-react-native';

// pantalla de mis reservas donde el comensal ve el estado de sus solicitudes
export const ReservationsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors, typography, spacing, radii } = useTheme();
  const { width } = useWindowDimensions();

  return (
    <ScrollView
      style={[styles.contenedor, { backgroundColor: colors.superficie.fondo }]}
      contentContainerStyle={[
        styles.scrollContent,
        {
          padding: spacing.margenLateral,
          paddingTop: spacing.xxxl,
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
          {t('reservations.title')}
        </Text>
        <Text
          style={[
            typography.cuerpoM,
            { color: colors.texto.secundario, marginTop: 4 },
          ]}
        >
          {t('reservations.subtitle')}
        </Text>
      </View>

      {/* boton principal para crear nueva reserva */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.btnNuevaReserva,
          {
            backgroundColor: colors.marca.primario,
            borderRadius: radii.m,
            padding: spacing.l,
            marginTop: spacing.l,
          },
        ]}
      >
        <Plus size={20} color={colors.texto.inverso} />
        <Text
          style={[
            typography.cuerpoL,
            {
              color: colors.texto.inverso,
              fontWeight: '600',
              marginLeft: spacing.s,
            },
          ]}
        >
          {t('reservations.btnNewReservation')}
        </Text>
      </TouchableOpacity>

      {/* estado vacio ilustrado con componentes limpios */}
      <View
        style={[
          styles.estadoVacio,
          {
            backgroundColor: colors.superficie.elevada,
            borderColor: colors.superficie.borde,
            borderRadius: radii.l,
            padding: spacing.xxl,
            marginTop: spacing.xxl,
          },
        ]}
      >
        <CalendarCheck size={48} color={colors.texto.secundario} />
        <Text
          style={[
            typography.tituloM,
            {
              color: colors.texto.primario,
              marginTop: spacing.l,
              textAlign: 'center',
            },
          ]}
        >
          {t('reservations.emptyUpcoming')}
        </Text>
        <Text
          style={[
            typography.cuerpoM,
            {
              color: colors.texto.secundario,
              marginTop: spacing.s,
              textAlign: 'center',
            },
          ]}
        >
          Cuando solicites una mesa para ti o tu familia, podrás seguir la
          confirmación del dueño aquí.
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
  btnNuevaReserva: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  estadoVacio: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
