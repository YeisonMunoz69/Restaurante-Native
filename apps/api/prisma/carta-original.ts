// Transcribimos las páginas 2–4 de Carta final.pdf, sin copiar fotos ni inventar alérgenos.
export const cartaOriginal = [
  { categoria: 'Carnes', platos: [
    ['Costilla Ahumada', 30000, 'Porción de arroz, ensalada y papa criolla.'],
    ['Carne Ahumada', 30000, 'Porción de arroz, ensalada y papa criolla.'],
    ['Churrasco', 35000, 'Porción de arroz, ensalada, papa criolla y maduro.'],
    ['Filete de Pollo a la Plancha', 30000, 'Porción de arroz, ensalada y papas a la francesa.'],
    ['Chicharrón Crocante', 30000, 'Patacón o papas a la francesa, arepa, guacamole y salsa BBQ.'],
    ['Picada Personal', 30000, 'Costilla, chorizo, rellena, bofe, arepa, maduritos y papa criolla.'],
    ['Picada para Compartir', 60000, 'Costilla, chorizo, rellena, bofe, arepa, maduritos y papa criolla.'],
  ] },
  { categoria: 'Milanesas', platos: [['Milanesa de Pollo', 30000, 'Porción de arroz, ensalada y papas a la francesa.']] },
  { categoria: 'Pescados', platos: [
    ['Tilapia Ahumada', 30000, 'Porción de arroz, ensalada y patacón.'],
    ['Tilapia Criolla', 35000, 'Porción de arroz, ensalada y papa criolla.'],
  ] },
  { categoria: 'Junior', platos: [
    ['Milanesa de Pollo Junior', 20000, 'Porción de arroz, ensalada y papas a la francesa.'],
    ['Menú Infantil', 20000, 'Crispetas de pollo, papas a la francesa y caja de jugo.'],
  ] },
  { categoria: 'Platos Típicos', platos: [
    ['Sancocho de Gallina', 25000, 'Porción de arroz, ensalada y un cuarto de gallina.'],
    ['Ajiaco', 28000, 'Porción de arroz, ensalada y aguacate.'],
    ['Bandeja Paisa', 40000, 'Bandeja paisa de la carta del restaurante. Consulta los acompañamientos al personal.'],
    ['Arroz Mixto', 20000, 'Arroz mixto de la carta del restaurante. Consulta sus ingredientes al personal.'],
  ] },
  { categoria: 'Porciones', platos: [
    ['Sopa Pequeña', 6000, 'Porción pequeña de sopa.'], ['Sopa Grande', 8000, 'Porción grande de sopa.'],
    ['Porción de Arroz', 3000, 'Porción adicional de arroz.'],
    ['Porción de Papa a la Francesa', 6000, 'Porción adicional de papa a la francesa.'],
    ['Porción de Papa Criolla', 6000, 'Porción adicional de papa criolla.'],
    ['Porción de Patacón con Hogao', 6000, 'Porción de patacón acompañado de hogao.'],
  ] },
  { categoria: 'Piqueteadero', platos: [
    ['Empanada', 1000, 'Una empanada por unidad.'],
    ['Porción de Empanadas', 6000, 'Seis empanadas por porción.'],
    ['Porción de Bofe', 6000, 'Porción de bofe.'], ['Porción de Chorizo', 6000, 'Porción de chorizo.'],
    ['Porción de Rellena', 6000, 'Porción de rellena.'],
  ] },
  { categoria: 'Bebidas Frías', platos: [
    ['Jarra de Limonada de la Casa', 5000, 'Jarra de limonada de la casa.'],
    ['Jugo Natural en Agua', 5000, 'Jugo natural preparado en agua. Consulta los sabores disponibles.'],
    ['Jugo Natural en Leche', 6000, 'Jugo natural preparado en leche. Consulta los sabores disponibles.'],
    ['Gaseosa Personal', 3500, 'Gaseosa en presentación personal.'],
    ['Gaseosa Postobón 1.5 L', 6000, 'Gaseosa Postobón de 1.5 litros.'],
    ['Gaseosa Postobón 3 L', 10000, 'Gaseosa Postobón de 3 litros.'],
    ['Coca-Cola Personal', 4000, 'Coca-Cola en presentación personal.'],
    ['Coca-Cola 3 L', 13000, 'Coca-Cola de 3 litros.'], ['Cerveza', 6000, 'Cerveza. Consulta las marcas disponibles.'],
    ['Agua', 2500, 'Agua. Consulta la presentación disponible.'], ['Pony', 3000, 'Bebida Pony.'], ['Jugo Hit', 3000, 'Jugo Hit. Consulta los sabores disponibles.'],
  ] },
  { categoria: 'Bebidas Calientes', platos: [
    ['Café Negro', 1000, 'Café negro.'], ['Café en Leche', 1500, 'Café preparado en leche.'],
    ['Chocolate', 2500, 'Bebida caliente de chocolate.'], ['Agua de Panela', 1500, 'Agua de panela.'],
    ['Aromática', 1500, 'Manzanilla, frutos rojos o hierbabuena, según disponibilidad.'],
  ] },
] as const;

export const platosHabituales = new Set(['Milanesa de Pollo', 'Tilapia Ahumada', 'Milanesa de Pollo Junior', 'Sancocho de Gallina', 'Ajiaco', 'Costilla Ahumada', 'Carne Ahumada', 'Churrasco']);

// Uso una clave estable por sede; cambiar el precio en el panel no modifica esta identidad.
export function cartaSlug(restaurantId: string, nombre: string) {
  return `${restaurantId}-${nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}
