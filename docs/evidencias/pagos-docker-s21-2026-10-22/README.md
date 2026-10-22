# Evidencia del 22 de octubre: S21 y Docker aislados

Probamos el paquete existente `co.encantocampestre.app` con JS debug de PR #15. API real en Docker, PostgreSQL local desechable, usuarios y medios ficticios; no son cuentas ni pagos reales. No escribimos reservas en Supabase ni VPS.

| Captura | Qué comprobamos |
| --- | --- |
| 01-resumen.png | Siete personas, dos unidades y total $64.000. |
| 02-dialogo-cancelacion.png | Diálogo propio, acción destructiva y alternativa segura. |
| 03-cancelada-historial.png | Cancelación persistida visible en historial. |
| 04-confirmar-publicacion.png | Confirmación antes de publicar datos de pago. |
| 05-pago-guardado.png | Aviso propio de éxito después de guardar. |
| 06-grupo-ocho-sin-pedido.png | Grupo de ocho sin pedido: resumen deshabilitado. |
| 07-pagos-en-reserva-existente.png | Detalle existente consulta datos vigentes. |
| 08-jira-ec35.png | Actividad EC-35 con criterios actualizados, sin cierre automático. |
| 09-carta-100.png | Último plato de página cinco, índice 99 de cien según consulta HTTP. |
| 10-jira-ec27.png | Comentario de Storage real guardado, sin cerrar la galería integral. |

El screenshot no prueba por sí solo persistencia, cola completa, accesibilidad o rendimiento en 4G. Resultados y límites en [el acta](../../Pagos_Dinamicos_y_QA_2026-10-22.md). Las capturas de código/ticket corresponden exclusivamente a fixtures desechables. No incluimos claves ni contraseñas.
