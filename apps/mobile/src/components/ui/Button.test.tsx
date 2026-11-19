import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Renderer from 'react-test-renderer';
import { ThemeProvider, useTheme } from '../../theme/ThemeContext';
import { DarkColors, LightColors } from '../../theme/tokens';
import { Button } from './Button';

it('centra la etiqueta y usa la paleta correcta al cambiar de tema', async () => {
  let tree!: Renderer.ReactTestRenderer;
  let theme!: ReturnType<typeof useTheme>;
  const Actions = () => {
    theme = useTheme();
    return <>
      <Button variant="primary" label="Guardar" onPress={jest.fn()} />
      <Button label="Otra opción" onPress={jest.fn()} />
      <Button variant="tertiary" label="Volver" onPress={jest.fn()} />
    </>;
  };
  await Renderer.act(async () => {
    tree = Renderer.create(<ThemeProvider><Actions /></ThemeProvider>);
  });

  // Compruebo los colores del control y el texto al montar cada opción de la paleta.
  function expectPalette(colors: typeof LightColors) {
    const controls = tree.root.findAll(node => typeof node.type === 'string' && node.props.accessibilityRole === 'button');
    const fills = controls.map(node => StyleSheet.flatten(node.props.style).backgroundColor);
    expect(fills).toEqual([colors.marca.acento, colors.superficie.elevada, 'transparent']);
    const labels = tree.root.findAllByType(Text).map(node => StyleSheet.flatten(node.props.style));
    expect(labels.map(style => style.textAlign)).toEqual(['center', 'center', 'center']);
    expect(labels.map(style => style.color)).toEqual([colors.texto.inverso, colors.texto.primario, colors.marca.primario]);
  }

  expectPalette(LightColors);
  await Renderer.act(async () => theme.setThemeMode('dark'));
  expectPalette(DarkColors);
  Renderer.act(() => tree.unmount());
});
