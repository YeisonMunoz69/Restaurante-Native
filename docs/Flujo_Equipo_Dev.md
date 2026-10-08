# Trabajo del equipo sobre dev

## 1. Qué compartimos y qué verificamos

Trabajamos en el computador de cada integrante y usamos la VPS como destino de prueba compartido. No necesitamos programar dentro del clon del servidor: una modificación sin commit allí detiene el despliegue para evitar perderla.

Nuestro flujo es: rama personal → Pull Request a `dev` → filtros → integración a `dev` → despliegue por SSH. También configuramos el despliegue para un push directo a `dev`, pero preferimos el Pull Request para revisar el trabajo. Reservamos `main` para la futura VPS de producción; no desplegamos esa rama en este servidor.

El 8 de octubre verificamos el despliegue manual: migraciones sin pendientes, contenedor saludable en `127.0.0.1:8084` y salud HTTPS con `status: ok` y `database: connected`, según las salidas SSH compartidas. Después pasó el intento 3 de [CI/CD dev, ejecución 37829822767](https://github.com/YeisonMunoz69/Restaurante-Native/actions/runs/37829822767), sobre `db937f1`. Ya podemos entregar funcionalidades mediante PR a `dev`; seguimos comprobando cada despliegue nuevo. La [guía de despliegue](Despliegue_VPS_Staging.md) queda como referencia para volver a preparar un servidor.

No compartimos `.env`, llaves privadas, contraseñas ni tokens. Consultamos KeePass. Sigue pendiente confirmar la rotación de las credenciales expuestas; que el despliegue funcione no demuestra que se hayan rotado.

## 2. Preparar nuestra máquina

Usamos Node 22 actualizado (22.22.3 o superior en esa línea), Git y los requisitos Android del README. Después de que `dev` esté publicada, desde PowerShell:

```powershell
git clone --branch dev https://github.com/YeisonMunoz69/Restaurante-Native.git
cd Restaurante-Native
npm ci
npm run build --workspace=@encanto/shared
npx prisma generate --schema=apps/api/prisma/schema.prisma
```

Si ya tenemos el repositorio, guardamos nuestro trabajo en su rama antes de cambiar. Desde un árbol limpio:

```powershell
git fetch origin
git switch dev
git pull --ff-only origin dev
```

Si `dev` todavía no existe localmente pero aparece como `origin/dev`, usamos `git switch --track origin/dev` en lugar de `git switch dev`.

Las pruebas unitarias no necesitan la base remota. Para arrancar la API sí completamos las variables locales siguiendo el README, sin reutilizar el archivo privado del servidor.

## 3. Entregar una funcionalidad

Cada integrante crea una rama con su nombre y una sola funcionalidad. Ejemplo de Alex:

```powershell
git switch -c alex/api-menu
# Implementamos la funcionalidad y sus pruebas.
npm run build --workspace=@encanto/shared
npx prisma generate --schema=apps/api/prisma/schema.prisma
npm run lint --workspace=api
npm run test --workspace=api
npm run build --workspace=api
npm run test --workspace=@encanto/mobile
git status --short
# Agregamos únicamente los archivos de nuestra funcionalidad.
git add apps/api/src/menu
git commit -m "alex/implementa-api-menu"
git push -u origin alex/api-menu
```

`apps/api/src/menu` es la carpeta propuesta para esa funcionalidad, no una carpeta existente que debamos agregar antes de crearla. Fabián y Yeison usan sus respectivos prefijos y rutas; no copiamos el nombre de Alex para nuestros commits. Verificamos nuestra identidad con `git var GIT_AUTHOR_IDENT` antes de hacer commit, respetando [Reglas.md](../Reglas.md).

En GitHub abrimos el Pull Request con **base: dev**, explicamos qué hicimos y cómo lo probamos. Esperamos el check **Build and test**, revisamos los cambios y luego integramos. Un PR no despliega; la integración genera el push a `dev` que sí lo hace. Si los filtros fallan, no se ejecuta el job de despliegue.

No usamos `git push --force` sobre `dev`. Si falta proteger la rama, Yeison puede configurar la exigencia del check en GitHub; el workflow por sí solo no impide integrar un PR fallido.

## 4. Trabajo por compañero

Tomamos las responsabilidades del [plan de sprints](Plan_de_Sprints.md). Esta tabla define el siguiente trabajo, no afirma que las funcionalidades estén terminadas.

| Integrante | Sprint 2: primera entrega | Sprint 3: después de carta y calendario |
| --- | --- | --- |
| Alex | API de categorías, platos, etiquetas y disponibilidad; pruebas por fecha. Después, fotos con sharp y Supabase Storage. | Franjas de reserva, aforo en transacción serializable y pruebas de concurrencia/transiciones. |
| Fabián | Administración de categorías/platos, disponibilidad por fecha y calendario de atención con excepciones. | Estados de reserva, aprobación/rechazo, bandeja y agenda con marcado de llegada. |
| Yeison | Revisar los avances móviles de carta y detalle en su rama anterior, integrarlos con la API real y preparar el uso del dominio dev. | Formulario de reserva, pedido/resumen, ticket, instrucciones de pago/WhatsApp y mis reservas. |

Antes de duplicar la carta y la galería, revisamos los commits `34e17b9` y `5b2d5cd` de `yeison/inicio-sprint-2`. También existe `5ec3d22` con una migración a Expo que necesita revisión separada: no la integramos automáticamente en esta preparación del despliegue. Que esos avances existan en una rama no significa que estén entregados en `dev` ni aceptados de extremo a extremo.

Acordamos primero entre Alex y Fabián las rutas, DTOs y responsabilidades del menú para no implementar dos veces el mismo CRUD. Compartimos validaciones/tipos en `packages/shared` cuando corresponda. Cada cambio de esquema incluye su migración versionada y una explicación del efecto en los datos; en la VPS usamos `migrate deploy`, nunca `migrate reset` ni `db push`.

Dividimos la primera entrega en [encargos concretos de Sprint 2](Encargos_Sprint2.md): Alex empieza por la API pública del menú y Fabián por el calendario. Todavía no damos por terminados administración de carta, carga de fotos, pantallas móviles ni reservas.

Para cerrar una historia comprobamos su criterio de aceptación real: pantallas conectadas, permisos administrativos y pruebas. Actualizamos el plan/backlog con la evidencia, no solo porque un archivo compile.

## 5. Comprobar nuestra entrega en la nube

Después de integrar revisamos **Actions → CI/CD dev**: deben pasar `Build and test` y `Deploy dev to VPS`. Luego comprobamos:

```powershell
Invoke-RestMethod https://equipo-7-elev-d-dev.apolobyte.online/api/v1/health
```

Esperamos `status: ok` y `database: connected`. La salud demuestra que la API y PostgreSQL responden; no reemplaza las pruebas funcionales del módulo que acabamos de entregar.

La app móvil de esta rama todavía usa direcciones locales de desarrollo. Configurar y probar el cliente contra el dominio de la VPS es una tarea de Yeison; el `API_URL` del archivo del servidor no cambia automáticamente la URL compilada en el teléfono. La app React Native no se publica como página web dentro de este contenedor.

Si algo falla, identificamos el primer paso rojo y lo corregimos en nuestra rama. Para SSH, variables, Nginx, migraciones o contenedor `unhealthy`, seguimos el diagnóstico de la guía. No detenemos contenedores ni modificamos sitios de otros equipos.

## 6. Pendientes de seguridad antes de dar el despliegue por listo

Durante la construcción local del 8 de octubre, npm reportó una alerta crítica de `proxy-addr` en las dependencias de la API. Con autorización de Yeison actualizamos solo ese paquete de 2.0.7 a 2.0.8, versión corregida según la [alerta oficial](https://github.com/advisories/GHSA-jqcg-44mw-7w3h). La auditoría de dependencias de ejecución de API/shared ya reporta cero vulnerabilidades; también la etapa de Docker que elimina dependencias de desarrollo reportó cero. Esto corresponde a esa comprobación y ese alcance, no garantiza ausencia de fallos ni reemplaza nuevas auditorías.

La auditoría del monorepo también reportó alertas de dependencias móviles y de herramientas, entre ellas [shell-quote](https://github.com/advisories/GHSA-pqg4-j6r4-53mv). Las separamos de la API y revisamos las actualizaciones compatibles, sin ejecutar `npm audit fix --force` ni degradar React Native a ciegas. El parche de `proxy-addr` no modifica el código funcional ni resuelve esas otras alertas.
