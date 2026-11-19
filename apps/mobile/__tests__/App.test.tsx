/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

// Aíslo el arranque de la app para no montar pantallas que llaman servicios reales.
let mockUser: { id: string } | null = null;
jest.mock('../src/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ user: mockUser }),
}));

// Mantengo la prueba centrada en proveedores y estructura raíz, sin navegación de red.
jest.mock('../src/navigation/BottomTabNavigator', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BottomTabNavigator: () =>
      React.createElement(View, { testID: 'bottom-tabs' }),
  };
});

test('bloquea las pestañas hasta que exista una sesión y vuelve al acceso al salir', async () => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  // Renderizo la raíz aislada y verifico que incluya el navegador principal.
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<App />);
  });

  expect(tree!.root.findAllByProps({ testID: 'bottom-tabs' })).toHaveLength(0);
  expect(tree!.root.findAllByProps({ testID: 'google-access' }).length).toBeGreaterThan(0);
  mockUser = { id: 'comensal' };
  await ReactTestRenderer.act(async () => { tree!.update(<App />); });
  expect(tree!.root.findAllByProps({ testID: 'bottom-tabs' }).length).toBeGreaterThan(0);
  mockUser = null;
  await ReactTestRenderer.act(async () => { tree!.update(<App />); });
  expect(tree!.root.findAllByProps({ testID: 'bottom-tabs' })).toHaveLength(0);
  ReactTestRenderer.act(() => tree!.unmount());
});
