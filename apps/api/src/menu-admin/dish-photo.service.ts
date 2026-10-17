import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { processDishPhoto } from './dish-photo-processing.js';
import { SupabaseStorageService } from './supabase-storage.service.js';

export interface UploadedDishPhoto {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

@Injectable()
export class DishPhotoService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SupabaseStorageService) private readonly storage: SupabaseStorageService,
  ) {}

  async upload(restauranteId: string, dishId: string, file?: UploadedDishPhoto) {
    if (!file) throw new ConflictException('Seleccione una foto antes de guardar');
    const dish = await this.prisma.dish.findFirst({
      where: {
        id: dishId,
        activo: true,
        category: { restaurantId: restauranteId, activa: true },
      },
      select: { id: true },
    });
    if (!dish) throw new NotFoundException('Plato activo inexistente');

    let processed: Awaited<ReturnType<typeof processDishPhoto>>;
    try {
      processed = await processDishPhoto(file.buffer);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'La foto no es válida',
      );
    }
    const stem = `platos/${dishId}/${randomUUID()}`;
    const imagePath = `${stem}.webp`;
    const previewPath = `${stem}-og.webp`;
    const uploaded: string[] = [];
    try {
      await this.storage.upload(imagePath, processed.image);
      uploaded.push(imagePath);
      await this.storage.upload(previewPath, processed.preview);
      uploaded.push(previewPath);

      const photo = await this.prisma.$transaction(
        async (db) => {
          const rows = await db.dishPhoto.findMany({
            where: { dishId },
            select: { id: true, orden: true },
            orderBy: { orden: 'asc' },
          });
          if (rows.length >= 10) {
            throw new ConflictException('Cada plato admite hasta diez fotos');
          }
          return db.dishPhoto.create({
            data: {
              dishId,
              path: this.storage.publicUrl(imagePath),
              pathOg: this.storage.publicUrl(previewPath),
              orden: rows.length,
              principal: rows.length === 0,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return {
        ...photo,
        imagenBytes: processed.imageBytes,
        vistaPreviaBytes: processed.previewBytes,
      };
    } catch (error) {
      try {
        await this.storage.remove(uploaded);
      } catch {
        // La respuesta original es más útil; la guía explica cómo limpiar objetos huérfanos.
      }
      throw error;
    }
  }

  async reorder(
    restauranteId: string,
    dishId: string,
    fotos: { id: string; orden: number }[],
  ) {
    return this.prisma.$transaction(async (db) => {
      const dish = await db.dish.findFirst({
        where: {
          id: dishId,
          category: { restaurantId: restauranteId },
        },
        select: { id: true },
      });
      if (!dish) throw new NotFoundException('Plato inexistente');
      const rows = await db.dishPhoto.findMany({
        where: { dishId },
        select: { id: true },
      });
      if (
        rows.length !== fotos.length ||
        [...fotos].sort((a, b) => a.orden - b.orden).some((foto, index) => foto.orden !== index) ||
        rows.some((row) => !fotos.some((photo) => photo.id === row.id))
      ) {
        throw new ConflictException('Recargue la galería antes de ordenar las fotos');
      }
      await Promise.all(
        fotos.map(({ id, orden }) =>
          db.dishPhoto.update({
            where: { id },
            data: { orden, principal: orden === 0 },
          }),
        ),
      );
      return { platoId: dishId, fotos: [...fotos].sort((a, b) => a.orden - b.orden) };
    });
  }

  async remove(restauranteId: string, dishId: string, photoId: string) {
    const photo = await this.prisma.dishPhoto.findFirst({
      where: {
        id: photoId,
        dishId,
        dish: { category: { restaurantId: restauranteId } },
      },
      select: { id: true, path: true, pathOg: true },
    });
    if (!photo) throw new NotFoundException('Foto inexistente');

    await this.prisma.$transaction(async (db) => {
      await db.dishPhoto.delete({ where: { id: photo.id } });
      const remaining = await db.dishPhoto.findMany({
        where: { dishId },
        select: { id: true },
        orderBy: [{ orden: 'asc' }, { id: 'asc' }],
      });
      await Promise.all(
        remaining.map((row, orden) =>
          db.dishPhoto.update({
            where: { id: row.id },
            data: { orden, principal: orden === 0 },
          }),
        ),
      );
    });

    let limpiezaAlmacenamientoPendiente = false;
    try {
      await this.storage.remove(
        [photo.path, photo.pathOg]
          .filter((path): path is string => Boolean(path))
          .map((path) => this.storage.objectPath(path)),
      );
    } catch {
      // Borro primero la referencia; un fallo de Storage deja un archivo huérfano, no un enlace roto.
      limpiezaAlmacenamientoPendiente = true;
    }
    return { eliminada: true, limpiezaAlmacenamientoPendiente };
  }
}
