# Primera entrega del calendario de atención

Implementamos el backend de RF-ADM06 / HU-05 del Sprint 2. Consultamos un día y el próximo día abierto, mantenemos reglas semanales y excepciones por fecha, y advertimos antes de cerrar fechas con reservas confirmadas. No cerramos la historia móvil ni todo el sprint con esta entrega.

Trabajamos con `Restaurant`, `TimeSlot` y `CalendarDay` existentes. No cambiamos el esquema ni creamos migraciones. Compartimos validaciones y tipos en `packages/shared/src/schemas/calendar.schema.ts`. Registramos `CalendarModule` en `AppModule` y exportamos desde `AuthModule` su JWT configurado y las guardias necesarias.

## Cómo resolvemos un día

1. Si existe `CalendarDay` para sede y fecha, usamos exclusivamente esa excepción: puede abrir o cerrar, cambiar el horario y conservar `soloPorReserva` y `motivo`.
2. Sin excepción, incluimos todas las reglas `TimeSlot` del día semanal con `activo=true` y `abierto=true`. Las ordenamos por apertura y cierre. Una regla cerrada no anula otra franja abierta. Las inactivas no participan.
3. Sin franjas abiertas, devolvemos `abierto=false` y `horarios=[]`. Diferenciamos `SEMANAL`, `EXCEPCION` y `SIN_REGLA`. Una sede inexistente devuelve 404.

`TimeSlot` no tiene `soloPorReserva`. Para una apertura de ese tipo usamos una excepción por fecha, sin inventar una columna semanal. Las franjas del calendario son intervalos de atención, no franjas reservables ni cálculos de aforo. Conservamos varias reglas, incluso si se solapan; no las fusionamos ni generamos cupos.

Usamos `America/Bogota` para obtener hoy. Persistimos las fechas civiles como `@db.Date` con medianoche UTC y calculamos el día semanal en UTC sobre esa representación, sin convertirla a la zona del servidor. Admitimos fechas reales `YYYY-MM-DD` de 0001 a 9999 y horas `HH:mm` de `00:00` a `23:59`. Exigimos apertura anterior al cierre; no admitimos intervalos nocturnos que crucen medianoche.

## Rutas y contratos

Todas las rutas llevan el prefijo `/api/v1`. `restauranteId` es un UUID obligatorio en query; no fijamos una sede en el código. Los cuerpos son estrictos: rechazamos propiedades desconocidas, cadenas en lugar de booleanos y cantidades de confirmación negativas o no enteras.

| Método y ruta                                 | Entrada                                                                    | Resultado 200                                                                                                      |
| --------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `GET /calendario/dia`                         | `restauranteId`, `fecha`                                                   | Día efectivo: `restauranteId`, `fecha`, `zonaHoraria`, `abierto`, `soloPorReserva`, `origen`, `horarios`, `motivo` |
| `GET /calendario/proximo`                     | `restauranteId`, `desde` opcional                                          | `desde`, `hasta`, `diasBuscados`, `dia` (día efectivo o `null`)                                                    |
| `GET /admin/calendario/reglas`                | `restauranteId`                                                            | Reglas con `id`, `diaSemana`, horas, `abierto`, `activo`, incluidas las inactivas                                  |
| `PUT /admin/calendario/reglas/:diaSemana`     | `restauranteId`, día 0–6; cuerpo `{reglas: [...]}` y confirmación opcional | `restauranteId`, `diaSemana`, `reglas`, `reservasAfectadas`                                                        |
| `GET /admin/calendario/excepciones`           | `restauranteId`, `fecha`                                                   | Excepción persistida o `null`                                                                                      |
| `PUT /admin/calendario/excepciones/:fecha`    | `restauranteId`; cuerpo de excepción y confirmación opcional               | `{excepcion, reservasAfectadas}`                                                                                   |
| `DELETE /admin/calendario/excepciones/:fecha` | `restauranteId`; cuerpo de confirmación opcional                           | `{eliminada: true, reservasAfectadas}`                                                                             |

Las consultas públicas no exigen sesión. Todas las rutas administrativas, incluidas sus consultas, usan `JwtAuthGuard`, después `RolesGuard`, y requieren `ADMIN`. Importamos `AuthModule` con su `JwtModule` configurado; las guardias no dependen solamente de decoradores. Swagger queda disponible en `/api/docs` cuando está habilitado y describe query, parámetros, cuerpos, resultados y errores.

En `proximo`, `desde` es inclusivo; si lo omitimos usamos hoy en Bogotá, incluso si ya pasó el horario de hoy. Buscamos como máximo **366 fechas**, desde el inicio hasta inicio + 365 días, truncando en `9999-12-31`. Leemos reglas y excepciones en dos consultas, sin una consulta por fecha ni bucle ilimitado. `dia=null` solo significa ausencia de apertura en ese intervalo. No equivale a una disponibilidad reservable ni a un cierre permanente.

Al reemplazar reglas, `0=domingo` y `6=sábado`. Aceptamos hasta 48 intervalos por día. `reglas=[]` elimina los de ese día; los demás días no cambian. Cada regla tiene `horaApertura`, `horaCierre`, `abierto` (por defecto true), `activo` (por defecto true) e `id` opcional. Enviamos el `id` recibido de GET para conservar esa fila y campos existentes como `aforoMaximo`, que esta API no permite escribir. Omitirlo crea una nueva regla; los IDs del día omitidos de la lista se eliminan. Rechazamos IDs duplicados o de otra sede/día. Consultamos GET después de PUT para obtener los IDs de nuevas filas. No implementamos administración de aforo.

El PUT de excepción reemplaza todos sus campos editables: `abierto` es obligatorio; `soloPorReserva` vale false por defecto y `motivo` admite null o hasta 500 caracteres. Si abrimos, exigimos ambas horas ordenadas; si cerramos, omitimos las horas (o usamos null) y `soloPorReserva=false`. Los campos omitidos de horas/motivo se guardan como null; no es un PATCH.

## Ejemplos locales sin credenciales

Usamos un UUID ilustrativo; lo sustituimos por el de nuestro restaurante. Los ejemplos públicos no requieren token:

```http
GET /api/v1/calendario/dia?restauranteId=00000000-0000-4000-8000-000000000001&fecha=2026-10-11
GET /api/v1/calendario/proximo?restauranteId=00000000-0000-4000-8000-000000000001&desde=2026-10-08
```

```json
{
  "restauranteId": "00000000-0000-4000-8000-000000000001",
  "fecha": "2026-10-11",
  "zonaHoraria": "America/Bogota",
  "abierto": true,
  "soloPorReserva": true,
  "origen": "EXCEPCION",
  "horarios": [{ "horaApertura": "12:00", "horaCierre": "17:00" }],
  "motivo": "Atención de grupo"
}
```

En Swagger autorizamos nuestra sesión ADMIN sin guardar su token en documentación. Para `PUT /api/v1/admin/calendario/reglas/0?restauranteId=...`, enviamos:

```json
{
  "reglas": [
    { "horaApertura": "09:00", "horaCierre": "12:00", "abierto": true, "activo": true },
    { "horaApertura": "14:00", "horaCierre": "18:00", "abierto": true, "activo": true }
  ]
}
```

Para una apertura excepcional, `PUT /api/v1/admin/calendario/excepciones/2026-10-12?restauranteId=...`:

```json
{
  "abierto": true,
  "horaApertura": "12:00",
  "horaCierre": "17:00",
  "soloPorReserva": true,
  "motivo": "Atención de grupo"
}
```

## Advertencia y confirmación de cierre

No cancelamos ni modificamos reservas. Para cerrar una excepción consultamos `Reservation` por `fecha` y `estado=CONFIRMADA`. Si hay reservas y no recibimos la cantidad actual confirmada, respondemos **409 antes de escribir**. El filtro global existente mantiene la advertencia estructurada dentro de `message`:

```json
{
  "statusCode": 409,
  "message": {
    "codigo": "RESERVAS_CONFIRMADAS_AFECTADAS",
    "reservasAfectadas": 2,
    "fechas": [{ "fecha": "2026-10-11", "cantidad": 2 }],
    "confirmacion": "Repita la misma petición con confirmarReservasAfectadas igual a reservasAfectadas; las reservas no se modificarán"
  },
  "timestamp": "2026-10-08T15:00:00.000Z",
  "path": "/api/v1/admin/calendario/excepciones/2026-10-11?restauranteId=00000000-0000-4000-8000-000000000001"
}
```

Revisamos la advertencia con el administrador y repetimos **el mismo método, URL y contenido** agregando la cantidad:

```json
{ "abierto": false, "motivo": "Mantenimiento", "confirmarReservasAfectadas": 2 }
```

Volvemos a contar: si ahora hay tres reservas, devolvemos otro 409 con tres. Si coincide la cantidad o no hay reservas confirmadas, guardamos el calendario y devolvemos `reservasAfectadas`. Las reservas siguen confirmadas y su atención se resuelve manualmente. Esta confirmación reconoce un conteo, no firma una lista de IDs ni garantiza que sean las mismas personas si cambian sin variar la cantidad.

También advertimos al eliminar una excepción abierta si el horario semanal deja cerrado el día. Al reemplazar reglas semanales revisamos todas las fechas con reservas confirmadas desde hoy en Bogotá y advertimos únicamente las que pasan de abiertas a cerradas, respetando sus excepciones. No limitamos ese análisis de reservas al horizonte de la consulta pública. Reducir horarios de un día que sigue abierto no constituye un cierre completo en este contrato; no validamos compatibilidad horaria ni transiciones de reservas.

Ejecutamos comprobación y escritura del calendario en una transacción serializable. Un conflicto Prisma `P2034` devuelve 409 `CALENDARIO_CONCURRENTE`; consultamos y repetimos la operación. No sustituimos con esto las validaciones de futuras creaciones/aprobaciones de reservas: el Sprint 3 debe verificar el calendario en sus propias transacciones. No afirmamos haber probado concurrencia real de PostgreSQL con dobles.

## Sede única y errores

`Reservation` actualmente **no tiene `restaurantId` ni relación con `Restaurant`**. Por eso contamos las reservas confirmadas de toda la instalación. Permitimos escrituras administrativas solo cuando hay exactamente un restaurante y existe el UUID solicitado. Si hay más, devolvemos 409 `SEDE_UNICA_REQUERIDA`, sin escribir. Las consultas del calendario sí usan la sede indicada. Antes de admitir administración multisede debemos acordar la relación, su migración y la asignación de reservas existentes con el equipo; no inventamos un filtro Prisma.

| Estado | Significado                                                                                                                                                    |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | UUID/fecha/día/hora/cuerpo inválido, intervalo invertido, IDs de reglas duplicados o ajenos; validaciones de entrada incluyen `campo` y `detalle` en `message` |
| 401    | Falta JWT de acceso válido, está mal firmado o expiró                                                                                                          |
| 403    | Sesión válida sin rol ADMIN                                                                                                                                    |
| 404    | Restaurante inexistente; al eliminar, excepción inexistente                                                                                                    |
| 409    | Advertencia sin confirmar o cantidad distinta; varias sedes; conflicto serializable                                                                            |
| 500    | Error de persistencia no clasificado                                                                                                                           |

Conservamos el formato del filtro global: `statusCode`, `message`, `timestamp`, `path`. Los mensajes de autorización y de reglas ajenas pueden ser texto; las validaciones de Zod son una lista; las advertencias de calendario son objetos con `codigo`.

## Verificación y pendientes

Probamos el servicio con Prisma simulado y HTTP con `CalendarModule`, `AuthModule`, JWT y guardias reales. Sustituimos solamente Prisma y la configuración de prueba, sin leer archivos `.env`. En Vitest restauramos `design:paramtypes` de las guardias existentes porque esbuild no emite esos metadatos; en la compilación de producción los emite TypeScript. No conectamos Supabase, ejecutamos seed, reset ni migraciones. Probamos Swagger con el mismo filtro global usado en producción.

Registramos los comandos y resultados reales en [el resumen del PR](PR_Calendario_Atencion.md). Dejamos pendientes las pantallas móviles, validación de recorrido con el dueño, menú/carta, aforo, transiciones de reservas, TOTP y bitácora del alcance posterior. No marcamos RF-ADM06/HU-05 completos ni modificamos el estado de todo el Sprint 2. Tras revisar e integrar el PR a `dev`, comprobamos CI/CD y salud; esta rama no necesita acceso a la VPS.
