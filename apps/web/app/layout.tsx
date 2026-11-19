import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './site.css';

export const metadata: Metadata = {
  title: { default: 'El Encanto Campestre', template: '%s · El Encanto Campestre' },
  description: 'Restaurante campestre de la vereda Las Huacas, Timbío.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-CO">
      <body>
        <header><a href="/">El Encanto Campestre</a></header>
        <main>{children}</main>
      </body>
    </html>
  );
}
