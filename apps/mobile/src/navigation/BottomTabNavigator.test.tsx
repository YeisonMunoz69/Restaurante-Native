import React from 'react';
import Renderer from 'react-test-renderer';
import { Text } from 'react-native';
import { BottomTabNavigator } from './BottomTabNavigator';
import { ThemeProvider } from '../theme/ThemeContext';

let mockUser: { id: string } | null = null;
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@react-navigation/bottom-tabs', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { createBottomTabNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ name }: { name: string }) => React.createElement(Text, null, name),
  }) };
});

it('muestra tres destinos públicos y registra las pestañas privadas solo con sesión', async () => {
  let tree!: Renderer.ReactTestRenderer;
  const content = () => <ThemeProvider><BottomTabNavigator /></ThemeProvider>;
  const routes = () => tree.root.findAllByType(Text).map(node => node.props.children);
  await Renderer.act(async () => { tree = Renderer.create(content()); });
  expect(routes()).toEqual(['Menu', 'News', 'Settings']);
  mockUser = { id: 'comensal' };
  await Renderer.act(async () => tree.update(content()));
  expect(routes()).toEqual(['Menu', 'Reservations', 'News', 'Upcoming', 'Settings']);
  mockUser = null;
  await Renderer.act(async () => tree.update(content()));
  expect(routes()).toEqual(['Menu', 'News', 'Settings']);
  Renderer.act(() => tree.unmount());
});
