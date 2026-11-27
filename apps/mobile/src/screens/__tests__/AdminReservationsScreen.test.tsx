import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Image, Text } from 'react-native';
import { formatCivilDate } from '../../utils/formatters';
import { ThemeProvider } from '../../theme/ThemeContext';
import { Action } from '../../components/attention/Controls';
import { Feedback } from '../../components/feedback/Feedback';
import { useAuth } from '../../context/AuthContext';
import { reservationsApi } from '../../services/reservations.service';
import { AdminReservationsScreen } from '../AdminReservationsScreen';
import { ReservationImagePreview } from '../../components/reservations/ReservationReceipt';

const mockTranslate = (key: string) => key;
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockTranslate }) }));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../services/reservations.service', () => ({
  reservationsApi: {
    requests: jest.fn(),
    agenda: jest.fn(),
    approve: jest.fn(),
    reviewReceipt: jest.fn(),
    reject: jest.fn(),
    markArrival: jest.fn(),
    markNoShow: jest.fn(),
    complete: jest.fn(),
  },
}));

const api = jest.mocked(reservationsApi);
const admin = {
  user: { id: 'admin-id', correo: 'admin@example.test', rol: 'ADMIN' },
  isAuthenticated: true,
  isLoading: false,
  login: jest.fn(), register: jest.fn(), logout: jest.fn(), checkSession: jest.fn(), loginWithGoogle: jest.fn(), updateProfile: jest.fn(),
};
const baseReservation = {
  id: 'reservation-id',
  codigo: 'EC-TEST-12345678',
  fecha: '2031-02-23',
  horaInicio: '10:00',
  horaFin: '11:30',
  numComensales: 4,
  estado: 'SOLICITADA' as const,
  total: 64000,
  nota: null,
  motivoRechazo: null,
  creadaEn: '2031-02-20T12:00:00.000Z',
  llegadaPorId: null,
  llegadaEn: null,
  inasistioPorId: null,
  inasistioEn: null,
  completadaPorId: null,
  completadaEn: null,
  lineas: [],
  ticket: 'Ticket de prueba',
  cliente: { id: 'diner-id', nombre: 'Ana', telefono: '3000000000', cancelaciones: 0, inasistencias: 0 },
};

describe('AdminReservationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAuth).mockReturnValue(admin as never);
    api.requests.mockResolvedValue([baseReservation] as never);
    api.agenda.mockResolvedValue([]);
    api.approve.mockResolvedValue({ ...baseReservation, estado: 'CONFIRMADA' } as never);
  });

  it('habilita la decisión de ADMIN después de abrir la captura vigente', async () => {
    api.requests.mockResolvedValue([{ ...baseReservation,
      comprobante: { id: 'version-revisada', ancho: 240, alto: 520, subidoEn: '2031-02-20T12:00:00Z' },
    }]);
    api.reviewReceipt.mockResolvedValue({ id: 'version-revisada', imagen: 'cG5n', ancho: 240, alto: 520 });
    const dialog = jest.spyOn(Feedback, 'alert');
    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider><AdminReservationsScreen onBack={jest.fn()} /></ThemeProvider>,
      );
    });
    const action = (label: string) => tree!.root.findAllByType(Action).find(row => row.props.label === label)!;
    ReactTestRenderer.act(() => action('reservations.requestDetail').props.onPress());
    expect(action('reservations.approve').props.disabled).toBe(true);
    await ReactTestRenderer.act(async () => action('reservations.receiptReview').props.onPress());
    ReactTestRenderer.act(() => {
      const preview = tree!.root.findByType(ReservationImagePreview);
      preview.props.onViewed();
      preview.props.onClose();
    });
    expect(action('reservations.approve').props.disabled).toBe(false);
    ReactTestRenderer.act(() => action('reservations.approve').props.onPress());

    expect(api.approve).not.toHaveBeenCalled();
    await ReactTestRenderer.act(async () => { await dialog.mock.calls[0][2]![1].onPress!(); });
    expect(api.approve).toHaveBeenCalledWith('reservation-id', 'version-revisada');
    expect(api.requests).toHaveBeenCalledWith();
    expect(api.agenda).not.toHaveBeenCalled();
    ReactTestRenderer.act(() => tree!.unmount());
  });

  it('muestra reservas futuras sin elegir fecha y abre el pedido con su foto', async () => {
    const confirmed = {
      ...baseReservation, estado: 'CONFIRMADA' as const,
      lineas: [{ platoId: 'dish-id', platoSlug: 'ajiaco', nombre: 'Ajiaco', cantidad: 2,
        precioUnitario: 32000, subtotal: 64000, fotoUrl: 'https://menu.example.test/ajiaco.webp' }],
    };
    api.agenda.mockResolvedValue([confirmed]);
    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<ThemeProvider><AdminReservationsScreen /></ThemeProvider>);
    });
    const action = (label: string) => tree!.root.findAllByType(Action).find(row => row.props.label === label)!;
    await ReactTestRenderer.act(async () => action('reservations.agenda').props.onPress());
    expect(api.agenda).toHaveBeenLastCalledWith(undefined);
    expect(tree!.root.findAllByType(Text).some(node => node.props.children === formatCivilDate(confirmed.fecha))).toBe(true);
    ReactTestRenderer.act(() => tree!.root.findByProps({ testID: 'agenda-card-reservation-id' }).props.onPress());
    const photo = tree!.root.findAllByType(Image).find(node => node.props.testID === 'agenda-dish-photo');
    expect(photo?.props.source).toEqual({ uri: 'https://menu.example.test/ajiaco.webp' });

    ReactTestRenderer.act(() => tree!.root.findAllByProps({ label: 'common.close' })[0].props.onPress());
    await ReactTestRenderer.act(async () => action('reservations.todayAgenda').props.onPress());
    expect(api.agenda).toHaveBeenLastCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
    ReactTestRenderer.act(() => tree!.unmount());
  });

  it('permite a STAFF registrar llegada y no muestra aprobación de solicitudes', async () => {
    const dialog = jest.spyOn(Feedback, 'alert');
    jest.mocked(useAuth).mockReturnValue({
      ...admin,
      user: { ...admin.user, rol: 'STAFF' },
    } as never);
    api.agenda.mockResolvedValue([
      { ...baseReservation, estado: 'CONFIRMADA' },
    ] as never);
    api.markArrival.mockResolvedValue({ ...baseReservation, estado: 'EN_CURSO' } as never);
    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider><AdminReservationsScreen onBack={jest.fn()} /></ThemeProvider>,
      );
    });

    expect(tree!.root.findAllByType(Action).some(action => action.props.label === 'reservations.approve')).toBe(false);
    ReactTestRenderer.act(() => tree!.root.findByProps({ testID: 'agenda-card-reservation-id' }).props.onPress());
    await ReactTestRenderer.act(async () => {
      await tree!.root.findAllByType(Action).find(action => action.props.label === 'reservations.markArrival')!.props.onPress();
    });
    expect(api.markArrival).not.toHaveBeenCalled();
    await ReactTestRenderer.act(async () => { await dialog.mock.calls[0][2]![1].onPress!(); });
    expect(api.markArrival).toHaveBeenCalledWith('reservation-id');
    ReactTestRenderer.act(() => tree!.unmount());
  });
});
