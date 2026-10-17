import { apiClient } from './api/api-client';
import { adminMenuApi } from './admin-menu.service';

jest.mock('./api/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const get = jest.mocked(apiClient.get);
const restaurantId = '00000000-0000-4000-8000-000000000011';

describe('adminMenuApi', () => {
  beforeEach(() => get.mockReset());

  it('pide la sede y reúne todas las páginas de etiquetas', async () => {
    get
      .mockResolvedValueOnce({
        data: {
          restauranteId: restaurantId,
          data: [{ id: 'tag-1', nombre: 'Típico', icono: null }],
          paginacion: { pagina: 1, tamanoPagina: 100, total: 2, totalPaginas: 2 },
        },
      } as never)
      .mockResolvedValueOnce({
        data: {
          restauranteId: restaurantId,
          data: [{ id: 'tag-2', nombre: 'Vegetariano', icono: null }],
          paginacion: { pagina: 2, tamanoPagina: 100, total: 2, totalPaginas: 2 },
        },
      } as never);

    await expect(adminMenuApi.tags(restaurantId)).resolves.toHaveLength(2);
    expect(get).toHaveBeenNthCalledWith(1, '/menu/etiquetas', {
      params: {
        restauranteId: restaurantId,
        pagina: 1,
        tamanoPagina: 100,
      },
    });
    expect(get).toHaveBeenNthCalledWith(2, '/menu/etiquetas', {
      params: {
        restauranteId: restaurantId,
        pagina: 2,
        tamanoPagina: 100,
      },
    });
  });
});
