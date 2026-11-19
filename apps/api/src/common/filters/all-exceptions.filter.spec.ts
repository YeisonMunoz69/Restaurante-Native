import { BadRequestException, ConflictException, UnprocessableEntityException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

describe('AllExceptionsFilter', () => {
  // Reviso el cuerpo que sale hacia el móvil, además del estado HTTP.
  const serialize = (error: unknown) => {
    const reply = vi.fn();
    const adapter = { reply, getRequestUrl: () => '/api/v1/auth/google' };
    const host = { switchToHttp: () => ({ getRequest: () => ({}), getResponse: () => ({}) }) };
    new AllExceptionsFilter({ httpAdapter: adapter } as never).catch(error, host as ArgumentsHost);
    return reply.mock.calls[0].slice(1);
  };

  it.each([
    [UnprocessableEntityException, 422, 'GOOGLE_PHONE_REQUIRED'],
    [ConflictException, 409, 'GOOGLE_LINK_REQUIRED'],
  ] as const)('conserva el código público cuando Google requiere otro paso', (Exception, statusCode, code) => {
    const message = 'Completa el acceso';
    expect(serialize(new Exception({ code, message }))).toEqual([
      expect.objectContaining({ statusCode, code, message }),
      statusCode,
    ]);
  });

  it('conserva los mensajes de validación y omite el código cuando no se declara', () => {
    const [body, status] = serialize(new BadRequestException(['Dato requerido']));
    expect(body.message).toEqual(['Dato requerido']);
    expect(body).not.toHaveProperty('code');
    expect(status).toBe(400);
  });
});
