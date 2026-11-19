import { apiClient } from './api/api-client';
export type AccountRole = 'ADMIN' | 'COMENSAL' | 'STAFF';
export type AdminAccount = { id: string; nombre: string; correo: string; rol: AccountRole; activo: boolean; protegido: boolean };
export const adminsApi = {
  // La API aplica el mínimo y permisos vigentes; el cliente no decide quién puede retirarse.
  list: async () => (await apiClient.get<{ minimo: number; activos: number; usuarios: AdminAccount[] }>('/admin/administradores/roles')).data,
  change: async (correo: string, rol: AccountRole) => {
    await apiClient.put('/admin/administradores/roles', { correo, rol });
  },
};
