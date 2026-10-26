# Especificación de Requisitos del Sistema (ERS)

### Aplicación Móvil y Plataforma de Gestión — El Encanto Campestre

**Cliente:** El Encanto Campestre · Vereda Las Huacas, Timbío, Cauca  
**Asignatura:** Electiva V · Desarrollo Móvil (agosto – noviembre 2026)  
**Versión:** 1.2 · **Fecha:** 16 de octubre de 2026
**Documentos base:** `Sprint0_Analisis_y_Diseno.md` v0.2 · `Decisiones_Pendientes_y_Riesgos.md` v0.7 · `Plan_de_Sprints.md` · `Backlog_Jira.md` v0.1

**Cambio solicitado el 16 de octubre:** Google como único proveedor y bloqueo global antes de iniciar sesión; Ajustes se dividirá en subpantallas. El 26/10 registramos los criterios en EC-75, Por hacer/backlog, responsable Alex, después de estabilizar dev; falta implementación y reconciliar EC-58. El inicio de sesión correo/contraseña construido en Sprint 1 sigue siendo el implementado hasta validar su sustitución. Pendiente actualizar requisitos en Drive y Word local: RF-AUT01/02/03/05/08 y Ajustes; sección 8/responsables, continuidad de Alex. No modificamos las copias manuales por editar este archivo.

---

## 1. Ficha Técnica y Alcance del Sistema

### 1.1 Ficha del Proyecto

| Parámetro                | Definición                                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Sistema**              | Aplicación móvil para comensales y personal, panel administrativo embebido y capa web de difusión                    |
| **Organización**         | El Encanto Campestre — Sede única campestre en Timbío, Cauca                                                         |
| **Plataforma Cliente**   | Android nativo (bare React Native 0.87, Nueva Arquitectura, motor Hermes). Orientación vertical fija                 |
| **Arquitectura Backend** | API REST modular en NestJS (`/api/v1`), TypeScript, PostgreSQL en Supabase, ORM Prisma, contenedor Docker en VPS     |
| **Capa Web**             | Next.js en Vercel con Server-Side Rendering para Open Graph y Android App Links                                      |
| **Persistencia Móvil**   | MMKV (lectura sin conexión) y Android Keystore mediante `react-native-keychain` (tokens seguros)                     |
| **Diseño Visual**        | Sistema de diseño propio (verde militar `#4A5D3A`, acento `#A2632E`, fondo `#F6F5F1`), WCAG AA, 5 tabs de navegación |

### 1.2 Delimitación del Alcance

#### Dentro del Alcance

- Navegación de carta digital con fotos comprimidas en backend, alérgenos y disponibilidad condicionada por fecha.
- Motor de reservas con cálculo de franjas horarias y control de aforo por franja en transacción serializable.
- Módulo de pedido anticipado integrado a la reserva (obligatorio para grupos de 8 o más personas; opcional para menores).
- Generación de ticket de reserva formateado para copia directa a la cocina.
- Flujo de confirmación manual por el dueño tras verificación de pago externo enviado por WhatsApp.
- Muro de noticias y novedades del restaurante con opción de fijado.
- Pantalla informativa "Próximamente" para pista de motos y zona de pesca deportiva.
- Difusión de platos hacia WhatsApp con tarjeta interactiva (Open Graph) y apertura nativa por Android App Links.
- Notificaciones push (FCM) y correos transaccionales (Resend) para comensal y dueño.
- Panel administrativo embebido para gestión de platos, categorías, calendario, solicitudes, agenda y parámetros.
- Segundo factor de autenticación (TOTP) para acciones sensibles del dueño.

#### Fuera del Alcance (Exclusiones Explícitas)

- **Procesamiento de pagos en la app:** No integramos pasarelas ni validación bancaria automática. El dueño configura manualmente los medios externos (efectivo, Nequi, llave de transferencia u otros), sus datos e instrucciones y el WhatsApp de contacto desde el panel; no guardamos PIN ni contraseñas bancarias. Publicar esos datos no confirma reservas.
- **Plataforma iOS:** Se utiliza código portable en React Native, pero el soporte, compilación y pruebas en iOS quedan excluidos.
- **Reserva en app de la zona VIP "Mirador":** Por tener capacidad reducida (máximo 10 personas + 2 niños) y requerir tarifa de servicio adicional, su reserva se canaliza exclusivamente por WhatsApp.
- **Asignación automatizada de mesas individuales:** El sistema reserva aforo por franja horaria. La asignación física y combinación de mesas (hasta 40 personas) es responsabilidad operativa del personal en sala.

---

## 2. Actores del Sistema

| Actor                       | Descripción y Nivel de Acceso                                                                                                                                                                         | Método de Autenticación                                                         |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Visitante**               | Usuario sin sesión. Solo puede ver la pantalla de acceso; no entra a carta, noticias, reservas ni otros servicios de la app.                                                                         | Debe iniciar sesión con Google                                                 |
| **Comensal**                | Cliente autenticado. Crea solicitudes de reserva con pedido, consulta su historial, cancela reservas vigentes, marca favoritos y configura preferencias de notificación.                              | Google; la API valida la identidad y emite la sesión propia                    |
| **Personal (Staff)**        | Empleado autorizado. Consulta la agenda operativa del día, filtra reservas confirmadas y registra el check-in o inasistencia de comensales.                                                        | Google vinculado a una cuenta con rol `STAFF` asignado en servidor               |
| **Dueño (Administrador)**   | Propietario autorizado. Aprueba o rechaza solicitudes, gestiona carta/disponibilidad/calendario/noticias y modifica parámetros operativos.                                                         | Google vinculado a rol `ADMIN`, más TOTP en acciones críticas                   |
| **Sistema (Cron / Daemon)** | Procesos automatizados del backend para expiración de solicitudes sin comprobar, disparo de recordatorios y marcado de inasistencias por tolerancia.                                                  | Clave interna de servicio / JWT de sistema                                      |

---

## 3. Reglas de Negocio Vinculantes (RN)

Las siguientes reglas, acordadas en el proceso de toma de decisiones, son de cumplimiento estricto en los servicios del sistema:

- **RN-01 (Duración de Reserva):** duración configurable de 90 minutos para grupos de hasta 4 personas y 120 minutos para grupos de 5 o más personas.
- **RN-02 (Granularidad y Franjas):** Los horarios de servicio y las franjas horarias son dinámicos, configurados por el administrador en la base de datos (no constantes fijas en el código).
- **RN-03 (Tolerancia de Llegada):** Margen máximo de 30 minutos sobre la hora reservada. Superado el margen sin check-in, el sistema marca `NO_ASISTIO`. No hay reembolsos por inasistencia.
- **RN-04 (Ventana de Cancelación):** El comensal puede cancelar una reserva confirmada mientras falten al menos 60 minutos para la franja pactada; exactamente a 60 minutos todavía puede hacerlo.
- **RN-05 (Anticipación de Reserva):** La fecha puede reservarse hasta 3 meses calendario desde hoy. La franja debe comenzar al menos 60 minutos después de la solicitud. No hay corte fijo a las 13:00; con menos de 60 minutos se deriva a atención presencial directa.
- **RN-06 (Pedido Anticipado Obligatorio y Opcional):**
  - Si la reserva es para **8 o más personas**, la selección de platos en la app es **obligatoria** antes de generar la solicitud.
  - Para grupos de **1 a 7 personas**, el pedido de platos es **opcional**.
- **RN-07 (Política Económica y Cambios):** No hay devoluciones de dinero. Se admiten adiciones de platos a reservas aprobadas pagando el excedente, o cambios por platos de igual o mayor valor.
- **RN-08 (Capacidad y Agrupación):** El restaurante une mesas según necesidad física del salón (hasta mesas de 40 comensales). La validación del sistema se realiza sobre el aforo acumulado por franja horaria.
- **RN-09 (Ciclo de Aprobación Manual):** Toda reserva inicia en estado `SOLICITADA`. Pasa a `CONFIRMADA` únicamente cuando un dueño valida el comprobante de pago externo y la aprueba en su panel.
- **RN-10 (Canal Operativo WhatsApp):** WhatsApp actúa como canal de soporte para recepción de comprobantes de pago, coordinación de la zona VIP Mirador y envío de tickets formateados al grupo de cocina.
- **RN-11 (Alerta de Inasistencias):** El panel del dueño muestra de forma visible el historial de cancelaciones e inasistencias previas asociadas a la cuenta del comensal solicitante.
- **RN-12 (Calendario de Apertura Discontinuo, acuerdo 22/10):** domingos y festivos nacionales colombianos abren por defecto y ADMIN puede deshabilitarlos. Sábados y otros días requieren apertura explícita. Cada día combina Restaurante, Pesca y/o Motos, horario general y nota pública. Solo Restaurante permite reservar mesas. Retiramos el mínimo de quince personas entre semana: en fechas sin Restaurante se ofrece contacto por WhatsApp para coordinar, sin confirmar apertura ni reserva.
- **RN-13 (Zona VIP Mirador):** Capacidad máxima de 10 adultos más 2 niños con tarifa de servicio adicional. Se gestiona fuera de la app mediante enlace directo a WhatsApp.
- **RN-14 (Moneda e Impuestos):** Todos los valores monetarios se expresan en Pesos Colombianos (COP) sin decimales, con separador de miles. No se desglosa ni cobra IVA/impoconsumo en la aplicación.
- **RN-15 (Administradores, inamovible):** mantenemos al menos tres administradores activos. Retirar permisos, desactivar o eliminar no puede reducir ese mínimo, tampoco con operaciones concurrentes. Primero designamos reemplazos con cuentas reales. Una instalación anterior con menos de tres solo puede aumentar su número. Retirar permisos conserva cuenta e historial; no se inventan administradores para cumplir el conteo.

---

## 4. Requisitos Funcionales (RF)

_Priorización MoSCoW: **[M]** Must have (Imprescindible) · **[S]** Should have (Deseable) · **[C]** Could have (Opcional)._

### 4.1 Módulo de Autenticación y Cuenta (AUT)

| ID           | Nombre del Requisito          | Descripción y Regla Operativa                                                                                                                 | Prioridad |  Sprint  | Ref. Jira |
| ------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | :-------: | :------: | --------- |
| **RF-AUT01** | Alta o vínculo de cuenta       | Crear o vincular la cuenta a partir de la identidad Google verificada. No se registra ni almacena una contraseña propia; el teléfono se completa cuando sea necesario para reservar.                |   **M**   | Sprint 5 | EP-02     |
| **RF-AUT02** | Verificación de correo        | Pendiente de revisar en Jira: no añadimos verificación propia si la identidad Google ya quedó verificada; cualquier comprobación se basa en la respuesta de Google. | **S** | Revisar | EP-02 |
| **RF-AUT03** | Inicio Google y tokens        | Aceptar Google como único proveedor; la API verifica el token de identidad y emite JWT de acceso (15 min) y refresco rotatorio (7 días), resguardado en Keystore. No confiamos identidad ni rol enviados por el cliente. | **M** | Sprint 5 | EP-02 |
| **RF-AUT04** | Cierre de sesión              | Revocación inmediata del token de refresco en la base de datos y eliminación del almacenamiento seguro en el dispositivo móvil.               |   **M**   | Sprint 1 | EP-02     |
| **RF-AUT05** | Recuperación de contraseña    | Pendiente de revisar en Jira: la contraseña pertenece a Google; no construimos una recuperación de contraseña propia mientras Google sea el único proveedor.        | **S** | Revisar | EP-02 |
| **RF-AUT06** | Configuración de 2FA TOTP     | Vinculación de segundo factor mediante aplicación de autenticación (Google Authenticator) exclusiva para usuarios con rol de Dueño (`ADMIN`). |   **S**   | Sprint 5 | EP-10     |
| **RF-AUT07** | Guardia de acciones sensibles | Exigencia de token TOTP válido al dueño antes de ejecutar acciones de alto impacto (modificar parámetros globales, borrar cuentas).           |   **S**   | Sprint 5 | EP-10     |
| **RF-AUT08** | Acceso global con sesión      | Sin sesión solo se muestra el acceso Google. Las cinco pestañas, servicios y enlaces profundos esperan autenticación; cerrar sesión elimina los tokens locales y vuelve al acceso. La API conserva sus propias guardias. | **M** | Sprint 5 | EP-02 |
| **RF-AUT09** | Advertencia de caducidad      | Diálogo modal interactivo que avisa 2 minutos antes de que expire la sesión si la aplicación se encuentra en primer plano activo.             |   **S**   | Sprint 5 | EP-02     |

### 4.2 Módulo de Carta Digital y Disponibilidad (MEN)

| ID           | Nombre del Requisito          | Descripción y Regla Operativa                                                                                                           | Prioridad |  Sprint  | Ref. Jira |
| ------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | :-------: | :------: | --------- |
| **RF-MEN01** | Visualización de carta        | Platos por categorías en bloques de tres carruseles horizontales, con cambio manual y acceso a todas las categorías. Foto 4:3, nombre, descripción, COP y acción para añadir al borrador Mi Pedido. | **M** | Sprint 2 | EP-03 |
| **RF-MEN02** | Platos del próximo día hábil  | La pantalla principal de inicio presenta automáticamente los platos disponibles para la fecha de atención más próxima en el calendario. |   **M**   | Sprint 2 | EP-03     |
| **RF-MEN03** | Ficha de detalle de plato     | Pantalla extendida con carrusel de hasta 10 fotos optimizadas, descripción completa, tabla de alérgenos y sellos dietarios.             |   **M**   | Sprint 2 | EP-03     |
| **RF-MEN04** | Búsqueda por ingredientes     | Motor de búsqueda de texto predictivo por nombre de plato e ingredientes declarados en su ficha.                                        |   **M**   | Sprint 5 | EP-03     |
| **RF-MEN05** | Filtros de catálogo           | Filtrado combinado por categoría, etiquetas dietarias (vegetariano, libre de gluten) y rango de precios.                                |   **S**   | Sprint 5 | EP-03     |
| **RF-MEN06** | Distintivo de no disponible   | Indicador visual atenuado con etiqueta "No disponible para esta fecha" cuando el plato esté desactivado para el día seleccionado.       |   **M**   | Sprint 2 | EP-03     |
| **RF-MEN07** | Platos favoritos              | Marcado local/remoto de platos preferidos para acceso rápido desde el perfil del comensal.                                              |   **S**   | Sprint 5 | EP-03     |
| **RF-MEN08** | Lectura de carta sin conexión | Almacenamiento local mediante MMKV de la última carta consultada para permitir exploración en zonas rurales sin cobertura de datos.     |   **S**   | Sprint 5 | EP-03     |

### 4.3 Módulo de Motor de Reservas y Pedidos (RES)

| ID           | Nombre del Requisito            | Descripción y Regla Operativa                                                                                                                | Prioridad |  Sprint  | Ref. Jira |
| ------------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | :-------: | :------: | --------- |
| **RF-RES01** | Selección de fecha hábil        | Calendario mensual con días, actividades combinables, horario y notas publicados. Solo fechas abiertas con Restaurante permiten consultar franjas para mesas; Pesca/Motos son informativas. | **M** | Sprint 3 | EP-05 |
| **RF-RES02** | Cálculo y validación de franjas | Generación dinámica de franjas disponibles y control de aforo por franja mediante transacción con aislamiento `SERIALIZABLE`.                |   **M**   | Sprint 3 | EP-05     |
| **RF-RES03** | Selección de comensales         | Número de personas validado por aforo libre; sin mínimo especial entre semana. Se conserva pedido obligatorio desde ocho personas. | **M** | Sprint 3 | EP-05 |
| **RF-RES04** | Pedido anticipado de platos     | Mi Pedido editable desde carta y reserva, con cantidades, eliminación y total estimado. Revalidamos precios/disponibilidad para la fecha elegida y al enviar. Obligatorio desde ocho; hasta siete se permite solo mesa. | **M** | Sprint 3 | EP-05 |
| **RF-RES05** | Cálculo del total del pedido    | Sumatoria automática de subtotales (`cantidad × precio_unitario_congelado`) expresada en COP sin recargos tributarios.                       |   **M**   | Sprint 3 | EP-05     |
| **RF-RES06** | Registro de solicitud inicial   | Inserción de la reserva en estado `SOLICITADA` generando un código alfanumérico corto y legible de 6 caracteres (ej. `ENC-482`).             |   **M**   | Sprint 3 | EP-05     |
| **RF-RES07** | Pantalla de pago y WhatsApp     | Resumen con monto y contacto/medios/instrucciones vigentes publicados por ADMIN, consultados también antes de abrir WhatsApp con código y ticket. Ante falta de configuración o de red, informa sin inventar cuentas ni usar datos antiguos. La solicitud sigue pendiente hasta revisión humana. | **M** | Sprint 3 | EP-05 |
| **RF-RES08** | Alerta al dueño por solicitud   | Notificación push y correo al teléfono de los dueños cuando entra una nueva solicitud, incluso si la app está cerrada en segundo plano.      |   **M**   | Sprint 5 | EP-09     |
| **RF-RES09** | Aprobación y rechazo manual     | Interfaz para que el dueño acepte la reserva (pasa a `CONFIRMADA`) o la rechace (pasa a `RECHAZADA`), exigiendo motivo. El rechazo es terminal; para intentarlo otra vez, el comensal crea una solicitud nueva. |   **M**   | Sprint 3 | EP-06     |
| **RF-RES10** | Notificación al comensal        | Notificación push y por correo al comensal informando la confirmación o el rechazo (con su motivo) de su solicitud.                          |   **M**   | Sprint 5 | EP-09     |
| **RF-RES11** | Historial de reservas           | Vista para el comensal donde consulta sus solicitudes activas, confirmadas, pasadas y canceladas.                                            |   **M**   | Sprint 3 | EP-05     |
| **RF-RES12** | Cancelación por el comensal     | El comensal puede retirar una solicitud `SOLICITADA`; una reserva `CONFIRMADA` se puede cancelar si faltan al menos 60 minutos (incluida la igualdad exacta).              |   **M**   | Sprint 3 | EP-05     |
| **RF-RES13** | Expiración desatendida          | Tarea programada que pasa a `EXPIRADA` una solicitud no confirmada a las 12 horas de su creación. El comprobante se coordina por WhatsApp y el sistema solo considera la revisión/confirmación registrada por un dueño. |   **S**   | Sprint 5 | EP-06     |
| **RF-RES14** | Inasistencia por tolerancia     | Tarea programada que marca `NO_ASISTIO` a las reservas confirmadas tras 30 minutos del inicio de su franja sin registro de llegada.          |   **S**   | Sprint 5 | EP-06     |
| **RF-RES15** | Adición posterior de platos     | Opción para que el comensal agregue platos a una reserva ya confirmada, generando un saldo excedente a transferir y comprobante.             |   **S**   | Sprint 5 | EP-05     |
| **RF-RES16** | Reemplazo de platos             | Permuta de platos confirmados por otros de igual o mayor valor sin devolución de dinero.                                                     |   **C**   | Backlog  | —         |
| **RF-RES17** | Coordinación de otras fechas    | Sin apertura de Restaurante no se genera reserva desde la app; mostramos horarios/notas informativas y contacto WhatsApp vigente para coordinar. Sustituye la restricción de quince personas, retirada el 22/10. | **M** | Sprint 3 | EP-05 |
| **RF-RES18** | Generación de ticket copiable   | Conversión de la reserva y su pedido en un ticket de texto plano estructurado, listo para copiar con un toque y enviar a cocina.             |   **M**   | Sprint 3 | EP-05     |

### 4.4 Módulo de Muro de Noticias (NOT)

| ID           | Nombre del Requisito       | Descripción y Regla Operativa                                                                                          | Prioridad |  Sprint  | Ref. Jira |
| ------------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------- | :-------: | :------: | --------- |
| **RF-NOT01** | Feed de noticias           | Listado tipo muro en orden cronológico inverso con tarjetas compuestas por imagen, titular, fecha y resumen.           |   **M**   | Sprint 4 | EP-07     |
| **RF-NOT02** | Detalle de publicación     | Vista completa con imagen de cabecera, redacción formateada y enlaces externos interactivos (eventos, redes sociales). |   **M**   | Sprint 4 | EP-07     |
| **RF-NOT03** | Publicación administrativa | Editor para que el dueño redacte, cargue imagen, publique, edite y archive noticias del restaurante.                   |   **M**   | Sprint 4 | EP-07     |
| **RF-NOT04** | Fijado de noticias         | Capacidad de anclar una noticia relevante en la parte superior del muro independientemente de su fecha.                |   **S**   | Sprint 4 | EP-07     |
| **RF-NOT05** | Notificación por novedad   | Disparo de notificación push a los usuarios que hayan otorgado consentimiento al momento de publicarse una noticia.    |   **S**   | Sprint 5 | EP-09     |
| **RF-NOT06** | Compartir noticias         | Envío del contenido de una noticia hacia redes sociales y mensajería mediante el cuadro de diálogo nativo de Android.  |   **C**   | Sprint 4 | EP-07     |

### 4.5 Módulo de Administración y Operación (ADM)

| ID           | Nombre del Requisito           | Descripción y Regla Operativa                                                                                                        | Prioridad |  Sprint   | Ref. Jira |
| ------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | :-------: | :-------: | --------- |
| **RF-ADM01** | Gestión de categorías          | CRUD y ordenamiento secuencial de categorías de la carta con borrado lógico para mantener integridad histórica.                      |   **M**   | Sprint 2  | EP-04     |
| **RF-ADM02** | Gestión de platos y fotos      | Alta y edición de platos con carga de hasta 10 fotos optimizadas mediante `sharp` en backend hacia Supabase Storage.                 |   **M**   | Sprint 2  | EP-04     |
| **RF-ADM03** | Disponibilidad por fecha       | Matriz de configuración para habilitar o inhabilitar platos en días específicos del calendario (override de disponibilidad general). |   **M**   | Sprint 2  | EP-04     |
| **RF-ADM04** | Interruptor inmediato de plato | Alternancia inmediata de disponibilidad general para retirar platos agotados durante el servicio en un solo toque.                   |   **M**   | Sprint 2  | EP-04     |
| **RF-ADM05** | Zonas y mesas                  | Registro de zonas físicas del restaurante y mesas con sus capacidades para el cálculo del aforo total del establecimiento.           |   **M**   | Sprint 1  | EP-01     |
| **RF-ADM06** | Calendario anual de servicio   | ADMIN configura aperturas/cierres sobre domingos y festivos colombianos base, servicios combinables Restaurante/Pesca/Motos, horarios y notas públicas por fecha. No convierte Pesca/Motos en reservas. | **M** | Sprint 2 | EP-04 |
| **RF-ADM07** | Configuración operativa        | Panel para ajustar parámetros de operación sin tocar código. Incluye contacto y pago externo: WhatsApp con indicativo, medios/datos en texto libre e instrucciones, editables solo por ADMIN, persistidos sin reinicio, confirmación previa y conflicto ante una versión desactualizada. No implica que todos los demás parámetros ya tengan formulario. | **M** | Sprint 3 | EP-05 |
| **RF-ADM08** | Bandeja de solicitudes         | Tablero de solicitudes entrantes con conteo de comensales, total del pedido, estado del comprobante y acciones rápidas.              |   **M**   | Sprint 3  | EP-06     |
| **RF-ADM09** | Agenda del día                 | Vista operativa cronológica para el personal en salón con lista de reservas confirmadas, comensales y platos solicitados.            |   **M**   | Sprint 3  | EP-06     |
| **RF-ADM10** | Check-in en salón              | Marcación rápida de llegada de clientes (`EN_CURSO` o `COMPLETADA`) o registro manual de no asistencia desde la agenda.              |   **M**   | Sprint 3  | EP-06     |
| **RF-ADM11** | Indicador de reincidencia      | Etiqueta informativa junto a la solicitud que alerta al dueño si el usuario tiene cancelaciones o inasistencias previas.             |   **S**   | Sprint 3  | EP-06     |
| **RF-ADM12** | Copia de ticket para cocina    | Botón de acción que copia el ticket estructurado al portapapeles del móvil para pegarlo en el chat de WhatsApp de cocina.            |   **M**   | Sprint 3  | EP-06     |
| **RF-ADM13** | Indicadores agregados          | Gráficas consolidadas de reservas atendidas, volumen de comensales y platos más solicitados.                                         |   **C**   |  Backlog  | —         |
| **RF-ADM14** | Bitácora de auditoría          | Registro inmutable de acciones administrativas sensibles (usuario, acción, fecha, valores antes y después).                          |   **S**   | Sprint 5* | EP-10     |
| **RF-ADM15** | Gestión compartida de administradores | Un ADMIN designa cuentas existentes o retira su rol con confirmación; conservamos mínimo de tres activos, protección concurrente en API/BD, auditoría y rechazo de JWT ADMIN con permisos retirados. No equivale a borrar la cuenta ni a implementar TOTP. | **M** | Backlog, ajuste 22/10 | Pendiente historia propia |

_\*Sujeto a capacidad disponible de Sprint 5._

### 4.6 Módulo de Información, Difusión y Capa Web (INF)

| ID           | Nombre del Requisito         | Descripción y Regla Operativa                                                                                                                 | Prioridad |  Sprint  | Ref. Jira |
| ------------ | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | :-------: | :------: | --------- |
| **RF-INF01** | Información del restaurante  | Ficha con reseña, dirección en Vereda Las Huacas, horarios de atención, teléfonos y mapa interactivo con MapLibre.                            |   **M**   | Sprint 4 | EP-08     |
| **RF-INF02** | Navegación GPS externa       | Enlace que transfiere las coordenadas del restaurante a Google Maps / Waze para guiar al comensal en carretera.                               |   **S**   | Sprint 4 | EP-08     |
| **RF-INF03** | Contacto directo WhatsApp    | Botón permanente para iniciar conversación directa con la línea de atención del restaurante.                                                  |   **M**   | Sprint 4 | EP-08     |
| **RF-INF04** | Capa web y Open Graph        | Micro-sitio web en Next.js con ruta `/plato/[slug]` que genera metadatos Open Graph (1200×630 px < 600 KB) para previsualización en WhatsApp. |   **M**   | Sprint 4 | EP-08     |
| **RF-INF05** | Android App Links            | Configuración de `assetlinks.json` e intents para que pulsar un enlace de plato abra la app directamente en su ficha.                         |   **S**   | Sprint 4 | EP-08     |
| **RF-INF06** | Pantalla Próximamente        | Tarjetas informativas con estética de marca anunciando la pista de motos y la zona de pesca deportiva.                                        |   **S**   | Sprint 4 | EP-07     |
| **RF-INF07** | Registro de tokens push      | Registro y actualización del token de Firebase Cloud Messaging asociado al dispositivo del usuario.                                           |   **M**   | Sprint 5 | EP-09     |
| **RF-INF08** | Preferencias de notificación | Pantalla en perfil para que el comensal active o silencie notificaciones de noticias o recordatorios.                                         |   **S**   | Sprint 5 | EP-09     |
| **RF-INF09** | Subpantallas de Ajustes       | Organizar Ajustes en Perfil, Preferencias, Aplicación, Cuenta y seguridad, e Información/ayuda; conservar el retorno visible y los cinco destinos principales. | **S** | Sprint 5 | EP-02 |

---

## 5. Requisitos No Funcionales (RNF)

| ID         | Dimensión                | Especificación Técnica y Criterio de Aceptación                                                                                                                                    | Método de Verificación                                            |       Sprint        |
| ---------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | :-----------------: |
| **RNF-01** | Rendimiento Móvil        | La carta carga en menos de 2.0 s en red 4G estándar. El desplazamiento vertical de la lista de platos mantiene 60 fps constantes mediante virtualización.                          | Prueba en dispositivo físico de gama media (Android 10+, 3GB RAM) | Sprint 2 / Sprint 6 |
| **RNF-02** | Rendimiento Backend      | Latencia en el percentil 95 (p95) inferior a 400 ms en todas las consultas de lectura de la API bajo carga concurrente de 30 solicitudes/s.                                        | Medición con k6 o autocannon                                      | Sprint 3 / Sprint 6 |
| **RNF-03** | Mantenibilidad (Textos)  | **Cero cadenas de texto quemadas en la interfaz móvil.** Los títulos, etiquetas, mensajes de error y textos visibles provienen de recursos gestionados con `i18next`; fechas civiles y valores COP usan formateadores compartidos. | `npm run check:i18n --workspace=@encanto/mobile` y revisión de formato | Sprint 1 |
| **RNF-04** | Parametrización          | Las reglas de negocio (duración de franja, tolerancia, anticipación) residen en tablas de configuración del sistema, editables desde el panel sin desplegar código.                | Inspección de base de datos y endpoints                           |      Sprint 1       |
| **RNF-05** | Seguridad de Contraseñas | Las contraseñas se almacenan mediante hash criptográfico **Argon2id** (configuración recomendada OWASP: memoria 64MB, 3 iteraciones).                                              | Revisión de código y pruebas de autenticación                     |      Sprint 1       |
| **RNF-06** | Seguridad de Tokens      | Los tokens de refresco en el cliente móvil se almacenan exclusivamente en el enclave seguro del sistema operativo (Android Keystore vía `react-native-keychain`).                  | Inspección de almacenamiento del dispositivo                      |      Sprint 1       |
| **RNF-07** | Comunicaciones Seguras   | Tráfico 100% cifrado mediante HTTPS estricto con TLS 1.2 / TLS 1.3 y certificados SSL/TLS automáticos en VPS y Vercel.                                                             | Análisis SSL Labs y escaneo de endpoints                          |      Sprint 1       |
| **RNF-08** | Control de Acceso RLS    | Row Level Security (RLS) habilitado con denegación por defecto en todas las tablas de PostgreSQL. Acceso autorizado estrictamente por rol (`COMENSAL`, `STAFF`, `ADMIN`).          | Pruebas de inyección y bypass de permisos                         |      Sprint 1       |
| **RNF-09** | Usabilidad y Estados UI  | Todo flujo principal se completa en un máximo de 5 toques. Todos los componentes cuentan con estados explícitos: carga (esqueletos), vacío, error recuperable y sin conexión.      | Auditoría de usabilidad y prueba de recorrido                     |      Sprint 5       |
| **RNF-10** | Accesibilidad Visual     | Contraste de color mínimo WCAG AA (4.5:1 para texto normal, 3:1 para texto grande) en temas claro y oscuro. Áreas táctiles interactivas mínimas de 48×48 dp.                       | Auditoría con herramientas WCAG y TalkBack                        |      Sprint 5       |
| **RNF-11** | Compatibilidad Móvil     | Soporte nativo verificado para Android 8.0 (API Level 26) o versiones superiores. Diseño base optimizado para resolución de 360×800 dp con orientación vertical bloqueada.         | Pruebas en matriz de emuladores y hardware real                   |      Sprint 6       |
| **RNF-12** | Portabilidad y Entorno   | El backend NestJS opera dentro de un contenedor Docker homogéneo, asegurando idéntico comportamiento en el entorno de desarrollo local y en el VPS de producción.                  | Ejecución cruzada en Docker Compose                               |      Sprint 1       |
| **RNF-13** | Cumplimiento Legal       | Cumplimiento estricto de la Ley Estatutaria 1581 de 2012 (Habeas Data de Colombia). Consentimiento explícito en el registro, recolección mínima y opción de eliminación de cuenta. | Revisión de términos y política de datos                          |      Sprint 6       |
| **RNF-14** | Observabilidad           | Registro estructurado de logs en backend (formato JSON con Pino) y captura desatendida de fallos y excepciones en el cliente móvil mediante Sentry.                                | Verificación de consola Sentry y logs de servidor                 |      Sprint 1       |
| **RNF-15** | Respaldo y Resiliencia   | Estrategia de respaldo periódico mensual de la base de datos PostgreSQL alojada en Supabase hacia almacenamiento seguro externo.                                                   | Prueba de restauración desde copia de seguridad                   |      Sprint 6       |

Para RNF-03, los textos fijos se guardan en `apps/mobile/src/i18n/locales/` y se consultan con `t('seccion.clave')`. El verificador detecta texto JSX literal, cadenas visibles en atributos y expresiones JSX directas, además de claves de traducción inexistentes. Los nombres y descripciones recibidos de la API son contenido del restaurante y no se traducen en el cliente. La convención de trabajo está en `apps/mobile/src/i18n/README.md`.

**Avance RNF-09/10, 22 de octubre:** usamos `FeedbackHost` y `FeedbackMessage` como componentes compartidos de confirmación y avisos, con temas claro/oscuro, iconos, acciones diferenciadas, contenido desplazable y respeto de reducción de movimiento. No añadimos nuevos diálogos nativos `Alert.alert`: el adaptador `Feedback` muestra nuestra interfaz. Las confirmaciones no ejecutan la acción al abrir ni al pulsar Atrás. Sigue pendiente la auditoría completa de contraste/TalkBack y la matriz de tamaños; este avance no certifica los esqueletos o todos los estados de la app.

**Pendiente actualizar requisitos en Drive y Word local:** B-10, RF-RES07, RF-ADM07 y avance RNF-09/10: pago/contacto editable por dueño, consulta vigente y componentes propios de confirmación/retroalimentación. Registramos la decisión de pago en EC-35; esta nota no modifica las copias manuales.

---

## 6. Ciclo de Vida y Máquinas de Estados

### 6.1 Estados de una Reserva

```
  [ Comensal envía solicitud ]
               │
               ▼
        ┌──────────────┐
        │  SOLICITADA  │
        └──────┬───────┘
               │
    ┌──────────┼──────────────────────┬──────────────────────┐
    │          │                      │                      │
(Dueño         (Dueño                 (Vence plazo           (Comensal cancela
 verifica pago aprueba)               sin comprobante)       > 1h antes)
 y rechaza)    │                      │                      │
    ▼          ▼                      ▼                      ▼
┌───────────┐ ┌───────────┐    ┌───────────┐          ┌───────────┐
│ RECHAZADA │ │CONFIRMADA │    │ EXPIRADA  │          │ CANCELADA │
└───────────┘ └─────┬─────┘    └───────────┘          └───────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
   (Staff marca          (Pasan 30 min
    llegada)              sin llegar)
         ▼                     ▼
   ┌───────────┐         ┌───────────┐
   │ EN_CURSO  │         │ NO_ASISTIO│
   └─────┬─────┘         └───────────┘
         │
    (Cierre de servicio)
         ▼
   ┌───────────┐
   │COMPLETADA │
   └───────────┘
```

### 6.2 Matriz de Transiciones Permitidas

| Estado Inicial | Disparador (Trigger)                  | Actor Responsable  | Estado Destino | Regla de Validación               |
| -------------- | ------------------------------------- | ------------------ | -------------- | --------------------------------- |
| `—`            | Envía solicitud de reserva con pedido | Comensal           | `SOLICITADA`   | Aforo validado en franja hábil    |
| `SOLICITADA`   | Dueño verifica pago externo y aprueba | Dueño (`ADMIN`)    | `CONFIRMADA`   | Comprobante válido revisado       |
| `SOLICITADA`   | Dueño rechaza solicitud               | Dueño (`ADMIN`)    | `RECHAZADA`    | Obligatorio especificar motivo    |
| `SOLICITADA`   | Expira tiempo límite sin confirmación | Sistema (Cron)     | `EXPIRADA`     | Superada ventana límite de espera |
| `SOLICITADA`   | Comensal desiste de la solicitud      | Comensal           | `CANCELADA`    | Solicitud aún no confirmada       |
| `CONFIRMADA`   | Comensal cancela con antelación       | Comensal           | `CANCELADA`    | Tiempo restante >= 60 minutos     |
| `CONFIRMADA`   | Personal registra llegada en salón    | Personal (`STAFF`) | `EN_CURSO`     | Registro de check-in en agenda    |
| `CONFIRMADA`   | Se superan 30 min de tolerancia       | Sistema (Cron)     | `NO_ASISTIO`   | No hubo check-in en franja        |
| `EN_CURSO`     | Finaliza la atención en el salón      | Personal / Dueño   | `COMPLETADA`   | Servicio concluido                |
| `RECHAZADA`    | —                                     | —                  | —              | Estado terminal; para reintentar se crea otra solicitud |

---

## 7. Matriz de Trazabilidad Cruzada: Requisitos, Decisiones y Sprints

| Requisito      | Descripción Sintética             | Decisión Vinculante | Épica Jira | Sprint Asignado | Política de Recorte / Fallback           |
| -------------- | --------------------------------- | :-----------------: | :--------: | :-------------: | ---------------------------------------- |
| **RF-AUT01**   | Alta/vínculo de cuenta Google     |       C-6, E        |   EP-02    |  **Sprint 5**   | Cuenta basada en identidad verificada; no contraseña propia |
| **RF-AUT02**   | Verificación por correo           |         C-3         |   EP-02    |  **Revisar**    | Confirmar en Jira si se retira al usar Google |
| **RF-AUT03**   | Login Google y tokens rotatorios  |    C-16, RNF-06     |   EP-02    |  **Sprint 5**   | La API verifica Google y emite JWT propios |
| **RF-AUT04**   | Logout e invalidación             |        C-16         |   EP-02    |  **Sprint 1**   | Núcleo del sistema (No recortable)       |
| **RF-AUT05**   | Recuperación de contraseña        |         C-3         |   EP-02    |  **Revisar**    | No duplicar recuperación que ofrece Google |
| **RF-AUT06**   | 2FA TOTP para Dueño               |       ADR-007       |   EP-10    |  **Sprint 5**   | Opcional si desborda capacidad           |
| **RF-AUT07**   | Guardia de acciones críticas      |       ADR-007       |   EP-10    |  **Sprint 5**   | Opcional si desborda capacidad           |
| **RF-AUT08**   | Acceso global con sesión          |         A-1         |   EP-02    |  **Sprint 5**   | Sin sesión solo queda visible el acceso |
| **RF-AUT09**   | Alerta caducidad de sesión        |         G-4         |   EP-02    |  **Sprint 5**   | Refinamiento de experiencia              |
| **RF-INF09**   | Subpantallas de Ajustes           |         G-19        |   EP-02    |  **Sprint 5**   | Categorías y navegación interna; pendiente Jira |
| **RF-MEN01**   | Carta visual por categorías       |      A-5, F-5       |   EP-03    |  **Sprint 2**   | Núcleo del sistema (No recortable)       |
| **RF-MEN02**   | Platos de próximo día hábil       |      P-1, G-8       |   EP-03    |  **Sprint 2**   | Esencia de la pantalla de inicio         |
| **RF-MEN03**   | Ficha de plato con 10 fotos       |      C-7, C-8       |   EP-03    |  **Sprint 2**   | Reducir fotos iniciales si excede        |
| **RF-MEN04**   | Búsqueda por ingredientes         |          —          |   EP-03    |  **Sprint 5**   | Diferible a versión de estabilización    |
| **RF-MEN05**   | Filtros dietarios y precios       |          —          |   EP-03    |  **Sprint 5**   | Diferible a versión de estabilización    |
| **RF-MEN06**   | Indicador no disponible por fecha |    B-12, ADR-010    |   EP-03    |  **Sprint 2**   | Núcleo del modelo de carta               |
| **RF-MEN07**   | Gestión de favoritos              |          —          |   EP-03    |  **Sprint 5**   | Diferible a versión de estabilización    |
| **RF-MEN08**   | Caché sin conexión (MMKV)         |        C-17         |   EP-03    |  **Sprint 5**   | Diferible a versión de estabilización    |
| **RF-RES01**   | Selección de fecha hábil          |        B-12         |   EP-05    |  **Sprint 3**   | Núcleo del motor de reservas             |
| **RF-RES02**   | Cálculo y validación aforo franja |    B-2, ADR-005     |   EP-05    |  **Sprint 3**   | Núcleo transaccional (No recortable)     |
| **RF-RES03**   | Cantidad de personas y límites    |      B-1, B-8       |   EP-05    |  **Sprint 3**   | Núcleo del motor de reservas             |
| **RF-RES04**   | Pedido anticipado de platos       |    B-7, Sec. I-1    |   EP-05    |  **Sprint 3**   | Obligatorio ≥ 8 comensales               |
| **RF-RES05**   | Cálculo de total sin impuestos    |        B-14         |   EP-05    |  **Sprint 3**   | Núcleo del motor de reservas             |
| **RF-RES06**   | Registro en estado SOLICITADA     |    B-9, Sec. I-2    |   EP-05    |  **Sprint 3**   | Núcleo del motor de reservas             |
| **RF-RES07**   | Pantalla de pago con WhatsApp     |   B-10, Sec. I-3    |   EP-05    |  **Sprint 3**   | Núcleo del flujo operativo               |
| **RF-RES08**   | Notificación push a Dueño         |        C-14         |   EP-09    |  **Sprint 5**   | Respaldo vía correo si falla push        |
| **RF-RES09**   | Aprobación / Rechazo con motivo   |    B-9, Sec. I-2    |   EP-06    |  **Sprint 3**   | Núcleo operativo del dueño               |
| **RF-RES10**   | Notificación comensal aprob/rech  |          —          |   EP-09    |  **Sprint 5**   | Consulta manual en historial             |
| **RF-RES11**   | Consulta historial reservas       |          —          |   EP-05    |  **Sprint 3**   | Núcleo del sistema para el usuario       |
| **RF-RES12**   | Cancelación hasta 1 hora antes    |         B-4         |   EP-05    |  **Sprint 3**   | Regla de negocio contractual             |
| **RF-RES13**   | Expiración de solicitud sin pago  |         H-4         |   EP-06    |  **Sprint 5**   | Depuración manual en panel si falta cron |
| **RF-RES14**   | Inasistencia tras 30 min          |         B-3         |   EP-06    |  **Sprint 5**   | Marcación manual por personal            |
| **RF-RES15**   | Adición posterior de platos       |         B-7         |   EP-05    |  **Sprint 5**   | Se coordina por WhatsApp si se recorta   |
| **RF-RES16**   | Reemplazo de platos igual/mayor   |         B-7         |     —      |   **Backlog**   | Fuera de sprints semestrales             |
| **RF-RES17**   | Coordinación de fechas sin Restaurante | B-12 | EP-05 | **Sprint 3** | Sustituye mínimo de quince; solo mesas en fechas habilitadas |
| **RF-RES18**   | Ticket formateado copiable        |      B-7, P-3       |   EP-05    |  **Sprint 3**   | Núcleo operativo para cocina             |
| **RF-NOT01**   | Feed cronológico de noticias      |    A-7, Sec. I-5    |   EP-07    |  **Sprint 4**   | Núcleo del canal de comunicación         |
| **RF-NOT02**   | Detalle de publicación            |         A-7         |   EP-07    |  **Sprint 4**   | Vista informativa estándar               |
| **RF-NOT03**   | Edición administrativa noticias   |         A-7         |   EP-07    |  **Sprint 4**   | Núcleo de gestión de contenido           |
| **RF-NOT04**   | Fijado de publicaciones           |          —          |   EP-07    |  **Sprint 4**   | Característica deseable                  |
| **RF-NOT05**   | Notificación push por noticia     |         H-6         |   EP-09    |  **Sprint 5**   | Opcional según carga del sprint          |
| **RF-NOT06**   | Compartir noticias externamente   |          —          |   EP-07    |  **Sprint 4**   | Opcional                                 |
| **RF-ADM01**   | Gestión de categorías             |         A-5         |   EP-04    |  **Sprint 2**   | Núcleo administrativo de carta           |
| **RF-ADM02**   | Gestión de platos y fotos         |      A-5, C-8       |   EP-04    |  **Sprint 2**   | Núcleo administrativo de carta           |
| **RF-ADM03**   | Disponibilidad por fecha          |    A-5, ADR-010     |   EP-04    |  **Sprint 2**   | Diferenciador clave del negocio          |
| **RF-ADM04**   | Interruptor inmediato de plato    |          —          |   EP-04    |  **Sprint 2**   | Operación ágil en cocina                 |
| **RF-ADM05**   | Gestión de zonas y mesas          |         B-8         |   EP-01    |  **Sprint 1**   | Datos de siembra (seed inicial)          |
| **RF-ADM06**   | Calendario de atención anual      |      B-12, H-7      |   EP-04    |  **Sprint 2**   | Núcleo de fechas hábiles                 |
| **RF-ADM07**   | Configuración de parámetros       |   RNF-04, B-1..6    |   EP-05    |  **Sprint 3**   | Cero valores quemados en código          |
| **RF-ADM08**   | Bandeja de solicitudes            |      B-9, P-6       |   EP-06    |  **Sprint 3**   | Núcleo de operación del dueño            |
| **RF-ADM09**   | Agenda del día para personal      |         P-6         |   EP-06    |  **Sprint 3**   | Puede pasar a S5 si excede capacidad     |
| **RF-ADM10**   | Marcación de check-in en salón    |         P-6         |   EP-06    |  **Sprint 3**   | Operación básica en sala                 |
| **RF-ADM11**   | Alerta de cancelaciones previas   |        B-11         |   EP-06    |  **Sprint 3**   | Visibilidad de riesgo de cliente         |
| **RF-ADM12**   | Copia de ticket para cocina       |      B-7, P-3       |   EP-06    |  **Sprint 3**   | Facilita comunicación con cocina         |
| **RF-ADM13**   | Indicadores analíticos            |          —          |     —      |   **Backlog**   | Fuera del alcance semestral              |
| **RF-ADM14**   | Bitácora de auditoría             |          —          |   EP-10    | **Sprint 5\***  | Condicionada a capacidad de S5           |
| **RF-INF01**   | Ficha de restaurante y mapa       |         C-2         |   EP-08    |  **Sprint 4**   | Localización de sede única               |
| **RF-INF02**   | Enlace a GPS externo              |         C-2         |   EP-08    |  **Sprint 4**   | Facilidad de llegada en carretera        |
| **RF-INF03**   | Botón directo a WhatsApp          |      P-2, B-10      |   EP-08    |  **Sprint 4**   | Canal de atención primordial             |
| **RF-INF04**   | Capa web SSR con Open Graph       |       ADR-004       |   EP-08    |  **Sprint 4**   | Previsualización fotográfica en WhatsApp |
| **RF-INF05**   | Android App Links nativos         |        C-14         |   EP-08    |  **Sprint 4**   | Apertura automática de app               |
| **RF-INF06**   | Pantalla Próximamente (motos)     |    A-8, Sec. I-5    |   EP-07    |  **Sprint 4**   | Promoción de atractivos anexos           |
| **RF-INF07**   | Registro de tokens FCM            |          —          |   EP-09    |  **Sprint 5**   | Infraestructura de notificaciones        |
| **RF-INF08**   | Preferencias de notificación      |          —          |   EP-09    |  **Sprint 5**   | Control de privacidad del comensal       |
| **RNF-01..15** | Requisitos No Funcionales         |      C-1..C-21      | EP-01..11  |   **S1 a S6**   | Estándares de calidad y seguridad        |

---

## 8. Plan de Sprints y Distribución de Entregas

```
[Sprint 1: Cimientos] ──► [Sprint 2: Carta & Calendario] ──► [Sprint 3: Reservas & Aforo]
(51 pts · 28 ago - 10 sep) (58 pts · 11 sep - 24 sep)     (62 pts · 25 sep - 8 oct)
         │                           │                                │
         ▼                           ▼                                ▼
[Sprint 4: Noticias & Web] ─► [Sprint 5: Notificaciones] ──► [Sprint 6: Sustentación]
(53 pts · 9 oct - 22 oct)   (63 pts · 23 oct - 5 nov)     (38 pts · 6 nov - 13 nov)
```

### Sprint 1: Cimientos de Plataforma y Autenticación (51 puntos)

- **Foco:** Configuración del monorepo, contenedores Docker, esquema relacional en Prisma/Supabase, pipeline de i18n sin literales y ciclo de autenticación seguro (Argon2id + Keystore).
- **Entregables:** App React Native con 5 tabs iniciales, API NestJS respondiendo en `/api/v1`, Swagger en `/api/docs`, despliegue inicial en VPS.
- **Requisitos cubiertos en su versión original:** `RF-AUT01`, `RF-AUT03`, `RF-AUT04`, `RF-AUT08`, `RF-ADM05`, `RNF-03`, `RNF-04`, `RNF-05`, `RNF-06`, `RNF-07`, `RNF-08`, `RNF-12`, `RNF-14`.
- **Nota de alcance:** Sprint 1 implementó el acceso anterior con correo/contraseña y navegación pública. El acuerdo del 16 de octubre lo reemplaza como objetivo futuro; Google y el bloqueo global quedan propuestos para Sprint 5, no se reabre retrospectivamente el cierre técnico de Sprint 1. RF-AUT02/RF-AUT05 quedan para revisión en Jira, no los contamos en la nueva estimación.

### Sprint 2: Carta Digital, Fotografías y Calendario (58 puntos)

**Corte de recuperación del 16 de octubre:** integramos PR #11 en `dev`; Yeison asume EC-22/23/24/26/27/28/29/30 y Fabián conserva EC-25. La lista de requisitos siguiente representa el alcance previsto, no una certificación de cobertura completa: EC-22 mantiene pendiente la aceptación física con 100 platos y EC-27 la integración real de Storage por acceso incompleto. La apertura externa del detalle se acepta en EC-47/48 de Sprint 4. No retiramos RF-ADM02, RF-MEN01/RNF-01 ni RF-INF05; balance y estados finales en [el acta de cierre](Cierre_Sprint2_2026-10-16.md).

Pendiente actualizar requisitos en Drive y Word local: sección 8 y estos RF/RNF, reflejar responsabilidades, aplazamiento y dependencia de aceptación externa; el Markdown no actualiza esos documentos automáticamente.

- **Foco:** Catálogo de platos con lista virtualizada, compresión de imágenes con `sharp` en backend, gestión administrativa de platos y definición del calendario de atención.
- **Entregables:** Home con platos del próximo día de servicio, detalle con galería de hasta 10 fotos WebP, CRUD de categorías/platos, disponibilidad por fecha específica.
- **Requisitos previstos:** `RF-MEN01`, `RF-MEN02`, `RF-MEN03`, `RF-MEN06`, `RF-ADM01`, `RF-ADM02`, `RF-ADM03`, `RF-ADM04`, `RF-ADM06`, `RNF-01`.

### Sprint 3: Motor de Reservas, Aforo y Aprobación (62 puntos)

- **Foco:** Módulo transaccional de reservas, cálculo de franjas y aforo con bloqueo serializable, selección de pedido anticipado, generación de tickets y bandeja del dueño.
- **Entregables:** Flujo de reserva en 4 pasos, ticket de texto copiable para cocina, pantalla de solicitud enviada con botón de WhatsApp, bandeja de aprobación/rechazo con motivo, agenda del día.
- **Requisitos cubiertos:** `RF-RES01`, `RF-RES02`, `RF-RES03`, `RF-RES04`, `RF-RES05`, `RF-RES06`, `RF-RES07`, `RF-RES09`, `RF-RES11`, `RF-RES12`, `RF-RES17`, `RF-RES18`, `RF-ADM07`, `RF-ADM08`, `RF-ADM09`, `RF-ADM10`, `RF-ADM11`, `RF-ADM12`, `RNF-02`.

### Sprint 4: Muro de Noticias, Capa Web y Deep Links (53 puntos)

- **Foco:** Canal de comunicación con noticias, micro-sitio SSR en Next.js para metadatos Open Graph, enlaces compartidos en WhatsApp y Android App Links.
- **Entregables:** Feed de noticias administrable, pantalla "Próximamente" (pista de motos y pesca), `/plato/[slug]` con previsualización en WhatsApp y apertura nativa.
- **Requisitos cubiertos:** `RF-NOT01`, `RF-NOT02`, `RF-NOT03`, `RF-NOT04`, `RF-NOT06`, `RF-INF01`, `RF-INF02`, `RF-INF03`, `RF-INF04`, `RF-INF05`, `RF-INF06`.

### Sprint 5: Notificaciones, 2FA y Refinamiento (63 puntos)

- **Foco:** Notificaciones push con FCM, correos transaccionales con Resend, segundo factor TOTP para administradores, búsqueda/filtros avanzados y caché sin conexión.
- **Entregables:** Alertas en segundo plano al dueño ante nuevas solicitudes, confirmación push al comensal, TOTP activo en panel de dueño, estados vacíos/carga pulidos.
- **Requisitos cubiertos:** `RF-AUT02`, `RF-AUT05`, `RF-AUT06`, `RF-AUT07`, `RF-AUT09`, `RF-MEN04`, `RF-MEN05`, `RF-MEN07`, `RF-MEN08`, `RF-RES08`, `RF-RES10`, `RF-RES13`, `RF-RES14`, `RF-RES15`, `RF-NOT05`, `RF-INF07`, `RF-INF08`, `RNF-09`, `RNF-10` _(Opcional: `RF-ADM14`)_.

### Sprint 6: Estabilización, Auditoría y Sustentación (38 puntos)

- **Foco:** Pruebas integrales de extremo a extremo, congelación de código, auditoría no funcional (tiempos, memoria, WCAG), generación de APK firmada y validación con cliente.
- **Entregables:** APK de producción lista, documentación técnica consolidada, presentación ejecutiva y defensa del código.
- **Requisitos cubiertos:** `RNF-01`, `RNF-02`, `RNF-11`, `RNF-13`, `RNF-15`.

---

## 9. Política de Recorte y Control de Desbordes

Dada la capacidad de ~52 horas por sprint (3 integrantes), los Sprints 3 y 5 tienen un volumen elevado de puntos. En caso de riesgo de desborde temporal durante la ejecución, se aplica el siguiente orden de recorte formal previamente acordado:

1. **Primer nivel de recorte (Sprint 3):**
   - Postergar la **Agenda del día del personal (`RF-ADM09`)** hacia el Sprint 5 (el dueño puede revisar las reservas en la bandeja general).
   - Posponer la **Cancelación en la app (`RF-RES12`)** hacia el inicio del Sprint 4 (los comensales cancelan vía WhatsApp provisionalmente).
2. **Primer nivel de recorte (Sprint 5):**
   - Diferir la **Adición de platos a reservas aprobadas (`RF-RES15`)** para coordinación manual por WhatsApp.
   - Diferir la **Caché sin conexión (`RF-MEN08`)** dejando la app en modo conectado estándar.
   - Omitir la **Bitácora de auditoría (`RF-ADM14`)**.
   - Omitir la **Notificación push por noticias (`RF-NOT05`)**.
3. **Requisitos definitivamente fuera del alcance del semestre (Backlog futuro):**
   - **`RF-RES16`**: Intercambio de platos confirmados en la app.
   - **`RF-ADM13`**: Tablero analítico e indicadores estadísticos agregados.

## 10. Registro de ajustes y sincronización del documento

El 15 de octubre acordamos que podemos modificar tareas, alcance y distribución durante el desarrollo, dejando la corrección directamente en Jira y en los documentos afectados. Seguimos [Reglas.md, sección 7](../Reglas.md#7-ajustes-de-alcance-y-sincronización-de-requisitos): indicamos decisión, motivo, criterios vigentes, responsable, sprint y referencias a archivos/commit. El 16 de octubre confirmamos rechazo terminal, expiración a las 12 horas, reglas de duración/anticipación y el límite exacto de cancelación; también fijamos el identificador Android y el comportamiento del teclado. Estos acuerdos no significan que las historias de reserva ya estén implementadas.

El responsable del ajuste mantiene el aviso **«Pendiente actualizar requisitos en Drive y Word local»** con los RF/RNF o secciones afectadas y la corrección concreta. Actualizamos a mano `docs/Requisitos_del_Sistema.docx` y el documento de Drive; solo retiramos el pendiente al confirmar ambos. El registro de Jira de esta ronda todavía no se actualizó porque falló el controlador de escritorio; falta reflejar las reglas de RN-01, RN-04, RN-05 y RF-RES09, RF-RES12, RF-RES13, además de las decisiones G-9, G-10 y G-14. En Word y Drive debemos copiar esos cambios y reemplazar las descripciones anteriores; no damos por cumplido el recordatorio hasta confirmar ambas copias.
