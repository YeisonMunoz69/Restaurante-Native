# Revisión de Alex y continuación de reservas, 22 de octubre

Revisamos GitHub, Jira y código. No fusionamos en `dev` ni `main`, no cambiamos estados/responsables en Jira y no hicimos escrituras de prueba en Supabase compartido ni VPS. EC-22/27 conservan sus pendientes; esta revisión no cierra Sprint 3.

## Entrega real

- `origin/dev` estaba en `f28c21e`. Alex publicó `4d47186`, `alex/mejora-flujo-de-reservas-e-i18n`, en `origin/alex/validacion-reservas`. No encontramos el hash `92f6c32` del encargo.
- Su entrega ajusta creación/login, detalle/orden/cancelación, recursos de interfaz, formatos compartidos, verificador de textos y enlace a Jira. No modifica la API.
- Ya existía [PR #14](https://github.com/YeisonMunoz69/Restaurante-Native/pull/14), dirigido a `main`. Corregimos su base a `dev`, sin merge.
- En `yeison/revisa-reservas-alex` conservamos el commit de Alex con su autoría y añadimos correcciones. [PR #15](https://github.com/YeisonMunoz69/Restaurante-Native/pull/15) reúne todo para revisión. Se solapa con #14; no debemos fusionar ambos sin revisar esa relación.
- Al comparar las ramas remotas existentes, solo Alex tenía commits no alcanzables desde `dev`. No resubimos `alex/api-menu-publico` ni repetimos menú, disponibilidad o calendario de Fabián.

## Criterios de Jira

Consultamos las cuatro actividades en el navegador. EC-14 figuraba **En curso**; EC-33/35/38, **Por hacer**, todas asignadas a `assantacruz`. Las tres últimas pertenecían a Sprint 3. La cobertura siguiente corresponde a esta rama, no a aceptación ni integración.

### EC-14

| Criterio | Cobertura y pendiente |
| --- | --- |
| i18next, español inicial | Cubierto; conservamos configuración y recursos. |
| Textos en recursos | Cubierto por revisión estática del alcance actual. Corregimos `{{count}} personas` usado sin parámetro. Pendiente aceptación visual de todas las pantallas. |
| Convención/verificación antes de integrar | Cubierto: script de Alex, README de i18n y paso nuevo del CI. El script no garantiza interpolaciones ni claves dinámicas; exige revisión complementaria en Android. |
| COP sin decimales y fecha numérica dd/mm/aaaa centralizados | Cubierto en utilidades/pruebas. Corregimos chips cortos que heredaban año/mes y encabezado recortado; verificado en S21. Conservamos fechas largas donde corresponde. |

No afirmamos que los mensajes de negocio de la API tengan contrato multilingüe ni que pasar el script certifique todas las pantallas.

### EC-33

| Criterio | Cobertura y pendiente |
| --- | --- |
| Login y retorno conservando selección | Cubierto en código/pruebas. S21: desvío a Ajustes y conservación al volver manualmente. Pendiente retorno físico después de login aislado. |
| Pedido opcional desde paso 3 | Cubierto para menos de ocho; desde ocho sigue obligatorio por B-7. Proponemos explicitar esa salvedad en Jira, sin cambiar la regla de negocio. |
| Solo platos habilitados para la fecha | Cubierto en consulta paginada y filtro. Al consultar nuevas franjas limpiamos el pedido anterior; la API vuelve a validar al enviar. |
| Resumen, total sin impuestos y cancelación | Cubierto: añadimos líneas/subtotales que faltaban en el resumen, con prueba de dos unidades. Conservamos cálculo final de API. |
| «Enviar solicitud», no «Confirmar reserva» | Cubierto; enviar no aprueba la reserva. |
| Atrás físico paso a paso | Cubierto con prueba de pasos; desde enviada sale a lista sin abrir otra solicitud y durante operación bloquea retroceso. S21: atrás desde primer paso. Pendientes los demás pasos autenticados. |
| Sin carrito ni checkout | Cubierto en textos y recorrido inspeccionado. |

El paso 3 requiere consulta de menú exitosa; ante fallo hay error y reintento. No declaramos un recorrido offline aprobado.

### EC-35

| Criterio | Cobertura y pendiente |
| --- | --- |
| Código seleccionable/copiable | Cubierto en código; ticket también copiable. Pendiente portapapeles físico con solicitud aislada. |
| Monto, medios y contacto del dueño | Parcial/bloqueado: mostramos total API, pero faltan instrucciones, datos de pago autorizados y WhatsApp oficial. Remitir a pedir instrucciones no completa el criterio. |
| WhatsApp prellenado con código | Cubierto en código y pruebas de error: código explícito, ticket e instrucciones; validación del número, aplicación no disponible y fallo de apertura. Bloqueada validación real del destinatario oficial. |
| Aviso de revisión humana | Cubierto; solicitud enviada no significa reserva confirmada. |
| Icono/título de envío | Cubierto, sin comunicar aprobación. |

No tomamos el número del seed como oficial, no inventamos cuentas/métodos y no enviamos mensajes/comprobantes reales.

### EC-38

| Criterio | Cobertura y pendiente |
| --- | --- |
| Próximas/historial, pendientes primero | Cubierto en filtros y ordenamiento de Alex, conservados. |
| Estado, código, pedido y rechazo | Cubierto. Corregimos detalle para actualizar tarjeta/lista; prueba de rechazo y paso a historial. |
| Retirar SOLICITADA; cancelar CONFIRMADA con al menos 60 minutos | Cubierto en API existente y cliente. Confirmación antes de escribir; API autoriza y mostramos conflictos recargando estado. |
| Con 60 permite, con 59 deshabilita y explica | Cubierto con reloj controlado y prueba de regla API. Recalculamos el límite con la pantalla enfocada. |
| Actualizar tras operar | Cubierto con prueba 409 y descarte de respuestas de otra cuenta. Pendiente detalle/cancelación física y actualización desde otro usuario con base aislada. |

Mantenemos 90 minutos hasta cuatro personas, 120 desde cinco, máximo tres meses calendario, mínimo una hora y `RECHAZADA` terminal. La expiración actual se evalúa al consultar/escribir, no mediante una tarea automática demostrada. Google como único acceso y bloqueo global sin sesión siguen en el alcance posterior acordado; hoy conservamos carta/noticias para invitados.

## Commits y pruebas

| Commit | Corrección |
| --- | --- |
| `ecb97d3` | Chips cortos y encabezado de fecha sin desbordarse. |
| `7e1071e` | Etiqueta del número de personas sin interpolación vacía. |
| `1507feb` | Retorno del login y retroceso protegido. |
| `586105d` | Código explícito y fallos recuperables de WhatsApp. |
| `d8cb230` | Sincronización, cambio de cuenta y límite de cancelación. |
| `82e004e` | Comprobación de textos en CI. |
| `8c8ca11` | Pedido/subtotales en el resumen previo al envío. |

| Comando y ubicación | Resultado |
| --- | --- |
| `npx jest --runInBand --forceExit`, `apps/mobile` | 62 pruebas aprobadas en 18 suites: login, retroceso, grupo de ocho, resumen, WhatsApp, detalle, conflicto, cambio de cuenta y 60/59. |
| `npx tsc --noEmit -p apps/mobile/tsconfig.json`, raíz | Aprobado. |
| `npm run check:i18n --workspace=@encanto/mobile`, raíz | Aprobado, con los límites estáticos descritos. |
| `npm run lint --workspace=@encanto/mobile`, raíz | Cero errores, 53 advertencias. |
| `npx vitest run src/reservations/reservation-state.spec.ts src/reservations/reservations.service.spec.ts`, `apps/api` | Seis pruebas unitarias aprobadas, no prueba de persistencia. |
| `git diff --check`, raíz | Sin errores de espacios. |
| S21, paquete existente `co.encantocampestre.app`, debug/Metro | Invitado, selector, etiqueta, desvío y conservación de fecha/grupo. [Capturas y alcance](evidencias/revision-alex-2026-10-22/README.md). |
| Docker local/recorrido físico autenticado | Pendiente: Docker Desktop no estaba ejecutándose. No creamos contenedores/volúmenes ni escribimos en servicios compartidos. |

El resultado remoto de build, PostgreSQL aislado y smoke del contenedor se consulta en los checks de PR #15. No sustituimos ese resultado por pruebas unitarias. El PR no despliega mientras no se integre en `dev`.

## Comentarios propuestos para Jira

No los publicamos ni cambiamos estados en esta ronda. Proponemos adjuntar PR #15 y esta acta; EC-33/35/38 pueden pasar a En curso para reflejar avance, no a Listo.

- **EC-14:** «Revisamos 4d47186 y continuamos en PR #15. Recursos/formateadores centralizados, comprobación i18n en CI y etiqueta corregida en S21. Falta aceptación visual completa; el script no certifica claves dinámicas/interpolaciones. Pendiente actualizar requisitos en Drive y Word local: RNF-03, recursos, formatos y convención descritos en Markdown».
- **EC-33:** «Corregimos retorno tras login, retroceso y resumen con pedido. Pruebas relacionadas aprobadas; falta recorrido físico autenticado aislado. Precisar pedido opcional para menos de ocho, obligatorio desde ocho, según B-7 ya acordada».
- **EC-35:** «Código, ticket, título de envío y aviso pendiente implementados. WhatsApp incorpora código y errores recuperables. Bloqueadas instrucciones/contacto: faltan datos oficiales del restaurante. Enviar no confirma y el seed no certifica contacto oficial».
- **EC-38:** «Corregimos detalle, conflictos, cambio de cuenta y reloj de cancelación; 60/59 probado. La API autoriza. Falta detalle/cancelación física y actualización desde otro usuario con base aislada».

## Encargo manual para Yeison, en orden

1. **Abrir Docker Desktop y mantener S21 disponible.** Esperar motor Linux listo (`docker info` sin error), conectar/desbloquear teléfono y comprobar `adb devices`. Prepararemos datos desechables para login, solicitud y cancelación sin Supabase compartido; no necesitamos contraseñas de cuentas reales.
2. **Conseguir datos oficiales para EC-35.** Pedir WhatsApp con indicativo, medios autorizados, titular/datos de pago que permitan publicar e instrucciones del comprobante. Confirmar mensaje para reserva sin pedido y total cero. No enviar claves bancarias ni comprobantes privados. Confirmar datos no autoriza escribirlos aún en la base compartida.
3. **Recuperar acceso a Storage para EC-27.** Un propietario debe crear/comprobar bucket público `platos`. Guardar `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_STORAGE_BUCKET=platos` solo en el `.env` privado de API del clon donde ejecutemos y, al preparar despliegue, en su `.env.vps` privado. Nunca poner la clave privada en móvil, Git, Jira o chat. Acordar entorno antes de subir fotos; carga, orden, eliminación y limpieza siguen pendientes.
4. **Revisar secretos antes del despliegue.** Si las credenciales de base de datos/JWT compartidas previamente no fueron rotadas, renovarlas y sincronizar solo archivos privados. No damos su rotación por realizada.
5. **Actualizar Word y Drive a mano.** Pendiente actualizar requisitos en Drive y Word local: RNF-03, recursos i18next, formatos y verificación previa a integrar. Mantener también pendientes registrados de RN-01/04/05, RF-RES09/12/13 y G-9/G-10/G-14 hasta confirmar ambas copias. Markdown no actualiza `.docx` ni Drive.
6. **Preparar siguiente sprint.** Conseguir acceso propietario al proyecto Google para cuentas personales; conservar `co.encantocampestre.app` y acordar firma release antes del acceso definitivo. Logo/referencias de botones, diálogos y cargas ayudan al diseño, pero no bloquean estas correcciones. No necesitamos otro dominio para revisar el PR; revisaremos enlaces/autenticación con el subdominio dev acordado.

Para avanzar ahora necesitamos el punto 1; para aceptar EC-35/27, además los puntos 2/3. No hace falta ejecutar comandos en la VPS para revisar este PR.
