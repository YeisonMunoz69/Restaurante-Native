import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TextInput } from 'react-native';
import { ThemeProvider } from '../../theme/ThemeContext';
import { Action, Note } from '../../components/attention/Controls';
import { useAuth } from '../../context/AuthContext';
import { useConnection } from '../../context/ConnectionContext';
import { adminMenuApi } from '../../services/admin-menu.service';
import { MenuAdminScreen } from '../MenuAdminScreen';

const mockTranslate = (key: string) => key;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockTranslate }),
}));

jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../context/ConnectionContext', () => ({ useConnection: jest.fn() }));
jest.mock('../../services/admin-menu.service', () => ({
  adminMenuApi: {
    categories: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    dishes: jest.fn(),
    createDish: jest.fn(),
    tags: jest.fn(),
  },
}));

const api = jest.mocked(adminMenuApi);
const restaurantId = '00000000-0000-4000-8000-000000000011';
const categoryId = '00000000-0000-4000-8000-000000000012';

describe('MenuAdminScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'admin-id', correo: 'admin@example.test', rol: 'ADMIN' },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      checkSession: jest.fn(),
    });
    jest.mocked(useConnection).mockReturnValue({
      settings: { environment: 'dev', localUrl: '', restauranteId: restaurantId },
      isSaving: false,
      save: jest.fn(),
    });
    api.categories.mockResolvedValue([
      { id: categoryId, nombre: 'Entradas', orden: 0, activa: true, cantidadPlatos: 1 },
    ]);
    api.dishes.mockResolvedValue([]);
    api.tags.mockResolvedValue([]);
  });

  it('permite crear y reordenar categorías usando el servicio autenticado', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider><MenuAdminScreen onBack={jest.fn()} /></ThemeProvider>,
      );
    });
    const fields = tree!.root.findAllByType(TextInput);
    ReactTestRenderer.act(() => {
      fields.find(field => field.props.accessibilityLabel === 'menuAdmin.categoryName')!.props.onChangeText('Entradas frías');
      fields.find(field => field.props.accessibilityLabel === 'menuAdmin.order')!.props.onChangeText('2');
    });
    await ReactTestRenderer.act(async () => {
      await tree!.root.findAllByType(Action).find(action => action.props.label === 'menuAdmin.createCategory')!.props.onPress();
    });
    expect(api.createCategory).toHaveBeenCalledWith(restaurantId, { nombre: 'Entradas frías', orden: 2 });

    const categoryName = tree!.root.findAllByType(TextInput).filter(field => field.props.accessibilityLabel === 'menuAdmin.categoryName')[1];
    ReactTestRenderer.act(() => categoryName!.props.onChangeText('Entradas principales'));
    await ReactTestRenderer.act(async () => {
      await tree!.root.findAllByType(Action).find(action => action.props.label === 'menuAdmin.saveCategory')!.props.onPress();
    });
    expect(api.updateCategory).toHaveBeenCalledWith(restaurantId, categoryId, {
      nombre: 'Entradas principales',
      orden: 0,
    });
    ReactTestRenderer.act(() => tree!.unmount());
  });

  it('no presenta las acciones administrativas a otros roles', () => {
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 'diner-id', correo: 'diner@example.test', rol: 'COMENSAL' },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      checkSession: jest.fn(),
    });
    let tree: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <ThemeProvider><MenuAdminScreen onBack={jest.fn()} /></ThemeProvider>,
      );
    });
    expect(tree!.root.findAllByType(Note).some(note => note.props.children === 'menuAdmin.forbidden')).toBe(true);
    expect(tree!.root.findAllByType(Action)).toHaveLength(0);
    ReactTestRenderer.act(() => tree!.unmount());
  });

  it('abre el formulario y crea otro plato cuando la carta ya contiene platos', async () => {
    const existing = {
      id: '00000000-0000-4000-8000-000000000013',
      categoryId,
      nombre: 'Entrada existente',
      slug: 'entrada-existente',
      descripcionBreve: null,
      descripcion: 'Entrada de la carta',
      precio: 12000,
      alergenos: null,
      disponible: true,
      activo: true,
      destacado: false,
      orden: 0,
      category: { id: categoryId, nombre: 'Entradas', activa: true },
      photos: [],
      etiquetasIds: [],
    };
    api.dishes.mockResolvedValue([existing]);
    api.createDish.mockResolvedValue({ ...existing, id: '00000000-0000-4000-8000-000000000014' });
    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider><MenuAdminScreen onBack={jest.fn()} /></ThemeProvider>,
      );
    });
    const press = (label: string) => tree!.root.findAllByType(Action)
      .find(action => action.props.label === label)!.props.onPress();
    ReactTestRenderer.act(() => press('menuAdmin.dishes'));
    expect(tree!.root.findAllByType(TextInput)).toHaveLength(0);
    ReactTestRenderer.act(() => press('menuAdmin.newDish'));
    const change = (label: string, value: string) => tree!.root.findAllByType(TextInput)
      .find(field => field.props.accessibilityLabel === label)!.props.onChangeText(value);
    ReactTestRenderer.act(() => {
      change('menuAdmin.dishName', 'Nueva entrada');
      change('menuAdmin.description', 'Descripción de la nueva entrada');
      change('menuAdmin.price', '18000');
    });
    await ReactTestRenderer.act(async () => {
      press('menuAdmin.saveDish');
    });
    expect(api.createDish).toHaveBeenCalledWith(restaurantId, expect.objectContaining({
      categoriaId: categoryId,
      nombre: 'Nueva entrada',
      slug: 'nueva-entrada',
      precio: 18000,
    }));
    ReactTestRenderer.act(() => tree!.unmount());
  });
});
