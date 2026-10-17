# Reservas y operación · EC-31 a EC-40

**Corte:** 16 de octubre de 2026. Implementamos estas historias en `yeison/ajusta-encabezados-y-auth-plan`, basada en `dev` (`47a1e0e`). Aún no están integradas en `dev` ni aceptadas en Jira. Los nombres de responsable en el backlog no cambian: esta implementación acelerada la realizó Yeison con autorización del equipo y no se atribuye a commits de Alex o Fabián.

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

El vencimiento de 12 horas se actualiza perezosamente al consultar o escribir reservas; todavía no hay worker/cron que lo ejecute en segundo plano. El no-show se marca manualmente por el personal cuando ya se cumplió `Restaurant.toleranciaMin` (30 minutos por defecto). Notificaciones, recordatorios y automatización siguen en Sprint 5. El pago/verificación continúa fuera de la app; no añadimos pasarela ni carga de comprobantes.

## Pruebas y construcción

Verificamos en esta rama:

- `npm run build --workspace=@encanto/shared`: correcto.
- `npm run build --workspace=api` y `npm run lint --workspace=api`: correctos.
- `npx vitest run --no-file-parallelism` desde `apps/api` con PostgreSQL local desechable: **20 suites, 187 pruebas aprobadas**, incluidas cuatro suites de integración que aplican migraciones en esquemas aleatorios.
- `npm run test --workspace=@encanto/mobile`: **16 suites, 46 pruebas aprobadas**.
- `npx tsc --noEmit -p apps/mobile/tsconfig.json`: correcto.
- ESLint dirigido a las pantallas/servicios nuevos o modificados: cero errores y 36 avisos (`no-void` y estilos inline). El lint global móvil también pasa: cero errores y 51 avisos, principalmente `no-void`, estilos inline y componentes anidados de navegación.
- `apps/mobile/android/gradlew.bat assembleDebug`: correcto. Instalamos la APK y Metro completó el bundle. En el S21 renderizaron las pestañas Carta, Mis reservas, Próximamente y Ajustes; verificamos el espacio de encabezados. No completamos un recorrido conectado de reservas/admin porque no configuramos API local con restaurante, usuario y rol de QA.
- Docker construyó la imagen, aplicó las seis migraciones en una red/DB temporal privadas y el health respondió `status=ok`, `database=connected`. Los contenedores/red de prueba se retiraron al finalizar.

No usamos la base Supabase compartida ni escribimos datos en la VPS. La prueba Postgres requiere la base exclusivamente local `encanto_ec25_test`; nunca apuntar a `DATABASE_URL` de Supabase.

## Qué falta para cerrar

1. Revisar la rama y comparar con los avances publicados de cada persona; integrar el código a `dev` mediante PR y esperar CI/CD.
2. Repetir en Android el recorrido de comensal y ADMIN/STAFF usando una API local de prueba, sin datos reales; confirmar navegación, tamaños pequeños/grandes, copia/WhatsApp y permisos.
3. Configurar un bucket público de fotos y `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_STORAGE_BUCKET` solo en el entorno de ejecución. Luego probar una carga, reorden, principal, eliminación y URL pública. Nunca incluir la service-role key en la app ni en Git.
4. Actualizar los estados y comentarios de EC-22–40 en Jira con esta evidencia después de aceptación. El CSV del repositorio es una plantilla importable, no se sincroniza automáticamente.
5. Mantener el login Google global, las subpantallas completas de Ajustes, avisos push, recordatorios y vencimiento automático para su alcance futuro de Sprint 5.
