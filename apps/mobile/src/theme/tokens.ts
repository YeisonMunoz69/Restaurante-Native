// Definimos las fichas de diseno (design tokens) del restaurante El Encanto Campestre
// Todo esta basado en el documento oficial tokens.json creado en design/01_tokens/

export const LightColors = {
  marca: {
    primario: '#4A5D3A', // Verde militar institucional
    primarioSuave: '#EEF2E8',
    acento: '#A2632E', // Tono calido para llamados a la accion
  },
  superficie: {
    fondo: '#FFFFFF',
    elevada: '#F6F5F1',
    borde: '#E2E2DA',
  },
  texto: {
    primario: '#16180F',
    secundario: '#5F6355',
    inverso: '#FFFFFF',
  },
  estado: {
    exito: '#2F6B45',
    atencion: '#A87516',
    error: '#A82A22',
    inactivo: '#B4B4AA',
  },
  admin: {
    encabezado: '#2E3A2A',
  },
};

export const DarkColors = {
  marca: {
    primario: '#9CB584', // Verde militar adaptado para contraste en fondo oscuro
    primarioSuave: '#232C1C',
    acento: '#D69A5E',
  },
  superficie: {
    fondo: '#12140F',
    elevada: '#1C1F19',
    borde: '#2C302A',
  },
  texto: {
    primario: '#F0F1EA',
    secundario: '#A5A99B',
    inverso: '#12140F',
  },
  estado: {
    exito: '#6FB98C',
    atencion: '#DFA945',
    error: '#EF8880',
    inactivo: '#55584F',
  },
  admin: {
    encabezado: '#1A2118',
  },
};

// Mantengo los colores de la identidad de Google para los botones del proveedor.
export const GoogleButtonColors = {
  background: '#FFFFFF',
  border: '#747775',
  text: '#1F1F1F',
};

export const Spacing = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  margenLateral: 16,
  separacionTarjetas: 12,
};

export const Radii = {
  s: 8,
  m: 12,
  l: 20,
  completo: 999,
};

export const Typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  tituloL: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  tituloM: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  cuerpoL: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  cuerpoM: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  etiqueta: { fontSize: 13, lineHeight: 16, fontWeight: '600' as const },
  pie: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  precio: { fontSize: 18, lineHeight: 22, fontWeight: '700' as const },
  codigo: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const },
};
