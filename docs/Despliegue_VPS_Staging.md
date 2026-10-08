# Despliegue del equipo 7 y CI/CD de dev

## 1. Donde quedamos y que seguimos del docente

El 8 de octubre de 2026 comprobamos, con la salida de la terminal SSH, que la VPS tiene Ubuntu 24.04, Docker, Docker Compose, Nginx y Certbot. La carpeta `/root/projects/equipo-7` estaba vacia. El sitio habilitado `apolobyte-e-7` ya tiene configuracion SSL para `equipo-7-elev-d-dev.apolobyte.online` y apunta al puerto 8083, ocupado por el ejemplo `ci-frontend`. Esa configuracion no demuestra todavia que nuestra API responda por HTTPS.

Seguimos estas guias:

- [Despliegue ApoloByteExample](https://app.notion.com/p/Despliegue-ApoloByteExample-3eb04bbd869d8065ab85c001d85696b7).
- [Tabla de puertos](https://app.notion.com/p/Tabla-de-puertos-8cf04bbd869d83d8af8b019fe1998145).
- [Prerequisitos](https://app.notion.com/p/Prerequisitos-para-desplegar-d7904bbd869d82cc82000109724969f1).
- [Configuracion del contenedor](https://app.notion.com/p/Configurando-el-contenedor-89104bbd869d828dac5d81f3e1284763).
- [Configuracion del dominio](https://app.notion.com/p/Configurando-el-dominio-f5204bbd869d8333b40a81645ce1bc63).
- [CI/CD por SSH](https://app.notion.com/p/Ci-Cd-3ed04bbd869d80d796f0f985111517e4).

Mantuvimos Docker Compose con `--env-file`, nombres propios del equipo, Nginx como proxy, Certbot para HTTPS y `appleboy/ssh-action@v1.0.0` con los secretos `SSH_*` del ejemplo. Adaptamos lo necesario a nuestro proyecto:

| Ejemplo del docente | Nuestro repositorio |
| --- | --- |
| Rama de ejemplo main | dev; main corresponde a otra VPS |
| Carpeta de ejemplo | /root/projects/equipo-7 |
| Frontend web y backend de ejemplo | API NestJS; la app React Native se ejecuta en el dispositivo |
| docker-compose.yml junto al ejemplo | apps/api/docker-compose.vps.yml dentro del monorepo |
| Variables en .env | apps/api/.env.vps, ignorado por Git |
| Compilacion remota con npm | Compilacion dentro de Docker, migraciones y arranque con Compose |
| Puerto asignado ocupado | 8084 como siguiente libre, segun la indicacion de la tabla |
| Nuevo sitio Nginx | Reutilizamos el sitio y certificado existentes del equipo |

La asignacion de Classroom tiene prioridad sobre la tabla de Notion. Si nos dieron otro puerto, cambiamos `API_HOST_PORT` y `proxy_pass` al mismo numero antes de arrancar. No detenemos los contenedores de otros equipos.

En la comprobacion local del 8 de octubre pasaron la instalacion limpia en Linux, el lint de API sin advertencias ni errores, 14 pruebas de API, 9 pruebas moviles y las compilaciones de shared/API. Construimos las imagenes de API y migraciones; Prisma y Argon2 cargaron correctamente, la imagen de API corrio como usuario no root y no incluyo los archivos privados de entorno. Tambien validamos Compose con la plantilla, la sintaxis del workflow/script y los rechazos del script cuando falta el archivo privado o cambia el commit. Estas pruebas no conectaron a Supabase ni ejecutaron migraciones reales; la aceptacion remota sigue pendiente.

## 2. Publicar el codigo y crear dev

Ejecutamos este bloque en PowerShell del computador, desde la raiz del repositorio:

```powershell
cd C:\Users\yjmg1\Desktop\Restaurante-Native
git switch yeison/vps-staging-deploy
git status --short --branch
git push -u origin yeison/vps-staging-deploy
git ls-remote --heads origin dev
```

Si el ultimo comando no devuelve ninguna rama, creamos la base de dev desde la funcionalidad de despliegue ya preparada:

```powershell
git branch dev yeison/vps-staging-deploy
git push -u origin dev
```

Estos comandos dejan nuestra rama de trabajo actual en `yeison/vps-staging-deploy`. Si `dev` ya existe en GitHub, no la recreamos ni forzamos el push: abrimos un Pull Request desde nuestra rama hacia `dev`.

El primer push de `dev` inicia el workflow. Si la VPS todavia no tiene el clon, variables o secretos SSH, el job de despliegue fallara por esa preparacion pendiente. Terminamos las secciones siguientes y despues usamos **Re-run all jobs** en esa ejecucion. No necesitamos agregar el workflow a `main` para repetir una ejecucion ya creada.

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

Antes de publicar la API revisamos tambien las [alertas de dependencias pendientes](Flujo_Equipo_Dev.md#6-pendientes-de-seguridad-antes-de-dar-el-despliegue-por-listo). La imagen compilo, pero npm reporto una alerta critica de `proxy-addr`; no damos por resuelta esa alerta con el arreglo de CI.

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
{"status":"ok","database":"connected"}
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

## 8. Configurar los secretos de GitHub

Abrimos **Settings → Secrets and variables → Actions → New repository secret** en `YeisonMunoz69/Restaurante-Native`. Usamos los mismos nombres del ejemplo:

| Secreto | Valor que colocamos |
| --- | --- |
| SSH_HOST | Host de esta VPS de desarrollo, consultado en KeePass |
| SSH_USER | root |
| SSH_PRIVATE_KEY | Contenido completo de id_restaurante_dev |
| SSH_PORT | 22 |
| SSH_PASSPHRASE | Passphrase elegida; si la llave no tiene, dejamos este secreto sin definir |
| MAIN_BRANCH | dev |

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
