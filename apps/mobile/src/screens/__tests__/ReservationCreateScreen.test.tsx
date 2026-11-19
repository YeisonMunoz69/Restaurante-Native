import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { BackHandler, Linking, ScrollView, Text, TextInput } from 'react-native';
import { ThemeProvider } from '../../theme/ThemeContext';
import { Action } from '../../components/attention/Controls';
import { Button } from '../../components/ui/Button';
import { launchImageLibrary } from 'react-native-image-picker';
import Share from 'react-native-share';
import { ReservationImagePreview } from '../../components/reservations/ReservationReceipt';
import { useConnection } from '../../context/ConnectionContext';
import { menuApi } from '../../services/menu.service';
import { reservationsApi } from '../../services/reservations.service';
import { paymentApi } from '../../services/payment.service';
import { ReservationCreateScreen } from '../ReservationCreateScreen';
import { ReservationCalendar } from '../../components/calendar/ReservationCalendar';
import { OrderDraftProvider, useOrderDraft } from '../../context/OrderDraftContext';

// Aíslo el calendario (probado aparte) sin ocultar su selección ni su disponibilidad.
jest.mock('../../components/calendar/ReservationCalendar', () => {
  const ReactRuntime = require('react');
  return { ReservationCalendar: (props: { value: string; onAvailability: (value: boolean) => void }) => {
    ReactRuntime.useEffect(() => { props.onAvailability(true); }, [props.onAvailability, props.value]);
    return null;
  } };
});

const mockTranslate = (key: string) => key;
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockTranslate }) }));
jest.mock('react-native-image-picker', () => ({ launchImageLibrary: jest.fn() }));
jest.mock('../../services/payment.service', () => ({ paymentApi: { current: jest.fn() } }));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../../context/ConnectionContext', () => ({
  useConnection: jest.fn(),
}));

jest.mock('../../services/menu.service', () => ({ menuApi: { dishes: jest.fn() } }));

jest.mock('../../services/reservations.service', () => ({
  reservationsApi: { slots: jest.fn(), create: jest.fn(), uploadReceipt: jest.fn(), receiptTicket: jest.fn() },
}));

const restaurantId = '00000000-0000-4000-8000-000000000011';
const dishId = '00000000-0000-4000-8000-000000000012';
const api = jest.mocked(reservationsApi);
const menu = jest.mocked(menuApi);
const payments = jest.mocked(paymentApi);
const currentPayment = { whatsapp: '+573000000000', mediosPago: 'Medios ficticios', instruccionesPago: 'Solo prueba; no pagar', version: 1, configurada: true };

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
    estado: 'SOLICITADA',
    fecha: '2031-02-23',
    horaInicio: '10:00',
    horaFin: '11:30',
    numComensales: 2,
    total: 0,
    comprobante: null,
  },
  whatsapp: '+573000000000',
  instruccionesPago: 'Pago externo',
};

describe('ReservationCreateScreen', () => {
  const onBack = jest.fn();
  const onCreated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    payments.current.mockResolvedValue(currentPayment);
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

  async function openReview(tree: ReactTestRenderer.ReactTestRenderer) {
    await ReactTestRenderer.act(async () => { await tree.root.findByProps({ testID: 'reservation-find-slots' }).props.onPress(); });
    ReactTestRenderer.act(() => tree.root.findAllByType(Action).find(action => String(action.props.label).startsWith('10:00'))!.props.onPress());
    await ReactTestRenderer.act(async () => { await tree.root.findByProps({ testID: 'reservation-continue-order' }).props.onPress(); });
  }

  async function openPayment(tree: ReactTestRenderer.ReactTestRenderer) {
    await ReactTestRenderer.act(async () => { tree.root.findAllByType(Button).find(button => button.props.label === 'reservations.receiptShowPayment')!.props.onPress(); });
  }

  it('mantiene las franjas en Tu visita y vuelve desde el resumen con Atrás', async () => {
    let back!: () => boolean | null | undefined;
    const subscription = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
      back = () => handler({} as never);
      return { remove: jest.fn() };
    });
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => { tree = ReactTestRenderer.create(<ThemeProvider><ReservationCreateScreen onBack={onBack} onCreated={onCreated} /></ThemeProvider>); });
    await openReview(tree);
    expect(tree.root.findByProps({ testID: 'reservation-submit' })).toBeDefined();
    ReactTestRenderer.act(() => { expect(back()).toBe(true); });
    expect(tree.root.findByProps({ testID: 'reservation-continue-order' })).toBeDefined();
    await ReactTestRenderer.act(async () => { await tree.root.findByProps({ testID: 'reservation-continue-order' }).props.onPress(); });
    await ReactTestRenderer.act(async () => { await tree.root.findByProps({ testID: 'reservation-submit' }).props.onPress(); });
    await ReactTestRenderer.act(async () => { back(); });
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(api.create).toHaveBeenCalledTimes(1);
    ReactTestRenderer.act(() => tree.unmount());
    subscription.mockRestore();
  });

  it('adjunta el comprobante y abre el PNG generado con los datos de la reserva', async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    jest.mocked(launchImageLibrary).mockResolvedValue({ assets: [{ uri: 'file:///comprobante.png', type: 'image/png' }] });
    api.uploadReceipt.mockResolvedValue({ ...response.reserva, comprobante: { id: 'recibo-1', ancho: 240, alto: 580, subidoEn: '2031-02-20T12:00:00Z' } } as never);
    api.receiptTicket.mockResolvedValue({ imagen: 'cG5n', ancho: 1240, alto: 1340 });
    await ReactTestRenderer.act(async () => { tree = ReactTestRenderer.create(<ThemeProvider><ReservationCreateScreen onBack={onBack} onCreated={onCreated} /></ThemeProvider>); });
    await openReview(tree);
    await ReactTestRenderer.act(async () => { await tree.root.findByProps({ testID: 'reservation-submit' }).props.onPress(); });
    await ReactTestRenderer.act(async () => { await tree.root.findByProps({ testID: 'reservation-attach-receipt' }).props.onPress(); });
    expect(api.uploadReceipt).toHaveBeenCalledWith('reservation-id', expect.objectContaining({ uri: 'file:///comprobante.png' }));
    await ReactTestRenderer.act(async () => { await tree.root.findByProps({ testID: 'reservation-receipt-preview' }).props.onPress(); });
    expect(tree.root.findByType(ReservationImagePreview).props.image.alto).toBe(1340);
    await ReactTestRenderer.act(async () => tree.root.findByType(ReservationImagePreview).props.onShare());
    expect(Share.open).toHaveBeenCalledWith(expect.objectContaining({
      url: 'data:image/png;base64,cG5n', type: 'image/png', useInternalStorage: true,
    }));
    ReactTestRenderer.act(() => tree.unmount());
  });

  it.each(['sin-aplicacion', 'error-al-abrir', 'telefono-no-configurado'])('conserva código y ticket cuando WhatsApp falla: %s', async scenario => {
    const canOpen = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(scenario !== 'sin-aplicacion');
    const open = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('No disponible'));
    if (scenario === 'telefono-no-configurado') payments.current.mockResolvedValue({ ...currentPayment, whatsapp: '', configurada: false });
    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => { tree = ReactTestRenderer.create(<ThemeProvider><ReservationCreateScreen onBack={onBack} onCreated={onCreated} /></ThemeProvider>); });
    await ReactTestRenderer.act(async () => { await tree!.root.findByProps({ testID: 'reservation-find-slots' }).props.onPress(); });
    ReactTestRenderer.act(() => tree!.root.findAllByType(Action).find(a => String(a.props.label).startsWith('10:00'))!.props.onPress());
    await ReactTestRenderer.act(async () => { await tree!.root.findByProps({ testID: 'reservation-continue-order' }).props.onPress(); });
    await ReactTestRenderer.act(async () => { await tree!.root.findByProps({ testID: 'reservation-submit' }).props.onPress(); });
    await openPayment(tree!);
    await ReactTestRenderer.act(async () => { await tree!.root.findAllByType(Action).find(a => a.props.label === 'reservations.sendWhatsApp')!.props.onPress(); });
    if (scenario === 'telefono-no-configurado') expect(canOpen).not.toHaveBeenCalled();
    else expect(canOpen).toHaveBeenCalledWith(expect.stringContaining('EC-20310223-ABCD1234'));
    expect(open).toHaveBeenCalledTimes(scenario === 'error-al-abrir' ? 1 : 0);
    expect(tree!.root.findAllByProps({ children: scenario === 'telefono-no-configurado' ? 'payments.unconfigured' : 'reservations.whatsappUnavailable' }).length).toBeGreaterThan(0);
    expect(tree!.root.findAllByProps({ children: response.reserva.codigo }).length).toBeGreaterThan(0);
    ReactTestRenderer.act(() => tree!.unmount());
    canOpen.mockRestore(); open.mockRestore();
  });

  it('consulta datos vigentes antes de WhatsApp y no reutiliza cuentas antiguas sin red', async () => {
    const canOpen = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => { tree = ReactTestRenderer.create(<ThemeProvider><ReservationCreateScreen onBack={onBack} onCreated={onCreated} /></ThemeProvider>); });
    await ReactTestRenderer.act(async () => { await tree!.root.findByProps({ testID: 'reservation-find-slots' }).props.onPress(); });
    ReactTestRenderer.act(() => tree!.root.findAllByType(Action).find(a => String(a.props.label).startsWith('10:00'))!.props.onPress());
    await ReactTestRenderer.act(async () => { await tree!.root.findByProps({ testID: 'reservation-continue-order' }).props.onPress(); });
    await ReactTestRenderer.act(async () => { await tree!.root.findByProps({ testID: 'reservation-submit' }).props.onPress(); });
    await openPayment(tree!);
    payments.current.mockResolvedValue({ ...currentPayment, whatsapp: '+573000000002', mediosPago: 'Llave nueva de prueba', version: 2 });
    await ReactTestRenderer.act(async () => { await tree!.root.findAllByType(Action).find(a => a.props.label === 'reservations.sendWhatsApp')!.props.onPress(); });
    expect(open).toHaveBeenCalledWith(expect.stringContaining('wa.me/573000000002'));
    expect(decodeURIComponent(open.mock.calls[0][0])).toContain('Llave nueva de prueba');
    expect(decodeURIComponent(open.mock.calls[0][0])).toContain(response.reserva.codigo);
    payments.current.mockRejectedValue(new Error('Sin red'));
    await ReactTestRenderer.act(async () => { await tree!.root.findAllByType(Action).find(a => a.props.label === 'reservations.sendWhatsApp')!.props.onPress(); });
    expect(open).toHaveBeenCalledTimes(1);
    expect(tree!.root.findAllByProps({ children: 'payments.loadError' }).length).toBeGreaterThan(0);
    expect(tree!.root.findAllByProps({ children: 'Llave nueva de prueba' })).toHaveLength(0);
    ReactTestRenderer.act(() => tree!.unmount()); canOpen.mockRestore(); open.mockRestore();
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

    const initialScroll = tree!.root.findByType(ScrollView);
    await ReactTestRenderer.act(async () => {
      await tree!.root.findByProps({ testID: 'reservation-find-slots' }).props.onPress();
    });
    expect(tree!.root.findByType(ScrollView)).toBe(initialScroll);
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
      await tree!.root.findByProps({ testID: 'reservation-submit' }).props.onPress();
    });

    expect(api.slots).toHaveBeenCalledWith(expect.objectContaining({ numComensales: 2 }));
    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({
      horaInicio: '10:00',
      numComensales: 2,
      lineas: [],
    }));
    expect(tree!.root.findByProps({ testID: 'reservation-attach-receipt' })).toBeDefined();
    ReactTestRenderer.act(() => tree!.unmount());
  });

  it('repasa las líneas y su subtotal en el resumen antes de enviar', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => { tree = ReactTestRenderer.create(<ThemeProvider><ReservationCreateScreen onBack={onBack} onCreated={onCreated} /></ThemeProvider>); });
    await ReactTestRenderer.act(async () => { await tree!.root.findByProps({ testID: 'reservation-find-slots' }).props.onPress(); });
    ReactTestRenderer.act(() => tree!.root.findAllByType(Action).find(a => String(a.props.label).startsWith('10:00'))!.props.onPress());
    await ReactTestRenderer.act(async () => { await tree!.root.findByProps({ testID: 'reservation-continue-order' }).props.onPress(); });
    await ReactTestRenderer.act(async () => { await tree!.root.findByProps({ testID: 'reservation-toggle-dishes' }).props.onPress(); });
    ReactTestRenderer.act(() => {
      const add = tree!.root.findAllByType(Action).find(a => a.props.label === '+')!;
      add.props.onPress(); add.props.onPress();
    });
    ReactTestRenderer.act(() => tree!.root.findByProps({ testID: 'reservation-toggle-dishes' }).props.onPress());
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
    const review = tree!.root.findByProps({ testID: 'reservation-submit' });
    expect(review.props.disabled).toBe(true);
    ReactTestRenderer.act(() => tree!.unmount());
  });

  it('consulta franjas para la fecha elegida en el calendario mensual', async () => {
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
      tree!.root.findByType(ReservationCalendar).props.onChange(nextWeek);
    });
    await ReactTestRenderer.act(async () => {
      await tree!.root.findByProps({ testID: 'reservation-find-slots' }).props.onPress();
    });

    expect(api.slots).toHaveBeenCalledWith({ fecha: nextWeek, numComensales: 2 });
    ReactTestRenderer.act(() => tree!.unmount());
  });

  it('consulta automáticamente en Tu visita y descarta horarios de un grupo anterior', async () => {
    const slot = { horaInicio: '10:00', horaFin: '11:30', duracionMin: 90, aforoDisponible: 20 };
    const fresh = { fecha: '2031-02-23', zonaHoraria: 'America/Bogota', duracionMin: 90,
      franjas: [{ ...slot, horaInicio: '13:00', horaFin: '14:30' }], mensaje: null };
    let finish!: (value: typeof fresh) => void;
    api.slots.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    api.slots.mockResolvedValueOnce(fresh);
    let tree!: ReactTestRenderer.ReactTestRenderer;
    jest.useFakeTimers();
    try {
      await ReactTestRenderer.act(async () => { tree = ReactTestRenderer.create(<ThemeProvider><ReservationCreateScreen onBack={onBack} onCreated={onCreated} /></ThemeProvider>); });
      await ReactTestRenderer.act(async () => { jest.advanceTimersByTime(330); });
      expect(api.slots).toHaveBeenCalledWith(expect.objectContaining({ numComensales: 2 }));
      ReactTestRenderer.act(() => {
        tree.root.findByType(TextInput).props.onChangeText('5');
      });
      await ReactTestRenderer.act(async () => { jest.advanceTimersByTime(330); });
      expect(api.slots).toHaveBeenLastCalledWith(expect.objectContaining({ numComensales: 5 }));
      await ReactTestRenderer.act(async () => finish({ ...fresh, franjas: [slot] }));
      const actions = tree.root.findAllByType(Action).map(action => action.props.label);
      expect(actions).toContain('13:00–14:30');
      expect(actions).not.toContain('10:00–11:30');
    } finally {
      if (tree) ReactTestRenderer.act(() => tree.unmount());
      jest.useRealTimers();
    }
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
    expect(tree!.root.findAllByProps({ children: 'reservations.loginPreserveSelection' })).toHaveLength(0);
    await ReactTestRenderer.act(async () => {
      await tree!.root.findByProps({ testID: 'reservation-find-slots' }).props.onPress();
    });
    expect(api.slots).toHaveBeenCalledWith(expect.objectContaining({ numComensales: 7 }));
    ReactTestRenderer.act(() => tree!.unmount());
  });

  it('revalida Mi Pedido, conserva cantidades y solo lo limpia cuando el servidor acepta', async () => {
    let draft!: ReturnType<typeof useOrderDraft>;
    function Observe() { draft = useOrderDraft(); return null; }
    let tree!: ReactTestRenderer.ReactTestRenderer;
    const shell = (form: boolean) => <ThemeProvider><OrderDraftProvider scope="qa" ownerId="u1">
      <Observe />{form && <ReservationCreateScreen onBack={onBack} onCreated={onCreated} />}
    </OrderDraftProvider></ThemeProvider>;
    await ReactTestRenderer.act(async () => { tree = ReactTestRenderer.create(shell(false)); });
    // Propongo dos platos desde la carta; uno deja de ofrecerse al consultar la fecha.
    ReactTestRenderer.act(() => {
      draft.setQuantity(availableDish, 2, '2031-02-23');
      draft.setQuantity({ ...availableDish, id: '00000000-0000-4000-8000-000000000013' }, 1, '2031-02-23');
    });
    menu.dishes.mockResolvedValue({ restauranteId: restaurantId, fecha: '2031-02-23', data: [{ ...availableDish, precio: 35000 }], paginacion: { pagina: 1, tamanoPagina: 20, total: 1, totalPaginas: 1 } });
    await ReactTestRenderer.act(async () => { tree.update(shell(true)); });
    await ReactTestRenderer.act(async () => { await tree.root.findByProps({ testID: 'reservation-find-slots' }).props.onPress(); });
    ReactTestRenderer.act(() => tree.root.findAllByType(Action).find(a => String(a.props.label).startsWith('10:00'))!.props.onPress());
    await ReactTestRenderer.act(async () => { await tree.root.findByProps({ testID: 'reservation-continue-order' }).props.onPress(); });
    expect(draft.lines).toEqual([{ dish: { ...availableDish, precio: 35000 }, cantidad: 2 }]);
    expect(tree.root.findAllByProps({ children: 'discovery.revalidate' }).length).toBeGreaterThan(0);
    api.create.mockRejectedValueOnce(new Error('Conflicto al enviar'));
    await ReactTestRenderer.act(async () => { await tree.root.findByProps({ testID: 'reservation-submit' }).props.onPress(); });
    expect(draft.lines[0].cantidad).toBe(2);
    await ReactTestRenderer.act(async () => { await tree.root.findByProps({ testID: 'reservation-submit' }).props.onPress(); });
    expect(api.create).toHaveBeenLastCalledWith(expect.objectContaining({ lineas: [{ platoId: dishId, cantidad: 2 }] }));
    expect(draft.lines).toEqual([]);
    expect(tree.root.findAllByProps({ children: 'discovery.revalidate' })).toHaveLength(0);
    ReactTestRenderer.act(() => tree.unmount());
  });
});
