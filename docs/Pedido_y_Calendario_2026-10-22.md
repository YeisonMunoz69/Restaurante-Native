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
