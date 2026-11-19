import React from 'react';
import { AppState, View, type AppStateStatus } from 'react-native';
import Renderer from 'react-test-renderer';
import { GuestAccessProvider } from './GuestAccessContext';
import { ThemeProvider } from '../theme/ThemeContext';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('../components/GoogleAccess', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { GoogleAccess: () => React.createElement(View, { testID: 'guest-modal-test' }) };
});

let tree: Renderer.ReactTestRenderer;
let stateChanged: (state: AppStateStatus) => void;
const originalAppState = AppState.currentState;
const app = (authenticated = false) => (
  <ThemeProvider accountKey={null}>
    <GuestAccessProvider authenticated={authenticated}><View /></GuestAccessProvider>
  </ThemeProvider>
);
const nodes = (testID: string) => tree.root.findAllByProps({ testID });
const tick = (ms: number) => Renderer.act(() => { jest.advanceTimersByTime(ms); });

beforeEach(() => {
  jest.useFakeTimers();
  AppState.currentState = 'active';
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
    stateChanged = handler as (state: AppStateStatus) => void;
    return { remove: jest.fn() };
  });
  Renderer.act(() => { tree = Renderer.create(app()); });
});
afterEach(() => {
  Renderer.act(() => tree?.unmount());
  AppState.currentState = originalAppState;
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it('muestra un aviso al pasar tres minutos y permite cerrarlo antes del próximo', () => {
  tick(179999);
  expect(nodes('guest-sign-in-reminder')).toHaveLength(0);
  tick(1);
  expect(nodes('guest-sign-in-reminder').length).toBeGreaterThan(0);
  expect(nodes('guest-modal-test')).toHaveLength(0);

  Renderer.act(() => nodes('guest-reminder-dismiss').find(node => node.props.onPress)!.props.onPress());
  expect(nodes('guest-sign-in-reminder')).toHaveLength(0);
  tick(180000);
  expect(nodes('guest-sign-in-reminder').length).toBeGreaterThan(0);
  tick(15000);
  expect(nodes('guest-sign-in-reminder')).toHaveLength(0);
});

it('espera tras volver del fondo y deja de recordar cuando el usuario entra', () => {
  tick(100000);
  Renderer.act(() => stateChanged('background'));
  tick(360000);
  expect(nodes('guest-sign-in-reminder')).toHaveLength(0);
  Renderer.act(() => stateChanged('active'));
  tick(179999);
  expect(nodes('guest-sign-in-reminder')).toHaveLength(0);
  tick(1);
  Renderer.act(() => nodes('guest-reminder-open').find(node => node.props.onPress)!.props.onPress());
  expect(nodes('guest-modal-test').length).toBeGreaterThan(0);
  expect(nodes('guest-sign-in-reminder')).toHaveLength(0);

  Renderer.act(() => tree.update(app(true)));
  tick(360000);
  expect(nodes('guest-modal-test')).toHaveLength(0);
  expect(nodes('guest-sign-in-reminder')).toHaveLength(0);
});
