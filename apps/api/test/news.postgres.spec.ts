import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NewsModule } from '../src/news/news.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createMenuPostgresFixture } from './menu-postgres.fixture.js';

const databaseUrl = process.env.ENCANTO_MENU_TEST_DATABASE_URL;
const restaurantId = randomUUID();
const secondRestaurantId = randomUUID();
const adminId = randomUUID();
const dinerId = randomUUID();
const content = { titulo: 'Apertura', cuerpo: 'Bienvenidos al restaurante', enlaces: ['https://example.test/evento'], fijada: false, publicada: false };

describe.skipIf(!databaseUrl)('Noticias con HTTP real y PostgreSQL desechable', () => {
  let fixture: Awaited<ReturnType<typeof createMenuPostgresFixture>>;
  let app: INestApplication;
  let admin: string;
  let diner: string;
  const publicRoute = '/api/v1/noticias';
  const adminRoute = '/api/v1/admin/noticias';
  const query = { restauranteId: restaurantId };

  beforeAll(async () => {
    fixture = await createMenuPostgresFixture(databaseUrl!);
    await fixture.client.restaurant.createMany({
      data: [restaurantId, secondRestaurantId].map(id => ({
        id, nombre: 'Restaurante QA', direccion: '', latitud: 0, longitud: 0,
        telefono: '', whatsapp: '', aforoTotal: 20,
      })),
    });
    await fixture.client.user.createMany({ data: [
      { id: adminId, nombre: 'Admin QA', correo: 'admin@example.test', telefono: '', passwordHash: 'qa', rol: 'ADMIN' },
      { id: dinerId, nombre: 'Comensal QA', correo: 'diner@example.test', telefono: '', passwordHash: 'qa', rol: 'COMENSAL' },
    ] });
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), NewsModule],
    })
      .overrideProvider(PrismaService).useValue(fixture.client)
      .overrideProvider(ConfigService).useValue({ get: (key: string) => key === 'JWT_ACCESS_SECRET' ? 'jwt-exclusivo-qa-noticias' : undefined })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    const jwt = app.get(JwtService);
    admin = jwt.sign({ sub: adminId, correo: 'admin@example.test', rol: 'ADMIN', sid: 'qa-admin' });
    diner = jwt.sign({ sub: dinerId, correo: 'diner@example.test', rol: 'COMENSAL', sid: 'qa-diner' });
  }, 60_000);

  afterAll(async () => {
    try { await app?.close(); } finally { await fixture?.close(); }
  });

  it('mantiene el borrador y la foto privados y permite publicar, fijar y archivar', async () => {
    const http = request(app.getHttpServer());
    const auth = { type: 'bearer' } as const;
    await http.post(adminRoute).query(query).send(content).expect(401);
    await http.post(adminRoute).query(query).auth(diner, auth).send(content).expect(403);
    await http.post(adminRoute).query(query).auth(admin, auth)
      .send({ ...content, enlaces: ['file:///etc/hosts'] }).expect(400);
    const draft = (await http.post(adminRoute).query(query).auth(admin, auth).send(content).expect(201)).body;
    const imageRoute = publicRoute + '/' + draft.id + '/imagen';
    const postRoute = adminRoute + '/' + draft.id;
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'green' } }).png().toBuffer();
    const withImage = (await http.put(postRoute + '/imagen').query(query).auth(admin, auth)
      .field('version', draft.version).attach('foto', png, 'qa.png').expect(200)).body;
    await http.get(imageRoute).query(query).expect(404);
    await http.get(publicRoute + '/' + draft.id).query(query).expect(404);
    await http.get(publicRoute).query(query).expect(200, []);
    await http.put(postRoute).query(query).auth(admin, auth).send({ ...content, version: draft.version }).expect(409);

    const published = (await http.put(postRoute).query(query).auth(admin, auth)
      .send({ ...content, publicada: true, fijada: true, version: withImage.version }).expect(200)).body;
    const second = (await http.post(adminRoute).query(query).auth(admin, auth)
      .send({ ...content, publicada: true, titulo: 'Otra noticia' }).expect(201)).body;
    const feed = (await http.get(publicRoute).query(query).expect(200)).body;
    expect(feed.map((row: { id: string }) => row.id)).toEqual([published.id, second.id]);
    expect(feed[0]).toMatchObject({ ...content, publicada: true, fijada: true, imagen: withImage.imagen });
    await http.get(publicRoute + '/' + draft.id).query(query).expect(200, published);
    await http.get(imageRoute).query(query).expect('Content-Type', /image\/webp/).expect(200);
    await http.get(imageRoute).query({ restauranteId: secondRestaurantId }).expect(404);

    await http.put(postRoute).query(query).auth(admin, auth).send({ ...content, version: published.version }).expect(200);
    await http.get(imageRoute).query(query).expect(404);
    expect((await http.get(publicRoute).query(query).expect(200)).body.map((row: { id: string }) => row.id)).toEqual([second.id]);
    expect((await http.get(adminRoute).query(query).auth(admin, auth).expect(200)).body).toHaveLength(2);
  });
});
