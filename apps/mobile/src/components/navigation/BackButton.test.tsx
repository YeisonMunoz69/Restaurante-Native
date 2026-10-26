import React from 'react';
import Renderer from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { ThemeProvider } from '../../theme/ThemeContext';
import { BackButton } from './BackButton';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

// Compruebo el contrato accesible y que un regreso bloqueado no quede habilitado.
it('expone el regreso accesible con objetivo táctil de 48 dp y acción existente', () => {
  const onPress = jest.fn();
  let tree!: Renderer.ReactTestRenderer;
  Renderer.act(() => { tree = Renderer.create(<ThemeProvider><BackButton onPress={onPress} /></ThemeProvider>); });
  const button = tree.root.findByProps({ accessibilityLabel: 'common.back' });
  expect(button.props.accessibilityLabel).toBe('common.back');
  expect(button.props.accessibilityRole).toBe('button');
  const style = StyleSheet.flatten(typeof button.props.style === 'function'
    ? button.props.style({ pressed: false }) : button.props.style);
  expect(style.width).toBeGreaterThanOrEqual(48);
  expect(style.height).toBeGreaterThanOrEqual(48);
  Renderer.act(() => button.props.onPress());
  expect(onPress).toHaveBeenCalledTimes(1);
  Renderer.act(() => { tree.update(<ThemeProvider><BackButton onPress={onPress} disabled /></ThemeProvider>); });
  const disabled = tree.root.findByProps({ accessibilityLabel: 'common.back' });
  expect(disabled.props.accessibilityState.disabled).toBe(true);
  Renderer.act(() => tree.unmount());
});
