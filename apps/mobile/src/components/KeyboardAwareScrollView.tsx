import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
} from 'react-native';

// Mantengo los formularios desplazables y la acción principal en el mismo contenido al abrir el teclado.
export function KeyboardAwareScrollView({
  children,
  ...scrollViewProps
}: ScrollViewProps) {
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        {...scrollViewProps}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
