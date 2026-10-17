import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { ThemeProvider } from '../../theme/ThemeContext';
import { Action } from '../../components/attention/Controls';
import { useAuth } from '../../context/AuthContext';
import { reservationsApi } from '../../services/reservations.service';
import { AdminReservationsScreen } from '../AdminReservationsScreen';

const mockTranslate = (key: string) => key;
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockTranslate }) }));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../services/reservations.service', () => ({
  reservationsApi: {
    requests: jest.fn(),
    agenda: jest.fn(),
    approve: jest.fn(),
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
  login: jest.fn(), register: jest.fn(), logout: jest.fn(), checkSession: jest.fn(),
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

  it('permite a ADMIN aprobar una solicitud usando la API y refresca la lista', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider><AdminReservationsScreen onBack={jest.fn()} /></ThemeProvider>,
      );
    });
    await ReactTestRenderer.act(async () => {
      await tree!.root.findAllByType(Action).find(action => action.props.label === 'reservations.approve')!.props.onPress();
    });

    expect(api.approve).toHaveBeenCalledWith('reservation-id');
    expect(api.requests).toHaveBeenCalled();
    ReactTestRenderer.act(() => tree!.unmount());
  });

  it('permite a STAFF registrar llegada y no muestra aprobación de solicitudes', async () => {
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
    await ReactTestRenderer.act(async () => {
      await tree!.root.findAllByType(Action).find(action => action.props.label === 'reservations.markArrival')!.props.onPress();
    });
    expect(api.markArrival).toHaveBeenCalledWith('reservation-id');
    ReactTestRenderer.act(() => tree!.unmount());
  });
});
