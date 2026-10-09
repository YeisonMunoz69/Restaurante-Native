# El Encanto Campestre

Construimos este proyecto académico de Electiva V para el restaurante El Encanto Campestre, en Timbío, Cauca. Compartimos una app Android en React Native bare, API NestJS, PostgreSQL/Supabase y contratos en un monorepo npm. La capa web de Sprint 4 todavía está pendiente.

Trabajamos Yeison Muñoz, Alex Santacruz y Fabián Hoyos. Respetamos [Reglas.md](Reglas.md) para identidad, commits y trabajo en equipo.

## Estado real al 9 de octubre de 2026

Revisamos `dev` en `0e27cb4`. No confundimos una maqueta, una rama publicada o una landing con una funcionalidad terminada.

| Parte               | Estado                                                                                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API y autenticación | Docker, Prisma/migraciones, registro/login, JWT rotatorio, guards y salud con consulta a PostgreSQL implementados                                                     |
| VPS de desarrollo   | API en loopback 8084, Nginx/HTTPS y CI/CD de `dev` comprobados en la última aceptación registrada                                                                     |
| Landing             | «En construcción…» integrada y desplegada en la raíz del dominio; no es la app móvil                                                                                  |
| Android             | Cinco pestañas, temas, i18n y autenticación con Keychain; todavía hay literales/datos de muestra que debemos retirar                                                  |
| Carta/reservas      | Carta de ejemplo, sin menú conectado; «Nueva reserva» todavía no tiene acción. No damos por terminados los sprints 2 y 3                                              |
| Calendario          | Fabián publicó el backend en [PR #2 hacia dev](https://github.com/YeisonMunoz69/Restaurante-Native/pull/2); sigue sin integrar en este corte y no incluye panel móvil |
| Web/SSR y noticias  | `apps/web` sigue reservado para Sprint 4; el muro móvil actual no consume noticias reales                                                                             |

La última aceptación de despliegue registrada pasó [CI/CD dev, ejecución 37848652598](https://github.com/YeisonMunoz69/Restaurante-Native/actions/runs/37848652598). La página está en [nuestro dominio dev](https://equipo-7-elev-d-dev.apolobyte.online/) y la API expone [salud HTTPS](https://equipo-7-elev-d-dev.apolobyte.online/api/v1/health). Ese resultado no prueba módulos todavía pendientes ni sustituye revisar cada despliegue nuevo.

## Dónde consultamos cada cosa

- [Plan y estado de sprints](docs/Plan_de_Sprints.md): conservamos fechas originales y mostramos el atraso.
- [Tareas de Alex](docs/Tareas_Alex.md): reparto actualizado, entregas pequeñas, dependencias y pruebas de interfaz.
- [Flujo del equipo](docs/Flujo_Equipo_Dev.md): ramas personales, PR a `dev`, revisión y entrega sin acceso SSH.
- [Despliegue y diagnóstico](docs/Despliegue_VPS_Staging.md): preparación de servidor nuevo, trabajo diario y mantenimiento de la landing.
- [Requisitos](docs/Requisitos_del_Sistema.md), [análisis y ADR](docs/Sprint0_Analisis_y_Diseno.md) y [decisiones](docs/Decisiones_Pendientes_y_Riesgos.md): comportamiento acordado y diferencias por resolver.
- [Backlog](docs/Backlog_Jira.md): criterios de aceptación; el CSV conserva el importable original, no un avance sincronizado.
- [Diseño](design/README.md): tokens, componentes y pantallas de referencia.

Concentramos aquí el arranque local, en lugar de mantener instrucciones de inicialización que ya no corresponden a proyectos existentes.

## Estructura

```text
apps/
  api/       API NestJS, Prisma, autenticación, landing y perfiles Docker
  mobile/    React Native bare 0.87.1, navegación y proyecto nativo Android
  web/       Espacio reservado para web/SSR de Sprint 4
packages/
  shared/    Esquemas Zod, tipos y utilidades compartidas
docs/        Requisitos, decisiones, plan, backlog y guías vigentes
design/      Tokens y maquetas de referencia
scripts/     Despliegue automatizado de la VPS
.github/     Filtros y despliegue de dev
```

## Preparar nuestra máquina

Usamos Node 22 actualizado, compatible con las dependencias bloqueadas (base documentada: 22.22.3 o superior en esa línea), npm y Git. Para Android necesitamos JDK 17, SDK/herramientas indicados por `apps/mobile/android/build.gradle` y `adb`; no seguimos la antigua indicación de instalar solamente SDK 34/35. Para Docker necesitamos Docker Desktop con contenedores Linux.

Desde PowerShell en la raíz:

```powershell
npm ci
npm run build --workspace=@encanto/shared
npx prisma generate --schema=apps/api/prisma/schema.prisma
```

Creamos `apps/api/.env` a partir de `.env.example` **solo si no existe**; no sobrescribimos un archivo privado que ya funciona:

```powershell
if (-not (Test-Path apps/api/.env)) {
    Copy-Item .env.example apps/api/.env
}
```

Completamos manualmente las variables de conexión y autenticación. La API necesita `DATABASE_URL`, `DIRECT_URL`, secretos JWT independientes y sus expiraciones; configuramos también `PORT` y `CORS_ORIGIN` conforme al entorno. Si no hay cliente web dejamos `CORS_ORIGIN` vacío: el arranque rechaza `*`, aunque aparezca en una plantilla antigua. El prefijo vigente `/api/v1` está fijado en `apps/api/src/main.ts`; no suponemos que cambiar `API_PREFIX` lo modifique. Las plantillas son ejemplos, no credenciales válidas ni la configuración privada del servidor. Consultamos KeePass; no pegamos claves en Git ni en capturas.

Para la VPS usamos `apps/api/.env.vps.example` y la guía de despliegue, no copiamos sin revisar el entorno local. Allí verificamos pooler de sesión 5432 con SSL; migraciones no usan el pooler transaccional 6543. No ejecutamos reset ni seed sobre Supabase compartido para probar un módulo.

## Arrancar la API local

Elegimos una sola instancia para no ocupar dos veces el puerto 3000.

Con Docker:

```powershell
docker compose -f apps/api/docker-compose.yml up -d
docker logs -f encanto_api_dev
```

O directamente con Node:

```powershell
npm run start:dev --workspace=api
```

Consultamos:

- API: `http://localhost:3000/api/v1`.
- Salud API/DB: `http://localhost:3000/api/v1/health`.
- Swagger en desarrollo: `http://localhost:3000/api/docs`.
- Landing local: `http://localhost:3000/`.

Para detener únicamente nuestro Compose local:

```powershell
docker compose -f apps/api/docker-compose.yml down
```

No detenemos procesos sin identificar primero de quién son.

## Arrancar Android y elegir la API

Iniciamos el emulador o conectamos el teléfono con depuración USB. En una terminal arrancamos Metro:

```powershell
npm run start --workspace=@encanto/mobile
```

En otra terminal:

```powershell
adb devices
npm run android --workspace=@encanto/mobile
```

La configuración actual en `apps/mobile/src/config/api.config.ts` usa `http://10.0.2.2:3000/api/v1` para Android: funciona como dirección de la PC desde el **emulador oficial**, no desde cualquier teléfono.

Para teléfono por USB necesitamos apuntar el cliente a `http://localhost:3000/api/v1` y habilitar los túneles siguientes. Estos comandos solos **no cambian** la URL del cliente:

```powershell
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000
```

Para consultar la VPS necesitamos elegir `https://equipo-7-elev-d-dev.apolobyte.online/api/v1` en el cliente. El mecanismo documentado de selección local/dev y su prueba Android son la tarea A00 de Alex; no afirmamos que ya existe. El `API_URL` privado del servidor no modifica el bundle móvil. No incluimos secretos de Supabase/JWT en la app.

## Pruebas antes de entregar

Después de instalar dependencias y preparar shared/Prisma, ejecutamos:

```powershell
npm run lint --workspace=api
npm run test --workspace=api
npm run build --workspace=api
npm run test --workspace=@encanto/mobile
```

Si tocamos móvil, comprobamos también su lint y la interfaz Android. Distinguimos pruebas con mocks, integración en PostgreSQL aislado y pruebas en un dispositivo: ninguna demuestra por sí sola todas las demás.

## Cómo llega un cambio a la VPS

Partimos de `dev` actualizada, trabajamos en una rama personal y abrimos PR con base `dev`. El PR ejecuta filtros pero no despliega. Después de revisar e integrar, el push a `dev` ejecuta verificación y, si pasa, despliegue SSH con migraciones y espera de salud. Revisamos ambos jobs en Actions.

No necesitamos SSH para que Alex o Fabián entreguen módulos. No editamos el clon del servidor ni cambiamos workflow, Docker, Nginx o secretos por cada pantalla. `main` queda reservada para otra VPS de producción y no activa este despliegue. La protección contra integrar un PR fallido se configura aparte en GitHub; tener un workflow no garantiza esa protección.

Conservamos pendientes de seguridad y decisiones abiertas en sus guías; que la API responda no prueba que se hayan rotado credenciales expuestas ni que toda la aplicación esté completa.
