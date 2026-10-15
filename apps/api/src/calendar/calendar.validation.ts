import { BadRequestException } from '@nestjs/common';
import type { z } from 'zod';

// Valido también query y parámetros, que el pipe de autenticación no revisa.
export function parseCalendar<T extends z.ZodTypeAny>(
  schema: T,
  value: unknown,
): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException({
      message: result.error.issues.map((issue) => ({
        campo: issue.path.join('.'),
        detalle: issue.message,
      })),
    });
  }
  return result.data;
}
