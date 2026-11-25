import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { BackHandler, Linking, Text, TextInput } from 'react-native';
import { Feedback } from '../../components/feedback/Feedback';
import { ThemeProvider } from '../../theme/ThemeContext';
import { Action } from '../../components/attention/Controls';
import { Button } from '../../components/ui/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReservationDraftProvider, useReservationDraft } from '../../context/ReservationDraftContext';
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

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { perfil: { telefono: '3001234567' } }, updateProfile: jest.fn() }),
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

  async function press(tree: ReactTestRenderer.ReactTestRenderer, testID: string) {
    await ReactTestRenderer.act(async () => { await tree.root.findByProps({ testID }).props.onPress(); });
  }

  async function openOrder(tree: ReactTestRenderer.ReactTestRenderer) {
    await press(tree, 'reservation-continue-visit');
    ReactTestRenderer.act(() => tree.root.findAllByType(Button).find(button => button.props.label === '10:00')!.props.onPress());
    await press(tree, 'reservation-continue-time');
  }

  async function openReview(tree: ReactTestRenderer.ReactTestRenderer) {
    await openOrder(tree);
    await press(tree, 'reservation-continue-order');
  }

  async function openPayment(tree: ReactTestRenderer.ReactTestRenderer) {
    await ReactTestRenderer.act(async () => { tree.root.findAllByType(Button).find(button => button.props.label === 'reservations.receiptShowPayment')!.props.onPress(); });
  }

  it('separa el paso anterior de Atrás, que guarda y confirma antes de salir', async () => {
    let back!: () => boolean | null | undefined;
    const subscription = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
      back = () => handler({} as never);
      return { remove: jest.fn() };
    });
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => { tree = ReactTestRenderer.create(<ThemeProvider><ReservationCreateScreen onBack={onBack} onCreated={onCreated} /></ThemeProvider>); });
    await openReview(tree);
    expect(tree.root.findByProps({ testID: 'reservation-submit' })).toBeDefined();
    const feedback = jest.spyOn(Feedback, 'alert');
    await ReactTestRenderer.act(async () => { expect(back()).toBe(true); back(); });
    expect(feedback).toHaveBeenCalledTimes(1);
    expect(feedback.mock.calls[0][0]).toBe('reservations.progressSaved');
    expect(onBack).not.toHaveBeenCalled();
    const actions = feedback.mock.calls[0][2]!;
    ReactTestRenderer.act(() => { actions.find(action => action.style === 'cancel')!.onPress!(); });
    expect(tree.root.findByProps({ testID: 'reservation-submit' })).toBeDefined();
    await press(tree, 'reservation-previous-step');
    expect(tree.root.findByProps({ testID: 'reservation-continue-order' })).toBeDefined();
    await press(tree, 'reservation-continue-order');
    await ReactTestRenderer.act(async () => { back(); });
    const exit = feedback.mock.calls[1][2]!.find(action => action.text === 'reservations.leaveDraft')!;
    ReactTestRenderer.act(() => { exit.onPress!(); });
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(api.create).not.toHaveBeenCalled();
    Feedback.clear();
    feedback.mockRestore();
    await ReactTestRenderer.act(async () => { await tree.root.findByProps({ testID: 'reservation-submit' }).props.onPress(); });
    await ReactTestRenderer.act(async () => { back(); });
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(api.create).toHaveBeenCalledTimes(1);
    ReactTestRenderer.act(() => tree.unmount());
    subscription.mockRestore();
  });

  it('solo ofrece flechas de horario cuando desborda y desactiva cada extremo', async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<ThemeProvider><ReservationCreateScreen onBack={onBack} onCreated={onCreated} /></ThemeProvider>);
    });
    await press(tree, 'reservation-continue-visit');
    const strip = tree.root.findAllByProps({ testID: 'reservation-time-scroll' }).find(node => node.props.onContentSizeChange)!;
    const row = tree.root.findAllByProps({ testID: 'reservation-time-strip' }).find(node => node.props.onLayout)!;
    const arrow = (testID: string) => tree.root.findAllByProps({ testID })
      .find(node => node.props.accessibilityLabel && typeof node.props.disabled === 'boolean');
    ReactTestRenderer.act(() => {
      row.props.onLayout({ nativeEvent: { layout: { width: 280 } } });
      strip.props.onLayout({ nativeEvent: { layout: { width: 280 } } });
      strip.props.onContentSizeChange(200);
    });
    expect(arrow('reservation-time-later')).toBeUndefined();
    ReactTestRenderer.act(() => {
      strip.props.onContentSizeChange(480);
      strip.props.onLayout({ nativeEvent: { layout: { width: 184 } } });
    });
    expect(arrow('reservation-time-earlier')?.props.disabled).toBe(true);
    expect(arrow('reservation-time-later')?.props.disabled).toBe(false);
    ReactTestRenderer.act(() => strip.props.onScroll({ nativeEvent: { contentOffset: { x: 296 } } }));
    expect(arrow('reservation-time-earlier')?.props.disabled).toBe(false);
    expect(arrow('reservation-time-later')?.props.disabled).toBe(true);
    ReactTestRenderer.act(() => tree.unmount());
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

  it('restaura el paso 4 y su captura y reintenta la carga sobre la misma solicitud', async () => {
    await AsyncStorage.clear();
    const uri = 'file:///comprobante-de-prueba.png';
    jest.mocked(launchImageLibrary).mockResolvedValue({ assets: [{ uri, type: 'image/png' }] });
    api.uploadReceipt.mockRejectedValueOnce(new Error('Red interrumpida')).mockResolvedValueOnce({
      ...response.reserva,
      comprobante: { id: 'recibo-2', ancho: 240, alto: 580, subidoEn: '2031-02-20T12:00:00Z' },
    } as never);
    function DraftForm() {
      return useReservationDraft().ready ? <ReservationCreateScreen onBack={onBack} onCreated={onCreated} /> : null;
    }
    const form = (scope = 'https://api.example.invalid/restaurant/qa') => <ThemeProvider>
      <ReservationDraftProvider scope={scope} authLoading={false} canOpen onOpen={jest.fn()}><DraftForm /></ReservationDraftProvider>
    </ThemeProvider>;
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => { tree = ReactTestRenderer.create(form()); });
    await openReview(tree);
    await press(tree, 'reservation-step4-receipt');
    expect(api.uploadReceipt).not.toHaveBeenCalled();
    expect(api.create).not.toHaveBeenCalled();
    ReactTestRenderer.act(() => tree.unmount());
    await ReactTestRenderer.act(async () => { tree = ReactTestRenderer.create(form('different-account')); });
    expect(tree.root.findByProps({ testID: 'reservation-continue-visit' })).toBeDefined();
    ReactTestRenderer.act(() => tree.unmount());
    await ReactTestRenderer.act(async () => { tree = ReactTestRenderer.create(form()); });
    expect(tree.root.findAllByType(Text).some(node => node.props.children === 'reservations.receiptSavedDraft')).toBe(true);
    await press(tree, 'reservation-submit');
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.uploadReceipt).toHaveBeenCalledWith('reservation-id', expect.objectContaining({ uri }));
    await press(tree, 'reservation-send-saved-receipt');
    expect(api.uploadReceipt).toHaveBeenCalledTimes(2);
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(tree.root.findAllByProps({ testID: 'reservation-send-saved-receipt' })).toHaveLength(0);
    ReactTestRenderer.act(() => tree.unmount());
  });

  it('avisa sobre el día cerrado y retira el mensaje a los tres segundos', async () => {
    jest.useFakeTimers();
    let tree!: ReactTestRenderer.ReactTestRenderer;
    try {
      await ReactTestRenderer.act(async () => { tree = ReactTestRenderer.create(<ThemeProvider><ReservationCreateScreen onBack={onBack} onCreated={onCreated} /></ThemeProvider>); });
      ReactTestRenderer.act(() => tree.root.findByType(ReservationCalendar).props.onUnavailable('2031-02-24'));
      expect(tree.root.findAllByType(Text).some(node => node.props.children === 'reservations.closedDayNotice')).toBe(true);
      ReactTestRenderer.act(() => jest.advanceTimersByTime(3000));
      expect(tree.root.findAllByType(Text).some(node => node.props.children === 'reservations.closedDayNotice')).toBe(false);
      expect(api.slots).not.toHaveBeenCalled();
    } finally {
      if (tree) ReactTestRenderer.act(() => tree.unmount());
      jest.useRealTimers();
    }
  });

  it.each(['sin-aplicacion', 'error-al-abrir', 'telefono-no-configurado'])('conserva código y ticket cuando WhatsApp falla: %s', async scenario => {
    const canOpen = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(scenario !== 'sin-aplicacion');
    const open = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('No disponible'));
    if (scenario === 'telefono-no-configurado') payments.current.mockResolvedValue({ ...currentPayment, whatsapp: '', configurada: false });
    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => { tree = ReactTestRenderer.create(<ThemeProvider><ReservationCreateScreen onBack={onBack} onCreated={onCreated} /></ThemeProvider>); });
    await openReview(tree!);
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
    await openReview(tree!);
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

    await openReview(tree!);
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
    await openOrder(tree!);
    expect(tree!.root.findAllByProps({ children: availableDish.nombre })).toHaveLength(0);
    ReactTestRenderer.act(() => tree!.root.findAllByType(Button).find(b => b.props.label === 'reservations.showSuggestions')!.props.onPress());
    ReactTestRenderer.act(() => tree!.root.findAllByType(Button).find(b => b.props.label === 'discovery.addShort')!.props.onPress());
    ReactTestRenderer.act(() => tree!.root.findAllByType(Action).find(a => a.props.label === '+')!.props.onPress());
    await press(tree!, 'reservation-continue-order');
    const texts = tree!.root.findAllByType(Text).flatMap(node => node.props.children);
    expect(texts).toContain(availableDish.nombre);
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
    await openOrder(tree!);
    const review = tree!.root.findByProps({ testID: 'reservation-continue-order' });
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
      await tree!.root.findByProps({ testID: 'reservation-continue-visit' }).props.onPress();
    });

    expect(api.slots).toHaveBeenCalledWith({ fecha: nextWeek, numComensales: 2 });
    ReactTestRenderer.act(() => tree!.unmount());
  });

  it('descarta una respuesta de horarios si la pantalla pierde el foco', async () => {
    const slot = { horaInicio: '13:00', horaFin: '14:30', duracionMin: 90, aforoDisponible: 20 };
    const fresh = { fecha: '2031-02-23', zonaHoraria: 'America/Bogota', duracionMin: 90, franjas: [slot], mensaje: null };
    let finish!: (value: typeof fresh) => void;
    api.slots.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    api.slots.mockResolvedValueOnce(fresh);
    let tree!: ReactTestRenderer.ReactTestRenderer;
    const screen = (isActive: boolean) => <ThemeProvider><ReservationCreateScreen isActive={isActive} onBack={onBack} onCreated={onCreated} /></ThemeProvider>;
    await ReactTestRenderer.act(async () => { tree = ReactTestRenderer.create(screen(true)); });
    await press(tree, 'reservation-continue-visit');
    expect(api.slots).toHaveBeenCalledTimes(1);
    await ReactTestRenderer.act(async () => { tree.update(screen(false)); });
    await ReactTestRenderer.act(async () => { tree.update(screen(true)); });
    await ReactTestRenderer.act(async () => finish({ ...fresh, franjas: [{ ...slot, horaInicio: '10:00' }] }));
    const actions = tree.root.findAllByType(Button).map(button => button.props.label);
    expect(actions).toContain('13:00');
    expect(actions).not.toContain('10:00');
    ReactTestRenderer.act(() => tree.unmount());
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
      await tree!.root.findByProps({ testID: 'reservation-continue-visit' }).props.onPress();
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
      await tree!.root.findByProps({ testID: 'reservation-continue-visit' }).props.onPress();
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
    await openReview(tree);
    expect(draft.lines).toEqual([{ dish: { ...availableDish, precio: 35000 }, cantidad: 2 }]);
    expect(tree.root.findAllByProps({ children: 'reservations.orderChanged' }).length).toBeGreaterThan(0);
    api.create.mockRejectedValueOnce(new Error('Conflicto al enviar'));
    await ReactTestRenderer.act(async () => { await tree.root.findByProps({ testID: 'reservation-submit' }).props.onPress(); });
    expect(draft.lines[0].cantidad).toBe(2);
    await ReactTestRenderer.act(async () => { await tree.root.findByProps({ testID: 'reservation-submit' }).props.onPress(); });
    expect(api.create).toHaveBeenLastCalledWith(expect.objectContaining({ lineas: [{ platoId: dishId, cantidad: 2 }] }));
    expect(draft.lines).toEqual([]);
    expect(tree.root.findAllByProps({ children: 'reservations.orderChanged' })).toHaveLength(0);
    ReactTestRenderer.act(() => tree.unmount());
  });
});
