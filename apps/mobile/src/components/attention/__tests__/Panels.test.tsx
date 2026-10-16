import React from 'react';
import Renderer from 'react-test-renderer';
import { Switch } from 'react-native';
import { ThemeProvider } from '../../../theme/ThemeContext';
import { CalendarPanel } from '../CalendarPanel';
import { AvailabilityPanel } from '../AvailabilityPanel';
import { Action, Field } from '../Controls';
import { attentionApi } from '../../../services/attention.service';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('../../../services/attention.service', () => ({
  ...jest.requireActual('../../../services/attention.service'),
  attentionApi: {
    rules: jest.fn(),
    day: jest.fn(),
    exception: jest.fn(),
    rulesSave: jest.fn(),
    exceptionSave: jest.fn(),
    exceptionDelete: jest.fn(),
    availability: jest.fn(),
    availabilitySave: jest.fn(),
    copy: jest.fn(),
  },
}));
const api = jest.mocked(attentionApi);
const restaurantId = '11111111-1111-4111-8111-111111111111';
const ruleId = '22222222-2222-4222-8222-222222222222';
let tree: Renderer.ReactTestRenderer;
const press = async (label: string, index = 0) => {
  await Renderer.act(async () => {
    tree.root
      .findAllByType(Action)
      .filter(node => node.props.label === label)
      [index].props.onPress();
  });
};
const mount = async (node: React.ReactNode) => {
  await Renderer.act(async () => {
    tree = Renderer.create(<ThemeProvider>{node}</ThemeProvider>);
  });
};
const warning = (count: number) => ({
  response: {
    status: 409,
    data: {
      message: {
        codigo: 'RESERVAS_CONFIRMADAS_AFECTADAS',
        reservasAfectadas: count,
        fechas: [{ fecha: '2031-02-23', cantidad: count }],
      },
    },
  },
});
beforeEach(() => {
  jest.clearAllMocks();
  api.rules.mockResolvedValue([
    {
      id: ruleId,
      diaSemana: 0,
      horaApertura: '10:00',
      horaCierre: '18:00',
      activo: true,
      abierto: true,
    },
  ]);
  api.day.mockResolvedValue({
    restauranteId: restaurantId,
    fecha: '2031-02-23',
    zonaHoraria: 'America/Bogota',
    abierto: true,
    soloPorReserva: false,
    origen: 'SEMANAL',
    horarios: [],
    motivo: null,
  });
  api.exception.mockResolvedValue(null);
});
afterEach(() => Renderer.act(() => tree?.unmount()));
it('guarda reglas con su ID y recarga del servidor después de guardar', async () => {
  await mount(<CalendarPanel restauranteId={restaurantId} />);
  await press('attention.saveRules');
  expect(api.rulesSave).toHaveBeenCalledWith(restaurantId, 0, {
    reglas: [
      {
        id: ruleId,
        horaApertura: '10:00',
        horaCierre: '18:00',
        activo: true,
        abierto: true,
      },
    ],
  });
  expect(api.rules).toHaveBeenCalledTimes(2);
});
it('no envía horas inválidas ni elimina IDs durante la edición', async () => {
  await mount(<CalendarPanel restauranteId={restaurantId} />);
  Renderer.act(() =>
    tree.root
      .findAllByType(Field)
      .find(field => field.props.label === 'attention.opens')!
      .props.onChangeText('25:00'),
  );
  await press('attention.saveRules');
  expect(api.rulesSave).not.toHaveBeenCalled();
});
it('409 espera confirmación explícita y vuelve a advertir si cambia la cantidad', async () => {
  api.exceptionSave
    .mockRejectedValueOnce(warning(2))
    .mockRejectedValueOnce(warning(3))
    .mockResolvedValueOnce({} as never);
  await mount(<CalendarPanel restauranteId={restaurantId} />);
  Renderer.act(() =>
    tree.root
      .findAllByType(Switch)
      .find(
        node => node.props.accessibilityLabel === 'attention.exceptionOpen',
      )!
      .props.onValueChange(false),
  );
  await press('attention.saveException');
  expect(api.exceptionSave).toHaveBeenCalledTimes(1);
  expect(api.exceptionSave.mock.calls[0][2]).not.toHaveProperty(
    'confirmarReservasAfectadas',
  );
  await press('attention.confirmClosure');
  expect(api.exceptionSave.mock.calls[1][2]).toMatchObject({
    abierto: false,
    confirmarReservasAfectadas: 2,
  });
  expect(api.exceptionSave).toHaveBeenCalledTimes(2);
  await press('attention.confirmClosure');
  expect(api.exceptionSave.mock.calls[2][2]).toMatchObject({
    abierto: false,
    confirmarReservasAfectadas: 3,
  });
});
it('cancelar advertencia no repite la escritura', async () => {
  api.exceptionSave.mockRejectedValueOnce(warning(2));
  await mount(<CalendarPanel restauranteId={restaurantId} />);
  await press('attention.saveException');
  await press('attention.cancel');
  expect(api.exceptionSave).toHaveBeenCalledTimes(1);
});
const page = {
  restauranteId: restaurantId,
  fecha: '2031-02-23',
  paginacion: { pagina: 1, tamanoPagina: 20, total: 1, totalPaginas: 1 },
  data: [
    {
      platoId: ruleId,
      nombre: 'Plato',
      categoria: { id: ruleId, nombre: 'Prueba', orden: 0 },
      disponibleGeneral: true,
      disponible: true,
      origen: 'GENERAL' as const,
      excepcion: null,
    },
  ],
};
it('guarda excepción de una fecha y permite quitarla usando null, sin cambiar general', async () => {
  api.availability.mockResolvedValue(page);
  await mount(<AvailabilityPanel restauranteId={restaurantId} />);
  await press('attention.unavailableDate');
  await press('attention.saveAvailability');
  expect(api.availabilitySave).toHaveBeenLastCalledWith(
    restaurantId,
    page.fecha,
    { cambios: [{ platoId: ruleId, disponible: false }] },
  );
  await press('attention.useGeneral');
  await press('attention.saveAvailability');
  expect(api.availabilitySave).toHaveBeenLastCalledWith(
    restaurantId,
    page.fecha,
    { cambios: [{ platoId: ruleId, disponible: null }] },
  );
});
it('copiar muestra previsualización antes de enviar confirmación y no reintenta un 409', async () => {
  api.availability.mockResolvedValue(page);
  api.copy
    .mockResolvedValueOnce({
      aplicada: false,
      previsualizacion: {
        restauranteId: restaurantId,
        origen: '2031-02-22',
        destino: '2031-02-23',
        total: 1,
        cambios: 1,
        excepcionesDestino: 0,
        confirmacion: 'a'.repeat(64),
      },
    })
    .mockRejectedValueOnce({ response: { status: 409 } });
  await mount(<AvailabilityPanel restauranteId={restaurantId} />);
  Renderer.act(() =>
    tree.root
      .findAllByType(Field)
      .find(field => field.props.label === 'attention.sourceDate')!
      .props.onChangeText('2031-02-22'),
  );
  await press('attention.previewCopy');
  expect(api.copy).toHaveBeenCalledTimes(1);
  await press('attention.confirmCopy');
  expect(api.copy).toHaveBeenCalledTimes(2);
  expect(api.copy.mock.calls[1][1]).toMatchObject({
    confirmacion: 'a'.repeat(64),
    destino: page.fecha,
  });
  expect(
    tree.root
      .findAllByType(Action)
      .some(node => node.props.label === 'attention.confirmCopy'),
  ).toBe(false);
});
