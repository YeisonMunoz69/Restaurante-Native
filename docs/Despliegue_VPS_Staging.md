# Despliegue manual de la API en VPS (staging)

## Alcance y límites

Con este procedimiento preparo un entorno temporal de staging, no de producción. La guía del equipo contempla Docker, Nginx y Certbot en una VPS compartida; verifico qué está instalado y no reemplazo ni altero el proxy de otro equipo. La API corre en Docker y queda ligada a `127.0.0.1` en el puerto asignado a nuestro equipo. Cuando se publique el dominio, Nginx recibe HTTPS y reenvía las solicitudes a ese puerto local. No abro el puerto asignado ni el 3000 en el firewall. Antes de desplegar asigno nombres únicos al proyecto Compose, al contenedor y a las imágenes para no interferir con otros equipos. Para pruebas privadas también puedo usar un túnel SSH.

No guardo credenciales en Git, en este documento, en comandos ni en el chat: recupero cada valor desde KeePass y lo escribo únicamente en `apps/api/.env.vps` en el servidor. La configuración de red del VPS y los puertos asignados siguen la [guía de despliegue del equipo en Notion](https://app.notion.com/p/Despliegue-ApoloByteExample-3eb04bbd869d8065ab85c001d85696b7).

El despliegue real queda pendiente hasta que el equipo tenga el VPS, el usuario, el sistema operativo, el dominio (si se necesita acceso público) y el acceso de KeePass disponibles. Este documento prepara los archivos y deja el procedimiento repetible, pero no afirma que un servidor externo ya haya sido probado.

## 1. Qué necesito antes de empezar

- Un VPS Ubuntu LTS o Debian estable, con arquitectura compatible con Docker Engine, acceso SSH y permisos `sudo`.
- Espacio y puerto asignados a nuestro equipo en la VPS compartida; no reutilizo el puerto, el nombre de contenedor ni el dominio de otro equipo.
- Docker Compose, Nginx y Certbot disponibles o autorizados por el responsable del VPS. Primero verifico lo instalado; no instalo otro proxy ni cambio configuraciones compartidas sin coordinarlo.
- Un proyecto de Supabase de prueba o staging, sin datos reales ni credenciales de producción. Verifico en el panel de Supabase que la cadena elegida permite conexiones desde la IP de salida del VPS.
- En KeePass: IP/nombre del VPS, usuario SSH, referencia al archivo de llave privada (no la pego en comandos), acceso al proveedor, URLs de conexión Supabase y dos secretos JWT independientes.
- Para publicar por HTTPS: el dominio o subdominio asignado apuntando a la IP pública del VPS. Si aún no está asignado, dejo pendiente Nginx/Certbot y uso únicamente acceso privado.
- El commit que voy a probar en staging. Puedo desplegar la rama de staging sin integrarla a `main`; no integro nada a `main` hasta verificar API, móvil y conexión a la base de datos.

Mantengo el acceso SSH abierto durante cualquier ajuste del firewall y compruebo primero las reglas existentes para no bloquearme fuera del servidor.

## 2. Preparar el VPS

1. Inicio sesión desde PowerShell usando la configuración SSH guardada localmente; no escribo la llave privada en el comando ni la copio al repositorio:

   ```powershell
   ssh usuario@IP_DEL_VPS
   ```

2. Compruebo sistema, arquitectura, disco y conectividad. Si el VPS tiene datos o contenedores de otros servicios, paro y coordino antes de cambiar firewall o instalar paquetes.

   ```bash
   cat /etc/os-release
   uname -m
   df -h /
   sudo systemctl status ssh --no-pager
   ```

3. Instalo Docker Engine y el complemento Compose siguiendo la guía oficial para la distribución concreta: [Docker Engine: instalación](https://docs.docker.com/engine/install/). Uso el repositorio oficial de paquetes de la distribución; no ejecuto el script de conveniencia en un servidor persistente. No desinstalo paquetes ni limpio `/var/lib/docker` si no he comprobado antes que el VPS es nuevo y que no hay datos que conservar.

4. Verifico el servicio y Compose:

   ```bash
   sudo systemctl status docker --no-pager
   sudo docker version
   sudo docker compose version
   sudo docker run --rm hello-world
   nginx -v
   certbot --version
   ```

   Uso `sudo docker` para el despliegue. No agrego usuarios al grupo `docker` por comodidad: ese grupo equivale a privilegios de administrador.

   Si Nginx o Certbot ya están instalados, no los reinstalo. No sigo instrucciones de Caddy en esta VPS: la guía compartida establece Nginx como proxy.

5. Reviso el firewall del proveedor y el del sistema. Mantengo SSH (22/tcp) permitido desde las IP del equipo cuando sea posible. Solo si usaré HTTPS público permito 80/tcp y 443/tcp. No abro 3000/tcp ni el puerto asignado a la API: Nginx llega a este servicio por loopback. Si UFW está activo, conservo sus reglas y añado únicamente las que hagan falta; antes de habilitarlo confirmo desde una segunda sesión que SSH seguirá permitido.

   ```bash
   sudo ufw status verbose
   ```

   Si el VPS es nuevo y UFW no tiene reglas, puedo configurar SSH y, para el modo público, HTTP/HTTPS:

   ```bash
   sudo ufw allow OpenSSH
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   sudo ufw status verbose
   ```

   En modo privado no necesito permitir 80/443. La consola del proveedor debe reflejar la misma política de red.

## 3. Obtener el código sin filtrar secretos

1. Desde PowerShell, publico la rama de trabajo. Este push publica únicamente el código versionado; no incluye `apps/api/.env` ni `apps/api/.env.vps`:

   ```powershell
   git status --short --branch
   git push -u origin yeison/vps-staging-deploy
   ```

2. Compruebo en PowerShell si el remoto ya tiene `dev`:

   ```powershell
   git fetch origin
   git branch -r --list origin/dev
   ```

   Si `origin/dev` no aparece, el equipo debe decidir qué versión inicial integrar allí. Solo si aprueba el contenido actual de `yeison/vps-staging-deploy`, puedo crear la rama inicial desde ella; no la creo desde un `main` local desactualizado:

   ```powershell
   git switch yeison/vps-staging-deploy
   git pull --ff-only origin yeison/vps-staging-deploy
   git switch -c dev
   git push -u origin dev
   ```

   Si GitHub impide ese push, creo `dev` desde GitHub a partir de la rama aprobada o pido al responsable que lo haga. Si `dev` ya existía o fue creada desde otra base, abro el Pull Request `yeison/vps-staging-deploy` → `dev` y espero los checks. Después, las nuevas funcionalidades entran mediante Pull Request desde `yeison/<funcionalidad>` hacia `dev`; `main` queda reservado para promover versiones ya validadas. Esta VPS nunca se despliega desde `main`.

3. En la terminal SSH, el destino de este equipo ya es `~/projects/equipo-7`. Verifico que siga vacío:

   ```bash
   cd ~/projects/equipo-7
   pwd
   find . -mindepth 1 -maxdepth 1 -print -quit
   ```

   Si el último comando no imprime nada, clono la rama `dev`. Reemplazo `ORGANIZACION/REPOSITORIO` con los datos de GitHub → **Code → SSH**. Si el repositorio es privado, la VPS necesita antes una llave SSH de solo lectura autorizada en GitHub; nunca comparto la llave privada:

   ```bash
   git clone --single-branch --branch dev git@github.com:ORGANIZACION/REPOSITORIO.git .
   git status --short --branch
   git log -1 --oneline
   ```

   Si `find` muestra contenido, no clono encima: identifico primero su procedencia y coordino qué hacer.

4. Si ya tengo el clon en la VPS, actualizo únicamente `dev` y con un árbol limpio:

   ```bash
   git status --short --branch
   git fetch origin
   git switch dev
   git pull --ff-only origin dev
   git rev-parse --short HEAD
   ```

   No hago commits desde la VPS. Anoto el hash que desplegué en el registro del equipo. `main` se promueve con aprobación y no se despliega en esta primera VPS.

## 4. Crear el archivo de variables en el servidor

1. Copio la plantilla y restrinjo sus permisos inmediatamente:

   ```bash
   cp apps/api/.env.vps.example apps/api/.env.vps
   chmod 600 apps/api/.env.vps
   ```

2. Abro el archivo en el servidor con un editor seguro:

   ```bash
   nano apps/api/.env.vps
   ```

3. Antes de probar Supabase, roto la contraseña de base de datos que se expuso durante un diagnóstico anterior; actualizo KeePass y uso solo el valor nuevo. Luego sustituyo los marcadores consultando KeePass, sin pegar el archivo en mensajes, tickets, capturas o logs. Completo:

   - `DATABASE_URL`: cadena de Supabase que ya verificamos desde Docker. Para Prisma en runtime utilizo el pooler de sesión probado, con TLS requerido. No reconstruyo la URL a mano; copio la cadena del registro seguro y verifico que los caracteres especiales de la contraseña estén codificados para URL.
   - `DIRECT_URL`: conexión directa para migraciones si el VPS alcanza el host directo. Si la red del VPS no soporta esa ruta (por ejemplo, restricciones IPv4/IPv6), uso el pooler de sesión admitido por Supabase y Prisma. Nunca uso el pooler transaccional (puerto 6543) para migraciones.
   - `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET`: dos valores distintos, aleatorios y de al menos 32 bytes. Si debo generarlos en el VPS, uso `openssl rand -hex 32` dos veces y guardo cada valor en KeePass antes de continuar. No reutilizo secretos de desarrollo.
   - `CORS_ORIGIN`: vacío si solo uso el túnel SSH. Para una web pública, escribo únicamente el origen exacto de la web, por ejemplo `https://app.ejemplo.com`; no pongo `*` ni la URL de la API salvo que sean el mismo origen.
   - `API_URL`: URL HTTPS pública cuando el dominio ya esté definido. En modo privado queda como referencia no utilizada por la API.
   - Mantengo `NODE_ENV=production`, `APP_ENV=staging` y `SWAGGER_ENABLED=false`: “production” aquí activa el modo de ejecución de Node; el entorno y sus datos siguen siendo staging.

4. Compruebo permisos sin mostrar contenido:

   ```bash
   stat -c '%a %U:%G %n' apps/api/.env.vps
   git check-ignore -v apps/api/.env.vps
   ```

   Debo ver permisos `600` y que Git ignora el archivo. No ejecuto ni comparto `docker compose config` sin una revisión segura: su salida puede contener valores de entorno.

5. Defino el puerto asignado en Notion y nombres exclusivos para que Compose no choque con los demás equipos. Reemplazo `equipo-XX` y `PUERTO_ASIGNADO` por los datos que nos dieron:

   ```bash
   export COMPOSE_PROJECT_NAME='encanto-equipo-XX-staging'
   export API_HOST_PORT='PUERTO_ASIGNADO'
   export API_CONTAINER_NAME='encanto-equipo-XX-api'
   export API_IMAGE_NAME='encanto-equipo-XX-api:staging'
   export API_MIGRATION_IMAGE_NAME='encanto-equipo-XX-migrations:staging'
   export API_RUNTIME_ENV_FILE='.env.vps'

   dc() {
     sudo env \
       API_RUNTIME_ENV_FILE="$API_RUNTIME_ENV_FILE" \
       API_HOST_PORT="$API_HOST_PORT" \
       API_CONTAINER_NAME="$API_CONTAINER_NAME" \
       API_IMAGE_NAME="$API_IMAGE_NAME" \
       API_MIGRATION_IMAGE_NAME="$API_MIGRATION_IMAGE_NAME" \
       docker compose -p "$COMPOSE_PROJECT_NAME" \
       -f apps/api/docker-compose.vps.yml "$@"
   }
   ```

   La función `dc` solo pasa nombres y el puerto a Compose; las variables de Supabase siguen en el archivo privado del servidor. Vuelvo a definir estas variables al abrir una nueva sesión SSH. Antes de iniciar, compruebo que el puerto está libre y que el nombre no existe:

   ```bash
   sudo ss -lntp | grep -E ":${API_HOST_PORT}\\b" || true
   sudo docker ps -a --filter "name=${API_CONTAINER_NAME}" --format '{{.Names}} {{.Status}}'
   ```

## 5. Construir y aplicar migraciones

1. Construyo la imagen de staging desde la raíz del repositorio:

   ```bash
   dc config --quiet
   dc build api
   ```

2. Antes de tocar el esquema, confirmo que `DATABASE_URL` y `DIRECT_URL` apuntan al proyecto Supabase de staging y que existe el respaldo/punto de recuperación previsto por el equipo. No aplico migraciones contra producción desde esta guía.

3. Aplico exclusivamente las migraciones versionadas:

   ```bash
   dc --profile tools run --rm --build migrate
   ```

   No uso `prisma db push`, `migrate reset` ni comandos de borrado para “arreglar” un error. Si una migración falla, guardo el nombre de la migración y el código de error, oculto hosts/usuarios/cadenas en cualquier reporte y paro para diagnosticar.

## 6. Arrancar y verificar en modo privado

1. Levanto el servicio:

   ```bash
   dc up -d --build api
   ```

2. Reviso estado, healthcheck y logs localmente en el VPS:

   ```bash
   dc ps
   sudo docker inspect --format '{{.State.Health.Status}}' "$API_CONTAINER_NAME"
   dc logs --tail=100 api
   ```

   Espero `healthy`. En logs confirmo que Nest inició y Prisma conectó; antes de compartir cualquier fragmento lo reviso para quitar secretos, direcciones sensibles y datos personales.

3. Verifico que el endpoint de salud consulta también la base de datos y no publica el puerto en interfaces externas:

   ```bash
   curl --fail --show-error "http://127.0.0.1:${API_HOST_PORT}/api/v1/health"
   sudo ss -lntp | grep -E ":${API_HOST_PORT}\\b"
   ```

   La respuesta de salud debe indicar `status: ok` y `database: connected`. El socket debe estar ligado a `127.0.0.1`, no a `0.0.0.0` ni a la IP pública. Ese puerto es el asignado al equipo en la tabla de Notion, no necesariamente 3000.

4. Desde PowerShell en mi computador, creo un túnel temporal:

   ```powershell
   ssh -N -L 3000:127.0.0.1:PUERTO_ASIGNADO usuario@IP_DEL_VPS
   ```

   Mantengo esa ventana abierta y en otra consulto `http://localhost:3000/api/v1/health`. Para cerrar el túnel uso `Ctrl+C`. Reemplazo `PUERTO_ASIGNADO` por el puerto que publiqué en loopback; no necesito abrirlo en el firewall.

## 7. Publicar con Nginx y Certbot (opcional)

Sigo el proxy que ya usa la VPS compartida. No instalo Caddy ni sobrescribo un sitio Nginx ajeno.

1. Confirmo que el dominio asignado resuelve a la IP del servidor y que el puerto del equipo está configurado en Nginx como proxy hacia `127.0.0.1:PUERTO_ASIGNADO`. El puerto de la API sigue cerrado al exterior; solo Nginx recibe tráfico público.

2. Creo un archivo único para nuestro proyecto, sin tocar `default` ni otros sitios:

   ```bash
   sudo nano /etc/nginx/sites-available/encanto-equipo-XX
   ```

   Contenido, sustituyendo dominio, puerto y nombre de logs por los asignados:

   ```nginx
   server {
       listen 80;
       server_name api.equipo.ejemplo.com;

       location / {
           proxy_pass http://127.0.0.1:PUERTO_ASIGNADO;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       access_log /var/log/nginx/encanto-equipo-XX.access.log;
       error_log /var/log/nginx/encanto-equipo-XX.error.log;
   }
   ```

3. Habilito únicamente ese archivo y reviso la configuración antes de recargar Nginx:

   ```bash
   sudo ln -s /etc/nginx/sites-available/encanto-equipo-XX /etc/nginx/sites-enabled/encanto-equipo-XX
   sudo nginx -t
   sudo systemctl reload nginx
   ```

   Si el enlace ya existe o `nginx -t` no termina con `success`, paro y reviso; no fuerzo el enlace ni recargo una configuración inválida.

4. Cuando DNS ya resuelva correctamente y el sitio HTTP responda, solicito el certificado con el dominio exacto:

   ```bash
   sudo certbot --nginx -d api.equipo.ejemplo.com
   ```

   Verifico `https://api.equipo.ejemplo.com/api/v1/health`. Mantengo 80/443 accesibles según la política del equipo; no abro `PUERTO_ASIGNADO` ni 3000 en el firewall.

5. Si una web va a llamar la API, configuro `CORS_ORIGIN` con el origen HTTPS exacto de esa web y recreo el contenedor. CORS no sustituye autenticación. Swagger sigue desactivado en staging.

## 8. Actualizar una versión

1. Registro el commit actual y compruebo el estado del repo.
2. Traigo fast-forward la rama que ya desplegué y reviso qué migraciones entraron:

   ```bash
   git fetch origin
   git switch dev
   git pull --ff-only origin dev
   git log -5 --oneline
   ```

3. Repito construcción, revisión de respaldo y `prisma migrate deploy` de las secciones anteriores.
4. Recreo el servicio y espero el healthcheck:

   ```bash
   dc up -d --build api
   dc ps
   ```

5. Si el código nuevo falla, vuelvo a desplegar el commit anterior y reconstruyo la imagen. No intento revertir automáticamente una migración de base de datos: primero verifico si es compatible hacia atrás y restauro solo desde el mecanismo de backup acordado.

## 9. Diagnóstico seguro

- **El servicio reinicia o no queda healthy:** reviso `dc ps` y `dc logs --tail=100 api`; compruebo que las dos URLs estén presentes en KeePass y que el archivo local del VPS tenga permisos `600`. Nunca pego aquí el `.env.vps` ni la salida completa de `docker inspect`.
- **Prisma reporta P1001:** compruebo DNS y salida TCP sin imprimir usuario ni contraseña. Para resolver solo el host:

  ```bash
  dc run --rm --no-deps api node -e 'const u=new URL(process.env.DATABASE_URL); require("dns").lookup(u.hostname,(e,a)=>{console.log(e?.code || a); process.exit(e?1:0)})'
  ```

  Si DNS no resuelve, reviso DNS del VPS/proveedor. Si resuelve pero el puerto no conecta, reviso firewall de salida, allowlist de Supabase y VPN/ruta de red. Si llega al servidor pero Prisma falla, verifico SSL, usuario/contraseña en KeePass, URL-encoding y que runtime use la cadena de sesión adecuada y la migración una cadena compatible con Prisma. No cambio a puerto 6543 para “probar” migraciones.

- **El healthcheck falla pero Nest aparece iniciado:** `/api/v1/health` también consulta PostgreSQL. Distingo una caída HTTP de una desconexión DB; reviso Supabase y el pooler, sin reiniciar en bucle ni editar la conexión compartida a ciegas.
- **HTTPS no emite certificado:** verifico DNS público, puertos 80/443 en los dos firewalls, `sudo nginx -t` y `sudo journalctl -u nginx --since '15 minutes ago'`. No abro el puerto asignado como alternativa.
- **La app móvil no conecta al VPS:** el build móvil actualmente está configurado para desarrollo local/emulador. Antes de distribuir una app conectada a la nube, se debe integrar en una tarea separada la URL HTTPS del API en la configuración de build móvil; no se debe incrustar una URL HTTP ni editar secretos dentro del código.

## 10. CI/CD desde GitHub

El flujo acordado para esta primera VPS es:

```text
yeison/<funcionalidad> → Pull Request a dev → CI (pruebas y builds)
                                      ↓ merge aprobado
                              push a dev → CD a VPS de desarrollo (pendiente)
dev validada → Pull Request a main → promoción estable; no despliega a esta VPS
```

`.github/workflows/ci.yml` limita las ejecuciones automáticas: en `push` solo corre para `dev`; en `pull_request` solo para Pull Requests cuyo destino sea `dev`; `workflow_dispatch` permite ejecutar la verificación manualmente. El workflow ejecuta pruebas y builds, pero **todavía no despliega**. Hasta probar el procedimiento manual completo contra la base de datos de staging, el despliegue sigue siendo manual.

Cuando el despliegue manual esté validado, añado un job `deploy` que dependa de `verify` y se ejecute únicamente para un `push` a `dev`. Lo protejo con un GitHub Environment llamado `vps-dev`, una regla de rama que permita solo `dev` y concurrencia de un solo despliegue para que dos procesos no apliquen migraciones simultáneamente. `main` no debe ser disparador del despliegue de esta VPS.

Guardo el acceso SSH como secretos del Environment (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`) y verifico por un canal confiable la huella SSH de la VPS antes de confiar en ella. La ruta del checkout, el nombre Compose y el puerto asignado pueden ser variables no secretas. Uso una cuenta de despliegue dedicada, no `root`; si requiere Docker, permito mediante `sudoers` ejecutar únicamente un script fijo, revisado y propiedad de root, no comandos arbitrarios enviados por el workflow. Fijo cada acción externa a una versión revisada y, cuando sea posible, a su SHA completo.

El clon privado de GitHub en la VPS también necesita acceso de solo lectura al repositorio (por ejemplo, una deploy key separada). Esta credencial no es la misma que la llave con la que GitHub Actions entra a la VPS. El archivo `apps/api/.env.vps` y las credenciales de Supabase permanecen en la VPS, con permisos `600`; **no los subo a GitHub Actions**. El job SSH actualiza `dev`, construye, ejecuta `prisma migrate deploy` y espera `/api/v1/health`. El deploy solo se considera exitoso si el endpoint confirma la base de datos y devuelve HTTP 200.

Antes de usar un runner hospedado por GitHub, confirmo que la política de red de la VPS permite el acceso SSH desde ese runner sin abrir puertos innecesarios. Si la red no lo permite, no abro PostgreSQL ni la API al público como solución rápida; acordamos una ruta privada y revisamos con cuidado cualquier runner propio, porque ese runner ejecuta código del repositorio en el servidor.

## 11. Lista de aceptación del equipo

- [ ] VPS identificado y aislado del entorno productivo.
- [ ] Supabase de staging y respaldo confirmados.
- [ ] Docker, Compose, Nginx y Certbot funcionan; el puerto asignado solo escucha en `127.0.0.1`.
- [ ] Nombre Compose, nombre de contenedor e imágenes son exclusivos de nuestro equipo.
- [ ] `.env.vps` existe solo en el VPS, está en KeePass y tiene modo `600`.
- [ ] Migraciones aplicadas con `prisma migrate deploy`.
- [ ] Contenedor queda `healthy`; `/api/v1/health` devuelve API y DB conectadas.
- [ ] Acceso privado por túnel SSH o público exclusivamente por HTTPS/Nginx.
- [ ] `dev` creada en GitHub; CI verde en un Pull Request cuyo destino sea `dev`.
- [ ] Procedimiento manual desde el clon de `dev` probado antes de activar CD.
- [ ] URL del cliente móvil se agenda para la tarea de configuración del build cuando se defina el dominio.
