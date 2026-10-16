# Entrega EC-25: API pública de menú

**Responsable:** Fabián Hoyos · **Fecha:** 15 de octubre de 2026 · **Estado:** En curso, pendiente de revisión e integración.

**PR:** [#6, base dev](https://github.com/YeisonMunoz69/Restaurante-Native/pull/6) · **Rama:** `fabian/api-menu-publico`.

## Evidencia

Conservamos los avances del calendario y sincronizamos nuestra rama por merge desde origin/dev, sin rebase, reset ni conflictos. No había cambios sin commit ni commits personales sin publicar. Creamos esta rama para EC-25, sin duplicar menú existente. El contrato de precio numérico COP fue confirmado por Fabián antes de tocar los archivos comunes.

| Commit    | Entrega                                                              |
| --------- | -------------------------------------------------------------------- |
| `ba8f24f` | Contrato compartido, precio COP numérico y guía de consumo           |
| `fe87782` | API pública, disponibilidad por fecha y Swagger                      |
| `4cb8385` | Pruebas HTTP/dobles y persistencia/transacción en PostgreSQL aislado |

Usamos Node **22.23.3**. Autor y committer de nuestros commits: **Fabián Hoyos <fahoyos@unimayor.edu.co>**, mediante variables de proceso sin cambiar configuración de Git ni añadir trailers.

| Filtro                          | Resultado local                                                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                        | Pasó; no cambió lockfile. Reportó 61 vulnerabilidades existentes (9 moderadas, 51 altas, 1 crítica), sin actualizaciones generales. |
| Build shared                    | Pasó                                                                                                                                |
| Generación Prisma               | Pasó, con URLs ficticias locales de generación; sin conexión a Supabase                                                             |
| Lint API                        | Pasó sin advertencias                                                                                                               |
| Test API sin base               | 131 pasaron; 8 de integración omitidas explícitamente                                                                               |
| Test API con PostgreSQL aislado | 139 pasaron, incluidas 8 de integración con PostgreSQL 17.11 real                                                                   |
| Build API                       | Pasó                                                                                                                                |
| Test móvil                      | 9 pasaron en 4 suites; aviso --forceExit del script existente                                                                       |

Las pruebas reales usan un esquema aleatorio en el contenedor dedicado `encanto-ec25-pg-test`, publicado solo en loopback. Aplicamos las migraciones versionadas existentes y fixtures propios; no seed, reset ni db push. La protección de URL rechaza Supabase, puertos/bases/usuarios ajenos y parámetros de conexión antes de construir Prisma. Comprobamos persistencia al reconectar y una escritura concurrente real entre conteo y lectura de filas, sin mezclar fotografías dentro de una respuesta. La limpieza se limita a ese esquema generado.

Los tests con Prisma simulado son distintos de esas ocho integraciones. Ninguno demuestra aceptación Android de EC-28/29. No conectamos ni modificamos las pantallas de Alex, administración de Yeison, autenticación ni React Native bare. `adb devices` no mostró dispositivos durante la auditoría; no afirmamos haber ejecutado un recorrido Android. No cambiamos esquema, dependencias, Docker, workflow, secretos o `.env`.

## Criterios y pendientes

| Criterio EC-25                                    | Evidencia preparada en el PR                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| GET de categorías, platos, etiquetas y paginación | Cuatro rutas bajo `/api/v1/menu`, incluido detalle; pruebas HTTP y PostgreSQL                    |
| Fecha y disponibilidad resuelta                   | Fecha real obligatoria, precedencia true/false y retorno al valor general si no existe excepción |
| Swagger                                           | Query, parámetros, DTO, paginación y errores; prueba de especificación generada                  |
| Validaciones compartidas                          | `menu.schema.ts` exportado desde shared; reutilizamos la fecha del calendario                    |

El [contrato y los ejemplos para Alex/Yeison](API_Menu_EC25.md) precisan nombres de campos, precio numérico, orden por IDs, fuente del restaurante y reproducción de integración. Falta revisión, merge y verificación funcional posterior al despliegue. No marcamos Listo por publicar el PR.

EC-28 sigue pendiente de su administración y aceptación móvil; resolver su lectura en EC-25 no la cierra. EC-29 permanece En curso hasta panel Android y aceptación, reutilizando su backend integrado, IDs y confirmación 409. No empezamos EC-31/32/34 ni otras reservas.

## Comentario exacto para Yeison en Jira

No publicamos este comentario en Jira: Atlassian respondió que la conexión no está autorizada. Yeison puede copiar el bloque siguiente en la historia existente **EC-25**, sin crear otra ni marcarla Listo:

> EC-25 — Responsable Fabián Hoyos. Publicamos contrato y API pública en el PR https://github.com/YeisonMunoz69/Restaurante-Native/pull/6, base dev, rama fabian/api-menu-publico. Commits: ba8f24f (contrato), fe87782 (API), 4cb8385 (pruebas). Estado: En curso hasta revisión, merge y criterios completos.
>
> Criterios cubiertos en el PR: GET públicos de categorías/platos/detalle/etiquetas, listas paginadas con orden estable, fecha real obligatoria en platos/detalle, disponibilidad DishSchedule por fecha que prevalece sobre Dish.disponible (incluido false), categorías inactivas excluidas, precio COP numérico acordado con Fabián, Swagger y validaciones/tipos en shared. No añadimos escrituras, favoritos, búsqueda, caché ni reservas.
>
> Pruebas locales con Node 22.23.3: npm ci, build shared, generación Prisma, lint/test/build API y pruebas móviles correctos. API sin base: 131 pasaron y 8 integraciones omitidas explícitamente. Con PostgreSQL 17.11 aislado: 139 pasaron, incluidas 8 integraciones que comprueban persistencia al reconectar, dos fechas sin alterar valores generales y coherencia count/filas ante una escritura concurrente real. Móvil: 9 pruebas en 4 suites. Prisma simulado y PostgreSQL real se documentan por separado; no usamos Supabase compartido.
>
> Alex puede consumir el contrato de docs/API_Menu_EC25.md y los tipos de shared con el Restaurant.id real suministrado por entorno y fecha explícita; las rutas solo estarán en la VPS después de integrar y desplegar. Yeison mantiene EC-26/27/30; Alex EC-22/23/24. EC-28 sigue pendiente de administración y aceptación, y EC-29 sigue En curso por panel Android/aceptación; no las cerramos con este PR. Falta revisión/merge y comprobación funcional en dev.
>
> Registramos la representación numérica COP sin cambiar reglas de negocio. Pendiente actualizar requisitos en Drive y Word local: sección 8, reparto EC-25/28/29 a Fabián, EC-22/23/24 a Alex y EC-26/27/30 a Yeison; sección 10, gestión de cambios y responsable de sincronización. Markdown actualizado en docs/API_Menu_EC25.md, docs/Plan_de_Sprints.md, docs/Backlog_Jira.md y docs/Encargos_Equipo.md; no afirmamos que Drive/Word se hayan actualizado.

El aviso ya vigente de EC-29 se mantiene: **En curso; backend integrado, panel/aceptación pendientes**. Esta entrega no cambia ese estado ni requiere reasignar historias.
