import React from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  UIManager,
  View,
  requireNativeComponent,
  type ModalProps,
  type ViewProps,
} from 'react-native';

const supportsBlur = Platform.OS === 'ios' || (Platform.OS === 'android' && Number(Platform.Version) >= 31);
const NativeBackdrop = supportsBlur && UIManager.hasViewManagerConfig?.('EncantoBackdrop')
  ? requireNativeComponent<ViewProps>('EncantoBackdrop')
  : null;

// Comparto el fondo de los diálogos y dejo que cada uno decida cómo cierra.
export function OverlayModal({ children, animationType = 'fade', ...props }: ModalProps) {
  return (
    <Modal
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      hardwareAccelerated
      animationType={animationType}
      {...props}
    >
      <View style={styles.frame}>
        <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={styles.backdrop}>
          {!!NativeBackdrop && <NativeBackdrop style={styles.backdrop} />}
          <View style={[styles.backdrop, NativeBackdrop ? styles.tint : styles.fallback]} />
        </View>
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFill },
  tint: { backgroundColor: 'rgba(0,0,0,0.32)' },
  fallback: { backgroundColor: 'rgba(0,0,0,0.62)' },
});
