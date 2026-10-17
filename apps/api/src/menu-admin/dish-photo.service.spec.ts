import { ConflictException, BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { DishPhotoService } from './dish-photo.service.js';
import { SupabaseStorageService } from './supabase-storage.service.js';

const restaurantId = '11111111-1111-4111-8111-111111111111';
const dishId = '22222222-2222-4222-8222-222222222222';

describe('DishPhotoService', () => {
  let service: DishPhotoService;
  let db: Record<string, any>;
  let storage: Record<string, any>;
  let prisma: {
    dish: { findFirst: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let input: Buffer;

  beforeEach(async () => {
    input = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#824a1a' },
    })
      .png()
      .toBuffer();
    db = {
      dishPhoto: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'photo-id', ...data }),
          ),
      },
    };
    prisma = {
      dish: { findFirst: vi.fn().mockResolvedValue({ id: dishId }) },
      $transaction: vi.fn((action: (tx: typeof db) => unknown) => action(db)),
    };
    storage = {
      upload: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      publicUrl: vi.fn(
        (path: string) => `https://storage.example/public/${path}`,
      ),
    };
    service = new DishPhotoService(
      prisma as unknown as PrismaService,
      storage as unknown as SupabaseStorageService,
    );
  });

  it('sube las dos variantes y crea la foto principal de la galería', async () => {
    const photo = await service.upload(restaurantId, dishId, {
      buffer: input,
      mimetype: 'image/png',
      size: input.length,
    });

    expect(storage.upload).toHaveBeenCalledTimes(2);
    expect(photo).toMatchObject({ id: 'photo-id', orden: 0, principal: true });
    expect(photo.path).toContain('/public/platos/');
  });

  it('limpia los archivos nuevos si la galería ya alcanzó el máximo', async () => {
    db.dishPhoto.findMany.mockResolvedValue(
      Array.from({ length: 10 }, (_, orden) => ({
        id: `photo-${orden}`,
        orden,
      })),
    );

    await expect(
      service.upload(restaurantId, dishId, {
        buffer: input,
        mimetype: 'image/png',
        size: input.length,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(storage.remove).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('.webp')]),
    );
  });

  it('rechaza una imagen inválida sin llamar al almacenamiento', async () => {
    await expect(
      service.upload(restaurantId, dishId, {
        buffer: Buffer.from('texto'),
        mimetype: 'image/png',
        size: 5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('limpia ambas variantes y responde conflicto si otra carga modifica la galería', async () => {
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('serialization conflict', {
        code: 'P2034',
        clientVersion: '5.22.0',
      }),
    );
    await expect(
      service.upload(restaurantId, dishId, {
        buffer: input,
        mimetype: 'image/png',
        size: input.length,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    const paths = storage.remove.mock.calls[0][0];
    expect(paths).toHaveLength(2);
    expect(paths[0]).toMatch(/\.webp$/);
    expect(paths[1]).toMatch(/-og\.webp$/);
    expect(paths[0]).not.toBe(paths[1]);
  });
});
