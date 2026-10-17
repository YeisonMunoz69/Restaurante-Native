# Carta real en S21 y comprobación del runtime Docker

El 16 de octubre probamos el S21 SM-G991B con la aplicación `co.encantocampestre.app`, Metro del worktree de integración en el puerto 8091 y la API `https://encanto-campestre-dev.apolobyte.online/api/v1`. Configuramos la sede real desde Ajustes, sin publicar credenciales ni modificar la base compartida. La sede se obtuvo mediante una consulta de lectura de `Restaurant.id` y `nombre`.

## Recorrido realizado

- Guardamos API dev y el identificador real; la carta dejó de pedir configuración.
- El próximo día abierto fue el sábado 17 de octubre. Comprobamos 6 categorías, 5 etiquetas y 16 platos mediante las rutas públicas HTTPS.
- Abrimos el sancocho de gallina: precio de 38.000 COP, descripción, disponibilidad, foto, alérgenos y etiquetas. Las fotos existentes son URLs de los datos de ejemplo; esta lectura no demuestra una carga nueva en Storage.
- Consultamos domingo 18 y lunes 19. El lunes mostró el aviso de restaurante cerrado y permitió consultar la carta, sin ofrecer atención programada.
- Los títulos de Carta y Ajustes comenzaron en Y=128 px en la pantalla de 1080×2400, debajo de la barra del sistema. El detalle permite desplazarse hasta los alérgenos y etiquetas.

Capturas: [carta](01-carta-dev.png), [detalle](02-detalle-dev.png), [pie del detalle](03-detalle-pie.png) y [día cerrado](04-dia-cerrado-dev.png).

Este recorrido resuelve la falta de sede real y lectura HTTPS que habíamos registrado para EC-22/23/24. No equivale a la aceptación de todos los criterios del sprint ni a un merge. Probamos el código del worktree de integración, que contiene cambios posteriores a la cabeza de PR #10.

## Docker: salud y funcionamiento son comprobaciones diferentes

Construimos primero la API de `yeison/ajusta-encabezados-y-auth-plan`. El runtime llegó a `healthy`, pero la consulta real de platos respondió 500: faltaba `platos.activo` en la base compartida. Esa rama incorpora la migración `20261016120000_agrega_borrado_logico_plato`; todavía no está integrada ni aplicada en ese entorno. También contiene otras migraciones de reservas. No las aplicamos por separado sobre la base compartida: deben acompañar la integración correspondiente y su revisión. El script `scripts/deploy-vps.sh` ya ejecuta `prisma migrate deploy` antes de cambiar la API.

Para dejar un servicio local funcional reconstruimos la API del checkout `yeison/conecta-carta-real-ec22-24`, commit `9d7b343`, compatible con el esquema actual. Comprobamos:

- Un solo contenedor de API: `encanto_api_dev`, imagen `encanto-api:dev`, puerto `127.0.0.1:3000 → 3000`.
- Estado `healthy`, usuario `node`, comando `node dist/main.js`, cero montajes y cero reinicios después de recrearlo.
- Health HTTP dentro del contenedor: 200 y base `connected`.
- Consulta HTTP desde Windows a la carta local: 200 y 16 platos.

El `.env` local contiene CORS `*`, permitido para desarrollo pero rechazado en staging. Para esta prueba usamos una sobreescritura Compose en memoria con `CORS_ORIGIN: ''`. No editamos el `.env`. La API nativa no necesita CORS de navegador.

Usamos el proyecto Compose `encanto-local` y el archivo `apps/api/docker-compose.vps.yml`, indicando `API_RUNTIME_ENV_FILE` con la ruta absoluta del `.env` privado del checkout principal. Eliminamos las imágenes temporales `encanto-sprint23-api:test` y `encanto-sprint23-api-migrate:test`, después de comprobar que ningún contenedor las utilizaba. Se pueden reconstruir desde el repositorio. No creamos volúmenes para este runtime.

## Pendientes concretos

**Corrección posterior de readiness:** cambiamos el healthcheck a una consulta sin filas sobre `platos.activo`. Ahora una base sin la migración de menú responde 503, aunque acepte `SELECT 1`. Las pruebas PostgreSQL aisladas comprueban esquema migrado vacío, columna ausente y recuperación; la respuesta HTTP conserva un mensaje genérico sin detalles de Prisma. Esto detecta el desfase observado del menú, no sustituye las pruebas funcionales de cada módulo.

1. Revisar e integrar PR #10: al consultar GitHub seguía abierta, en borrador, con Build and test correcto y despliegue omitido por tratarse de un PR.
2. Integrar la administración y reservas de la otra rama con sus migraciones; después comprobar rutas funcionales además del health. La rama completa incluye Sprint 3 y no forma parte de PR #10.
3. Configurar `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_STORAGE_BUCKET` en los entornos privados necesarios. Las tres faltaban en el entorno local consultado. Validar carga real, variantes, orden y eliminación antes de cerrar EC-27. No publicar la clave de servicio ni incluirla en el móvil.
4. Asignar a Yeison las actividades que está asumiendo y actualizar Jira con estas evidencias. La sesión del navegador era visible, pero las herramientas de control fallaron con `failed to write kernel assets` / `os error 3`; las conexiones de GitHub y Atlassian tampoco aparecían habilitadas. No se hizo merge, transición ni cierre de sprint durante esta verificación.

El alcance no cambió en este recorrido. Los recordatorios previos de actualización manual de requisitos en Drive y Word siguen pendientes hasta confirmación del responsable.
