import { menuGallery, publicMenuPhotoUrl } from './menu-photo';

describe('publicMenuPhotoUrl', () => {
  it('accepts a complete HTTPS photo URL', () => {
    expect(publicMenuPhotoUrl('https://images.example.test/plato.jpg')).toBe(
      'https://images.example.test/plato.jpg',
    );
  });

  it('does not guess the storage bucket for an incomplete or insecure path', () => {
    expect(publicMenuPhotoUrl('dishes/plato.jpg')).toBeNull();
    expect(
      publicMenuPhotoUrl('http://images.example.test/plato.jpg'),
    ).toBeNull();
    expect(publicMenuPhotoUrl(undefined)).toBeNull();
  });
});

const sede = '15c90d10-0432-4a9f-8009-b180cfb1abb4';

describe('menuGallery', () => {
  it.each([
    'ajiaco', 'chicharron-crocante', 'churrasco', 'costilla-ahumada',
    'picada-para-compartir', 'porcion-de-empanadas', 'sancocho-de-gallina', 'tilapia-ahumada',
  ])('resuelve la foto local del plato importado %s', slug => {
    expect(menuGallery({ slug: sede + '-' + slug, fotos: [] })).toEqual([
      { id: slug + '/1', source: expect.anything() },
    ]);
  });

  it('reconoce el sancocho anterior y no inventa una foto para platos pendientes', () => {
    expect(menuGallery({ slug: 'sancocho-de-gallina-criolla-a-la-lena', fotos: [] })).toHaveLength(1);
    expect(menuGallery({ slug: sede + '-cafe-negro', fotos: [] })).toEqual([]);
  });

  it('conserva el orden de la galería publicada al agregar variantes', () => {
    const fotos = ['principal', 'variacion'].map((id, orden) => ({
      id, orden, principal: orden === 0,
      path: 'https://images.example.test/' + id + '.webp',
      pathOg: null,
    }));
    expect(menuGallery({ slug: sede + '-ajiaco', fotos })).toEqual([
      { id: 'principal', source: { uri: 'https://images.example.test/principal.webp' } },
      { id: 'variacion', source: { uri: 'https://images.example.test/variacion.webp' } },
    ]);
  });
});
