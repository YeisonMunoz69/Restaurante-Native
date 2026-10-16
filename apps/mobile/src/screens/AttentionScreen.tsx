import React, { useEffect, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarRestaurantSchema } from '@encanto/shared';
import { useAuth } from '../context/AuthContext';
import { useConnection } from '../context/ConnectionContext';
import { useTheme } from '../theme/ThemeContext';
import { Action, Note } from '../components/attention/Controls';
import { CalendarPanel } from '../components/attention/CalendarPanel';
import { AvailabilityPanel } from '../components/attention/AvailabilityPanel';
import { ConnectionForm } from '../components/ConnectionForm';

// Mantengo las cinco pestañas y protejo también el acceso visual administrativo.
export function AttentionScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { settings } = useConnection();
  const { colors } = useTheme();
  const [configure, setConfigure] = useState(false);
  const [tab, setTab] = useState<'calendar' | 'availability'>('calendar');
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [onBack]);
  if (user?.rol !== 'ADMIN') return <Note>{t('attention.forbidden')}</Note>;
  const configured = CalendarRestaurantSchema.safeParse({
    restauranteId: settings.restauranteId,
  }).success;
  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.superficie.fondo }]}
    >
      <ScrollView
        style={{ backgroundColor: colors.superficie.fondo }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        // Conservo las vistas al alternar formularios para que Android no deje controles recortados.
        removeClippedSubviews={false}
      >
        <Action label={t('attention.back')} onPress={onBack} />
        <Note>{t('attention.title')}</Note>
        <Action
          label={t('attention.configure')}
          onPress={() => setConfigure(!configure)}
        />
        {(!configured || configure) && <ConnectionForm authenticated />}
        {configured ? (
          <>
            <Action
              label={t('attention.calendarTab')}
              selected={tab === 'calendar'}
              onPress={() => setTab('calendar')}
            />
            <Action
              label={t('attention.availabilityTab')}
              selected={tab === 'availability'}
              onPress={() => setTab('availability')}
            />
            {/* Separo el árbol nativo de cada formulario para no reutilizar controles del otro panel. */}
            <View key={`${tab}:${settings.restauranteId}`} collapsable={false}>
              {tab === 'calendar' ? (
                <CalendarPanel restauranteId={settings.restauranteId} />
              ) : (
                <AvailabilityPanel restauranteId={settings.restauranteId} />
              )}
            </View>
          </>
        ) : (
          <Note>{t('attention.configureRestaurant')}</Note>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
});
