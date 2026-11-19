import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { ThemeProvider } from '../../theme/ThemeContext';
import { SettingsScreen } from '../SettingsScreen';
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
      checkSession: jest.fn(), loginWithGoogle: jest.fn(), updateProfile: jest.fn(),
    });
  });

  it('regresa a Reservas únicamente si el login fue solicitado desde ese flujo', () => {
    mockParams = { returnTo: 'Reservations' };
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'test', correo: 'prueba@example.test', rol: 'COMENSAL' },
      isAuthenticated: true, isLoading: false, login, register, logout, checkSession: jest.fn(), loginWithGoogle: jest.fn(), updateProfile: jest.fn(),
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
        checkSession: jest.fn(), loginWithGoogle: jest.fn(), updateProfile: jest.fn(),
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
    'muestra las opciones del rol %s dentro de su grupo',
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
          checkSession: jest.fn(), loginWithGoogle: jest.fn(), updateProfile: jest.fn(),
        });
      let tree: ReactTestRenderer.ReactTestRenderer;
      ReactTestRenderer.act(() => {
        tree = ReactTestRenderer.create(
          <ThemeProvider>
            <SettingsScreen />
          </ThemeProvider>,
        );
      });
      const hasEntry = (id: string) => tree!.root
        .findAllByProps({ testID: `settings-${id}` })
        .some(node => node.props.onPress);
      expect(hasEntry('attention')).toBe(rol === 'ADMIN');
      expect(hasEntry('reservations')).toBe(rol === 'ADMIN' || rol === 'STAFF');
      ReactTestRenderer.act(() => tree!.unmount());
    },
  );

  it('permite vincular Google desde una sesión ya existente', () => {
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'test', correo: 'prueba@example.test', rol: 'ADMIN', provider: 'password' },
      isAuthenticated: true, isLoading: false, login, register, logout,
      loginWithGoogle: jest.fn(), updateProfile: jest.fn(), checkSession: jest.fn(),
    });
    let tree: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => { tree = ReactTestRenderer.create(<ThemeProvider><SettingsScreen /></ThemeProvider>); });
    const security = tree!.root.findAllByProps({ testID: 'settings-security' }).find(node => node.props.onPress)!;
    ReactTestRenderer.act(() => security.props.onPress());
    expect(tree!.root.findAllByProps({ testID: 'google-link' }).length).toBeGreaterThan(0);
    ReactTestRenderer.act(() => tree!.unmount());
  });

  it('muestra la sesión de Google y actualiza el resumen de apariencia al volver', async () => {
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'test', correo: 'prueba@example.test', nombre: 'Lucía Campos', rol: 'COMENSAL', provider: 'google' },
      isAuthenticated: true, isLoading: false, login, register, logout,
      loginWithGoogle: jest.fn(), updateProfile: jest.fn(), checkSession: jest.fn(),
    });
    let tree!: ReactTestRenderer.ReactTestRenderer;
    const shows = (label: string) => tree.root.findAllByType(Text).some(node => node.props.children === label);
    const entry = (id: string) => tree.root.findAllByProps({ testID: id }).find(node => node.props.onPress);
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<ThemeProvider><SettingsScreen /></ThemeProvider>);
    });
    expect(shows('Lucía Campos')).toBe(true);
    expect(shows('settings.googleConnected')).toBe(true);
    expect(shows('settings.themeLight')).toBe(true);
    ReactTestRenderer.act(() => entry('settings-application')!.props.onPress());
    expect(entry('appearance-light')!.props.accessibilityState.checked).toBe(true);
    await ReactTestRenderer.act(async () => entry('appearance-dark')!.props.onPress());
    expect(entry('appearance-dark')!.props.accessibilityState.checked).toBe(true);
    ReactTestRenderer.act(() => tree.root.findByType(BackButton).props.onPress());
    expect(entry('appearance-dark')).toBeUndefined();
    expect(shows('settings.themeDark')).toBe(true);
    expect(shows('settings.themeLight')).toBe(false);
    ReactTestRenderer.act(() => tree.unmount());
  });
});
