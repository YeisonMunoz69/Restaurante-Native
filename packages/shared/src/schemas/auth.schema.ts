import { z } from 'zod';

// esquema de validacion para el formulario de registro tanto en mobile como en la API
export const RegisterSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre es obligatorio' })
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede superar los 100 caracteres'),

  correo: z
    .string({ required_error: 'El correo electronico es obligatorio' })
    .email('Ingresa un correo electronico valido')
    .toLowerCase(),

  telefono: z
    .string({ required_error: 'El telefono es obligatorio' })
    .regex(/^[0-9]{10}$/, 'El telefono debe tener 10 digitos numericos'),

  password: z
    .string({ required_error: 'La contrasena es obligatoria' })
    .min(8, 'La contrasena debe tener minimo 8 caracteres')
    .max(50, 'La contrasena no puede superar los 50 caracteres'),
});

// tipo inferido automaticamente a partir del esquema de registro
export type RegisterDto = z.infer<typeof RegisterSchema>;

// esquema de validacion para el inicio de sesion
export const LoginSchema = z.object({
  correo: z
    .string({ required_error: 'El correo electronico es obligatorio' })
    .email('Ingresa un correo electronico valido')
    .toLowerCase(),

  password: z
    .string({ required_error: 'La contrasena es obligatoria' })
    .min(1, 'Ingresa tu contrasena'),
});

// tipo inferido para el inicio de sesion
export type LoginDto = z.infer<typeof LoginSchema>;

const GoogleTokenSchema = z.string().min(1).max(8192);
export const GoogleLoginSchema = z.object({
  idToken: GoogleTokenSchema,
  telefono: z.string().trim().regex(/^\d{10}$/).optional(),
}).strict();
export const GoogleLinkSchema = z.object({ idToken: GoogleTokenSchema }).strict();
export type GoogleLoginDto = z.infer<typeof GoogleLoginSchema>;

// Comparto la validación de datos editables y dejo el correo y el rol fuera del formulario.
export const ProfileUpdateSchema = z.object({
  nombre: z.string().trim().min(2).max(100).optional(),
  telefono: z.string().trim().regex(/^\d{10}$/).optional(),
  ciudad: z.string().trim().max(80).nullable().optional(),
}).strict().refine(input => Object.values(input).some(value => value !== undefined));
export type ProfileUpdateDto = z.infer<typeof ProfileUpdateSchema>;

export interface AccountProfile {
  nombre: string;
  telefono: string;
  ciudad: string | null;
  fotoGoogleUrl: string | null;
}
