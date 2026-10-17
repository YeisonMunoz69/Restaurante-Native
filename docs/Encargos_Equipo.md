# Encargos e integración del equipo

El reparto de Jira se conserva. **Corte del 16 de octubre:** la rama `yeison/ajusta-encabezados-y-auth-plan`, basada en `dev` (`47a1e0e`), contiene implementación para EC-22–40. La hicieron Yeison y sus agentes de trabajo con autorización del equipo; los commits no se atribuyen a Alex ni a Fabián. Pasa 187 pruebas API, 46 móviles, build compartido/API/Android y prueba de migraciones/health dentro de Docker. En el S21 se renderizaron las pantallas y se revisaron encabezados; falta el recorrido conectado con datos/roles de QA. Falta comparar avances personales, integrar por PR y Jira, y configurar Storage para probar carga de fotos. No se hizo push, merge a `dev` ni cambio de estado en Jira en esta ejecución.

## Primero recuperamos los avances que ya existen

Cada uno revisa su rama y cambios sin descartarlos. Si ya implementó una entrega, no la rehace: identifica archivos, commits, clave de Jira y criterios cubiertos; publica su rama y abre PR con base `dev`. Un avance local o PR abierto queda En curso. Solo marcamos Listo tras integrar y demostrar todos los criterios vigentes, incluyendo interfaz cuando la historia la exige. Si falta acceso a Jira, entregamos el comentario y la evidencia a Yeison; no afirmamos haber actualizado una actividad sin hacerlo.

Desde un árbol limpio, en la rama personal que contiene el trabajo:

```powershell
git status --short --branch
git fetch origin
git merge origin/dev
```

Si tenemos cambios sin commit, los guardamos primero en nuestra rama con archivos explícitos; no usamos reset, force ni una limpieza para poder integrar. Resolvemos conflictos conservando ambas funcionalidades y repetimos pruebas. No hacemos rebase de ramas compartidas ni cambiamos la identidad de Git. Para trabajo nuevo creamos `alex/funcionalidad` o `fabian/funcionalidad` desde `origin/dev`.

## Alex: revisar EC-22/23/24 y continuar sin duplicar

Ya están implementadas en esta rama EC-22/23/24 y EC-33/35/38. Alex debe comparar con sus avances, revisar comportamiento/criterios en Android y publicar cualquier cambio propio por PR a `dev`; si coincide, no reescribe código: ayuda a validar y actualiza Jira con la evidencia una vez que se integre y acepte. La rama del equipo mantiene los contratos de carta y reserva documentados en [Tareas_Alex.md](Tareas_Alex.md) y [Reservas_EC31_EC40.md](Reservas_EC31_EC40.md).

El reparto original sigue registrado para Jira, pero el código correspondiente ya está preparado en la rama indicada. Conservamos EC-14 como pendiente de cimientos de Alex, fuera del alcance implementado aquí. No migramos a Expo ni reemplazamos Keychain. Cada responsable verifica sus criterios y sus avances antes de decidir si la historia puede cerrarse.

## Reparto equilibrado y orden de ejecución

Por petición de Yeison redistribuimos los pendientes, sin cambiar criterios, puntos ni fechas de los sprints. Tres historias no equivalen a esfuerzo idéntico; conservamos los estimados para revisar la carga. No significa terminar tres pantallas antes de que otra persona pueda comenzar su API: las dependencias mandan y trabajamos en paralelo donde sea posible.

| Sprint | Alex                                                                                                                   | Fabián                                                                                | Yeison                                                                                                                        |
| ------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 2      | EC-22 carta, EC-23 inicio/próximo día, EC-24 detalle/galería (18 puntos)                                               | EC-25 API menú, EC-28 disponibilidad por fecha, EC-29 calendario completo (21 puntos) | EC-26 administración de categorías/platos, EC-27 carga de fotos, EC-30 pruebas de disponibilidad (19 puntos)                  |
| 3      | EC-33 formulario de reserva, EC-35 solicitud enviada/pago/WhatsApp, EC-38 mis reservas/detalle/cancelación (21 puntos) | EC-31 franjas, EC-32 aforo transaccional, EC-34 total/ticket (18 puntos)              | EC-37 estados, EC-36 aprobación/rechazo, EC-39 agenda/llegada (18 puntos), después EC-40 validación de integración (5 puntos) |

El Sprint 3 tiene diez historias: la décima es de pruebas y la coordina Yeison con apoyo de ambos, no creamos ni eliminamos tareas para forzar un múltiplo de tres. Sprint 1 ya entregado y repartos de sprints 4–6 se conservan; esta recuperación se centra en los dos sprints que estaban concentrados en Alex.

1. Fabián compara su rama de EC-25/28/29 con `dev` y el código actual; conserva su trabajo ya integrado y reporta diferencias, no copia archivos sobre la rama sin revisar.
2. Alex revisa EC-22/23/24 y sus EC-33/35/38; Fabián revisa EC-31/32/34; Yeison revisa EC-26/27/30 y EC-36/37/39/40. Cada uno valida sus criterios y publica defectos o mejoras como commits propios con su clave Jira.
3. Seguimos los acuerdos en [Decisiones_Pendientes_y_Riesgos.md](Decisiones_Pendientes_y_Riesgos.md). EC-40 verifica límites, concurrencia y recorrido. Jira solo pasa a Listo después del merge a `dev`, CI/CD, aceptación física y criterios completos.

El panel A05 pasa a Fabián con EC-29; A03/A06 pasan a Yeison con EC-26/EC-27. Las fichas A00–A09 de Tareas_Alex.md se conservan como especificación compartida, no como lista completa a cargo de Alex. Antes de empezar comprobamos avances existentes y coordinamos cualquier archivo común. Si el avance está hecho, lo publicamos con pruebas en lugar de repetirlo.

### Pendiente de sincronizar en Jira · decisiones del 16 de octubre

Al corte del 16 de octubre no se modificaron las actividades de Jira. Por eso los criterios locales deben registrarse en las tareas correspondientes; no inferimos que una actividad está terminada ni cambiamos su estado por tener código en esta rama:

- **EC-31 (Fabián), franjas:** 90 minutos hasta 4 personas y 120 desde 5; máximo de 3 meses calendario; mínimo de 60 minutos hasta el inicio, sin corte a las 13:00. Incluir pruebas del límite de fechas y de 59/60 minutos.
- **EC-36 (Yeison), aprobación/rechazo:** el rechazo requiere motivo y es terminal; para volver a intentar, el comensal crea otra solicitud.
- **EC-37 (Yeison), estados:** `RECHAZADA` no tiene transiciones de salida; `SOLICITADA` puede vencer a las 12 horas si no se registra la confirmación del dueño.
- **EC-38 (Alex), cancelación:** una `SOLICITADA` se puede retirar; una `CONFIRMADA` se cancela si faltan 60 minutos o más. Exactamente 60 permite cancelar; a los 59 no.
- **Actividad de Sprint 5 para RF-RES13:** expiración a las 12 horas desde la creación si no está confirmada. Como el comprobante llega por WhatsApp, la aplicación solo puede considerar la revisión que registre el dueño.
- **H-5/H-6:** la adición de platos confirmados queda en la app (RF-RES15); las noticias generan push solo a quienes consintieron (RF-NOT05). Son reglas ya escritas, no tareas nuevas.

En los comentarios de Jira recordamos: **«Pendiente actualizar requisitos en Drive y Word local: RN-01, RN-04, RN-05, RF-RES09, RF-RES12 y RF-RES13; G-9, G-10 y G-14»**. Las descripciones locales están en `docs/Requisitos_del_Sistema.md`, `docs/Decisiones_Pendientes_y_Riesgos.md` y `docs/Backlog_Jira.md`; no retiramos el recordatorio hasta actualizar y confirmar también el `.docx` y Drive.

**Integración previa:** EC-25 ya está Listo (PR #6, merge `f8271b9`), EC-28 API está integrada por PR #7 (`19c5d93`) y los paneles EC-28/29 por PR #8 (`b1e0cf1`). Fabián aprobó copia efectiva con previsualización/confirmación y acceso ADMIN «Atención y disponibilidad». El selector de entorno/sede se conserva centralizado. El desarrollo actual añade el cliente de carta y disponibilidad, administración/fotos y reservas; aún falta integrarlo y aceptar su flujo nuevo.

Validamos en Android carga, éxito, vacío, error/reintento, cambio de fecha y permisos. Probamos sesión tras reabrir, detalle/retroceso y persistencia de cambios administrativos. A05 consume el contrato existente y muestra el 409 de reservas afectadas antes de confirmar. Una respuesta HTTP o test Jest no demuestra por sí sola ese recorrido.

### Prompt para Alex

> Lee Reglas.md, docs/Encargos_Equipo.md y las fichas que correspondan en docs/Tareas_Alex.md. El reparto anterior de todo a Alex queda sustituido: lleva EC-22, EC-23 y EC-24 en ese orden; luego EC-33, EC-35 y EC-38 cuando existan contratos de reservas. Conserva EC-14 de cimientos. Audita mis avances: si algo ya está implementado, valida y publícalo sin rehacerlo. La API EC-25 y calendario/EC-28 los lleva Fabián; administración/fotos/pruebas las lleva Yeison. No programes esos módulos en paralelo sin acuerdo. Autorizo push de mi rama alex/funcionalidad y PR a dev, no merge directo, force, secretos, Expo ni pruebas de escritura en Supabase compartido. Usa identidad humana de Reglas.md sin cambiar Git ni añadir trailers. Actualiza origin/dev preservando trabajo; acuerda contratos antes de conectar pantallas. Aplica `co.encantocampestre.app` y el desplazamiento compartido de formularios junto al teclado. En reservas, sigue los acuerdos vigentes de `docs/Tareas_Alex.md`: duración 90/120 min, máximo tres meses calendario, mínimo una hora sin corte fijo, cancelación confirmada con al menos 60 min, rechazo terminal y vencimiento a las 12 h. Ejecuta filtros y demuestra Android, estados de red y permisos. Actualiza Jira con PR/commit y evidencia: En curso mientras falte algo, Listo solo tras merge y criterios completos. Si no tienes acceso a Jira/VPS, deja el pendiente preciso a Yeison. Todo ajuste de alcance se registra en Jira/Markdown con recordatorio manual de Drive/Word.

## Fabián: consolidar calendario y apoyar aceptación

**Acuerdo del 16 de octubre:** el panel está integrado por PR #8 y Fabián ya dejó evidencia Android previa en [Panel_Atencion_Movil.md](Panel_Atencion_Movil.md). En esta rama también están implementadas EC-31/32/34. Fabián compara su trabajo, confirma requisitos y corrige solo diferencias; no vuelve a escribir la API que ya está en `dev`.

No rehacemos el backend publicado. Comparamos los PR ya integrados y el nuevo código local; revisamos el contrato de [Calendario_Atencion.md](Calendario_Atencion.md), reglas, excepciones, IDs conservados y 409. Fabián conserva la responsabilidad asignada para EC-31/32/34 y la aceptación de EC-28/29. Jira sigue En curso hasta completar esa revisión e integración.

La rama actual ya verificó persistencia e integridad con PostgreSQL desechable: el conjunto API pasó 187 pruebas en 20 suites, incluidas las integraciones de calendario, disponibilidad y reservas. Nunca usamos escrituras de Supabase compartido. Fabián puede comparar sus ramas, revisar las evidencias y corregir diferencias con un PR acotado; no repite código que ya está integrado o preparado en esta rama. No añadimos multisede ni cambiamos el modelo de reservas sin acuerdo.

### Prompt para Fabián

> Lee Reglas.md, docs/Encargos_Equipo.md, docs/Calendario_Atencion.md y docs/Reservas_EC31_EC40.md. EC-25 (PR #6), el backend calendario (PR #2) y el panel (PR #8) ya están integrados en `dev`: no los rehagas. Tu responsabilidad de Jira sigue siendo EC-25/28/29 y EC-31/32/34; la rama de Yeison ya contiene implementación para EC-31/32/34. Compara primero tus ramas con `dev` y con el trabajo de esa rama; conserva tus aportes previos y publica únicamente defectos o diferencias propias por commits `fabian/...` y PR a `dev`. Revisa que las franjas apliquen 90 min hasta cuatro personas o 120 desde cinco, máximo tres meses calendario y mínimo una hora sin corte fijo; verifica también aforo Serializable, precio congelado y ticket. Usa PostgreSQL desechable, nunca seed/reset/db push ni escrituras de Supabase compartido. El PR #8 tiene evidencia Android previa, pero EC-28/29 siguen En curso hasta aceptación completa. No marques tareas Listo por esta implementación ni te atribuyas commits ajenos; actualiza Jira con PR y evidencia después de revisión/merge. Registra cualquier cambio de alcance en Jira/Markdown y recuerda la sincronización manual de Drive/Word.

## Yeison y criterios comunes

Yeison revisa PR, coordina decisiones, integra solo con filtros verdes y comprueba Actions/HTTPS. Los compañeros no necesitan acceso SSH para publicar funcionalidades. Cada entrega señala clave de Jira, archivos, commit/PR, pruebas ejecutadas y pendientes. No cerramos EC-14 ni EC-29 solo por esta integración.

Yeison ya implementó EC-26/27/30 y EC-37/36/39/40 en la rama actual. Ahora compara sus cambios con el repositorio, ejecuta los filtros y deja evidencia. No marca a Alex o Fabián como autores ni altera los responsables existentes; cualquier ajuste se entrega con commits `yeison/...` y revisión del equipo.

## Solicitud de alcance para Sprint 5 · Google y Ajustes

Yeison pidió el 16 de octubre que Google sea el único proveedor de inicio de sesión y que no se pueda abrir ninguna pestaña o servicio sin autenticarse. Esto todavía no está implementado ni sincronizado en Jira; no lo adelantamos a Sprint 2/3 ni cambiamos sus criterios mientras recuperamos carta y reservas.

- **Fabián:** validar en la API el token de identidad de Google, rechazar tokens inválidos/vencidos, vincular la cuenta con el usuario y rol asignados en servidor y emitir los JWT/refresh del proyecto. No confiamos el rol en datos del teléfono ni en un campo modificable del perfil.
- **Alex:** reemplazar el acceso actual de correo/contraseña por Google en móvil; guardar y renovar la sesión con el mecanismo seguro existente; bloquear las cinco pestañas y enlaces entrantes sin sesión; cerrar sesión y regresar al acceso. La API debe seguir protegiendo cada operación aunque se intente saltar la interfaz.
- **Alex:** reorganizar Ajustes en subpantallas con retroceso visible: Perfil, Preferencias, Aplicación, Cuenta y seguridad, e Información/ayuda. Conservamos los cinco destinos principales.

Antes de programar, Yeison sincroniza estos criterios en Jira y los requisitos; allí revisamos qué partes de RF-AUT02/RF-AUT05 se retiran o difieren porque Google administra la contraseña. Pendiente actualizar requisitos en Drive y Word local: RF-AUT01/03/08 y organización de Ajustes. No damos por asignadas ni estimadas oficialmente estas tareas hasta crear/actualizar sus actividades Jira.

```powershell
npm run build --workspace=@encanto/shared
npx prisma generate --schema=apps/api/prisma/schema.prisma
npm run lint --workspace=api
npm run test --workspace=api
npm run build --workspace=api
npm run test --workspace=@encanto/mobile
```

Para móvil añadimos lint y compilación/recorrido Android. El check de CI también construye la imagen VPS. Tras merge esperamos `Build and test` y `Deploy dev to VPS`; salud HTTPS debe indicar `database: connected`. Un filtro rojo se corrige en la rama personal, sin saltarlo.

No cambiamos RF/RNF de negocio con este reparto. Sigue pendiente actualizar requisitos en Drive y Word local, sección 10: gestión de cambios, responsable y sincronización manual; también revisar dominio dev y distinción de las dos conexiones SSH, como registramos en Jira.

Pendiente actualizar requisitos en Drive y Word local: sección 8 (plan/distribución de entregas), sustituir cualquier reparto que concentre carta y reservas en Alex por los bloques de esta guía. No cambiamos el alcance funcional ni estimaciones con esta reasignación.

El calendario y los encargos iniciales quedaron desplegados en `73cfcf7`: ejecución [38807273808](https://github.com/YeisonMunoz69/Restaurante-Native/actions/runs/38807273808), verificación y despliegue correctos. Salud HTTPS respondió con base conectada; consulta de calendario sin parámetros devolvió 400, administración anónima 401 y una sede ficticia 404 «Restaurante inexistente». No hicimos escrituras funcionales ni recorrido Android contra la VPS.
