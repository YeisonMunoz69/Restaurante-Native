#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fixture="$(mktemp -d)"
cleanup() {
    rm -rf -- "$fixture"
}
trap cleanup EXIT

mkdir -p "$fixture/project/apps/api"
printf '%s\n' 'PREVIOUS_PRIVATE_VALUE=old-value' > "$fixture/project/apps/api/.env.vps"
chmod 600 "$fixture/project/apps/api/.env.vps"

new_env=$(cat <<'EOF'
DATABASE_URL=postgresql://dev.example/restaurant
DIRECT_URL=postgresql://dev.example/restaurant
JWT_ACCESS_SECRET=local-test-access-secret
JWT_REFRESH_SECRET=local-test-refresh-secret
SUPABASE_URL=https://test.supabase.co
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key
SUPABASE_STORAGE_BUCKET=platos
EOF
)
VPS_API_ENV_FILE_B64="$(printf '%s\n' "$new_env" | base64 -w 0)" \
    bash "$repo_root/scripts/install-vps-env.sh" "$fixture/project" "$fixture/backups" > "$fixture/success-output"

grep -q '^DATABASE_URL=' "$fixture/project/apps/api/.env.vps"
if grep -q 'PREVIOUS_PRIVATE_VALUE\|local-test-access-secret\|test-service-role-key' "$fixture/success-output"; then
    printf '%s\n' 'La salida expuso contenido de configuración.' >&2
    exit 1
fi
backup_file="$(find "$fixture/backups" -type f -print -quit)"
[[ -n "$backup_file" ]]
if [[ "$(uname -s)" != MINGW* ]]; then
    [[ "$(stat -c '%a' "$fixture/project/apps/api/.env.vps")" == 600 ]]
    [[ "$(stat -c '%a' "$backup_file")" == 600 ]]
fi
grep -q '^PREVIOUS_PRIVATE_VALUE=old-value$' "$backup_file"

printf '%s\n' 'NOT_A_DATABASE_URL=secret-test-value' > "$fixture/invalid-env"
VPS_API_ENV_FILE_B64="$(base64 -w 0 "$fixture/invalid-env")" \
    bash "$repo_root/scripts/install-vps-env.sh" "$fixture/project" "$fixture/backups" > "$fixture/invalid-output" 2>&1 && {
        printf '%s\n' 'Acepté una configuración incompleta.' >&2
        exit 1
    }
grep -q '^DATABASE_URL=' "$fixture/project/apps/api/.env.vps"
if grep -q 'secret-test-value' "$fixture/invalid-output"; then
    printf '%s\n' 'La salida de error expuso contenido de configuración.' >&2
    exit 1
fi

printf '%s\n' 'La instalación valida variables, mantiene el backup privado y no reemplaza un entorno inválido.'
