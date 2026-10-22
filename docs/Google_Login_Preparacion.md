# Preparación de Google para iniciar sesión

Preparamos la consola; crear estos clientes no implementa todavía el login. La app actual es React Native Android nativa, no Expo Go. Conservamos NestJS y sus JWT: Google identifica al usuario; la API verifica su token y emite nuestra sesión. No cambiamos a Supabase Auth ni pedimos acceso a Gmail/Drive.

## Pasos en la consola

1. Entrar a [Google Cloud Console](https://console.cloud.google.com/) y crear o seleccionar un proyecto del equipo, por ejemplo «El Encanto Campestre Dev».
2. Abrir Google Auth Platform, o APIs y servicios > Pantalla de consentimiento OAuth. Completar nombre, correo de soporte/contacto y audiencia **External** para cuentas personales. Mantener pruebas mientras configuramos; añadir los correos del equipo como usuarios de prueba cuando corresponda. Revisar [audiencia y pruebas](https://support.google.com/cloud/answer/15549945).
3. En **Clients / Clientes**, crear un cliente OAuth **Android** con el paquete `co.encantocampestre.app` y la huella SHA-1 del certificado con que instalamos la app. Ver [configuración oficial Android y Web](https://codelabs.developers.google.com/sign-in-with-google-android).
4. Crear otro cliente OAuth **Web application** en el mismo proyecto para identificar el backend. Para este flujo Android con ID token no inventamos callback web ni ruta `/auth/google/callback`; la guía permite dejar vacíos orígenes y redirecciones al crear este cliente.
5. Conservar ID del proyecto, ID del cliente Android e ID del cliente Web (`…apps.googleusercontent.com`). Los client IDs son identificadores, no contraseñas. No compartir el client secret, archivos privados ni códigos de acceso en el chat.

## Huella comprobada en nuestro clon

El 22 de octubre ejecutamos `gradlew signingReport`. La variante **debug** del proyecto produjo:

```text
Paquete: co.encantocampestre.app
SHA-1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

Podemos usarla para el cliente Android de desarrollo. No la confundimos con una firma release definitiva: el reporte actual mostraba la misma huella en release, por lo que esa variante todavía no demuestra una firma de distribución propia. No generamos ni subimos una clave privada en esta tarea. Si otro APK usa otro certificado, registramos también su huella mediante el cliente correspondiente. La necesidad de SHA-1 está descrita en [autenticación del cliente Android](https://developers.google.com/android/guides/client-auth).

Para volver a consultar desde PowerShell en la raíz del clon:

```powershell
Push-Location apps/mobile/android
.\gradlew.bat signingReport --console=plain
Pop-Location
```

## Lo que implementaremos después

Con los IDs verificaremos el flujo móvil de Google, su cancelación/errores, la verificación de ID token en NestJS y el acceso global acordado. La API debe comprobar firma, audiencia, emisor y caducidad; no aceptar un correo o ID de usuario enviado sin verificar. Ver [validación de token en backend](https://developers.google.com/identity/sign-in/web/backend-auth).

No necesitamos crear una cuenta de servicio ni descargar una clave privada de Google para este flujo de identificación. La configuración pública de marca y privacidad debe ser real antes de publicarlo para todos; no inventamos una política ni reclamamos la propiedad de `apolobyte.online`. Si Google solicita verificar el dominio del docente, coordinamos con su propietario.
