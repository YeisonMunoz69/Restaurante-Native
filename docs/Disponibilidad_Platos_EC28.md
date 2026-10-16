# Disponibilidad de platos por fecha · EC-28

Implementamos excepciones de `DishSchedule` sobre el esquema existente. Una excepción `true` o `false` prevalece sobre `Dish.disponible`; quitarla restaura el valor general. No cambiamos esquema ni administramos aforo.

## Contrato administrativo

Rutas bajo `/api/v1/admin/menu/disponibilidad`, con JWT válido, rol **ADMIN** y `restauranteId` UUID en query. Importamos AuthModule y PrismaModule para resolver los providers de los guards.

| Método/ruta | Entrada | Resultado |
| --- | --- | --- |
| GET `/` | `fecha=2031-02-23`, `pagina=1`, `tamanoPagina=20` (máximo 100) | `{restauranteId,fecha,data,paginacion}` |
| PUT `/:fecha` | `{cambios:[{platoId,disponible}]}` | `{restauranteId,fecha,procesados}` |
| POST `/copiar` | `{origen,destino}` | `{aplicada:false,previsualizacion:{restauranteId,origen,destino,total,cambios,excepcionesDestino,confirmacion}}` |
| POST `/copiar` | Mismas fechas y `confirmacion` obtenida al previsualizar | `{aplicada:true,procesados}` |

Ejemplo de fila GET, sin credenciales:

```json
{
  "platoId": "22222222-2222-4222-8222-222222222222",
  "nombre": "Plato de ejemplo",
  "categoria": { "id": "33333333-3333-4333-8333-333333333333", "nombre": "Especiales", "orden": 0 },
  "disponibleGeneral": true,
  "disponible": false,
  "origen": "FECHA",
  "excepcion": { "id": "44444444-4444-4444-8444-444444444444", "disponible": false }
}
```

Ejemplo PUT de una excepción: `{"cambios":[{"platoId":"22222222-2222-4222-8222-222222222222","disponible":false}]}`. `disponible: null` **elimina la excepción**, sin cambiar el plato general. Admitimos entre 1 y 1000 IDs distintos por lote. Solo actualizamos el booleano de filas retenidas, conservando ID/cupo. No escribimos fechas distintas, disponibilidad general ni platos de categorías inactivas. Consultamos `/api/v1/menu/platos?restauranteId=...&fecha=...` para verificar lo que consumirá la carta. Compartimos paginación y orden estable con EC-25.

## Copia acordada con Fabián

Copiamos la disponibilidad **efectiva** del origen a excepciones explícitas del destino para todos los platos de categorías activas de la misma sede, hasta 1000. Origen y destino deben ser distintos. Mostramos fechas, cantidades y reemplazo antes de confirmar. No copiamos cupos ni cambiamos disponibilidad general, otras fechas o categorías inactivas.

La primera petición no escribe. El SHA-256 representa la fotografía consultada de platos, disponibilidad general y excepciones origen/destino. La segunda petición vuelve a leerla dentro de una transacción Serializable y rechaza una fotografía vencida. La confirmación no sustituye JWT ni permisos. Las escrituras son atómicas y las lecturas paginadas usan RepeatableRead.

## Errores

| HTTP | Motivo y acción |
| --- | --- |
| 400 | UUID/fecha civil real/paginación/booleano inválidos, IDs repetidos, lote vacío o mayor de 1000, origen igual a destino |
| 401 | JWT ausente, inválido o expirado |
| 403 | Sesión distinta de ADMIN |
| 404 | Sede inexistente o ID inexistente/ajeno/de categoría inactiva: rechazamos todo el lote |
| 409 | `message.codigo=COPIA_DESACTUALIZADA`: previsualizar y confirmar nuevamente |
| 409 | `message.codigo=DISPONIBILIDAD_CONCURRENTE`: recargar y revisar; no reintentamos escrituras a ciegas |
| 500 | Error inesperado; no presentamos una respuesta vacía como éxito |

Publicamos tipos/validación en `packages/shared/src/schemas/dish-availability.schema.ts` y contratos/errores en Swagger.

## Repetir pruebas reales

Usamos Node 22.23.3 y PostgreSQL local desechable. El helper heredado `menu-postgres.fixture.ts` conserva el nombre de base `encanto_ec25_test`, también para EC-28/29. Rechaza destinos fuera de `127.0.0.1`, puerto 5432, otro usuario/base o parámetros externos antes de crear Prisma. Cada suite crea un esquema aleatorio, aplica migraciones versionadas y borra únicamente ese esquema. No usa DATABASE_URL del proyecto, seed, reset ni db push.

```powershell
docker run --rm --name encanto-sprint2-pg-test -e POSTGRES_USER=encanto_test -e POSTGRES_PASSWORD=encanto_local_test -e POSTGRES_DB=encanto_ec25_test -p 127.0.0.1::5432 -d postgres:17-alpine
docker port encanto-sprint2-pg-test 5432/tcp
# Sustituimos PUERTO por el asignado; usuario/contraseña solo son de la base desechable.
$env:ENCANTO_MENU_TEST_DATABASE_URL='postgresql://encanto_test:encanto_local_test@127.0.0.1:PUERTO/encanto_ec25_test'
npm run test --workspace=api
```

Sin esa variable omitimos explícitamente las integraciones. Los dobles HTTP no acreditan persistencia. La suite real EC-28 cubre reconexión, precedencia en menú público, ID/cupo, copia sin escritura previa, confirmación vencida, categorías inactivas, rollback después de actualizar y escritor concurrente real. La suite de calendario es independiente y reutiliza su backend integrado.

## Coordinación

Responsable EC-28: Fabián. EC-26/27/30 siguen con Yeison; EC-22/23/24 con Alex. Acordamos acceso ADMIN en Ajustes y selector compartido antes del login, manteniendo cinco pestañas y autenticación existente. Panel y evidencia Android se entregan por separado de la API; estos endpoints solos no cierran EC-28.

Registramos copia/configuración en Jira EC-28, comentario `10040`. **Pendiente actualizar requisitos en Drive y Word local: RF-ADM03/ADR-010, copia de disponibilidad efectiva con previsualización/confirmación; configuración compartida de entorno/sede; sección 8 reparto y sección 10 control de cambios.** Editar Markdown no demuestra actualización de esos documentos.
