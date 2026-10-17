import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import { useConnection } from '../../context/ConnectionContext';
import { menuApi } from '../../services/menu.service';
import { MenuScreen } from '../MenuScreen';
import { ThemeProvider } from '../../theme/ThemeContext';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../../context/ConnectionContext', () => ({
  useConnection: jest.fn(),
}));

jest.mock('../../services/menu.service', () => ({
  menuApi: {
    day: jest.fn(),
    categories: jest.fn(),
    nextOpenDay: jest.fn(),
    dishes: jest.fn(),
    dish: jest.fn(),
  },
}));

const api = jest.mocked(menuApi);
const restaurantId = '00000000-0000-4000-8000-000000000011';
const dishId = '00000000-0000-4000-8000-000000000012';

const dish = {
  id: dishId,
  categoria: {
    id: '00000000-0000-4000-8000-000000000013',
    nombre: 'Sopas',
    orden: 0,
  },
  nombre: 'Sopa de prueba',
  slug: 'sopa-de-prueba',
  descripcionBreve: 'Descripción breve',
  descripcion: 'Descripción completa',
  precio: 32000.5,
  moneda: 'COP' as const,
  alergenos: null,
  destacado: false,
  orden: 0,
  disponible: false,
  disponibilidadOrigen: 'FECHA' as const,
  fotos: [
    {
      id: '00000000-0000-4000-8000-000000000014',
      path: 'https://images.example.test/menu/sopa.jpg',
      pathOg: null,
      orden: 0,
      principal: true,
    },
  ],
  etiquetas: [],
};

function textValues(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat()
    .filter(value => typeof value === 'string');
}

describe('MenuScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useConnection).mockReturnValue({
      settings: {
        environment: 'dev',
        localUrl: '',
        restauranteId: restaurantId,
      },
      isSaving: false,
      save: jest.fn(),
    });
    api.categories.mockResolvedValue([
      { id: dish.categoria.id, nombre: dish.categoria.nombre, orden: 0 },
    ]);
    api.day.mockResolvedValue({
      restauranteId: restaurantId,
      fecha: '2031-02-24',
      zonaHoraria: 'America/Bogota',
      abierto: false,
      soloPorReserva: false,
      origen: 'SIN_REGLA',
      horarios: [],
      motivo: null,
    });
    api.nextOpenDay.mockResolvedValue({
      desde: '2031-02-22',
      hasta: '2032-02-22',
      diasBuscados: 2,
      dia: {
        restauranteId: restaurantId,
        fecha: '2031-02-23',
        zonaHoraria: 'America/Bogota',
        abierto: true,
        soloPorReserva: false,
        origen: 'SEMANAL',
        horarios: [{ horaApertura: '10:00', horaCierre: '17:00' }],
        motivo: null,
      },
    });
    api.dishes.mockResolvedValue({
      restauranteId: restaurantId,
      fecha: '2031-02-23',
      data: [dish],
      paginacion: {
        pagina: 1,
        tamanoPagina: 20,
        total: 1,
        totalPaginas: 1,
      },
    });
    api.dish.mockResolvedValue(dish);
  });

  it('loads the next open date, shows real menu data, and opens its detail', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <MenuScreen />
        </ThemeProvider>,
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(api.dishes).toHaveBeenCalledWith(restaurantId, '2031-02-23', 1);
    expect(textValues(tree!)).toContain('menu.nextOpenDay');
    expect(textValues(tree!)).toContain('10:00–17:00');
    expect(textValues(tree!)).toContain('Sopa de prueba');
    expect(textValues(tree!)).not.toContain('Sancocho de Gallina Criolla');

    await ReactTestRenderer.act(async () => {
      tree!.root
        .findByProps({ testID: `menu-open-detail-${dishId}` })
        .props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(api.dish).toHaveBeenCalledWith(restaurantId, '2031-02-23', dishId);
    expect(textValues(tree!)).toContain('Descripción completa');
    expect(textValues(tree!)).toContain('menu.badgeUnavailable');
    ReactTestRenderer.act(() => tree!.unmount());
  });

  it('requests a different civil date when the user changes the day', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <MenuScreen />
        </ThemeProvider>,
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    await ReactTestRenderer.act(async () => {
      tree!.root.findByProps({ testID: 'menu-date-next' }).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(api.dishes).toHaveBeenLastCalledWith(restaurantId, '2031-02-24', 1);
    expect(api.day).toHaveBeenCalledWith(restaurantId, '2031-02-24');
    expect(textValues(tree!)).toContain('menu.dayClosed');
    expect(textValues(tree!)).toContain('menu.selectedDate');
    expect(textValues(tree!)).not.toContain('menu.nextOpenDay');
    ReactTestRenderer.act(() => tree!.unmount());
  });

  it('clears the no-open-day notice after choosing an open date', async () => {
    api.nextOpenDay.mockResolvedValue({
      desde: '2031-02-22',
      hasta: '2032-02-22',
      diasBuscados: 366,
      dia: null,
    });
    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <MenuScreen />
        </ThemeProvider>,
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(textValues(tree!)).toContain('menu.noNextOpenDay');

    api.day.mockResolvedValue({
      restauranteId: restaurantId,
      fecha: '2031-02-24',
      zonaHoraria: 'America/Bogota',
      abierto: true,
      soloPorReserva: false,
      origen: 'SEMANAL',
      horarios: [{ horaApertura: '10:00', horaCierre: '17:00' }],
      motivo: null,
    });

    await ReactTestRenderer.act(async () => {
      tree!.root.findByProps({ testID: 'menu-date-next' }).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(textValues(tree!)).not.toContain('menu.noNextOpenDay');
    ReactTestRenderer.act(() => tree!.unmount());
  });

  it('ofrece la próxima apertura desde la fecha cerrada y carga su horario real', async () => {
    const next = await api.nextOpenDay(restaurantId);
    api.nextOpenDay.mockResolvedValueOnce(next).mockResolvedValue({
      ...next,
      desde: '2031-02-24',
      dia: { ...next.dia!, fecha: '2031-02-25', horarios: [{ horaApertura: '11:00', horaCierre: '18:00' }] },
    });
    api.day.mockImplementation(async (_id, date) => ({
      ...next.dia!,
      fecha: date,
      abierto: date === '2031-02-25',
      horarios: date === '2031-02-25' ? [{ horaApertura: '11:00', horaCierre: '18:00' }] : [],
    }));
    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<ThemeProvider><MenuScreen /></ThemeProvider>);
    });
    await ReactTestRenderer.act(async () => {
      tree!.root.findByProps({ testID: 'menu-date-next' }).props.onPress();
    });
    expect(api.nextOpenDay).toHaveBeenLastCalledWith(restaurantId, '2031-02-24');
    expect(textValues(tree!)).toContain('menu.dayClosed');
    await ReactTestRenderer.act(async () => {
      tree!.root.findByProps({ testID: 'menu-next-open-date' }).props.onPress();
    });
    expect(api.dishes).toHaveBeenLastCalledWith(restaurantId, '2031-02-25', 1);
    expect(textValues(tree!)).toContain('11:00–18:00');
    expect(textValues(tree!)).not.toContain('menu.dayClosed');
    ReactTestRenderer.act(() => tree!.unmount());
  });
});
