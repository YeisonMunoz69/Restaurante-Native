import type { PaymentConfig, PaymentConfigResult } from '@encanto/shared';
import { apiClient } from './api/api-client';

// Consulto la configuración del servidor; nunca guardo cuentas en .env o constantes del móvil.
export const paymentApi = {
  current: async () =>
    (await apiClient.get<PaymentConfigResult>('/reservas/datos-pago')).data,
  adminCurrent: async () =>
    (await apiClient.get<PaymentConfigResult>('/admin/configuracion/pagos'))
      .data,
  save: async (body: PaymentConfig) =>
    (
      await apiClient.put<PaymentConfigResult>(
        '/admin/configuracion/pagos',
        body,
      )
    ).data,
};
