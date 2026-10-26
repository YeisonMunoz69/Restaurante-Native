import React from 'react';
import Renderer from 'react-test-renderer';
import { Linking, Text } from 'react-native';
import { ThemeProvider } from '../../theme/ThemeContext';
import { attentionApi } from '../../services/attention.service';
import { ReservationCalendar, monthDates } from './ReservationCalendar';
import { Action } from '../attention/Controls';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('../../services/attention.service', () => ({
  attentionApi: { range: jest.fn() },
}));
const api = jest.mocked(attentionApi);
const availability = jest.fn(),
  change = jest.fn();
let tree: Renderer.ReactTestRenderer;
const data = (services = ['RESTAURANTE']) => ({
  fecha: '2026-10-25',
  restauranteId: 'r1',
  zonaHoraria: 'America/Bogota' as const,
  abierto: true,
  servicios: services as ('RESTAURANTE' | 'PESCA' | 'MOTOS')[],
  soloPorReserva: false,
  origen: 'EXCEPCION' as const,
  motivo: 'Solo actividad publicada',
  horarios: [{ horaApertura: '10:00', horaCierre: '18:00' }],
});
async function mount() {
  await Renderer.act(async () => {
    tree = Renderer.create(
      <ThemeProvider>
        <ReservationCalendar
          restauranteId="r1"
          value="2026-10-25"
          min="2026-10-22"
          max="2027-01-22"
          onChange={change}
          onAvailability={availability}
        />
      </ThemeProvider>,
    );
  });
}
beforeEach(() => {
  jest.clearAllMocks();
  api.range.mockResolvedValue({ dias: [data()], whatsapp: '+573000000000' });
});
afterEach(() => {
  Renderer.act(() => tree?.unmount());
  jest.restoreAllMocks();
});

it('genera 42 fechas civiles desde lunes, incluyendo año bisiesto', () => {
  expect(monthDates('2026-10')).toHaveLength(42);
  expect(monthDates('2026-10')[0]).toBe('2026-09-28');
  expect(monthDates('2028-02')).toContain('2028-02-29');
});
it('habilita restaurante y comunica notas/horarios sin permitir fechas anteriores', async () => {
  await mount();
  expect(availability).toHaveBeenLastCalledWith(true);
  expect(
    tree.root.findByProps({ testID: 'calendar-date-2026-10-21' }).props
      .accessibilityState.disabled,
  ).toBe(true);
  expect(
    tree.root.findAllByType(Text).map(node => node.props.children),
  ).toContain('Solo actividad publicada');
  Renderer.act(() =>
    tree.root
      .findByProps({ testID: 'calendar-date-2026-10-25' })
      .props.onPress(),
  );
  expect(change).toHaveBeenCalledWith('2026-10-25');
});
it('solo pesca/motos no habilita mesas y consulta WhatsApp únicamente tras el toque', async () => {
  api.range.mockResolvedValue({
    dias: [data(['PESCA', 'MOTOS'])],
    whatsapp: '+573000000000',
  });
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await mount();
  expect(availability).toHaveBeenLastCalledWith(false);
  expect(open).not.toHaveBeenCalled();
  await Renderer.act(async () => {
    tree.root
      .findAllByType(Action)
      .find(node => node.props.label === 'discovery.contact')!
      .props.onPress();
  });
  expect(open).toHaveBeenCalledWith(
    expect.stringContaining('https://wa.me/573000000000'),
  );
});
it('no inventa contacto y permite reintentar después de fallo de red', async () => {
  api.range.mockRejectedValueOnce(new Error('offline'));
  await mount();
  expect(availability).toHaveBeenLastCalledWith(false);
  api.range.mockResolvedValue({ dias: [data(['PESCA'])], whatsapp: '' });
  await Renderer.act(async () => {
    tree.root
      .findAllByType(Action)
      .find(node => node.props.label === 'common.retry')!
      .props.onPress();
  });
  expect(
    tree.root.findAllByType(Text).map(node => node.props.children),
  ).toContain('discovery.noContact');
});
