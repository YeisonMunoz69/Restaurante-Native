import { z } from 'zod';

// Solo abro destinos web completos. Excluyo esquemas locales y URLs con credenciales.
export const NewsLinkSchema = z.string().trim().max(500).url().refine(value => {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}, 'Cada enlace debe usar HTTP o HTTPS y no puede contener credenciales');

export const NewsContentSchema = z.object({
  titulo: z.string().trim().min(1, 'Escribe un título').max(120),
  cuerpo: z.string().trim().min(1, 'Escribe el contenido').max(4000),
  enlaces: z.array(NewsLinkSchema).max(8),
  fijada: z.boolean(),
  publicada: z.boolean(),
}).strict();

export const NewsVersionSchema = z.object({ version: z.string().datetime() }).strict();
export const NewsUpdateSchema = NewsContentSchema.merge(NewsVersionSchema);

export const NewsPostSchema = z.object({
  id: z.string().uuid(),
  titulo: z.string(),
  cuerpo: z.string(),
  enlaces: z.array(NewsLinkSchema),
  fijada: z.boolean(),
  publicada: z.boolean(),
  publicadaEn: z.string().datetime(),
  version: z.string().datetime(),
  imagen: z.string().nullable(),
});

export type NewsContent = z.infer<typeof NewsContentSchema>;
export type NewsUpdate = z.infer<typeof NewsUpdateSchema>;
export type NewsPost = z.infer<typeof NewsPostSchema>;
