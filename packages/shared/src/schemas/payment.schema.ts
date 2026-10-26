import { z } from 'zod';

// Permito desactivar el contacto dejándolo vacío; si se publica, exijo indicativo internacional.
export const PaymentConfigSchema = z
  .object({
    whatsapp: z
      .string()
      .trim()
      .regex(/^$|^\+[1-9]\d{9,14}$/),
    mediosPago: z.string().trim().max(4000),
    instruccionesPago: z.string().trim().max(2000),
    version: z.number().int().nonnegative(),
  })
  .strict();

export type PaymentConfig = z.infer<typeof PaymentConfigSchema>;
export interface PaymentConfigResult extends PaymentConfig {
  configurada: boolean;
}
