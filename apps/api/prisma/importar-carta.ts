import { PrismaClient } from '@prisma/client';
import { cartaOriginal, cartaSlug } from './carta-original.js';

// Por defecto solo previsualizo. No ejecuto el seed de usuarios ni cambio fotos o platos existentes.
const restaurantId = process.env.CATALOG_RESTAURANT_ID;
if (!restaurantId || !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(restaurantId)) throw new Error('Defina CATALOG_RESTAURANT_ID con la sede exacta');
const apply = process.argv.includes('--apply');
const prisma = new PrismaClient();
try {
  const report = await prisma.$transaction(async db => {
    // Serializo importaciones de esta sede sin bloquear la edición normal de otras sedes.
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`carta-original/${restaurantId}`}))`;
    if (!await db.restaurant.findUnique({ where: { id: restaurantId }, select: { id: true } })) throw new Error('La sede no existe');
    let created = 0, preserved = 0;
    for (const [index, category] of cartaOriginal.entries()) {
      let row = await db.category.findFirst({ where: { restaurantId, nombre: { equals: category.categoria, mode: 'insensitive' } } });
      if (!row && apply) row = await db.category.create({ data: { restaurantId, nombre: category.categoria, orden: index } });
      for (const [order, [nombre, precio, descripcion]] of category.platos.entries()) {
        const existing = await db.dish.findFirst({ where: { category: { restaurantId }, OR: [{ slug: cartaSlug(restaurantId, nombre) }, { nombre: { equals: nombre, mode: 'insensitive' } }] }, select: { id: true } });
        if (existing) { preserved++; continue; }
        created++;
        if (apply && row) await db.dish.create({ data: { categoryId: row.id, nombre, slug: cartaSlug(restaurantId, nombre), descripcion, descripcionBreve: descripcion.slice(0, 160), precio, orden: order, disponible: true, activo: true } });
      }
    }
    return { modo: apply ? 'aplicado' : 'previsualizacion', nuevos: created, conservados: preserved, fotosCreadas: 0 };
  }, { timeout: 60000 });
  console.log(JSON.stringify(report));
} finally { await prisma.$disconnect(); }
