# EC-25: contrato y API pública de menú

**Estado al cierre del 16 de octubre de 2026:** conservamos EC-25 integrada por PR #6 y Listo, responsable Fabián. PR #11 integró la carta móvil y administración; no cambió este contrato público. EC-27 conserva pendiente Storage real y EC-22 la prueba física con 100 platos. El estado de EC-28/29 y el contraste de la VPS están en [el acta de cierre](Cierre_Sprint2_2026-10-16.md).

Publicamos A01 de [Tareas_Alex.md](Tareas_Alex.md) para desbloquear EC-22/23/24 de Alex y EC-26 de Yeison. Fabián confirmó el 15 de octubre de 2026 que `precio` se entregue como **número en COP**, no cadena decimal. Mantenemos las cuatro rutas acordadas, fecha obligatoria para platos/detalle y paginación estable. Los únicos cambios de integración son un export en el índice de shared y el import de MenuModule en AppModule; conservamos CalendarModule y autenticación. No cambiamos navegación.

## Auditoría e integración previa

Encontramos `fabian/calendario-atencion` en `76805a4`, árbol limpio, sin cambios ni commits pendientes de publicar respecto a su rama remota. Confirmamos el PR #2 integrado por `65c7435`, actualizamos origin e integramos `origin/dev` (`2b33ba7`) mediante `git merge origin/dev`, con avance rápido y sin conflictos. No rehacemos el calendario ni creamos commits vacíos para guardar trabajo inexistente. Creamos `fabian/api-menu-publico` para esta entrega; no encontramos un módulo de menú ni PR de EC-25 que pudiéramos reutilizar.

El reparto vigente es Fabián EC-25/28/29, Alex EC-22/23/24 y Yeison EC-26/27/30. EC-29 sigue En curso: su backend integrado no demuestra panel ni aceptación Android. Esta entrega no incluye escrituras de disponibilidad EC-28, pantallas ni servicios de administración de Yeison, ni reservas. Conservamos React Native bare y Keychain.

## Solicitudes

Prefijo común: `/api/v1/menu`. Todas las consultas son públicas, sin token. `restauranteId` es un UUID obligatorio.

| Método y ruta     | Query adicional                          | Respuesta 200            |
| ----------------- | ---------------------------------------- | ------------------------ |
| `GET /categorias` | `pagina`, `tamanoPagina` opcionales      | `MenuPage<MenuCategory>` |
| `GET /platos`     | `fecha` obligatoria; paginación opcional | `MenuDishesPage`         |
| `GET /platos/:id` | `fecha` obligatoria; `id` UUID           | `MenuDishResult`         |
| `GET /etiquetas`  | Paginación opcional                      | `MenuPage<MenuTag>`      |

Validamos fechas civiles reales `YYYY-MM-DD` usando el esquema existente del calendario. No asumimos hoy ni convertimos la fecha consultada a una zona que cambie el día. La carta puede consultarse aunque el calendario esté cerrado: Alex combina estas lecturas con `/calendario/dia` y `/calendario/proximo` y explica el cierre en EC-23. No declaramos franjas reservables ni aforo.

`pagina` vale 1 por defecto (máximo 10000); `tamanoPagina`, 20 (máximo 100). Exigimos cadenas de enteros positivos en HTTP: rechazamos cero, negativos, fracciones, notación exponencial, ceros iniciales, parámetros repetidos y desconocidos. Una página posterior al total devuelve 200 con `data=[]` y los metadatos reales; una sede inexistente, 404. Una lista vacía tiene `totalPaginas=0`.

## Datos y disponibilidad

Los esquemas de entrada y tipos de salida están en `packages/shared/src/schemas/menu.schema.ts`, exportados por `@encanto/shared`. Swagger en `/api/docs` documenta parámetros, datos y errores.

- `MenuCategory`: `id`, `nombre`, `orden`. Solo categorías activas de la sede, incluidas las que no tienen platos.
- `MenuTag`: `id`, `nombre`, `icono` nullable. Solo etiquetas usadas por platos de categorías activas de la sede, aunque esos platos estén no disponibles. No exponemos etiquetas sin uso, de categorías inactivas o exclusivas de otra sede.
- `MenuDish`: `id`, `categoria` (objeto anterior), `nombre`, `slug`, `descripcionBreve` nullable, `descripcion`, `precio` numérico, `moneda="COP"`, `alergenos` nullable, `destacado`, `orden`, `disponible`, `disponibilidadOrigen`, `fotos`, `etiquetas`. Lista y detalle comparten el mismo DTO.
- `fotos`: hasta diez registros persistidos con `id`, `path`, `pathOg` nullable, `orden` y `principal`. Ordenamos principal primero, después orden/id; si faltan fotos devolvemos `[]`. Entregamos las rutas tal como están guardadas, sin inventar imágenes, URLs firmadas ni configuración de Storage. La carga y procesamiento siguen en EC-27.
- `etiquetas` dentro de cada plato: ordenadas por nombre/id.

Resolvemos `DishSchedule(dishId, fecha)` antes de `Dish.disponible`. Un registro false deshabilita un plato generalmente disponible; uno true habilita un plato generalmente no disponible. Si no hay registro usamos la disponibilidad general. `disponibilidadOrigen` vale `FECHA` o `GENERAL`. Incluimos los platos no disponibles para que Alex pueda atenuarlos. No mezclamos no disponibilidad con categoría inactiva: esta última excluye el plato, incluso en detalle. Tampoco devolvemos platos de otra sede por conocer su ID.

Leemos `Decimal(12,2)` con `toNumber()`, preservando hasta sus dos decimales en el JSON numérico. No enviamos texto monetario con separadores ni calculamos totales/pedidos. El cliente formatea COP para presentación; el formateador compartido actual usa cero decimales y redondea visualmente, por lo que Alex debe revisar su presentación si recibe precios con centavos. No cambiamos ese helper ni la regla de precios de administración en esta entrega.

## Orden, paginación y consistencia

Ordenamos categorías por `orden,id`; platos por `categoria.orden,categoria.id,plato.orden,plato.id`; etiquetas por `nombre,id`. Alex une páginas por ID de plato y agrupa usando `categoria.id`, conservando el objeto de categoría aunque continúe en otra página. No añadimos filtros, búsqueda, favoritos ni caché.

Cada solicitud lee existencia de sede, conteo y filas dentro de una transacción PostgreSQL **RepeatableRead**, de modo que una escritura concurrente no mezcle el total anterior con filas nuevas en esa misma respuesta. No mantenemos una transacción entre solicitudes: si un administrador reordena o añade platos entre páginas, el cliente refresca la lista. No prometemos una instantánea entre páginas separadas.

## Ejemplos sin credenciales

El UUID ilustrativo se reemplaza por el real del entorno; no representa datos de Supabase.

```http
GET /api/v1/menu/categorias?restauranteId=00000000-0000-4000-8000-000000000011
GET /api/v1/menu/platos?restauranteId=00000000-0000-4000-8000-000000000011&fecha=2031-02-23&pagina=1&tamanoPagina=20
GET /api/v1/menu/platos/00000000-0000-4000-8000-000000000012?restauranteId=00000000-0000-4000-8000-000000000011&fecha=2031-02-23
GET /api/v1/menu/etiquetas?restauranteId=00000000-0000-4000-8000-000000000011
```

```json
{
  "restauranteId": "00000000-0000-4000-8000-000000000011",
  "fecha": "2031-02-23",
  "data": [
    {
      "id": "00000000-0000-4000-8000-000000000012",
      "categoria": {
        "id": "00000000-0000-4000-8000-000000000013",
        "nombre": "Entradas",
        "orden": 0
      },
      "nombre": "Plato de ejemplo de contrato",
      "slug": "plato-de-ejemplo",
      "descripcionBreve": null,
      "descripcion": "Texto servido desde la base",
      "precio": 32000.5,
      "moneda": "COP",
      "alergenos": null,
      "destacado": false,
      "orden": 0,
      "disponible": false,
      "disponibilidadOrigen": "FECHA",
      "fotos": [],
      "etiquetas": []
    }
  ],
  "paginacion": { "pagina": 1, "tamanoPagina": 20, "total": 1, "totalPaginas": 1 }
}
```

El ejemplo es documentación, no una respuesta de respaldo. Si Prisma falla devolvemos error, sin sustituirlo por el Sancocho de muestra. Detalle responde `{restauranteId, fecha, plato}`; categorías y etiquetas usan el mismo sobre paginado sin `fecha`.

| Estado | Significado                                                                                                            |
| ------ | ---------------------------------------------------------------------------------------------------------------------- |
| 200    | Consulta pública válida; admite lista vacía                                                                            |
| 400    | UUID, fecha o paginación inválidos; parámetros ausentes/repetidos/desconocidos. `message` contiene `{campo,detalle}[]` |
| 404    | Sede inexistente o plato fuera de su carta pública                                                                     |
| 500    | Error de persistencia; mostramos error y reintento                                                                     |

Conservamos el filtro global: `statusCode`, `message`, `timestamp`, `path`. EC-25 no agrega rutas de escritura. Los permisos 401/403 de calendario y autenticación se mantienen con sus pruebas de regresión; EC-26/28 deberán proteger sus propias escrituras con JWT y ADMIN.

## Qué necesita Alex para consumirlo

1. Esperar la revisión/integración del PR antes de usar las rutas en la VPS; un PR verde no está desplegado. Para trabajo local, construir shared, generar Prisma y arrancar esta API con su configuración autorizada.
2. Obtener de Yeison el `Restaurant.id` real de cada entorno (consulta administrativa de lectura de `restaurantes`) y añadirlo a la configuración central del cliente. EC-25 no incorpora un endpoint de descubrimiento ni fija un UUID en componentes. La selección de URL/entorno de A00 la mantiene Alex.
3. Importar los tipos compartidos, enviar siempre la fecha en platos/detalle y renderizar `precio` como number/COP. Agrupar/concatenar por IDs; mostrar no disponibles atenuados.
4. Usar el calendario existente para elegir próximo día, y distinguir carga, vacío y error/reintento. No conectamos ni modificamos sus pantallas en este PR.

Yeison puede reutilizar los DTO públicos para contrastar EC-26, sin asumir que ya existen escrituras de menú, fotos o disponibilidad. Acuerda sus DTO de escritura en un archivo propio, conservando estos exports y CalendarModule. EC-28 se entrega después, sin alterar disponibilidad general ni otras fechas.

## PostgreSQL aislado y reproducción

Las pruebas con dobles están separadas de `test/menu.postgres.spec.ts`. Esta última se omite sin `ENCANTO_MENU_TEST_DATABASE_URL`. La validación previa a cualquier conexión acepta únicamente `127.0.0.1`, puerto explícito distinto de 5432, usuario `encanto_test`, base `encanto_ec25_test` y ningún parámetro de URL. No usamos `DATABASE_URL`/`DIRECT_URL` del proyecto como destino de pruebas.

Creamos un esquema aleatorio `ec25_<uuid>`, aplicamos las dos migraciones existentes con URLs locales explícitas y cargamos fixtures propios. Al terminar eliminamos exclusivamente ese esquema generado y desconectamos los clientes. No ejecutamos seed, migrate reset, db push ni limpieza de una base compartida. Probamos además el rechazo de URLs Supabase, bases/usuarios incorrectos y parámetros que alteren el destino.

Repetición validada en PowerShell, con Docker y Node 22. Para ejecutar también las integraciones de reservas usamos el mismo contenedor PostgreSQL aislado y ambas variables de prueba:

```powershell
$ErrorActionPreference = 'Stop'
$containerStarted = $false
try {
docker run --detach --rm --name encanto-sprint23-pg-test --publish 127.0.0.1:55432:5432 --env POSTGRES_USER=encanto_test --env POSTGRES_HOST_AUTH_METHOD=trust --env POSTGRES_DB=encanto_ec25_test postgres:16-alpine postgres -c "listen_addresses=*"
if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar PostgreSQL desechable' }
$containerStarted = $true
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  docker exec encanto-sprint23-pg-test pg_isready -U encanto_test -d encanto_ec25_test
  if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  Start-Sleep -Seconds 1
}
if (-not $ready) { throw 'PostgreSQL desechable no quedó listo' }
$testDbUrl = 'postgresql://encanto_test@127.0.0.1:55432/encanto_ec25_test'
$env:ENCANTO_MENU_TEST_DATABASE_URL = $testDbUrl
$env:RESERVATION_TEST_DATABASE_URL = $testDbUrl
Push-Location apps/api
try {
  npx vitest run --no-file-parallelism
  if ($LASTEXITCODE -ne 0) { throw 'Falló Vitest API' }
} finally { Pop-Location }
} finally {
  Remove-Item Env:ENCANTO_MENU_TEST_DATABASE_URL, Env:RESERVATION_TEST_DATABASE_URL -ErrorAction SilentlyContinue
  if ($containerStarted) { docker stop encanto-sprint23-pg-test | Out-Null }
}
```

Si el puerto 55432 está ocupado, no detenemos otro contenedor: elegimos un puerto TCP local libre distinto de 5432 y cambiamos tanto `--publish` como la URL. La imagen se fija en `postgres:16-alpine`; `listen_addresses=*` habilita conexiones desde el contenedor de pruebas. El helper valida host, usuario y base; cada suite crea y elimina solo su esquema aleatorio. No usamos `DATABASE_URL`/`DIRECT_URL` del proyecto, seed, reset ni `db push`. La ejecución registrada pasó **20 suites y 187 pruebas**. No demuestra aceptación Android ni una escritura real en Supabase Storage.

## Alcance, Jira y requisitos manuales

EC-25 quedó integrada y cerrada en Jira. En la rama actual está implementada la administración complementaria y el cliente móvil, pero EC-26/27/28/29 no se cierran hasta integrar a `dev`, probar Storage cuando esté configurado y completar la aceptación. El acuerdo de `precio` numérico es representación técnica del contrato, sin ampliar RF de carta ni cambiar negocio.

**Pendiente actualizar requisitos en Drive y Word local:** sección 8, reparto vigente EC-25/28/29 a Fabián, EC-22/23/24 a Alex y EC-26/27/30 a Yeison; sección 10, gestión de cambios y responsable de sincronización. No afirmamos que editar este Markdown actualice Drive o `docs/Requisitos_del_Sistema.docx`.
