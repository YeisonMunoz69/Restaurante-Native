import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Switch } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { ThemeProvider } from '../../theme/ThemeContext';
import { SettingsScreen } from '../SettingsScreen';
import { Action } from '../../components/attention/Controls';
import { ConnectionForm } from '../../components/ConnectionForm';
import { BackButton } from '../../components/navigation/BackButton';

// Reemplazo traducciones por sus claves para validar la pantalla sin inicializar i18next.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Simulo el contrato de autenticación y evito llamadas de red en esta prueba.
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
const mockNavigate = jest.fn();
const mockSetParams = jest.fn();
let mockParams: { returnTo?: string } | undefined;
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({ navigate: mockNavigate, setParams: mockSetParams }),
  useRoute: () => ({ params: mockParams }),
}));

describe('SettingsScreen authentication form', () => {
  const login = jest.fn();
  const register = jest.fn();
  const logout = jest.fn();

  // Dejo la sesión como invitado para verificar los formularios de acceso.
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = undefined;
    jest.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login,
      register,
      logout,
      checkSession: jest.fn(), loginWithGoogle: jest.fn(),
    });
  });

  it('regresa a Reservas únicamente si el login fue solicitado desde ese flujo', () => {
    mockParams = { returnTo: 'Reservations' };
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'test', correo: 'prueba@example.test', rol: 'COMENSAL' },
      isAuthenticated: true, isLoading: false, login, register, logout, checkSession: jest.fn(), loginWithGoogle: jest.fn(),
    });
    let tree: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => { tree = ReactTestRenderer.create(<ThemeProvider><SettingsScreen /></ThemeProvider>); });
    expect(mockSetParams).toHaveBeenCalledWith({ returnTo: undefined });
    expect(mockNavigate).toHaveBeenCalledWith('Reservations');
    ReactTestRenderer.act(() => tree!.unmount());
  });

  // El selector espera a que termine cualquier restauración o cambio de sesión.
  it('oculta el selector de servidor mientras autenticación está trabajando', () => {
    jest
      .mocked(useAuth)
      .mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        login,
        register,
        logout,
        checkSession: jest.fn(), loginWithGoogle: jest.fn(),
      });
    let tree: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <SettingsScreen />
        </ThemeProvider>,
      );
    });
    expect(tree!.root.findAllByType(ConnectionForm)).toHaveLength(0);
    ReactTestRenderer.act(() => tree!.unmount());
  });

  it.each(['ADMIN', 'COMENSAL', 'STAFF'])(
    'muestra el acceso administrativo únicamente para ADMIN: %s',
    rol => {
      jest
        .mocked(useAuth)
        .mockReturnValue({
          user: { id: 'test', correo: 'prueba@example.test', rol },
          isAuthenticated: true,
          isLoading: false,
          login,
          register,
          logout,
          checkSession: jest.fn(), loginWithGoogle: jest.fn(),
        });
      let tree: ReactTestRenderer.ReactTestRenderer;
      ReactTestRenderer.act(() => {
        tree = ReactTestRenderer.create(
          <ThemeProvider>
            <SettingsScreen />
          </ThemeProvider>,
        );
      });
      expect(
        tree!.root
          .findAllByType(Action)
          .filter(node => node.props.label === 'attention.title'),
      ).toHaveLength(rol === 'ADMIN' ? 1 : 0);
      ReactTestRenderer.act(() => tree!.unmount());
    },
  );

  it('permite vincular Google desde una sesión ya existente', () => {
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'test', correo: 'prueba@example.test', rol: 'ADMIN', provider: 'password' },
      isAuthenticated: true, isLoading: false, login, register, logout,
      loginWithGoogle: jest.fn(), checkSession: jest.fn(),
    });
    let tree: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => { tree = ReactTestRenderer.create(<ThemeProvider><SettingsScreen /></ThemeProvider>); });
    const security = tree!.root.findAllByProps({ testID: 'settings-security' }).find(node => node.props.onPress)!;
    ReactTestRenderer.act(() => security.props.onPress());
    expect(tree!.root.findAllByProps({ testID: 'google-link' }).length).toBeGreaterThan(0);
    ReactTestRenderer.act(() => tree!.unmount());
  });

  it('abre Apariencia desde Aplicación y vuelve al índice de Ajustes', async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<ThemeProvider><SettingsScreen /></ThemeProvider>);
    });
    expect(tree.root.findAllByType(Switch)).toHaveLength(0);
    const application = tree.root.findAllByProps({ testID: 'settings-application' }).find(node => node.props.onPress)!;
    ReactTestRenderer.act(() => application.props.onPress());
    await ReactTestRenderer.act(async () => tree.root.findByType(Switch).props.onValueChange(true));
    expect(tree.root.findByType(Switch).props.value).toBe(true);
    ReactTestRenderer.act(() => tree.root.findByType(BackButton).props.onPress());
    expect(tree.root.findAllByType(Switch)).toHaveLength(0);
    ReactTestRenderer.act(() => tree.unmount());
  });
});
