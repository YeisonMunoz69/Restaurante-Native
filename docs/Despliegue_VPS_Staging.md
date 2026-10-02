# Despliegue manual de la API en VPS (staging)

## Alcance y límites

Con este procedimiento preparo un entorno temporal de nube para pruebas del equipo; no lo considero producción. La API corre en Docker, se conecta a Supabase y, por defecto, solo publica `127.0.0.1:3000` dentro del VPS. El puerto 3000 no debe abrirse en el firewall. Para uso desde Internet pongo Caddy delante con HTTPS y un dominio; para pruebas privadas uso un túnel SSH. No guardo credenciales en Git, en este documento, en comandos ni en el chat: recupero cada valor desde KeePass y lo escribo únicamente en `apps/api/.env.vps` en el servidor.

El despliegue real queda pendiente hasta que el equipo tenga el VPS, el usuario, el sistema operativo, el dominio (si se necesita acceso público) y el acceso de KeePass disponibles. Este documento prepara los archivos y deja el procedimiento repetible, pero no afirma que un servidor externo ya haya sido probado.

## 1. Qué necesito antes de empezar

- Un VPS Ubuntu LTS o Debian estable, con arquitectura compatible con Docker Engine, acceso SSH y permisos `sudo`.
- Espacio reservado para este entorno, no compartido con un servicio de producción.
- Un proyecto de Supabase de prueba o staging, sin datos reales ni credenciales de producción. Verifico en el panel de Supabase que la cadena elegida permite conexiones desde la IP de salida del VPS.
- En KeePass: IP/nombre del VPS, usuario SSH, referencia al archivo de llave privada (no la pego en comandos), acceso al proveedor, URLs de conexión Supabase y dos secretos JWT independientes.
- Para publicar por HTTPS: un dominio o subdominio apuntando a la IP pública del VPS. Si aún no tenemos dominio, sigo la opción privada por túnel SSH.
- Un commit de `main` que ya incluya los archivos de este procedimiento. No despliego una rama de trabajo sin revisar el commit y el estado del árbol.

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
   ```

   Uso `sudo docker` para el despliegue. No agrego usuarios al grupo `docker` por comodidad: ese grupo equivale a privilegios de administrador.

5. Reviso el firewall del proveedor y el del sistema. Mantengo SSH (22/tcp) permitido desde las IP del equipo cuando sea posible. Solo si usaré HTTPS público permito 80/tcp y 443/tcp. No abro 3000/tcp. Si UFW está activo, conservo sus reglas y añado únicamente las que hagan falta; antes de habilitarlo confirmo desde una segunda sesión que SSH seguirá permitido.

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

1. Entro con la cuenta de despliegue y creo una carpeta dedicada. No clono sobre una carpeta que ya contenga datos:

   ```bash
   sudo mkdir -p /opt/encanto
   sudo chown "$USER":"$USER" /opt/encanto
   cd /opt/encanto
   ```

2. Clono el repositorio por SSH usando el acceso configurado por el equipo, nunca poniendo un token dentro de la URL. Si no tengo acceso al repositorio desde el VPS, transfiero un artefacto aprobado por el equipo por un canal autenticado; no copio `.env`, llaves ni backups junto con el código.

   ```bash
   git clone URL_SSH_DEL_REPOSITORIO restaurante-native
   cd restaurante-native
   git switch main
   git pull --ff-only
   git status --short --branch
   git rev-parse --short HEAD
   ```

3. Confirmo que el árbol está limpio y anoto el hash corto del commit desplegado en el registro interno del equipo. No hago commits desde el VPS.

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

3. Sustituyo los marcadores consultando KeePass, sin pegar el archivo en mensajes, tickets, capturas o logs. Completo:

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

## 5. Construir y aplicar migraciones

1. Construyo la imagen de staging desde la raíz del repositorio:

   ```bash
   sudo docker compose -f apps/api/docker-compose.vps.yml build api
   ```

2. Antes de tocar el esquema, confirmo que `DATABASE_URL` y `DIRECT_URL` apuntan al proyecto Supabase de staging y que existe el respaldo/punto de recuperación previsto por el equipo. No aplico migraciones contra producción desde esta guía.

3. Aplico exclusivamente las migraciones versionadas:

   ```bash
   sudo docker compose -f apps/api/docker-compose.vps.yml --profile tools run --rm --build migrate
   ```

   No uso `prisma db push`, `migrate reset` ni comandos de borrado para “arreglar” un error. Si una migración falla, guardo el nombre de la migración y el código de error, oculto hosts/usuarios/cadenas en cualquier reporte y paro para diagnosticar.

## 6. Arrancar y verificar en modo privado

1. Levanto el servicio:

   ```bash
   sudo docker compose -f apps/api/docker-compose.vps.yml up -d
   ```

2. Reviso estado, healthcheck y logs localmente en el VPS:

   ```bash
   sudo docker compose -f apps/api/docker-compose.vps.yml ps
   sudo docker inspect --format '{{.State.Health.Status}}' encanto_vps_staging_api
   sudo docker compose -f apps/api/docker-compose.vps.yml logs --tail=100 api
   ```

   Espero `healthy`. En logs confirmo que Nest inició y Prisma conectó; antes de compartir cualquier fragmento lo reviso para quitar secretos, direcciones sensibles y datos personales.

3. Verifico que el endpoint de salud consulta también la base de datos y no publica el puerto en interfaces externas:

   ```bash
   curl --fail --show-error http://127.0.0.1:3000/api/v1/health
   sudo ss -lntp | grep ':3000'
   ```

   La respuesta de salud debe indicar `status: ok` y `database: connected`. El socket debe estar ligado a `127.0.0.1`, no a `0.0.0.0` ni a la IP pública.

4. Desde PowerShell en mi computador, creo un túnel temporal:

   ```powershell
   ssh -N -L 3000:127.0.0.1:3000 usuario@IP_DEL_VPS
   ```

   Mantengo esa ventana abierta y en otra consulto `http://localhost:3000/api/v1/health`. Para cerrar el túnel uso `Ctrl+C`. No necesito abrir el puerto 3000 en el firewall.

## 7. Publicar con dominio y HTTPS (opcional)

1. Creo un registro DNS `A` del subdominio hacia la IP pública del VPS y espero su propagación. Solo agrego `AAAA` si el VPS tiene IPv6 entrante funcional. Confirmo que el firewall del proveedor y UFW permitan 80/443.

2. Instalo Caddy desde su repositorio oficial de Debian/Ubuntu siguiendo [la documentación oficial de instalación](https://caddyserver.com/docs/install). La instalación oficial crea y activa el servicio del sistema.

3. Configuro el proxy:

   ```bash
   sudo nano /etc/caddy/Caddyfile
   ```

   Contenido del archivo, reemplazando el dominio por el reservado:

   ```caddyfile
   api.ejemplo.com {
       reverse_proxy 127.0.0.1:3000
   }
   ```

4. Valido y recargo:

   ```bash
   sudo caddy validate --config /etc/caddy/Caddyfile
   sudo systemctl reload caddy
   sudo systemctl status caddy --no-pager
   ```

   Con DNS correcto y los puertos 80/443 accesibles, Caddy gestiona el certificado TLS. Verifico desde mi equipo `https://api.ejemplo.com/api/v1/health`. Sigo la [guía oficial de Caddy](https://caddyserver.com/docs/getting-started) si la emisión del certificado no ocurre.

5. Si un frontend web va a llamar la API, actualizo `CORS_ORIGIN` con el origen HTTPS exacto, vuelvo a crear el contenedor y reviso las solicitudes `OPTIONS`. CORS no sustituye autenticación. No publico Swagger en este staging; está desactivado por defecto.

## 8. Actualizar una versión

1. Registro el commit actual y compruebo el estado del repo.
2. Traigo únicamente `main` fast-forward y reviso qué migraciones entraron:

   ```bash
   git fetch origin
   git switch main
   git pull --ff-only
   git log -5 --oneline
   ```

3. Repito construcción, revisión de respaldo y `prisma migrate deploy` de las secciones anteriores.
4. Recreo el servicio y espero el healthcheck:

   ```bash
   sudo docker compose -f apps/api/docker-compose.vps.yml up -d --build
   sudo docker compose -f apps/api/docker-compose.vps.yml ps
   ```

5. Si el código nuevo falla, vuelvo a desplegar el commit anterior y reconstruyo la imagen. No intento revertir automáticamente una migración de base de datos: primero verifico si es compatible hacia atrás y restauro solo desde el mecanismo de backup acordado.

## 9. Diagnóstico seguro

- **El servicio reinicia o no queda healthy:** reviso `docker compose ps` y `logs --tail=100`; compruebo que las dos URLs estén presentes en KeePass y que el archivo local del VPS tenga permisos `600`. Nunca pego aquí el `.env.vps` ni la salida completa de `docker inspect`.
- **Prisma reporta P1001:** compruebo DNS y salida TCP sin imprimir usuario ni contraseña. Para resolver solo el host:

  ```bash
  sudo docker compose -f apps/api/docker-compose.vps.yml run --rm --no-deps api node -e 'const u=new URL(process.env.DATABASE_URL); require("dns").lookup(u.hostname,(e,a)=>{console.log(e?.code || a); process.exit(e?1:0)})'
  ```

  Si DNS no resuelve, reviso DNS del VPS/proveedor. Si resuelve pero el puerto no conecta, reviso firewall de salida, allowlist de Supabase y VPN/ruta de red. Si llega al servidor pero Prisma falla, verifico SSL, usuario/contraseña en KeePass, URL-encoding y que runtime use la cadena de sesión adecuada y la migración una cadena compatible con Prisma. No cambio a puerto 6543 para “probar” migraciones.

- **El healthcheck falla pero Nest aparece iniciado:** `/api/v1/health` también consulta PostgreSQL. Distingo una caída HTTP de una desconexión DB; reviso Supabase y el pooler, sin reiniciar en bucle ni editar la conexión compartida a ciegas.
- **HTTPS no emite certificado:** verifico DNS público, puertos 80/443 en los dos firewalls y `sudo journalctl -u caddy --since '15 minutes ago'`. No abro el 3000 como alternativa.
- **La app móvil no conecta al VPS:** el build móvil actualmente está configurado para desarrollo local/emulador. Antes de distribuir una app conectada a la nube, se debe integrar en una tarea separada la URL HTTPS del API en la configuración de build móvil; no se debe incrustar una URL HTTP ni editar secretos dentro del código.

## 10. Lista de aceptación del equipo

- [ ] VPS identificado y aislado del entorno productivo.
- [ ] Supabase de staging y respaldo confirmados.
- [ ] Docker y Compose funcionan; firewall no expone 3000.
- [ ] `.env.vps` existe solo en el VPS, está en KeePass y tiene modo `600`.
- [ ] Migraciones aplicadas con `prisma migrate deploy`.
- [ ] Contenedor queda `healthy`; `/api/v1/health` devuelve API y DB conectadas.
- [ ] Acceso privado por túnel SSH o público exclusivamente por HTTPS/Caddy.
- [ ] Commit desplegado anotado y procedimiento de actualización probado.
- [ ] URL del cliente móvil se agenda para la tarea de configuración del build cuando se defina el dominio.
