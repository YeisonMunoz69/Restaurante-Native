# Entregas pendientes de Alex: carta y reservas

**Estado al 16 de octubre de 2026:** EC-22/23/24 y EC-33/35/38 están implementadas en `yeison/ajusta-encabezados-y-auth-plan`, todavía sin integrar en `dev`. Pasan 187 pruebas API, 46 móviles, TypeScript, build Android y prueba Docker aislada. En el S21 renderizaron Carta, Mis reservas, Próximamente y Ajustes; los títulos ya no quedan pegados a la barra de estado. Aún falta probar los recorridos de reserva/admin contra API local con datos y roles de QA. Alex conserva las historias en Jira: debe comparar sus avances, ayudar a completar la aceptación y publicar únicamente diferencias propias, sin duplicar la implementación ni atribuirse estos commits. Ver [Encargos_Equipo.md](Encargos_Equipo.md) y [contrato EC-31–40](Reservas_EC31_EC40.md).

**Reparto vigente:** Alex EC-22/23/24 y EC-33/35/38; Fabián EC-25/28/29 y EC-31/32/34; Yeison EC-26/27/30 y EC-36/37/39/40. Este reparto no cambia por implementar tareas ajenas con autorización del equipo. Las historias no están cerradas en Jira por pasar pruebas locales: falta revisión, aceptación e integración a `dev`.

**Decisión futura:** el acceso único con Google, la protección global de las cinco pestañas y las subpantallas de Ajustes siguen en el alcance solicitado para Sprint 5, no están implementados ni sincronizados todavía en Jira. Las instrucciones históricas de Sprint 2/3 que describen navegación pública no adelantan ni sustituyen ese cambio.

**Corte inicial del 9 de octubre de 2026 (histórico):** revisamos `dev` en `0e27cb4`. Este documento reemplaza el reparto inicial de Sprint 2; su estado actual se describe en el corte del 16 de octubre y en el plan vigente.

**Revisión del 16 de octubre:** Alex conserva EC-22/23/24 y EC-33/35/38; Fabián EC-25/28/29 y EC-31/32/34; Yeison EC-26/27/30 y EC-37/36/39, con EC-40 coordinada. Antes de duplicar, cada quien revisa y publica avances de su rama. El cambio futuro de autenticación se mantiene pendiente de Jira y de sincronizar requisitos manuales de Drive/Word.

## 1. Foto previa a esta implementación (histórica)

La siguiente tabla conserva la auditoría anterior al trabajo de esta rama. **No describe el estado actual del código**; el estado vigente está en el corte de arriba y en el plan de sprints.

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

## 4. Políticas de reservas para las historias de Alex

El 16 de octubre cerramos las precisiones que antes figuraban como preguntas. En cada historia seguimos [Decisiones_Pendientes_y_Riesgos.md](Decisiones_Pendientes_y_Riesgos.md) y validamos el criterio en API y móvil; no reabrimos ni cambiamos estos acuerdos por copiar el seed anterior.

| Tema                | Acuerdo vigente                                                                                  | Cómo lo comprobamos al implementar                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Anticipación máxima | Hasta 3 meses calendario desde hoy                                                               | Cubrimos el límite y el cambio de mes; no usamos una aproximación fija de 90 días                  |
| Anticipación mínima | La franja inicia al menos 60 minutos después de la solicitud; no hay corte fijo a las 13:00      | Rechazamos menos de 60 minutos y aceptamos exactamente 60                                          |
| Duración            | Configurable: 90 min hasta 4 personas y 120 min desde 5                                          | La generación de franjas elige la duración según el grupo                                          |
| Cancelación         | `SOLICITADA` se puede retirar; `CONFIRMADA` se puede cancelar cuando faltan 60 min o más          | Probamos confirmadas a 59, 60 y 61 minutos                                                         |
| Expiración          | `SOLICITADA` vence tras 12 horas si sigue sin confirmarse                                         | El comprobante se revisa por WhatsApp; la aplicación solo conoce la confirmación que registra el dueño |
| Rechazo             | `RECHAZADA` es terminal; no hay edición ni reapertura                                             | Para reintentar, el comensal registra otra solicitud                                               |
| Estado compartido   | Prisma permite `EXPIRADA`                                                                          | La rama actual alinea el contrato compartido y prueba transiciones; falta integrar y aceptar      |
| Sede                | El producto actual tiene una sede                                                               | No añadimos filtros de `Reservation.restaurantId` que el modelo aún no tiene                      |

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

- Conectamos «Nueva reserva». Durante Sprint 3 se conserva el acceso público existente a carta; el cambio solicitado para Sprint 5 sustituye ese comportamiento: desde su integración ninguna pestaña ni servicio móvil queda disponible sin sesión Google. No adelantamos ese cambio a Sprint 3.
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
