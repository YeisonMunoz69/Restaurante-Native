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
"${compose[@]}" up -d --no-build --wait --wait-timeout 240 api
"${compose[@]}" ps api
printf 'Desplegado correctamente: %s\n' "$(git rev-parse --short HEAD)"
