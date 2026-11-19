import { webUrl } from '../../lib/content';

export default function Download() {
  const apk = webUrl(process.env.ENCANTO_ANDROID_DOWNLOAD_URL);
  return (
    <>
      <h1>Aplicación Android</h1>
      {apk?.protocol === 'https:'
        ? <a className="app" href={apk.href}>Descargar APK</a>
        : <p>La descarga estará disponible cuando publiquemos la versión oficial.</p>}
    </>
  );
}
