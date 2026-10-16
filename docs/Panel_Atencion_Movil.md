# Panel de atención y disponibilidad · EC-28 / EC-29

**Responsable:** Fabián Hoyos. **Corte:** 16 de octubre de 2026. Entregamos el panel y sus pruebas para revisión; EC-28/29 continúan En curso hasta completar los pendientes de aceptación de esta guía.

Reutilizamos el backend de calendario integrado en PR #2. La API pública de menú está integrada por PR #6 (`f8271b9`), y la administración de disponibilidad por PR #7 (`19c5d93`). [CI/CD de EC-28](https://github.com/YeisonMunoz69/Restaurante-Native/actions/runs/38843229932) pasó build/test y despliegue; verificamos salud HTTPS y 401 de la nueva ruta administrativa sin token.

## Acceso y conexión compartida

Conservamos React Native bare, la autenticación existente y las cinco pestañas. En **Ajustes**, solo ADMIN encuentra **Atención y disponibilidad**. El servidor sigue comprobando JWT/ADMIN; ocultar el botón no sustituye sus guards.

Antes del login elegimos API local o HTTPS dev y guardamos el UUID del restaurante. No hay UUID fijo en componentes ni credenciales compiladas. Local usa por defecto `http://10.0.2.2:3000/api/v1` en emulador Android; nuestra QA aislada usa puerto 3038. HTTPS dev usa `https://encanto-campestre-dev.apolobyte.online/api/v1`. El transporte HTTP local requiere la compilación debug; para la VPS usamos HTTPS.

Restauramos la conexión antes de montar AuthProvider. Guardamos su configuración en el servicio Keychain `encanto.connection.v1`, separado de los tokens existentes. Cambiar de servidor exige salir de la sesión y limpia tokens del entorno anterior. Bloqueamos login durante el guardado y ocultamos el selector durante la restauración de autenticación. Si falla persistir, no activamos el nuevo servidor. Si no podemos leer la configuración guardada, ofrecemos recuperar la conexión local, limpiando tokens antes de continuar.

Alex puede reutilizar `useConnection().settings.restauranteId`, `connectionUrl(settings)` y el cliente `apiClient`; su baseURL y la usada por refresh se sincronizan juntas. No debe añadir UUIDs o URLs distintas en la carta. Fabián aprobó estos cambios comunes y el acceso en Ajustes, sin nuevas bibliotecas. Alex mantiene EC-22/23/24 y Yeison EC-26/27/30.

## Calendario

Mostramos todas las reglas de cada día semanal, varias franjas, apertura/cierre, estado activo y sus IDs. Al guardar mandamos el reemplazo completo del día, conservando IDs de filas retenidas; recargamos GET para recuperar los nuevos. El backend preserva aforo existente y no lo administra desde este panel.

Consultamos por separado el día efectivo público y la excepción guardada. El panel distingue origen `SEMANAL`, `EXCEPCION` o `SIN_REGLA`. Abrir excepcionalmente permite horas HH:mm, motivo y `soloPorReserva`; cerrar limpia horas y `soloPorReserva`. Quitar la excepción vuelve a la semana. Cambiar la fecha exige consultarla antes de editar su excepción; no mostramos el formulario de la fecha anterior como si perteneciera a la nueva.

Ante 409 `RESERVAS_CONFIRMADAS_AFECTADAS` abrimos un diálogo con cantidad, fechas, cancelar y confirmar. Congelamos la operación advertida, bloqueamos su edición y repetimos el mismo método/URL/cuerpo solo tras confirmar, agregando la cantidad recibida. Si el servidor devuelve una cantidad nueva, vuelve a requerirse confirmación. Cancelar no repite la escritura. No cancelamos ni modificamos reservas. Otros 409 exigen recargar; no tienen confirmación automática.

Conservamos `America/Bogota`, el límite de búsqueda pública y el alcance de sede única del backend. No inventamos `Reservation.restaurantId`, aforo, compatibilidad de reservas al recortar horarios ni transiciones.

## Disponibilidad de platos

En **Platos por fecha** consultamos la lista paginada de categorías activas, mostrando regla general y excepción. Cada plato permite habilitar, deshabilitar o quitar la excepción. Guardamos únicamente los cambios de la fecha cargada, conservando la regla general y las demás fechas. Antes de cambiar fecha/página exigimos guardar o descartar el lote pendiente.

La copia muestra origen, destino, cantidad y reemplazo antes de enviar la confirmación. Copiamos disponibilidad efectiva de categorías activas de la sede, conforme al acuerdo registrado en Jira; una fotografía vencida se descarta y exige otra previsualización. Contratos y errores: [Disponibilidad_Platos_EC28.md](Disponibilidad_Platos_EC28.md).

## Pruebas y evidencia real

Usamos Node **22.23.3**. Ejecutamos `npm ci`, build shared y generación Prisma al preparar esta entrega; no cambiamos dependencias ni lockfile. Volvimos a validar lint/build API y TypeScript móvil. La suite completa pasó **164 tests API**, incluidos **21 con PostgreSQL aislado real**: 8 de menú, 7 de disponibilidad y 6 de calendario. Los demás usan dobles de Prisma. Las integraciones prueban persistencia al reconectar, precedencia, rollback y escrituras concurrentes, sin Supabase compartido.

Pasaron **27 tests móviles en siete suites**: IDs conservados, horas inválidas, recarga después de guardar, confirmación 409 con conteo cambiante/cancelación, disponibilidad `false`/`null`, copia confirmada sin reintento ciego, permisos visuales y conexión/Keychain. La prueba del proveedor intercala promesas de almacenamiento para comprobar que no hay login ni dos guardados mientras se cambia de entorno. Jest conserva el aviso `--forceExit` del script existente. Lint de los archivos propios nuevos y pruebas de Ajustes: cero errores/advertencias; el lint global móvil tenía diez errores preexistentes antes de este trabajo, en pantallas/servicios ajenos, y no lo declaramos limpio.

Compilamos e instalamos un APK debug x86_64 en el AVD **EncantoSprint2**, Android 36. Para compilar el proyecto instalamos el SDK 37.0 y build-tools 37 que ya exige su configuración, sin cambiar versiones de React Native, Gradle, dependencias o esquema. Corregimos las rutas Gradle hacia node_modules de la raíz y la visibilidad de shared en Metro. En Windows acortamos la carpeta temporal C++ y dejamos que CMake limite los nombres a 250 caracteres para evitar el error de Ninja por rutas largas. El build terminó `BUILD SUCCESSFUL`.

En el recorrido del **15 de octubre** iniciamos sesión ADMIN por la API local real, guardamos una regla 11:00–18:00 y comprobamos con otra conexión que conservó su ID y aforo 17. Cerramos 2031-02-23 después de ver la advertencia de dos confirmadas; previamente comprobamos que el 409 no había escrito. Cancelamos y luego confirmamos explícitamente. Ambas reservas siguieron CONFIRMADA. Abrimos 2031-02-25 excepcionalmente, 10:00–18:00 y soloPorReserva=true; la consulta pública y PostgreSQL coincidieron. Rechazamos la fecha imposible 2031-02-30.

| Evidencia | Captura |
| --- | --- |
| Regla guardada | [11:00–18:00](evidencias/calendario-android/calendario-regla.png) |
| Advertencia antes de cerrar | [409 y dos confirmadas](evidencias/calendario-android/calendario-409.png) |
| Cierre excepcional | [Origen excepción, cerrado](evidencias/calendario-android/calendario-cerrado.png) |
| Apertura solo por reserva | [Origen excepción, abierto](evidencias/calendario-android/calendario-abierto-reserva.png) |
| Fecha inválida | [Validación visible](evidencias/calendario-android/calendario-error-fecha.png) |

Las capturas corresponden a ese recorrido, anterior al ajuste final de SafeArea y del título genérico del error. No las presentamos como validación visual de esos ajustes ni como aceptación del dueño. No hay evidencia Android completa de guardar/copiar disponibilidad ni de recarga tras cerrar el proceso. Al continuar el 16 de octubre, la revisión automática bloqueó abrir/reiniciar la app por ADB con el motivo `blocked by policy`; no eludimos el bloqueo ni declaramos esos pasos aprobados.

## Reproducción aislada y aceptación pendiente

Primero seguimos la protección y creación del PostgreSQL local de [EC-28](Disponibilidad_Platos_EC28.md#repetir-pruebas-reales). Con las migraciones existentes y build API preparados, el helper genera datos propios y una contraseña aleatoria fuera del repositorio:

```powershell
$env:ENCANTO_MENU_TEST_DATABASE_URL='postgresql://encanto_test:encanto_local_test@127.0.0.1:PUERTO/encanto_ec25_test'
$env:ENCANTO_QA_STATE_FILE='C:/carpeta-fuera-del-repo/qa-state.json'
npx tsx apps/api/test/attention-android-qa.ts
```

Creamos antes la carpeta externa. El helper rechaza el destino de base no aislado y el archivo de estado dentro del repositorio. Arranca la API local en 3038 con un esquema único, credenciales de QA y dos reservas de prueba; no usamos seed, reset ni db push. Al detener el helper eliminamos solo su esquema generado. No subimos el archivo de estado ni sus credenciales.

En otra terminal ejecutamos Metro: `npm run start --workspace=@encanto/mobile -- --max-workers 2`. Desde `apps/mobile/android` compilamos `./gradlew.bat :app:assembleDebug -PreactNativeArchitectures=x86_64 --max-workers=2`. Abrimos la app debug en el emulador desde Android Studio, configuramos la API 3038 y el UUID del archivo externo, e iniciamos sesión con el usuario de QA. Nunca usamos estas pruebas de escritura contra HTTPS/Supabase compartido.

Pendientes para completar aceptación:

1. En Android final: guardar disponibilidad opuesta al general para ambos platos, recargar, copiar entre dos fechas con cancelar/confirmar y comprobar que generales/otras fechas quedan intactos; quitar excepción y volver al general.
2. Cerrar/reabrir la app: verificar configuración, sesión y datos persistidos; comprobar red caída/reintento y la presentación final de errores/SafeArea.
3. Validación con el dueño del recorrido de calendario y criterios vigentes, dejando su aprobación explícita. Las pruebas técnicas no sustituyen esa aceptación.
4. Alex conecta la carta EC-22 a EC-25 y recarga según fecha para demostrar el criterio visual de EC-28 en la carta del comensal. No desarrollamos su pantalla en paralelo ni la damos por entregada.

EC-29 sigue En curso hasta panel integrado y aceptación completa. EC-28 sigue En curso hasta panel/recorrido y consumo final. No iniciamos EC-31/32/34. **Pendiente actualizar requisitos en Drive y Word local: RF-ADM03/ADR-010 y RF-ADM06/HU-05, copia efectiva confirmada, acceso/configuración compartida, responsable Fabián de A04/A05 y secciones 8/10.**
