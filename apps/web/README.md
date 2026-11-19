# Web de El Encanto Campestre

Renderizamos `/plato/[slug]` y `/noticia/[id]` en el servidor con la API de la sede. Para Open Graph usamos la foto `pathOg` de 1200 × 630 y su identificador como versión. Si el plato carece de esa variante, omitimos la imagen de la tarjeta.

## Pruebas locales

Configuramos estas variables en `apps/web/.env.local` o en el entorno del proceso. Todos los valores son públicos, pero conservamos las configuraciones por entorno fuera de Git.

| Variable | Valor |
| --- | --- |
| `ENCANTO_API_URL` | URL base de la API terminada en `/api/v1`. |
| `ENCANTO_RESTAURANTE_ID` | UUID de la sede del entorno. |
| `ENCANTO_WEB_URL` | Origen público de la web. Lo usamos como URL canónica de Open Graph. |
| `ENCANTO_ANDROID_DOWNLOAD_URL` | URL HTTPS opcional de la APK firmada para la página `/descargar`. |
| `ENCANTO_ANDROID_SHA256` | Huellas SHA-256 de las firmas autorizadas, separadas por coma. Sin huellas válidas, `/.well-known/assetlinks.json` devuelve 404. |

```bash
npm run build --workspace=@encanto/shared
npm run build --workspace=@encanto/web
npm run start --workspace=@encanto/web
```

En desarrollo usamos `npm run dev --workspace=@encanto/web`. Para compartir fuera del dispositivo todavía necesitamos el dominio HTTPS definitivo, una foto de carta real en Storage y una comprobación en WhatsApp.

Para Android compilamos con el mismo origen HTTPS en `ENCANTO_WEB_URL`. Solo la variante VPS registra App Links. Añadimos únicamente la huella de la APK firmada para ese dominio; reservamos las firmas de depuración para un dominio de pruebas. Verificamos en el teléfono con `adb shell pm get-app-links co.encantocampestre.app` y abrimos un plato y una noticia tanto con la app cerrada como abierta.
