import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseStorageService {
  private client: SupabaseClient | null = null;
  private bucketName: string | null = null;

  private storage() {
    const url = process.env.SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET?.trim();
    if (!url || !serviceKey || !bucketName) {
      throw new ServiceUnavailableException(
        'Falta configurar el almacenamiento de fotos en el servidor',
      );
    }
    if (!this.client || this.bucketName !== bucketName) {
      this.client = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      this.bucketName = bucketName;
    }
    return { client: this.client, bucketName };
  }

  publicUrl(path: string) {
    const { client, bucketName } = this.storage();
    return client.storage.from(bucketName).getPublicUrl(path).data.publicUrl;
  }

  async upload(path: string, body: Buffer) {
    const { client, bucketName } = this.storage();
    const { error } = await client.storage.from(bucketName).upload(path, body, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) {
      throw new ServiceUnavailableException(
        'No se pudo guardar la imagen en Supabase Storage',
      );
    }
  }

  async remove(paths: string[]) {
    if (!paths.length) return;
    const { client, bucketName } = this.storage();
    const { error } = await client.storage.from(bucketName).remove(paths);
    if (error) {
      throw new ServiceUnavailableException(
        'No se pudo limpiar la imagen de Supabase Storage',
      );
    }
  }

  objectPath(publicUrl: string) {
    const { client, bucketName } = this.storage();
    const base = client.storage.from(bucketName).getPublicUrl('').data.publicUrl;
    const prefix = base.endsWith('/') ? base : `${base}/`;
    if (!publicUrl.startsWith(prefix)) {
      throw new ServiceUnavailableException(
        'La foto no pertenece al bucket configurado',
      );
    }
    return decodeURIComponent(publicUrl.slice(prefix.length));
  }
}
