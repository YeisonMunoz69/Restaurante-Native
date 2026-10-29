# Despliegue del equipo 7 y CI/CD de dev

## Actualización EC-74 · variables privadas de desarrollo

El workflow del repositorio original usa el entorno de GitHub **`dev`** y el secreto **`VPS_API_ENV_FILE_B64`** para reconstruir `apps/api/.env.vps`. El secreto contiene una sola línea con el archivo completo de desarrollo codificado en base64. Su contenido debe corresponder a la configuración aprobada de la VPS; no lo generamos desde `.env` de la raíz ni desde los valores locales de `apps/api/.env`. Los secretos SSH existentes siguen siendo independientes y solo permiten la conexión Actions → VPS.

No se imprime el valor, ni siquiera durante validación. El instalador comprueba que estén presentes y no vacías `DATABASE_URL`, `DIRECT_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_STORAGE_BUCKET`. Si falta el secreto, la codificación es inválida, falta una variable o no existe un archivo actual que respaldar, el paso falla antes de reemplazar la configuración.

Antes de reemplazar, el instalador guarda una copia privada en `/root/backups/elev-d-e-7-dev/env/` con permisos `600`; el directorio queda en `700`. El temporal se escribe junto al destino, también en `600`, y se cambia de forma atómica. Para recuperar una copia concreta:

```bash
install -m 600 /root/backups/elev-d-e-7-dev/env/<copia> /root/projects/equipo-7/apps/api/.env.vps
```

La conexión Actions → VPS verifica la huella ED25519 fijada en `.github/workflows/ci.yml`. La preparación de este archivo no confirma que el secret exista: antes de integrar el cambio en `dev`, configuramos el entorno `dev` con el contenido vigente de `.env.vps` usando un canal administrativo autorizado. No copiamos valores entre desarrollo y producción.

## 1. Donde quedamos y que seguimos del docente

**Actualización del 15 de octubre:** el dominio vigente es `https://encanto-campestre-dev.apolobyte.online`. La salida SSH de hoy confirma el clon limpio en `/root/projects/equipo-7`, `dev` en `0e27cb4`, contenedor `elev-d-e-7-api` saludable y PostgreSQL conectado. Configuramos además la Deploy key de solo lectura para la descarga VPS → GitHub, descrita en la sección 7.1. Conservamos los secretos SSH para la conexión Actions → VPS de la guía del docente; ambas conexiones cumplen funciones distintas. Las referencias al subdominio del equipo en los resultados anteriores son históricas.

Para ubicarnos rápidamente en la VPS ejecutamos `cd /root/projects/equipo-7`, `git status --short --branch` y `docker ps --filter name=elev-d-e-7-api`. La configuración privada está en `apps/api/.env.vps`; Compose en `apps/api/docker-compose.vps.yml`; el script es `scripts/deploy-vps.sh`. Las llaves están en `/root/.ssh`; no copiamos sus archivos privados a documentación. El puerto verificado sigue siendo `127.0.0.1:8084`, hacia el 3000 del contenedor. Consultamos `nginx -T` filtrado por dominio/proxy para localizar el sitio actual sin asumir que su nombre de archivo cambió con el dominio.

**Corte del 9 de octubre de 2026:** esta VPS ya está preparada y `dev` desplegada con la landing en `0e27cb4`. La última aceptación registrada pasó [CI/CD, ejecución 37848652598](https://github.com/YeisonMunoz69/Restaurante-Native/actions/runs/37848652598), y salud HTTPS respondió con base conectada. No repetimos esa prueba remota por actualizar documentación.

Tenemos Ubuntu 24.04, Docker/Compose, Nginx y Certbot. El clon está en `/root/projects/equipo-7`; el sitio `apolobyte-e-7` atiende `equipo-7-elev-d-dev.apolobyte.online` y envía a `127.0.0.1:8084`, que Docker lleva al puerto 3000 de la API. El 8083 era el ejemplo inicial, no nuestro puerto vigente.

Para trabajar ahora seguimos la sección 10 y [Flujo_Equipo_Dev.md](Flujo_Equipo_Dev.md), sin volver a clonar, crear ramas base ni configurar Nginx. Las secciones 2–9 conservan el procedimiento de preparación para un servidor nuevo; no son tareas pendientes de esta VPS. La landing no sustituye el cliente Android ni el workspace Next.js de Sprint 4.

Seguimos estas guias:

- [Despliegue ApoloByteExample](https://app.notion.com/p/Despliegue-ApoloByteExample-3eb04bbd869d8065ab85c001d85696b7).
- [Tabla de puertos](https://app.notion.com/p/Tabla-de-puertos-8cf04bbd869d83d8af8b019fe1998145).
- [Prerequisitos](https://app.notion.com/p/Prerequisitos-para-desplegar-d7904bbd869d82cc82000109724969f1).
- [Configuracion del contenedor](https://app.notion.com/p/Configurando-el-contenedor-89104bbd869d828dac5d81f3e1284763).
- [Configuracion del dominio](https://app.notion.com/p/Configurando-el-dominio-f5204bbd869d8333b40a81645ce1bc63).
- [CI/CD por SSH](https://app.notion.com/p/Ci-Cd-3ed04bbd869d80d796f0f985111517e4).

Mantuvimos Docker Compose con `--env-file`, nombres propios del equipo, Nginx como proxy, Certbot para HTTPS y `appleboy/ssh-action@v1.0.0` con los secretos `SSH_*` del ejemplo. Adaptamos lo necesario a nuestro proyecto:

| Ejemplo del docente                 | Nuestro repositorio                                              |
| ----------------------------------- | ---------------------------------------------------------------- |
| Rama de ejemplo main                | dev; main corresponde a otra VPS                                 |
| Carpeta de ejemplo                  | /root/projects/equipo-7                                          |
| Frontend web y backend de ejemplo   | API NestJS; la app React Native se ejecuta en el dispositivo     |
| docker-compose.yml junto al ejemplo | apps/api/docker-compose.vps.yml dentro del monorepo              |
| Variables en .env                   | apps/api/.env.vps, ignorado por Git                              |
| Compilacion remota con npm          | Compilacion dentro de Docker, migraciones y arranque con Compose |
| Puerto asignado ocupado             | 8084 como siguiente libre, segun la indicacion de la tabla       |
| Nuevo sitio Nginx                   | Reutilizamos el sitio y certificado existentes del equipo        |

La asignacion de Classroom tiene prioridad sobre la tabla de Notion. Si nos dieron otro puerto, cambiamos `API_HOST_PORT` y `proxy_pass` al mismo numero antes de arrancar. No detenemos los contenedores de otros equipos.

En la comprobacion local inicial del 8 de octubre pasaron instalación limpia en Linux, lint, 14 pruebas de API, 9 móviles y compilaciones de shared/API. Después, con la landing, pasaron 21 de API y 9 móviles. Construimos las imágenes y comprobamos usuario no root y exclusión de archivos privados. Esas pruebas locales no conectaron a Supabase: la aceptación remota posterior, diferenciada de los mocks, queda registrada en la sección 11.

## 2. Publicar cambios: dev ya existe

Para un cambio nuevo partimos de un árbol limpio en el computador. Conservamos cualquier trabajo previo en su rama; no usamos estos comandos para descartarlo. Ejemplo de Alex:

```powershell
cd C:\Users\yjmg1\Desktop\Restaurante-Native
git fetch origin
git switch dev
git pull --ff-only origin dev
git switch -c alex/nombre-de-la-funcionalidad
```

Implementamos y probamos la entrega siguiendo el flujo del equipo. Con autorización del integrante publicamos **su rama**, no recreamos `dev` ni forzamos un push:

```powershell
git push -u origin alex/nombre-de-la-funcionalidad
```

Abrimos un Pull Request con base `dev`, esperamos filtros y revisión. El PR solo verifica; su integración produce el push a `dev` que despliega. `main` no participa. Los commits, identidad y permisos siguen Reglas.md.

Si preparamos otro servidor, completamos clon, variables y secretos SSH antes de intentar el despliegue. Si falla una ejecución por preparación, corregimos ese paso y repetimos el job sobre el commit vigente, sin agregar el workflow a `main`.

## 3. Clonar desde la terminal SSH de VS Code

En la ventana de VS Code conectada a la VPS abrimos una terminal Linux. El texto del prompt, como `root@vmi...#`, no forma parte del comando; tampoco anteponemos la palabra SSH.

Comprobamos la carpeta:

```bash
cd /root/projects/equipo-7
pwd
find . -mindepth 1 -maxdepth 1 -print -quit
```

Si `find` no imprime nada, clonamos. El repositorio es publico, por lo que HTTPS permite leerlo sin otra llave de GitHub:

```bash
git clone --single-branch --branch dev https://github.com/YeisonMunoz69/Restaurante-Native.git .
git status --short --branch
git log -1 --oneline
```

Si ya hay un clon, comprobamos que este limpio y actualizamos:

```bash
git status --short --branch
git fetch origin
git checkout dev
git pull --ff-only origin dev
```

La VPS funciona como destino de despliegue. Programamos y hacemos commits en nuestras ramas de trabajo; los cambios compartidos llegan a `dev` mediante push o integracion de un Pull Request.

## 4. Crear las variables del servidor

Desde `/root/projects/equipo-7`, y solo si aun no existe el archivo:

```bash
cp apps/api/.env.vps.example apps/api/.env.vps
chmod 600 apps/api/.env.vps
nano apps/api/.env.vps
```

No sobrescribimos un archivo ya completado. La plantilla trae estos valores de nuestro equipo:

```dotenv
API_HOST_PORT=8084
API_CONTAINER_NAME=elev-d-e-7-api
API_IMAGE_NAME=elev-d-e-7-api:dev
API_MIGRATION_IMAGE_NAME=elev-d-e-7-migrations:dev
API_URL=https://equipo-7-elev-d-dev.apolobyte.online/api/v1
```

Completamos `DATABASE_URL`, `DIRECT_URL` y los dos secretos JWT consultando KeePass. La contraseña de Supabase expuesta en el diagnostico anterior debe estar rotada antes de usar esa conexion. No compartimos el archivo ni copiamos sus valores al chat.

Revisamos tambien el [alcance de la comprobacion de seguridad](Flujo_Equipo_Dev.md#6-pendientes-de-seguridad-antes-de-dar-el-despliegue-por-listo). Corregimos la alerta de `proxy-addr` con 2.0.8; la auditoria de dependencias de ejecucion de API/shared y la etapa runtime de Docker reportaron cero vulnerabilidades en esta comprobacion. Las alertas de movil/herramientas siguen separadas y pendientes.

Para runtime podemos usar el pooler de sesion con puerto 5432 y TLS. Para migraciones usamos la conexion directa o el pooler de sesion compatible; no usamos el pooler transaccional 6543. Verificamos que ambas cadenas apunten al proyecto de prueba correspondiente y que los caracteres especiales de la contraseña esten codificados para URL.

Generamos dos secretos JWT independientes con `openssl rand -hex 32` y los guardamos en KeePass. `NODE_ENV=production` define el modo de ejecucion de Node dentro del contenedor; `APP_ENV=staging` identifica este entorno de prueba. Swagger permanece desactivado. `CORS_ORIGIN` puede quedar vacio mientras no tengamos una web que llame a la API.

Comprobamos permisos e ignorado, sin mostrar el contenido:

```bash
stat -c '%a %U:%G %n' apps/api/.env.vps
git check-ignore -v apps/api/.env.vps
ss -lntp | grep ':8084 ' || true
```

Si 8084 esta ocupado, aplicamos la indicacion del docente y elegimos el siguiente libre, actualizando tambien Nginx.

## 5. Construir, migrar y arrancar

El script compartido por el despliegue manual y GitHub Actions ejecuta la misma secuencia:

```bash
cd /root/projects/equipo-7
bash scripts/deploy-vps.sh
```

Por dentro realiza estos comandos; no necesitamos ejecutarlos de nuevo si el script ya paso:

```bash
docker compose --env-file apps/api/.env.vps -p elev-d-e-7-dev -f apps/api/docker-compose.vps.yml config --quiet

docker compose --env-file apps/api/.env.vps -p elev-d-e-7-dev -f apps/api/docker-compose.vps.yml --profile tools build api migrate

docker compose --env-file apps/api/.env.vps -p elev-d-e-7-dev -f apps/api/docker-compose.vps.yml --profile tools run --rm migrate

docker compose --env-file apps/api/.env.vps -p elev-d-e-7-dev -f apps/api/docker-compose.vps.yml up -d --no-build --wait --wait-timeout 240 api
```

Las migraciones modifican la base de datos configurada. Usamos las migraciones versionadas y el proyecto de prueba elegido; si fallan, revisamos el error antes de continuar. No usamos `migrate reset` ni `db push` en este procedimiento.

Verificamos:

```bash
docker ps --filter name=elev-d-e-7-api
curl --fail --show-error http://127.0.0.1:8084/api/v1/health
```

Esperamos un contenedor `healthy` y la respuesta:

```json
{ "status": "ok", "database": "connected" }
```

El healthcheck consulta HTTP y PostgreSQL. El script termina con error si el servicio no queda sano en cuatro minutos. No imprimimos `docker compose config` completo porque incluye variables privadas; usamos `config --quiet`.

## 6. Conectar nuestro dominio

El sitio ya tiene certificado SSL. Primero hacemos una copia de su configuracion y despues editamos solo el proxy de nuestro equipo:

```bash
cp -n /etc/nginx/sites-available/apolobyte-e-7 /etc/nginx/sites-available/apolobyte-e-7.antes-restaurante
nano /etc/nginx/sites-available/apolobyte-e-7
```

Cambiamos:

```nginx
proxy_pass http://127.0.0.1:8083;
```

por:

```nginx
proxy_pass http://127.0.0.1:8084;
```

Conservamos `server_name`, las directivas SSL y el enlace ya existente en `sites-enabled`. El profesor indica comprobar la configuracion antes de recargar:

```bash
nginx -t
```

Solo si termina correctamente ejecutamos:

```bash
systemctl reload nginx
curl --fail --show-error https://equipo-7-elev-d-dev.apolobyte.online/api/v1/health
```

No necesitamos solicitar de nuevo el certificado que ya esta configurado. Si se cambia a un dominio nuevo, seguimos la seccion del docente: creamos el sitio, su enlace, comprobamos `nginx -t`, recargamos y ejecutamos `certbot --nginx -d DOMINIO`.

La API escucha en loopback, accesible para Nginx. No hace falta abrir 8084 al exterior.

## 7. Crear la llave SSH como en Notion

Usamos el usuario `root` con el que ya trabajamos en esta VPS de clase. Creamos una llave exclusiva para este workflow; si ese nombre ya existe, conservamos la llave y revisamos antes de ejecutar `ssh-keygen`:

```bash
mkdir -p /root/.ssh
chmod 700 /root/.ssh
ssh-keygen -f /root/.ssh/id_restaurante_dev -t rsa -b 4096
```

Guardamos la passphrase en KeePass si elegimos una. Registramos la llave publica, tal como indica el docente:

```bash
cat /root/.ssh/id_restaurante_dev.pub >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys /root/.ssh/id_restaurante_dev
```

Para copiar la llave privada al secreto de GitHub podemos verla en nuestra terminal, siguiendo el ejemplo:

```bash
cat /root/.ssh/id_restaurante_dev
```

La copiamos directamente a GitHub, incluyendo las lineas de inicio y fin. No pegamos esa salida en el chat, capturas, archivos versionados ni logs compartidos.

### 7.1 Deploy key para que la VPS descargue este repositorio

El 15 de octubre registramos en **Settings → Deploy keys** la clave «VPS dev equipo 7 - lectura del repositorio», sin habilitar escritura. Su huella es `SHA256:mP1ieomUCNZfJmmp2MQg24ODjWdl/mevJlNagDNgUNQ`; la privada permanece en `/root/.ssh/id_restaurante_repo` y la pública en el archivo terminado en `.pub`. Esta llave es distinta de `id_restaurante_dev`, que ya se usa para que Actions entre a la VPS mediante `authorized_keys` y `SSH_PRIVATE_KEY`.

En `/root/.ssh/config` añadimos un alias exclusivo, conservando los de los otros proyectos:

```sshconfig
Host github-restaurante-dev
  HostName github.com
  User git
  IdentityFile /root/.ssh/id_restaurante_repo
  IdentitiesOnly yes
  BatchMode yes
  StrictHostKeyChecking yes
  HostKeyAlias github.com
```

Probamos la lectura y después cambiamos únicamente el remoto `origin` del clon de este equipo. No cambiamos identidad Git ni archivos de otros equipos:

```bash
cd /root/projects/equipo-7
git ls-remote ssh://git@github-restaurante-dev/YeisonMunoz69/Restaurante-Native.git refs/heads/dev
git remote set-url origin ssh://git@github-restaurante-dev/YeisonMunoz69/Restaurante-Native.git
git fetch origin dev
git remote get-url origin
git status --short --branch
```

La salida recibida devolvió `0e27cb445581f2ac1536c352d4a674c5a90246f3 refs/heads/dev`, completó el fetch por el alias y mostró `dev...origin/dev` sin cambios locales. El workflow existente usa ese remoto al hacer fetch/pull; no necesita recibir la llave privada del repositorio como otro secreto de Actions. La confianza del host GitHub ya estaba configurada y se mantuvo la comprobación estricta. En una VPS nueva verificamos primero su huella oficial, sin desactivar esa comprobación.

Después repetimos el workflow completo: el intento 2 de [la ejecución 37848652598](https://github.com/YeisonMunoz69/Restaurante-Native/actions/runs/37848652598/attempts/2) terminó el 15 de octubre con `Build and test` y `Deploy dev to VPS` en success, sobre `0e27cb4`. La consulta HTTPS posterior devolvió API y base conectadas. Registramos esa evidencia en Jira EC-72; no hicimos un push de código para provocar la prueba.

## 8. Configurar los secretos de GitHub

Abrimos **Settings → Secrets and variables → Actions → New repository secret** en `YeisonMunoz69/Restaurante-Native`. Usamos los mismos nombres del ejemplo:

| Secreto         | Valor que colocamos                                                        |
| --------------- | -------------------------------------------------------------------------- |
| SSH_HOST        | Host de esta VPS de desarrollo, consultado en KeePass                      |
| SSH_USER        | root                                                                       |
| SSH_PRIVATE_KEY | Contenido completo de id_restaurante_dev                                   |
| SSH_PORT        | 22                                                                         |
| SSH_PASSPHRASE  | Passphrase elegida; si la llave no tiene, dejamos este secreto sin definir |
| MAIN_BRANCH     | dev                                                                        |

Conservamos el nombre `MAIN_BRANCH` del ejemplo por correspondencia con la guia; su valor debe ser exactamente `dev`. El workflow comprueba ese valor antes de actualizar el repositorio.

Las cadenas de Supabase y secretos JWT permanecen en `apps/api/.env.vps` dentro de la VPS. GitHub Actions necesita los datos SSH para ejecutar el despliegue, no una copia de ese archivo.

## 9. Validar el primer despliegue automatico

Abrimos **Actions → CI/CD dev** y la ejecucion creada por el push de `dev`. Si fallo durante la preparacion inicial, elegimos **Re-run all jobs** una vez completado el clon, las variables y los secretos.

Los filtros de `verify` son:

1. Instalacion con `npm ci`.
2. Compilacion de shared y generacion del cliente Prisma.
3. Lint de API, pruebas de API y compilacion de API.
4. Pruebas de la app movil.
5. Comprobacion de sintaxis del script de despliegue.
6. Construccion de la imagen Docker de VPS.

Solo si esos pasos pasan se ejecuta `deploy`. El job usa `appleboy/ssh-action@v1.0.0`, hace `git fetch`, `git checkout dev`, `git pull --ff-only origin dev` y llama al script del servidor.

El script verifica que el hash sea el mismo que paso CI, aplica las migraciones y espera el healthcheck. Si otro push adelanto `dev` mientras esta ejecucion verificaba el codigo, esta ejecucion no despliega un commit diferente; revisamos la ejecucion del push mas reciente. Los despliegues tienen concurrencia de uno para evitar migraciones simultaneas.

Al finalizar comprobamos desde la terminal SSH:

```bash
cd /root/projects/equipo-7
git log -1 --oneline
docker ps --filter name=elev-d-e-7-api
curl --fail --show-error https://equipo-7-elev-d-dev.apolobyte.online/api/v1/health
```

No marcamos el despliegue como validado solo porque el workflow exista: esperamos el job completo y la respuesta de API/base de datos.

## 10. Trabajo diario y diagnostico

Cada compañero trabaja en su rama. Al integrar o hacer push a `dev`, GitHub ejecuta los filtros y despliega automaticamente si pasan. Los Pull Requests dirigidos a `dev` ejecutan las verificaciones y no despliegan. `main` no activa este despliegue.

Recomendamos exigir la comprobacion `Build and test` en la proteccion de `dev` si queremos impedir la integracion de un Pull Request con filtros fallidos. El job `needs: verify` ya impide desplegar cuando CI falla, incluso para un push directo.

Si falla:

- **Instalacion o Vitest:** revisamos el lockfile y el paso rojo. En octubre detectamos dependencias nativas de Linux omitidas en el lockfile generado desde Windows.
- **SSH:** revisamos los nombres de secretos, usuario, puerto, passphrase y que la llave publica este en `authorized_keys`.
- **Git:** comprobamos que existe `dev` y que la VPS tiene el arbol limpio. El workflow no fuerza cambios ni borra modificaciones locales.
- **Prisma P1001:** revisamos DNS, conectividad a Supabase y las URLs del archivo privado.
- **Contenedor unhealthy:** revisamos los logs de nuestro servicio en la VPS y ocultamos credenciales antes de compartirlos.
- **HTTPS devuelve 502:** primero probamos `http://127.0.0.1:8084/api/v1/health`; luego revisamos `proxy_pass` y `nginx -t`.

Para revisar nuestros logs:

```bash
docker compose --env-file apps/api/.env.vps -p elev-d-e-7-dev -f apps/api/docker-compose.vps.yml logs --tail=80 api
```

Si debemos volver al codigo anterior, lo hacemos con un revert revisado que entre a `dev`. Las migraciones de base de datos no se revierten automaticamente con el codigo.

## 11. Resultado comprobado y página temporal

El 8 de octubre recibimos las salidas de la VPS: `migrate deploy` encontró dos migraciones sin pendientes, `elev-d-e-7-api` quedó saludable en `127.0.0.1:8084` y `/api/v1/health` respondió con PostgreSQL conectado tanto por loopback como por HTTPS. El intento 3 de [CI/CD dev, ejecución 37829822767](https://github.com/YeisonMunoz69/Restaurante-Native/actions/runs/37829822767) también terminó correctamente sobre `db937f1`. Conservamos las instrucciones anteriores para nuevas máquinas; ya no describen tareas sin hacer en esta VPS.

La landing ya quedó integrada en `dev` mediante PR #1, commit `0e27cb4`. Pasó [CI/CD, ejecución 37848652598](https://github.com/YeisonMunoz69/Restaurante-Native/actions/runs/37848652598), incluyendo despliegue. Comprobamos raíz, CSS e icono con HTTP 200, salud HTTPS con PostgreSQL conectado, redirección HTTP a HTTPS y respuesta 401 de `/api/v1/auth/me` sin sesión. No usamos esos resultados como prueba de funcionalidades de carta/reservas todavía pendientes.

## 12. Mantener la landing sin otra guía duplicada

Servimos «En construcción…» desde la misma API, sin otro contenedor, migraciones, secretos ni cambio de Nginx. El muro de doce ladrillos usa SVG/CSS, sin JavaScript ni recursos externos, y respeta movimiento reducido.

- Textos y dibujo: `apps/api/public/index.html`.
- Colores y animación: `apps/api/public/landing.css`.
- Icono: `apps/api/public/favicon.svg`.
- Registro de estáticos: `apps/api/src/landing/landing.assets.ts`, con rutas válidas desde `src` y `dist`.
- Empaquetado: `apps/api/Dockerfile.vps` copia únicamente `public` a la imagen de ejecución. Nunca publicamos la raíz del repositorio ni archivos de entorno.

`landing.assets.spec.ts` comprueba HTML/CSS/icono, API existente, errores de ruta y rechazo de archivos privados con Prisma simulado. Una prueba de salud simulada no demuestra conexión a Supabase. En la aceptación previa pasaron 21 pruebas API y 9 móviles, build de imagen y revisión visual a 1280, 390 y 320 píxeles; no repetimos esas comprobaciones en esta limpieza documental.

Para modificarla usamos los filtros de CI de la sección 9 y el mismo PR a `dev`. Con nuestra API local ya configurada abrimos `http://localhost:3000/`. Después del despliegue comprobamos:

```powershell
Invoke-WebRequest https://equipo-7-elev-d-dev.apolobyte.online/ | Select-Object StatusCode
Invoke-RestMethod https://equipo-7-elev-d-dev.apolobyte.online/api/v1/health
```

Conservamos `/api/v1` y `/api/v1/health`; las rutas desconocidas no devuelven la portada. Esta landing no cierra historias de carta, reservas ni web/SSR.
