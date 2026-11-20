import { BadRequestException } from '@nestjs/common';
import { formatCurrencyCOP, RESERVATION_RECEIPT_MAX_BYTES, type ReservationResult } from '@encanto/shared';
import sharp from 'sharp';

export async function normalizeReservationReceipt(buffer?: Buffer) {
  if (!buffer?.length || buffer.length > RESERVATION_RECEIPT_MAX_BYTES) {
    throw new BadRequestException('Adjunta una imagen de hasta 10 MB');
  }
  const limitInputPixels = 14_000_000;
  const jpeg = buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  const png = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  try {
    if (!jpeg && !png && !webp) throw new Error('Firma de imagen no admitida');
    const image = sharp(buffer, { limitInputPixels });
    const { format, width, height, pages } = await image.metadata();
    if (!format || !['jpeg', 'png', 'webp'].includes(format) || !width || !height ||
      Math.max(width, height) > 6200 || Math.min(width, height) > 4200 || (pages ?? 1) > 1) {
      throw new Error('Formato o dimensiones no admitidos');
    }
    // Mantengo los píxeles de la captura y retiro sus metadatos.
    const { data, info } = await image.autoOrient().png().toBuffer({ resolveWithObject: true });
    if (data.length > 16 * 1024 * 1024) throw new Error('La imagen normalizada supera 16 MB');
    return { imagen: data, ancho: info.width, alto: info.height };
  } catch {
    throw new BadRequestException('Usa una imagen JPG, PNG o WebP legible y de hasta 14 megapíxeles');
  }
}

const escapeXml = (value: string) => value.replace(/[<>&"']/g, character => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
}[character] ?? character)).replace(/[\u0000-\u001f\u007f]/g, ' ');
const brand = { green: '#37492E', ink: '#16180F', muted: '#5F6355', paper: '#F6F5F1', white: '#FFFFFF' };
const status: Record<ReservationResult['estado'], string> = {
  SOLICITADA: 'En revisión', CONFIRMADA: 'Confirmada', RECHAZADA: 'Rechazada',
  EXPIRADA: 'Expirada', CANCELADA: 'Cancelada', EN_CURSO: 'En curso',
  COMPLETADA: 'Completada', NO_ASISTIO: 'No asistió',
};

export async function renderReservationTicketImage(
  reservation: ReservationResult,
  receipt: { imagen: Uint8Array; ancho: number; alto: number },
) {
  const margin = 64;
  const width = Math.max(1240, receipt.ancho + margin * 2);
  const scale = Math.min(1.7, width / 1240);
  const size = (value: number) => Math.round(value * scale);
  const text = (y: number, value: string, font: number, color: string, bold = false) =>
    `<text x="${margin * 2}" y="${y}" font-size="${size(font)}" fill="${color}" font-weight="${bold ? 700 : 400}">${escapeXml(value)}</text>`;

  const date = new Intl.DateTimeFormat('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${reservation.fecha}T12:00:00Z`));
  let y = size(484);
  const lines = reservation.lineas.length
    ? reservation.lineas.map(line => `${line.cantidad} × ${line.nombre}  ·  ${formatCurrencyCOP(line.subtotal)}`)
    : ['Solo mesa'];
  const order = lines.flatMap(line => line.match(/.{1,46}(?:\s|$)|.{1,46}/gu) ?? [line]).map(line => {
    y += size(43);
    return text(y, line.trim(), 29, brand.ink);
  }).join('');
  const headerHeight = y + size(244);
  const svg = Buffer.from(`<svg width="${width}" height="${headerHeight}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${brand.paper}"/>
    <rect x="${margin}" y="${size(48)}" width="${width - margin * 2}" height="${size(238)}" rx="${size(28)}" fill="${brand.green}"/>
    <g font-family="DejaVu Sans, Arial, sans-serif">
      ${text(size(113), 'EL ENCANTO CAMPESTRE', 23, brand.white, true)}
      ${text(size(189), 'Resumen de reserva', 53, brand.white, true)}
      ${text(size(250), reservation.codigo, 32, brand.white)}
      ${text(size(355), `${date}  ·  ${reservation.horaInicio}–${reservation.horaFin}`, 35, brand.ink, true)}
      ${text(size(414), `${reservation.numComensales} personas  ·  ${status[reservation.estado]}`, 30, brand.muted)}
      ${text(size(478), 'Pedido', 31, brand.green, true)}
      ${order}
      ${text(y + size(70), `Total de platos  ${formatCurrencyCOP(reservation.total)}`, 36, brand.ink, true)}
      ${text(headerHeight - size(30), 'Comprobante de pago adjunto', 31, brand.green, true)}
    </g>
  </svg>`);
  const height = headerHeight + receipt.alto + margin;
  const image = await sharp({ create: { width, height, channels: 4, background: brand.paper } })
    .composite([
      { input: svg, left: 0, top: 0 },
      { input: Buffer.from(receipt.imagen), left: Math.floor((width - receipt.ancho) / 2), top: headerHeight },
    ]).png().toBuffer();
  return { imagen: image.toString('base64'), ancho: width, alto: height };
}
