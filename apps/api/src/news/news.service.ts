import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { NewsLinkSchema, type NewsContent, type NewsPost, type NewsUpdate } from '@encanto/shared';
import { processDishPhoto } from '../menu-admin/dish-photo-processing.js';
import { PrismaService } from '../prisma/prisma.service.js';

const summary = {
  id: true, titulo: true, cuerpo: true, enlaces: true, imagenPath: true,
  fijada: true, publicada: true, publicadaEn: true, updatedAt: true,
} satisfies Prisma.NewsPostSelect;
type NewsRow = Prisma.NewsPostGetPayload<{ select: typeof summary }>;

// Devuelvo datos de lectura con fechas estables y filtro enlaces viejos mal guardados.
function serialize(row: NewsRow): NewsPost {
  const links = Array.isArray(row.enlaces) ? row.enlaces : [];
  return {
    id: row.id,
    titulo: row.titulo,
    cuerpo: row.cuerpo,
    enlaces: links.flatMap(link => {
      const result = NewsLinkSchema.safeParse(link);
      return result.success ? [result.data] : [];
    }),
    imagen: row.imagenPath,
    fijada: row.fijada,
    publicada: row.publicada,
    publicadaEn: row.publicadaEn.toISOString(),
    version: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class NewsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(restauranteId: string, admin = false) {
    const rows = await this.prisma.newsPost.findMany({
      where: { restaurantId: restauranteId, ...(admin ? {} : { publicada: true }) },
      orderBy: [{ fijada: 'desc' }, { publicadaEn: 'desc' }, { id: 'asc' }],
      select: summary,
    });
    return rows.map(serialize);
  }

  async create(restauranteId: string, autorId: string, content: NewsContent) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restauranteId },
      select: { id: true },
    });
    if (!restaurant) throw new NotFoundException('Restaurante inexistente');

    return serialize(await this.prisma.newsPost.create({
      data: { ...content, restaurantId: restauranteId, autorId },
      select: summary,
    }));
  }

  async update(restauranteId: string, id: string, { version, ...content }: NewsUpdate) {
    return this.change(restauranteId, id, version, row => ({
      ...content,
      // Renuevo la fecha cuando un borrador se publica. Una edición normal conserva el lugar.
      ...(content.publicada && !row.publicada ? { publicadaEn: new Date() } : {}),
    }));
  }

  async upload(restauranteId: string, id: string, version: string, bytes?: Buffer) {
    if (!bytes) throw new BadRequestException('Selecciona una imagen');
    let image: Buffer;
    try {
      // Reutilizo el procesamiento de portada: WebP, sin metadatos y hasta 600 KB.
      image = (await processDishPhoto(bytes)).preview;
    } catch {
      throw new BadRequestException('No se pudo procesar la imagen. Usa JPEG, PNG o WebP de hasta 10 MB');
    }
    return this.change(restauranteId, id, version, () => ({
      imagenPath: '/noticias/' + id + '/imagen',
      imagenWebp: image,
    }));
  }

  async image(restauranteId: string, id: string) {
    const row = await this.prisma.newsPost.findFirst({
      where: { id, restaurantId: restauranteId, publicada: true },
      select: { imagenWebp: true },
    });
    if (!row?.imagenWebp) throw new NotFoundException('Imagen inexistente');
    return Buffer.from(row.imagenWebp);
  }

  private async change(
    restauranteId: string, id: string, version: string,
    data: (row: NewsRow) => Prisma.NewsPostUpdateManyMutationInput,
  ) {
    return this.prisma.$transaction(async db => {
      const where = { id, restaurantId: restauranteId };
      const row = await db.newsPost.findFirst({ where, select: summary });
      if (!row) throw new NotFoundException('Noticia inexistente');
      // Rechazo ediciones viejas. Así una carga de imagen no pisa cambios de otra sesión.
      const changed = await db.newsPost.updateMany({
        where: { ...where, updatedAt: new Date(version) },
        data: { ...data(row), updatedAt: new Date(Math.max(Date.now(), row.updatedAt.getTime() + 1)) },
      });
      if (!changed.count) throw new ConflictException('La noticia cambió. Actualiza antes de guardar');
      return serialize(await db.newsPost.findUniqueOrThrow({ where: { id }, select: summary }));
    });
  }
}
