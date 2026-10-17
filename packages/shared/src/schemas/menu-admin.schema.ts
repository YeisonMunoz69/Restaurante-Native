import { z } from 'zod';

const pageNumber = (maximum: number, fallback: string) =>
  z
    .string()
    .regex(/^[1-9][0-9]*$/, 'Usamos enteros positivos sin ceros iniciales')
    .default(fallback)
    .transform(Number)
    .refine(
      (value) => Number.isSafeInteger(value) && value <= maximum,
      `El máximo es ${maximum}`,
    );

const text = (maximum: number) => z.string().trim().min(1).max(maximum);
const categoryName = text(80);
const slug = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El slug usa minúsculas y guiones');
const price = z
  .number()
  .finite()
  .positive()
  .max(9_999_999_999.99)
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
    'El precio admite hasta dos decimales',
  );

export const MenuAdminPageQuerySchema = z
  .object({
    restauranteId: z.string().uuid(),
    pagina: pageNumber(10000, '1'),
    tamanoPagina: pageNumber(100, '50'),
    incluirInactivos: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
  })
  .strict();

export const CategoryCreateSchema = z
  .object({ nombre: categoryName, orden: z.number().int().min(0).default(0) })
  .strict();

export const CategoryUpdateSchema = z
  .object({
    nombre: categoryName.optional(),
    orden: z.number().int().min(0).optional(),
    activa: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Indique qué desea cambiar');

const dishFields = z
  .object({
    categoriaId: z.string().uuid(),
    nombre: text(120),
    slug,
    descripcionBreve: z.string().trim().max(240).nullable().default(null),
    descripcion: text(4000),
    precio: price,
    alergenos: z.string().trim().max(1000).nullable().default(null),
    destacado: z.boolean().default(false),
    orden: z.number().int().min(0).default(0),
    disponible: z.boolean().default(true),
    etiquetasIds: z.array(z.string().uuid()).max(20).default([]),
  })
  .strict();

export const DishCreateSchema = dishFields.refine(
    (value) => value.etiquetasIds.length === new Set(value.etiquetasIds).size,
    'No repita etiquetas',
  );

export const DishUpdateSchema = dishFields
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Indique qué desea cambiar')
  .refine(
    (value) =>
      !value.etiquetasIds ||
      value.etiquetasIds.length === new Set(value.etiquetasIds).size,
    'No repita etiquetas',
  );

export const DishGeneralAvailabilitySchema = z
  .object({ disponible: z.boolean() })
  .strict();

export const DishActiveSchema = z.object({ activo: z.boolean() }).strict();

export const DishPhotoOrderSchema = z
  .object({
    fotos: z
      .array(z.object({ id: z.string().uuid(), orden: z.number().int().min(0) }).strict())
      .min(1)
      .max(10),
  })
  .strict()
  .refine(
    ({ fotos }) =>
      fotos.length === new Set(fotos.map((photo) => photo.id)).size &&
      fotos.length === new Set(fotos.map((photo) => photo.orden)).size,
    'Cada foto y posición deben ser únicos',
  );

export type MenuAdminPageQuery = z.infer<typeof MenuAdminPageQuerySchema>;
export type CategoryCreate = z.infer<typeof CategoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof CategoryUpdateSchema>;
export type DishCreate = z.infer<typeof DishCreateSchema>;
export type DishUpdate = z.infer<typeof DishUpdateSchema>;
export type DishPhotoOrder = z.infer<typeof DishPhotoOrderSchema>;
