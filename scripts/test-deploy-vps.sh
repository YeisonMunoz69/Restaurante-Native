#!/usr/bin/env bash
set -euo pipefail

# Simulo un rebuild en caché cuyo contenedor conserva un ID antiguo sin metadatos.
# No conecto a la VPS ni cargo variables privadas; toda la prueba vive en un fixture.
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fixture="$(mktemp -d "${TMPDIR:-/tmp}/encanto-deploy-test.XXXXXX")"
cleanup() {
    # Quito únicamente los archivos que creé y después los directorios vacíos.
    rm -f "$fixture/bin/docker" "$fixture/bin/git" "$fixture/scripts/deploy-vps.sh" \
        "$fixture/apps/api/.env.vps" "$fixture/running" "$fixture/result"
    rmdir "$fixture/bin" "$fixture/scripts" "$fixture/apps/api" "$fixture/apps" "$fixture"
}
trap cleanup EXIT
mkdir -p "$fixture/bin" "$fixture/scripts" "$fixture/apps/api"
cp "$repo_root/scripts/deploy-vps.sh" "$fixture/scripts/deploy-vps.sh"
: > "$fixture/apps/api/.env.vps"
printf '%s\n' 'sha256:old' > "$fixture/running"

cat > "$fixture/bin/docker" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
if [[ "$1" == compose ]]; then
    case " $* " in
        *' config --quiet '*|*' --profile tools build api migrate '*|*' --profile tools run --rm migrate '*) exit 0 ;;
        *' up '* )
            # Si no recreamos, conservo el contenedor anterior pese al nuevo build.
            if [[ " $* " == *' --force-recreate '* && "${DEPLOY_TEST_STALE:-false}" != true ]]; then
                printf '%s\n' 'sha256:new' > "$DEPLOY_TEST_FIXTURE/running"
            fi
            exit 0 ;;
        *' ps -q api '*) printf '%s\n' 'api-container'; exit 0 ;;
        *' ps api '*) exit 0 ;;
        *' images -q api '*) printf '%s\n' 'sha256:old'; exit 0 ;;
    esac
fi
if [[ "$1" == inspect ]]; then
    case "$3" in
        '{{.Config.Image}}') printf '%s\n' 'encanto-test:dev'; exit 0 ;;
        '{{.Image}}') cat "$DEPLOY_TEST_FIXTURE/running"; exit 0 ;;
        '{{join .Config.Cmd " "}}') printf '%s\n' 'node dist/main.js'; exit 0 ;;
        '{{len .Mounts}}') printf '%s\n' '0'; exit 0 ;;
    esac
fi
if [[ "$1" == image && "$2" == inspect ]]; then
    if [[ "${@: -1}" == encanto-test:dev ]]; then
        printf '%s\n' 'sha256:new'
        exit 0
    fi
    printf '%s\n' 'No such image: old config ID' >&2
    exit 1
fi
printf 'Llamada Docker no prevista: %s\n' "$*" >&2
exit 1
MOCK
cat > "$fixture/bin/git" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
if [[ "$*" == 'rev-parse HEAD' || "$*" == 'rev-parse --short HEAD' ]]; then
    printf '%s\n' 'fixture-commit'
    exit 0
fi
exit 1
MOCK
chmod +x "$fixture/bin/docker" "$fixture/bin/git"
export DEPLOY_TEST_FIXTURE="$fixture"

# Compruebo primer despliegue y repetición sin cambios, incluyendo las validaciones del runtime.
for attempt in 1 2; do
    PATH="$fixture/bin:$PATH" bash "$fixture/scripts/deploy-vps.sh" fixture-commit > "$fixture/result"
    [[ "$(cat "$fixture/running")" == sha256:new ]]
    grep -q 'Runtime confirmado: imagen=sha256:new comando=node dist/main.js montajes=0' "$fixture/result"
done
# Un contenedor realmente desactualizado debe seguir rechazándose, no ocultamos el fallo.
printf '%s\n' 'sha256:old' > "$fixture/running"
if DEPLOY_TEST_STALE=true PATH="$fixture/bin:$PATH" \
    bash "$fixture/scripts/deploy-vps.sh" fixture-commit > "$fixture/result" 2>&1; then
    printf '%s\n' 'La comprobación aceptó un contenedor con una imagen desactualizada.' >&2
    exit 1
fi
grep -q 'El contenedor API no usa la imagen que acaba de construir Compose.' "$fixture/result"
printf '%s\n' 'Despliegue/repetición con caché y rechazo de imagen vieja: correctos (Docker simulado).'
