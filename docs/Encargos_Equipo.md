# Encargos e integración del equipo

Actualizamos este reparto el 15 de octubre de 2026. Trabajamos desde `dev`; `main` queda fuera de esta VPS. Integramos documentación del PR #3 e incorporamos el backend de calendario del PR #2 conservando los cuatro commits de Fabián. Antes de consumirlo comprobamos el merge y la ejecución de Actions; no confundimos pruebas con Prisma simulado con persistencia real.

## Primero recuperamos los avances que ya existen

Cada uno revisa su rama y cambios sin descartarlos. Si ya implementó una entrega, no la rehace: identifica archivos, commits, clave de Jira y criterios cubiertos; publica su rama y abre PR con base `dev`. Un avance local o PR abierto queda En curso. Solo marcamos Listo tras integrar y demostrar todos los criterios vigentes, incluyendo interfaz cuando la historia la exige. Si falta acceso a Jira, entregamos el comentario y la evidencia a Yeison; no afirmamos haber actualizado una actividad sin hacerlo.

Desde un árbol limpio, en la rama personal que contiene el trabajo:

```powershell
git status --short --branch
git fetch origin
git merge origin/dev
```

Si tenemos cambios sin commit, los guardamos primero en nuestra rama con archivos explícitos; no usamos reset, force ni una limpieza para poder integrar. Resolvemos conflictos conservando ambas funcionalidades y repetimos pruebas. No hacemos rebase de ramas compartidas ni cambiamos la identidad de Git. Para trabajo nuevo creamos `alex/funcionalidad` o `fabian/funcionalidad` desde `origin/dev`.

## Alex: publicación y carta antes de reservas

Primero publicamos lo ya realizado, si existe, como PR a `dev`, con claves EC y demostración. Si no existe, empezamos por A00/A01 de [Tareas_Alex.md](Tareas_Alex.md): selección centralizada de API local/HTTPS dev, autenticación conservada, contratos y consulta pública de menú por fecha. Después conectamos carta/detalle (A02), administración y disponibilidad (A03/A04), panel de calendario (A05) y fotos (A06). No implementamos todo a la vez.

El reparto anterior, que concentraba A00–A09 en Alex, queda sustituido por los bloques siguientes. Conservamos EC-14 como pendiente de cimientos de Alex, fuera de las tres historias de Sprint 2. No migramos a Expo ni reemplazamos Keychain por iniciativa propia. Cada responsable entrega API/interfaz/pruebas que exijan sus historias; puede pedir apoyo sin transferir informalmente el cierre.

## Reparto equilibrado y orden de ejecución

Por petición de Yeison redistribuimos los pendientes, sin cambiar criterios, puntos ni fechas de los sprints. Tres historias no equivalen a esfuerzo idéntico; conservamos los estimados para revisar la carga. No significa terminar tres pantallas antes de que otra persona pueda comenzar su API: las dependencias mandan y trabajamos en paralelo donde sea posible.

| Sprint | Alex                                                                                                                   | Fabián                                                                                | Yeison                                                                                                                        |
| ------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 2      | EC-22 carta, EC-23 inicio/próximo día, EC-24 detalle/galería (18 puntos)                                               | EC-25 API menú, EC-28 disponibilidad por fecha, EC-29 calendario completo (21 puntos) | EC-26 administración de categorías/platos, EC-27 carga de fotos, EC-30 pruebas de disponibilidad (19 puntos)                  |
| 3      | EC-33 formulario de reserva, EC-35 solicitud enviada/pago/WhatsApp, EC-38 mis reservas/detalle/cancelación (21 puntos) | EC-31 franjas, EC-32 aforo transaccional, EC-34 total/ticket (18 puntos)              | EC-37 estados, EC-36 aprobación/rechazo, EC-39 agenda/llegada (18 puntos), después EC-40 validación de integración (5 puntos) |

El Sprint 3 tiene diez historias: la décima es de pruebas y la coordina Yeison con apoyo de ambos, no creamos ni eliminamos tareas para forzar un múltiplo de tres. Sprint 1 ya entregado y repartos de sprints 4–6 se conservan; esta recuperación se centra en los dos sprints que estaban concentrados en Alex.

1. Fabián publica contrato/API EC-25; Alex recupera sus avances y configura el cliente mientras tanto. Yeison acuerda ese contrato para EC-26. No duplicamos el menú ni sus esquemas.
2. Alex conecta EC-22 → EC-23 → EC-24. Fabián completa EC-28 y el panel/aceptación EC-29 sobre su backend integrado. Yeison entrega EC-26 → EC-27 → EC-30, comprobando disponibilidad con Fabián. La galería consume fotos cuando EC-27 esté listo.
3. Las decisiones de anticipación, duración, expiración, cancelación y rechazo se cerraron el 16 de octubre y están en [Decisiones_Pendientes_y_Riesgos.md](Decisiones_Pendientes_y_Riesgos.md). Fabián implementa EC-31 → EC-32 → EC-34; Yeison aplica los estados acordados en EC-37 antes de EC-36 → EC-39. Alex consume esos contratos en EC-33 → EC-35 → EC-38. EC-40 comprueba aforo, límites y recorrido conectado al final.

El panel A05 pasa a Fabián con EC-29; A03/A06 pasan a Yeison con EC-26/EC-27. Las fichas A00–A09 de Tareas_Alex.md se conservan como especificación compartida, no como lista completa a cargo de Alex. Antes de empezar comprobamos avances existentes y coordinamos cualquier archivo común. Si el avance está hecho, lo publicamos con pruebas en lugar de repetirlo.

### Pendiente de sincronizar en Jira · decisiones del 16 de octubre

El escritorio no permitió abrir Jira desde esta ejecución. Por eso corregimos primero los criterios locales y dejamos estos cambios para registrar en las actividades correspondientes; no cambiamos estados ni marcamos trabajo como terminado:

- **EC-31 (Fabián), franjas:** 90 minutos hasta 4 personas y 120 desde 5; máximo de 3 meses calendario; mínimo de 60 minutos hasta el inicio, sin corte a las 13:00. Incluir pruebas del límite de fechas y de 59/60 minutos.
- **EC-36 (Yeison), aprobación/rechazo:** el rechazo requiere motivo y es terminal; para volver a intentar, el comensal crea otra solicitud.
- **EC-37 (Yeison), estados:** `RECHAZADA` no tiene transiciones de salida; `SOLICITADA` puede vencer a las 12 horas si no se registra la confirmación del dueño.
- **EC-38 (Alex), cancelación:** una `SOLICITADA` se puede retirar; una `CONFIRMADA` se cancela si faltan 60 minutos o más. Exactamente 60 permite cancelar; a los 59 no.
- **Actividad de Sprint 5 para RF-RES13:** expiración a las 12 horas desde la creación si no está confirmada. Como el comprobante llega por WhatsApp, la aplicación solo puede considerar la revisión que registre el dueño.
- **H-5/H-6:** la adición de platos confirmados queda en la app (RF-RES15); las noticias generan push solo a quienes consintieron (RF-NOT05). Son reglas ya escritas, no tareas nuevas.

En los comentarios de Jira recordamos: **«Pendiente actualizar requisitos en Drive y Word local: RN-01, RN-04, RN-05, RF-RES09, RF-RES12 y RF-RES13; G-9, G-10 y G-14»**. Las descripciones locales están en `docs/Requisitos_del_Sistema.md`, `docs/Decisiones_Pendientes_y_Riesgos.md` y `docs/Backlog_Jira.md`; no retiramos el recordatorio hasta actualizar y confirmar también el `.docx` y Drive.

**Integración del 15 de octubre:** EC-25 ya está Listo: PR #6, merge `f8271b9`, CI/CD y cuatro rutas HTTPS verificados. [API_Menu_EC25.md](API_Menu_EC25.md) conserva el contrato COP numérico. Integramos API EC-28 por PR #7 (`19c5d93`), con [contrato de disponibilidad](Disponibilidad_Platos_EC28.md), sin cerrar todavía EC-28. Fabián aprobó copiar disponibilidad efectiva con previsualización/confirmación y acceso ADMIN «Atención y disponibilidad» desde Ajustes, manteniendo cinco pestañas. También aprobó selector compartido de API local/HTTPS dev antes del login, persistido separado de tokens, y restaurante configurado una sola vez para reutilizar en A00. No añadimos bibliotecas ni credenciales fijas. Alex conserva EC-22/23/24 y consume esa configuración; Yeison mantiene EC-26/27/30. Jira EC-28 comentarios 10040/10041; EC-29 sigue En curso hasta panel y aceptación. Pendiente actualizar requisitos en Drive y Word local: RF-ADM03/copia efectiva, configuración compartida y secciones 8/10.

Validamos en Android carga, éxito, vacío, error/reintento, cambio de fecha y permisos. Probamos sesión tras reabrir, detalle/retroceso y persistencia de cambios administrativos. A05 consume el contrato existente y muestra el 409 de reservas afectadas antes de confirmar. Una respuesta HTTP o test Jest no demuestra por sí sola ese recorrido.

### Prompt para Alex

> Lee Reglas.md, docs/Encargos_Equipo.md y las fichas que correspondan en docs/Tareas_Alex.md. El reparto anterior de todo a Alex queda sustituido: lleva EC-22, EC-23 y EC-24 en ese orden; luego EC-33, EC-35 y EC-38 cuando existan contratos de reservas. Conserva EC-14 de cimientos. Audita mis avances: si algo ya está implementado, valida y publícalo sin rehacerlo. La API EC-25 y calendario/EC-28 los lleva Fabián; administración/fotos/pruebas las lleva Yeison. No programes esos módulos en paralelo sin acuerdo. Autorizo push de mi rama alex/funcionalidad y PR a dev, no merge directo, force, secretos, Expo ni pruebas de escritura en Supabase compartido. Usa identidad humana de Reglas.md sin cambiar Git ni añadir trailers. Actualiza origin/dev preservando trabajo; acuerda contratos antes de conectar pantallas. Aplica `co.encantocampestre.app` y el desplazamiento compartido de formularios junto al teclado. En reservas, sigue los acuerdos vigentes de `docs/Tareas_Alex.md`: duración 90/120 min, máximo tres meses calendario, mínimo una hora sin corte fijo, cancelación confirmada con al menos 60 min, rechazo terminal y vencimiento a las 12 h. Ejecuta filtros y demuestra Android, estados de red y permisos. Actualiza Jira con PR/commit y evidencia: En curso mientras falte algo, Listo solo tras merge y criterios completos. Si no tienes acceso a Jira/VPS, deja el pendiente preciso a Yeison. Todo ajuste de alcance se registra en Jira/Markdown con recordatorio manual de Drive/Word.

## Fabián: consolidar calendario y apoyar aceptación

**Acuerdo del 16 de octubre:** publicamos el panel en PR #8, conservando backend y contratos. Fabián aplaza el recorrido Android restante para realizarlo con su celular conectado, sin Android Studio ahora. Conservamos EC-28/29 En curso y el detalle de criterios/evidencia en [Panel_Atencion_Movil.md](Panel_Atencion_Movil.md); el aplazamiento no es aceptación funcional. Pendiente actualizar requisitos en Drive y Word local: RF-ADM03/RF-ADM06, configuración compartida, aceptación móvil aplazada y secciones 8/10.

No rehacemos el backend publicado. Sincronizamos nuestra rama con `origin/dev` después del merge del PR #2. Fabián lleva EC-25, EC-28 y EC-29, incluyendo el panel antes asignado a Alex. Revisa el contrato de [Calendario_Atencion.md](Calendario_Atencion.md): reglas semanales, excepciones, IDs conservados en PUT y confirmación 409. EC-29 sigue En curso mientras falte interfaz y aceptación completa.

Como siguiente entrega comprobamos persistencia y transacciones con PostgreSQL aislado, nunca limpiando Supabase compartido. Probamos reemplazar reglas conservando IDs/aforo, eliminar excepciones, rollback y conflictos concurrentes reales; documentamos cómo repetir las pruebas. Si encontramos un defecto, lo corregimos en un PR acotado con regresión. No añadimos multisede ni cambiamos el modelo de reservas sin acuerdo. Después coordinamos con Yeison el siguiente encargo del plan, evitando trabajar sobre las pantallas que lleva Alex.

### Prompt para Fabián

> Lee Reglas.md, docs/Encargos_Equipo.md y docs/Calendario_Atencion.md. El PR #2 ya está integrado: no rehagas su backend. Tu bloque de Sprint 2 es EC-25 API menú → EC-28 disponibilidad por fecha → EC-29 panel y aceptación del calendario. Publica contrato EC-25 primero para desbloquear la carta de Alex y administración de Yeison. Luego lleva EC-31 franjas → EC-32 aforo transaccional → EC-34 total/ticket. Aplica las políticas de reservas de `docs/Tareas_Alex.md`; EC-31 debe elegir 90 min hasta cuatro personas o 120 min desde cinco, con tres meses calendario de anticipación máxima y una hora mínima sin corte de las 13:00. Audita avances existentes y publícalos sin repetir trabajo. Autorizo push de ramas fabian/funcionalidad y PR a dev, no merge directo ni force. Usa identidad Fabián Hoyos de Reglas.md, sin cambiar Git ni añadir trailers. Coordina archivos comunes y cambios de esquema/dependencias antes de aplicarlos. Demuestra API, Android cuando corresponda, permisos y persistencia con PostgreSQL aislado; nunca seed/reset/db push o pruebas destructivas en Supabase compartido. EC-29 sigue En curso hasta panel y aceptación completa. Actualiza Jira con PR/commit y evidencia; si no tienes acceso deja el pendiente a Yeison. Registra cambios de alcance en Jira/Markdown y recuerda Drive/Word manual.

## Yeison y criterios comunes

Yeison revisa PR, coordina decisiones, integra solo con filtros verdes y comprueba Actions/HTTPS. Los compañeros no necesitan acceso SSH para publicar funcionalidades. Cada entrega señala clave de Jira, archivos, commit/PR, pruebas ejecutadas y pendientes. No cerramos EC-14 ni EC-29 solo por esta integración.

Yeison implementa también su bloque EC-26 → EC-27 → EC-30 y, después, EC-37 → EC-36 → EC-39, coordinando EC-40 al final. No queda reducido a revisión mientras Alex programa todo. Acordamos contratos e IDs antes de tocar AppModule, shared o navegación comunes.

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
