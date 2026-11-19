import type { Metadata } from 'next';
import { newsCover, publicPage, readNews } from '../../../lib/content';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const news = await readNews(id);
  const image = newsCover(id, news.imagen);
  return {
    title: news.titulo,
    description: news.cuerpo.slice(0, 180),
    openGraph: {
      title: news.titulo,
      description: news.cuerpo.slice(0, 180),
      url: publicPage('/noticia/' + id),
      siteName: 'El Encanto Campestre',
      images: image ? [{ url: image, alt: news.titulo }] : undefined,
    },
  };
}

export default async function NewsPage({ params }: Props) {
  const { id } = await params;
  const news = await readNews(id);
  const image = newsCover(id, news.imagen);
  return (
    <article>
      <h1>{news.titulo}</h1>
      {image && <img className="cover" src={image} alt={news.titulo} />}
      <p className="body">{news.cuerpo}</p>
      {news.enlaces.length > 0 && <ul>{news.enlaces.map((url, index) => <li key={url + index}><a href={url}>{url}</a></li>)}</ul>}
      <a className="app" href="/descargar">Instalar la aplicación</a>
    </article>
  );
}
