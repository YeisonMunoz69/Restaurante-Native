#!/usr/bin/env bash
set -euo pipefail

# Trabajo desde la raiz para resolver igual las rutas en SSH y en una ejecucion manual.
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Compruebo que el codigo traido por git pull sea el mismo que paso los filtros.
expected_commit="${1:-}"
if [[ -n "$expected_commit" && "$(git rev-parse HEAD)" != "$expected_commit" ]]; then
    printf '%s\n' 'dev cambio desde la verificacion; esta ejecucion no despliega otro commit.' >&2
    exit 1
fi

if [[ ! -f apps/api/.env.vps ]]; then
    printf '%s\n' 'Falta apps/api/.env.vps. Completa la plantilla en la VPS antes de desplegar.' >&2
    exit 1
fi

# Cargo el archivo privado como en la guia; los nombres identifican solo a nuestro equipo.
compose=(docker compose --env-file apps/api/.env.vps -p elev-d-e-7-dev -f apps/api/docker-compose.vps.yml)
"${compose[@]}" config --quiet
"${compose[@]}" --profile tools build api migrate

# Aplico migraciones versionadas antes de iniciar la API; cualquier error detiene el despliegue.
"${compose[@]}" --profile tools run --rm migrate

# Espero HTTP y base de datos mediante el healthcheck del contenedor.
# Recreo también cuando la caché conserva capas: el contenedor debe usar la etiqueta recién construida.
"${compose[@]}" up -d --no-build --force-recreate --wait --wait-timeout 240 api
"${compose[@]}" ps api

# Confirmo que el contenedor usa la imagen recien construida, sin bind mounts
# que sustituyan el codigo compilado del runtime.
api_container="$("${compose[@]}" ps -q api)"

if [[ -z "$api_container" ]]; then
    printf '%s\n' 'Compose no encuentra el contenedor del servicio API.' >&2
    exit 1
fi

# Consulto la etiqueta configurada: compose images puede devolver el ID viejo de un
# contenedor que sigue vivo aunque ese ID ya no sea inspeccionable tras reconstruir.
runtime_image="$(docker inspect --format '{{.Config.Image}}' "$api_container")"
expected_image_id="$(docker image inspect --format '{{.Id}}' "$runtime_image")"
actual_image_id="$(docker inspect --format '{{.Image}}' "$api_container")"
runtime_command="$(docker inspect --format '{{join .Config.Cmd " "}}' "$api_container")"
mount_count="$(docker inspect --format '{{len .Mounts}}' "$api_container")"

if [[ "$expected_image_id" != "$actual_image_id" ]]; then
    printf '%s\n' 'El contenedor API no usa la imagen que acaba de construir Compose.' >&2
    exit 1
fi
if [[ "$runtime_command" != 'node dist/main.js' || "$mount_count" != '0' ]]; then
    printf '%s\n' 'El contenedor no ejecuta el runtime compilado esperado sin montajes externos.' >&2
    exit 1
fi

printf 'Runtime confirmado: imagen=%s comando=%s montajes=%s\n' \
    "${actual_image_id:0:19}" "$runtime_command" "$mount_count"
printf 'Desplegado correctamente: %s\n' "$(git rev-parse --short HEAD)"
