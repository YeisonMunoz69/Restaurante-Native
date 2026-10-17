import { apiClient } from './api/api-client';
import { reservationsApi } from './reservations.service';

jest.mock('./api/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

const get = jest.mocked(apiClient.get);
const post = jest.mocked(apiClient.post);
const patch = jest.mocked(apiClient.patch);

describe('reservationsApi', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    patch.mockReset();
  });

  it('consulta la disponibilidad con la fecha civil y el tamaño del grupo', async () => {
    const slots = { fecha: '2031-02-23', franjas: [], mensaje: null };
    get.mockResolvedValueOnce({ data: slots } as never);

    await expect(
      reservationsApi.slots({ fecha: slots.fecha, numComensales: 4 }),
    ).resolves.toEqual(slots);
    expect(get).toHaveBeenCalledWith('/reservas/franjas', {
      params: { fecha: slots.fecha, numComensales: 4 },
    });
  });

  it('envía el pedido al servidor y utiliza sus datos de confirmación', async () => {
    const body = {
      fecha: '2031-02-23',
      horaInicio: '10:00',
      numComensales: 8,
      lineas: [{ platoId: 'dish-id', cantidad: 2 }],
      nota: null,
    };
    const response = {
      reserva: { id: 'reservation-id', codigo: 'EC-20310223-ABCD1234' },
      whatsapp: '+573000000000',
      instruccionesPago: 'Pago externo',
    };
    post.mockResolvedValueOnce({ data: response } as never);

    await expect(reservationsApi.create(body)).resolves.toEqual(response);
    expect(post).toHaveBeenCalledWith('/reservas', body);
  });

  it('separa la operación de agenda de los cambios de estado autorizados', async () => {
    patch.mockResolvedValue({ data: { estado: 'EN_CURSO' } } as never);

    await reservationsApi.markArrival('reservation-id');
    await reservationsApi.markNoShow('reservation-id');
    await reservationsApi.complete('reservation-id');

    expect(patch).toHaveBeenNthCalledWith(1, '/admin/reservas/reservation-id/llegada');
    expect(patch).toHaveBeenNthCalledWith(2, '/admin/reservas/reservation-id/inasistencia');
    expect(patch).toHaveBeenNthCalledWith(3, '/admin/reservas/reservation-id/completar');
  });
});
