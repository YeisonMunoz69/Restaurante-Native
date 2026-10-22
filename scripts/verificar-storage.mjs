import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { SupabaseStorageService } from '../apps/api/dist/menu-admin/supabase-storage.service.js';

// Exijo autorización explícita: esta comprobación escribe un único objeto remoto.
assert(process.argv.includes('--allow-test-upload'), 'Falta --allow-test-upload');
const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, SUPABASE_STORAGE_BUCKET: bucket } = process.env;
assert(url && key && bucket, 'Faltan variables de Storage en el archivo de la API');
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: info, error } = await client.storage.getBucket(bucket);
assert(!error && info?.public, 'No pudimos verificar el bucket público');
const prefix = `qa/${new Date().toISOString().slice(0, 10)}`;
const filename = `${randomUUID()}.webp`;
const objectPath = `${prefix}/${filename}`;
const service = new SupabaseStorageService();
const picture = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#526344' } }).webp().toBuffer();
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
let uploaded = false;
try {
  // Uso el adaptador real de la API, sin crear platos ni tocar la base compartida.
  await service.upload(objectPath, picture);
  uploaded = true;
  const publicUrl = service.publicUrl(objectPath);
  assert.equal(service.objectPath(publicUrl), objectPath);
  const response = await fetch(publicUrl);
  assert.equal(response.status, 200, 'La imagen pública no respondió HTTP 200');
  assert.match(response.headers.get('content-type') ?? '', /image\/webp/);
  assert.equal(digest(Buffer.from(await response.arrayBuffer())), digest(picture));
  console.log(JSON.stringify({ storage: 'ok', bucket, objectPath, publicHttp: 200, bytes: picture.length, sameContent: true }));
} finally {
  if (uploaded) {
    // Retiro exclusivamente el objeto único que acabamos de subir, nunca una carpeta.
    await service.remove([objectPath]);
    const result = await client.storage.from(bucket).list(prefix, { search: filename });
    assert(!result.error && !result.data?.some(item => item.name === filename), `Revisar limpieza de ${objectPath}`);
    console.log(JSON.stringify({ cleanup: 'ok', removedObject: objectPath }));
  }
}
