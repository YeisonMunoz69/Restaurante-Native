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

```bash
npm run build --workspace=@encanto/shared
npm run build --workspace=@encanto/web
npm run start --workspace=@encanto/web
```

En desarrollo usamos `npm run dev --workspace=@encanto/web`. Para compartir fuera del dispositivo todavía necesitamos el dominio HTTPS definitivo, una foto de carta real en Storage y una comprobación en WhatsApp. La verificación Android requiere publicar `assetlinks.json` con las huellas de ese dominio y de las firmas correspondientes.
