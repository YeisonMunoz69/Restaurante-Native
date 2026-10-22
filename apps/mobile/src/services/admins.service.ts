import { apiClient } from './api/api-client';
export type AdminAccount = { id: string; nombre: string; correo: string; rol: 'ADMIN' | 'COMENSAL' | 'STAFF'; activo: boolean };
export const adminsApi = {
  // La API aplica el mínimo y permisos vigentes; el cliente no decide quién puede retirarse.
  list: async () => (await apiClient.get<{ minimo: number; activos: number; usuarios: AdminAccount[] }>('/admin/administradores')).data,
  change: async (correo: string, administrador: boolean) => (await apiClient.put<AdminAccount>('/admin/administradores', { correo, administrador })).data,
};
