import { publicMenuPhotoUrl } from './menu-photo';

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
