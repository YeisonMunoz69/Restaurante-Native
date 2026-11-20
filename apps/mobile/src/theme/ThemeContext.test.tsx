import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Renderer from 'react-test-renderer';
import { ThemeProvider, useTheme } from './ThemeContext';

it('abre en claro y conserva la elección al volver a montar la aplicación', async () => {
  await AsyncStorage.clear();
  let theme!: ReturnType<typeof useTheme>;
  let tree!: Renderer.ReactTestRenderer;

  // Leo la preferencia desde el mismo proveedor que usa el acceso y las pestañas.
  const Probe = () => {
    theme = useTheme();
    return null;
  };
  const mount = async () => {
    await Renderer.act(async () => {
      tree = Renderer.create(<ThemeProvider><Probe /></ThemeProvider>);
    });
  };

  await mount();
  expect(theme.isThemeReady).toBe(true);
  expect(theme.isDark).toBe(false);

  await Renderer.act(async () => theme.setThemeMode('dark'));
  expect(theme.isDark).toBe(true);
  Renderer.act(() => tree.unmount());

  await mount();
  expect(theme.isDark).toBe(true);
  await Renderer.act(async () => theme.setThemeMode('light'));
  Renderer.act(() => tree.unmount());

  await mount();
  expect(theme.isDark).toBe(false);
  Renderer.act(() => tree.unmount());
});

it('fija el claro como invitado y recupera la preferencia solo para su cuenta', async () => {
  await AsyncStorage.clear();
  let theme!: ReturnType<typeof useTheme>;
  let tree!: Renderer.ReactTestRenderer;
  const Probe = () => { theme = useTheme(); return null; };
  const content = (accountKey: string | null) => <ThemeProvider accountKey={accountKey}><Probe /></ThemeProvider>;
  await Renderer.act(async () => { tree = Renderer.create(content('dev/u1')); });
  await Renderer.act(async () => theme.setThemeMode('dark'));
  expect(theme.isDark).toBe(true);
  await Renderer.act(async () => tree.update(content(null)));
  await Renderer.act(async () => theme.setThemeMode('dark'));
  expect(theme.isDark).toBe(false);
  await Renderer.act(async () => tree.update(content('dev/u2')));
  expect(theme.isDark).toBe(false);
  await Renderer.act(async () => tree.update(content('dev/u1')));
  expect(theme.isDark).toBe(true);
  Renderer.act(() => tree.unmount());
});
