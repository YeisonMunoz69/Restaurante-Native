import React from 'react';
import Renderer from 'react-test-renderer';
import { Text } from 'react-native';
import { Feedback as Alert } from '../../components/feedback/Feedback';
import { ThemeProvider } from '../../theme/ThemeContext';
import { Action } from '../../components/attention/Controls';
import { useAuth } from '../../context/AuthContext';
import { reservationsApi } from '../../services/reservations.service';
import { ReservationsScreen } from '../ReservationsScreen';

const mockTranslate = (key: string) => key;
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockTranslate }) }));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: (callback: () => void) => { const hooks = require('react'); hooks.useEffect(callback, [callback]); },
}));
jest.mock('../../services/reservations.service', () => ({ reservationsApi: { mine: jest.fn(), detail: jest.fn(), cancel: jest.fn() } }));
const api = jest.mocked(reservationsApi);
const base = { id: 'r1', codigo: 'EC-PRUEBA', fecha: '2031-02-23', horaInicio: '12:00', horaFin: '13:30', numComensales: 2, estado: 'CONFIRMADA', total: 0, lineas: [], ticket: 'Ticket', nota: null, motivoRechazo: null };
let tree: Renderer.ReactTestRenderer;
const action = (label: string) => tree.root.findAllByType(Action).find(node => node.props.label === label)!;
const text = () => tree.root.findAllByType(Text).flatMap(node => node.props.children);
async function mount() { await Renderer.act(async () => { tree = Renderer.create(<ThemeProvider><ReservationsScreen /></ThemeProvider>); }); }

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2031-02-23T16:00:00Z') }); // 11:00 en Bogotá; exactamente 60 minutos.
  jest.clearAllMocks();
  jest.mocked(useAuth).mockReturnValue({ user: { id: 'u1' }, isLoading: false } as never);
  api.mine.mockResolvedValue([{ ...base }] as never);
});
afterEach(() => { Renderer.act(() => tree?.unmount()); Alert.clear(); jest.useRealTimers(); jest.restoreAllMocks(); });

it('permite cancelar a 60 minutos, actualiza el límite sin salir de la pantalla y no escribe sin confirmar', async () => {
  await mount();
  expect(action('reservations.cancelAction').props.disabled).toBe(false);
  const alert = jest.spyOn(Alert, 'alert');
  Renderer.act(() => action('reservations.cancelAction').props.onPress());
  expect(alert).toHaveBeenCalled();
  expect(api.cancel).not.toHaveBeenCalled();
  Renderer.act(() => jest.advanceTimersByTime(60000));
  expect(action('reservations.cancelAction').props.disabled).toBe(true);
  expect(text()).toContain('reservations.cancelTooLate');
});

it('recarga el estado del servidor tras un 409 y muestra el motivo', async () => {
  await mount();
  const alert = jest.spyOn(Alert, 'alert');
  api.cancel.mockRejectedValue({ response: { status: 409, data: { message: 'Conflicto del servidor' } } });
  api.mine.mockResolvedValue([{ ...base, estado: 'EN_CURSO' }] as never);
  Renderer.act(() => action('reservations.cancelAction').props.onPress());
  const buttons = alert.mock.calls[0][2]!;
  await Renderer.act(async () => { await buttons.find(button => button.style === 'destructive')!.onPress!(); });
  expect(api.cancel).toHaveBeenCalledWith('r1');
  expect(text()).toContain('Conflicto del servidor');
  expect(text()).toContain('reservations.status.EN_CURSO');
  expect(action('reservations.cancelAction')).toBeUndefined();
});

it('el detalle refresca estado y motivo de rechazo en lugar de mantener la tarjeta vieja', async () => {
  await mount();
  api.detail.mockResolvedValue({ ...base, estado: 'RECHAZADA', motivoRechazo: 'Sin capacidad' } as never);
  await Renderer.act(async () => { await action('reservations.viewDetails').props.onPress(); });
  Renderer.act(() => action('reservations.tabHistory').props.onPress());
  expect(text()).toContain('reservations.status.RECHAZADA');
  expect(text()).toContain('Sin capacidad');
});

it('no mezcla reservas de otra cuenta cuando termina una petición vieja', async () => {
  let finish!: (value: any) => void;
  api.mine.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await mount();
  jest.mocked(useAuth).mockReturnValue({ user: null, isLoading: false } as never);
  await Renderer.act(async () => { tree.update(<ThemeProvider><ReservationsScreen /></ThemeProvider>); finish([{ ...base }]); });
  jest.mocked(useAuth).mockReturnValue({ user: { id: 'u2' }, isLoading: false } as never);
  api.mine.mockResolvedValue([]);
  await Renderer.act(async () => { tree.update(<ThemeProvider><ReservationsScreen /></ThemeProvider>); });
  expect(text()).not.toContain('EC-PRUEBA');
});
