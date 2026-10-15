# Entregas pendientes de Alex: carta y reservas

**Reparto vigente del 15 de octubre:** este catálogo ya no es una lista completa a cargo de Alex. Aplicamos [Encargos_Equipo.md](Encargos_Equipo.md): Alex EC-22/23/24 y luego EC-33/35/38; Fabián EC-25/28/29 y luego EC-31/32/34; Yeison EC-26/27/30 y luego EC-37/36/39, coordinando EC-40 al final. Conservamos las fichas como referencia compartida. A01/A04/A05 las lleva Fabián; A03/A06 y operación administrativa, Yeison. Las menciones posteriores al reparto anterior son históricas; el prompt vigente está en Encargos_Equipo.md, no encargamos toda la API y el móvil a Alex.

**Actualización de integración, 15 de octubre:** el backend de calendario de Fabián se incorpora a la base del equipo mediante su PR #2; verificamos el resultado publicado en `dev` y Actions antes de comenzar A05. El reparto detallado A00–A09 se conserva. Si ya tenemos avances, primero los publicamos y contrastamos sus criterios; no repetimos implementaciones ni marcamos historias completas por tener solo archivos locales. Usamos el procedimiento y los prompts actualizados de [Encargos_Equipo.md](Encargos_Equipo.md).

**Corte: 9 de octubre de 2026.** Revisamos `dev` en `0e27cb4`. Este documento reemplaza el reparto inicial de Sprint 2: encargamos a Alex las entregas siguientes de backend y móvil, por partes. No significa que ya estén implementadas ni cambia el alcance académico acordado.

**Revisión del 15 de octubre:** asignamos a Alex EC-14, EC-22 a EC-28 y EC-30 a EC-40 según este reparto. El calendario EC-29 tiene a Fabián como responsable de coordinar su cierre, con A05 a cargo de Alex. El repositorio aún no muestra una rama o PR de menú de Alex; antes de repetir trabajo comprobamos sus avances locales. Podemos ajustar estas entregas con la corrección registrada en Jira y la sincronización de [Reglas.md, sección 7](../Reglas.md#7-ajustes-de-alcance-y-sincronización-de-requisitos), recordando los requisitos manuales de Drive/Word.

## 1. Desde dónde empezamos

| Parte                | Lo que encontramos                                                                                                                  | Lo que todavía no podemos dar por entregado                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Infraestructura      | API Docker, Supabase, HTTPS, landing y CI/CD de `dev` comprobados en el despliegue anterior                                         | Cada funcionalidad nueva necesita sus propias pruebas; salud verde no prueba carta ni reservas |
| Autenticación        | Registro/login, refresh rotatorio, Keychain, guards JWT/roles                                                                       | Acceso al panel administrativo y permisos de cada módulo nuevo                                 |
| Carta móvil          | `MenuScreen.tsx` muestra un plato de ejemplo y horario estático                                                                     | Carta consultada por fecha, lista virtualizada, detalle y galería conectados                   |
| Reservas móvil       | `ReservationsScreen.tsx` tiene una vista vacía; «Nueva reserva» no tiene acción                                                     | Formulario, envío, ticket, historial y cancelación                                             |
| Noticias             | Encontramos contenido de ejemplo                                                                                                    | Muro administrable; corresponde a Sprint 4, no a esta primera recuperación                     |
| Calendario de Fabián | Rama publicada y [PR #2 abierto hacia dev](https://github.com/YeisonMunoz69/Restaurante-Native/pull/2), cabeza `76805a4` al revisar | No está integrado en esta base y no incluye pantallas móviles                                  |

Trabajamos con React Native **bare**, no Expo. Revisamos con Yeison los commits `34e17b9` y `5b2d5cd` de `yeison/inicio-sprint-2` para reutilizar carta/detalle si sirven. No integramos la rama completa: `5ec3d22` cambia a Expo y necesita otra decisión. Conservamos Keychain y la renovación de sesión existente.

Leemos primero [Reglas](../Reglas.md), [requisitos](Requisitos_del_Sistema.md), [decisiones](Decisiones_Pendientes_y_Riesgos.md), [plan](Plan_de_Sprints.md), [backlog](Backlog_Jira.md) y las fichas en [design](../design/README.md). Contrastamos esos documentos con Prisma y el código antes de crear otro modelo.

## 2. Cómo repartimos el trabajo desde ahora

Distribuimos las fichas según Encargos_Equipo.md: Alex usa A00/A02 y el flujo del comensal; Fabián A01/A04/A05 y motor/total; Yeison A03/A06, estados/administración y pruebas integradas. Cada responsable cubre API, móvil y pruebas de sus historias, coordinando archivos comunes.

No necesitamos SSH para avanzar. Abrimos PR a `dev`, esperamos revisión y `Build and test`; después de integrar, verificamos `Deploy dev to VPS`. No publicamos ramas, integramos PR ni modificamos secretos por iniciativa del agente: el integrante autoriza esas acciones. `main` queda fuera. Seguimos [el flujo del equipo](Flujo_Equipo_Dev.md).

Entregamos una unidad por PR; si crece, separamos contrato/API e interfaz y no cerramos la historia hasta conectar ambos. Alex comienza por configuración/carta, Fabián por contrato de menú y Yeison por administración cuando esté acordado el contrato.

| Orden | Entrega                                                  | Dependencia                                | Resultado que buscamos                                           |
| ----- | -------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| A00   | Contratos, configuración móvil y pendientes de cimientos | `dev` actual                               | Podemos elegir API local o HTTPS dev sin romper autenticación    |
| A01   | Menú público por fecha                                   | A00                                        | Tenemos consultas reales documentadas y probadas                 |
| A02   | Carta y detalle Android                                  | A01; calendario integrado para próximo día | Dejamos de mostrar el plato de ejemplo                           |
| A03   | Administración de categorías/platos                      | A01                                        | El dueño mantiene la carta desde el teléfono                     |
| A04   | Disponibilidad por fecha                                 | A03                                        | Un cambio para una fecha no altera las demás                     |
| A05   | Interfaz de calendario                                   | PR #2 integrado y contrato revisado        | El dueño mantiene horarios y excepciones sin SSH                 |
| A06   | Fotografías                                              | A03                                        | Cargamos y consultamos imágenes reales                           |
| A07   | Motor de solicitudes y aforo                             | A04–A05; reglas pendientes resueltas       | El servidor valida reservas y concurrencia                       |
| A08   | Reserva del comensal                                     | A07                                        | Solicitamos, vemos ticket, consultamos y cancelamos según reglas |
| A09   | Operación administrativa                                 | A07–A08                                    | Aprobamos/rechazamos y operamos la agenda por permisos           |

## 3. Entregas de Sprint 1 y 2 que recuperamos

### A00. Configuración móvil y contratos antes de conectar pantallas

- Revisamos `apps/mobile/src/config/api.config.ts`: Android usa hoy `10.0.2.2:3000/api/v1`, que sirve para el emulador, no para un teléfono contra la VPS. Definimos un mecanismo sencillo y documentado para elegir local o `https://encanto-campestre-dev.apolobyte.online/api/v1`; evitamos duplicar URL en servicios. No prometemos que el `API_URL` del servidor cambie la app: no lo hace.
- Para teléfono por USB, usamos `localhost` con `adb reverse`; para emulador, `10.0.2.2`. La URL pública no es una contraseña; las credenciales de Supabase y JWT nunca van en el bundle móvil.
- Conservamos interceptor, refresh coordinado, Keychain y cinco pestañas. Retiramos literales de interfaz pendientes hacia i18n, sin mover a recursos los datos reales que devuelve la API. Eliminamos contenido de muestra al conectar cada módulo, no lo usamos como respuesta de emergencia si falla la red.
- Acordamos restaurante activo sin UUID fijo en componentes, contratos compartidos, fechas civiles `YYYY-MM-DD`, paginación y representación de `Decimal`/COP. Documentamos cómo obtiene el cliente ese restaurante: no suponemos un endpoint inexistente.

**Validamos en interfaz:** iniciamos sesión, cerramos/reabrimos la app y comprobamos sesión; consultamos la API elegida desde el emulador o dispositivo usado. Cortamos la red: mostramos error y reintento, no datos inventados. Registramos qué dispositivo y configuración probamos; Jest no demuestra conexión del teléfono.

### A01. API pública de menú por fecha

Proponemos `GET /api/v1/menu/categorias`, `/menu/platos`, `/menu/platos/:id` y `/menu/etiquetas`. **Son rutas por implementar**, no endpoints ya desplegados. Acordamos y documentamos el contrato antes de conectar la app, usando `restauranteId` y `fecha` donde corresponda.

- Consultamos categorías activas, platos, etiquetas y fotos ordenadas; paginamos sin perder el agrupamiento al llegar otra página.
- Aplicamos ADR-010: `DishSchedule` para esa fecha prevalece sobre `Dish.disponible`; sin registro usamos la disponibilidad general. Incluimos platos no disponibles con su estado para mostrarlos atenuados; no confundimos esa situación con categorías inactivas.
- Probamos fecha diferente de hoy, habilitar/deshabilitar por excepción, ausencia de excepción, orden, paginación, IDs y fechas inválidos, restaurante inexistente y plato inexistente. Validamos fechas reales, no solo su forma.
- No escribimos datos ni metemos favoritos, caché, búsqueda o reservas en este PR.

**Validación visible:** A01 sola se revisa con respuestas HTTP y Swagger local; no afirmamos que la carta Android cambió hasta A02. Dejamos ejemplos sin credenciales para que Yeison pueda reproducirlos.

### A02. Carta por fecha, próximo día y detalle

- Reemplazamos el ejemplo de `MenuScreen.tsx` por una lista virtualizada, agrupada por categoría, que consume A01. No envolvemos toda la lista en un `ScrollView` que anule la virtualización.
- Mostramos la fecha consultada. Para el próximo día usamos el calendario integrado, no un domingo calculado a mano. Si no hay próximo día, informamos eso sin girar indefinidamente.
- Al tocar un plato abrimos detalle con descripción, precio COP, etiquetas, disponibilidad y galería de hasta diez fotos. Dejamos retroceso visible, tema claro/oscuro y textos de interfaz en recursos.
- Mostramos carga, carta vacía y error con reintento como estados distintos. Cambiar fecha invalida/refresca la consulta correcta; no arrastramos disponibilidad del día anterior.

**Validamos en interfaz:** sin sesión, abrimos Carta, cambiamos entre dos fechas con disponibilidad distinta, abrimos detalle, recorremos fotos y regresamos conservando contexto. Un plato no disponible se ve atenuado y no se ofrece para un pedido de esa fecha. Con lista larga seguimos desplazándonos sin perder platos; en vacío/error no aparece el Sancocho de muestra. Si A06 aún no llegó, usamos un marcador visual sin fabricar fotografías ni declararlas cargadas.

### A03. Administración de categorías y platos

- Creamos API y pantallas para crear/editar categorías y platos, ordenar y alternar disponibilidad general. Reutilizamos `Category`, `Dish`, etiquetas y guards existentes.
- Desde Ajustes damos acceso al panel solo al rol autorizado. Ocultar un botón no reemplaza JWT y rol `ADMIN` en backend; visitante recibe 401 y usuario autenticado sin permiso, 403.
- Validamos nombre, descripción y precio con el contrato acordado; el servidor no confía en precios ni permisos enviados por el cliente. Para borrar definimos el efecto sobre platos/pedidos relacionados antes de elegir borrado físico o desactivación: no eliminamos historial.
- Guardar muestra progreso, evita envíos duplicados y conserva el formulario si falla. Los cambios solo aparecen como guardados después de la respuesta del servidor.

**Validamos en interfaz:** entramos con ADMIN, creamos categoría y plato, editamos precio y orden, cerramos/reabrimos y comprobamos persistencia; con COMENSAL no accedemos. Contrastamos la carta pública después de refrescar. Un campo inválido muestra error junto al campo y no guarda parcialmente.

### A04. Disponibilidad de platos por fecha

- Administramos `DishSchedule` sin cambiar `Dish.disponible` al guardar una excepción. Para quitar una excepción dejamos explícito que volvemos a la regla general.
- Si añadimos «copiar desde otra fecha», definimos destino, confirmación de reemplazo y operación atómica: no duplicamos filas ni borramos otras fechas.
- Cubrimos precedencia y restricciones únicas con pruebas; documentamos rutas administrativas nuevas y su autorización.

**Validamos en interfaz:** dejamos un plato disponible en general, lo deshabilitamos en una fecha y comprobamos la carta de esa fecha y de otra. Luego lo habilitamos para una fecha aunque la regla general esté deshabilitada. Al quitar la excepción vuelve al valor general. Recargamos la app para demostrar persistencia.

### A05. Panel móvil del calendario que ya hizo Fabián

El PR #2 ya está integrado. Fabián lleva el panel y la aceptación completa de EC-29; leemos `docs/Calendario_Atencion.md` y sus esquemas. Existen estas rutas con `restauranteId`:

- Públicas: `GET /calendario/dia?fecha=YYYY-MM-DD` y `GET /calendario/proximo?desde=YYYY-MM-DD`, bajo `/api/v1`.
- ADMIN: `GET /admin/calendario/reglas`, `PUT /admin/calendario/reglas/:diaSemana`, `GET /admin/calendario/excepciones?fecha=...`, `PUT`/`DELETE /admin/calendario/excepciones/:fecha`.

Mostramos reglas semanales, varias franjas, excepciones de apertura/cierre, motivo y `soloPorReserva`. Una excepción sustituye las reglas de ese día. El índice semanal es 0 domingo a 6 sábado. No admitimos intervalos nocturnos que el contrato actual rechaza.

El `PUT` reemplaza la configuración completa, no hace un parche. Al editar conservamos IDs, aforo y demás campos que deban seguir; no mandamos solo el campo tocado y borramos accidentalmente el resto. Borrar una excepción permite volver a la regla semanal; no equivale siempre a cerrar.

**Validamos en interfaz:** modificamos un horario semanal, abrimos excepcionalmente otra fecha y cerramos una fecha normalmente abierta. Consultamos cada día públicamente y tras reiniciar la app. Si al cerrar hay confirmadas, el servidor responde 409 con un objeto dentro de `message`, código `RESERVAS_CONFIRMADAS_AFECTADAS`, cantidad y fechas. Mostramos esa advertencia; cancelar no escribe. Para confirmar repetimos el mismo método/URL/cuerpo con `confirmarReservasAfectadas` igual a la cantidad recibida. Si cambió, mostramos la advertencia nueva: no confirmamos ciegamente. El calendario no cancela esas reservas.

**Límites que conservamos:** el PR es de sede única porque `Reservation` no tiene relación con restaurante; más de una sede rechaza escrituras. `/proximo` busca hasta 366 fechas e incluye `desde`, aunque las horas de hoy ya pasaron; no lo tratamos como una franja reservable. El cierre completo detecta confirmadas, pero recortar horas no valida por sí solo su compatibilidad. Cubrimos esa diferencia al diseñar A07, no prometemos que esté resuelta.

### A06. Fotos reales

- Cargamos hasta diez fotos por plato con API protegida, validación real de tipo/tamaño, procesamiento con `sharp` y Supabase Storage. La clave privilegiada queda solo en backend, jamás en móvil ni Git.
- Generamos variantes de consulta/vista previa; conservamos el requisito de imagen Open Graph 1200×630 y menos de 600 KB para no rehacerlo al llegar Sprint 4.
- Al fallar la carga no dejamos filas que apunten a objetos inexistentes; explicamos la limpieza de archivos sobrantes sin borrar imágenes de otro plato. Documentamos configuración nueva con nombres y valores ficticios, no secretos.

**Validamos en interfaz:** elegimos una foto, esperamos progreso, guardamos y la vemos en detalle después de reabrir. Ordenamos/eliminamos una y comprobamos el resultado. Rechazamos una undécima, un archivo inválido y un fallo de red con mensajes claros. Añadir dependencias/permisos requiere explicar el cambio, no actualizar todo el monorepo.

## 4. Antes de programar reservas: decisiones concretas

No resolvemos contradicciones copiando el seed. Abrimos una consulta concreta a Yeison y registramos la respuesta en [decisiones](Decisiones_Pendientes_y_Riesgos.md), requisitos y configuración que corresponda.

| Tema                | Acuerdo/documento                                  | Código actual o punto que falta cerrar                                                                                             |
| ------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Anticipación máxima | B-5: tres meses                                    | Prisma/seed: 60 días; definimos meses calendario o días y sus límites antes de cambiar datos                                       |
| Anticipación mínima | B-6: una hora y solicitud antes de las 13:00       | Prisma/seed: 120 minutos; documentamos qué instante controla el corte y probamos 12:59/13:00                                       |
| Duración            | B-1: 90 min hasta cuatro personas, 120 desde cinco | `Restaurant.duracionReservaMin` solo representa una duración; shared tiene ambas. Acordamos cómo configurarlas sin duplicar reglas |
| Cancelación         | B-4: hasta una hora antes                          | Aclaramos igualdad exacta; probamos 59, 60 y 61 minutos, sin una regla distinta en móvil y API                                     |
| Expiración          | El estado existe; tiempo todavía por confirmar     | Seed usa 24 h, no lo convertimos en acuerdo del cliente. Automatización corresponde a Sprint 5                                     |
| Estados compartidos | Prisma incluye `EXPIRADA`                          | Falta en `packages/shared/src/constants/index.ts`; alineamos contrato y pruebas al implementar estados                             |
| Sede                | Producto de sede única                             | No inventamos `Reservation.restaurantId` en un filtro; mantenemos el alcance o acordamos migración por separado                    |

Ya tenemos decisiones que **sí aplicamos**: pedido opcional con menos de ocho personas y obligatorio desde ocho; pago externo y comprobante por WhatsApp; aprobación manual; Mirador, motos y pesca no se reservan en la app. No construimos pasarela ni carga de comprobantes por suposición.

## 5. Entregas de Sprint 3

### A07. Franjas, solicitud y aforo en servidor

- Calculamos franjas usando calendario, duración, granularidad y reglas acordadas; no ofrecemos pasado ni intervalos que terminan fuera de atención. Usamos hora comercial `America/Bogota`; una fecha civil no cambia de día por convertirla mal a UTC.
- Respetamos B-12: entre semana la apertura por reserva exige grupos de al menos quince personas y debe ser compatible con el calendario. Probamos catorce/quince personas y días cerrados; no inventamos aperturas ni festivos a partir del nombre del día.
- Según Sprint 0 §9.3 consumen aforo `SOLICITADA`, `CONFIRMADA` y `EN_CURSO`. Respetamos el aforo aplicable y cubrimos intervalos solapados cuando las duraciones difieren; no basta comparar horas iniciales iguales.
- Releemos calendario/disponibilidad, calculamos ocupación y creamos solicitud/líneas en la **misma transacción serializable**. Si otro proceso cierra el día o toma el cupo, no usamos la validación vieja de la pantalla. Definimos manejo acotado de conflictos y duplicados; no reintentamos una escritura a ciegas.
- El servidor calcula total con precios válidos, guarda el precio de cada línea y valida platos de la fecha elegida. La solicitud comienza en `SOLICITADA` y obtiene código legible; pagar por fuera no la confirma automáticamente.
- Autenticamos al solicitante y limitamos lectura/cancelación a sus propias reservas. Documentamos endpoints, errores y transiciones antes de la interfaz.

**Validamos:** unitarias de límites, duración, fecha, pedido obligatorio, precio alterado, plato no disponible, usuario ajeno y transición inválida. En PostgreSQL **aislado de pruebas**, lanzamos dos solicitudes concurrentes para el último cupo: no se supera el aforo, no quedan líneas huérfanas y la perdedora obtiene conflicto controlado. Un mock no demuestra aislamiento ni resuelve esta aceptación. No hacemos esta prueba sobre Supabase compartido.

### A08. Reserva, ticket e historial del comensal

- Conectamos «Nueva reserva». Permitimos explorar carta sin cuenta y pedimos iniciar sesión antes de enviar una reserva, conservando el contexto de forma segura.
- Implementamos fecha/personas, franja, pedido y resumen. Para menos de ocho personas permitimos omitir pedido; desde ocho explicamos que es obligatorio. No mostramos platos de hoy si la reserva es para otra fecha.
- Al enviar desactivamos doble toque; un error conserva el formulario y no anuncia éxito. Solo mostramos solicitud enviada cuando recibimos código/estado del servidor.
- Mostramos ticket copiable, total del servidor, instrucciones de pago externo y acción WhatsApp al contacto configurado. No incrustamos teléfono de prueba como negocio definitivo. La pantalla explica que falta aprobación del dueño.
- Mis reservas muestra datos propios, detalle y cancelación según la regla vigente; ocultamos acciones inválidas y el servidor también las rechaza. Al volver/refrescar mostramos cambios de estado reales.

**Validamos en interfaz:** sin sesión tocamos reservar, entramos y retomamos; recorremos casos de siete y ocho personas, cambiamos fecha, comprobamos el resumen y copiamos ticket. Simulamos red caída y doble toque sin dos reservas. Cerramos/reabrimos y seguimos viendo `SOLICITADA`; no dice confirmada antes de A09. Otro usuario no ve esa reserva. Cancelamos dentro de la ventana y comprobamos persistencia/liberación de aforo; fuera de ella recibimos explicación.

### A09. Solicitudes, aprobación/rechazo y agenda

- ADMIN ve bandeja ordenada por fecha, personas, pedido, total y alerta discreta de cancelaciones previas; aprueba tras verificar pago externo o rechaza con motivo obligatorio. Guardamos actor y momento con los modelos disponibles.
- Validamos máquina de estados en servicio y transacción, no solo mediante botones. Al aprobar revalidamos calendario y compatibilidad de horario/capacidad; acordamos qué hacer con una reserva afectada por un cierre confirmado en A05, sin aprobarla silenciosamente.
- Mostramos estado actualizado en el comensal al consultar de nuevo. No afirmamos que llegan push/correo: esas notificaciones siguen pendientes en Sprint 5.
- Agenda del día con acciones según rol: ADMIN administra solicitudes; STAFF opera solo las acciones autorizadas de agenda/llegada. No le damos a STAFF CRUD de carta por reutilizar una pantalla.

**Validamos en interfaz:** ADMIN aprueba una solicitada y COMENSAL la ve confirmada tras refrescar; rechazar sin motivo no guarda, con motivo aparece rechazada y con explicación. Intentar aprobar dos veces o cambiar una terminal devuelve conflicto. STAFF marca llegada de una confirmada y la ve `EN_CURSO`; COMENSAL no puede ejecutar esa acción. La automatización de expiración/inasistencia no se da por entregada por tener un enum.

## 6. Comprobaciones y evidencia por entrega

Desde la raíz, con Node 22 actualizado y dependencias instaladas con `npm ci`, ejecutamos los filtros existentes:

```powershell
npm run build --workspace=@encanto/shared
npx prisma generate --schema=apps/api/prisma/schema.prisma
npm run lint --workspace=api
npm run test --workspace=api
npm run build --workspace=api
npm run test --workspace=@encanto/mobile
```

Al tocar móvil ejecutamos además `npm run lint --workspace=@encanto/mobile` y distinguimos errores previos de los que introducimos; comprobamos Android con Metro (`npm run start --workspace=@encanto/mobile`) y, en otra terminal, `npm run android --workspace=@encanto/mobile`. No declaramos compilación Android ni pruebas físicas si no las ejecutamos. Para cambios de imagen repetimos el build Docker de CI. Las pruebas de integración usan una base aislada y una configuración documentada, nunca `migrate reset`, seed o limpieza del entorno compartido.

En cada PR dejamos:

1. Entrega Axx, requisitos cubiertos y qué sigue pendiente.
2. Contrato HTTP real y cambios compartidos/migraciones, si existen; ejemplos sin secretos.
3. Comandos ejecutados y resultados reales, diferenciando mocks e integración.
4. Capturas o grabación de la interfaz en carga, éxito, vacío/error y permisos aplicables, con dispositivo/URL pública usada. No mostramos tokens ni datos privados.
5. Tras revisión e integración, enlace a Actions y prueba funcional contra dev; salud HTTPS por sí sola no cierra la historia.

Actualizamos estado en [plan](Plan_de_Sprints.md) y [backlog](Backlog_Jira.md) con esa evidencia. No marcamos completa una historia API+móvil cuando solo se entregó el controlador. Conservamos los estimados originales; no inventamos porcentajes ni fechas de terminación.

## 7. Prompt para empezar sin dispersarnos

Usamos el prompt actualizado de Alex en [Encargos_Equipo.md](Encargos_Equipo.md); sustituye el anterior que concentraba API y móvil en Alex. No duplicamos menú/calendario de Fabián ni administración/fotos de Yeison. Conservamos los criterios técnicos de estas fichas.
