# Administración compartida: mínimo de tres

Seguimiento: [EC-73](https://yjmunoz.atlassian.net/browse/EC-73), En curso/backlog, responsable de continuidad y aceptación **Alex** desde el 26/10; conservamos la implementación de Yeison. [PR #16](https://github.com/YeisonMunoz69/Restaurante-Native/pull/16), pendiente de revisión e integración. [Encargo vigente](Continuidad_Alex_2026-10-26.md).

Yeison fijó esta regla inamovible el 22/10/2026: ningún retiro, eliminación o desactivación puede dejar menos de **tres administradores activos**. Si necesitamos retirar a alguien cuando quedan tres, primero designamos un reemplazo. No consideramos una cuenta inactiva como reemplazo.

## Comportamiento implementado

En Ajustes → Administradores, un ADMIN consulta la lista y designa a una **cuenta ya registrada** por correo exacto. No creamos cuentas con contraseñas genéricas ni damos permisos por un correo recibido sin autenticar. La persona designada inicia sesión nuevamente para obtener su rol vigente.

Retirar significa quitar el rol ADMIN y conservar la cuenta como COMENSAL, con su historial. No borramos reservas ni datos personales. Pedimos confirmación propia antes de conceder o retirar privilegios. Con tres o menos, los botones de retiro están deshabilitados, pero la API aplica la regla incluso ante un cliente modificado.

`GET /api/v1/admin/administradores` consulta lista/conteo. `PUT` recibe `{correo, administrador: true|false}`. Requiere JWT, rol ADMIN vigente y cuenta activa. Las escrituras se serializan con bloqueo transaccional PostgreSQL antes de contar; registramos actor, sujeto y rol anterior/nuevo en auditoría y revocamos los refresh tokens del sujeto. Un JWT ADMIN viejo deja de autorizar cuando el rol fue retirado o la cuenta desactivada: verificamos el rol actual en la guardia.

La migración `20261022200000_minimo_tres_administradores` protege también UPDATE de rol/activo y DELETE directos en `usuarios`. No impide una intervención del propietario de PostgreSQL que elimine deliberadamente triggers; la regla de aplicación no sustituye el control de accesos a la base.

## Arranque de una base anterior

Si hoy existe uno o dos administradores, la migración **no inventa los que faltan** ni bloquea la API completa. Prohíbe reducir el número y permite aumentarlo hasta cumplir tres. El dueño debe seleccionar tres personas reales con cuentas verificadas antes de operar la gestión compartida. No afirmamos que ya existen esas tres cuentas en Supabase.

## Validación

En PostgreSQL desechable comprobamos dos retiros simultáneos desde cuatro: solo uno se acepta y quedan tres. Al llegar al mínimo fallan desactivación y borrado directos. Después de designar un cuarto se puede retirar otro. Comprobamos también rechazo de JWT ADMIN cuyo rol ya no está vigente y confirmación móvil antes de designar. No cambiamos roles reales en Supabase o VPS durante QA.

**Pendiente actualizar requisitos en Drive y Word local:** RF-ADM15/RN-15 y actores ADMIN: designación por cuenta existente, retiro de permisos sin borrado de historial y mínimo inamovible de tres activos. TOTP de acciones críticas conserva su historia pendiente; no lo presentamos como implementado.
