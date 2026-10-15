# PR preparado: primera entrega del backend del calendario

**Base:** `dev` · **Rama:** `fabian/calendario-atencion` · **Responsable:** Fabián Hoyos.

**Título propuesto:** `fabian/implementa-primera-entrega-del-calendario-de-atencion`

## Descripción para el PR

Implementamos el calendario para representar atención discontinua con varias reglas semanales y excepciones por fecha. Por ejemplo, una excepción cerrada para un domingo sustituye todas sus franjas habituales; una apertura excepcional conserva `soloPorReserva`. Exponemos consulta pública de día y próxima apertura y administración con JWT válido y rol ADMIN, incluyendo los providers/imports necesarios.

Validamos fechas reales, horas `HH:mm` e intervalos ordenados en shared. Usamos hoy en `America/Bogota` y limitamos la búsqueda a 366 fechas inclusivas. Antes de cerrar fechas con reservas confirmadas respondemos 409 con cantidad y fechas; exigimos repetir la petición confirmando la cantidad actual. No cancelamos ni modificamos reservas. Cubrimos también los cierres al eliminar excepciones y al reemplazar reglas semanales. Conservamos los IDs semanales enviados y campos existentes que no administramos, como `aforoMaximo`.

Reutilizamos el esquema sin migraciones. Como `Reservation` no tiene `restaurantId`, la advertencia consulta todas las reservas de la instalación y rechazamos escrituras si hay varias sedes. Necesitamos acordar una relación y migración antes de admitir administración multisede. No implementamos carta, aforo, estados de reservas ni pantallas móviles.

## Archivos cambiados

| Archivo                                              | Cambio                                                      |
| ---------------------------------------------------- | ----------------------------------------------------------- |
| `packages/shared/src/schemas/calendar.schema.ts`     | Validaciones, tipos, zona comercial y límite de búsqueda    |
| `packages/shared/src/index.ts`                       | Export mínimo del contrato de calendario                    |
| `apps/api/src/calendar/calendar.module.ts`           | Registro del módulo con AuthModule y PrismaModule           |
| `apps/api/src/calendar/calendar.service.ts`          | Resolución de días, consultas y escrituras con advertencias |
| `apps/api/src/calendar/calendar.controller.ts`       | Consultas públicas                                          |
| `apps/api/src/calendar/calendar-admin.controller.ts` | Administración con JWT y ADMIN                              |
| `apps/api/src/calendar/calendar.validation.ts`       | Validación de body, query y parámetros                      |
| `apps/api/src/calendar/calendar.swagger.ts`          | Contratos y errores OpenAPI                                 |
| `apps/api/src/calendar/calendar.service.spec.ts`     | Pruebas unitarias y validaciones compartidas                |
| `apps/api/src/calendar/calendar.http.spec.ts`        | HTTP con módulo y guards reales, JWT de prueba y Swagger    |
| `apps/api/test/calendar.fixture.ts`                  | Prisma simulado y registros de prueba                       |
| `apps/api/src/auth/auth.module.ts`                   | Export de JwtModule y guards ya configurados                |
| `apps/api/src/app.module.ts`                         | Import mínimo de CalendarModule                             |
| `docs/Calendario_Atencion.md`                        | Contratos, ejemplos, errores, confirmación y límites        |
| `docs/PR_Calendario_Atencion.md`                     | Este resumen para revisión y publicación posterior          |

No modificamos menú, landing, Docker, workflow, secretos, `.env`, esquema ni lockfile.

## Rutas y ejemplos

| Método      | Ruta (prefijo `/api/v1`)                                              |
| ----------- | --------------------------------------------------------------------- |
| GET         | `/calendario/dia?restauranteId=<uuid>&fecha=2026-10-11`               |
| GET         | `/calendario/proximo?restauranteId=<uuid>&desde=2026-10-08`           |
| GET         | `/admin/calendario/reglas?restauranteId=<uuid>`                       |
| PUT         | `/admin/calendario/reglas/0?restauranteId=<uuid>`                     |
| GET         | `/admin/calendario/excepciones?restauranteId=<uuid>&fecha=2026-10-11` |
| PUT, DELETE | `/admin/calendario/excepciones/2026-10-11?restauranteId=<uuid>`       |

Ejemplo de excepción abierta (sesión ADMIN autorizada en Swagger, sin guardar credenciales):

```json
{
  "abierto": true,
  "horaApertura": "12:00",
  "horaCierre": "17:00",
  "soloPorReserva": true,
  "motivo": "Atención de grupo"
}
```

Para cerrar enviamos `{"abierto": false}`. Si recibimos 409 con `message.reservasAfectadas=2`, revisamos el impacto y repetimos la misma petición con `{"abierto": false, "confirmarReservasAfectadas": 2}`. Volvemos a consultar el conteo antes de escribir. Las reservas conservan su estado. Los detalles y ejemplos completos están en [Calendario_Atencion.md](Calendario_Atencion.md).

## Validación ejecutada el 8 de octubre de 2026

Usamos **Node v22.23.3**, descargado en un runtime temporal fuera del repositorio y verificado contra SHA-256 de la distribución oficial. No cambiamos la instalación global ni la configuración de Git.

| Comando / comprobación                                       | Resultado real                                                                                                                                                       |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                     | Pasó; 1160 paquetes instalados. npm reportó 61 vulnerabilidades del monorepo: 9 moderadas, 51 altas y 1 crítica. No aplicamos actualizaciones ajenas a esta entrega. |
| `npm run build --workspace=@encanto/shared`                  | Pasó                                                                                                                                                                 |
| `npx prisma generate --schema=apps/api/prisma/schema.prisma` | Pasó; cliente Prisma 5.22.0, sin conexión ni escritura de datos                                                                                                      |
| `npm run lint --workspace=api`                               | Pasó sin advertencias                                                                                                                                                |
| `npm run test --workspace=api`                               | **7 archivos, 84 pruebas pasaron**                                                                                                                                   |
| `npm run build --workspace=api`                              | Pasó                                                                                                                                                                 |
| `npm run test --workspace=@encanto/mobile`                   | **4 suites, 9 pruebas pasaron**; Jest terminó con el aviso de `--forceExit` del script existente                                                                     |
| Comprobación HTTP del JavaScript compilado                   | Pasó: 401 anónimo, 403 COMENSAL, 409 sin escritura, 200 al confirmar cierre y 200 en consulta pública; Prisma simulado y metadatos reales de TypeScript              |
| `git diff --check`                                           | Pasó                                                                                                                                                                 |

Cubrimos excepciones que abren/cierran, precedencia semanal, múltiples franjas, `soloPorReserva`, ausencia de aperturas, límite de búsqueda, fecha comercial de Bogotá, fechas/horas inválidas, advertencia con conteo actualizado, cierres semanales y por eliminación, sede inexistente/multisede y conflictos serializables simulados. Comprobamos cada escritura con 401 sin token o con token inválido/expirado, 403 COMENSAL/STAFF y acceso ADMIN. Verificamos la documentación Swagger.

Todas las pruebas del calendario usan Prisma simulado. No presentamos estos resultados como evidencia de PostgreSQL real ni concurrencia real. No ejecutamos seed, reset ni migraciones contra Supabase. El primer build señaló dos imports incorrectos que corregimos; los resultados de la tabla corresponden a la versión final.

## Preparación de Git y pendientes

Partimos de un árbol limpio. Actualizamos `origin`, hicimos pull con avance rápido de `main` y de `dev`, y creamos la rama desde `origin/dev` en `0e27cb4`. No existía una rama previa del calendario que conservar. La identidad configurada era `Fabian Hoyos` sin tilde, con el correo correcto; lo avisamos y la dejamos intacta. Para cada commit usamos variables de entorno del proceso con autor y committer exactos **Fabián Hoyos <fahoyos@unimayor.edu.co>**, sin trailers adicionales.

Dejamos cuatro commits separados: contratos compartidos, implementación del módulo, pruebas y documentación. La rama queda **local, sin publicar**. Para publicar necesitamos la confirmación de Fabián; después abrimos el PR con base `dev`, sin push directo ni merge a `dev`/`main`.

Quedan pendientes la revisión del equipo, pantallas móviles y recorrido con el dueño, decisión de datos para multisede, TOTP/bitácora del alcance posterior y comprobación de CI/CD después de integrar. Reducir horarios de un día que sigue abierto no valida las horas de reservas existentes; las futuras creaciones/aprobaciones deben validar el calendario en Sprint 3. Esta entrega demuestra únicamente el backend del calendario; no cerramos todas las historias administrativas ni el Sprint 2 completo.
