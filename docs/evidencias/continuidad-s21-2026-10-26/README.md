# Continuidad en Samsung S21, repositorio y Jira

El 26/10/2026 repetimos las comprobaciones para dejar el trabajo a Alex. Usamos Samsung SM-G991B ARM64 conectado por USB y las variantes del repositorio original. La autorización de depuración se aceptó personalmente en el teléfono. No leímos tokens de la app ni usamos credenciales reales para QA.

## GitHub y VPS pública

`origin/dev` conserva `f28c21e` y `origin/main` `f5788b4`. PR #16 incluye los ancestros de #15 y del commit original de Alex `4d47186`; ya estaban publicados. Publicamos además `e76267b` para que el guion de QA elija sábado futuro y lunes siguiente, en vez de las fechas fijas vencidas del 24/26 de octubre. [CI 40403464816](https://github.com/YeisonMunoz69/Restaurante-Native/actions/runs/40403464816) pasó en esa cabeza. No integramos ni desplegamos esta rama.

Guardamos [las comprobaciones HTTPS del día](comprobaciones-https.json):

- Salud de API dev 200, `database: connected`; menú de la sede real 200 con 16 platos y primer plato Sancocho de gallina criolla a la leña.
- Calendario mensual `/calendario/rango`, `/reservas/datos-pago` y `/admin/administradores` dan 404 en la API pública. Son funciones posteriores publicadas en PR #16, no funcionalidades remotas verificadas.
- El dominio previsto para producción y el dominio histórico del equipo sirven ApoloByteExample. Breakit vuelve a servir su propia aplicación; no afirmamos que siga el conflicto de publicación cruzada del 23/10.

La última inspección SSH completa disponible es la que Yeison compartió el 23/10; confirma clon original limpio y contenedor en 8084. Solicitamos una comprobación nueva de SHA/runtime para distinguir el estado público del interior actual del servidor; si no llega, queda en EC-74. No deducimos el SHA del contenedor a partir del health.

## Pruebas y runtime local

| Comprobación ejecutada | Resultado |
| --- | --- |
| Jest móvil, `--runInBand` | 28 suites, 91 pruebas aprobadas |
| Vitest API con las dos variables apuntando a PostgreSQL local dedicado | 27 archivos, 216 pruebas aprobadas, sin omisiones |
| TypeScript móvil, check:i18n, lint API | Aprobados; el chequeo estático no sustituye aceptación visual completa |
| `assembleLocalDebug` + `assembleVpsDebug`, ARM64 | BUILD SUCCESSFUL; 223 tareas, dos APK instalados con `adb install -r`, sin borrar datos |
| Docker QA | Imagen existente `sha256:4f7e9fa762a09e07e33a54b1da9d8741040aa89650777ac323b1bc7b679500ca`, comando `node dist/main.js`, cero montajes; no reconstrucción de imagen nueva |
| Preparación/rediseño HTTP | 44 productos sin fotos; sábado futuro Pesca/Motos sin mesas, lunes Restaurante para dos; permisos ADMIN 401/403, lista 200, mínimo tres 409, correo inválido 400 y cuenta inexistente 404 |
| Fechas del guion corregido | 31/10 Pesca/Motos y 02/11 Restaurante; no se cambia el reloj de la API ni sus restricciones |

El helper crea un esquema único en PostgreSQL desechable y un archivo de estado privado externo al repositorio. No ejecutamos seed/reset/db push sobre Supabase ni escribimos en la VPS. La primera prueba HTTP falló correctamente al consultar una fecha pasada; la corrección está limitada al guion de QA, sin relajar reglas de reservas.

Los APK de ensayo no son release ni se suben a Git:

- `app-local-debug.apk`: SHA-256 `2E70283D9D3E08673767BA71B2A82E4CD7D8C7648BE295D5F90F3D34EB2C5696`.
- `app-vps-debug.apk`: SHA-256 `778AC7390469CE3F95F94E0BAAACDCE0DD2CB930599AA98528DFED1CB4E266F5`.

El intento histórico `vpsRelease` con CMake/Ninja no se repitió ni se declara resuelto. Local necesita Metro; VPS incluye bundle. La primera carga fría de Metro tarda varios minutos en este computador; no la usamos como medida de rendimiento del catálogo ni como fallo de la API.

## Samsung y límites

| Evidencia | Alcance |
| --- | --- |
| [01-detalle-vps.png](01-detalle-vps.png) | Detalle HTTPS del catálogo vigente: nombre, precio $38.000, descripción, disponibilidad y fotografía de ejemplo. Capturada con la instalación existente antes de reinstalar las variantes recompiladas. No es una carga nueva de Storage. |
| [02-ajustes-vps.png](02-ajustes-vps.png) | Conexión de la sede real y login sin sesión. Google todavía no está implementado. |
| [03-carta-local-original.png](03-carta-local-original.png) | Variante local recompilada: carta original desde Docker, 44 productos sin fotos confirmados también por HTTP. |
| [04-mi-pedido-local.png](04-mi-pedido-local.png) | Tilapia Ahumada añadida a Mi Pedido; aumentamos a dos y conservamos cantidades al pasar al formulario y cambiar fecha. |
| [05-pesca-sin-mesas-local.png](05-pesca-sin-mesas-local.png) | Sábado 31/10 con Pesca/Motos, nota y consulta de horarios deshabilitada. Elegimos después noviembre y lunes 02/11, con Restaurante. Las fechas del mes adyacente se ven, pero requieren navegar a ese mes para seleccionarlas. |
| [06-resumen-local.png](06-resumen-local.png) | Retorno tras login local conservando lunes 02/11, dos personas, franja 14:00–15:30 y dos tilapias; añadimos una Costilla Ahumada y comprobamos total de $90.000. |
| [07-solicitud-local.png](07-solicitud-local.png) | Solicitud enviada, código `EC-20261102-23418BBB`, pendiente de revisión y aviso de datos de pago incompletos; no se inventan instrucciones. |
| [08-historial-cancelada-local.png](08-historial-cancelada-local.png) | Cancelamos esa SOLICITADA desde confirmación propia; desaparece de Próximas y aparece Cancelada en Historial sin perder líneas ni total. |
| [09-admins-local.png](09-admins-local.png) | ADMIN ficticio local abre panel: tres activos, mínimo tres y retiro bloqueado. No modificamos permisos reales. |
| [10-pagos-local.png](10-pagos-local.png) | Panel de contacto/pagos abre con ADMIN; dejamos campos vacíos y no publicamos datos. La escritura y sus versiones siguen cubiertas por pruebas/API y evidencia del 22/10, no por esta lectura física. |
| [11-vps-sin-metro.png](11-vps-sin-metro.png) | Variante VPS recompilada y reiniciada tras quitar todos nuestros adb reverse: vuelve al catálogo HTTPS de 16 platos. No es importación de la carta original ni despliegue de PR #16. |

Contrastamos el envío mediante otro cliente Prisma contra la base local: [resultado SOLICITADA](reserva-local-enviada.json), dos personas, dos Tilapias Ahumadas a $30.000 y una Costilla Ahumada a $30.000, total $90.000. Después de cancelar verificamos [resultado CANCELADA](reserva-local-cancelada.json). No confirmamos ni pagamos una reserva; no enviamos mensajes WhatsApp.

Cerramos la sesión ficticia local, detuvimos esa app y Metro, retiramos los reverse 8081/8091/3039 y dejamos EncantoApp frente a la VPS sin sesión QA. El helper de Docker terminó correctamente después de detener su API y ejecutar su limpieza de esquema. La base temporal dedicada se retira al cerrar la comprobación; las imágenes locales previas se conservan para poder repetirla.

No certificamos toda la galería EC-27, rendimiento con cien platos/fotos/4G, release, noticias conectadas, web SSR ni Google. Noticias conserva contenido de ejemplo y la web sigue pendiente; cinco pestañas visibles no equivalen a cinco módulos entregados.

## Cambios comprobados en Jira

| Actividad | Cambio y evidencia |
| --- | --- |
| EC-22 | Reasignada a Alex, En curso/backlog, comentario con criterio de cien y carta original. [Captura](jira-ec22-alex.png). |
| EC-27 | Reasignada a Alex, En curso/backlog. Smoke Storage ya aprobado, galería integral pendiente. [Captura](jira-ec27-alex.png). |
| EC-73 | Reasignada a Alex, En curso/backlog. Conservamos implementación de Yeison y mínimo tres ADMIN reales. [Captura](jira-ec73-alex.png). |
| EC-14 | Conserva Alex/En curso; comentario con i18n/TypeScript y aceptación visual pendiente. [Captura](jira-ec14-continuidad.png). |
| EC-33 | Conserva Alex y pasa Por hacer → En curso por implementación publicada, sin Listo. [Captura](jira-ec33-continuidad.png). |
| EC-35 | Conserva Alex y pasa Por hacer → En curso; datos oficiales/pagos y WhatsApp pendientes de aceptación. [Captura](jira-ec35-continuidad.png). |
| EC-38 | Conserva Alex y pasa Por hacer → En curso; aceptación remota y cancelación 60/59 pendientes. [Captura](jira-ec38-continuidad.png). |
| EC-74 | Nueva Tarea Por hacer, Alex/backlog, infraestructura, práctica, variables y preparación de integración original. [Captura](jira-ec74-infraestructura.png). |
| EC-75 | Nueva Tarea Por hacer, Alex/backlog, Google API+móvil y Ajustes después de estabilizar dev; reconciliar EC-58. [Captura](jira-ec75-google.png). |

Los comentarios incluyen el recordatorio de actualizar requisitos manuales. No reabrimos Sprint 2, iniciamos sprints, cambiamos estimaciones ni declaramos Listo por estas comprobaciones. Conservamos la autoría y las actividades ya terminadas de Fabián.

El procedimiento y prompt de Alex quedan en [Continuidad_Alex_2026-10-26.md](../../Continuidad_Alex_2026-10-26.md). Pendiente actualizar requisitos en Drive y Word local: sección 8/responsables, RNF-14, RF-MEN01/RNF-01, RF-ADM02, RF-ADM15/RN-15 y RF-AUT01/02/03/05/08/Ajustes, más pendientes previos de pagos/calendario. Ninguna edición Markdown sincroniza esas copias.
