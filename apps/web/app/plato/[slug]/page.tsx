import type { Metadata } from 'next';
import { formatCurrencyCOP } from '@encanto/shared';
import { publicPage, readDish, webUrl } from '../../../lib/content';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ fecha?: string | string[] }> };

async function getDish({ params, searchParams }: Props) {
  const [{ slug }, { fecha }] = await Promise.all([params, searchParams]);
  return readDish(slug, typeof fecha === 'string' ? fecha : undefined);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { plato } = await getDish(props);
  const summary = plato.descripcionBreve || plato.descripcion;
  const photo = plato.fotos[0];
  const preview = webUrl(photo?.pathOg);
  if (preview && photo) preview.searchParams.set('v', photo.id);
  return {
    title: plato.nombre,
    description: summary,
    openGraph: {
      title: plato.nombre,
      description: summary,
      url: publicPage('/plato/' + plato.slug),
      siteName: 'El Encanto Campestre',
      images: preview ? [{ url: preview.href, width: 1200, height: 630, alt: plato.nombre }] : undefined,
    },
  };
}

export default async function DishPage(props: Props) {
  const { plato, fecha } = await getDish(props);
  const photo = webUrl(plato.fotos[0]?.path);
  return (
    <article>
      <h1>{plato.nombre}</h1>
      {photo && <img className="cover" src={photo.href} alt={plato.nombre} />}
      <p className="body">{plato.descripcion || plato.descripcionBreve}</p>
      <p><strong>{formatCurrencyCOP(plato.precio)}</strong></p>
      <p>{plato.disponible ? 'Disponible' : 'Sin disponibilidad'} para <time dateTime={fecha}>{fecha}</time>.</p>
      <a className="app" href="/descargar">Instalar la aplicación</a>
    </article>
  );
}
