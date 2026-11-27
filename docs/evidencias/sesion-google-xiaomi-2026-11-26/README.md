# Verificación de sesión Google y borrador — Xiaomi

**Fecha:** 26 de noviembre de 2026
**Dispositivo:** Xiaomi 2303ERA42L, Android 14
**Aplicación:** EncantoApp (`co.encantocampestre.app`)

## Recorrido y resultado

1. Con la sesión de Google ya iniciada, forcé el cierre de la app y la abrí de nuevo. En Ajustes seguía apareciendo **«Sesión iniciada con Google»**: restauración tras reinicio de la app verificada.
2. Cerré sesión. Ajustes volvió a mostrar **«Accede con Google»** y la navegación quedó en Carta, Noticias y Ajustes: modo invitado verificado.
3. Volví a iniciar sesión con la cuenta que ya se había usado en la prueba anterior. La app volvió a mostrar la sesión activa.
4. Abrí Mis reservas y continué el borrador guardado. Regresó al paso 4 con sábado 28 de noviembre de 2026, 2 personas, 10:00–11:30, sin pedido anticipado, total $0 e imagen ficticia conservada.
5. No envié la solicitud. Cerré sesión otra vez y dejé la app en Ajustes, en modo invitado.

## Capturas

- `sesion-google-restaurada.png`: sesión visible en Ajustes. El nombre y correo se ocultaron.
- `borrador-restaurado.png`: borrador recuperado en el paso 4.
- `modo-invitado-final.png`: estado final tras cerrar sesión.

## Alcance

Esto comprueba restauración de sesión al reiniciar la app, cierre de sesión y conservación del borrador en este dispositivo y recorrido. No comprueba expiración/renovación del token, revocación desde Google, asociación de una cuenta nueva, autorización de endpoints por rol ni aceptación en el ambiente `dev`. EC-75 requiere su checklist completo antes de marcarlo terminado.
