import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosError } from 'axios';
import { apiClient } from './api/api-client';
import { readNews } from './news.service';

const base = 'http://localhost:3039/api/v1';
const restaurant = '10000000-0000-4000-8000-000000000001';
const post = {
  id: '20000000-0000-4000-8000-000000000001',
  titulo: 'Noticia de prueba',
  cuerpo: 'Texto para leer incluso sin conexión',
  enlaces: ['https://example.test/evento'],
  fijada: true,
  publicada: true,
  publicadaEn: '2026-11-19T15:00:00.000Z',
  version: '2026-11-19T15:00:00.000Z',
  imagen: null,
};
const signal = () => new AbortController().signal;

beforeEach(async () => { await AsyncStorage.clear(); });
afterEach(() => jest.restoreAllMocks());

it('recupera sin conexión solo las publicaciones de la sede y la API correctas', async () => {
  const get = jest.spyOn(apiClient, 'get').mockResolvedValue({
    data: [post, { ...post, id: '20000000-0000-4000-8000-000000000002', publicada: false }],
  });
  await expect(readNews(base, restaurant, signal())).resolves.toEqual({ posts: [post], cached: false });
  get.mockRejectedValue(new AxiosError('Sin conexión'));
  await expect(readNews(base, restaurant, signal())).resolves.toEqual({ posts: [post], cached: true });
  await expect(readNews(base, '10000000-0000-4000-8000-000000000002', signal())).rejects.toThrow();
  await expect(readNews('https://example.test/api/v1', restaurant, signal())).rejects.toThrow();
});

it('reemplaza la copia cuando el servidor confirma un muro vacío', async () => {
  const get = jest.spyOn(apiClient, 'get').mockResolvedValue({ data: [post] });
  await readNews(base, restaurant, signal());
  get.mockResolvedValue({ data: [] });
  await readNews(base, restaurant, signal());
  get.mockRejectedValue(new AxiosError('Sin conexión'));
  await expect(readNews(base, restaurant, signal())).resolves.toEqual({ posts: [], cached: true });
});
