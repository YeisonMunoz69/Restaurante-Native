# Continuidad de Alex desde el repositorio original

El 26 de octubre Yeison encargó a Alex la continuidad porque Yeison y Fabián no estarán disponibles. Conservamos el trabajo y la autoría de los tres. Alex asume integración, operación y aceptación pendiente; no tiene que rehacer las funciones que ya existen.

## 1. Dónde estamos

| Corte | Estado comprobado el 26/10 |
| --- | --- |
| Repositorio del producto | `YeisonMunoz69/Restaurante-Native` |
| `dev` | `f28c21e`; último despliegue registrado exitoso [39004513769](https://github.com/YeisonMunoz69/Restaurante-Native/actions/runs/39004513769) |
| `main` | `f5788b4`; no integramos ni publicamos producción en esta continuidad |
| Progreso nuevo publicado | [PR #16](https://github.com/YeisonMunoz69/Restaurante-Native/pull/16), rama `yeison/redisena-pedido-y-calendario`. Incluye la entrega original de Alex `4d47186` y todos los commits de PR #15. Consultamos su cabeza/checks actuales antes de integrar. |
| API pública vigente | `https://encanto-campestre-dev.apolobyte.online/api/v1`, salud 200 con base conectada y 16 platos de catálogo anterior |
| Funciones de PR #16 | Mi Pedido, 44 productos originales sin fotos, calendario mensual/actividades, pagos editables y mínimo de tres ADMIN: código publicado y probado en QA, todavía no desplegado |
| Producción prevista | `encanto-campestre.apolobyte.online` sigue mostrando ApoloByteExample. No lo presentamos como producción del restaurante. |
| Otro dominio del equipo | `equipo-7-elev-d-dev.apolobyte.online` sirve la práctica; desde el 15/10 es una dirección histórica del restaurante |
| Breakit | El 26/10 su dominio vuelve a mostrar Breakit. El conflicto observado el 23/10 es evidencia histórica, no diagnóstico vigente. Falta documentar la configuración efectiva y la corrección. |

La revisión HTTPS no revela el commit de un contenedor ni sustituye una inspección SSH. Conservamos como última inspección completa la salida de VPS del 23/10: clon original limpio en `/root/projects/equipo-7`, `dev f28c21e`, API `elev-d-e-7-api` saludable en 8084; práctica en dos carpetas distintas, 8083/8087. Alex debe obtener una nueva salida antes de modificar el servidor.

Por calendario estamos en **Sprint 5, del 23/10 al 05/11**. En Jira comprobamos que Sprint 3, 4 y 5 todavía ofrecen «Iniciar sprint», sin fechas. Sprint 2 se cerró administrativamente el 16/10, con EC-22/27 pendientes en backlog. Funcionalmente recuperamos aceptación de Sprint 2 y reservas de Sprint 3; noticias/web de Sprint 4 y Google/notificaciones de Sprint 5 siguen pendientes. No desplazamos fechas, cerramos sprints ni sumamos puntos por código publicado.

## 2. Encargo inmediato y orden de trabajo

| Prioridad | Actividad | Resultado y condición de cierre |
| --- | --- | --- |
| 1 | [EC-74](https://yjmunoz.atlassian.net/browse/EC-74): VPS, práctica y entornos | Inventario actual, corrección coordinada de dominios/puertos y preparación de secrets del repositorio original, con evidencia y posibilidad de recuperar configuración previa. |
| 2 | Integrar la entrega acumulada | Revisar PR #16 como conjunto; #15 y #14 están contenidos. Preparar variables/migraciones antes del merge a `dev`; comprobar Actions y recorrido remoto. No integrar los tres como entregas independientes. |
| 3 | EC-14/33/35/38 de Alex y aceptación transversal de reservas | Continuar desde el código existente, corregir diferencias y demostrar inicio de sesión, pedido 1–7 opcional/desde 8 obligatorio, resumen, solicitud, pagos vigentes, historial/cancelación y operación ADMIN. Conservar criterios/autorías de EC-31/32/34 de Fabián. |
| 4 | [EC-22](https://yjmunoz.atlassian.net/browse/EC-22) | Alex asume la aceptación de carta. Importar 44 productos solo tras previsualización y validar fluidez representativa con al menos 100 platos en QA aislado. No equivale a cargar 100 platos de prueba en Supabase. |
| 4 | [EC-27](https://yjmunoz.atlassian.net/browse/EC-27) | Alex asume la galería integral y configuración privada de Storage. El smoke real del 22/10 ya pasó; todavía faltan diez fotos, variantes, orden/principal, eliminación y fallos/concurrencia desde Android. Sigue En curso. |
| 4 | [EC-73](https://yjmunoz.atlassian.net/browse/EC-73) | Alex revisa integración/aceptación de gestión ADMIN; mínimo tres activos y cuentas reales. No inventar cuentas para satisfacer el mínimo. Sigue En curso. |
| Después | [EC-75](https://yjmunoz.atlassian.net/browse/EC-75): Google API+móvil y Ajustes | Registrada Por hacer/backlog y asignada a Alex; depende de estabilizar EC-74/PR #16. Revisar `Google_Login_Preparacion.md`; completar token/cliente Web/Android y sesión antes de retirar el login actual. Reconciliar EC-58 sin marcarla implementada por sustitución. Notificaciones/web necesitan su propia aceptación y capacidad. |

Conservamos los estados Listo y los aportes ya entregados de Fabián. La indisponibilidad de dos integrantes reduce la capacidad; esta prioridad no promete completar por una persona todos los puntos originales de tres. Las estimaciones y criterios no se rebajan para aparentar avance.

## 3. Primero auditamos y aislamos la infraestructura

Alex se conecta desde su equipo con el acceso autorizado a `root@vmi3270738` / `86.48.28.68`. En esta sesión no pudimos autenticar por SSH automáticamente y no añadimos llaves ni leímos privadas para resolverlo. Tener acceso a GitHub no concede acceso al servidor. No ejecutar instrucciones de otro proyecto sin revisar su destino.

En la terminal Linux de la VPS recopilamos, sin mostrar entornos completos:

```bash
date -Is
hostname
docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
docker compose ls
git -C /root/projects/equipo-7 status --short --branch
git -C /root/projects/equipo-7 log -1 --format='%h %cI %s'
git -C /root/projects/equipo-7 remote get-url origin
nginx -T 2>&1 | awk '/^# configuration file/{f=$0} /^[[:space:]]*(server_name|listen|location|proxy_pass)[[:space:]]/{print f;print}'
ssh -G github-restaurante-dev | awk '$1 ~ /^(hostname|user|identityfile|identitiesonly|stricthostkeychecking)$/ {print}'
ssh-keygen -lf /root/.ssh/id_restaurante_repo.pub
ssh-keygen -lf /root/.ssh/id_restaurante_dev.pub
```

Respaldamos privadamente los archivos Nginx afectados y registramos enlaces `sites-enabled` antes de corregir. Confirmamos la reserva de puertos también en Nginx y proyectos detenidos: `docker ps` solo no la demuestra. No elegimos 8083/8087 como si siguieran libres. Revisamos los clones de la práctica `/root/projects/Apolo/ApoloByteExample-Git` y `ApoloByteExample-Prod`, sin usarlos como origen del restaurante.

Acordamos con administrador/docente el dominio de práctica y el destino previsto para producción del restaurante. Reutilizar un dominio público necesita coordinación. No borramos el segundo repositorio, volúmenes, llaves o aplicaciones de otros equipos. No arreglamos producción apuntándola a la API dev y llamándola independiente. Después comprobamos contenido y rutas de cada dominio, además de `nginx -t` y recarga.

## 4. Llaves y variables: dos conexiones diferentes

| Conexión | Credencial y ubicación esperada |
| --- | --- |
| Actions → VPS | Privada en `SSH_PRIVATE_KEY` del original; pública autorizada en la VPS. La guía identifica `id_restaurante_dev`; huella pública histórica `SHA256:9YmduDk3hPTqk3VtyI2hQ1O6QIFSDz12DEoP0Yjc0og`. El valor del secret no es legible: confirmamos correspondencia con prueba autorizada, no por nombre. |
| VPS → GitHub original | Alias `github-restaurante-dev`, privada `/root/.ssh/id_restaurante_repo`, deploy key de lectura del repositorio. Huella verificada `SHA256:mP1ieomUCNZfJmmp2MQg24ODjWdl/mevJlNagDNgUNQ`. |
| Práctica separada | Workflow usa `apolobyteexample_deploy` y sus propios secrets. No copiamos esos valores al original por parecido de nombres. |

La cantidad de archivos en `.ssh` no indica cuáles se usan. Solo mostramos configuración/huellas públicas. Conservamos verificación de host y no añadimos acceso persistente nuevo sin aprobación de quien administra la VPS. No publicamos llaves, tokens, JWT ni service_role en Git/chat/Jira.

La fuente local es `apps/api/.env`; en la VPS es `apps/api/.env.vps`. La raíz `.env` antigua no debe sobrescribirlas. Seguimos [Variables_de_Entorno.md](Variables_de_Entorno.md).

La consigna exige incluir el `.env` mediante secrets. En el original el workflow existente usa secrets SSH y **consume el `.env.vps` ya presente**, sin reconstruirlo desde un secret de entorno. Por eso Alex debe preparar un cambio acotado del workflow original, con un secret por entorno acordado, escritura temporal/atómica y permisos 600, validación de variables requeridas y copia privada recuperable. No trasladamos a ciegas el workflow del ejemplo.

Separamos configuración pública de credenciales. Host/puerto/usuario/rama pueden ser Variables; ponerlos en Secrets también funciona. DB/JWT/Storage privados van en Secrets/backend, nunca en APK. El puerto host histórico del original es 8084; dentro del contenedor API es 3000. `API_URL` del servidor no cambia el bundle Android. Google necesita IDs públicos coherentes y validación de audiencia en backend; no Client secret dentro del teléfono.

## 5. Integración del progreso publicado

1. Leemos `Reglas.md` y preservamos todos los commits. Clonamos/actualizamos el repositorio original y comprobamos remoto/árbol limpio. Para trabajo nuevo, Alex crea una rama propia desde `origin/dev`; si necesita aún PR #16 como base, declara esa dependencia y después sincroniza con el merge. No copia archivos del checkout viejo ni hace reset/force.
2. PR #16 contiene #15 y #14, incluida autoría de Alex. La revisión del 26/10 comprobó la relación por ancestros. Revisamos diff y checks de la cabeza final, sin cerrar los PR solapados hasta confirmar su integración efectiva.
3. Antes de activar el despliegue automático de `dev`, Alex verifica entorno privado, copia recuperable de BD/configuración, estado de las nueve migraciones aditivas y compatibilidad de la API. Las tres posteriores al dev actual añaden pagos, servicios de calendario y protección de administradores. No ejecutamos `migrate reset`, `db push` ni seed de usuarios contra Supabase.
4. Verificamos horarios y cuentas ADMIN reales. El fallback 10–18 no certifica horario aprobado. El importador de carta es separado y opt-in: previsualizamos; solo después aplicamos sobre la sede correcta, conservando ediciones e IDs. No importamos automáticamente en cada despliegue.
5. Tras integrar en `dev`, esperamos CI/CD y comprobamos SHA del clon, ID de imagen, `node dist/main.js`, cero montajes, salud de BD y rutas funcionales. El health no prueba por sí solo calendario, pagos, fotos o roles. Recorrimos esos módulos localmente; todavía requieren aceptación remota del despliegue nuevo.
6. Actualizamos PR/Jira con resultados, fallos y pendientes. Un PR verde no equivale a despliegue; un HTTP 200 de la portada no prueba el botón del backend. `main` queda fuera de esta autorización de integración.

## 6. Qué repetimos en PC y Samsung

Recompilamos e instalamos `localDebug` y `vpsDebug` ARM64 sobre las instalaciones existentes, sin borrar datos. La primera necesita Metro; la segunda contiene JavaScript y usa HTTPS dev sin Metro. `vpsDebug` es ensayo firmado como debug, no release de producción. El problema histórico CMake/Ninja de `vpsRelease` no se declaró resuelto.

Pasaron de nuevo 216 pruebas API con PostgreSQL aislado, 91 móviles, TypeScript, i18n y lint API. En Docker reutilizamos la imagen QA construida para el código API de esta entrega, ID `sha256:4f7e9fa762a09e07e33a54b1da9d8741040aa89650777ac323b1bc7b679500ca`, comando compilado y cero montajes; no afirmamos una reconstrucción Docker nueva. El guion `prepare-redesign-qa.ts` falló inicialmente por fechas fijas vencidas; corregimos solo el guion para elegir sábado futuro/lunes siguiente y pasó con 44 productos, servicios y 401/403/409/400/404 ADMIN.

El recorrido y capturas del día, los límites y el estado final del teléfono quedan en [la evidencia del S21](evidencias/continuidad-s21-2026-10-26/README.md). Las pruebas de escritura usan exclusivamente datos locales desechables. No creamos solicitudes, roles ni fotografías de QA en la VPS.

En el S21 repetimos físicamente Mi Pedido editable, calendario de actividades, Pesca/Motos sin mesas, login con retorno, solicitud del 02/11 para dos personas y total de $90.000, detalle y cancelación en historial. Dos consultas Prisma independientes confirmaron primero SOLICITADA y luego CANCELADA con sus líneas/total. Con ADMIN local abrimos gestión de administradores y configuración de pagos sin publicar datos reales. Al terminar dejamos la variante VPS recompilada consultando HTTPS sin Metro. Esta aceptación local no reemplaza el despliegue remoto ni los criterios completos de EC-22/27/73.

## 7. Prompt para continuar desde el equipo de Alex

> Continúo como Alex Santacruz en YeisonMunoz69/Restaurante-Native. Leo Reglas.md, docs/Continuidad_Alex_2026-10-26.md, docs/Variables_de_Entorno.md y docs/Encargos_Equipo.md. Yeison me encargó la continuidad mientras él y Fabián no estarán. Uso mi identidad humana de Reglas.md y commits alex/resultado-concreto; conservo sus autorías. Primero EC-74: audito la VPS con mi acceso autorizado y respaldo Nginx/configuración antes de corregir dominios/puertos de ApoloByteExample. El 26/10 Breakit ya vuelve a servir Breakit; compruebo el estado nuevo. No borro otros proyectos ni llaves. Distingo Actions→VPS de deploy key VPS→GitHub. Preparo .env desde secrets del repositorio original con archivos privados separados, sin mostrar credenciales. PR #16 incluye #15/#14: reviso migraciones, horarios, ADMIN reales, entorno y CI antes de integrar a dev; después verifico runtime, endpoints y Android. Tengo autorizado publicar mis ramas/PR y continuar la integración de dev preparada por el equipo; no main, force, reset ni fixtures en Supabase. Continúo EC-14/33/35/38 y la aceptación EC-22/27/73 sin duplicar código. Actualizo Jira con evidencia; Listo solo tras criterios completos. Mantengo las fechas históricas y priorizo según capacidad de una persona. Si un acceso depende del propietario, dejo el bloqueo preciso y avanzo en lo independiente; no solicito que peguen secretos al chat.

Pendiente actualizar requisitos en Drive y Word local: sección 8/responsables, RNF-14/entornos, RF-MEN01/RNF-01/carta, RF-ADM02/Storage y RF-ADM15/RN-15/administradores, además de RF-AUT01/02/03/05/08 y Ajustes/EC-75, pagos y calendario ya registrados. Editar este Markdown no modifica Drive ni el Word local.
