// Solo uso una ruta pública HTTPS completa; no supongo el bucket de Storage.
export function publicMenuPhotoUrl(path: string | null | undefined) {
  if (!path || !/^https:\/\//i.test(path)) return null;
  try {
    return new URL(path).toString();
  } catch {
    return null;
  }
}
