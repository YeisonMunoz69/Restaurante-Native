import { apiClient } from './api/api-client';
import { menuApi } from './menu.service';

jest.mock('./api/api-client', () => ({
  apiClient: { get: jest.fn() },
}));

const get = jest.mocked(apiClient.get);

describe('menuApi', () => {
  beforeEach(() => get.mockReset());

  it('requests the selected civil date from the calendar API', async () => {
    const day = {
      restauranteId: 'restaurant-id',
      fecha: '2031-02-23',
      zonaHoraria: 'America/Bogota' as const,
      abierto: false,
      soloPorReserva: false,
      origen: 'SIN_REGLA' as const,
      horarios: [],
      motivo: null,
    };
    get.mockResolvedValueOnce({ data: day } as never);

    await expect(menuApi.day('restaurant-id', day.fecha)).resolves.toEqual(day);
    expect(get).toHaveBeenCalledWith('/calendario/dia', {
      params: { restauranteId: 'restaurant-id', fecha: day.fecha },
    });
  });

  it('combines every category page and keeps empty categories available', async () => {
    get
      .mockResolvedValueOnce({
        data: {
          restauranteId: 'restaurant-id',
          data: [{ id: 'category-1', nombre: 'Entradas', orden: 0 }],
          paginacion: {
            pagina: 1,
            tamanoPagina: 100,
            total: 2,
            totalPaginas: 2,
          },
        },
      } as never)
      .mockResolvedValueOnce({
        data: {
          restauranteId: 'restaurant-id',
          data: [{ id: 'category-2', nombre: 'Bebidas', orden: 1 }],
          paginacion: {
            pagina: 2,
            tamanoPagina: 100,
            total: 2,
            totalPaginas: 2,
          },
        },
      } as never);

    await expect(menuApi.categories('restaurant-id')).resolves.toEqual([
      { id: 'category-1', nombre: 'Entradas', orden: 0 },
      { id: 'category-2', nombre: 'Bebidas', orden: 1 },
    ]);
    expect(get).toHaveBeenNthCalledWith(1, '/menu/categorias', {
      params: { restauranteId: 'restaurant-id', pagina: 1, tamanoPagina: 100 },
    });
    expect(get).toHaveBeenNthCalledWith(2, '/menu/categorias', {
      params: { restauranteId: 'restaurant-id', pagina: 2, tamanoPagina: 100 },
    });
  });

  it('sends the selected civil date and requested page to the public API', async () => {
    get.mockResolvedValueOnce({
      data: {
        restauranteId: 'restaurant-id',
        fecha: '2031-02-23',
        data: [],
        paginacion: {
          pagina: 3,
          tamanoPagina: 20,
          total: 45,
          totalPaginas: 3,
        },
      },
    } as never);

    await menuApi.dishes('restaurant-id', '2031-02-23', 3);

    expect(get).toHaveBeenCalledWith('/menu/platos', {
      params: {
        restauranteId: 'restaurant-id',
        fecha: '2031-02-23',
        pagina: 3,
        tamanoPagina: 20,
      },
    });
  });
});
