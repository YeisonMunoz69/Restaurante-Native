import sharp from 'sharp';

export const MAX_DISH_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_INPUT_PIXELS = 25_000_000;
const MAX_OG_BYTES = 600 * 1024;

export interface ProcessedDishPhoto {
  image: Buffer;
  preview: Buffer;
  imageBytes: number;
  previewBytes: number;
}

// Verifico el formato real y guardo versiones WebP antes de enviar la foto al almacenamiento.
export async function processDishPhoto(
  input: Buffer,
): Promise<ProcessedDishPhoto> {
  if (!input.length || input.length > MAX_DISH_PHOTO_BYTES) {
    throw new Error('La foto debe pesar entre 1 byte y 10 MB');
  }

  const source = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS });
  const metadata = await source.metadata();
  if (
    !metadata.width ||
    !metadata.height ||
    !['jpeg', 'png', 'webp'].includes(metadata.format ?? '')
  ) {
    throw new Error('Solo recibimos imágenes JPEG, PNG o WebP válidas');
  }

  const image = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize({ width: 1600, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  let quality = 78;
  let preview = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize(1200, 630, { fit: 'cover', position: 'attention' })
    .webp({ quality, effort: 4 })
    .toBuffer();
  while (preview.length > MAX_OG_BYTES && quality > 42) {
    quality -= 6;
    preview = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize(1200, 630, { fit: 'cover', position: 'attention' })
      .webp({ quality, effort: 4 })
      .toBuffer();
  }
  if (preview.length > MAX_OG_BYTES) {
    throw new Error('No fue posible comprimir la vista previa por debajo de 600 KB');
  }

  return {
    image,
    preview,
    imageBytes: image.length,
    previewBytes: preview.length,
  };
}
