import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TextInput } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { ThemeProvider } from '../../theme/ThemeContext';
import { SettingsScreen } from '../SettingsScreen';
import { Action } from '../../components/attention/Controls';
import { ConnectionForm } from '../../components/ConnectionForm';

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
      checkSession: jest.fn(),
    });
  });

  it('regresa a Reservas únicamente si el login fue solicitado desde ese flujo', () => {
    mockParams = { returnTo: 'Reservations' };
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'test', correo: 'prueba@example.test', rol: 'COMENSAL' },
      isAuthenticated: true, isLoading: false, login, register, logout, checkSession: jest.fn(),
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
        checkSession: jest.fn(),
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
          checkSession: jest.fn(),
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

  // Compruebo que el inicio de sesión envíe credenciales válidas al contexto.
  it('submits validated login credentials', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <SettingsScreen />
        </ThemeProvider>,
      );
    });

    const fields = tree!.root.findAllByType(TextInput);
    ReactTestRenderer.act(() => {
      fields
        .find(field => field.props.accessibilityLabel === 'auth.email')!
        .props.onChangeText('persona@ejemplo.com');
      fields
        .find(field => field.props.accessibilityLabel === 'auth.password')!
        .props.onChangeText('Clave-segura-123');
    });
    const submit = tree!.root.findByProps({
      testID: 'auth-submit',
    }) as ReactTestRenderer.ReactTestInstance;
    await ReactTestRenderer.act(async () => {
      await submit.props.onPress();
    });

    expect(login).toHaveBeenCalledWith({
      correo: 'persona@ejemplo.com',
      password: 'Clave-segura-123',
    });
    ReactTestRenderer.act(() => tree!.unmount());
  });

  // Compruebo que el modo registro solicite y valide los cuatro datos requeridos.
  it('switches to registration and submits the shared schema fields', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <SettingsScreen />
        </ThemeProvider>,
      );
    });

    const toggle = tree!.root.findByProps({
      testID: 'auth-toggle-mode',
    }) as ReactTestRenderer.ReactTestInstance;
    ReactTestRenderer.act(() => toggle.props.onPress());
    const fields = tree!.root.findAllByType(TextInput);
    const values = {
      'auth.name': 'María Ejemplo',
      'auth.email': 'persona@ejemplo.com',
      'auth.phone': '3001234567',
      'auth.password': 'Clave-segura-123',
    };
    ReactTestRenderer.act(() => {
      for (const [label, value] of Object.entries(values)) {
        fields
          .find(field => field.props.accessibilityLabel === label)!
          .props.onChangeText(value);
      }
    });
    const submit = tree!.root.findByProps({
      testID: 'auth-submit',
    }) as ReactTestRenderer.ReactTestInstance;
    await ReactTestRenderer.act(async () => {
      await submit.props.onPress();
    });

    expect(register).toHaveBeenCalledWith({
      nombre: 'María Ejemplo',
      correo: 'persona@ejemplo.com',
      telefono: '3001234567',
      password: 'Clave-segura-123',
    });
    ReactTestRenderer.act(() => tree!.unmount());
  });
});
