#!/usr/bin/env bash
set -euo pipefail

# Reemplazo el archivo del VPS solo después de validar la nueva configuración y
# guardar una copia privada que permita recuperar la versión anterior.
project_root="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
backup_dir="${2:-/root/backups/elev-d-e-7-dev/env}"
env_file="$project_root/apps/api/.env.vps"
env_dir="$(dirname "$env_file")"

if [[ -z "${VPS_API_ENV_FILE_B64:-}" ]]; then
    printf '%s\n' 'Falta la configuración de entorno codificada en base64.' >&2
    exit 1
fi

if [[ ! -f "$env_file" ]]; then
    printf '%s\n' 'No existe la configuración privada actual para respaldar; no reemplazo el entorno.' >&2
    exit 1
fi

umask 077
temp_file="$(mktemp "$env_dir/.env.vps.XXXXXX")"
cleanup() {
    [[ -z "$temp_file" || ! -e "$temp_file" ]] || rm -f -- "$temp_file"
}
trap cleanup EXIT

if ! printf '%s' "$VPS_API_ENV_FILE_B64" | base64 --decode > "$temp_file" 2>/dev/null; then
    printf '%s\n' 'La configuración del entorno no tiene una codificación base64 válida.' >&2
    exit 1
fi

if [[ ! -s "$temp_file" ]]; then
    printf '%s\n' 'La configuración nueva está vacía; no reemplazo el entorno.' >&2
    exit 1
fi

# Reviso nombres y valores sin ejecutar el .env ni mostrar su contenido.
require_env_value() {
    local required_name="$1"
    if ! awk -v required_name="$required_name" '
        {
            line = $0
            sub(/^[[:space:]]*/, "", line)
            if (line == "" || line ~ /^#/) next
            equals = index(line, "=")
            if (!equals) next
            name = substr(line, 1, equals - 1)
            value = substr(line, equals + 1)
            sub(/[[:space:]]*$/, "", name)
            sub(/^[[:space:]]*/, "", value)
            sub(/[[:space:]]*$/, "", value)
            if (name != required_name) next
            if (value ~ /^#/) value = ""
            if (value ~ /^".*"$/ || value ~ /^\047.*\047$/) {
                value = substr(value, 2, length(value) - 2)
            }
            found = length(value) > 0
        }
        END { exit !found }
    ' "$temp_file"; then
        printf 'Falta la variable requerida o está vacía: %s\n' "$required_name" >&2
        return 1
    fi
}

for required_name in \
    DATABASE_URL \
    DIRECT_URL \
    JWT_ACCESS_SECRET \
    JWT_REFRESH_SECRET \
    SUPABASE_URL \
    SUPABASE_SERVICE_ROLE_KEY \
    SUPABASE_STORAGE_BUCKET; do
    require_env_value "$required_name"
done

chmod 600 "$temp_file"
mkdir -p -- "$backup_dir"
chmod 700 "$backup_dir"
backup_file="$(mktemp "$backup_dir/apps-api-env-vps.XXXXXX")"
install -m 600 -- "$env_file" "$backup_file"

# El temporal vive junto al destino, por lo que mv mantiene el reemplazo atómico.
mv -f -- "$temp_file" "$env_file"
temp_file=''
trap - EXIT

printf 'Configuración reemplazada; respaldo privado: %s\n' "$backup_file"
