# Continuidad local de Sprint 4 · 19 de noviembre

Seguimos en la rama `yeison/redisena-pedido-y-calendario`. Registramos cambios pequeños con la autoría acordada y tags anotados que apuntan a revisiones comprobadas. La ejecución [44548018242](https://github.com/YeisonMunoz69/Restaurante-Native/actions/runs/44548018242/job/135643780085) se detuvo antes de iniciar el runner por el bloqueo de facturación de la cuenta. Conservamos este avance en el repositorio local mientras soporte revisa la cuenta.

| Tag | Qué verificamos en ese punto |
| --- | --- |
| `local/s21-reservas-carta-2026-11-19` | Punto de partida `c559ad5`. Reservas y carta en el S21, 280 pruebas API y 92 móviles. |
| `local/sprint4-noticias-api-2026-11-19` | Muro, administración y portada WebP de noticias con PostgreSQL. |
| `local/sprint4-web-ssr-2026-11-19` | Build de Next.js y renderizado de plato y noticia con los datos locales de la API. |
| `local/sprint4-noticias-web-enlaces-2026-11-19` | Corte conjunto con el editor móvil, caché de lectura, enlaces compartidos y preparación de App Links. |

Para comparar revisiones usamos `git diff <tag-anterior>..<tag-nuevo>`; para listar los puntos guardados usamos `git tag --list 'local/*'`.

## Evidencia y estado en Jira

| Actividades | Resultado local y criterio pendiente |
| --- | --- |
| [EC-41](https://yjmunoz.atlassian.net/browse/EC-41) y [EC-42](https://yjmunoz.atlassian.net/browse/EC-42) | Mostramos el muro y su detalle en el S21, también con la API desconectada. Guardamos la última copia de los datos públicos por servidor y sede. Las fotos y los enlaces pueden requerir conexión. Probamos permisos, portada privada del borrador, publicación, retiro y la confirmación previa del editor. Queda recorrer el editor completo en el teléfono y aceptar la revisión en dev. |
| [EC-43](https://yjmunoz.atlassian.net/browse/EC-43) y [EC-44](https://yjmunoz.atlassian.net/browse/EC-44) | Next.js compila y genera páginas dinámicas de plato y noticia. Renderizamos las dos rutas directamente contra la API aislada y comprobamos los metadatos y el versionado por ID de la foto. Falta probar la web por HTTP y la vista previa real de WhatsApp con imágenes accesibles. |
| [EC-46](https://yjmunoz.atlassian.net/browse/EC-46), [EC-47](https://yjmunoz.atlassian.net/browse/EC-47) y [EC-48](https://yjmunoz.atlassian.net/browse/EC-48) | Preparamos la hoja de compartir para platos disponibles, rutas hacia los detalles exactos y el manifiesto VPS con `autoVerify`. Probamos el enrutamiento y la generación de `assetlinks.json`. Falta el dominio HTTPS, la huella de la APK firmada y el recorrido físico de apertura fría y caliente. Configuración en [apps/web](../apps/web/README.md). |

Registramos las siete historias **En curso**. EC-45 requiere publicar la web en el dominio definitivo. EC-49 y EC-50 mantienen pendientes la aceptación de las actividades y la pantalla de mapa/contacto. EC-22 y EC-27 conservan la validación con fotografías reales. Los pendientes de reservas y de sprints posteriores mantienen sus criterios de aceptación.

## Comprobación reproducible del corte

- API: 282 pruebas en 28 suites con PostgreSQL aislado. En Docker, aplicamos diez migraciones y confirmamos el feed público, salud, conexión a base, cero montajes y `node dist/main.js`.
- Móvil: 99 pruebas en 32 suites, TypeScript y verificación de textos. Instalamos `localDebug` ARM64 y compilamos el manifiesto VPS con un origen sintético para validar su configuración.
- Web: build de producción correcto. La revisión automática del entorno impidió arrancar el servidor Next en este equipo, así que ejecutamos el render de las rutas y sus funciones de metadatos directamente con la API real de QA.
- Guardamos la portada comprimida de cada noticia en PostgreSQL, con un máximo de 600 KB. Así aplicamos la misma regla de publicación al archivo y al texto, sin requerir credenciales de Storage para este módulo. Las fotos de platos mantienen su almacenamiento separado.
