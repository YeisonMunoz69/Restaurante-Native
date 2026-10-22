# Prueba física del flujo invitado de reservas

Probamos el 22 de octubre de 2026 en Samsung S21, paquete existente `co.encantocampestre.app`, debug con Metro de `yeison/revisa-reservas-alex`. No instalamos una segunda copia ni generamos APK release.

- Abrimos Reservas como invitado y entramos a Solicitar nueva reserva.
- Con fecha y grupo de siete, Consultar horarios nos desvió a Ajustes sin crear una solicitud.
- Al regresar por la pestaña Reservas conservábamos fecha/grupo. [01-grupo-conservado.png](01-grupo-conservado.png) registra ese punto; todavía tenía el encabezado largo recortado.
- Ajustamos el encabezado y comprobamos fecha completa entre las flechas. [02-selector-fechas.png](02-selector-fechas.png) muestra chips cortos y «Número de personas», sin `{{count}}` visible.
- El botón físico Atrás desde el primer paso devolvió a Mis reservas.

No completamos login real, solicitud autenticada, portapapeles, WhatsApp ni cancelación en el teléfono. Las pruebas Jest con respuestas simuladas no reemplazan esa aceptación. No escribimos en Supabase/VPS ni usamos cuentas reales. Ver [acta por criterio](../../Revision_Alex_2026-10-22.md).
