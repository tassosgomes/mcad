#!/usr/bin/env bash
# scripts/seed-authz.sh
#
# Seed idempotente do ecad-authz para o mcad. Popula:
#   1) catálogos de permissões em seeds/mcad/*.permissions.json;
#   2) papéis padrão declarados em seeds/mcad/roles.json;
#   3) associação de permissões aos papéis;
#   4) atribuição dos papéis aos usuários de teste (consultor.dev,
#      analista.dev, sem-papel.dev).
#
# Pré-requisitos:
#   - ecad-authz acessível em $AUTHZ_BASE_URL (default http://localhost:8085).
#   - $AUTHZ_ADMIN_TOKEN exportado (Bearer token de service admin / TI global).
#   - Os 3 usuários de teste já existem no ecad-authz (sync do Logto/Keycloak
#     ou criação manual). O script só ATRIBUI papéis — não cria usuários.
#   - jq e curl instalados.
#
# Uso:
#   ./scripts/seed-authz.sh                        # tudo: catálogos + papéis + atribuições
#   ./scripts/seed-authz.sh --dry-run              # imprime requisições sem executar
#   ./scripts/seed-authz.sh --service cadastro     # registra apenas um catálogo
#   ./scripts/seed-authz.sh --skip-assignments     # pula etapa de usuários
#   ./scripts/seed-authz.sh --help

set -euo pipefail

# ── Diretórios ───────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SEEDS_DIR="${REPO_ROOT}/seeds/mcad"

# ── Defaults ─────────────────────────────────────────────────────────────────
AUTHZ_BASE_URL="${AUTHZ_BASE_URL:-http://localhost:8085}"
AUTHZ_ADMIN_TOKEN="${AUTHZ_ADMIN_TOKEN:-}"
DRY_RUN=0
ONLY_SERVICE=""
SKIP_CATALOGS=0
SKIP_ROLES=0
SKIP_ASSIGNMENTS=0

# ── Cores ────────────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  C_RESET='\033[0m'
  C_GREEN='\033[0;32m'
  C_YELLOW='\033[0;33m'
  C_RED='\033[0;31m'
  C_BLUE='\033[0;34m'
  C_BOLD='\033[1m'
else
  C_RESET='' C_GREEN='' C_YELLOW='' C_RED='' C_BLUE='' C_BOLD=''
fi

log_ok()    { printf '%b✅ %s%b\n' "${C_GREEN}" "$*" "${C_RESET}" >&2; }
log_warn()  { printf '%b⚠️  %s%b\n' "${C_YELLOW}" "$*" "${C_RESET}" >&2; }
log_err()   { printf '%b❌ %s%b\n' "${C_RED}" "$*" "${C_RESET}" >&2; }
log_info()  { printf '%bℹ️  %s%b\n' "${C_BLUE}" "$*" "${C_RESET}" >&2; }
log_head()  { printf '\n%b▶ %s%b\n' "${C_BOLD}" "$*" "${C_RESET}" >&2; }

# ── Help ─────────────────────────────────────────────────────────────────────
usage() {
  cat <<EOF
Usage: $0 [options]

Options:
  --dry-run                  Mostra as requisições que seriam feitas, sem executar.
  --service <name>           Processa só um catálogo pelo prefixo do arquivo <name>.permissions.json.
  --skip-catalogs            Pula registro de catálogos.
  --skip-roles               Pula criação de papéis e associação de permissões.
  --skip-assignments         Pula atribuição de papéis aos usuários de teste.
  -h, --help                 Exibe esta ajuda.

Variáveis de ambiente:
  AUTHZ_BASE_URL             Base URL do ecad-authz (default: http://localhost:8085).
  AUTHZ_ADMIN_TOKEN          Bearer token admin (obrigatório, exceto em --dry-run).

Arquivos de input lidos de: ${SEEDS_DIR}
  *.permissions.json
  roles.json
  assignments.json
EOF
}

# ── Parse args ───────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --service) ONLY_SERVICE="${2:-}"; shift 2 ;;
    --skip-catalogs) SKIP_CATALOGS=1; shift ;;
    --skip-roles) SKIP_ROLES=1; shift ;;
    --skip-assignments) SKIP_ASSIGNMENTS=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) log_err "Argumento desconhecido: $1"; usage; exit 2 ;;
  esac
done

# ── Pré-checks ───────────────────────────────────────────────────────────────
if ! command -v jq >/dev/null 2>&1; then
  log_err "jq não encontrado no PATH. Instale jq antes de rodar este script."
  exit 1
fi
if ! command -v curl >/dev/null 2>&1; then
  log_err "curl não encontrado no PATH."
  exit 1
fi

if [[ "${DRY_RUN}" -eq 0 && -z "${AUTHZ_ADMIN_TOKEN}" ]]; then
  log_err "AUTHZ_ADMIN_TOKEN não definido. Exporte um Bearer token admin ou use --dry-run."
  exit 1
fi

if [[ -n "${ONLY_SERVICE}" && ! -f "${SEEDS_DIR}/${ONLY_SERVICE}.permissions.json" ]]; then
  log_err "--service deve apontar para um arquivo existente em ${SEEDS_DIR}/<service>.permissions.json"
  exit 2
fi

# ── HTTP helpers ─────────────────────────────────────────────────────────────
http_call() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local url="${AUTHZ_BASE_URL%/}/v1${path}"

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    printf '%b[DRY-RUN] %s %s%b\n' "${C_BLUE}" "${method}" "${url}" "${C_RESET}" >&2
    if [[ -n "${body}" ]]; then
      printf '          body: %s\n' "$(printf '%s' "${body}" | jq -c '.' 2>/dev/null || printf '%s' "${body}")" >&2
    fi
    # Status e corpo "fake" para o caller seguir
    printf '200\n{}\n'
    return 0
  fi

  local response status http_body
  local tmpfile
  tmpfile="$(mktemp)"
  trap 'rm -f "${tmpfile}"' RETURN

  if [[ -n "${body}" ]]; then
    status=$(curl -sS -o "${tmpfile}" -w '%{http_code}' \
      -X "${method}" "${url}" \
      -H "Authorization: Bearer ${AUTHZ_ADMIN_TOKEN}" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      --data-raw "${body}" || echo "000")
  else
    status=$(curl -sS -o "${tmpfile}" -w '%{http_code}' \
      -X "${method}" "${url}" \
      -H "Authorization: Bearer ${AUTHZ_ADMIN_TOKEN}" \
      -H "Accept: application/json" || echo "000")
  fi

  http_body="$(cat "${tmpfile}")"
  rm -f "${tmpfile}"
  trap - RETURN

  printf '%s\n%s\n' "${status}" "${http_body}"
}

# Lê stdout do http_call em variáveis "STATUS" e "BODY" no escopo do caller.
parse_http() {
  local raw="$1"
  STATUS="$(printf '%s' "${raw}" | head -n1)"
  BODY="$(printf '%s' "${raw}" | tail -n +2)"
}

# ── Etapa 1: catálogos ───────────────────────────────────────────────────────
register_catalog() {
  local service_name="$1"
  local file="${SEEDS_DIR}/${service_name}.permissions.json"

  if [[ ! -f "${file}" ]]; then
    log_err "Arquivo ${file} não encontrado."
    return 1
  fi

  local count
  count=$(jq '.permissions | length' "${file}")
  log_info "Registrando catálogo ${service_name} (${count} permissões) ..."

  local body
  body="$(cat "${file}")"
  local raw
  raw="$(http_call POST "/permission-catalog/register" "${body}")"
  parse_http "${raw}"

  case "${STATUS}" in
    200|201)
      if [[ "${DRY_RUN}" -eq 0 ]]; then
        local reg upd dep ign
        reg=$(printf '%s' "${BODY}" | jq -r '.registered // 0')
        upd=$(printf '%s' "${BODY}" | jq -r '.updated // 0')
        dep=$(printf '%s' "${BODY}" | jq -r '.deprecated // 0')
        ign=$(printf '%s' "${BODY}" | jq -r '.ignored // 0')
        log_ok "Catálogo ${service_name}: registered=${reg} updated=${upd} deprecated=${dep} ignored=${ign}"
      else
        log_ok "Catálogo ${service_name} (dry-run)"
      fi
      ;;
    *)
      log_err "Falha ao registrar catálogo ${service_name} (HTTP ${STATUS}): ${BODY}"
      return 1
      ;;
  esac
}

discover_catalog_services() {
  local file base
  for file in "${SEEDS_DIR}"/*.permissions.json; do
    [[ -e "${file}" ]] || continue
    base="$(basename "${file}")"
    printf '%s\n' "${base%.permissions.json}"
  done | sort
}

# ── Etapa 2: papéis ──────────────────────────────────────────────────────────
# Procura papel existente pela key, retorna o id ou vazio.
find_role_id_by_key() {
  local role_key="$1"
  local raw
  raw="$(http_call GET "/roles?q=$(printf '%s' "${role_key}" | jq -sRr @uri)&size=100")"
  parse_http "${raw}"
  if [[ "${STATUS}" == "200" && "${DRY_RUN}" -eq 0 ]]; then
    printf '%s' "${BODY}" | jq -r --arg k "${role_key}" '.content[]? | select(.key == $k) | .id' | head -n1
  else
    printf ''
  fi
}

create_or_get_role() {
  # Cria papel se não existir; sempre retorna o id pelo stdout.
  local role_key="$1"
  local display_name="$2"
  local description="$3"
  local domain="$4"
  local area="$5"

  local existing
  existing="$(find_role_id_by_key "${role_key}")"
  if [[ -n "${existing}" ]]; then
    log_ok "Papel ${role_key} já existe (id=${existing})"
    printf '%s' "${existing}"
    return 0
  fi

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    log_warn "Papel ${role_key} não existia — seria criado (dry-run)"
  fi

  local body
  body=$(jq -n \
    --arg key "${role_key}" \
    --arg displayName "${display_name}" \
    --arg description "${description}" \
    --arg domain "${domain}" \
    --arg area "${area}" \
    '{key: $key, displayName: $displayName, description: $description, domain: $domain, area: $area}')

  local raw
  raw="$(http_call POST "/roles" "${body}")"
  parse_http "${raw}"

  case "${STATUS}" in
    200|201)
      if [[ "${DRY_RUN}" -eq 0 ]]; then
        local new_id
        new_id=$(printf '%s' "${BODY}" | jq -r '.id // empty')
        if [[ -z "${new_id}" ]]; then
          log_err "Resposta de criação sem id para ${role_key}: ${BODY}"
          return 1
        fi
        log_ok "Papel ${role_key} criado (id=${new_id})"
        printf '%s' "${new_id}"
      else
        printf 'dry-run-id'
      fi
      ;;
    409)
      # Concorrência — busca de novo
      existing="$(find_role_id_by_key "${role_key}")"
      if [[ -n "${existing}" ]]; then
        log_ok "Papel ${role_key} criado por outro processo (id=${existing})"
        printf '%s' "${existing}"
      else
        log_err "Conflito 409 sem encontrar papel ${role_key}: ${BODY}"
        return 1
      fi
      ;;
    *)
      log_err "Falha ao criar papel ${role_key} (HTTP ${STATUS}): ${BODY}"
      return 1
      ;;
  esac
}

# Adiciona uma permissão a um papel (idempotente — 200/409 viram OK).
add_permission_to_role() {
  local role_id="$1"
  local permission_key="$2"

  local body
  body=$(jq -n --arg k "${permission_key}" '{permissionKey: $k}')

  local raw
  raw="$(http_call POST "/roles/${role_id}/permissions" "${body}")"
  parse_http "${raw}"

  case "${STATUS}" in
    200|201|204) return 0 ;;
    409)         return 0 ;;
    *)
      log_warn "Não foi possível associar ${permission_key} ao papel ${role_id} (HTTP ${STATUS}): ${BODY}"
      return 1
      ;;
  esac
}

process_roles() {
  log_head "Etapa 2/3 — Papéis e associações de permissões"
  local file="${SEEDS_DIR}/roles.json"
  if [[ ! -f "${file}" ]]; then
    log_err "Arquivo ${file} não encontrado."
    return 1
  fi

  local total
  total=$(jq 'length' "${file}")
  log_info "Processando ${total} papéis ..."

  local i
  for ((i = 0; i < total; i++)); do
    local role_json key displayName description domain area
    role_json=$(jq -c ".[$i]" "${file}")
    key=$(printf '%s' "${role_json}" | jq -r '.key')
    displayName=$(printf '%s' "${role_json}" | jq -r '.displayName')
    description=$(printf '%s' "${role_json}" | jq -r '.description // ""')
    domain=$(printf '%s' "${role_json}" | jq -r '.domain')
    area=$(printf '%s' "${role_json}" | jq -r '.area // ""')

    local role_id
    if ! role_id=$(create_or_get_role "${key}" "${displayName}" "${description}" "${domain}" "${area}"); then
      log_err "Pulando associações do papel ${key} (criação falhou)."
      continue
    fi

    if [[ -z "${role_id}" ]]; then
      log_warn "ID vazio para ${key}; pulando associações."
      continue
    fi

    local perms_count
    perms_count=$(printf '%s' "${role_json}" | jq '.permissionKeys | length')
    log_info "  Associando ${perms_count} permissões a ${key} ..."

    local pk_index added=0 failed=0
    for ((pk_index = 0; pk_index < perms_count; pk_index++)); do
      local pk
      pk=$(printf '%s' "${role_json}" | jq -r ".permissionKeys[$pk_index]")
      if add_permission_to_role "${role_id}" "${pk}"; then
        added=$((added + 1))
      else
        failed=$((failed + 1))
      fi
    done

    if [[ "${failed}" -gt 0 ]]; then
      log_warn "  ${key}: ${added} associadas, ${failed} com aviso"
    else
      log_ok "  ${key}: ${added} permissões associadas"
    fi
  done
}

# ── Etapa 3: atribuições de usuários ─────────────────────────────────────────
find_user_id_by_email() {
  local email="$1"
  local raw
  raw="$(http_call GET "/users?q=$(printf '%s' "${email}" | jq -sRr @uri)&size=20")"
  parse_http "${raw}"
  if [[ "${STATUS}" == "200" && "${DRY_RUN}" -eq 0 ]]; then
    printf '%s' "${BODY}" | jq -r --arg e "${email}" '.content[]? | select(.email == $e) | .id' | head -n1
  else
    printf ''
  fi
}

assign_role_to_user() {
  local user_id="$1"
  local role_key="$2"

  # Verifica se já existe
  local existing_raw
  existing_raw="$(http_call GET "/users/${user_id}/roles" "")"
  parse_http "${existing_raw}"
  if [[ "${STATUS}" == "200" && "${DRY_RUN}" -eq 0 ]]; then
    if printf '%s' "${BODY}" | jq -e --arg k "${role_key}" '.[]? | select(.roleKey == $k and .status == "ACTIVE")' >/dev/null; then
      log_ok "  ${role_key} já atribuído a ${user_id}"
      return 0
    fi
  fi

  local body
  body=$(jq -n --arg k "${role_key}" '{roleKey: $k}')

  local raw
  raw="$(http_call POST "/users/${user_id}/roles" "${body}")"
  parse_http "${raw}"

  case "${STATUS}" in
    200|201) log_ok "  ${role_key} atribuído a ${user_id}" ;;
    409)     log_ok "  ${role_key} já estava atribuído a ${user_id} (409)" ;;
    *)
      log_err "  Falha ao atribuir ${role_key} a ${user_id} (HTTP ${STATUS}): ${BODY}"
      return 1
      ;;
  esac
}

process_assignments() {
  log_head "Etapa 3/3 — Atribuição de papéis aos usuários de teste"
  local file="${SEEDS_DIR}/assignments.json"
  if [[ ! -f "${file}" ]]; then
    log_err "Arquivo ${file} não encontrado."
    return 1
  fi

  local total
  total=$(jq 'length' "${file}")
  local i
  for ((i = 0; i < total; i++)); do
    local user_json email name role_count
    user_json=$(jq -c ".[$i]" "${file}")
    email=$(printf '%s' "${user_json}" | jq -r '.email')
    name=$(printf '%s' "${user_json}" | jq -r '.name')
    role_count=$(printf '%s' "${user_json}" | jq '.roleKeys | length')

    log_info "Usuário ${name} <${email}>"

    if [[ "${DRY_RUN}" -eq 1 ]]; then
      log_warn "  (dry-run) Buscaria usuário por email e atribuiria ${role_count} papéis"
      local rk
      for ((rk = 0; rk < role_count; rk++)); do
        local k
        k=$(printf '%s' "${user_json}" | jq -r ".roleKeys[$rk]")
        log_info "    → ${k}"
      done
      continue
    fi

    local user_id
    user_id=$(find_user_id_by_email "${email}")
    if [[ -z "${user_id}" ]]; then
      log_warn "Usuário ${email} não existe no ecad-authz. Crie/sincronize-o antes de rodar este script."
      log_info "  Hint: subject sugerido = $(printf '%s' "${user_json}" | jq -r '.subjectHint')"
      continue
    fi
    log_ok "Encontrado: id=${user_id}"

    if [[ "${role_count}" -eq 0 ]]; then
      log_info "  Sem papéis a atribuir (usuário sem-papel)."
      continue
    fi

    local rk
    for ((rk = 0; rk < role_count; rk++)); do
      local k
      k=$(printf '%s' "${user_json}" | jq -r ".roleKeys[$rk]")
      assign_role_to_user "${user_id}" "${k}" || true
    done
  done
}

# ── Main ─────────────────────────────────────────────────────────────────────
main() {
  log_head "ecad-authz seed — mcad"
  log_info "AUTHZ_BASE_URL = ${AUTHZ_BASE_URL}"
  if [[ "${DRY_RUN}" -eq 1 ]]; then
    log_warn "MODO DRY-RUN — nenhuma requisição real será enviada."
  fi

  # Etapa 1: catálogos
  if [[ "${SKIP_CATALOGS}" -eq 0 ]]; then
    log_head "Etapa 1/3 — Catálogos de permissões"
    local services=()
    if [[ -n "${ONLY_SERVICE}" ]]; then
      services=("${ONLY_SERVICE}")
    else
      mapfile -t services < <(discover_catalog_services)
    fi
    for svc in "${services[@]}"; do
      register_catalog "${svc}"
    done
  else
    log_warn "Etapa 1/3 pulada (--skip-catalogs)"
  fi

  # Se --service foi usado, paramos por aqui (só registrou um catálogo).
  if [[ -n "${ONLY_SERVICE}" ]]; then
    log_info "Modo --service ${ONLY_SERVICE}: papéis e atribuições foram pulados."
    return 0
  fi

  # Etapa 2: papéis
  if [[ "${SKIP_ROLES}" -eq 0 ]]; then
    process_roles
  else
    log_warn "Etapa 2/3 pulada (--skip-roles)"
  fi

  # Etapa 3: atribuições
  if [[ "${SKIP_ASSIGNMENTS}" -eq 0 ]]; then
    process_assignments
  else
    log_warn "Etapa 3/3 pulada (--skip-assignments)"
  fi

  log_head "Concluído."
}

main "$@"
