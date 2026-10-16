import type {
  CalendarClosureWarning,
  CalendarDayResult,
  CalendarExceptionInput,
  CalendarRuleInput,
  CalendarRulesInput,
  DishAvailabilityCopy,
  DishAvailabilityCopyResult,
  DishAvailabilityPage,
  DishAvailabilityWrite,
} from '@encanto/shared';
import { apiClient } from './api/api-client';

export type AdminRule = CalendarRuleInput & { id: string; diaSemana: number };
export type AdminException = CalendarExceptionInput & {
  id: string;
  fecha: string;
};
// Reutilizo las rutas integradas; todas las llamadas administrativas pasan por el JWT existente.
export const attentionApi = {
  rules: async (restauranteId: string) =>
    (
      await apiClient.get<AdminRule[]>('/admin/calendario/reglas', {
        params: { restauranteId },
      })
    ).data,
  day: async (restauranteId: string, fecha: string) =>
    (
      await apiClient.get<CalendarDayResult>('/calendario/dia', {
        params: { restauranteId, fecha },
      })
    ).data,
  exception: async (restauranteId: string, fecha: string) =>
    (
      await apiClient.get<AdminException | null>(
        '/admin/calendario/excepciones',
        { params: { restauranteId, fecha } },
      )
    ).data,
  rulesSave: async (
    restauranteId: string,
    weekday: number,
    body: CalendarRulesInput,
  ) =>
    apiClient.put(`/admin/calendario/reglas/${weekday}`, body, {
      params: { restauranteId },
    }),
  exceptionSave: async (
    restauranteId: string,
    fecha: string,
    body: CalendarExceptionInput,
  ) =>
    apiClient.put(`/admin/calendario/excepciones/${fecha}`, body, {
      params: { restauranteId },
    }),
  exceptionDelete: async (
    restauranteId: string,
    fecha: string,
    confirmarReservasAfectadas?: number,
  ) =>
    apiClient.delete(`/admin/calendario/excepciones/${fecha}`, {
      params: { restauranteId },
      data:
        confirmarReservasAfectadas === undefined
          ? {}
          : { confirmarReservasAfectadas },
    }),
  availability: async (restauranteId: string, fecha: string, pagina = 1) =>
    (
      await apiClient.get<DishAvailabilityPage>('/admin/menu/disponibilidad', {
        params: { restauranteId, fecha, pagina, tamanoPagina: 20 },
      })
    ).data,
  availabilitySave: async (
    restauranteId: string,
    fecha: string,
    body: DishAvailabilityWrite,
  ) =>
    apiClient.put(`/admin/menu/disponibilidad/${fecha}`, body, {
      params: { restauranteId },
    }),
  copy: async (restauranteId: string, body: DishAvailabilityCopy) =>
    (
      await apiClient.post<DishAvailabilityCopyResult>(
        '/admin/menu/disponibilidad/copiar',
        body,
        { params: { restauranteId } },
      )
    ).data,
};
// Solo muestro la confirmación para la advertencia específica de cierre, nunca para cualquier 409.
export function closureWarning(error: unknown): CalendarClosureWarning | null {
  const response = (
    error as {
      response?: {
        status?: number;
        data?: { message?: CalendarClosureWarning };
      };
    }
  )?.response;
  const message = response?.data?.message;
  return response?.status === 409 &&
    message?.codigo === 'RESERVAS_CONFIRMADAS_AFECTADAS' &&
    Number.isInteger(message.reservasAfectadas) &&
    message.reservasAfectadas > 0
    ? message
    : null;
}
export function attentionError(error: unknown): string {
  const e = error as { issues?: unknown[]; response?: { status?: number } };
  if (e?.issues) return 'invalid';
  return e?.response?.status === 401
    ? 'unauthorized'
    : e?.response?.status === 403
      ? 'forbidden'
      : e?.response?.status === 409
        ? 'conflict'
        : e?.response?.status === 404
          ? 'notFound'
          : 'requestFailed';
}
