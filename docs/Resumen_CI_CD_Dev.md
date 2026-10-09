# Cómo funciona nuestro despliegue de desarrollo

**Corte: 9 de octubre de 2026.** Usamos `dev` para integrar y desplegar la API del equipo 7 en la VPS de desarrollo. Reservamos `main` para una VPS futura. Este resumen explica el recorrido; los comandos de preparación y diagnóstico están en [la guía de despliegue](Despliegue_VPS_Staging.md).

## Del cambio al despliegue

Trabajamos en ramas personales y abrimos pull requests hacia `dev`. El archivo [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) hace que GitHub Actions instale dependencias con `npm ci`, compile el paquete compartido, genere el cliente Prisma, revise y pruebe la API, pruebe el móvil, compruebe el script y construya la imagen Docker. Un pull request ejecuta esas verificaciones, pero no despliega.

Cuando integramos un cambio en `dev`, el push repite las verificaciones. Si terminan bien, el job `Deploy dev to VPS` se conecta por SSH usando secretos guardados en GitHub. La condición de rama y la dependencia entre jobs hacen que `main` y los pull requests queden fuera de este despliegue. El workflow comprueba que el clon de `/root/projects/equipo-7` no tenga cambios locales, trae `dev` sin forzar la integración y pasa al script el mismo commit que superó CI. Así evitamos desplegar otro commit por una actualización simultánea. El workflow no sustituye una regla de protección de rama contra la integración de PR con filtros fallidos.

## Qué ocurre en la VPS

El script [`scripts/deploy-vps.sh`](../scripts/deploy-vps.sh) usa `apps/api/.env.vps`, que permanece fuera de Git, valida Docker Compose, construye las imágenes de API y migraciones, ejecuta `prisma migrate deploy` y arranca la API. Espera hasta que el contenedor responda al chequeo de salud, que consulta HTTP y PostgreSQL. Las migraciones usan la conexión de sesión de Supabase verificada para esta VPS; el archivo privado contiene las credenciales y no se imprime en las salidas.

Según la comprobación SSH del despliegue inicial, Docker publica el puerto 3000 del contenedor únicamente en `127.0.0.1:8084` de la VPS. Nginx atiende HTTPS y envía las peticiones a ese puerto: el visitante conserva la URL pública y no necesita acceder a 8084. La app React Native se ejecuta en el teléfono; no se sirve desde ese contenedor.

## Qué comprobamos y qué significa

La [ejecución de CI/CD del 8 de octubre](https://github.com/YeisonMunoz69/Restaurante-Native/actions/runs/37848652598) terminó correctamente para el commit `0e27cb4`: pasaron las verificaciones y el despliegue. El 9 de octubre consultamos el [nuevo dominio de desarrollo](https://encanto-campestre-dev.apolobyte.online/) y su [endpoint de salud](https://encanto-campestre-dev.apolobyte.online/api/v1/health): ambos respondieron HTTP 200; salud indicó `status: ok` y `database: connected`. La URL nueva respondió directamente, sin redirección HTTP. No inspeccionamos desde esta máquina la configuración actual de su sitio Nginx, así que atribuimos el recorrido interno a la configuración y a la comprobación SSH anterior, no a esa respuesta pública por sí sola.

En clase lo explicamos así: _GitHub prueba cada cambio propuesto; al llegar a `dev`, vuelve a probarlo y solo entonces actualiza la VPS. Allí Docker aplica las migraciones, arranca la API y confirma que PostgreSQL responde. Nginx publica esa API por HTTPS en nuestro dominio._ La salud comprueba conexión, pero no demuestra que carta, reservas o la aplicación Android estén terminadas.
