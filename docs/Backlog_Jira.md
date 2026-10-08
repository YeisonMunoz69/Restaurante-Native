# Backlog para Jira — El Encanto Campestre

### Épicas, historias y criterios de aceptación

**Versión:** 0.1 · **Generado:** 20 de agosto de 2026

Archivo importable: `Backlog_Jira.csv`. Instrucciones de importación al final.

**Corte de estado:** 8 de octubre de 2026. Uso `[x]` para criterios comprobados, `[~]` para una historia con aceptación pendiente y `[ ]` para trabajo no iniciado. Los puntos del resumen siguen siendo estimaciones originales, no puntos aceptados automáticamente.

---

## Resumen

| Sprint    | Historias | Puntos  |
| --------- | --------- | ------- |
| Sprint 1  | 10        | 51      |
| Sprint 2  | 9         | 58      |
| Sprint 3  | 10        | 62      |
| Sprint 4  | 10        | 53      |
| Sprint 5  | 12        | 63      |
| Sprint 6  | 9         | 38      |
| **Total** | **60**    | **325** |

Capacidad estimada: ~52 h por sprint entre tres personas. Los sprints 3 y 5 exceden lo esperable; cada uno tiene su lista de recorte en `Plan_de_Sprints.md`.

---

## EP-01 · Plataforma y cimientos

Monorepo, proyectos base, esquema de datos, contenedor y despliegue. Es la base sobre la que se apoyan las demás épicas: hasta que no cierre, ninguna funcionalidad puede integrarse de extremo a extremo.

_7 historias · 35 puntos_

### [~] Configurar monorepo, convenciones y estructura de proyectos

`Sprint 1` · `3 pts` · `High` · `infra`

Dejar el repositorio listo para que los tres proyectos convivan y el equipo trabaje con las mismas reglas.

**Criterios de aceptación**

- [x] El monorepo contiene apps/mobile, apps/api, la carpeta reservada apps/web y packages/shared
- [~] Lint y formato están disponibles para API/móvil; `apps/web` aún es un placeholder con README y se implementa en Sprint 4
- [x] El README explica como levantar cada proyecto desde cero
- [x] Existe .env.example documentado, y .env esta ignorado por git
- [~] CI/CD de `dev` preparado con instalación limpia, lint/build/test y Docker; pendiente publicar los ajustes y validar una ejecución completa en GitHub

### [x] Inicializar la app React Native con navegacion de cinco destinos

`Sprint 1` · `8 pts` · `Highest` · `movil` · `Sprint0 §13.1`

Tener la aplicacion corriendo en Android con el esqueleto de navegacion definitivo.

**Criterios de aceptación**

- [x] El proyecto se inicializa con @react-native-community/cli sobre React Native 0.87
- [x] La Nueva Arquitectura y Hermes estan activos
- [x] La barra inferior tiene cinco destinos: Carta, Reservas, Noticias (boton central), Proximamente y Ajustes
- [x] El tema claro y oscuro se resuelve con fichas de diseno, sin colores literales en los componentes
- [x] La orientacion esta fijada en vertical

### [x] Configurar i18n y externalizar los textos desde el primer commit

`Sprint 1` · `3 pts` · `High` · `movil` · `RNF-03, ADR-009`

Cumplir la condicion del cliente de que ningun texto de interfaz este escrito en el codigo.

**Criterios de aceptación**

- [x] i18next esta configurado con espanol como idioma inicial
- [x] Todos los textos de las pantallas existentes provienen de archivos de recursos
- [x] Existe una verificacion o convencion documentada para detectar literales antes de integrar
- [x] Los formatos de moneda (COP sin decimales) y fecha (dd/mm/aaaa) estan centralizados en utilidades

### [x] Inicializar la API NestJS en contenedor

`Sprint 1` · `5 pts` · `Highest` · `backend,infra` · `RNF-12, ADR-008`

Que el backend corra de forma repetible en el entorno local de desarrollo.

**Criterios de aceptación**

- [x] El proyecto NestJS arranca con Dockerfile y docker-compose
- [x] Swagger expone la especificacion en /api/docs
- [x] Existe un filtro global de excepciones con respuesta uniforme
- [x] El prefijo de rutas es /api/v1

### [x] Definir el esquema de Prisma y aplicar la primera migracion

`Sprint 1` · `8 pts` · `Highest` · `backend,datos` · `Sprint0 §9`

Llevar el modelo de datos del documento de diseno a una base real.

**Criterios de aceptación**

- [x] El esquema incluye todas las entidades de Sprint0 §9.1
- [x] Las enumeraciones de estado, rol y tipo de notificacion estan declaradas
- [x] La migracion se aplica sobre Supabase y queda versionada en el repositorio
- [x] Estan creados los indices frecuentes de §9.3
- [x] RLS queda habilitado con negacion por defecto en todas las tablas

### [x] Cargar datos de siembra realistas

`Sprint 1` · `3 pts` · `Medium` · `backend,datos`

Poder probar la aplicacion con contenido verosimil desde el primer dia.

**Criterios de aceptación**

- [x] Existen restaurante, zonas y mesas con capacidades reales
- [x] Hay al menos 15 platos con nombre, descripcion y precio verosimiles
- [x] El calendario tiene marcados los proximos fines de semana y festivos
- [x] Existen las tres cuentas de prueba: comensal, staff y dueno

### [~] Preparar y desplegar el contenedor del backend en la VPS

`Sprint 1` · `5 pts` · `High` · `infra` · `ADR-008`

Tener un entorno de desarrollo compartido en esta VPS. Reservamos producción y `main` para otro servidor.

**Criterios de aceptación**

- [ ] La imagen se construye y ejecuta en el host reservado
- [ ] Nuestra API responde por HTTPS en equipo-7-elev-d-dev.apolobyte.online; el sitio SSL existente aún apunta al ejemplo
- [x] La plantilla mantiene las variables fuera del repositorio y el archivo real está ignorado
- [x] El procedimiento manual de staging queda documentado en `docs/Despliegue_VPS_Staging.md`
- [x] Existe un perfil Compose de staging sin bind mounts, con loopback, healthcheck de DB y Swagger desactivado
- [ ] La imagen de staging se construye y verifica en el host reservado
- [ ] Un push a dev que pase los filtros despliega por SSH y deja API/PostgreSQL saludables; main queda fuera

---

## EP-02 · Autenticación y cuenta

Registro, inicio de sesión, sesión persistente, verificación de correo y recuperación de contraseña. El comensal puede explorar sin cuenta; la autenticación se exige solo al reservar.

_3 historias · 18 puntos_

### [x] Implementar registro, inicio de sesion, refresco y cierre de sesion

`Sprint 1` · `8 pts` · `Highest` · `backend,movil` · `RF-AUT01, RF-AUT03, RF-AUT04`

Que una persona pueda crear su cuenta y entrar a la aplicacion.

**Criterios de aceptación**

- [x] El registro pide nombre, correo, telefono y valida con el esquema compartido antes de enviar
- [x] Las contrasenas se almacenan con Argon2id
- [x] El inicio de sesion emite un token de acceso corto y un token de refresco rotatorio
- [x] El cierre de sesion invalida el token de refresco de ese dispositivo
- [x] El error de credenciales no revela cual de los dos campos fallo

### [x] Guardar el token de refresco de forma segura y renovar la sesion sin friccion

`Sprint 1` · `5 pts` · `High` · `movil` · `RNF-06, RF-AUT08`

Que la sesion sobreviva al cierre de la aplicacion sin exponer credenciales.

**Criterios de aceptación**

- [x] El token de refresco se guarda en Keystore mediante react-native-keychain
- [x] Un interceptor renueva el token de acceso de forma transparente al recibir 401
- [x] Si el refresco falla, la aplicacion vuelve al inicio de sesion sin perder el contexto
- [x] El comensal puede navegar carta y noticias sin sesion iniciada

### Implementar verificacion de correo y recuperacion de contrasena

`Sprint 5` · `5 pts` · `Medium` · `backend,movil` · `RF-AUT02, RF-AUT05`

Agregar verificación de correo y recuperación de contraseña, fuera del alcance del Sprint 1.

**Criterios de aceptación**

- El registro envia un codigo de verificacion por correo
- La recuperacion envia un codigo con reenvio temporizado
- Los codigos expiran y son de un solo uso
- El correo se envia con Resend

---

## EP-03 · Carta digital

Consulta de la carta por parte del comensal. La carta depende de la fecha: muestra los platos habilitados para el día que se consulte, no una lista fija.

_6 historias · 34 puntos_

### Mostrar la carta agrupada por categorias

`Sprint 2` · `8 pts` · `Highest` · `movil` · `RF-MEN01, RF-MEN06`

Que el comensal recorra la carta con comodidad y llegue al detalle en un toque.

**Criterios de aceptación**

- Las categorias activas aparecen en el orden configurado
- Cada plato muestra foto, nombre, descripcion breve y precio en COP
- La lista esta virtualizada y se desplaza con fluidez con al menos 100 platos
- Los platos no disponibles para la fecha consultada se presentan atenuados y con insignia

### Presentar en el inicio los platos del proximo dia de atencion

`Sprint 2` · `5 pts` · `Highest` · `movil` · `RF-MEN02`

Que al abrir la aplicacion se sepa cuando abren y que habra de comer.

**Criterios de aceptación**

- La cabecera indica el proximo dia de atencion con su horario
- Se listan los platos habilitados para esa fecha
- Se puede cambiar la fecha consultada y la carta se actualiza
- Si la fecha esta cerrada, se explica y se ofrece la siguiente fecha abierta

### Construir el detalle de plato con galeria de hasta 10 fotos

`Sprint 2` · `5 pts` · `High` · `movil` · `RF-MEN03`

Presentar el plato con la mayor fuerza visual posible.

**Criterios de aceptación**

- La galeria admite hasta 10 fotos en relacion 4:3, con indicador de posicion
- Se muestran descripcion extendida, etiquetas dietarias y alergenos
- La pantalla se ve correcta cuando se abre en frio desde un enlace externo
- El retroceso lleva a la carta y no cierra la aplicacion

### Exponer la API de menu

`Sprint 2` · `5 pts` · `High` · `backend` · `RF-MEN01 a RF-MEN06`

Servir la carta al cliente movil resolviendo la disponibilidad por fecha.

**Criterios de aceptación**

- GET de categorias, platos y etiquetas con paginacion
- El endpoint acepta una fecha y devuelve la disponibilidad resuelta para ese dia
- Las respuestas estan documentadas en Swagger
- Los esquemas de validacion se comparten con el cliente desde packages/shared

### Agregar busqueda, filtros y favoritos

`Sprint 5` · `8 pts` · `Medium` · `movil,backend` · `RF-MEN04, RF-MEN05, RF-MEN07`

Facilitar encontrar un plato en una carta larga.

**Criterios de aceptación**

- La busqueda opera sobre nombre e ingrediente declarado
- Los filtros cubren categoria, etiqueta dietaria y rango de precio
- El comensal marca y consulta favoritos
- Existen estados de busqueda vacia y sin resultados

### Guardar la carta para lectura sin conexion

`Sprint 5` · `3 pts` · `Medium` · `movil` · `RF-MEN08, C-17`

Que la aplicacion sirva en zona rural con senal debil.

**Criterios de aceptación**

- La ultima carta consultada se guarda en MMKV
- Sin conexion se muestra lo guardado con aviso de posible desactualizacion
- La estrategia es solo lectura: no se encolan escrituras

---

## EP-04 · Administración de carta y calendario

Todo lo que el dueño mantiene para que la carta y el calendario reflejen la operación real: categorías, platos, fotos, disponibilidad por fecha y días de atención.

_4 historias · 32 puntos_

### Administrar categorias y platos

`Sprint 2` · `8 pts` · `Highest` · `movil,backend` · `RF-ADM01, RF-ADM02, RF-ADM04`

Que el dueno mantenga la carta sin depender de terceros.

**Criterios de aceptación**

- Se pueden crear, editar, desactivar y reordenar categorias
- Se pueden crear y editar platos con todos sus campos
- La disponibilidad general de un plato se alterna desde la lista, sin abrir el detalle
- Un plato con favoritos o lineas de pedido se desactiva en lugar de eliminarse, y se informa

### Cargar y procesar fotografias de platos

`Sprint 2` · `8 pts` · `High` · `backend` · `RF-ADM02, C-7`

Resolver el almacenamiento de imagenes y dejar lista la variante para compartir.

**Criterios de aceptación**

- Se admiten hasta 10 fotos por plato, reordenables, con una marcada como principal
- La imagen se comprime con sharp en el backend antes de almacenarse
- Se genera una variante de 1200x630 px por debajo de 600 KB para la vista previa social
- La URL de la imagen se versiona con un fragmento derivado de la fecha de actualizacion
- Una imagen demasiado pesada produce un mensaje explicativo, no un fallo silencioso

### Gestionar la disponibilidad de platos por fecha

`Sprint 2` · `8 pts` · `Highest` · `movil,backend` · `RF-ADM03, ADR-010`

Reflejar que el restaurante habilita platos especiales segun el dia.

**Criterios de aceptación**

- El dueno marca, para una fecha concreta, que platos estan habilitados
- La disponibilidad por fecha prevalece sobre la disponibilidad general del plato
- Existe la accion de copiar la seleccion de otra fecha
- La carta del comensal refleja el cambio al consultar esa fecha

### Configurar el calendario de atencion

`Sprint 2` · `8 pts` · `Highest` · `movil,backend` · `RF-ADM06, HU-05`

Representar una operacion discontinua: fines de semana, festivos y aperturas por reserva.

**Criterios de aceptación**

- Se definen reglas semanales de apertura con su horario
- Se marcan excepciones por fecha, que prevalecen sobre la regla semanal
- Un dia puede marcarse como solo por reserva
- Al cerrar un dia con reservas confirmadas, el sistema advierte cuantas se verian afectadas

---

## EP-05 · Motor de reservas

Cálculo de franjas, validación de aforo y flujo de solicitud con pedido opcional. Es el núcleo técnico del proyecto y el de mayor riesgo de concurrencia.

_8 historias · 49 puntos_

### Calcular las franjas horarias disponibles

`Sprint 3` · `8 pts` · `Highest` · `backend,movil` · `RF-RES01, RF-RES02, RF-RES17`

Ofrecer solo horarios que existen de verdad para la fecha consultada.

**Criterios de aceptación**

- Las franjas se generan a partir del calendario, la duracion y la granularidad configuradas
- Una fecha cerrada no ofrece franjas y lo explica
- En dias solo por reserva se exige el minimo de personas configurado
- Las franjas sin aforo restante se presentan como no seleccionables

### Validar el aforo dentro de una transaccion serializable

`Sprint 3` · `5 pts` · `Highest` · `backend` · `ADR-005`

Impedir que dos solicitudes concurrentes superen la capacidad del restaurante.

**Criterios de aceptación**

- La lectura de ocupacion y la insercion de la reserva ocurren en la misma transaccion
- El nivel de aislamiento es serializable o equivalente con bloqueo explicito
- Un conflicto se traduce en un mensaje de negocio, no en un error tecnico
- Existe una prueba que lanza dos solicitudes concurrentes por el ultimo cupo y verifica que solo una prospera

### Construir el flujo de reserva en cuatro pasos

`Sprint 3` · `13 pts` · `Highest` · `movil` · `RF-RES03 a RF-RES06`

Llevar al comensal desde la fecha hasta el envio de la solicitud. Subtareas sugeridas: paso 1 fecha y comensales; paso 2 franja; paso 3 pedido opcional; paso 4 resumen y envio.

**Criterios de aceptación**

- Sin sesion, el flujo desvia al inicio de sesion y regresa conservando lo seleccionado
- El paso 3 es opcional y ofrece Continuar sin pedido desde el primer momento
- El paso 3 lista solo los platos habilitados para la fecha elegida
- El paso 4 muestra el resumen, el total sin impuestos y la politica de cancelacion
- El boton final dice Enviar solicitud, no Confirmar reserva
- El boton fisico de retroceso de Android retrocede paso a paso, sin salir del flujo
- La interfaz no usa lenguaje ni patrones de comercio electronico: sin carrito ni checkout

### Calcular el total y generar el ticket de la reserva

`Sprint 3` · `5 pts` · `High` · `backend` · `RF-RES05, RF-RES18`

Producir el detalle que el dueno pegara en el grupo de cocina.

**Criterios de aceptación**

- El total es la suma de cantidad por precio unitario, sin impuestos
- El precio se copia en la linea al momento de solicitar, para que un cambio de carta no altere reservas emitidas
- El ticket se genera en texto plano legible, con codigo, fecha, franja, comensales y detalle
- Una reserva sin pedido tambien genera ticket, sin lineas

### Disenar la pantalla de solicitud enviada con instrucciones de pago

`Sprint 3` · `3 pts` · `Highest` · `movil` · `RF-RES07`

Dejar claro que la reserva todavia no esta confirmada y que falta un paso humano.

**Criterios de aceptación**

- Se muestra el codigo de reserva, seleccionable y copiable
- Se presentan las instrucciones de pago con monto, medios y numero del dueno
- La accion principal abre WhatsApp con un mensaje prellenado que incluye el codigo
- Un aviso explica que la reserva queda confirmada cuando el restaurante verifique el pago
- El icono y el titulo comunican envio, no exito

### Implementar la maquina de estados de la reserva

`Sprint 3` · `5 pts` · `High` · `backend` · `Sprint0 §9.4`

Centralizar las transiciones validas en el servicio de dominio.

**Criterios de aceptación**

- Las transiciones siguen el diagrama de Sprint0 §9.4
- Una transicion invalida se rechaza con un error de negocio explicito
- La validacion vive en el servicio de dominio, no en el controlador ni en la interfaz
- Hay pruebas unitarias por cada transicion valida e invalida

### Construir mis reservas, detalle y cancelacion

`Sprint 3` · `5 pts` · `High` · `movil,backend` · `RF-RES11, RF-RES12`

Que el comensal siga el estado de su solicitud y pueda desistir a tiempo.

**Criterios de aceptación**

- La lista separa proximas e historial, con las solicitudes pendientes arriba
- El detalle muestra el estado, el codigo, el pedido y el motivo de rechazo si aplica
- Se puede cancelar hasta una hora antes de la reserva
- Fuera de la ventana, la accion aparece deshabilitada explicando el motivo

### Permitir adicionar platos a una reserva aprobada

`Sprint 5` · `5 pts` · `Low` · `movil,backend` · `RF-RES15, RF-RES16`

Cubrir el caso real de que el cliente quiera pedir algo mas.

**Criterios de aceptación**

- Se pueden agregar lineas a una reserva CONFIRMADA
- Se calcula y muestra el excedente a pagar
- Se admite cambio por plato de igual o mayor precio, sin reembolso
- El dueno ve la adicion reflejada en la solicitud y puede volver a copiar el ticket

---

## EP-06 · Aprobación y operación del servicio

Lo que hace el dueño y el personal: revisar solicitudes, aprobar o rechazar tras verificar el pago, copiar el ticket para la cocina y operar la agenda durante el servicio.

_2 historias · 13 puntos_

### Construir la bandeja de solicitudes con aprobacion y rechazo

`Sprint 3` · `8 pts` · `Highest` · `movil,backend` · `RF-RES09, RF-ADM08, RF-ADM11`

Que el dueno resuelva las solicitudes desde el telefono, entre servicio y servicio.

**Criterios de aceptación**

- Las solicitudes se listan ordenadas por fecha de reserva, con comensales, pedido y total
- Se muestra el numero de cancelaciones previas del usuario como alerta discreta
- Aprobar cambia el estado a CONFIRMADA y notifica al comensal
- Rechazar exige un motivo, cambia el estado a RECHAZADA y notifica con ese motivo
- Las solicitudes proximas a expirar se resaltan

### Construir la agenda del dia y el marcado de llegada

`Sprint 3` · `5 pts` · `High` · `movil,backend` · `RF-ADM09, RF-ADM10`

Dar al personal una vista operable durante el servicio.

**Criterios de aceptación**

- Las reservas del dia se listan por hora, con nombre, comensales, estado y nota
- La accion Llego cambia el estado a EN_CURSO
- Las reservas que pasan la tolerancia se senalan como candidatas a inasistencia
- La pantalla es legible a 50 cm de distancia y con poca luz

---

## EP-07 · Noticias y contenido

Muro de publicaciones con imagen, texto y enlaces, más la pantalla Proximamente. Para este cliente la comunicacion pesa tanto como la reserva.

_4 historias · 21 puntos_

### Construir el muro de noticias y su detalle

`Sprint 4` · `5 pts` · `High` · `movil` · `RF-NOT01, RF-NOT02, RF-NOT04`

Dar al restaurante un canal propio para anunciar dias de atencion y eventos.

**Criterios de aceptación**

- Las publicaciones se listan en orden cronologico inverso
- La publicacion fijada aparece arriba con distintivo
- El detalle muestra imagen, texto completo y enlaces externos pulsables
- Existe estado vacio y caché para lectura sin conexion

### Administrar noticias

`Sprint 4` · `8 pts` · `High` · `movil,backend` · `RF-NOT03, RF-NOT04`

Que el dueno publique sin ayuda tecnica.

**Criterios de aceptación**

- Se puede crear, editar, publicar y despublicar una noticia
- Se admite imagen, texto y una lista de enlaces
- Se puede fijar una publicacion en la parte superior
- Los borradores no son visibles para el comensal

### Construir la pantalla Proximamente

`Sprint 4` · `3 pts` · `Low` · `movil` · `RF-INF06`

Anticipar la pista de motos y la zona de pesca sin prometer fechas.

**Criterios de aceptación**

- Dos tarjetas informativas con fotografia, titulo y descripcion
- Insignia Proximamente visible en cada tarjeta
- Nota al pie que invita a consultar por WhatsApp
- Ningun control parece pulsable si no lleva a ningun lado

### Construir la pantalla de informacion y mapa

`Sprint 4` · `5 pts` · `Medium` · `movil` · `RF-INF01, RF-INF02, RF-INF03`

Que el comensal sepa donde queda el restaurante y como llegar.

**Criterios de aceptación**

- El mapa se renderiza con MapLibre y muestra el marcador del restaurante
- Se presentan direccion, telefono y calendario de atencion con el proximo dia resaltado
- La accion Como llegar abre la aplicacion de mapas del dispositivo
- Existe la accion de escribir por WhatsApp, y una nota sobre la zona Mirador

---

## EP-08 · Difusion, capa web y deep links

Capa web con metadatos Open Graph para que un plato compartido por WhatsApp se vea con su fotografia, y App Links para que el enlace abra la aplicacion.

_6 historias · 32 puntos_

### Publicar la capa web con la pagina de plato renderizada en servidor

`Sprint 4` · `8 pts` · `Highest` · `web` · `RF-INF04, ADR-004`

Habilitar la vista previa de WhatsApp, que no funciona con renderizado en cliente.

**Criterios de aceptación**

- La ruta /plato/[slug] se renderiza en servidor
- La pagina consulta los datos del plato por slug
- Existe tambien /noticia/[id]
- La pagina invita a instalar la aplicacion cuando el visitante no la tiene

### Configurar los metadatos Open Graph y verificar la vista previa

`Sprint 4` · `5 pts` · `Highest` · `web` · `RF-INF04`

Que la tarjeta de WhatsApp muestre la fotografia del plato.

**Criterios de aceptación**

- La pagina expone og:title, og:description y og:image
- La imagen es la variante de 1200x630 px por debajo de 600 KB
- La URL de la imagen esta versionada para sortear el cache de WhatsApp
- La vista previa se verifica con la herramienta de depuracion y con un envio real

### Desplegar la capa web en Vercel con dominio y HTTPS

`Sprint 4` · `3 pts` · `High` · `web,infra`

Tener una URL publica estable para compartir y para alojar la APK.

**Criterios de aceptación**

- El despliegue se dispara desde el repositorio
- El dominio responde por HTTPS con certificado gestionado
- La ruta de descarga de la APK esta prevista

### Agregar la accion de compartir en el detalle de plato

`Sprint 4` · `3 pts` · `Medium` · `movil` · `RF-INF04`

Permitir recomendar un plato desde la aplicacion.

**Criterios de aceptación**

- La accion abre la hoja de compartir del sistema
- El texto incluye el nombre del plato y el enlace publico
- La accion se oculta cuando el plato no esta disponible

### Configurar Android App Links

`Sprint 4` · `8 pts` · `High` · `movil,web` · `RF-INF05`

Que el enlace compartido abra la aplicacion en lugar del navegador.

**Criterios de aceptación**

- assetlinks.json esta publicado en el dominio
- El intent-filter esta declarado con autoVerify
- Estan registradas las huellas SHA-256 de los certificados de depuracion y de publicacion
- La verificacion se comprueba en un dispositivo fisico

### Enrutar los enlaces entrantes hacia la pantalla correspondiente

`Sprint 4` · `5 pts` · `Medium` · `movil` · `RF-INF05`

Que el enlace lleve al detalle exacto y no a la pantalla de inicio.

**Criterios de aceptación**

- Un enlace de plato abre P-02 con ese plato
- Un enlace de noticia abre P-12
- Si la aplicacion estaba cerrada, el enrutamiento funciona igual
- El retroceso desde una apertura en frio lleva a la pestana correspondiente

---

## EP-09 · Notificaciones

Avisos al comensal y al dueno, por push y por correo, incluso con la aplicacion cerrada. Incluye recordatorios y procesos programados de expiracion e inasistencia.

_6 historias · 29 puntos_

### Integrar FCM y registrar el dispositivo

`Sprint 5` · `5 pts` · `Highest` · `movil,backend` · `RF-INF07`

Establecer el canal de notificaciones push.

**Criterios de aceptación**

- El token de push se registra al iniciar sesion y se actualiza al renovarse
- google-services.json esta configurado y fuera del control de versiones
- Notifee presenta las notificaciones con canales diferenciados
- Si el permiso fue denegado, la aplicacion explica como habilitarlo

### Notificar al dueno la llegada de una solicitud

`Sprint 5` · `8 pts` · `Highest` · `backend,movil` · `RF-RES08`

Que el dueno se entere sin tener que abrir la aplicacion.

**Criterios de aceptación**

- La notificacion push llega con la aplicacion cerrada
- Se envia tambien un correo con el detalle de la solicitud
- Al pulsar la notificacion se abre la bandeja de solicitudes en esa reserva
- Si hay varias cuentas con rol de dueno, todas reciben el aviso

### Notificar al comensal la aprobacion o el rechazo

`Sprint 5` · `3 pts` · `Highest` · `backend,movil` · `RF-RES10`

Cerrar el ciclo de espera del comensal.

**Criterios de aceptación**

- La aprobacion genera notificacion con fecha, franja y codigo
- El rechazo genera notificacion con el motivo indicado por el dueno
- Al pulsar la notificacion se abre el detalle de la reserva

### Programar el recordatorio previo a la reserva

`Sprint 5` · `5 pts` · `High` · `backend` · `RF-RES14`

Reducir la inasistencia.

**Criterios de aceptación**

- El recordatorio se programa en el servidor, no en el dispositivo
- Se envia con la anticipacion configurada e incluye franja, comensales y codigo
- Una reserva cancelada o rechazada no genera recordatorio
- El envio queda registrado en la tabla de notificaciones

### Expirar solicitudes sin aprobar y marcar inasistencias

`Sprint 5` · `5 pts` · `High` · `backend` · `RF-RES13, RF-RES14`

Evitar que la bandeja del dueno se llene de solicitudes muertas.

**Criterios de aceptación**

- Una tarea programada expira las solicitudes que superan el plazo configurado
- Otra tarea marca NO_ASISTIO tras los 30 minutos de tolerancia
- El comensal recibe aviso cuando su solicitud expira
- Las tareas son idempotentes y no reprocesan registros ya resueltos

### Permitir administrar las preferencias de notificacion

`Sprint 5` · `3 pts` · `Low` · `movil,backend` · `RF-INF08`

Dar control sobre que avisos se reciben.

**Criterios de aceptación**

- El usuario activa o desactiva cada tipo de notificacion
- Las preferencias se respetan en el envio
- Las notificaciones de reserva propia no pueden desactivarse por completo

---

## EP-10 · Seguridad y control de acceso

Guardias por rol, segundo factor TOTP sobre acciones sensibles y bitacora de acciones administrativas.

_2 historias · 11 puntos_

### [x] Proteger los endpoints con guardia de roles

`Sprint 1` · `3 pts` · `High` · `backend` · `RNF-08, ADR-006`

Que la autorizacion viva en el servidor y no dependa de la interfaz.

**Criterios de aceptación**

- [x] Existe RolesGuard aplicable por endpoint
- [x] Los roles COMENSAL, STAFF y ADMIN estan diferenciados
- [x] Un usuario sin rol suficiente recibe 403, aunque la pantalla estuviera visible
- [x] Hay una prueba que verifica el rechazo por rol insuficiente

La guardia y su rechazo 403 están probados. A medida que se incorporen módulos funcionales en los sprints siguientes, cada endpoint administrativo debe declarar explícitamente sus roles permitidos; el módulo de menú aún no está cerrado.

### Implementar TOTP y proteger las acciones sensibles

`Sprint 5` · `8 pts` · `High` · `backend,movil` · `RF-AUT06, RF-AUT07`

Reducir el riesgo de una sesion de dueno comprometida.

**Criterios de aceptación**

- El dueno activa el segundo factor escaneando un codigo QR con una aplicacion TOTP
- El secreto se cifra en reposo y se generan codigos de respaldo de un solo uso
- Las acciones sensibles exigen un codigo vigente: cambio de rol, calendario, eliminaciones y cancelacion masiva
- Tres codigos invalidos consecutivos aplican espera creciente y quedan en bitacora

---

## EP-11 · Calidad, entrega y sustentacion

Integracion continua, pruebas, estabilizacion, documentacion y preparacion de la sustentacion academica.

_12 historias · 51 puntos_

### Cubrir con pruebas la resolucion de disponibilidad por fecha

`Sprint 2` · `3 pts` · `Medium` · `backend,calidad` · `RNF-12`

Blindar la regla de precedencia, que es facil de romper sin darse cuenta.

**Criterios de aceptación**

- Hay pruebas para plato habilitado solo por fecha, deshabilitado solo por fecha y sin registro
- Hay una prueba que verifica que la carta filtra por la fecha elegida y no por la del dia actual
- Las pruebas corren en local con una base de datos de prueba

### Cubrir con pruebas el aforo y las transiciones de estado

`Sprint 3` · `5 pts` · `Medium` · `backend,calidad` · `RNF-12`

Proteger las dos reglas donde la generacion asistida falla con mas frecuencia.

**Criterios de aceptación**

- Hay pruebas de concurrencia sobre el aforo
- Hay pruebas de todas las transiciones de la maquina de estados
- Hay pruebas de integracion sobre los endpoints de solicitud y aprobacion
- El reporte de cobertura se genera en local

### Disenar los estados vacios, de carga y de error de toda la aplicacion

`Sprint 5` · `5 pts` · `Medium` · `movil` · `RNF-09, RNF-10`

Cerrar el punto que mas retrabajo genera si se deja para el final.

**Criterios de aceptación**

- Las nueve variantes de estado vacio del brief estan implementadas
- Los estados de carga usan esqueleto de contenido
- Existe un limite de error global mas estados de error por consulta
- Todo control deshabilitado explica por que lo esta

### Ejecutar pruebas de recorrido completo en dispositivos fisicos

`Sprint 6` · `5 pts` · `Highest` · `calidad`

Verificar los caminos criticos sobre hardware real antes de entregar.

**Criterios de aceptación**

- Se recorren registro, consulta de carta, reserva con y sin pedido, cancelacion, aprobacion y publicacion de noticia
- Las pruebas se ejecutan en al menos dos dispositivos fisicos distintos
- Los defectos encontrados quedan registrados en Jira con su severidad

### Corregir defectos priorizados por severidad

`Sprint 6` · `8 pts` · `Highest` · `calidad`

Estabilizar el producto. La funcionalidad nueva queda congelada desde el 6 de noviembre.

**Criterios de aceptación**

- Los defectos bloqueantes y criticos quedan resueltos
- Cada correccion se verifica sobre dispositivo
- No se integra funcionalidad nueva durante el sprint

### Medir los requisitos no funcionales

`Sprint 6` · `3 pts` · `Medium` · `calidad` · `RNF-01, RNF-02`

Obtener evidencia de que el producto cumple lo declarado.

**Criterios de aceptación**

- Se mide el tiempo de carga de la carta y la latencia de la API
- Se registran el tamano del paquete y el consumo de memoria
- Los resultados quedan documentados para la sustentacion

### Generar la APK firmada y publicarla

`Sprint 6` · `3 pts` · `Highest` · `infra` · `C-13, C-14`

Dejar el producto instalable para el cliente.

**Criterios de aceptación**

- La APK se firma con el almacen de claves propio
- Se distribuye por Firebase App Distribution y queda disponible en la web del restaurante
- Se documentan las instrucciones de instalacion

### Completar la documentacion tecnica final

`Sprint 6` · `5 pts` · `High` · `documentacion`

Dejar el repositorio comprensible para alguien externo.

**Criterios de aceptación**

- Cada proyecto tiene su README actualizado
- La especificacion OpenAPI esta exportada
- Existe un diagrama de despliegue
- Los ADR reflejan las decisiones finales

### Redactar el manual de usuario para comensal y dueno

`Sprint 6` · `3 pts` · `Medium` · `documentacion`

Que el cliente pueda operar la aplicacion sin acompanamiento.

**Criterios de aceptación**

- Guia breve del comensal: consultar carta, reservar, enviar comprobante
- Guia breve del dueno: aprobar solicitudes, copiar ticket, publicar noticias, marcar calendario

### Realizar la sesion de validacion con el cliente

`Sprint 6` · `3 pts` · `High` · `cliente`

Cerrar el ciclo con quien va a usar el producto.

**Criterios de aceptación**

- El dueno instala la aplicacion en su telefono
- Publica una noticia y aprueba una reserva sin acompanamiento
- Las observaciones quedan registradas

### Preparar la presentacion de sustentacion

`Sprint 6` · `5 pts` · `Highest` · `documentacion`

Preparar la defensa academica del proyecto.

**Criterios de aceptación**

- La presentacion cubre problema, solucion, arquitectura, decisiones y demostracion
- Se incluyen las alternativas descartadas y su motivo
- Se ensaya la demostracion en vivo

### Realizar el repaso tecnico cruzado del equipo

`Sprint 6` · `3 pts` · `Highest` · `equipo`

Preparar los parciales, donde cada integrante debe explicar el codigo.

**Criterios de aceptación**

- Cada integrante prepara la explicacion de dos modulos que no construyo
- Se realiza una sesion de preguntas cruzadas
- Los puntos flojos detectados se documentan y se repasan

---

## Cómo importar en Jira

1. Ir a **Configuración del proyecto → Importar** (o _System → External System Import → CSV_ si tienes permisos de administrador).
2. Subir `Backlog_Jira.csv`. La codificación es UTF-8 con BOM y el separador es la coma.
3. Mapear las columnas: `Issue Type`, `Summary`, `Epic Name`, `Epic Link`, `Description`, `Story Points`, `Sprint`, `Priority`, `Labels`.
4. Importar **primero solo las filas de tipo Epic** si tu instancia no resuelve `Epic Link` por nombre en la misma pasada; luego el resto.
5. Los valores de `Sprint` (`Sprint 1` … `Sprint 6`) deben coincidir con los nombres de los sprints del tablero. Si aún no existen, créalos antes de importar o deja la columna sin mapear y asígnalos después arrastrando desde el backlog.
6. `Story Points` requiere que el campo esté habilitado en el tipo de incidencia. En proyectos gestionados por equipo puede llamarse _Estimación_.

**Nota.** Si el proyecto es de tipo _gestionado por equipo_ (team-managed), la jerarquía de épicas usa el campo **Parent** en lugar de `Epic Link`. En ese caso, renombra la columna `Epic Link` a `Parent` tras crear las épicas y sustituye el nombre por la clave de cada épica (por ejemplo `ENC-1`).
