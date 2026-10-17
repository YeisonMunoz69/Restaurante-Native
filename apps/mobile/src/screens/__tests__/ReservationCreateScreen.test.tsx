import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TextInput } from 'react-native';
import { ThemeProvider } from '../../theme/ThemeContext';
import { Action } from '../../components/attention/Controls';
import { useConnection } from '../../context/ConnectionContext';
import { menuApi } from '../../services/menu.service';
import { reservationsApi } from '../../services/reservations.service';
import { ReservationCreateScreen } from '../ReservationCreateScreen';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../../context/ConnectionContext', () => ({
  useConnection: jest.fn(),
}));

jest.mock('../../services/menu.service', () => ({ menuApi: { dishes: jest.fn() } }));

jest.mock('../../services/reservations.service', () => ({
  reservationsApi: { slots: jest.fn(), create: jest.fn() },
}));

const restaurantId = '00000000-0000-4000-8000-000000000011';
const dishId = '00000000-0000-4000-8000-000000000012';
const api = jest.mocked(reservationsApi);
const menu = jest.mocked(menuApi);

const availableDish = {
  id: dishId,
  categoria: { id: 'category-id', nombre: 'Platos', orden: 0 },
  nombre: 'Sancocho de prueba',
  slug: 'sancocho-de-prueba',
  descripcionBreve: null,
  descripcion: 'Plato de prueba',
  precio: 32000,
  moneda: 'COP' as const,
  alergenos: null,
  destacado: false,
  orden: 0,
  disponible: true,
  disponibilidadOrigen: 'GENERAL' as const,
  fotos: [],
  etiquetas: [],
};

const response = {
  reserva: {
    id: 'reservation-id',
    codigo: 'EC-20310223-ABCD1234',
    ticket: 'Ticket de prueba',
  },
  whatsapp: '+573000000000',
  instruccionesPago: 'Pago externo',
};

describe('ReservationCreateScreen', () => {
  const onBack = jest.fn();
  const onCreated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useConnection).mockReturnValue({
      settings: { environment: 'dev', localUrl: '', restauranteId: restaurantId },
      isSaving: false,
      save: jest.fn(),
    });
    api.slots.mockResolvedValue({
      fecha: '2031-02-23',
      zonaHoraria: 'America/Bogota',
      duracionMin: 90,
      franjas: [{ horaInicio: '10:00', horaFin: '11:30', duracionMin: 90, aforoDisponible: 20 }],
      mensaje: null,
    });
    menu.dishes.mockResolvedValue({
      restauranteId: restaurantId,
      fecha: '2031-02-23',
      data: [availableDish],
      paginacion: { pagina: 1, tamanoPagina: 20, total: 1, totalPaginas: 1 },
    });
    api.create.mockResolvedValue(response as never);
  });

  it('consulta franjas y envía una solicitud antes de mostrar la confirmación real', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <ReservationCreateScreen onBack={onBack} onCreated={onCreated} />
        </ThemeProvider>,
      );
    });

    await ReactTestRenderer.act(async () => {
      await tree!.root.findByProps({ testID: 'reservation-find-slots' }).props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      tree!.root
        .findAllByType(Action)
        .find(action => String(action.props.label).startsWith('10:00'))!
        .props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      await tree!.root.findByProps({ testID: 'reservation-continue-order' }).props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      tree!.root.findAllByType(Action).find(action => action.props.label === 'reservations.reviewRequest')!.props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      await tree!.root.findByProps({ testID: 'reservation-submit' }).props.onPress();
    });

    expect(api.slots).toHaveBeenCalledWith(expect.objectContaining({ numComensales: 2 }));
    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({
      horaInicio: '10:00',
      numComensales: 2,
      lineas: [],
    }));
    expect(tree!.root.findAllByType(Action).some(action => action.props.label === 'reservations.sendWhatsApp')).toBe(true);
    ReactTestRenderer.act(() => tree!.unmount());
  });

  it('no permite revisar un grupo de ocho sin pedido anticipado', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <ReservationCreateScreen onBack={onBack} onCreated={onCreated} />
        </ThemeProvider>,
      );
    });
    ReactTestRenderer.act(() => {
      tree!.root.findAllByType(TextInput).find(field => field.props.accessibilityLabel === 'reservations.people')!.props.onChangeText('8');
    });
    await ReactTestRenderer.act(async () => {
      await tree!.root.findByProps({ testID: 'reservation-find-slots' }).props.onPress();
    });
    ReactTestRenderer.act(() => {
      tree!.root.findAllByType(Action).find(action => String(action.props.label).startsWith('10:00'))!.props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      await tree!.root.findByProps({ testID: 'reservation-continue-order' }).props.onPress();
    });
    const review = tree!.root.findAllByType(Action).find(action => action.props.label === 'reservations.reviewRequest')!;
    expect(review.props.disabled).toBe(true);
    ReactTestRenderer.act(() => tree!.unmount());
  });

  it('selecciona un día visible al avanzar de semana antes de consultar franjas', async () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const value = (type: string) => parts.find(part => part.type === type)?.value ?? '01';
    const today = `${value('year')}-${value('month')}-${value('day')}`;
    const [year, month, day] = today.split('-').map(Number);
    const nextWeek = new Date(Date.UTC(year, month - 1, day + 7))
      .toISOString()
      .slice(0, 10);
    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <ReservationCreateScreen onBack={onBack} onCreated={onCreated} />
        </ThemeProvider>,
      );
    });

    ReactTestRenderer.act(() => {
      tree!.root.findAllByType(Action).find(action => action.props.label === '›')!.props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      await tree!.root.findByProps({ testID: 'reservation-find-slots' }).props.onPress();
    });

    expect(api.slots).toHaveBeenCalledWith({ fecha: nextWeek, numComensales: 2 });
    ReactTestRenderer.act(() => tree!.unmount());
  });
});
