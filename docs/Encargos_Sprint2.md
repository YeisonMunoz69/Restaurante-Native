# Nuestra siguiente entrega de Sprint 2

Trabajamos desde nuestros computadores, sin acceso SSH. La API de `dev` ya pasó un despliegue completo; al integrar cada PR volvemos a comprobar Actions y salud HTTPS. No editamos archivos en la VPS. Reservamos `main` para otro servidor.

## Cómo dividimos el trabajo

| Responsable | Primera entrega | Carpeta principal |
| --- | --- | --- |
| Alex | Consulta pública de categorías, platos, detalle, etiquetas y disponibilidad por fecha | `apps/api/src/menu` |
| Fabián | Calendario: reglas semanales, excepciones, consulta por fecha y próximo día abierto | `apps/api/src/calendar` |
| Yeison | Landing temporal; después, revisar la carta móvil existente y conectarla con los contratos reales | `apps/api/public` y móvil |

No entregamos todo el sprint en un solo PR. Después del calendario, Fabián continúa con administración de categorías/platos y escritura de `DishSchedule`; después del menú público, Alex continúa con procesamiento/carga de fotos. Dejamos las reservas de Sprint 3 para cuando carta y calendario estén integrados.

## Contratos y límites que compartimos

Antes de crear archivos revisamos `Reglas.md`, el plan, backlog, ADR-010, esquema Prisma, guards y `packages/shared`. Si la funcionalidad ya existe en `origin/dev`, la completamos sin duplicarla. Las carpetas y rutas siguientes son acuerdos propuestos para la primera entrega, no endpoints ya disponibles.

Alex prepara `GET /api/v1/menu/categorias`, `/menu/platos`, `/menu/platos/:id` y `/menu/etiquetas`; usa `restauranteId` y `fecha=YYYY-MM-DD` para no fijar una sede ni la fecha actual en el código. Documenta parámetros, paginación y JSON en Swagger. La disponibilidad de `DishSchedule` prevalece sobre `Dish.disponible`; si no existe registro para esa fecha, usamos la general. Devolvemos también los platos no disponibles con su estado para mostrarlos atenuados en la carta; no los confundimos con categorías desactivadas. Ordenamos categorías/platos/fotos y acordamos explícitamente cómo serializamos `Decimal`. No escribimos datos, subimos fotos ni implementamos favoritos en este PR.

Fabián prepara consultas públicas de día y próximo día abierto bajo `/api/v1/calendario`, y administración de reglas/excepciones bajo `/api/v1/admin/calendario`. Reutiliza `Restaurant`, `TimeSlot` y `CalendarDay`; la excepción por fecha prevalece sobre las reglas semanales. Conserva `soloPorReserva`, valida fechas reales y horas `HH:mm`, y limita la búsqueda del próximo día para no crear un bucle sin fin. Acordamos la fecha comercial en `America/Bogota`. No modifica ni cancela reservas: al intentar cerrar un día con reservas confirmadas devuelve una advertencia con la cantidad afectada y documenta cómo confirmamos esa acción. Protege las escrituras con JWT y rol `ADMIN`, incluyendo los imports/providers que necesitan los guards existentes; no basta con poner decoradores. No implementa menú ni aforo de reservas en este PR.

Guardamos los nuevos esquemas/tipos en archivos distintos de `packages/shared`, uno de menú y otro de calendario. Si debemos añadir exports al índice o importar módulos en `AppModule`, hacemos cambios mínimos sin reemplazar el contenido del otro compañero. No cambiamos el esquema de datos ni generamos migraciones sin justificar y acordar primero la necesidad.

El modelo `Reservation` actual no tiene `restaurantId` ni relación directa con `Restaurant`. Para la advertencia de cierre no inventamos ese filtro Prisma: documentamos el alcance de nuestra sede única y pedimos una decisión si necesitamos distinguir reservas de varias sedes. No agregamos una migración solo para suponer esa relación.

## Cómo entregamos sin depender de la VPS

Partimos de `origin/dev` actualizado y de un árbol limpio. Usamos `alex/api-menu-publico` o `fabian/calendario-atencion`. Si hay trabajo pendiente lo conservamos en su rama: no hacemos `reset --hard`, limpieza ni cambios de Git para forzar el inicio.

Comprobamos la identidad con `git var GIT_AUTHOR_IDENT` y `git var GIT_COMMITTER_IDENT`. Si no corresponde a nuestro nombre/correo de `Reglas.md`, paramos y pedimos corregirla manualmente; el agente no cambia la configuración de Git. Hacemos commits pequeños con `alex/...` o `fabian/...`, sin trailers ni marcas adicionales.

Usamos Node 22 actualizado e instalación `npm ci`, sin borrar el lockfile ni forzar actualizaciones. Ejecutamos build de shared, generación Prisma, lint/test/build de API y pruebas de `@encanto/mobile`, como en `Landing_Temporal.md`. Probamos servicios y HTTP con Prisma simulado; cuando necesitemos una prueba de integración usamos una base local de prueba aislada, nunca Supabase compartido. No ejecutamos seed, reset ni migraciones contra datos de compañeros.

Alex cubre precedencia de disponibilidad (habilitar, deshabilitar y ausencia de registro), consulta de fecha distinta a hoy, paginación, IDs/fechas inválidos y plato inexistente. Fabián cubre precedencia de excepciones, `soloPorReserva`, múltiples reglas semanales, ausencia de apertura, validación de fechas/horas, advertencia de reservas afectadas y respuestas 401/403 en escrituras. No presentamos pruebas con mocks como evidencia de una conexión real a PostgreSQL.

Preparamos un PR a `dev` con rutas, ejemplos sin credenciales, pruebas realmente ejecutadas y pendientes. Publicamos solamente nuestra rama cuando el integrante lo autorice; no integramos automáticamente ni hacemos push directo a `dev` o `main`. Revisamos los cambios comunes antes de integrar cada PR. El push generado por la integración activa el despliegue; el PR por sí solo no despliega.

No modificamos workflow, Docker, Nginx, `.env.vps`, secretos ni esta landing para implementar esos módulos. Si encontramos un requisito ambiguo o un bloqueo de infraestructura, lo explicamos y pedimos una decisión concreta; no inventamos endpoints remotos ni declaramos el sprint completo solo porque compile.
