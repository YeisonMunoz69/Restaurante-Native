import React from 'react';
import Renderer from 'react-test-renderer';
import { ConnectionProvider, useConnection } from '../ConnectionContext';
import {
  DEFAULT_CONNECTION,
  loadConnection,
  saveConnection,
  type ConnectionSettings,
} from '../../config/connection';
import { ThemeProvider } from '../../theme/ThemeContext';
import { SettingsScreen } from '../../screens/SettingsScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), setParams: jest.fn() }),
  useRoute: () => ({ params: undefined }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('../../config/connection', () => ({
  ...jest.requireActual('../../config/connection'),
  loadConnection: jest.fn(),
  saveConnection: jest.fn(),
}));
const mockLogin = jest.fn();
jest.mock('../AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: mockLogin,
    register: jest.fn(),
    logout: jest.fn(),
  }),
}));

// Intercalo las promesas de almacenamiento para reproducir la carrera con el login.
it('espera restauración, bloquea login mientras guarda y no acepta dos guardados simultáneos', async () => {
  let finishLoad!: (value: ConnectionSettings) => void;
  let finishSave!: (value: ConnectionSettings) => void;
  jest.mocked(loadConnection).mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finishLoad = resolve;
      }),
  );
  jest.mocked(saveConnection).mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finishSave = resolve;
      }),
  );
  let connection!: ReturnType<typeof useConnection>;
  const Probe = () => {
    connection = useConnection();
    return <SettingsScreen />;
  };
  let tree!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {
    tree = Renderer.create(
      <ThemeProvider>
        <ConnectionProvider>
          <Probe />
        </ConnectionProvider>
      </ThemeProvider>,
    );
  });
  expect(tree.root.findAllByType(Probe)).toHaveLength(0);
  await Renderer.act(async () => finishLoad(DEFAULT_CONNECTION));
  let pending!: Promise<void>;
  await Renderer.act(async () => {
    pending = connection.save(
      { ...DEFAULT_CONNECTION, environment: 'dev' },
      false,
    );
  });
  expect(connection.isSaving).toBe(true);
  const submit = tree.root.findByProps({ testID: 'auth-submit' });
  expect(submit.props.disabled).toBe(true);
  await Renderer.act(async () => {
    await submit.props.onPress();
  });
  expect(mockLogin).not.toHaveBeenCalled();
  await expect(connection.save(DEFAULT_CONNECTION, false)).rejects.toThrow(
    'se está guardando',
  );
  expect(saveConnection).toHaveBeenCalledTimes(1);
  await Renderer.act(async () => {
    finishSave({ ...DEFAULT_CONNECTION, environment: 'dev' });
    await pending;
  });
  expect(connection.isSaving).toBe(false);
  expect(connection.settings.environment).toBe('dev');
  Renderer.act(() => tree.unmount());
});
