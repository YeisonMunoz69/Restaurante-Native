# Comprobación en celular · EC-28 / EC-29

El 16 de octubre de 2026 retomamos con Fabián el recorrido aplazado. Usamos su Samsung SM-G780G, Android 13 / API 33, ABI arm64-v8a, pantalla 1080×2400. No abrimos Android Studio ni escribimos en Supabase/VPS. Conservamos React Native bare y la autenticación existente.

## Código y entorno

Partimos de `b1e0cf1`, integración del PR #8 en dev. Durante la prueba corregimos la altura y el relleno inferior del navegador para sumar `useSafeAreaInsets().bottom`, conservando cinco pestañas y sin nuevas dependencias: commit `1e79c6f`. Quitamos del mismo componente un parámetro sin uso que ya causaba error de lint. Los contenedores administrativos se corrigieron en `1cfee7b` y `6d8599b`.

Al revisar los reinicios detectamos controles ausentes o mezclados al cambiar de formulario y fecha, aunque la petición HTTP ya había terminado correctamente. Separamos cada formulario en un contenedor nativo no colapsable con clave por panel/sede, y conservamos sus vistas con `removeClippedSubviews={false}` en el ScrollView administrativo. Repetimos la alternancia calendario/platos y las consultas del 23/24, comprobando que cada panel mostrara únicamente sus controles y los resultados. Conservamos el formulario paginado; no cambiamos autenticación, dependencias ni banderas globales de React Native. La [documentación de ScrollView](https://reactnative.dev/docs/scrollview#removeclippedsubviews) advierte de contenido ausente con ese recorte. Las capturas sin filas se sustituyeron por evidencia con resultados visibles.

Compilamos con Node 22.23.3 y JDK 17:

```powershell
cd apps/mobile/android
./gradlew.bat :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --max-workers=2 --console=plain
```

El resultado fue `BUILD SUCCESSFUL`. Instalamos el APK debug con `adb install -r`, sin desinstalar ni borrar datos. SHA-256 del APK nativo instalado: `6e1bc37431bce9fea392aa9abaccc753069e410847ea5026d79ede89b51bb431`. El JavaScript lo sirvió Metro del checkout, incluido el ajuste de navegación; ese hash no representa un APK release con JavaScript empaquetado.

Arrancamos `attention-android-qa.ts` contra PostgreSQL 17 local desechable, puerto exclusivo y esquema aleatorio. El helper aplicó las migraciones existentes y generó el restaurante, dos platos, ADMIN y dos reservas de prueba. Los secretos y el archivo de conexión quedaron fuera del repositorio. El teléfono usó `http://127.0.0.1:3038/api/v1` mediante `adb reverse`; Metro usó 8081. Las reservas solo sirven como datos de prueba del aviso: no implementamos flujos de reservas ni aforo.

## Resultados observados

Las escrituras de esta tabla se hicieron desde los formularios del celular. Después abrimos otra conexión Prisma al esquema aislado y consultamos la API pública de menú; los JSON contienen esos resultados, sin credenciales ni tokens.

| Paso | Resultado | Evidencia |
| --- | --- | --- |
| Guardar y recargar disponibilidad | En 2031-02-23 deshabilitamos el plato general habilitado y habilitamos el general deshabilitado. La API devolvió ambos con origen FECHA. 2031-02-24/25 y los generales no cambiaron. | [Captura](telefono-disponibilidad-guardada.png), [contraste source](phone-source.json) |
| Previsualizar y cancelar copia | La pantalla mostró origen 23, destino 24, dos platos y dos cambios. Cancelar no creó excepciones en el destino. | [Previsualización](telefono-copia-previa.png), [contraste cancel](phone-cancel.json) |
| Confirmar copia | Ambos valores efectivos del 23 quedaron como excepciones del 24; el 25 y los generales siguieron intactos. | [Contraste copied](phone-copied.json) |
| Quitar excepciones | El 23 volvió al general, sin quitar las excepciones copiadas del 24. | [Contraste removed](phone-removed.json) |
| Error de conexión y recuperación | Quitamos únicamente el reverse de 3038. La consulta mostró un error; restauramos el reverse y volvimos a consultar correctamente. No cambiamos Wi-Fi ni datos del teléfono. | [Mensaje visible](telefono-error-red.png) |
| Horas y fechas reales | Rechazamos `25:00` y `2031-02-30`, con diálogo «Revisa la operación». Después corregimos los campos. | [Hora](telefono-error-hora.png), [fecha](telefono-error-fecha.png) |
| Reemplazar reglas semanales | Guardamos domingo 11:00–18:00. Se conservó el ID `779d82eb-3c24-4628-97e8-6558f6485193` y su aforo anterior 17; el panel no administra ese aforo. | [Contraste warning](phone-warning.json) |
| Cerrar con reservas | El 409 informó dos confirmadas para 2031-02-23 antes de crear la excepción. Cancelamos y después repetimos y confirmamos el cierre. | [Advertencia](telefono-calendario-409.png), [sin escritura antes de confirmar](phone-warning.json), [cerrado por excepción](telefono-calendario-cerrado.png) |
| Apertura excepcional | Abrimos 2031-02-25, sin regla semanal, de 10:00 a 18:00 y soloPorReserva=true. Las dos reservas del 23 siguieron CONFIRMADA. | [Panel](telefono-calendario-reserva.png), [contraste calendar](phone-calendar.json) |
| Reinicio de proceso | Fabián forzó manualmente la detención y abrió HelloWorld. Comprobamos 13673 → 29778 y, después de corregir los contenedores, 7151 → 10958. En la versión final recuperamos ADMIN sin volver a introducir credenciales, la sede configurada y los datos del servidor. Recargamos el calendario del 25 y los platos del 24. | [Sede restaurada](telefono-reinicio-conexion.png), [calendario recargado](telefono-reinicio-calendario.png), [platos recargados](telefono-reinicio-platos.png), [contraste reopened](phone-reopened.json) |

En todos los contrastes, la disponibilidad general siguió siendo true/false respectivamente, la tercera fecha siguió usando GENERAL y ambas reservas continuaron CONFIRMADA. Los identificadores pertenecen exclusivamente al esquema local desechable.

## Pruebas automatizadas y límites

En esta continuación pasaron las siete suites y **27 pruebas móviles**, TypeScript móvil (`tsc --noEmit`) y lint del navegador sin errores (`eslint ... --quiet`). Permanecen cinco advertencias previas de componentes anidados en ese archivo; no presentamos el lint global móvil como limpio. El aviso `--forceExit` pertenece al script existente. No añadimos dependencias, migraciones ni cambios de reglas de negocio.

La entrega integrada ya tenía **164 pruebas API**, incluidas **21 de PostgreSQL real aislado** (8 menú, 7 disponibilidad, 6 calendario). No contamos estos contrastes manuales como pruebas unitarias nuevas ni confundimos Prisma simulado con persistencia. La reproducción de esas suites y del helper está en [Panel_Atencion_Movil.md](../../Panel_Atencion_Movil.md) y [Disponibilidad_Platos_EC28.md](../../Disponibilidad_Platos_EC28.md).

Las capturas finales usan gestos: Fabián quitó los tres botones durante la prueba. Observamos su superposición inicial y corregimos el cálculo del espacio inferior, pero no repetimos el recorrido final con tres botones. No declaramos esa variante probada ni extendemos la evidencia a otros equipos/iOS. Las aperturas y la detención del proceso las hizo Fabián porque la revisión automática había bloqueado esas acciones por ADB; no eludimos el bloqueo.

**EC-29 sigue En curso:** falta aceptación explícita con el dueño del recorrido y sus criterios. **EC-28 sigue En curso:** además falta que Alex conecte EC-22 y demuestre en la carta del comensal los cambios de fecha. La carta que aparece al iniciar este APK conserva los datos de muestra de esa pantalla; no la presentamos como consumo de EC-25 ni la implementamos en paralelo. EC-25 ya está integrado y Listo. No empezamos EC-31/32/34.

**Pendiente actualizar requisitos en Drive y Word local: RF-ADM03/ADR-010 y RF-ADM06/HU-05, copia efectiva confirmada, acceso/configuración compartida, responsable Fabián de A04/A05 y secciones 8/10.**
