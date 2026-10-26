# Qué archivo de entorno usamos

**Continuidad del 26/10:** Alex asume la preparación y verificación de entornos en [EC-74](https://yjmunoz.atlassian.net/browse/EC-74). El workflow original usa secretos SSH pero no genera todavía `apps/api/.env.vps` desde un secret de entorno: consume el archivo privado existente. Para cumplir la consigna preparamos ese cambio en rama/PR, con escritura atómica, permisos 600, validación y copia privada recuperable. No copiamos `ENV_FILE_DEV/PROD` de ApoloByteExample al restaurante ni afirmamos que ya estén configurados en el original. Ver [el procedimiento](Continuidad_Alex_2026-10-26.md#4-llaves-y-variables-dos-conexiones-diferentes).

Conservamos las credenciales vigentes en `apps/api/.env` para el backend local. `ConfigModule.forRoot` carga el `.env` del directorio de ejecución; `npm run start:dev --workspace=api` ejecuta desde `apps/api`. El Compose de desarrollo declara `env_file: .env` junto a su archivo, también en `apps/api`.

El `.env` de la raíz no es la fuente oficial de esos comandos. El 22 de octubre comprobamos nombres de variables, sin publicar valores: todas las claves de la raíz existían también en `apps/api/.env`, pero diferían ambiente, prefijo, conexiones de BD y API_URL. No podemos determinar cuál fue creado primero porque son archivos ignorados por Git. No borramos ninguno en esta revisión. Podemos retirar o renombrar el duplicado de la raíz después de comprobar scripts personales; no copiamos sus valores antiguos encima de las claves vigentes.

| Uso | Archivo o fuente |
| --- | --- |
| NestJS local / Compose de desarrollo | `apps/api/.env` |
| VPS dev y migración de despliegue | `apps/api/.env.vps`, con `--env-file` explícito |
| Pruebas aisladas | Variables temporales y PostgreSQL desechable, nunca Supabase compartido |
| Móvil | Configuración pública de conexión y cliente OAuth; nunca service_role ni secretos JWT |

No ejecutamos Prisma desde la raíz confiando en que encuentre la conexión correcta. Usamos el directorio de la API o cargamos explícitamente el entorno del procedimiento. No mostramos `docker compose config` sin `--quiet` cuando podría revelar secretos.

## Storage

La API necesita `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_STORAGE_BUCKET=platos`. El 22 de octubre añadimos privadamente URL y bucket al archivo vigente, sin tocar contraseñas, JWT ni conexiones. `SUPABASE_ANON_PUBLIC` no reemplaza a la clave del servidor. El bucket público permite leer fotos públicas; no convierte la clave privada en un dato apto para móvil/Git.

El acceso y una carga real con limpieza pasaron. Para repetir el smoke desde la raíz, con Node que admita `--env-file`, primero compilamos shared/API y luego ejecutamos, solo con autorización de quien administra ese Storage:

```powershell
npm run build --workspace=@encanto/shared
npm run build --workspace=api
node --env-file=apps/api/.env scripts/verificar-storage.mjs --allow-test-upload
```

El script crea una imagen sintética, usa un nombre UUID en `qa/AAAA-MM-DD/`, comprueba lectura pública y elimina solo ese objeto. No crea platos ni reemplaza la aceptación de galería en Android. No lo añadimos al CI: el CI no debe escribir en el Storage compartido.

## Ambiente local y VPS

El archivo vigente de esta PC declara `NODE_ENV=production` y `APP_ENV=staging`; lo registramos sin cambiarlo. Para trabajar con recarga y Swagger, revisamos el ambiente de desarrollo de forma explícita. No cambiamos conexión ni secretos para arreglar una diferencia de ambiente. La VPS mantiene su archivo privado independiente, puerto de host 8084 y puerto de API 3000 dentro del contenedor; copiar un `.env` entre equipos no es un paso de despliegue.

Rotamos fuera del chat cualquier contraseña o secreto expuesto previamente. Nunca los pegamos en documentación, capturas o comentarios de Jira.
