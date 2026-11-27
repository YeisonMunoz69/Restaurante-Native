# Reservas y operación · EC-31 a EC-40

**Ajuste local del 19 de noviembre.** EC-33 organiza la solicitud en cuatro pasos: «Tu visita», «Elige el horario», «Tu pedido» y «Revisa y envía». El horario agrupa las franjas en mañana y tarde y las muestra en una fila horizontal. El pedido separa los platos elegidos de las sugerencias. El resumen muestra sus fotos y el total. EC-35 permite adjuntar la captura del pago externo en el cuarto paso o compartir una imagen hacia El Encanto Campestre desde otra aplicación de Android. La persona también puede adjuntarla desde Mis reservas y generar el resumen vertical en PNG. EC-36 exige la versión vigente del comprobante para aprobar. ADMIN abre el Panel desde la barra inferior y STAFF abre su Agenda. La carga se exige para aprobar también en solicitudes de solo mesa. El total de platos no determina un anticipo. Pendiente actualizar requisitos en Drive y Word local: RN-09/10, RF-RES02–07, RF-RES09 y RF-ADM08–11.

El borrador se conserva en el dispositivo por cuenta, restaurante y servidor. Al compartir una imagen, Android guarda una copia privada y la app abre el último paso del borrador. Si todavía no hay borrador, abre el paso 1 con el comprobante ya disponible en el paso 4. Si falta iniciar sesión, mantiene la captura en espera. Adjuntar o compartir una imagen solo actualiza el borrador. Al enviar la solicitud explícitamente, la app registra la reserva y luego carga la imagen. Si falla esa carga, la app ofrece reintentar sobre el mismo código. Los avisos breves duran tres segundos y la ayuda y la carga usan cuadros centrados con desenfoque.

En Android, con los datos de pago publicados, **Abrir app para pagar** sugiere Nequi, DaviPlata, Mi Bancolombia, Davivienda, Banco de Bogotá, BBVA Colombia y Banco Caja Social según las que estén instaladas. El usuario elige una app y completa el pago en ella con los datos vigentes. Para volver a la reserva, comparte la foto del comprobante con El Encanto Campestre. Si la solicitud ya tiene código, la foto queda lista para enviarse desde esa misma solicitud.

La migración `20261119220000_comprobantes_privados_reservas` crea una tabla 1:1 en PostgreSQL. Los listados llevan metadatos y la imagen se obtiene con autorización del titular o un ADMIN. La agenda de STAFF recibe los datos operativos. El límite de carga multipart es 10 MB. Si el proxy tiene un límite menor, configurar `client_max_body_size 12m;` en el virtual host de la API. Al desplegar, aplicar la migración antes de arrancar la nueva imagen de la API y probar luego con el APK actualizado.

**Corte:** 16 de octubre de 2026. Integramos esta implementación en `dev` mediante PR #11, merge `0245146`, conservando sus commits y migraciones. El CI de la cabeza final pasó 195 pruebas API sin omisiones y 49 móviles, además del runtime Docker. Esta integración técnica no cierra Sprint 3 ni cambia automáticamente sus responsables o aceptación. Evidencia de VPS y límites en [el acta de cierre](Cierre_Sprint2_2026-10-16.md).

**Verificación en Samsung Galaxy S21.** El menú Compartir de Galería ofreció «EncantoApp» y guardó una imagen ficticia en modo invitado. Después de iniciar sesión, la app abrió el paso 1 con la captura disponible. Al compartir otra vez desde el paso 2, conservó la franja de las 10:00 y mostró el aviso de guardado. En el paso 4 se vieron la miniatura de un plato real de la carta y la captura ficticia. El aviso de día cerrado apareció tres segundos. La ayuda con desenfoque se cerró al tocar fuera. El borrador conservó el paso 4, fecha, horario, plato y archivo al reinstalar el APK sobre la misma app.

El arranque tras un cierre forzado y tras actualizar el APK volvió a invitado. La entrada de renovación estaba presente después de entrar con Google y desapareció durante el arranque. Queda por identificar qué validación falló en dev. El borrador para la misma cuenta seguía guardado con sus datos y la captura. La revisión física terminó en el borrador. Pasaron 133 pruebas móviles y 298 de API con PostgreSQL aislado. La aceptación del envío y revisión de comprobantes contra dev queda pendiente del despliegue de la API y su migración.

**Ajustes de navegación y presentación.** En EC-33 añadimos flechas a ambos lados de las horas cuando hay franjas fuera de vista. El pie del formulario permite volver de paso y continuar, mientras Atrás abre «Progreso guardado» y deja elegir entre seguir editando y regresar a Mis reservas. En el paso 3, las sugerencias tienen un tinte verde suave. En EC-35, agrupamos «Adjuntar foto» y «Medios de pago» y dejamos la opción para quitar la captura junto a su encabezado. En EC-34, «Ver ticket» abre la visita, el pedido y el total en una vista con acciones inferiores para copiar y compartir. La imagen PNG sigue disponible desde el comprobante adjunto.

## Qué quedó implementado

- **EC-31/32:** consultamos franjas reales del calendario, duración por tamaño de grupo, anticipación, mínimo para días de solo reserva y cupo concurrente. La creación verifica disponibilidad y escribe solicitud/líneas dentro de una transacción `Serializable`; una colisión controlada devuelve conflicto y no guarda líneas parciales.
- **EC-33/35/38:** desde Reservas, el comensal elige fecha y personas, selecciona una franja, agrega un pedido opcional o continúa sin él, revisa el total y envía una solicitud. Ve el código/ticket, puede copiarlo o abrir WhatsApp, y consulta/cancela sus propias reservas.
- **EC-34:** el servidor calcula el total sin impuestos y congela el precio unitario en cada línea; el ticket en texto incluye código, fecha, horario, personas, pedido, total y estado.
- **EC-36/37/39:** ADMIN ve solicitudes, verifica el pago externo, aprueba o rechaza con motivo; STAFF/ADMIN consulta la agenda, registra llegada, inasistencia tras la tolerancia configurada y cierre de atención. La máquina de estados valida las transiciones en el servicio, registra quién/cuándo y actualiza contadores de cancelaciones e inasistencias.
- **EC-40:** pruebas de límites, transiciones, persistencia, ocupación y concurrencia; detalles reproducibles abajo.

El pedido es opcional con menos de 8 personas y obligatorio desde 8. Las fechas se calculan con calendario civil de `America/Bogota`; no creamos horarios artificiales cuando no hay una regla de apertura. La sede sigue siendo única: `Reservation` no incorpora relación a restaurante en esta entrega.

## Rutas

Todas usan `/api/v1`; las de reservas requieren JWT. Las operaciones administrativas vuelven a comprobar el rol en el servidor.

| Método | Ruta | Acceso y uso |
| --- | --- | --- |
| GET | `/reservas/franjas?fecha=YYYY-MM-DD&numComensales=N` | COMENSAL, STAFF o ADMIN; franjas reservables para ese grupo |
| POST | `/reservas` | Crea `SOLICITADA` y sus líneas; el pago externo no confirma automáticamente |
| GET | `/reservas/mias` | Solo reservas del usuario autenticado |
| GET | `/reservas/mias/:id` | Detalle propio; no permite consultar reservas ajenas |
| PATCH | `/reservas/mias/:id/cancelar` | Retira una solicitud o cancela una confirmada dentro del plazo |
| GET | `/admin/reservas/solicitudes?fecha=YYYY-MM-DD` | Solo ADMIN; bandeja con cancelaciones previas |
| PATCH | `/admin/reservas/:id/aprobar` | Solo ADMIN; confirma después de verificar el pago por fuera |
| PATCH | `/admin/reservas/:id/rechazar` | Solo ADMIN; exige motivo y deja `RECHAZADA` terminal |
| GET | `/admin/reservas/agenda?fecha=YYYY-MM-DD` | ADMIN/STAFF; agenda, incluidas atenciones cerradas o inasistencias |
| PATCH | `/admin/reservas/:id/llegada` | ADMIN/STAFF; marca `EN_CURSO` |
| PATCH | `/admin/reservas/:id/inasistencia` | ADMIN/STAFF; disponible después de la tolerancia del restaurante |
| PATCH | `/admin/reservas/:id/completar` | ADMIN/STAFF; cierra una atención `EN_CURSO` |

Los errores de estado, horario, permisos o concurrencia no se convierten en éxitos vacíos. Ver [el esquema compartido](../packages/shared/src/schemas/reservation.schema.ts), [el servicio](../apps/api/src/reservations/reservations.service.ts) y Swagger local.

## Estados y reglas ya acordadas

```text
SOLICITADA ──ADMIN aprueba──► CONFIRMADA ──llegada──► EN_CURSO ──cierre──► COMPLETADA
     │                            │
     ├──ADMIN rechaza──► RECHAZADA├──comensal cancela (≥ 60 min)──► CANCELADA
     ├──comensal retira► CANCELADA└──personal marca tras tolerancia► NO_ASISTIO
     └──12 h vencidas──► EXPIRADA
```

`RECHAZADA`, `EXPIRADA`, `CANCELADA`, `COMPLETADA` y `NO_ASISTIO` son terminales. Una reserva confirmada puede cancelarse exactamente hasta 60 minutos antes. La duración es 90 minutos hasta cuatro personas y 120 desde cinco; se ofrecen fechas hasta tres meses calendario y franjas que inician al menos una hora después. No existe el corte fijo de las 13:00.

El vencimiento de 12 horas se actualiza perezosamente al consultar o escribir reservas; todavía no hay worker/cron que lo ejecute en segundo plano. El no-show se marca manualmente por el personal cuando ya se cumplió `Restaurant.toleranciaMin` (30 minutos por defecto). Notificaciones, recordatorios y automatización siguen en Sprint 5. El pago se hace fuera de la app. ADMIN revisa el comprobante privado desde el Panel.

## Pruebas y construcción

Verificamos en esta rama:

- `npm run build --workspace=@encanto/shared`: correcto.
- `npm run build --workspace=api` y `npm run lint --workspace=api`: correctos.
- `npx vitest run --no-file-parallelism` desde `apps/api` con PostgreSQL local desechable: **20 suites, 187 pruebas aprobadas**, incluidas cuatro suites de integración que aplican migraciones en esquemas aleatorios.
- `npm run test --workspace=@encanto/mobile`: **16 suites, 47 pruebas aprobadas**, incluida una regresión para cambiar de semana en el selector de fechas.
- `npx tsc --noEmit -p apps/mobile/tsconfig.json`: correcto.
- ESLint dirigido a las pantallas/servicios nuevos o modificados: cero errores y 36 avisos (`no-void` y estilos inline). El lint global móvil también pasa: cero errores y 51 avisos, principalmente `no-void`, estilos inline y componentes anidados de navegación.
- `apps/mobile/android/gradlew.bat assembleDebug`: correcto. En el S21 configuramos temporalmente la API local por `adb reverse`, iniciamos sesión con un usuario ficticio y completamos una reserva para el 23 de octubre con pedido anticipado. Apareció en Mis reservas como `SOLICITADA`; el usuario ADMIN la aprobó, la agenda la mostró, y se registró llegada y cierre. También se verificó carta pública y administración de disponibilidad general, revirtiendo el cambio de disponibilidad al final. Al cambiar de semana se detectó que la fecha seleccionada quedaba fuera de la semana visible; se corrigió, se agregó una prueba y en el S21 se comprobó que la fecha enviada coincide con la fecha visible.
- Un smoke HTTP local cubrió 16 operaciones: registro/login/rol, `/auth/me`, categorías/platos, calendario, franjas, creación/ticket, mis reservas, 403 para un comensal que intenta usar administración, aprobación, agenda y cancelación. Los access tokens no se imprimieron.
- Docker aplicó las seis migraciones a una PostgreSQL desechable y `/api/v1/health` respondió `status=ok`, `database=connected`. La API y el contenedor de QA usan el puerto local 3038/55434, no Supabase. Las operaciones y fixtures de QA se retirarán con el contenedor; no se tocó la base compartida ni la VPS.

No usamos la base Supabase compartida ni escribimos datos en la VPS. La prueba Postgres requiere la base exclusivamente local `encanto_ec25_test`; nunca apuntar a `DATABASE_URL` de Supabase.

## Qué falta para cerrar

1. Revisar la rama y comparar con los avances publicados de cada persona; integrar el código a `dev` mediante PR y esperar CI/CD.
2. Completar aceptación Android con casos restantes: reserva sin pedido y grupo desde ocho personas, rechazo con motivo, cancelación y límite de 60 minutos, conflicto de aforo/concurrencia e inasistencia después de tolerancia. La solicitud, aprobación, llegada y cierre ya se recorrieron en S21; no volver a presentarlos como no probados.
3. Configurar un bucket público de fotos y `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_STORAGE_BUCKET` solo en el entorno de ejecución. Luego probar una carga, reorden, principal, eliminación y URL pública. Nunca incluir la service-role key en la app ni en Git.
4. Actualizar los estados y comentarios de EC-22–40 en Jira con esta evidencia después de revisión e integración/aceptación. El CSV del repositorio es una plantilla importable, no se sincroniza automáticamente.
5. Mantener el login Google global, las subpantallas completas de Ajustes, avisos push, recordatorios y vencimiento automático para su alcance futuro de Sprint 5.
