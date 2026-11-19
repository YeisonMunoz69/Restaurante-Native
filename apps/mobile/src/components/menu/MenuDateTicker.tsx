import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

// Desplazo toda la fecha de derecha a izquierda con velocidad constante.
export function MenuDateTicker({ label, active }: { label: string; active: boolean }) {
  const { colors, typography } = useTheme();
  const offset = useRef(new Animated.Value(0)).current;
  const [viewportWidth, setViewportWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(true);
  const canAnimate = active && !reduceMotion && viewportWidth > 0;
  const moving = canAnimate && textWidth > 0;

  useEffect(() => {
    let current = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (current) setReduceMotion(value);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      current = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!moving) return;
    offset.setValue(viewportWidth);
    const animation = Animated.loop(Animated.timing(offset, {
      toValue: -textWidth,
      duration: Math.round((viewportWidth + textWidth) / 28 * 1000),
      easing: Easing.linear,
      useNativeDriver: true,
      isInteraction: false,
    }));
    animation.start();
    return () => animation.stop();
  }, [moving, offset, textWidth, viewportWidth]);

  const textStyle = [typography.pie, { color: colors.texto.primario }];
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={styles.viewport}
      onLayout={event => setViewportWidth(event.nativeEvent.layout.width)}
    >
      {/* Dejo una línea fija para medir la altura con el tamaño de letra del usuario. */}
      <Text
        importantForAccessibility="no"
        accessibilityElementsHidden
        numberOfLines={1}
        style={[textStyle, moving && styles.hidden]}
      >
        {label}
      </Text>
      {canAnimate && (
        <Animated.View
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={[styles.track, {
            width: viewportWidth * 4,
            transform: [{ translateX: offset }],
            opacity: moving ? 1 : 0,
          }]}
        >
          <Text
            onLayout={event => setTextWidth(event.nativeEvent.layout.width)}
            numberOfLines={1}
            style={[textStyle, styles.label]}
          >
            {label}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1, overflow: 'hidden' },
  hidden: { opacity: 0 },
  track: { position: 'absolute', left: 0, top: 0 },
  label: { alignSelf: 'flex-start' },
});
