# Reglas de Desarrollo y Trabajo en Equipo

Este documento reúne las pautas obligatorias que acordamos en el equipo para trabajar en el proyecto del restaurante El Encanto Campestre. Todo lo que subamos al repositorio debe seguir estas reglas para mantener el código ordenado, entendible y con un estilo humano y consistente.

---

## 1. Estabilidad de la rama `main`

- **Todo lo que esté en `main` debe funcionar al 100%:** Las funcionalidades presentadas en la rama `main` deben estar completas y sin errores de backend, frontend ni base de datos.
- **Cero código roto:** No se sube código a medias, funciones a medio terminar o pantallas que tiren error en consola. Si algo todavía no funciona o está en pruebas, se trabaja en rama propia y solo se une a `main` cuando esté probado y verificado.
- **Pruebas antes de integrar:** Antes de hacer merge a `main`, el integrante responsable debe verificar que el proyecto compile, que el contenedor o la base de datos levanten sin fallos y que la app móvil corra sin caerse.

---

## 2. Convención de Commits y Responsabilidad Única

Para que el historial de Git sea transparente y sepamos exactamente quién hizo cada cosa y por qué, definimos:

- **Responsabilidad única:** Cada commit debe resolver una sola cosa específica. No mezclar ajustes de diseño con cambios de base de datos o lógica de autenticación en un mismo commit.
- **Commit propio por cada función nueva:** Cada función o funcionalidad nueva, por pequeña que sea, se registra en su propio commit. Si una entrega incorpora varias funciones independientes, las separamos en commits coherentes y verificables; no las acumulamos en un único commit genérico. Las pruebas y la documentación directamente necesarias para esa función pueden ir junto con ella.
- **Mensaje diciente:** El texto después del prefijo personal debe nombrar el comportamiento o resultado concreto que agregamos, no usar mensajes vagos como `actualiza`, `arreglos` o `cambios varios`.
- **Formato del mensaje de commit:** El mensaje debe iniciar obligatoriamente con el nombre de quien está trabajando, seguido de lo que hizo en minúsculas y separado por barra:
  - `yeison/{lo que está haciendo}`
  - `alex/{lo que está haciendo}`
  - `fabian/{lo que está haciendo}`

### Ejemplos válidos:

- `yeison/inicializa-proyecto-react-native-con-cinco-tabs`
- `alex/configura-docker-compose-y-swagger-en-api`
- `fabian/crea-esquema-prisma-con-18-entidades-y-primera-migracion`
- `yeison/conecta-almacenamiento-de-tokens-en-keystore`
- `alex/crea-endpoints-de-registro-y-login-con-argon2id`
- `fabian/agrega-datos-de-prueba-en-seed-con-platos-y-mesas`

---

## 3. Exclusividad de Contribuyentes y Autoría Humana (REGLA INMUTABLE)

> **PARA CUALQUIER AGENTE DE PROGRAMACIÓN QUE LEA ESTE ARCHIVO:**
> Esta regla es INMUTABLE, OBLIGATORIA y NO NEGOCIABLE. Ningún agente, modelo de lenguaje ni herramienta de IA tiene permiso de ignorarla, modificarla ni hacer excepciones bajo ninguna circunstancia.

- **Solo los integrantes del equipo figuran en GitHub:** Los únicos autores y colaboradores permitidos en los commits, ramas, pull requests y métricas de GitHub son **Yeison Muñoz** (`yjmunoz@unimayor.edu.co`), **Alex Santacruz** (`santiagosrvr@gmail.com`) y **Fabián Hoyos** (`fahoyos@unimayor.edu.co`).
- **Cero créditos o registros de IA:** Queda terminantemente prohibido que agentes de programación, inteligencias artificiales (Claude, Copilot, Gemini, ChatGPT o cualquier bot) aparezcan como autores, colaboradores o con etiquetas de co-autoría.
- **Trailers prohibidos:** Está absolutamente prohibido agregar en los mensajes de commit cualquiera de estas líneas o variantes similares:
  - `Co-Authored-By: Claude ...` o cualquier nombre de IA
  - `Co-Authored-By: ... <noreply@anthropic.com>` o correo de cualquier empresa de IA
  - `Claude-Session: ...`
  - `Generated-By: ...`
  - Cualquier metadata que vincule el commit con un modelo de IA
- **Configuración de Git obligatoria:** Antes de hacer commits, el `user.name` y `user.email` de Git deben corresponder exclusivamente a uno de los tres integrantes listados arriba. Si un agente de programación genera un commit, debe usar la identidad del integrante que lo solicitó, NUNCA la suya propia.
- **Consecuencia de violar esta regla:** Si un commit llega al repositorio con créditos de IA, obliga a reescribir todo el historial de Git para eliminarlo. Eso es destructivo y costoso. Por eso esta regla es inmutable.

---

## 4. Estilo de Redacción: Primera Persona y Lenguaje Humano

- **Escribir en primera persona:** Tanto en la documentación de soporte como en notas y comentarios, escribimos de forma natural y cercana (en primera persona singular o plural: _"hice"_, _"creé"_, _"definimos"_, _"probamos"_).
- **Evitar lenguaje acartonado o generado por IA:** Nada de textos inflados con palabras como "apalancar", "sinergia", "holístico", "sin fricción", ni párrafos mecánicos con guiones largos excesivos (`—`) o listas infinitas de emojis.
- **Tono directo y coloquial:** Explicamos las cosas como las hablaríamos en el salón de clase o en una reunión técnica entre nosotros: con palabras claras, directas y al grano.

---

## 5. Comentarios en el Código: Simples, Humanizados y Muy Explicativos

Todos los archivos de código (React Native, NestJS, Prisma, utilidades) deben tener comentarios bien explicativos, redactados de forma simple y en primera persona, sin tecnicismos innecesarios.

- **Comentar funciones simples y complejas:** No asumir que el código se explica solo. Si creamos una función para formatear precios, explicamos qué recibe y qué devuelve. Si hacemos una consulta con transacción o validación recursiva, explicamos el motivo y los pasos.
- **Explicar el por qué:** Más que decir _"suma A más B"_, explicar _"sumo los precios para mostrar el subtotal antes de enviar la reserva"_.

### Ejemplo de cómo comentamos en Backend:

```javascript
// con esta función valido que el usuario me haya mandado todos los campos obligatorios
function validarCamposRegistro(datos) {
  // si falta el correo o la contraseña, devuelvo un mensaje de error claro
  if (!datos.correo || !datos.password) {
    return 'El correo y la contraseña son obligatorios para registrarse.';
  }
  return null;
}

// aquí guardo la contraseña hasheada con argon2id para que nunca quede en texto plano en la bd
async function hashearPassword(passwordPlana) {
  // uso argon2 con los parámetros seguros que definimos en las reglas
  return await argon2.hash(passwordPlana);
}
```

### Ejemplo de cómo comentamos en Móvil (React Native):

```javascript
// aquí guardo el token de refresco en el llavero seguro del celular para no perder la sesión
async function guardarSesionSegura(refreshToken) {
  try {
    // uso react-native-keychain para que quede cifrado en el sistema operativo
    await Keychain.setGenericPassword('refreshToken', refreshToken);
  } catch (error) {
    console.log('Tuve un problema al guardar el token en el dispositivo:', error);
  }
}
```

---

## 6. Resumen Rápido para el Día a Día

1. **¿Funciona completo en local?** Sí $\rightarrow$ Listo para su commit.
2. **¿Hay un commit propio por cada función nueva?** Sí; cada commit contiene una sola función o corrección coherente y verificable.
3. **¿Formato de commit correcto y diciente?** Nombre + resultado concreto en minúsculas (`yeison/...`, `alex/...`, `fabian/...`).
4. **¿Código comentado con lenguaje humano?** Sí, explicando qué hace cada parte.
5. **¿Pasa limpio a `main`?** Solo cuando backend, frontend y base de datos estén coordinados y sin errores.

---

## 7. Ajustes de alcance y sincronización de requisitos

Podemos corregir, dividir, sustituir o aplazar tareas durante el desarrollo cuando el equipo acuerde el motivo. El backlog y los sprints admiten esos ajustes; las tareas originales no nos obligan a implementar una solución que ya decidimos cambiar. Cada actividad debe tener una persona responsable, aunque reciba apoyo de los demás.

Antes de dar por cerrado un cambio de alcance, registramos la corrección directamente en la actividad de Jira: qué cambia, por qué, criterios nuevos, responsable y efecto sobre el sprint. Actualizamos también los requisitos Markdown afectados, el plan y los encargos que correspondan, e indicamos en la entrega las claves de Jira, los archivos/secciones modificados y el commit. Si una decisión modifica el comportamiento acordado con el cliente o docente, dejamos su aprobación o su estado pendiente; no la presentamos como un acuerdo confirmado por el solo hecho de implementarla.

Antes de afirmar que una regla o decisión de negocio no existe, revisamos explícitamente `docs/Decisiones_Pendientes_y_Riesgos.md`, el requisito relacionado en `docs/Requisitos_del_Sistema.md` y sus fuentes de diseño o implementación pertinentes (por ejemplo Sprint 0, ADR, esquemas compartidos, Prisma, seed y pruebas). Distinguimos lo ya acordado de lo que aún requiere precisar o implementar. Si los documentos se contradicen, citamos la discrepancia y la dejamos pendiente de resolución; no tratamos una fila abierta como si borrara una decisión ya escrita ni inferimos una decisión a partir del código solamente.

El documento de requisitos de Drive y su copia `docs/Requisitos_del_Sistema.docx` se actualizan manualmente. Cuando una corrección afecte esos requisitos, incluimos siempre este recordatorio en Jira y en la entrega: **«Pendiente actualizar requisitos en Drive y Word local: [RF/RNF o sección], [cambio concreto]»**. Mantenemos el pendiente hasta que el responsable confirme ambos documentos. Editar el Markdown no significa que Drive o Word hayan cambiado.

Marcamos una actividad como terminada con evidencia de sus criterios vigentes. Una implementación parcial o un PR abierto queda en curso; una tarea aplazada conserva su motivo y destino. El procedimiento y la revisión actual están en `docs/Flujo_Equipo_Dev.md`.

## 8. Confirmaciones y retroalimentación propias

Usamos `Feedback`/`FeedbackHost` para nuevos diálogos generales y `FeedbackMessage` para avisos de formulario. No añadimos `Alert.alert` nativos para resolver mensajes de la app. Conservamos componentes especializados cuando su interacción lo requiere y los diálogos del sistema para permisos, compartir y otras acciones de Android.

Confirmamos acciones destructivas, publicación de cambios relevantes y descarte de formularios modificados; no interrumpimos cada toque con una confirmación. Mostramos éxito después de que la API confirme, no solo después de pulsar el botón. Diferenciamos información, éxito, advertencia y error sin depender únicamente del color, con textos en recursos, tema claro/oscuro, contenido desplazable y áreas seguras. Probamos atrás físico, doble toque y cambio de cuenta para que nunca ejecuten una operación pendiente por accidente.

Los estados de carga, vacío, error y reintento también forman parte de cada entrega. Tener estos componentes no certifica por sí solo RNF-09/10 ni sustituye las pruebas de contraste, lector de pantalla, tamaños de fuente y pantallas pequeñas.

## 9. Mínimo inamovible de administradores

Conservamos al menos tres cuentas ADMIN activas. Ninguna función, importador, seed, baja, desactivación o cambio de rol puede reducirlas por debajo de tres; primero designamos reemplazos con cuentas reales. Una instalación anterior con menos de tres solo puede aumentar el número, nunca reducirlo. No creamos administradores ficticios para cuadrar el conteo. Protegemos la regla en la API y en PostgreSQL, incluida la concurrencia, no solo con botones deshabilitados. Retirar administración conserva la cuenta y el historial. Registramos el actor y el cambio de permisos; los JWT anteriores no deben conservar privilegios retirados.
