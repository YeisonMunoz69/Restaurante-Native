import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { BackHandler, Linking, Text, TextInput } from 'react-native';
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

  it('el botón físico vuelve por cada paso y desde enviada termina sin abrir otro formulario', async () => {
    let back!: () => boolean | null | undefined;
    const subscription = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
      back = () => handler({} as never);
      return { remove: jest.fn() };
    });
    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => { tree = ReactTestRenderer.create(<ThemeProvider><ReservationCreateScreen onBack={onBack} onCreated={onCreated} /></ThemeProvider>); });
    await ReactTestRenderer.act(async () => { await tree!.root.findByProps({ testID: 'reservation-find-slots' }).props.onPress(); });
    ReactTestRenderer.act(() => { expect(back()).toBe(true); });
    expect(tree!.root.findByProps({ testID: 'reservation-find-slots' })).toBeDefined();
    await ReactTestRenderer.act(async () => { await tree!.root.findByProps({ testID: 'reservation-find-slots' }).props.onPress(); });
    ReactTestRenderer.act(() => tree!.root.findAllByType(Action).find(a => String(a.props.label).startsWith('10:00'))!.props.onPress());
    await ReactTestRenderer.act(async () => { await tree!.root.findByProps({ testID: 'reservation-continue-order' }).props.onPress(); });
    ReactTestRenderer.act(() => { back(); });
    expect(tree!.root.findByProps({ testID: 'reservation-continue-order' })).toBeDefined();
    await ReactTestRenderer.act(async () => { await tree!.root.findByProps({ testID: 'reservation-continue-order' }).props.onPress(); });
    ReactTestRenderer.act(() => tree!.root.findByProps({ testID: 'reservation-continue-without-order' }).props.onPress());
    ReactTestRenderer.act(() => { back(); });
    expect(tree!.root.findByProps({ testID: 'reservation-continue-without-order' })).toBeDefined();
    ReactTestRenderer.act(() => tree!.root.findByProps({ testID: 'reservation-continue-without-order' }).props.onPress());
    await ReactTestRenderer.act(async () => { await tree!.root.findByProps({ testID: 'reservation-submit' }).props.onPress(); });
    await ReactTestRenderer.act(async () => { back(); });
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(api.create).toHaveBeenCalledTimes(1);
    ReactTestRenderer.act(() => tree!.unmount());
    subscription.mockRestore();
  });

  it.each(['sin-aplicacion', 'error-al-abrir', 'telefono-no-configurado'])('conserva código y ticket cuando WhatsApp falla: %s', async scenario => {
    const canOpen = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(scenario !== 'sin-aplicacion');
    const open = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('No disponible'));
    if (scenario === 'telefono-no-configurado') api.create.mockResolvedValue({ ...response, whatsapp: '' } as never);
    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => { tree = ReactTestRenderer.create(<ThemeProvider><ReservationCreateScreen onBack={onBack} onCreated={onCreated} /></ThemeProvider>); });
    await ReactTestRenderer.act(async () => { await tree!.root.findByProps({ testID: 'reservation-find-slots' }).props.onPress(); });
    ReactTestRenderer.act(() => tree!.root.findAllByType(Action).find(a => String(a.props.label).startsWith('10:00'))!.props.onPress());
    await ReactTestRenderer.act(async () => { await tree!.root.findByProps({ testID: 'reservation-continue-order' }).props.onPress(); });
    ReactTestRenderer.act(() => tree!.root.findByProps({ testID: 'reservation-continue-without-order' }).props.onPress());
    await ReactTestRenderer.act(async () => { await tree!.root.findByProps({ testID: 'reservation-submit' }).props.onPress(); });
    await ReactTestRenderer.act(async () => { await tree!.root.findAllByType(Action).find(a => a.props.label === 'reservations.sendWhatsApp')!.props.onPress(); });
    if (scenario === 'telefono-no-configurado') expect(canOpen).not.toHaveBeenCalled();
    else expect(canOpen).toHaveBeenCalledWith(expect.stringContaining('EC-20310223-ABCD1234'));
    expect(open).toHaveBeenCalledTimes(scenario === 'error-al-abrir' ? 1 : 0);
    expect(tree!.root.findAllByProps({ children: 'reservations.whatsappUnavailable' }).length).toBeGreaterThan(0);
    expect(tree!.root.findAllByProps({ children: response.reserva.ticket }).length).toBeGreaterThan(0);
    ReactTestRenderer.act(() => tree!.unmount());
    canOpen.mockRestore(); open.mockRestore();
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
      await tree!.root.findByProps({ testID: 'reservation-continue-without-order' }).props.onPress();
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

  it('repasa las líneas y su subtotal en el resumen antes de enviar', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => { tree = ReactTestRenderer.create(<ThemeProvider><ReservationCreateScreen onBack={onBack} onCreated={onCreated} /></ThemeProvider>); });
    await ReactTestRenderer.act(async () => { await tree!.root.findByProps({ testID: 'reservation-find-slots' }).props.onPress(); });
    ReactTestRenderer.act(() => tree!.root.findAllByType(Action).find(a => String(a.props.label).startsWith('10:00'))!.props.onPress());
    await ReactTestRenderer.act(async () => { await tree!.root.findByProps({ testID: 'reservation-continue-order' }).props.onPress(); });
    ReactTestRenderer.act(() => {
      const add = tree!.root.findAllByType(Action).find(a => a.props.label === '+')!;
      add.props.onPress(); add.props.onPress();
    });
    ReactTestRenderer.act(() => tree!.root.findAllByType(Action).find(a => a.props.label === 'reservations.reviewRequest')!.props.onPress());
    const texts = tree!.root.findAllByType(Text).flatMap(node => node.props.children);
    expect(texts).toContain('reservations.orderLine');
    expect(texts.map(value => typeof value === 'string' ? value.replace(/\s/g, '') : value)).toContain('$64.000');
    expect(api.create).not.toHaveBeenCalled();
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
      tree!.root.findAllByType(TextInput).find(field => field.props.accessibilityLabel === 'reservations.groupSize')!.props.onChangeText('8');
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

  it('pide iniciar sesión antes de consultar y conserva el grupo seleccionado', async () => {
    const onRequireLogin = jest.fn();
    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <ReservationCreateScreen
            onBack={onBack}
            onCreated={onCreated}
            isAuthenticated={false}
            onRequireLogin={onRequireLogin}
          />
        </ThemeProvider>,
      );
    });
    ReactTestRenderer.act(() => {
      tree!.root.findAllByType(TextInput).find(field => field.props.accessibilityLabel === 'reservations.groupSize')!.props.onChangeText('7');
    });
    await ReactTestRenderer.act(async () => {
      await tree!.root.findByProps({ testID: 'reservation-find-slots' }).props.onPress();
    });

    expect(onRequireLogin).toHaveBeenCalledTimes(1);
    expect(api.slots).not.toHaveBeenCalled();

    await ReactTestRenderer.act(async () => {
      tree!.update(
        <ThemeProvider>
          <ReservationCreateScreen onBack={onBack} onCreated={onCreated} isAuthenticated />
        </ThemeProvider>,
      );
    });
    await ReactTestRenderer.act(async () => {
      await tree!.root.findByProps({ testID: 'reservation-find-slots' }).props.onPress();
    });
    expect(api.slots).toHaveBeenCalledWith(expect.objectContaining({ numComensales: 7 }));
    ReactTestRenderer.act(() => tree!.unmount());
  });
});
