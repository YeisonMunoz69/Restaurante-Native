# Google desde cero y dos apps de ensayo

**Continuidad del 26/10:** registramos [EC-75](https://yjmunoz.atlassian.net/browse/EC-75), Por hacer/backlog y asignada a Alex, para completar API+móvil y Ajustes durante la ausencia de Yeison/Fabián, después de estabilizar EC-74/PR #16. Los criterios ya están en Jira; esto no acredita clientes OAuth creados ni login implementado. EC-58 requiere reconciliación explícita antes de retirar contraseña/verificación propias. Pendiente actualizar requisitos en Drive y Word local: RF-AUT01/02/03/05/08, organización de Ajustes y sección 8.

Actualizado el 22/10/2026. **Crear clientes y variables no implementa el login.** Hoy conservamos la autenticación existente hasta conectar Google, verificar ID tokens en NestJS y probar el acceso obligatorio. No activamos un botón incompleto ni cambiamos a Supabase Auth o Expo Go.

## 1. Las dos instalaciones

| App | Paquete final | Backend | Ejecución |
| --- | --- | --- | --- |
| EncantoApp Local | `co.encantocampestre.app.local` | API Docker del PC | `localDebug`, Metro |
| EncantoApp | `co.encantocampestre.app` | HTTPS de la VPS dev | `vpsDebug`, bundle incluido, sin Metro |

Ambas son desarrollo, no producción. Sus paquetes separan sesiones y preferencias. Local permite cambiar la dirección local antes de iniciar sesión; VPS fija `https://encanto-campestre-dev.apolobyte.online/api/v1` y la sede `6933b63c-24cf-495b-b396-f88c4956624c`. No duplicamos contenedores VPS por cada app.

Usamos firma de ensayo existente. El intento optimizado `vpsRelease` sigue fallando en CMake/Ninja de Windows; no lo contamos como aprobado. `vpsDebug` incluye JavaScript y deshabilita soporte Metro para esa variante. Antes de Play necesitamos firma y build release definitivos.

## 2. Crear proyecto y consentimiento

1. Entramos con la cuenta del equipo a [Google Cloud Console](https://console.cloud.google.com/), selector superior → Nuevo proyecto. Nombre sugerido: «El Encanto Campestre Dev». Anotamos el **ID del proyecto**.
2. Seleccionamos el proyecto → **Google Auth Platform → Comenzar**. En otra vista puede aparecer APIs y servicios → Pantalla de consentimiento OAuth.
3. Nombre de aplicación: EncantoApp; correo de soporte y contacto reales. Audiencia **External**, para cuentas personales y no solo de la universidad. Revisamos personalmente las condiciones antes de crear.
4. Conservamos pruebas y añadimos los correos del equipo en Audience/Público → Test users cuando corresponda. Para autenticación básica Google documenta una excepción a las restricciones de lista y expiración de otros permisos. Pedimos solo `openid`, correo y perfil; no Gmail, Drive o contactos. [Audiencia y pruebas](https://support.google.com/cloud/answer/15549945).

## 3. Obtener la firma

En PowerShell, raíz del clon actualizado:

```powershell
Push-Location apps/mobile/android
.\gradlew.bat :app:signingReport --console=plain
Pop-Location
```

Buscamos **localDebug** y **vpsDebug** y copiamos su SHA-1. La firma debug comprobada previamente en este clon fue `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`; confirmamos la salida actual antes de registrarla. Si un compañero firma con otro certificado, necesita el par paquete+huella correspondiente. No compartimos claves privadas. [Firma Android](https://developers.google.com/android/guides/client-auth).

## 4. Crear tres clientes OAuth

En **Clients/Clientes → Crear cliente**:

1. Tipo **Android**, nombre EncantoApp Local; paquete `co.encantocampestre.app.local`; SHA-1 de localDebug.
2. Tipo **Android**, nombre EncantoApp VPS dev; paquete `co.encantocampestre.app`; SHA-1 de vpsDebug.
3. Tipo **Web application**, nombre EncantoApp API dev, en el mismo proyecto. Para Android → ID token → NestJS dejamos vacíos los orígenes JavaScript y redirecciones. No inventamos `/auth/google/callback`. Copiamos el Client ID Web terminado en `.apps.googleusercontent.com`: es la audiencia que usarán móvil y API. [Configuración oficial](https://codelabs.developers.google.com/sign-in-with-google-android).

El paquete OAuth es el applicationId final, no necesariamente el namespace Kotlin. Los dos Android IDs no reemplazan al Web ID. Podemos compartir el Web ID entre ambos backend de ensayo; si luego separamos proyectos, cada app deberá usar la audiencia aceptada por su servidor.

No necesitamos Client secret, cuenta de servicio ni clave privada JSON para este flujo. Si Google muestra un secret, no lo enviamos al chat ni lo ponemos en el APK.

## 5. Guardar los identificadores

Añadimos a **apps/api/.env del PC**, sin reemplazar las conexiones que funcionan:

```dotenv
# Preparación; estos valores todavía no activan el login Google.
GOOGLE_PROJECT_ID=ID_REAL_DEL_PROYECTO
GOOGLE_WEB_CLIENT_ID=ID_WEB_REAL.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID_LOCAL=ID_ANDROID_LOCAL.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID_VPS=ID_ANDROID_VPS.apps.googleusercontent.com
```

Pegamos ese mismo bloque en **/root/projects/equipo-7/apps/api/.env.vps**. Los Client ID no son contraseñas; los Android IDs se conservan como referencia de configuración. No ponemos DATABASE_URL, JWT o la clave privada de Supabase en el móvil.

El .env de NestJS **no configura un APK automáticamente**. Antes de compilar, nuestro Gradle recibe el Web ID público:

```powershell
$env:ENCANTO_GOOGLE_WEB_CLIENT_ID='ID_WEB_REAL.apps.googleusercontent.com'
```

Lo exponemos como `NativeModules.EncantoBuild.googleWebClientId` para la futura selección nativa de cuenta. Cambiarlo exige recompilar/reinstalar. No necesitamos otro .env en la raíz ni google-services.json para esta preparación con Cloud y NestJS. Firebase para notificaciones es independiente.

Cuando termines, avisa «clientes Google creados y guardados en apps/api/.env». No envíes secretos o tokens. Después implementaremos selección/cancelación/errores, validación de firma, audiencia, emisor y caducidad, y sesión propia. Recibir un correo escrito por el teléfono no autentica al usuario. [Validación oficial en backend](https://developers.google.com/identity/sign-in/web/backend-auth).

## 6. Compilar e instalar ambas

```powershell
Push-Location apps/mobile/android
.\gradlew.bat :app:assembleLocalDebug :app:assembleVpsDebug -PreactNativeArchitectures=arm64-v8a --max-workers=2 --console=plain
Pop-Location
adb install -r apps/mobile/android/app/build/outputs/apk/local/debug/app-local-debug.apk
adb install -r apps/mobile/android/app/build/outputs/apk/vps/debug/app-vps-debug.apk
```

La segunda actualiza el paquete original conservando datos, no desinstalamos para forzarla. Una conexión antigua local no se hereda como conexión VPS.

Para Local abrimos Metro en otra terminal: `npm run start --workspace=@encanto/mobile`. Con la API Docker publicada en 3000 y teléfono USB:

```powershell
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000
```

En Ajustes de Local guardamos `http://localhost:3000/api/v1` y el UUID de la sede **local**. Si Docker publica otro puerto, lo usamos tanto en URL como en adb reverse. El emulador usa `http://10.0.2.2:3000/api/v1`; con Wi-Fi usamos la IP LAN del PC. Depuración inalámbrica no garantiza conectividad al backend.

EncantoApp VPS solo necesita Internet. **Instalar el APK no despliega la API:** primero hay que revisar/integrar la rama en dev, pasar CI/CD/migraciones y comprobar salud HTTPS. La [carga del catálogo](Carta_Original_2026-10-22.md) se ejecuta una sola vez tras revisar su previsualización. No usamos esa base para escrituras de QA.

## 7. Fotos y pendientes manuales

En la API VPS deben estar SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y SUPABASE_STORAGE_BUCKET=platos, además de PostgreSQL y JWT actuales. La clave privada solo vive en backend. Entramos con una cuenta ADMIN real, editamos cada producto y cargamos sus fotos desde el panel. Comprobar que existe el bucket no completa por sí solo EC-27.

No verificamos apolobyte.online para un callback inexistente. Si Google exige propiedad/marca/URLs para publicación, lo coordinamos con el docente propietario; no reclamamos su dominio. Logo definitivo, política real de privacidad, firma release y publicación para todos siguen pendientes.
