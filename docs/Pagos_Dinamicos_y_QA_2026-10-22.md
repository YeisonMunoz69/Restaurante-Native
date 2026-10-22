# Pagos configurables y pruebas del 22 de octubre

Continuamos la entrega de Alex en `yeison/revisa-reservas-alex`, PR #15 hacia `dev`. No hicimos merge ni desplegamos en la VPS. Esta acta actualiza los pendientes de la primera revisión de hoy, sin borrar su evidencia histórica.

## Qué implementamos

El dueño/ADMIN edita WhatsApp con indicativo, medios/datos e instrucciones en Ajustes > Contacto y medios de pago. Son textos manuales: efectivo, Nequi, llave de transferencia u otros; no impusimos un catálogo. No almacenamos PIN ni contraseñas bancarias. Guardar no aprueba reservas ni procesa pagos.

Persistimos tres columnas mediante la migración aditiva `20261022160000_configuracion_pagos`. La API protege GET/PUT administrativos por rol, valida el contrato compartido, registra auditoría y rechaza una versión desactualizada con 409. El cliente conserva el borrador y exige recargar en un conflicto.

Solicitud enviada y detalle de reservas pendientes/confirmadas comparten `PaymentInstructions`: consultan datos vigentes al regresar y antes de abrir WhatsApp. Ante falta de red o configuración no recurren a números ni cuentas viejas. No inventamos datos oficiales.

Creamos diálogos y avisos propios con `Feedback`, `FeedbackHost` y `FeedbackMessage`: variantes visuales, cola, acciones destructivas diferenciadas, tema, insets, scroll, reducción de movimiento y cancelación con atrás. El cambio de cuenta descarta confirmaciones anteriores. Publicar pagos y operar reservas requiere confirmar antes de escribir. No afirmamos que esto complete toda la auditoría de accesibilidad ni todos los skeletons.

## Commits principales

| Commit | Entrega |
| --- | --- |
| `288209b` | Contrato, persistencia, roles, auditoría y pruebas de pagos. |
| `c967062` | Subpantalla del dueño con confirmación y conflictos. |
| `1310d56` | Consulta de datos vigentes antes de WhatsApp. |
| `ba83450` | Componentes personalizados de diálogo y aviso. |
| `0d41923` | Confirmación de operaciones administrativas de reservas. |
| `3ec5c41` | Harness móvil con runtime Docker y base aislada. |
| `db8c3ce` | Instrucciones compartidas en solicitud y detalle existente. |
| `e904522` | Preparación OAuth Google y huella Android comprobada. |
| `d80a609` | Smoke real y limpieza acotada de Storage. |

## Validación automática y Docker

- API: **202 pruebas en 23 archivos**, sin omisiones, con PostgreSQL aislado; siete nuevas pruebas HTTP/persistencia de pagos, incluidos permisos, auditoría y conflicto.
- Móvil: **77 pruebas en 21 suites**; TypeScript e i18n aprobados. Lint móvil: cero errores y 47 advertencias; lint API aprobado. Build shared/API aprobado.
- [CI 39810783433](https://github.com/YeisonMunoz69/Restaurante-Native/actions/runs/39810783433), cabeza `e904522`: verde, 202/77, siete migraciones y smoke Docker. Deploy omitido porque no integramos en `dev`. Los pushes posteriores requieren consultar sus propios checks.
- Runtime local: `node dist/main.js`, usuario `node`, cero montajes; imagen ejecutada coincide con la construida. Nest arrancó y `/api/v1/health` respondió `database: connected` desde host y contenedor. No usamos una API del host para simular esta comprobación.
- API temporal en `127.0.0.1:3039`; PostgreSQL temporal en `127.0.0.1:55439`, almacenamiento tmpfs y esquema exclusivo. No creamos un stack permanente por sprint ni escribimos pruebas en la BD de Supabase o en la VPS.

## Recorrido físico en S21

Usamos una sola app, `co.encantocampestre.app`, APK debug existente con el JS de esta rama. No validamos un APK release nuevo. Con usuarios ficticios y datos locales comprobamos:

1. Invitado: selección de fecha/grupo, desvío al login y retorno automático conservando selección.
2. Siete personas: pedido opcional visible, dos unidades de $32.000 y resumen $64.000; atrás conserva el pedido. Envío crea SOLICITADA, no CONFIRMADA.
3. Ocho personas: sin pedido el avance al resumen está deshabilitado; al añadir una unidad queda permitido. Solicitamos por $32.000.
4. Ticket: el botón produce el aviso propio de copia; no inspeccionamos independientemente los bytes del portapapeles.
5. Otra sesión administrativa aprueba por HTTP; al volver a abrir detalle el teléfono refleja CONFIRMADA.
6. Cancelación: atrás cierra la confirmación sin operar; confirmar cancela y mueve al historial. El límite 60/59 tiene prueba automatizada, no simulación física del reloj.
7. ADMIN edita texto de medios, confirma publicación y recibe éxito tras persistir. La solicitud y un detalle existente muestran el texto nuevo sin reinicio.
8. Carta: 100 platos sintéticos, cinco páginas de 20; recorrimos hasta el último plato de la página cinco (`Plato QA 009`, índice 99). Nombres no correlativos porque el orden de desempate usa UUID. La lectura local midió 4089 frames y 76 janky (1,86%), p95 11 ms; es una observación debug/USB sin fotos, no certificación RNF-01 en gama media/4G ni 60 fps constantes.

Durante esta última prueba ADB reinició y perdió `reverse`; restauramos los túneles, reintentamos y la carta cargó. No era una caída de la API Docker, cuyo health siguió conectado. Metro dejó de responder y mostró el aviso de Fast Refresh; lo reiniciamos y conservamos `adb reverse tcp:8081 tcp:8081`. No presentamos la sesión debug como una app autónoma de distribución.

Al terminar cerramos la sesión ficticia y restauramos dev HTTPS con el ID de sede anterior; la carta real volvió a cargar. Retiramos API/DB temporales, red QA, archivo privado de credenciales ficticias y etiquetas de imágenes QA. Conservamos solo `encanto-api:local` como imagen reutilizable, sin contenedores locales activos ni volúmenes nuevos. No borramos volúmenes de otros proyectos; la base tmpfs de prueba ya no se puede recuperar y no contenía datos reales. Hay una sola instalación del paquete de la app.

No enviamos WhatsApp real, comprobantes ni pagos: el contacto QA quedó vacío deliberadamente. Las aperturas/error de Linking se cubren con pruebas automatizadas. [Capturas y alcance](evidencias/pagos-docker-s21-2026-10-22/README.md).

## Supabase Storage real

Verificamos en el navegador `platos PUBLIC` y por SDK con la clave privada local. Añadimos URL y nombre del bucket a `apps/api/.env`; no tocamos las conexiones BD/JWT ni borramos el `.env` raíz. [Qué entorno usamos](Variables_de_Entorno.md).

Con autorización explícita subimos un WebP sintético de 32×32, 68 bytes, usando el adaptador real de la API. La URL pública respondió 200, `image/webp` y contenido SHA-256 coincidente. Después eliminamos exclusivamente `qa/2026-10-22/fc2568d4-3b48-46fb-ae3f-6126c95c1f8d.webp` y comprobamos su ausencia. No cambiamos platos ni tablas compartidas; no creamos políticas ni cambiamos permisos.

Esto prueba acceso, subida, URL y limpieza. Aún no prueba la galería Android completa (diez fotos, variantes, orden/principal y carreras con Storage real). Conservamos EC-27 En curso, Yeison, backlog; el bloqueo inicial de acceso ya no aplica, pero no marcamos Listo.

## Jira y aceptación

Actualizamos la descripción de EC-35 directamente en Jira con la decisión de pagos dinámicos, sus criterios y evidencia, conservando responsable/sprint/estado. Registramos el avance real de Storage en EC-27. EC-14/33/38 conservan su revisión por criterio; la prueba autenticada antes pendiente ya quedó realizada en el alcance anterior. No asumimos que un PR abierto es integración ni aceptamos automáticamente todos sus criterios.

EC-22 conserva aceptación de rendimiento representativa; EC-27, galería integral. Google/acceso global sigue para el siguiente sprint: [guía de preparación](Google_Login_Preparacion.md). Faltan IDs OAuth y firma de distribución; no inventamos credenciales. El dueño cargará los datos oficiales de pago después de revisar/integrar y preparar el entorno.

**Pendiente actualizar requisitos en Drive y Word local:** B-10/RF-RES07/RF-ADM07 (pagos configurables y consulta vigente), RNF-09/10 (componentes propios y validaciones aún pendientes), RF-ADM02 (acceso Storage recuperado y smoke aprobado, galería pendiente) y RF-MEN01/RNF-01 (paginación de 100 platos probada; rendimiento representativo pendiente). El Markdown no modifica esos documentos manuales.
