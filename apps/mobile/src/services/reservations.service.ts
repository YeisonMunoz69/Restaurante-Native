import type {
  ReservationCreate,
  ReservationListQuery,
  ReservationReject,
  ReservationResult,
  ReservationSlot,
  ReservationSlotsQuery,
} from '@encanto/shared';
import { apiClient } from './api/api-client';

export interface ReservationSlotsResult {
  fecha: string;
  zonaHoraria: string;
  duracionMin: number;
  franjas: ReservationSlot[];
  mensaje: string | null;
}

export interface ReservationWithCustomer extends ReservationResult {
  puedeMarcarInasistencia?: boolean;
  cliente: {
    id: string;
    nombre: string;
    telefono: string;
    cancelaciones: number;
    inasistencias: number;
  };
}

export interface CreateReservationResult {
  reserva: ReservationResult;
  whatsapp: string;
  instruccionesPago: string;
}

// Mantengo juntos los endpoints autenticados del comensal y del panel operativo.
export const reservationsApi = {
  slots: async (query: ReservationSlotsQuery) =>
    (await apiClient.get<ReservationSlotsResult>('/reservas/franjas', { params: query })).data,

  create: async (body: ReservationCreate) =>
    (await apiClient.post<CreateReservationResult>('/reservas', body)).data,

  mine: async (query: ReservationListQuery = {}) =>
    (await apiClient.get<ReservationResult[]>('/reservas/mias', { params: query })).data,

  detail: async (id: string) =>
    (await apiClient.get<ReservationResult>(`/reservas/mias/${id}`)).data,

  cancel: async (id: string) =>
    (await apiClient.patch<ReservationResult>(`/reservas/mias/${id}/cancelar`)).data,

  requests: async (query: ReservationListQuery = {}) =>
    (await apiClient.get<ReservationWithCustomer[]>('/admin/reservas/solicitudes', { params: query })).data,

  approve: async (id: string) =>
    (await apiClient.patch<ReservationResult>(`/admin/reservas/${id}/aprobar`)).data,

  reject: async (id: string, body: ReservationReject) =>
    (await apiClient.patch<ReservationResult>(`/admin/reservas/${id}/rechazar`, body)).data,

  agenda: async (fecha: string) =>
    (await apiClient.get<ReservationWithCustomer[]>('/admin/reservas/agenda', { params: { fecha } })).data,

  markArrival: async (id: string) =>
    (await apiClient.patch<ReservationResult>(`/admin/reservas/${id}/llegada`)).data,

  markNoShow: async (id: string) =>
    (await apiClient.patch<ReservationResult>(`/admin/reservas/${id}/inasistencia`)).data,

  complete: async (id: string) =>
    (await apiClient.patch<ReservationResult>(`/admin/reservas/${id}/completar`)).data,
};
