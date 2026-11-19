import React from 'react';
import Renderer from 'react-test-renderer';
import { Text } from 'react-native';
import { BottomTabNavigator } from './BottomTabNavigator';
import { ThemeProvider } from '../theme/ThemeContext';
import { DarkColors, LightColors } from '../theme/tokens';
import { pillTintOpacity } from '../components/navigation/SlidingPillTabBar';

let mockUser: { id: string } | null = null;
let mockOnline = true;
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../context/ConnectivityContext', () => ({ useOnline: () => mockOnline }));
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
  mockOnline = false;
  await Renderer.act(async () => tree.update(content()));
  expect(routes()).toEqual(['Menu', 'News', 'Settings']);
  mockOnline = true;
  mockUser = null;
  await Renderer.act(async () => tree.update(content()));
  expect(routes()).toEqual(['Menu', 'News', 'Settings']);
  Renderer.act(() => tree.unmount());
});

const rgb = (hex: string) => hex.slice(1).match(/../g)!.map(channel => parseInt(channel, 16) / 255);
const luminance = (channels: number[]) => channels
  .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  .reduce((sum, channel, i) => sum + channel * [0.2126, 0.7152, 0.0722][i], 0);

it.each([[false, LightColors], [true, DarkColors]] as const)(
  'conserva contraste de texto de al menos 4.5:1 sobre la píldora (oscuro: %s)',
  (dark, colors) => {
    const opacity = pillTintOpacity(dark);
    const accent = rgb(colors.marca.acento);
    const surface = rgb(colors.superficie.fondo);
    const tint = surface.map((value, i) => value * (1 - opacity) + accent[i] * opacity);
    const [low, high] = [luminance(tint), luminance(accent)].sort((a, b) => a - b);
    expect((high + 0.05) / (low + 0.05)).toBeGreaterThanOrEqual(4.5);
  },
);
