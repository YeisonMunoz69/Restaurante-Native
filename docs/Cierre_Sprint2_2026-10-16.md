# Cierre de recuperación de Sprint 2

**Fecha de revisión:** 16 de octubre de 2026, America/Bogota. **Responsable:** Yeison Muñoz. Conservamos el plan original del 11 al 24 de septiembre para hacer visible el atraso; no fechamos retrospectivamente la aceptación.

## Integración revisada

Integramos la [PR #11](https://github.com/YeisonMunoz69/Restaurante-Native/pull/11) exclusivamente en `dev`, merge `024514671cb9a0cb23bec74a1b6a0cec90a6cd87`. La cabeza `9d7b343` de la PR #10 es ancestro de la rama completa: GitHub registró automáticamente #10 como integrada, sin segundo merge ni duplicación. Conservamos la autoría de los aportes anteriores. `main` se mantiene en `f5788b4b4c48b61ce7d807676cd38a97ab67beb5`.

La revisión encontró y corrigió dos fallos antes del merge:

- `40b8a6f`: abrimos el formulario de un plato nuevo aunque la carta ya contenga platos. La regresión crea un segundo plato mediante el servicio administrativo.
- `dcdfa40`: mostramos el horario real del calendario y, al consultar una fecha cerrada, ofrecemos la próxima apertura desde esa fecha. La regresión verifica la consulta, el salto y el horario nuevo; [el S21 muestra 10:00–18:00](evidencias/carta-dev-s21-2026-10-16/07-horario-real.png).

La rama incluye también reservas EC-31–40 y sus migraciones. Esta integración técnica no cierra Sprint 3 ni modifica por sí sola sus responsables o aceptación.

## Pruebas y despliegue

La [ejecución de PR 39003039530](https://github.com/YeisonMunoz69/Restaurante-Native/actions/runs/39003039530) pasó sobre `dcdfa40`: 195 pruebas API en 22 suites, sin omisiones, y 49 pruebas móviles en 16 suites. Las dos regresiones de esta revisión elevan las 47 móviles previas a 49. Pasaron TypeScript móvil, lint dirigido sin errores, lint/build API, shared y sintaxis del despliegue.

El CI aplicó las seis migraciones en PostgreSQL efímero y comprobó el runtime Docker: health HTTP, imagen construida igual a la ejecutada, `node dist/main.js` y cero montajes. La prueba administrativa HTTP previa usó otra base desechable y verificó creación de categorías y platos, precio COP numérico, disponibilidad inmediata y baja lógica. Las integraciones PostgreSQL comprueban también edición y persistencia. No contamos mocks como persistencia ni esa base local como prueba del entorno compartido.

**Despliegue de integración verificado:** la [ejecución 39003167145](https://github.com/YeisonMunoz69/Restaurante-Native/actions/runs/39003167145) pasó `Build and test` y `Deploy dev to VPS` sobre `0245146`. Aplicó las cuatro migraciones nuevas, encontró seis versionadas y dejó `elev-d-e-7-api` healthy en `127.0.0.1:8084`, con la imagen construida, comando `node dist/main.js` y cero montajes. Conservamos [el extracto de comprobación](evidencias/cierre-sprint2-2026-10-16/despliegue-runtime.txt), sin variables privadas.

Las [11 comprobaciones HTTPS posteriores](evidencias/cierre-sprint2-2026-10-16/verificacion-vps.json) pasaron: health/base 200, seis categorías, cinco etiquetas, 16 platos, detalle del sancocho con 38.000 COP numéricos, lunes 19 cerrado y próxima apertura el sábado 24 de 10:00 a 18:00. Las rutas nuevas `/admin/menu/categorias`, `/admin/reservas/solicitudes` y `/reservas/mias` devuelven 401 sin sesión; antes del despliegue devolvían 404. Una sede ficticia devuelve 404. Son lecturas públicas y controles anónimos; no equivalen a escrituras administrativas remotas ni prueban Storage. Las únicas escrituras sobre la base compartida fueron las migraciones versionadas del despliegue autorizado.

El recorrido físico previo de carta real, fecha, detalle, precio, galería, alérgenos y día cerrado está en [la evidencia S21](evidencias/carta-dev-s21-2026-10-16/README.md). Conservamos también [la evidencia física de calendario/disponibilidad](evidencias/atencion-celular-2026-10-16/README.md). El APK probado es `debug` con Metro; el artefacto `release` no quedó validado por el fallo Ninja/CMake de Windows ya documentado.

## Criterios y arrastres

| Jira | Estado final | Resultado que sustentamos | Responsable del cierre |
| --- | --- | --- | --- |
| EC-22 | En curso · backlog | Carta real implementada y recorrida con 16 platos; falta demostrar fluidez física con al menos 100. Conservamos el criterio completo. | Yeison |
| EC-23 | Listo | Próximo día, horario real, cambio de fecha, aviso de cerrado y acción hacia la próxima apertura. | Yeison |
| EC-24 | Listo | Detalle desde Carta, galería de hasta diez, indicador, descripción, alérgenos, etiquetas y regreso a Carta. Apertura externa en EC-47/48 de Sprint 4. | Yeison |
| EC-25 | Listo | API pública ya integrada por PR #6, conserva la autoría de Fabián. | Fabián |
| EC-26 | Listo | Administración y disponibilidad general con baja lógica; corregimos la creación del segundo plato. | Yeison |
| EC-27 | En curso · backlog | Implementación y pruebas locales; Storage real aplazado por falta de acceso completo. Nunca Listo en este cierre. | Yeison |
| EC-28 | Listo | Precedencia por fecha, copia efectiva confirmada y carta conectada; pruebas PostgreSQL y recorrido físico del panel. | Yeison |
| EC-29 | Listo | Reglas, excepciones, solo por reserva y advertencia de reservas afectadas; evidencia física y de persistencia. | Yeison |
| EC-30 | Listo | Disponibilidad true/false por fecha y sin excepción, consulta de fecha elegida y PostgreSQL aislado en CI. | Yeison |

Registramos en Jira la reasignación de EC-22/23/24/28/29 a Yeison; EC-26/27/30 ya estaban asignadas a él. No atribuimos los commits anteriores a otras personas.

EC-27 ya está en el backlog del tablero 167, En curso. Para retomarla hace falta configurar privadamente las tres variables de Supabase Storage y validar carga Android real, compresión/variantes, límite, orden/principal, eliminación y limpieza tras fallo/concurrencia. Las URLs de fotos de ejemplo no demuestran esa integración. No publicamos claves ni quitamos RF-ADM02.

EC-22 conserva sus ocho puntos y la prueba física de 100 platos como pendiente de aceptación. No la sustituimos por una prueba Jest, por usar SectionList ni por observar solo 16 platos. No cargamos fixtures masivos en Supabase compartido.

En EC-24 aclaramos la dependencia duplicada de apertura en frío: EC-48 ya exige apertura con la app cerrada y retroceso a la pestaña correspondiente; se verificará con EC-47 (App Links) en Sprint 4. No damos esos enlaces por implementados, no retiramos RF-INF05 ni añadimos puntos. La aclaración está en la descripción de EC-24 y comentario `10048` de EC-48.

## Registro administrativo

EC Sprint 2 (287) figuraba como futuro al comenzar la revisión. Lo activamos para regularizar el registro a las 23:42:45 de Bogotá y lo cerramos a las 23:43:20 del 16 de octubre, después de comprobar la VPS y que las siete historias retenidas estaban Listo. El estado devuelto y consultado de nuevo fue `closed`. La fecha de fin prevista que requiere la activación no sustituye la fecha real de cierre. Este registro administrativo no reconstruye la duración real del trabajo de septiembre/octubre.

El balance es **42 de los 58 puntos originales**; 16 conservan seguimiento en EC-22 y EC-27. No lo presentamos como 58 puntos terminados ni como una medición histórica de velocidad. Guardamos [el corte de Jira](evidencias/cierre-sprint2-2026-10-16/jira-cierre.json) y [el comentario de cierre en EC-26](https://yjmunoz.atlassian.net/browse/EC-26?focusedCommentId=10063). Los comentarios `10051`–`10056` contienen criterios por historia; `10057`–`10062`, el contraste posterior a despliegue; EC-22 conserva su pendiente en `10049` y EC-27 en `10050` y su descripción.

La aceptación técnica de este cierre no representa una aprobación del cliente o docente que no conste en la evidencia. Las validaciones externas y los pendientes generales del proyecto conservan su seguimiento.

**Pendiente actualizar requisitos en Drive y Word local:** RF-ADM02/plan de entrega, Storage real aplazado; RF-MEN01/RNF-01, aceptación física con 100 platos pendiente; RF-MEN03/RF-INF05, apertura externa en EC-47/48; sección 8, Yeison asume las actividades restantes. Los recordatorios anteriores de reglas de reservas, Google y sección 10 siguen vigentes hasta confirmación manual de ambos documentos.
