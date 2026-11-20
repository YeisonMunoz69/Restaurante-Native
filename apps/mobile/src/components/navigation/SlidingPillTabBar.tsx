import React, { useEffect, useRef, useState } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { AccessibilityInfo, Animated, I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

// Mantengo el texto de acento por encima de 4.5:1 en ambos temas.
export const pillTintOpacity = (isDark: boolean) => isDark ? 0.16 : 0.04;

export function SlidingPillTabBar({ state, descriptors, navigation, height }: BottomTabBarProps & { height: number }) {
  const { colors, typography, radii, isDark } = useTheme();
  const { bottom, left, right } = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(true);
  const offset = useRef(new Animated.Value(0)).current;
  const previousSlot = useRef(0);
  const slot = width / state.routes.length;
  const target = state.index * slot * (I18nManager.isRTL ? -1 : 1);

  useEffect(() => {
    let current = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (current) setReduceMotion(value);
    }).catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { current = false; listener.remove(); };
  }, []);

  useEffect(() => {
    const resized = previousSlot.current !== slot;
    previousSlot.current = slot;
    if (reduceMotion || resized) {
      offset.setValue(target);
      return;
    }
    const animation = Animated.spring(offset, {
      toValue: target, damping: 17, stiffness: 235, mass: 0.8, useNativeDriver: true,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [offset, reduceMotion, slot, target]);

  return (
    <View style={[styles.bar, {
      backgroundColor: colors.superficie.fondo, borderColor: colors.superficie.borde,
      paddingBottom: bottom, paddingLeft: left + 10, paddingRight: right + 10,
    }]}>
      <View
        accessibilityRole="tablist"
        onLayout={event => setWidth(event.nativeEvent.layout.width)}
        style={[styles.row, { minHeight: height }]}
      >
        {slot > 0 && (
          <Animated.View
            testID="sliding-tab-pill"
            pointerEvents="none"
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            style={[styles.pill, {
              width: slot - 8,
              backgroundColor: colors.superficie.fondo, borderRadius: radii.l,
              borderColor: colors.superficie.borde, shadowColor: colors.texto.primario,
              transform: [{ translateX: offset }],
            }]}
          >
            <View style={[StyleSheet.absoluteFill, {
              backgroundColor: colors.marca.acento, opacity: pillTintOpacity(isDark), borderRadius: radii.l,
            }]} />
          </Animated.View>
        )}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const selected = index === state.index;
          const color = selected ? colors.marca.acento : colors.texto.secundario;
          const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? route.name;
          return (
            <Pressable
              key={route.key}
              testID={options.tabBarButtonTestID}
              accessibilityRole="tab"
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              accessibilityState={{ selected }}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!selected && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            >
              {options.tabBarIcon?.({ focused: selected, color, size: 21 })}
              <Text style={[typography.pie, styles.label, { color, fontWeight: selected ? '700' : '500' }]}
                numberOfLines={2}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth, zIndex: 1 },
  row: { flexDirection: 'row', paddingVertical: 6 },
  tab: { flex: 1, minHeight: 48, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 3, zIndex: 1 },
  label: { textAlign: 'center', paddingHorizontal: 2 },
  pressed: { opacity: 0.68 },
  pill: {
    position: 'absolute', start: 4, top: 2, bottom: 6, borderWidth: StyleSheet.hairlineWidth,
    elevation: 3, shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
});
