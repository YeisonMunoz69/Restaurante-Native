import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { MenuAdminService } from './menu-admin.service.js';

const restaurantId = '11111111-1111-4111-8111-111111111111';
const categoryId = '22222222-2222-4222-8222-222222222222';
const tagId = '33333333-3333-4333-8333-333333333333';

describe('MenuAdminService', () => {
  let service: MenuAdminService;
  let db: Record<string, any>;
  let prisma: { $transaction: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    db = {
      restaurant: { findUnique: vi.fn().mockResolvedValue({ id: restaurantId }) },
      category: {
        findFirst: vi.fn().mockResolvedValue({ id: categoryId }),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      dietaryTag: { count: vi.fn().mockResolvedValue(1) },
      dish: {
        findFirst: vi.fn().mockResolvedValue({ id: 'dish-id' }),
        create: vi.fn(),
        update: vi.fn(),
        findUniqueOrThrow: vi.fn(),
      },
      dishDietaryTag: { createMany: vi.fn(), deleteMany: vi.fn() },
    };
    prisma = { $transaction: vi.fn((action: (tx: typeof db) => unknown) => action(db)) };
    service = new MenuAdminService(prisma as unknown as PrismaService);
  });

  it('crea platos con precio decimal, categoría válida y etiquetas enlazadas en la misma transacción', async () => {
    db.dish.create.mockResolvedValue({ id: 'dish-id' });
    db.dish.findUniqueOrThrow.mockResolvedValue({
      id: 'dish-id',
      precio: new Prisma.Decimal('32000.50'),
      dietaryTags: [{ tagId }],
    });

    const result = await service.createDish(restaurantId, {
      categoriaId: categoryId,
      nombre: 'Sancocho',
      slug: 'sancocho',
      descripcionBreve: null,
      descripcion: 'Preparado a la leña',
      precio: 32000.5,
      alergenos: null,
      destacado: false,
      orden: 0,
      disponible: true,
      etiquetasIds: [tagId],
    });

    expect(db.dish.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          categoryId,
          precio: new Prisma.Decimal('32000.5'),
        }),
        select: { id: true },
      }),
    );
    expect(db.dishDietaryTag.createMany).toHaveBeenCalledWith({
      data: [{ dishId: 'dish-id', tagId }],
    });
    expect(result.precio).toBe(32000.5);
    expect(result.etiquetasIds).toEqual([tagId]);
  });

  it('desactiva un plato sin borrar las líneas de pedidos históricos', async () => {
    db.dish.update.mockResolvedValue({ id: 'dish-id', activo: false });

    await service.setDishActive(restaurantId, 'dish-id', false);

    expect(db.dish.update).toHaveBeenCalledWith({
      where: { id: 'dish-id' },
      data: { activo: false },
    });
    expect(db.dishDietaryTag.deleteMany).not.toHaveBeenCalled();
  });

  it('convierte un slug duplicado en conflicto recuperable', async () => {
    db.dish.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '5.22.0',
      }),
    );
    await expect(
      service.createDish(restaurantId, {
        categoriaId: categoryId,
        nombre: 'Sancocho',
        slug: 'sancocho',
        descripcionBreve: null,
        descripcion: 'Preparado a la leña',
        precio: 32000,
        alergenos: null,
        destacado: false,
        orden: 0,
        disponible: true,
        etiquetasIds: [],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
