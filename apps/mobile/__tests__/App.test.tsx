/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

// Aíslo el arranque de la app para no montar pantallas que llaman servicios reales.
jest.mock('../src/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ user: null }),
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

test('renders the application providers and navigation root', async () => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  // Renderizo la raíz aislada y verifico que incluya el navegador principal.
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<App />);
  });

  expect(tree!.root.findByProps({ testID: 'bottom-tabs' })).toBeTruthy();
  ReactTestRenderer.act(() => tree!.unmount());
});
