import { BadRequestException } from '@nestjs/common';
import type { z } from 'zod';

// Valido query e identificadores antes de consultar Prisma, sin aceptar campos extra.
export function parseMenu<T extends z.ZodTypeAny>(
  schema: T,
  value: unknown,
): z.infer<T> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new BadRequestException({
      message: parsed.error.issues.map((issue) => ({
        campo: issue.path.join('.'),
        detalle: issue.message,
      })),
    });
  }
  return parsed.data;
}
