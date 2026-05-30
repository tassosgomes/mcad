#!/usr/bin/env bash
# provision-logto.sh — Provisiona o tenant Logto Cloud do mcad via Management API.
# Idempotente: pode ser rodado múltiplas vezes sem efeitos colaterais.
#
# Pré-requisitos:
#   - python3 disponível no PATH
#   - .env com LOGTO_M2M_CLIENT_ID, LOGTO_M2M_CLIENT_SECRET, LOGTO_MANAGEMENT_API
#   - App M2M criada no Console com role "all" na Logto Management API
#
# Uso:
#   ./scripts/provision-logto.sh
#   ./scripts/provision-logto.sh --check-no-business-roles

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'EOF'
Uso:
  ./scripts/provision-logto.sh
  ./scripts/provision-logto.sh --check-no-business-roles

Provisiona somente autenticação/OIDC no Logto:
  - API Resource/audience;
  - aplicação SPA;
  - usuários de teste.

Assignments de negócio devem ser aplicados no ecad-authz via:
  ./scripts/seed-authz.sh
EOF
  exit 0
fi

if [[ "${1:-}" == "--check-no-business-roles" ]]; then
  if [[ "$#" -ne 1 ]]; then
    echo "Uso: $0 --check-no-business-roles" >&2
    exit 2
  fi

  python3 - "$0" <<'PY'
import ast
import re
import sys
from pathlib import Path

script_path = Path(sys.argv[1])
source = script_path.read_text(encoding="utf-8")
marker = "python3 - <<'PY'\n"
try:
    start = source.index(marker) + len(marker)
    end = source.rindex("\nPY")
except ValueError as exc:
    raise SystemExit(f"Não foi possível localizar o bloco Python em {script_path}") from exc

tree = ast.parse(source[start:end], filename=str(script_path))
violations = []

def read_string(node):
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    if isinstance(node, ast.JoinedStr):
        return "".join(
            part.value if isinstance(part, ast.Constant) and isinstance(part.value, str) else "{}"
            for part in node.values
        )
    return None

def is_forbidden_logto_path(method, path):
    if re.match(r"^/roles(?:[/?#]|$)", path) is not None:
        return True
    if re.match(r"^/users/[^/]+/roles(?:[/?#]|$)", path) is not None:
        return True
    if path.startswith("/configs/jwt-customizer"):
        return method != "DELETE" or path != "/configs/jwt-customizer/access-token"
    return False

for node in ast.walk(tree):
    if not isinstance(node, ast.Call):
        continue
    if not isinstance(node.func, ast.Name) or node.func.id != "api":
        continue
    if len(node.args) < 2:
        continue
    method = read_string(node.args[0]) or "<dynamic>"
    path = read_string(node.args[1])
    if path and is_forbidden_logto_path(method, path):
        violations.append(f"linha {node.lineno}: api({method!r}, {path!r}, ...)")

if violations:
    print("Provisionamento Logto contém chamadas proibidas de roles/customizer:", file=sys.stderr)
    for violation in violations:
        print(f"  - {violation}", file=sys.stderr)
    raise SystemExit(1)

print("OK: provision-logto.sh não provisiona roles/user roles nem cria/atualiza JWT customizer.")
PY
  exit 0
fi

if [[ "$#" -gt 0 ]]; then
  echo "Argumento desconhecido: $1" >&2
  echo "Use --help para ver opções." >&2
  exit 2
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Arquivo de environment não encontrado: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

: "${LOGTO_M2M_CLIENT_ID:?LOGTO_M2M_CLIENT_ID é obrigatório}"
: "${LOGTO_M2M_CLIENT_SECRET:?LOGTO_M2M_CLIENT_SECRET é obrigatório}"
: "${LOGTO_MANAGEMENT_API:?LOGTO_MANAGEMENT_API é obrigatório}"

# Deriva a base OIDC do tenant a partir de LOGTO_MANAGEMENT_API
# Ex: https://9lcinu.logto.app/api → https://9lcinu.logto.app/oidc
export LOGTO_BASE_URL="${LOGTO_MANAGEMENT_API%/api}"

python3 - <<'PY'
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

base_url      = os.environ["LOGTO_BASE_URL"]
api_url       = os.environ["LOGTO_MANAGEMENT_API"].rstrip("/")
client_id     = os.environ["LOGTO_M2M_CLIENT_ID"]
client_secret = os.environ["LOGTO_M2M_CLIENT_SECRET"]

FRONTEND_APP_NAME = "mcad-frontend"
API_RESOURCE_NAME = "mcad-apis"
API_RESOURCE_INDICATOR = "https://api.mcad.local"

USERS = [
    {"username": "analista_cadastro",       "name": "Analista Cadastro",       "email": "analista_cadastro@mcad.dev",       "password": "Analista123!"},
    {"username": "analista_identificacao",  "name": "Analista Identificacao",  "email": "analista_identificacao@mcad.dev",  "password": "Analista123!"},
    {"username": "analista_arrecadacao",    "name": "Analista Arrecadacao",    "email": "analista_arrecadacao@mcad.dev",    "password": "Analista123!"},
    {"username": "analista_distribuicao",   "name": "Analista Distribuicao",   "email": "analista_distribuicao@mcad.dev",   "password": "Analista123!"},
    {"username": "consultor_geral",         "name": "Consultor Geral",         "email": "consultor_geral@mcad.dev",         "password": "bbd8n_tW"},
    {"username": "consultor_identificacao", "name": "Consultor Identificacao", "email": "consultor_identificacao@mcad.dev", "password": "Consultor123!"},
    {"username": "consultor_arrecadacao",   "name": "Consultor Arrecadacao",   "email": "consultor_arrecadacao@mcad.dev",   "password": "Consultor123!"},
    {"username": "consultor_distribuicao",  "name": "Consultor Distribuicao",  "email": "consultor_distribuicao@mcad.dev",  "password": "Consultor123!"},
    {"username": "sem_papel",               "name": "Sem Papel",              "email": "sem_papel@mcad.dev",               "password": "SemPapel123!"},
]


def unique(values):
    return list(dict.fromkeys(values))


def build_frontend_redirect_uris() -> tuple[list[str], list[str]]:
    redirect_uris = ["http://localhost:5173/callback"]
    configured_redirect_uri = os.environ.get("OIDC_REDIRECT_URI")
    if configured_redirect_uri:
        redirect_uris.append(configured_redirect_uri)

    post_logout_redirect_uris = ["http://localhost:5173/logout"]
    configured_post_logout_redirect_uri = os.environ.get("OIDC_POST_LOGOUT_REDIRECT_URI")
    if configured_post_logout_redirect_uri:
        post_logout_redirect_uris.append(configured_post_logout_redirect_uri)
        parsed = urllib.parse.urlparse(configured_post_logout_redirect_uri)
        if parsed.path in ("", "/") and not parsed.query and not parsed.fragment:
            logout_path_uri = parsed._replace(path="/logout").geturl()
            post_logout_redirect_uris.append(logout_path_uri)

    return unique(redirect_uris), unique(post_logout_redirect_uris)


FRONTEND_REDIRECT_URIS, FRONTEND_POST_LOGOUT_REDIRECT_URIS = build_frontend_redirect_uris()


# ── HTTP helpers ──────────────────────────────────────────────────────────────

def post_form(url: str, data: dict) -> dict:
    body = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(
        url, data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def api(method: str, path: str, token: str, payload=None):
    assert_authentication_only_path(method, path)
    url = f"{api_url}{path}"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            body = r.read().decode()
            return json.loads(body) if body else None
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        raise RuntimeError(f"{method} {path} → {exc.code}: {exc.read().decode()}") from exc


def assert_authentication_only_path(method: str, path: str) -> None:
    uses_logto_roles = (
        re.match(r"^/roles(?:[/?#]|$)", path) is not None
        or re.match(r"^/users/[^/]+/roles(?:[/?#]|$)", path) is not None
    )
    mutates_jwt_customizer = path.startswith("/configs/jwt-customizer") and (
        method != "DELETE" or path != "/configs/jwt-customizer/access-token"
    )
    if uses_logto_roles or mutates_jwt_customizer:
        raise RuntimeError(
            f"Chamada Logto proibida em provisionamento authentication-only: {method} {path}"
        )


def get_token() -> str:
    return post_form(
        f"{base_url}/oidc/token",
        {
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
            "resource": api_url,   # Management API resource indicator
            "scope": "all",
        },
    )["access_token"]


# ── Provisioning helpers ──────────────────────────────────────────────────────

def ensure_api_resource(token: str) -> tuple[str, list[str]]:
    """Cria ou retorna o API Resource e o scope técnico mínimo para emissão de audience."""
    resources = api("GET", "/resources", token) or []
    existing = next((r for r in resources if r.get("indicator") == API_RESOURCE_INDICATOR), None)
    if existing:
        print(f"  API Resource já existe: {API_RESOURCE_INDICATOR}")
        resource_id = existing["id"]
    else:
        created = api("POST", "/resources", token, {
            "name": API_RESOURCE_NAME,
            "indicator": API_RESOURCE_INDICATOR,
        })
        resource_id = created["id"]
        print(f"  API Resource criado: {API_RESOURCE_INDICATOR} (id={resource_id})")

    # Scope técnico mínimo. Papéis/permissões de negócio ficam no ecad-authz.
    existing_scopes = api("GET", f"/resources/{resource_id}/scopes", token) or []
    existing_scope_names = {s["name"]: s["id"] for s in existing_scopes}
    ensured_scopes = []
    for scope_name, scope_desc in [("access", "Emissão de access token para APIs mcad")]:
        if scope_name in existing_scope_names:
            ensured_scopes.append(scope_name)
            print(f"  Scope '{scope_name}' já existe")
        else:
            api("POST", f"/resources/{resource_id}/scopes", token, {"name": scope_name, "description": scope_desc})
            ensured_scopes.append(scope_name)
            print(f"  Scope '{scope_name}' criado")

    return resource_id, ensured_scopes


def ensure_frontend_app(token: str) -> str:
    """Cria ou retorna a aplicação SPA mcad-frontend. Retorna o appId."""
    apps = api("GET", "/applications", token) or []
    existing = next((a for a in apps if a.get("name") == FRONTEND_APP_NAME), None)
    if existing:
        metadata = existing.get("oidcClientMetadata") or {}
        redirect_uris = unique((metadata.get("redirectUris") or []) + FRONTEND_REDIRECT_URIS)
        post_logout_redirect_uris = unique(
            (metadata.get("postLogoutRedirectUris") or []) + FRONTEND_POST_LOGOUT_REDIRECT_URIS
        )

        if redirect_uris != (metadata.get("redirectUris") or []) or post_logout_redirect_uris != (metadata.get("postLogoutRedirectUris") or []):
            api("PATCH", f"/applications/{existing['id']}", token, {
                "oidcClientMetadata": {
                    **metadata,
                    "redirectUris": redirect_uris,
                    "postLogoutRedirectUris": post_logout_redirect_uris,
                },
            })
            print(f"  App SPA atualizada: {FRONTEND_APP_NAME} (appId={existing['id']})")
        else:
            print(f"  App SPA já existe: {FRONTEND_APP_NAME} (appId={existing['id']})")

        return existing["id"]

    created = api("POST", "/applications", token, {
        "name": FRONTEND_APP_NAME,
        "type": "SPA",
        "description": "Frontend React do mcad (PKCE/Authorization Code)",
        "oidcClientMetadata": {
            "redirectUris": FRONTEND_REDIRECT_URIS,
            "postLogoutRedirectUris": FRONTEND_POST_LOGOUT_REDIRECT_URIS,
        },
    })
    print(f"  App SPA criada: {FRONTEND_APP_NAME} (appId={created['id']})")
    return created["id"]


def ensure_user(token: str, username: str, name: str, email: str, password: str) -> dict:
    """Cria ou retorna usuário de teste, sem atribuição de papéis no Logto."""
    users = api("GET", f"/users?search={urllib.parse.quote(username)}&limit=20", token) or []
    existing = next((u for u in users if u.get("username") == username), None)

    if existing:
        user_id = existing["id"]
        print(f"  Usuário já existe: {username}")
        return {"id": user_id, "username": username, "email": existing.get("primaryEmail") or email}
    else:
        created = api("POST", "/users", token, {
            "username": username,
            "name": name,
            "primaryEmail": email,
            "password": password,
        })
        user_id = created["id"]
        print(f"  Usuário criado: {username} (id={user_id})")
        return {"id": user_id, "username": username, "email": email}


def remove_legacy_access_token_customizer(token: str) -> None:
    """Remove customizer legado que injetava roles no access token, se existir."""
    api("DELETE", "/configs/jwt-customizer/access-token", token)
    print("  JWT customizer de access token removido ou ausente")


# ── Main ──────────────────────────────────────────────────────────────────────

print("\n[1/5] Obtendo token M2M...")
token = get_token()
print("  Token obtido com sucesso.")

print("\n[2/5] Garantindo API Resource e audience...")
resource_id, ensured_scopes = ensure_api_resource(token)

print("\n[3/5] Garantindo aplicação SPA frontend...")
frontend_app_id = ensure_frontend_app(token)

print("\n[4/5] Garantindo usuários de teste sem roles Logto...")
provisioned_users = []
for user in USERS:
    provisioned_users.append(ensure_user(token, user["username"], user["name"], user["email"], user["password"]))

print("\n[5/5] Removendo JWT customizer legado de roles, se existir...")
remove_legacy_access_token_customizer(token)

print("\n✓ Provisionamento concluído.")
print(json.dumps({
    "oidcAuthority": f"{base_url}/oidc",
    "apiResourceIndicator": API_RESOURCE_INDICATOR,
    "apiResourceId": resource_id,
    "apiResourceScopesEnsured": ensured_scopes,
    "frontendAppId": frontend_app_id,
    "users": provisioned_users,
    "legacyAccessTokenCustomizer": "removed-or-absent",
    "businessAssignments": "not managed in Logto; run scripts/seed-authz.sh for seeds/mcad/assignments.json",
}, indent=2))
PY
