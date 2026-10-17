import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { processDishPhoto } from './dish-photo-processing.js';

describe('processDishPhoto', () => {
  it('convierte una imagen aceptada a WebP y crea la vista 1200x630 menor a 600 KB', async () => {
    const input = await sharp({
      create: {
        width: 32,
        height: 24,
        channels: 3,
        background: { r: 120, g: 70, b: 20 },
      },
    })
      .png()
      .toBuffer();

    const result = await processDishPhoto(input);
    const original = await sharp(result.image).metadata();
    const preview = await sharp(result.preview).metadata();

    expect(original.format).toBe('webp');
    expect(preview).toMatchObject({ format: 'webp', width: 1200, height: 630 });
    expect(result.previewBytes).toBeLessThan(600 * 1024);
  });

  it('rechaza formatos no permitidos y buffers vacíos', async () => {
    await expect(processDishPhoto(Buffer.alloc(0))).rejects.toThrow('10 MB');
    await expect(processDishPhoto(Buffer.from('no es una imagen'))).rejects.toThrow();
  });
});
