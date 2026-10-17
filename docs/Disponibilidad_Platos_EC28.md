# Disponibilidad de platos por fecha · EC-28

**Corte del 16 de octubre de 2026:** el backend/copia de disponibilidad de Fabián continúa integrado en `dev` (PR #7); el panel y su evidencia previa están en PR #8. Esta rama añade el cliente de carta, administración y disponibilidad, pero aún no se integra ni se cierra EC-28/29. La foto actual de pruebas/aceptación figura en [Plan_de_Sprints.md](Plan_de_Sprints.md).

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

Usamos Node 22 y PostgreSQL local desechable. El helper `menu-postgres.fixture.ts` valida host, usuario y base `encanto_ec25_test`; cada suite crea un esquema aleatorio, aplica migraciones versionadas y borra únicamente ese esquema. La suite de reservas usa `RESERVATION_TEST_DATABASE_URL` con el mismo destino aislado. No usamos `DATABASE_URL` del proyecto, seed, reset ni `db push`.

Para repetir la suite completa (menú, calendario, disponibilidad y reservas), sigue el procedimiento seguro y reproducible de [EC-25: PostgreSQL aislado](API_Menu_EC25.md#postgresql-aislado-y-reproducción). Esa guía define ambas variables (`ENCANTO_MENU_TEST_DATABASE_URL` y `RESERVATION_TEST_DATABASE_URL`), espera a que el contenedor esté listo y limpia solo su contenedor/esquemas.

La ejecución actual pasó **20 suites y 187 pruebas API**; la misma corrida incluyó las integraciones con PostgreSQL. Los dobles HTTP por sí solos no acreditan persistencia. No confundimos los datos del entorno temporal con Supabase.

## Coordinación

Responsables Jira EC-28/29: Fabián; EC-26/27/30: Yeison; EC-22/23/24: Alex. La rama actual incluye implementación adicional sin cambiar esa autoría. En el S21 se comprobó que la carta y el panel cargan, y se alternó la disponibilidad general de un plato y se restauró su valor. Esa sesión no repitió la copia por fecha; la evidencia Android anterior del PR #8 sí cubre previsualización, cancelación, confirmación y retiro de excepciones. Sigue pendiente una carga real a Storage y la aceptación formal de EC-28/29. Se mantienen las cinco pestañas y la autenticación actual hasta el cambio futuro de Google.

Registramos copia/configuración en Jira EC-28, comentario `10040`. **Pendiente actualizar requisitos en Drive y Word local: RF-ADM03/ADR-010, copia de disponibilidad efectiva con previsualización/confirmación; configuración compartida de entorno/sede; sección 8 reparto y sección 10 control de cambios.** Editar Markdown no demuestra actualización de esos documentos.
