# Nuestra página temporal

Preparamos una página «En construcción…» para la raíz del dominio. Animamos un muro de doce ladrillos con SVG y CSS, sin JavaScript, servicios nuevos, fuentes externas ni dependencias adicionales. Conservamos la paleta campestre y desactivamos la animación cuando el navegador pide reducir movimiento.

## Dónde la mantenemos

- Editamos los textos y el dibujo en `apps/api/public/index.html`.
- Ajustamos colores, tamaños y animación en `apps/api/public/landing.css`.
- Usamos un icono local en `apps/api/public/favicon.svg`.
- Registramos la carpeta con `configureLanding` en `apps/api/src/landing/landing.assets.ts`; la ubicamos respecto al módulo para funcionar desde `src` y `dist`.
- Copiamos esa carpeta a la etapa de ejecución de `apps/api/Dockerfile.vps`. El Dockerfile de desarrollo ya copia la API completa.

Publicamos solamente `public`, nunca la raíz del repositorio. Dejamos las rutas desconocidas como errores, sin devolverles la landing. La raíz `/api/v1` sigue respondiendo `Hello World!` y `/api/v1/health` sigue consultando PostgreSQL.

## Cómo la comprobamos y publicamos

Desde la raíz del monorepo usamos las mismas comprobaciones de CI:

```powershell
npm run build --workspace=@encanto/shared
npx prisma generate --schema=apps/api/prisma/schema.prisma
npm run lint --workspace=api
npm run test --workspace=api
npm run build --workspace=api
npm run test --workspace=@encanto/mobile
docker build -f apps/api/Dockerfile.vps --target runtime -t elev-d-e-7-api:landing-verification .
```

Las pruebas HTTP de `landing.assets.spec.ts` usan Prisma simulado: verificamos HTML, CSS, icono, las rutas existentes de API, salud 503 si falla la base, rutas desconocidas y rechazo de archivos privados. Esto no demuestra conectividad real a Supabase.

Para verla con la API local usamos `npm run start:dev --workspace=api`, con nuestro entorno privado ya configurado, y abrimos `http://localhost:3000/`. No detengo otra instancia sin comprobar de quién es.

Publicamos nuestra rama, abrimos PR con base `dev` y esperamos los filtros. Después de integrar esperamos también el job de despliegue. No copiamos archivos a mano en la VPS ni modificamos `main`. No cambiamos Nginx: el sitio del equipo ya apunta al puerto 8084.

Comprobamos la página y la API después del despliegue:

```powershell
Invoke-WebRequest https://equipo-7-elev-d-dev.apolobyte.online/ | Select-Object StatusCode
Invoke-RestMethod https://equipo-7-elev-d-dev.apolobyte.online/api/v1/health
```

Esta página es una portada temporal, no el cliente móvil ni el workspace Next.js previsto para Sprint 4. No cierro las historias de carta, reservas o web por tener esta portada.

## Resultado local del 8 de octubre

Pasaron lint y build de API/shared, 21 pruebas de API (7 nuevas de landing) y 9 pruebas móviles. Construimos la imagen final y comprobamos HTTP de raíz, CSS, icono, salud simulada y ruta desconocida dentro del contenedor, ejecutado como UID 1000 y sin `.env`/`.env.vps` en la carpeta de la API. No iniciamos ese contenedor contra Supabase.

Repetimos la instalación desde cero en un contenedor Linux con Node 22: pasaron `npm ci`, build de shared, generación Prisma, lint de API sin advertencias/errores, las mismas 21 y 9 pruebas, build de API y `bash -n` del script de despliegue. Usamos una copia sin archivos privados y URLs ficticias de CI. El contenedor Debian reducido avisó que no trae OpenSSL; nuestra imagen final Alpine sí lo instala y comprobamos que sirve los archivos con Node 22.23.2.

Revisamos el diseño en navegador a 1280, 390 y 320 píxeles: sin desbordamiento horizontal ni errores de consola. La animación usa doce ladrillos y una paleta; la consulta del estilo confirmó que está activa con la preferencia normal de movimiento. La preferencia de movimiento reducido queda cubierta por la regla CSS que no aplica animaciones en ese caso; no cambiamos la preferencia del sistema del usuario.

La landing todavía necesita publicar su rama e integrar el PR a `dev` para llegar a la VPS. La ejecución verde enlazada en la guía corresponde al despliegue anterior, no a esta funcionalidad nueva.
