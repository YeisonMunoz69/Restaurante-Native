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

Alex conserva EC-14, EC-22 a EC-28 y EC-30 a EC-40. EC-29 tiene a Fabián como coordinador; Alex entrega su interfaz A05. Las reservas A07–A09 esperan menú/calendario y decisiones de negocio documentadas. No migramos a Expo ni reemplazamos Keychain por iniciativa propia.

Validamos en Android carga, éxito, vacío, error/reintento, cambio de fecha y permisos. Probamos sesión tras reabrir, detalle/retroceso y persistencia de cambios administrativos. A05 consume el contrato existente y muestra el 409 de reservas afectadas antes de confirmar. Una respuesta HTTP o test Jest no demuestra por sí sola ese recorrido.

### Prompt para Alex

> Lee Reglas.md, docs/Encargos_Equipo.md y docs/Tareas_Alex.md completos. Conserva mis cambios y audita mi rama antes de programar: si ya hice A00/A01 u otra entrega, comprueba sus criterios y publícala en un PR pequeño a dev, sin rehacerla. Autorizo publicar mi rama personal y abrir PR a dev; no autorizo merge directo, force, cambios de secretos ni escrituras de prueba en Supabase compartido. Actualiza mi rama con origin/dev sin descartar trabajo. Si no hay avance, implementa solo A00/A01; después propone la siguiente unidad. Usa identidad Alex Santacruz y correo de Reglas.md, ramas/commits alex/funcionalidad, sin trailers adicionales ni configuración Git cambiada. Reutiliza el calendario de Fabián; no lo dupliques ni migres a Expo. Ejecuta los filtros del equipo, documenta contratos y demuestra Android cuando corresponda. Actualiza las actividades Jira existentes: En curso mientras falten criterios, Listo solo tras merge y evidencia completa. Si cambia el alcance, corrígelo directamente en Jira y en Markdown; recuerda la actualización manual de Drive/Word. Si no tienes acceso a Jira o VPS, deja la evidencia exacta y el pendiente a Yeison, sin declarar comprobaciones no realizadas.

## Fabián: consolidar calendario y apoyar aceptación

No rehacemos el backend publicado. Sincronizamos nuestra rama con `origin/dev` después del merge del PR #2. Revisamos el contrato de [Calendario_Atencion.md](Calendario_Atencion.md) con Alex: reglas semanales, excepciones, IDs conservados en PUT y confirmación 409. EC-29 sigue En curso mientras falte la interfaz y aceptación completa.

Como siguiente entrega comprobamos persistencia y transacciones con PostgreSQL aislado, nunca limpiando Supabase compartido. Probamos reemplazar reglas conservando IDs/aforo, eliminar excepciones, rollback y conflictos concurrentes reales; documentamos cómo repetir las pruebas. Si encontramos un defecto, lo corregimos en un PR acotado con regresión. No añadimos multisede ni cambiamos el modelo de reservas sin acuerdo. Después coordinamos con Yeison el siguiente encargo del plan, evitando trabajar sobre las pantallas que lleva Alex.

### Prompt para Fabián

> Lee Reglas.md, docs/Encargos_Equipo.md, docs/Calendario_Atencion.md y el estado actual del PR #2. Conserva mis avances y compara mi rama con origin/dev; no rehagas lo integrado. Autorizo publicar ramas fabian/funcionalidad y abrir PR a dev, no merge directo ni force. Usa Fabián Hoyos y correo de Reglas.md sin cambiar configuración Git ni añadir trailers. Si ya terminé otro encargo, valida sus criterios, publícalo con evidencia y actualiza su Jira existente. Primero consolida calendario: acuerda el contrato con Alex y añade validación de persistencia/transacciones en PostgreSQL aislado, con instrucciones reproducibles y pruebas de regresión para defectos encontrados. No ejecutes seed/reset/db push ni pruebas de escritura en Supabase compartido; no cambies esquema, dependencias o reglas de negocio sin explicar y acordar antes. EC-29 permanece En curso hasta integrar panel móvil y demostrar el recorrido completo; no cierres por tener backend compilado. Registra en Jira cambios de alcance y sincroniza Markdown con recordatorio de Drive/Word. Si no tienes acceso a Jira/VPS, entrega evidencia y pendiente concreto a Yeison, sin afirmar que lo verificaste allí.

## Yeison y criterios comunes

Yeison revisa PR, coordina decisiones, integra solo con filtros verdes y comprueba Actions/HTTPS. Los compañeros no necesitan acceso SSH para publicar funcionalidades. Cada entrega señala clave de Jira, archivos, commit/PR, pruebas ejecutadas y pendientes. No cerramos EC-14 ni EC-29 solo por esta integración.

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
