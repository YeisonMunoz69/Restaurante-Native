# Decisiones del proyecto

### App móvil — El Encanto Campestre

**Versión:** 0.4 · **Actualizado:** 9 de octubre de 2026

Registramos lo acordado y lo distinguimos de lo implementado. Las filas con `⬜` siguen abiertas. Actualizamos ramas, revisión y pendientes ya resueltos en los requisitos, sin cambiar por nuestra cuenta las reglas del cliente. El reparto vigente está en [Tareas_Alex.md](Tareas_Alex.md).

---

## Ficha

|                  |                                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Cliente**      | El Encanto Campestre — Vereda Las Huacas, Timbío, Cauca. Sede única                                                        |
| **Rasgos**       | Restaurante campestre. Atiende fines de semana y festivos. Tiene pista de motos y zona de pesca (fuera del alcance actual) |
| **Marca**        | Verde militar. Mascota: aguililla caminera (gavilán colombiano)                                                            |
| **Equipo**       | Alex Santacruz (10 h/sem) · Fabián Hoyos (8 h/sem) · Yeison Muñoz (8 h/sem) → ~26 h/semana                                 |
| **Herramientas** | GitHub para código · Jira para sprints y evidencias                                                                        |
| **Destino**      | Se presenta en la asignatura y luego se inicia el trámite de venta al cliente                                              |
| **Plataforma**   | Solo Android. El código se escribe portable, pero iOS no entra en el alcance                                               |

---

## A · Producto

| #   | Tema                      | Decisión                                                                                                                                                             |
| --- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-1 | Cliente                   | El Encanto Campestre, contacto directo. **Regla derivada:** cero valores fijos en el código — todo texto de interfaz vive en archivos de recursos, incluidos títulos |
| A-2 | Marca y sedes             | Marca del restaurante, sede única. El modelo queda preparado para más sedes sin exponerlo en la interfaz                                                             |
| A-3 | Identidad visual          | Verde militar y la aguililla caminera como elemento de marca                                                                                                         |
| A-4 | Validación con el cliente | Al cierre de cada sprint                                                                                                                                             |
| A-5 | Carta                     | CRUD completo de platos a cargo del administrador: descripción, fotos, detalles. Sin número fijo de platos, porque habilitan especiales según el día                 |
| A-6 | Al terminar el semestre   | Se presenta y se inicia el trámite de venta                                                                                                                          |
| A-7 | Noticias                  | Sección tipo muro: el dueño publica imagen, descripción y enlaces. Sirve para anunciar días de atención, eventos de pesca, carreras de motos y novedades             |
| A-8 | Próximamente              | Pantalla con tarjetas informativas de reserva de pista de motos y zona de pesca. Solo informativas en este alcance                                                   |

---

## B · Reglas de negocio

| #    | Tema                   | Decisión                                                                                                                                                                                                                 |
| ---- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B-1  | Duración de la reserva | 90 min hasta 4 personas · 120 min para grupos mayores                                                                                                                                                                    |
| B-2  | Horarios y franjas     | Los define el administrador desde su panel; no son valores fijos del código                                                                                                                                              |
| B-3  | Tolerancia de llegada  | 30 min. Con pago hecho, el sistema envía recordatorios y ofrece cancelar sin reembolso, derivando al chat                                                                                                                |
| B-4  | Ventana de cancelación | Hasta 1 hora antes                                                                                                                                                                                                       |
| B-5  | Anticipación máxima    | 3 meses. Reciben grupos empresariales que reservan con antelación                                                                                                                                                        |
| B-6  | Anticipación mínima    | 1 hora, y solo antes de las 13:00. Por debajo de eso se sugiere ir directo al restaurante                                                                                                                                |
| B-7  | Pedido anticipado      | Desde 8 personas se seleccionan los platos en la app, se arma la lista y se separa mesa. Se puede adicionar después de confirmado pagando el excedente. Sin reembolsos; sí cambios por productos de igual o mayor precio |
| B-8  | Combinación de mesas   | Sin tope de dos: se unen las que hagan falta, hasta mesas de 40 personas                                                                                                                                                 |
| B-9  | Confirmación           | Manual. Cada reserva la acepta un dueño después de verificar el pago. Puede haber varias cuentas con ese rol                                                                                                             |
| B-10 | Pagos                  | Fuera de la app: efectivo, PSE o Nequi al número del dueño. Sin límite de reservas activas: lo que regula es la aprobación del dueño                                                                                     |
| B-11 | Inasistencias          | No se restringe al usuario. El panel muestra al dueño una alerta con el número de cancelaciones previas                                                                                                                  |
| B-12 | Días de atención       | Calendario anual que el dueño marca. Base: fines de semana y festivos de Colombia. Entre semana solo se abre por reserva de 15+ personas                                                                                 |
| B-13 | Zona VIP "Mirador"     | Hasta 10 personas + 2 niños, con costo adicional de servicio. Se coordina por WhatsApp, no se reserva desde la app                                                                                                       |
| B-14 | Impuestos              | Sin impuestos. Solo el valor del plato                                                                                                                                                                                   |

### Flujo de reserva acordado

```
Cliente elige fecha, personas y platos (obligatorio desde 8 personas)
        ↓
La app genera un ticket con el detalle y el total
        ↓
Cliente paga por fuera (efectivo / PSE / Nequi) y envía comprobante por WhatsApp
        ↓
El dueño verifica y ACEPTA la reserva desde el panel
        ↓
Reserva confirmada · el dueño copia el ticket y lo pega en el grupo de cocina
```

**Nota sobre disponibilidad.** El restaurante rara vez se llena, así que la reserva no compite por mesas concretas: garantiza que habrá mesa. Esto permite trabajar con aforo por franja en lugar de asignación mesa a mesa, lo que simplifica bastante el módulo de reservas.

---

## C · Técnicas

| #    | Tema                   | Decisión                                                                                                                                                                                                                                        |
| ---- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-1  | Despliegue del backend | VPS. Se contenedoriza desde el inicio para que local y producción se comporten igual                                                                                                                                                            |
| C-2  | Mapas                  | MapLibre                                                                                                                                                                                                                                        |
| C-3  | Correo                 | Resend, nivel gratuito                                                                                                                                                                                                                          |
| C-4  | Postgres desde Prisma  | Credenciales solo en archivos privados ignorados. Las plantillas llevan ejemplos sin claves. En esta VPS verificamos pooler de sesión 5432 con SSL para ejecución y migraciones; no usamos 6543 para migrar                                     |
| C-5  | Repositorio            | Monorepo por módulos: `apps/mobile`, `apps/api`, `apps/web`, `packages/shared`                                                                                                                                                                  |
| C-6  | Tipos compartidos      | Paquete común con esquemas de Zod, usados como validación en ambos extremos                                                                                                                                                                     |
| C-7  | Imágenes               | Hasta 10 fotos por plato. Compresión sin pérdida perceptible para ahorrar espacio                                                                                                                                                               |
| C-8  | Procesamiento          | `sharp` en el backend, al momento de la carga                                                                                                                                                                                                   |
| C-9  | Zona horaria           | UTC en base de datos, presentación en `America/Bogota`                                                                                                                                                                                          |
| C-10 | Identificadores        | UUID v7 si la versión de PostgreSQL de Supabase lo admite                                                                                                                                                                                       |
| C-11 | API                    | Prefijo `/api/v1` desde el inicio                                                                                                                                                                                                               |
| C-12 | Ramas                  | `dev` integra el trabajo y despliega en la VPS de desarrollo al pasar CI. `main` se reserva para otra VPS de producción. Ramas personales `alex/...`, `fabian/...`, `yeison/...`; no usamos `develop`. La protección de rama se verifica aparte |
| C-13 | Firma de la app        | Almacén de claves propio, generado en Sprint 1 y resguardado                                                                                                                                                                                    |
| C-14 | Distribución           | Firebase App Distribution. Alternativa: APK alojada en la web del restaurante, que de todos modos hay que construir para las vistas previas de WhatsApp                                                                                         |
| C-15 | Plataformas            | Solo Android                                                                                                                                                                                                                                    |
| C-16 | Persistencia local     | MMKV                                                                                                                                                                                                                                            |
| C-17 | Sin conexión           | Solo lectura en caché                                                                                                                                                                                                                           |
| C-18 | Errores en el cliente  | Límite de error global más estados de error por consulta                                                                                                                                                                                        |
| C-19 | Reporte de fallos      | Sentry gratuito desde Sprint 2                                                                                                                                                                                                                  |
| C-20 | Pruebas                | Ya ejecutamos pruebas automatizadas de API/móvil en CI. Las acompañamos con aceptación de interfaz y pruebas de integración aisladas cuando corresponda; no sustituimos ninguna por una afirmación sin evidencia                                |
| C-21 | Secretos               | En `.env`, fuera del control de versiones                                                                                                                                                                                                       |

---

## D · Equipo

| #   | Tema                       | Decisión                                                                                       |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------- |
| D-1 | Integrantes                | Tres personas, ~26 h/semana en conjunto                                                        |
| D-2 | Responsabilidades          | Rotación, sin especialización fija por capa                                                    |
| D-3 | Herramientas               | GitHub y Jira                                                                                  |
| D-4 | Commits                    | Prefijo personal y descripción en minúsculas, como `alex/implementa-api-menu`, según Reglas.md |
| D-5 | Revisión de código         | PR hacia `dev`, revisión y filtros antes de integrar; después verificamos el despliegue        |
| D-6 | Evidencias                 | Todo queda en Jira; sin carpeta aparte                                                         |
| D-7 | Semanas de menor capacidad | No aplica                                                                                      |

---

## E · Legales

Se aceptan las recomendaciones y se resuelven al final del proyecto, sin interferir con la programación: política de tratamiento de datos conforme a la Ley 1581 de 2012, titularidad acordada con el cliente, eliminación de cuenta, recolección mínima (nombre, correo, teléfono) y retención con opción de anonimización.

---

## F · Diseño ✅

Bloque completado y archivado en la carpeta `design/`.

| #   | Tema                      | Opciones                                                 | Decisión tomada                                                                                              |   Estado   |
| --- | ------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | :--------: |
| F-1 | Herramienta de wireframes | Figma / Maquetación HTML / Papel                         | HTML autocontenido con diseño por fichas y exportes PNG                                                      | Completado |
| F-2 | Fidelidad                 | Solo baja · baja para todas y alta para las principales  | Componentes completos (29/29) y alta fidelidad en 5 pantallas clave (`P-01`, `P-02`, `P-07`, `P-09`, `P-22`) |     ✅     |
| F-3 | Fichas de diseño          | —                                                        | Color, espaciado, radio y tipografía definidos en `tokens.json` y `tokens.css`                               |     ✅     |
| F-4 | Tema oscuro               | Sí · no                                                  | Sí, claro y oscuro con verificación WCAG AA                                                                  |     ✅     |
| F-5 | Estilo de la carta        | Lista con foto a la izquierda · tarjetas con foto amplia | Tarjetas con foto amplia 4:3 y precio destacado                                                              |     ✅     |
| F-6 | Iconografía               | —                                                        | Conjunto Lucide Icons (24 dp, trazo 1.5–2 px)                                                                |     ✅     |
| F-7 | Navegación                | —                                                        | Cinco destinos: Carta · Reservas · **Noticias** (botón central elevado) · Próximamente · Ajustes             |     ✅     |

---

## G · Definiciones de interfaz

| #       | Tema                            | Decisión                                                                                                                                                              |
| ------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-1     | Estados vacíos                  | Explicamos que no hay contenido y ofrecemos una acción útil. Podemos enlazar información real; no inventamos platos/noticias para ocultar vacío o fallo de red        |
| G-2     | Estados de carga                | Esqueleto de contenido                                                                                                                                                |
| G-3     | Sin conexión                    | Se reintenta; el pedido en curso se guarda hasta recuperar red, o se descarta                                                                                         |
| G-4     | Sesión expirada                 | Aviso de confirmación antes de que caduque, si la persona está dentro de la app                                                                                       |
| G-5     | Permisos denegados              | Se vuelve a solicitar cuando se usa la función que lo requiere                                                                                                        |
| G-6     | Textos                          | Centralizados en archivos de recursos. Cero valores fijos en código ni en interfaz                                                                                    |
| G-7     | Formatos                        | Moneda COP · fechas `dd/mm/aaaa` en español                                                                                                                           |
| G-8     | Pantalla de inicio y navegación | Inicio con la comida: platos disponibles según lo que marque el administrador. Luego Reservas, botón central de Noticias, Próximamente y Ajustes con sus subpantallas |
| G-9 ⬜  | Ícono y presentación            | Por decidir. Existen marcas del restaurante pero sin digitalizar en buena calidad                                                                                     |
| G-10 ⬜ | Identificador del paquete       | Sin definir. Sugerencia: `co.encantocampestre.app`. Cambiarlo después obliga a rehacer Firebase y los App Links                                                       |
| G-11    | Fotografías pesadas             | Se comprimen en el backend, en su servicio                                                                                                                            |
| G-12    | Retroceso                       | Botón en la esquina superior izquierda, visible en toda subpantalla                                                                                                   |
| G-13    | Rotación                        | Siempre vertical                                                                                                                                                      |
| G-14 ⬜ | Teclado sobre los campos        | Sin definir. Sugerencia: manejo único desde el sistema de componentes, con la acción principal desplazándose con el contenido                                         |
| G-15    | Datos de ejemplo                | Los redacta el administrador                                                                                                                                          |
| G-16    | Copia de seguridad              | Mensual, en Supabase o en Google Drive                                                                                                                                |
| G-17    | Cuentas de prueba               | `yeison@encanto.com` · `fabian@encanto.com` · `alex@encanto.com`                                                                                                      |

---

## H · Pendientes que faltan por cerrar

Podemos avanzar con carta y calendario. Las diferencias de reglas de reserva sí deben resolverse antes de A07; no copiamos el seed como si fuera un acuerdo nuevo del cliente.

| #       | Pregunta                                                                                               | Por qué importa                                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| H-1 ✅  | Pedido opcional por debajo de ocho personas; obligatorio desde ocho                                    | Lo recogemos de B-7 y requisitos; lo validamos también en servidor                                                                     |
| H-2 ✅  | Comprobante por WhatsApp y pago externo, no carga en la app                                            | Conservamos el flujo acordado; no construimos una pasarela                                                                             |
| H-3 ⬜  | Rechazo con motivo ya definido y `RECHAZADA` existe en Prisma; falta acordar si hay corrección/reenvío | No inventamos esa acción. Las notificaciones siguen en Sprint 5                                                                        |
| H-4 ⬜  | ¿Cuánto tiempo espera una reserva sin comprobante antes de expirar?                                    | Sin esto, las solicitudes sin pago se acumulan en el panel                                                                             |
| H-5 ⬜  | ¿La adición de platos tras la confirmación se hace en la app o por WhatsApp?                           | Define si el pedido es editable después de aprobado                                                                                    |
| H-6 ⬜  | ¿Las noticias generan notificación push?                                                               | Afecta el módulo de notificaciones del Sprint 5                                                                                        |
| H-7 ✅  | Reglas semanales y excepciones por fecha, según modelos y Sprint 2                                     | Fabián lo publicó en PR #2; faltan integración y panel móvil. Esto no afirma que genere automáticamente todos los festivos             |
| H-8 ✅  | Bloque F completo                                                                                      | ✅ Resuelto y cerrado en la carpeta `design/`                                                                                          |
| H-9 ⬜  | G-9, G-10, G-14                                                                                        | Ícono, identificador definitivo y teclado; C-20 ya describe las pruebas existentes                                                     |
| H-10 ⬜ | B-5 dice tres meses y B-6 una hora; Prisma/seed usan 60 días y 120 minutos                             | Confirmamos valores y significado de meses/corte de las 13:00 antes de implementar reservas; después alineamos configuración y pruebas |
| H-11 ⬜ | B-1 distingue duraciones de 90/120 minutos, pero Restaurant guarda una sola duración                   | Acordamos representación configurable; no añadimos columnas por suposición                                                             |
| H-12 ⬜ | ¿La cancelación exactamente a 60 minutos está permitida?                                               | Dejamos el mismo límite en API/móvil y lo probamos a 59/60/61 minutos                                                                  |

---

## I · Lo que estos acuerdos cambian respecto al diseño original

Seis puntos del documento de Sprint 0 quedaron desactualizados con esta ronda. Se listan para no perderlos de vista.

1. **La reserva ahora incluye pedido de platos.** Deja de ser "mesa para N personas" y pasa a ser reserva con ticket y total. Aparecen entidades nuevas: pedido, línea de pedido y ticket.
2. **La confirmación es manual y depende de un pago externo.** El estado inicial es `SOLICITADA`, no `PENDIENTE`. Prisma ya incluye `RECHAZADA` y `EXPIRADA`; falta implementar el flujo y alinear `EXPIRADA` en el enum compartido.
3. **WhatsApp vuelve al flujo operativo**, como canal de comprobante y coordinación de la zona VIP. No gestiona la reserva, pero sí la habilita.
4. **La disponibilidad se simplifica.** Con aforo por franja en lugar de asignación mesa a mesa, la restricción de exclusión en la base de datos pierde protagonismo y el Sprint 3 se descarga bastante.
5. **Entra un módulo de noticias** que no estaba previsto, más una pantalla de "Próximamente".
6. **La navegación pasa de cuatro a cinco destinos**, con Noticias en el botón central.
