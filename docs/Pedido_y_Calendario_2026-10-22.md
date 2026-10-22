# Mi Pedido, carta y calendario: acuerdo del 22 de octubre

Yeison confirmó este cambio durante la revisión del S21. Lo trabajamos en `yeison/redisena-pedido-y-calendario`, continuando PR #15 sin integrarlo ni desplegarlo todavía. No cambiamos por nuestra cuenta las reglas de pago, duración, anticipación ni cancelación.

## Decisiones confirmadas

- «Mi Pedido» es un borrador editable desde la carta: cantidades, quitar platos y total estimado. No es pago en línea, domicilio ni pedido independiente de una reserva. Se puede comenzar por los platos o por reservar mesa. Desde ocho personas conservamos el pedido obligatorio; de una a siete se permite solo mesa y pedir al llegar.
- El total del borrador es orientativo. Al elegir fecha se consulta la carta vigente, se retiran los platos no disponibles con aviso y se recalculan precios. El servidor vuelve a validarlo al enviar. El borrador se conserva entre pestañas y primer login; en esta entrega vive en memoria, no prometemos restaurarlo después de cerrar el proceso.
- Queremos tres carruseles horizontales por bloque de categorías, con cambio manual entre bloques y acceso a todas las categorías. No rotamos automáticamente mientras alguien lee ni ocultamos el resto de la carta.
- El calendario muestra un mes, los servicios publicados, el horario general y notas. «Abierto» no equivale a aforo disponible; las franjas se validan por separado.
- Domingos y festivos nacionales colombianos son la base, salvo configuración explícita del administrador. Los sábados ya no abren por defecto. Preservamos reglas/excepciones existentes: una migración no elimina aperturas ya configuradas ni cambia reservas.
- Restaurante, Pesca y Motos son etiquetas combinables. Un día puede tener una, dos o tres. Solo Restaurante habilita mesas; pesca/motos no crean reservas, aforos ni cobros nuevos. Torneos podrán comunicarse después mediante Noticias, sin ampliar aquí ese módulo.
- Retiramos el mínimo de quince personas entre semana. Si ADMIN abre un día con Restaurante, puede reservarse con cualquier grupo permitido por aforo y RN-06. Si no lo abre, ofrecemos consultar por WhatsApp cuando exista un número válido; consultar no confirma una visita.
- Los horarios siguen siendo editables. Para una fecha base sin configuración usamos provisionalmente 10:00–18:00, el horario de formulario existente; antes de desplegar, el dueño debe revisar/configurar sus horarios reales. No confundimos ese valor inicial con un horario confirmado por el cliente.
- Adoptamos lenguaje visual inspirado en iOS, conservando Android nativo: chevrón de regreso reutilizable, áreas seguras, tipografía legible, componentes de tema y atrás físico. No implica añadir soporte iOS ni copiar cada efecto del sistema.

## Contrato y persistencia

La migración `20261022180000_servicios_calendario` añade listas de servicios a `dias_atencion` y `reglas_atencion`, con RESTAURANTE para los registros anteriores. Las excepciones prevalecen sobre reglas semanales, y estas sobre la base. Una regla explícitamente cerrada/inactiva no se reabre por ser domingo/festivo. Guardar cero reglas mantiene un cierre explícito para el día semanal. Mantuvimos los campos históricos `soloPorReserva`/`minPersonasEntreSemana` por compatibilidad; ya no gobiernan las reservas.

`GET /api/v1/calendario/rango?restauranteId=…&desde=…&hasta=…` admite hasta 42 fechas y entrega días, servicios, horarios, notas y WhatsApp público. No lleva claves privadas. El cálculo nacional incluye fechas fijas, Semana Santa y traslados de la [Ley 51 de 1983](https://www1.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=4954); no añade festivos de otros países. Cambios legales posteriores requieren revisar esta función y sus pruebas.

Incluimos también el nuevo festivo de Chiquinquirá desde 2026, trasladado en ese año al 13 de julio según la [Circular 23 de MinTIC](https://normograma.mintic.gov.co/mintic/compilacion/docs/circular_mintic_0023_2026.htm), que aplica la Ley 2578/2026. La prueba de 2026 espera 19 fechas distintas, no el listado tradicional de 18.

Quitar Restaurante de una fecha con reservas confirmadas exige la advertencia de afectación existente. No cancelamos ni reembolsamos reservas automáticamente. No migramos ni probamos escrituras en Supabase compartido o VPS en esta ronda.

## Seguimiento y documentos manuales

Actualizamos B-12, RN-12, RF-MEN01, RF-RES01/03/04/17 y RF-ADM06. El cierre de implementación, comandos, pruebas, capturas y referencia de Jira se completan después de validar; este documento no declara historias Listo por anticipado.

**Pendiente actualizar requisitos en Drive y Word local:** B-12/RN-12 (domingos/festivos, actividades y retiro de mínimo de quince), RF-RES01/03/04/17 y RF-ADM06 (calendario/contacto), RF-MEN01 (tres carruseles y Mi Pedido). Debemos registrar también el cambio directamente en Jira; editar Markdown no sincroniza esos sistemas.

## Validación e integración

Publicamos [PR #16 hacia dev](https://github.com/YeisonMunoz69/Restaurante-Native/pull/16). Continúa sobre PR #15, aún sin integrar: incluye sus commits y requiere revisar esa dependencia. No fusionamos en dev/main ni ejecutamos migraciones o cargas en Supabase/VPS.

| Comprobación | Resultado y límite |
| --- | --- |
| `npm run test --workspace=api`, con las dos variables de test apuntando a PostgreSQL local dedicado | 216 pruebas en 27 archivos, sin omisiones; build y lint API aprobados. |
| `npm run test --workspace=@encanto/mobile` | 91 pruebas en 28 suites; TypeScript/i18n aprobados. Lint: 0 errores, 51 advertencias. |
| `assembleLocalDebug`, `assembleVpsDebug`, ARM64 | Compilados e instalados. VPS incluye bundle; recompilado tras corregir Mi Pedido. Firma debug comprobada. `vpsRelease` no aprobado: error CMake/Ninja de Windows. |
| Docker, runtime construido y ejecutado | Mismo ID `sha256:4f7e9fa762a09e07e33a54b1da9d8741040aa89650777ac323b1bc7b679500ca`, comando `node dist/main.js`, cero montajes, salud conectada dentro/fuera. Nueve migraciones aplicadas en esquema local temporal. |
| `npx tsx apps/api/test/prepare-redesign-qa.ts`, opt-in con archivo privado externo | 44 productos sin fotos; Pesca/Motos sin franjas de mesa; lunes habilitado para dos; ADMIN 401/403/200, mínimo 409, correo inválido 400 y cuenta inexistente 404. Rechaza destinos fuera de la base/esquema local dedicado. |
| S21 | Pedido editable/recalculo, notas/servicios, Pesca/Motos con consulta de mesas deshabilitada y carta original desde Docker. EncantoApp reiniciada sin reverse de Metro consultó HTTPS; esa carta aún tiene los datos anteriores de VPS, no certifica importación remota. |

La prueba física detectó errores de montaje de vistas al cerrar un Modal nativo y navegar inmediatamente. Sustituimos la hoja por una superposición propia dentro de la pantalla: conserva atrás físico, confirmación para solo mesa y borrador. Las pruebas verifican que no abre otra ventana Modal. No equivale a certificar lector de pantalla, todos los tamaños o rendimiento en 4G. [Capturas y alcance](evidencias/pedido-calendario-s21-2026-10-22/README.md).

Completamos también en S21 el envío real contra Docker: desde la carta original elegimos Costilla Ahumada, cambiamos al lunes 26, grupo de dos, desvío al login y retorno conservando la selección, franja 14:00–15:30, resumen $30.000 y solicitud enviada pendiente de revisión. Una consulta Prisma independiente comprobó `SOLICITADA`, dos comensales, una línea y precio unitario/total de $30.000. Mi Pedido volvió a cero tras aceptar la API. No confirmamos ni pagamos la reserva. Al cambiar de paso remontamos solo el desplazamiento para que el encabezado no herede la posición final de una carta larga; las selecciones siguen en el padre. Retiramos el aviso de revalidación al terminar el envío.

Jira actualizado directamente: EC-33, criterios de Mi Pedido y pedido opcional 1–7/obligatorio desde ocho; EC-29, calendario/servicios y retiro de la regla anterior; EC-22, comentario de carta real con rendimiento pendiente. Creamos [EC-73](https://yjmunoz.atlassian.net/browse/EC-73), En curso y a cargo de Yeison, para mínimo de tres administradores. No reabrimos ni cerramos Sprint 2 por esta ampliación.

## Ampliaciones y pendientes manuales

La [carta original](Carta_Original_2026-10-22.md) contiene 44 referencias, todas disponibles inicialmente por confirmación de Yeison, editables y sin fotos. Empanada unidad $1.000, porción de seis $6.000. Repetir el importador no reactiva ni reemplaza precios de registros editados. Falta previsualizar/aprobar la carga en la VPS después de revisar/integrar.

La regla [mínimo de tres administradores](Administradores_Minimo_Tres.md) quedó en Reglas.md §9, B-15, RN-15 y RF-ADM15: historial conservado, protección concurrente y auditoría. Una base anterior con menos de tres requiere designar personas reales; no creamos cuentas ficticias compartidas. Pendiente actualizar requisitos en Drive y Word local: estas nuevas secciones y B-16/carta original.

La [guía Google](Google_Login_Preparacion.md) explica dos clientes Android, un cliente Web y variables públicas/privadas. Falta crearlos manualmente e implementar/verificar Google. No pedimos Client secret ni exponemos service_role en el APK. Faltan aceptación integral de galería EC-27 y horarios reales del dueño antes de desplegar.
