// ==============================================================================
// SCRIPT DE SIEMBRA (SEED) - EL ENCANTO CAMPESTRE
// Autor: Fabián Hoyos (Infraestructura, Datos y Seguridad)
//
// En este script pueblo la base de datos de PostgreSQL/Supabase con datos
// reales y verosímiles del restaurante campestre ubicado en Timbío, Cauca.
// Incluyo restaurante, zonas, mesas, categorías, platos autóctonos con precios
// en pesos colombianos, fotos de prueba, etiquetas, calendario y usuarios
// de prueba con contraseñas seguras hasheadas con Argon2id.
// ==============================================================================

import { PrismaClient, Role, ReservationStatus, NotificationType, DevicePlatform } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la siembra de datos de El Encanto Campestre...');

  // ----------------------------------------------------------------------------
  // 1. USUARIOS DE PRUEBA (COMENSAL, STAFF, ADMIN)
  // ----------------------------------------------------------------------------
  console.log('👤 Creando usuarios de prueba con contraseñas cifradas en Argon2id...');

  // hasheo las contraseñas con argon2 para coincidir con la autenticación de Alex
  const hashComensal = await argon2.hash('Comensal123*');
  const hashStaff = await argon2.hash('Staff123*');
  const hashAdmin = await argon2.hash('Admin123*');

  // usuario comensal: cliente frecuente que realiza reservas
  const comensal = await prisma.user.upsert({
    where: { correo: 'comensal@encanto.com' },
    update: {
      nombre: 'Carlos Comensal Paz',
      telefono: '3123456781',
      passwordHash: hashComensal,
      rol: Role.COMENSAL,
      activo: true,
      correoVerificado: true,
    },
    create: {
      nombre: 'Carlos Comensal Paz',
      correo: 'comensal@encanto.com',
      telefono: '3123456781',
      passwordHash: hashComensal,
      rol: Role.COMENSAL,
      activo: true,
      correoVerificado: true,
    },
  });

  // usuario staff: mesero o personal de atención que verifica comensales
  const staff = await prisma.user.upsert({
    where: { correo: 'staff@encanto.com' },
    update: {
      nombre: 'María Mesera López',
      telefono: '3123456782',
      passwordHash: hashStaff,
      rol: Role.STAFF,
      activo: true,
      correoVerificado: true,
    },
    create: {
      nombre: 'María Mesera López',
      correo: 'staff@encanto.com',
      telefono: '3123456782',
      passwordHash: hashStaff,
      rol: Role.STAFF,
      activo: true,
      correoVerificado: true,
    },
  });

  // usuario admin: dueño del restaurante con privilegios totales
  const admin = await prisma.user.upsert({
    where: { correo: 'admin@encanto.com' },
    update: {
      nombre: 'Don Gonzalo Dueño Hoyos',
      telefono: '3123456783',
      passwordHash: hashAdmin,
      rol: Role.ADMIN,
      activo: true,
      correoVerificado: true,
    },
    create: {
      nombre: 'Don Gonzalo Dueño Hoyos',
      correo: 'admin@encanto.com',
      telefono: '3123456783',
      passwordHash: hashAdmin,
      rol: Role.ADMIN,
      activo: true,
      correoVerificado: true,
    },
  });

  console.log(`✅ Usuarios creados: Comensal (${comensal.correo}), Staff (${staff.correo}), Admin (${admin.correo})`);

  // ----------------------------------------------------------------------------
  // 2. RESTAURANTE PRINCIPAL (TIMBÍO, CAUCA)
  // ----------------------------------------------------------------------------
  console.log('🏡 Registrando la sede principal de El Encanto Campestre en Timbío...');

  // busco si ya existe el restaurante para no duplicarlo al re-sembrar
  let restaurant = await prisma.restaurant.findFirst({
    where: { nombre: 'El Encanto Campestre' },
  });

  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: {
        nombre: 'El Encanto Campestre',
        direccion: 'Vereda Las Huacas, Timbío, Cauca, Colombia',
        latitud: 2.348611,
        longitud: -76.684167,
        telefono: '+57 312 345 6789',
        whatsapp: '+57 312 345 6789',
        aforoTotal: 120,
        duracionReservaHasta4Min: 90,
        duracionReservaDesde5Min: 120,
        granularidadMin: 30,
        toleranciaMin: 30,
        ventanaCancelacionMin: 60,
        anticipacionMaxMeses: 3,
        anticipacionMinMin: 60,
        minPersonasEntreSemana: 15,
        horasExpiracionSolicitud: 12,
      },
    });
  }

  // ----------------------------------------------------------------------------
  // 3. ZONAS Y MESAS CON CAPACIDADES REALES
  // ----------------------------------------------------------------------------
  console.log('🪑 Configurando zonas (Salón Principal, Terraza Campestre y Mirador) y sus mesas...');

  // zona 1: Salón Principal techado
  let zonaSalon = await prisma.zone.findFirst({
    where: { restaurantId: restaurant.id, nombre: 'Salón Principal' },
  });
  if (!zonaSalon) {
    zonaSalon = await prisma.zone.create({
      data: {
        restaurantId: restaurant.id,
        nombre: 'Salón Principal',
        descripcion: 'Área techada principal con vista al patio central y barra de café',
        reservableEnApp: true,
        activa: true,
      },
    });
  }

  // zona 2: Terraza Campestre al aire libre
  let zonaTerraza = await prisma.zone.findFirst({
    where: { restaurantId: restaurant.id, nombre: 'Terraza Campestre' },
  });
  if (!zonaTerraza) {
    zonaTerraza = await prisma.zone.create({
      data: {
        restaurantId: restaurant.id,
        nombre: 'Terraza Campestre',
        descripcion: 'Espacio fresco al aire libre rodeado de jardines florales y naturaleza',
        reservableEnApp: true,
        activa: true,
      },
    });
  }

  // zona 3: Mirador VIP panorámico
  let zonaMirador = await prisma.zone.findFirst({
    where: { restaurantId: restaurant.id, nombre: 'Mirador' },
  });
  if (!zonaMirador) {
    zonaMirador = await prisma.zone.create({
      data: {
        restaurantId: restaurant.id,
        nombre: 'Mirador',
        descripcion: 'Zona campestre exclusiva tipo Mirador VIP con vista panorámica a las montañas de Timbío',
        reservableEnApp: true,
        activa: true,
      },
    });
  }

  // creo las mesas del Salón Principal si no existen
  const mesasSalon = [
    { codigo: 'M-01', capacidad: 4 },
    { codigo: 'M-02', capacidad: 4 },
    { codigo: 'M-03', capacidad: 6 },
    { codigo: 'M-04', capacidad: 6 },
    { codigo: 'M-05', capacidad: 8 },
    { codigo: 'M-06', capacidad: 10 },
  ];
  for (const m of mesasSalon) {
    const existeMesa = await prisma.table.findFirst({
      where: { zoneId: zonaSalon.id, codigo: m.codigo },
    });
    if (!existeMesa) {
      await prisma.table.create({
        data: {
          zoneId: zonaSalon.id,
          codigo: m.codigo,
          capacidad: m.capacidad,
          combinable: true,
          activa: true,
        },
      });
    }
  }

  // creo las mesas de la Terraza Campestre
  const mesasTerraza = [
    { codigo: 'T-01', capacidad: 4 },
    { codigo: 'T-02', capacidad: 4 },
    { codigo: 'T-03', capacidad: 6 },
    { codigo: 'T-04', capacidad: 6 },
    { codigo: 'T-05', capacidad: 8 },
  ];
  for (const m of mesasTerraza) {
    const existeMesa = await prisma.table.findFirst({
      where: { zoneId: zonaTerraza.id, codigo: m.codigo },
    });
    if (!existeMesa) {
      await prisma.table.create({
        data: {
          zoneId: zonaTerraza.id,
          codigo: m.codigo,
          capacidad: m.capacidad,
          combinable: true,
          activa: true,
        },
      });
    }
  }

  // mesa del Mirador VIP: hasta 10 adultos y 2 niños (12 personas)
  const existeMesaMirador = await prisma.table.findFirst({
    where: { zoneId: zonaMirador.id, codigo: 'MIRADOR-VIP' },
  });
  if (!existeMesaMirador) {
    await prisma.table.create({
      data: {
        zoneId: zonaMirador.id,
        codigo: 'MIRADOR-VIP',
        capacidad: 12,
        combinable: false,
        activa: true,
      },
    });
  }

  // ----------------------------------------------------------------------------
  // 4. ETIQUETAS DIETÉTICAS
  // ----------------------------------------------------------------------------
  console.log('🏷️ Registrando etiquetas de alérgenos y tipos de comida...');

  const etiquetasData = [
    { nombre: 'Sin gluten', icono: 'wheat-off' },
    { nombre: 'Para compartir', icono: 'users' },
    { nombre: 'Plato típico caucano', icono: 'utensils' },
    { nombre: 'Especialidad al carbón', icono: 'flame' },
    { nombre: 'Vegetariano', icono: 'leaf' },
  ];

  const mapaEtiquetas = new Map<string, string>();
  for (const et of etiquetasData) {
    const creada = await prisma.dietaryTag.upsert({
      where: { nombre: et.nombre },
      update: { icono: et.icono },
      create: { nombre: et.nombre, icono: et.icono },
    });
    mapaEtiquetas.set(et.nombre, creada.id);
  }

  // ----------------------------------------------------------------------------
  // 5. CATEGORÍAS DE LA CARTA
  // ----------------------------------------------------------------------------
  console.log('📖 Creando categorías gastronómicas...');

  const categoriasData = [
    { nombre: 'Sopas y Tradición Caucana', orden: 1 },
    { nombre: 'Platos Fuertes y Especialidades Campestres', orden: 2 },
    { nombre: 'Asados al Carbón y Parrilla', orden: 3 },
    { nombre: 'Amasijos y Entradas Típicas', orden: 4 },
    { nombre: 'Postres Caseros y Dulces', orden: 5 },
    { nombre: 'Bebidas Naturales y Café de Origen', orden: 6 },
  ];

  const mapaCategorias = new Map<string, string>();
  for (const cat of categoriasData) {
    let catDb = await prisma.category.findFirst({
      where: { restaurantId: restaurant.id, nombre: cat.nombre },
    });
    if (!catDb) {
      catDb = await prisma.category.create({
        data: {
          restaurantId: restaurant.id,
          nombre: cat.nombre,
          orden: cat.orden,
          activa: true,
        },
      });
    }
    mapaCategorias.set(cat.nombre, catDb.id);
  }

  // ----------------------------------------------------------------------------
  // 6. PLATOS REPRESENTATIVOS CAUCANOS (AL MENOS 16 PLATOS REALES)
  // ----------------------------------------------------------------------------
  console.log('🍲 Sembrando al menos 16 platos representativos con fotos y precios en COP...');

  const platosData = [
    {
      categoria: 'Sopas y Tradición Caucana',
      nombre: 'Sancocho de gallina criolla a la leña',
      slug: 'sancocho-de-gallina-criolla-a-la-lena',
      descripcionBreve: 'Gallina criolla cocinada a fuego de leña con plátano verde, yuca y mazorca tierna.',
      descripcion:
        'Preparado pacientemente durante tres horas a fuego lento con hierbas de azotea timbianas. Servido con abundante presa campesina, porción de arroz blanco, ensalada campesina y consomé caliente con cilantro fresco.',
      precio: 38000,
      alergenos: 'Ninguno',
      disponible: true,
      destacado: true,
      orden: 1,
      etiquetas: ['Sin gluten', 'Plato típico caucano'],
      foto: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
    },
    {
      categoria: 'Platos Fuertes y Especialidades Campestres',
      nombre: 'Bandeja campesina El Encanto',
      slug: 'bandeja-campesina-el-encanto',
      descripcionBreve: 'Carne asada, chicharrón crujiente, arroz, frijol caucano, huevo frito, tajada y arepa.',
      descripcion:
        'Nuestra insignia de la casa. Servida con porciones muy generosas para saciar el apetito de campo: frijoles caldosos sazonados con sofrito tradicional, chicharrón crocante seleccionado y carne de res al punto.',
      precio: 45000,
      alergenos: 'Huevo',
      disponible: true,
      destacado: true,
      orden: 2,
      etiquetas: ['Para compartir', 'Especialidad al carbón'],
      foto: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    },
    {
      categoria: 'Platos Fuertes y Especialidades Campestres',
      nombre: 'Trucha arcoíris al ajillo',
      slug: 'trucha-arcoiris-al-ajillo',
      descripcionBreve: 'Trucha fresca de piscícola local salteada con láminas de ajo tostado y mantequilla campesina.',
      descripcion:
        'Filete fresco bañado en reducción aromática de ajo criollo, mantequilla artesanal y un toque de limón mandarino. Acompañada con patacones crocantes recién hechos y ensalada fresca de la huerta.',
      precio: 42000,
      alergenos: 'Pescado, Lácteos',
      disponible: true,
      destacado: true,
      orden: 3,
      etiquetas: ['Sin gluten', 'Plato típico caucano'],
      foto: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
    },
    {
      categoria: 'Asados al Carbón y Parrilla',
      nombre: 'Asado campestre mixto al carbón',
      slug: 'asado-campestre-mixto-al-carbon',
      descripcionBreve: 'Generosa combinación de lomo de res tierno, costilla de cerdo y chorizo artesanal.',
      descripcion:
        'Cortes asados a la brasa con carbón de leña seleccionada, acompañados de papa criolla dorada al vapor con sal marina, arepa de choclo caliente y chimichurri casero con hierbas de nuestra huerta.',
      precio: 48000,
      alergenos: 'Ninguno',
      disponible: true,
      destacado: true,
      orden: 4,
      etiquetas: ['Especialidad al carbón', 'Para compartir'],
      foto: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
    },
    {
      categoria: 'Asados al Carbón y Parrilla',
      nombre: 'Costillitas de cerdo en salsa de panela y maracuyá',
      slug: 'costillitas-de-cerdo-panela-maracuya',
      descripcionBreve: 'Costillas tiernas glaseadas con miel de panela orgánica de Timbío y reducción de maracuyá.',
      descripcion:
        'Tiernas costillas de cerdo marinadas con achiote y especias locales, terminadas a la parrilla con reducción agridulce de maracuyá y panela de trapiche timbiano. Se deshacen al morder.',
      precio: 44000,
      alergenos: 'Ninguno',
      disponible: true,
      destacado: false,
      orden: 5,
      etiquetas: ['Especialidad al carbón'],
      foto: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=800&q=80',
    },
    {
      categoria: 'Amasijos y Entradas Típicas',
      nombre: 'Empanadas de pipián caucanas',
      slug: 'empanadas-de-pipian-caucanas',
      descripcionBreve: 'Porción de 6 empanadas crocantes de maíz añejo rellenas de pipián con ají de maní casero.',
      descripcion:
        'Masa delgada y crujiente de maíz añejo rellena con papa colorada, sofrito payanés y maní tostado. Se sirven calientes acompañadas del infaltable y generoso ají de maní tradicional.',
      precio: 16000,
      alergenos: 'Maní',
      disponible: true,
      destacado: true,
      orden: 6,
      etiquetas: ['Plato típico caucano', 'Sin gluten'],
      foto: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80',
    },
    {
      categoria: 'Amasijos y Entradas Típicas',
      nombre: 'Tamales de pipián tradicionales',
      slug: 'tamal-de-pipian-tradicional',
      descripcionBreve: 'Envuelto en hoja de plátano cocido al vapor con suave masa de maíz y relleno de pipián.',
      descripcion:
        'Receta centenaria caucana. La hoja de plátano fresca de nuestra finca le impregna su aroma campestre inconfundible. Servido caliente con ají de maní recién preparado.',
      precio: 14000,
      alergenos: 'Maní',
      disponible: true,
      destacado: false,
      orden: 7,
      etiquetas: ['Plato típico caucano', 'Sin gluten'],
      foto: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
    },
    {
      categoria: 'Sopas y Tradición Caucana',
      nombre: 'Carantanta en sopa criolla',
      slug: 'sopa-de-carantanta-criolla',
      descripcionBreve: 'Tradicional caldo caucano con trozos crujientes de carantanta de maíz, papa y huevo campesino.',
      descripcion:
        'Auténtica sopa reconfortante de la cocina del Cauca, elaborada con el fondo de la paila de maíz curada, sazonada con cebolla de rama, comino y cilantro silvestre recién cortado.',
      precio: 18000,
      alergenos: 'Huevo',
      disponible: true,
      destacado: false,
      orden: 8,
      etiquetas: ['Plato típico caucano'],
      foto: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
    },
    {
      categoria: 'Asados al Carbón y Parrilla',
      nombre: 'Picada campestre El Encanto (3-4 personas)',
      slug: 'picada-campestre-el-encanto',
      descripcionBreve: 'Carne de cerdo, res, chicharrón, plátano maduro con queso, papa criolla y arepitas.',
      descripcion:
        'Ideal para compartir en familia al aire libre en la terraza. Incluye trozos de bondiola a la brasa, chicharrón carnudo crujiente, morcilla campesina, papas criollas doradas y ají de la casa.',
      precio: 65000,
      alergenos: 'Lácteos',
      disponible: true,
      destacado: true,
      orden: 9,
      etiquetas: ['Para compartir', 'Especialidad al carbón'],
      foto: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    },
    {
      categoria: 'Platos Fuertes y Especialidades Campestres',
      nombre: 'Sobrebarriga en salsa criolla a la cazuela',
      slug: 'sobrebarriga-en-salsa-criolla',
      descripcionBreve: 'Sobrebarriga tierna estofada lentamente con tomate chonto, cebolla junca y especias.',
      descripcion:
        'Corte cocinado durante cuatro horas hasta lograr una textura que se desbarata con el tenedor, bañado en abundante salsa criolla con yuca suave al vapor y arroz blanco suelto.',
      precio: 40000,
      alergenos: 'Ninguno',
      disponible: true,
      destacado: false,
      orden: 10,
      etiquetas: ['Sin gluten', 'Plato típico caucano'],
      foto: 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?auto=format&fit=crop&w=800&q=80',
    },
    {
      categoria: 'Bebidas Naturales y Café de Origen',
      nombre: 'Salpicón payanés refrescante',
      slug: 'salpicon-payanes-refrescante',
      descripcionBreve: 'Bebida tradicional elaborada con lulo, mora silvestre, guanábana y hielo raspado.',
      descripcion:
        'Deliciosa bebida típica del departamento del Cauca a base de pulpas de frutas ácidas frescas picadas, aromatizada con un toque dulce y refrescante, perfecta para los días soleados en la vereda.',
      precio: 12000,
      alergenos: 'Ninguno',
      disponible: true,
      destacado: true,
      orden: 11,
      etiquetas: ['Vegetariano', 'Sin gluten', 'Plato típico caucano'],
      foto: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
    },
    {
      categoria: 'Postres Caseros y Dulces',
      nombre: 'Postre de natas tradicional',
      slug: 'postre-de-natas-tradicional',
      descripcionBreve: 'Delicadas capas de nata de leche pura cocidas en almíbar especiado con pasas rubias.',
      descripcion:
        'Postre insignia de la tradición colonial caucana, elaborado artesanalmente recolectando las natas de la leche de ordeño matutino con canela en astilla y clavos de olor.',
      precio: 10000,
      alergenos: 'Lácteos',
      disponible: true,
      destacado: false,
      orden: 12,
      etiquetas: ['Vegetariano'],
      foto: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
    },
    {
      categoria: 'Postres Caseros y Dulces',
      nombre: 'Dulce de brevas caladas con arequipe y queso',
      slug: 'brevas-con-arequipe-y-queso',
      descripcionBreve: 'Brevas caladas en melao de panela acompañadas de generoso arequipe y queso campesino fresco.',
      descripcion:
        'El equilibrio perfecto entre lo dulce de las brevas cocidas lentamente en paila de cobre y el toque salino del queso campesino fresco producido en las fincas de Timbío.',
      precio: 11000,
      alergenos: 'Lácteos',
      disponible: true,
      destacado: false,
      orden: 13,
      etiquetas: ['Vegetariano'],
      foto: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=800&q=80',
    },
    {
      categoria: 'Bebidas Naturales y Café de Origen',
      nombre: 'Limonada de panela orgánica con yerbabuena',
      slug: 'limonada-de-panela-con-yerbabuena',
      descripcionBreve: 'Aguapanela bien fría con limón mandarino recién exprimido y hojas frescas de yerbabuena.',
      descripcion:
        'Preparada con panela producida en trapiches de la región caucana, infusionada con hojas de yerbabuena fresca de nuestra propia huerta orgánica.',
      precio: 7000,
      alergenos: 'Ninguno',
      disponible: true,
      destacado: false,
      orden: 14,
      etiquetas: ['Vegetariano', 'Sin gluten'],
      foto: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
    },
    {
      categoria: 'Bebidas Naturales y Café de Origen',
      nombre: 'Café especial de origen Timbío',
      slug: 'cafe-especial-origen-timbio',
      descripcionBreve: 'Café variedad Castillo cultivado a 1.750 msnm con notas a chocolate amargo y frutos rojos.',
      descripcion:
        'Grano de alta calidad tostado artesanalmente por caficultores de la vereda Las Huacas, Timbío. Servido recién molido en prensa francesa o método filtrado V60.',
      precio: 6000,
      alergenos: 'Ninguno',
      disponible: true,
      destacado: true,
      orden: 15,
      etiquetas: ['Vegetariano', 'Sin gluten', 'Plato típico caucano'],
      foto: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80',
    },
    {
      categoria: 'Amasijos y Entradas Típicas',
      nombre: 'Porción de patacones crocantes con hogao criollo',
      slug: 'patacones-con-hogao-criollo',
      descripcionBreve: 'Cuatro patacones de plátano verde bien crocantes servidos con cazuela de hogao campesino caliente.',
      descripcion:
        'Plátanos verdes pisados a mano y fritos al momento para lograr máxima crocancia, acompañados con abundante hogao preparado con cebolla larga, tomate maduro y sofrito tradicional.',
      precio: 12000,
      alergenos: 'Ninguno',
      disponible: true,
      destacado: false,
      orden: 16,
      etiquetas: ['Vegetariano', 'Sin gluten', 'Plato típico caucano'],
      foto: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=800&q=80',
    },
  ];

  for (const platoItem of platosData) {
    const catId = mapaCategorias.get(platoItem.categoria);
    if (!catId) continue;

    // inserto o actualizo el plato por su slug único
    const plato = await prisma.dish.upsert({
      where: { slug: platoItem.slug },
      update: {
        categoryId: catId,
        nombre: platoItem.nombre,
        descripcionBreve: platoItem.descripcionBreve,
        descripcion: platoItem.descripcion,
        precio: platoItem.precio,
        alergenos: platoItem.alergenos,
        disponible: platoItem.disponible,
        destacado: platoItem.destacado,
        orden: platoItem.orden,
      },
      create: {
        categoryId: catId,
        nombre: platoItem.nombre,
        slug: platoItem.slug,
        descripcionBreve: platoItem.descripcionBreve,
        descripcion: platoItem.descripcion,
        precio: platoItem.precio,
        alergenos: platoItem.alergenos,
        disponible: platoItem.disponible,
        destacado: platoItem.destacado,
        orden: platoItem.orden,
      },
    });

    // agrego su foto principal de prueba
    const existeFoto = await prisma.dishPhoto.findFirst({
      where: { dishId: plato.id, principal: true },
    });
    if (!existeFoto) {
      await prisma.dishPhoto.create({
        data: {
          dishId: plato.id,
          path: platoItem.foto,
          pathOg: platoItem.foto,
          orden: 1,
          principal: true,
        },
      });
    }

    // vinculo las etiquetas dietéticas al plato
    for (const nombreEtiqueta of platoItem.etiquetas) {
      const tagId = mapaEtiquetas.get(nombreEtiqueta);
      if (tagId) {
        await prisma.dishDietaryTag.upsert({
          where: {
            dishId_tagId: {
              dishId: plato.id,
              tagId: tagId,
            },
          },
          update: {},
          create: {
            dishId: plato.id,
            tagId: tagId,
          },
        });
      }
    }
  }

  // ----------------------------------------------------------------------------
  // 7. CALENDARIO DE ATENCIÓN: FINES DE SEMANA Y FESTIVOS
  // ----------------------------------------------------------------------------
  console.log('📅 Programando calendario de atención para los próximos fines de semana y festivos...');

  // horario habitual: sábados (10:00 a 18:00) y domingos (09:00 a 18:00)
  const reglasSemanales = [
    { diaSemana: 0, horaApertura: '09:00', horaCierre: '18:00', abierto: true }, // Domingo
    { diaSemana: 6, horaApertura: '10:00', horaCierre: '18:00', abierto: true }, // Sábado
  ];

  for (const regla of reglasSemanales) {
    const existeRegla = await prisma.timeSlot.findFirst({
      where: { restaurantId: restaurant.id, diaSemana: regla.diaSemana },
    });
    if (!existeRegla) {
      await prisma.timeSlot.create({
        data: {
          restaurantId: restaurant.id,
          diaSemana: regla.diaSemana,
          horaApertura: regla.horaApertura,
          horaCierre: regla.horaCierre,
          abierto: regla.abierto,
          aforoMaximo: 120,
          activo: true,
        },
      });
    }
  }

  // fechas concretas para los próximos fines de semana y festivos (septiembre y octubre 2026)
  const diasAtencionData = [
    { fecha: '2026-09-12', abierto: true, apertura: '10:00', cierre: '18:00', motivo: 'Sábado campestre regular' },
    { fecha: '2026-09-13', abierto: true, apertura: '09:00', cierre: '18:00', motivo: 'Domingo familiar con sancocho' },
    { fecha: '2026-09-19', abierto: true, apertura: '10:00', cierre: '18:00', motivo: 'Sábado de asados al carbón' },
    { fecha: '2026-09-20', abierto: true, apertura: '09:00', cierre: '18:00', motivo: 'Domingo de trucha y pesca' },
    { fecha: '2026-09-26', abierto: true, apertura: '10:00', cierre: '18:00', motivo: 'Sábado de música campestre' },
    { fecha: '2026-09-27', abierto: true, apertura: '09:00', cierre: '18:00', motivo: 'Domingo de tradición caucana' },
    { fecha: '2026-10-12', abierto: true, apertura: '09:00', cierre: '18:00', motivo: 'Festivo Día de la Raza' },
  ];

  for (const dia of diasAtencionData) {
    const fechaObj = new Date(`${dia.fecha}T00:00:00.000Z`);
    await prisma.calendarDay.upsert({
      where: {
        restaurantId_fecha: {
          restaurantId: restaurant.id,
          fecha: fechaObj,
        },
      },
      update: {
        abierto: dia.abierto,
        horaApertura: dia.apertura,
        horaCierre: dia.cierre,
        motivo: dia.motivo,
      },
      create: {
        restaurantId: restaurant.id,
        fecha: fechaObj,
        abierto: dia.abierto,
        horaApertura: dia.apertura,
        horaCierre: dia.cierre,
        soloPorReserva: false,
        motivo: dia.motivo,
      },
    });
  }

  // ----------------------------------------------------------------------------
  // 8. NOTICIAS INICIALES DEL MURO
  // ----------------------------------------------------------------------------
  console.log('📰 Publicando novedades en el muro de noticias...');

  const noticiaFijada = await prisma.newsPost.findFirst({
    where: { restaurantId: restaurant.id, titulo: '¡Bienvenidos a la nueva temporada de El Encanto Campestre!' },
  });

  if (!noticiaFijada) {
    await prisma.newsPost.create({
      data: {
        restaurantId: restaurant.id,
        autorId: admin.id,
        titulo: '¡Bienvenidos a la nueva temporada de El Encanto Campestre!',
        cuerpo:
          'Abrimos nuestras puertas todos los fines de semana y festivos en la vereda Las Huacas, Timbío. Ven a disfrutar de nuestro sancocho de gallina a la leña, asados al carbón y la tranquilidad del campo caucano.',
        imagenPath: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
        fijada: true,
        publicada: true,
        enlaces: {
          whatsapp: 'https://wa.me/573123456789',
          mapa: 'https://maps.google.com/?q=2.348611,-76.684167',
        },
      },
    });
  }

  const noticiaPesca = await prisma.newsPost.findFirst({
    where: { restaurantId: restaurant.id, titulo: 'Próxima inauguración: Pista de motos y zona de pesca deportiva' },
  });

  if (!noticiaPesca) {
    await prisma.newsPost.create({
      data: {
        restaurantId: restaurant.id,
        autorId: admin.id,
        titulo: 'Próxima inauguración: Pista de motos y zona de pesca deportiva',
        cuerpo:
          'Estamos adecuando nuevos atractivos familiares en nuestro predio: pista de exhibición para motos y lago de pesca de trucha. ¡Muy pronto podrás reservar estas experiencias directamente en la app!',
        imagenPath: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
        fijada: false,
        publicada: true,
      },
    });
  }

  // ----------------------------------------------------------------------------
  // 9. RESERVA DE PRUEBA DE EJEMPLO
  // ----------------------------------------------------------------------------
  console.log('📝 Creando una reserva de prueba con líneas de pedido...');

  const platoSancocho = await prisma.dish.findFirst({ where: { slug: 'sancocho-de-gallina-criolla-a-la-lena' } });
  const platoBandeja = await prisma.dish.findFirst({ where: { slug: 'bandeja-campesina-el-encanto' } });

  const fechaReservaPrueba = new Date('2026-09-13T00:00:00.000Z');
  const reservaExistente = await prisma.reservation.findUnique({
    where: { codigo: 'RES-20260913-001' },
  });

  if (!reservaExistente && platoSancocho && platoBandeja) {
    const reserva = await prisma.reservation.create({
      data: {
        usuarioId: comensal.id,
        codigo: 'RES-20260913-001',
        fecha: fechaReservaPrueba,
        horaInicio: '12:30',
        horaFin: '14:30',
        numComensales: 5,
        estado: ReservationStatus.CONFIRMADA,
        total: 121000,
        nota: 'Mesa cerca del jardín, por favor. Vamos con adultos mayores.',
        aprobadaPorId: admin.id,
        aprobadaEn: new Date(),
        lines: {
          create: [
            {
              platoId: platoSancocho.id,
              cantidad: 2,
              precioUnitario: 38000,
              nota: 'Uno con pechuga bien tierna',
            },
            {
              platoId: platoBandeja.id,
              cantidad: 1,
              precioUnitario: 45000,
              nota: 'Huevo frito blandito',
            },
          ],
        },
      },
    });

    // creo notificación para el comensal
    await prisma.notification.create({
      data: {
        usuarioId: comensal.id,
        reservaId: reserva.id,
        tipo: NotificationType.APROBACION,
        titulo: '¡Tu reserva ha sido confirmada!',
        cuerpo: 'Don Gonzalo ha verificado tu reserva para el domingo 13 de septiembre a las 12:30. ¡Te esperamos en El Encanto Campestre!',
      },
    });
  }

  console.log('✨ Siembra completada con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error durante la siembra de la base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    // desconecto el cliente de Prisma al finalizar para liberar conexiones
    await prisma.$disconnect();
  });
