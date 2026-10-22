# Pedido, calendario y dos instalaciones Android

Probamos en S21 ARM64 el 22/10/2026. Los datos escritos son de PostgreSQL desechable local, servidos por runtime Docker en localhost:3039; no escribimos reservas, roles o catálogo de prueba en Supabase/VPS.

| Captura | Evidencia y límite |
| --- | --- |
| 01-mi-pedido.png | Primera revisión editable con producto sintético local. No es catálogo compartido. |
| 02-dia-restaurante.png | Calendario mensual y día con servicios/horarios. |
| 03-pesca-motos-sin-mesas.png | Día con Pesca/Motos y nota: consulta de mesas deshabilitada. |
| 04-vps-sin-metro.png | EncantoApp con datos HTTPS anteriores del servidor, después de reiniciar sin reverse de Metro. No prueba que se importara la carta nueva. |
| 05-pedido-carta-original.png | Dos Costillas Ahumadas y estimado $60.000, en QA local. Captura anterior al reemplazo del Modal por hoja integrada; no documenta el aspecto final de esa hoja. |
| 06-resumen-tras-login.png | Retorno del login, lunes 26, dos personas, una Costilla Ahumada y $30.000. Cada paso vuelve arriba sin perder la selección. |
| 07-solicitud-local-enviada.png | Solicitud pendiente, dos personas y $30.000; contrastada desde otro cliente Prisma. Mi Pedido quedó en cero tras el envío. |
| jira-ec33-criterios.png | Criterios actualizados de Mi Pedido/mesas/pedido desde ocho. |
| jira-ec29-calendario.png | Calendario y actividades acordados; conserva aceptación histórica, no declara ampliación desplegada. |
| jira-ec22-carta-original.png | Comentario de carta real, importación y rendimiento pendiente. |
| jira-ec73-administradores.png | Historia nueva, En curso, responsable Yeison; no Listo. |

No enviamos WhatsApp, pagos ni notificaciones reales. Google sigue pendiente de clientes e implementación. La prueba móvil no certifica todos los tamaños, contraste/lector de pantalla o rendimiento representativo con cien platos. Las dos apps tienen paquetes distintos y sesiones independientes. `vpsDebug` incluye JS; no es una publicación de producción y `vpsRelease` conserva el bloqueo CMake/Ninja.

Resultados, imagen Docker, comandos y pendientes en [el acta](../../Pedido_y_Calendario_2026-10-22.md). El importador opt-in y las pruebas son repetibles sin copiar secretos a documentación.
