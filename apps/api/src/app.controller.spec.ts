import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { vi } from 'vitest';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service.js';

describe('AppController', () => {
  let appController: AppController;
  let prismaMock: { $queryRaw: ReturnType<typeof vi.fn> };

  // Creo el controller con Prisma simulado para evitar una conexión real en unit tests.
  beforeEach(async () => {
    prismaMock = { $queryRaw: vi.fn().mockResolvedValue([]) };
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    // Compruebo que la ruta raíz mantenga la respuesta existente.
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  // Compruebo que el endpoint confirme el estado sano de API y base de datos.
  it('reports health when the database answers', async () => {
    await expect(appController.checkHealth()).resolves.toEqual({
      status: 'ok',
      database: 'connected',
    });
  });

  // Compruebo que una base inaccesible devuelva un estado de servicio no disponible.
  it('returns service unavailable when the database cannot be queried', async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error('connection unavailable'));

    await expect(appController.checkHealth()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
