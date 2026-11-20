/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Modal } from 'react-native';
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
  const { Pressable, View } = require('react-native');
  const { useGuestAccess } = require('../src/context/GuestAccessContext');
  return {
    BottomTabNavigator: () => {
      const request = useGuestAccess();
      return React.createElement(View, { testID: 'bottom-tabs' },
        React.createElement(Pressable, { testID: 'mock-guest-add', onPress: () => request('cart') }));
    },
  };
});

test('abre las pestañas como invitado y presenta Google solo cuando se pide', async () => {
  let tree: ReactTestRenderer.ReactTestRenderer;

  // Renderizo la raíz aislada y verifico que incluya el navegador principal.
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<App />);
  });

  expect(tree!.root.findAllByProps({ testID: 'bottom-tabs' }).length).toBeGreaterThan(0);
  expect(tree!.root.findAllByProps({ testID: 'google-access' })).toHaveLength(0);
  const open = () => tree!.root.findAllByProps({ testID: 'mock-guest-add' }).find(node => node.props.onPress)!.props.onPress();
  ReactTestRenderer.act(open);
  expect(tree!.root.findAllByProps({ testID: 'guest-access-modal' }).length).toBeGreaterThan(0);
  ReactTestRenderer.act(() => tree!.root.findByType(Modal).props.onRequestClose());
  expect(tree!.root.findAllByProps({ testID: 'guest-access-modal' })).toHaveLength(0);
  ReactTestRenderer.act(open);
  mockUser = { id: 'comensal' };
  await ReactTestRenderer.act(async () => { tree!.update(<App />); });
  expect(tree!.root.findAllByProps({ testID: 'guest-access-modal' })).toHaveLength(0);
  expect(tree!.root.findAllByProps({ testID: 'bottom-tabs' }).length).toBeGreaterThan(0);
  mockUser = null;
  await ReactTestRenderer.act(async () => { tree!.update(<App />); });
  expect(tree!.root.findAllByProps({ testID: 'bottom-tabs' }).length).toBeGreaterThan(0);
  expect(tree!.root.findAllByProps({ testID: 'guest-access-modal' })).toHaveLength(0);
  ReactTestRenderer.act(() => tree!.unmount());
});
