import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { vi } from 'vitest';
import { AppController } from '../app.controller.js';
import { AppService } from '../app.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { configureLanding } from './landing.assets.js';

describe('Landing pública', () => {
  let app: NestExpressApplication;
  let query: ReturnType<typeof vi.fn>;

  // Pruebo las rutas HTTP reales con Prisma simulado, sin tocar Supabase ni leer secretos.
  beforeEach(async () => {
    query = vi.fn().mockResolvedValue([]);
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: PrismaService, useValue: { $queryRaw: query } },
      ],
    }).compile();
    app = module.createNestApplication<NestExpressApplication>();
    configureLanding(app);
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  // Cierro el servidor después de cada prueba para no dejar puertos ocupados.
  afterEach(async () => {
    await app?.close();
  });

  it('muestra la landing en la raíz sin consultar la base', async () => {
    const response = await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Content-Type', /html/);
    expect(response.text).toContain('<html lang="es">');
    expect(response.text).toContain('En construcción · El Encanto Campestre');
    expect(response.text).toContain('href="/landing.css"');
    expect(response.text).not.toContain('<script');
    expect(query).not.toHaveBeenCalled();
    expect(response.headers['cache-control']).toContain('max-age=0');
  });

  it('sirve los estilos con animación opcional y el icono local', async () => {
    const response = await request(app.getHttpServer())
      .get('/landing.css')
      .expect(200)
      .expect('Content-Type', /css/);
    expect(response.text).toContain('prefers-reduced-motion: no-preference');
    expect(response.text).toContain('@keyframes place-brick');
    await request(app.getHttpServer())
      .get('/favicon.svg')
      .expect(200)
      .expect('Content-Type', /image\/svg\+xml/);
  });

  it('conserva la respuesta de la raíz de la API', async () => {
    await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200, 'Hello World!');
  });

  it('conserva la comprobación de salud y su consulta a la base', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200, { status: 'ok', database: 'connected' });
    expect(query).toHaveBeenCalledOnce();
  });

  it('no oculta una base inaccesible detrás de la landing', async () => {
    query.mockRejectedValue(new Error('base inaccesible'));
    await request(app.getHttpServer()).get('/api/v1/health').expect(503);
  });

  it('no convierte una ruta inexistente de API en HTML', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/no-existe')
      .expect(404)
      .expect('Content-Type', /json/);
  });

  it('no publica archivos privados ni rutas fuera de public', async () => {
    for (const path of [
      '/.env',
      '/.env.vps',
      '/.git/config',
      '/package.json',
      '/src/main.ts',
    ]) {
      const response = await request(app.getHttpServer()).get(path);
      expect([403, 404]).toContain(response.status);
      expect(response.text).not.toContain('El Encanto Campestre');
      expect(response.text).not.toContain('DATABASE_URL=');
    }
  });
});
