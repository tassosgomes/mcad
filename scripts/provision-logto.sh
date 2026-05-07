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

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"

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

ROLES = [
    ("analista-cadastro",      "Analista de Cadastro (leitura + escrita)"),
    ("analista-identificacao", "Analista de Identificação (leitura + escrita)"),
    ("analista-arrecadacao",   "Analista de Arrecadação (leitura + escrita)"),
    ("analista-distribuicao",  "Analista de Distribuição (leitura + escrita)"),
    ("consultor",              "Consultor (somente leitura)"),
    ("consultor-identificacao", "Consultor de Identificação (somente leitura)"),
    ("consultor-arrecadacao",  "Consultor de Arrecadação (somente leitura)"),
    ("consultor-distribuicao", "Consultor de Distribuição (somente leitura)"),
]

USERS = [
    {"username": "analista_cadastro",      "name": "Analista Cadastro",       "password": "Analista123!", "role": "analista-cadastro"},
    {"username": "analista_identificacao", "name": "Analista Identificacao",  "password": "Analista123!", "role": "analista-identificacao"},
    {"username": "analista_arrecadacao",   "name": "Analista Arrecadacao",    "password": "Analista123!", "role": "analista-arrecadacao"},
    {"username": "analista_distribuicao",  "name": "Analista Distribuicao",   "password": "Analista123!", "role": "analista-distribuicao"},
    {"username": "consultor_geral",        "name": "Consultor Geral",         "password": "bbd8n_tW", "role": "consultor"},
    {"username": "consultor_identificacao", "name": "Consultor Identificacao", "password": "Consultor123!", "role": "consultor-identificacao"},
    {"username": "consultor_arrecadacao",  "name": "Consultor Arrecadacao",   "password": "Consultor123!", "role": "consultor-arrecadacao"},
    {"username": "consultor_distribuicao", "name": "Consultor Distribuicao",  "password": "Consultor123!", "role": "consultor-distribuicao"},
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

def ensure_api_resource(token: str) -> str:
    """Cria ou retorna o API Resource com scopes 'access' e 'write'. Retorna o resource id."""
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

    # Garante scopes 'access' e 'write' no resource
    existing_scopes = api("GET", f"/resources/{resource_id}/scopes", token) or []
    existing_scope_names = {s["name"]: s["id"] for s in existing_scopes}
    scope_ids = {}
    for scope_name, scope_desc in [("access", "Acesso de leitura às APIs mcad"), ("write", "Operações de escrita nas APIs mcad")]:
        if scope_name in existing_scope_names:
            scope_ids[scope_name] = existing_scope_names[scope_name]
            print(f"  Scope '{scope_name}' já existe")
        else:
            created = api("POST", f"/resources/{resource_id}/scopes", token, {"name": scope_name, "description": scope_desc})
            scope_ids[scope_name] = created["id"]
            print(f"  Scope '{scope_name}' criado (id={scope_ids[scope_name]})")

    return resource_id, scope_ids


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


def ensure_role(token: str, name: str, description: str, scope_ids_to_assign: list[str]) -> str:
    """Cria ou retorna uma role e garante os scopes atribuídos. Retorna o id."""
    roles = api("GET", f"/roles?search={urllib.parse.quote(name)}&limit=20", token) or []
    existing = next((r for r in roles if r.get("name") == name), None)
    if existing:
        print(f"  Role já existe: {name}")
        role_id = existing["id"]
    else:
        created = api("POST", "/roles", token, {
            "name": name,
            "description": description,
            "type": "User",
        })
        role_id = created["id"]
        print(f"  Role criada: {name}")

    # Garante que os scopes estão atribuídos à role
    current_scopes = api("GET", f"/roles/{role_id}/scopes", token) or []
    current_scope_ids = {s["id"] for s in current_scopes}
    missing = [sid for sid in scope_ids_to_assign if sid not in current_scope_ids]
    if missing:
        api("POST", f"/roles/{role_id}/scopes", token, {"scopeIds": missing})
        print(f"    Scopes atribuídos à role {name}")

    return role_id


def ensure_user(token: str, username: str, name: str, password: str, role_id: str) -> None:
    """Cria ou atualiza usuário e garante a role atribuída."""
    users = api("GET", f"/users?search={urllib.parse.quote(username)}&limit=20", token) or []
    existing = next((u for u in users if u.get("username") == username), None)

    if existing:
        user_id = existing["id"]
        print(f"  Usuário já existe: {username}")
    else:
        first, *rest = name.split(" ", 1)
        last = rest[0] if rest else ""
        created = api("POST", "/users", token, {
            "username": username,
            "name": name,
            "primaryEmail": f"{username.replace('.', '_')}@mcad.dev",
            "password": password,
        })
        user_id = created["id"]
        print(f"  Usuário criado: {username} (id={user_id})")

    # Verifica roles já atribuídas
    current_roles = api("GET", f"/users/{user_id}/roles", token) or []
    if any(r.get("id") == role_id for r in current_roles):
        return

    api("POST", f"/users/{user_id}/roles", token, {"roleIds": [role_id]})
    print(f"    Role atribuída ao usuário {username}")


# ── Main ──────────────────────────────────────────────────────────────────────

print("\n[1/5] Obtendo token M2M...")
token = get_token()
print("  Token obtido com sucesso.")

print("\n[2/5] Garantindo API Resource e scopes...")
resource_id, scope_ids = ensure_api_resource(token)
# Roles de analista recebem access + write; consultores recebem apenas access
ANALISTA_ROLE_NAMES = {"analista-cadastro", "analista-identificacao", "analista-arrecadacao", "analista-distribuicao"}

print("\n[3/5] Garantindo aplicação SPA frontend...")
frontend_app_id = ensure_frontend_app(token)

print("\n[4/5] Garantindo roles...")
role_ids = {}
for role_name, role_desc in ROLES:
    scopes = [scope_ids["access"], scope_ids["write"]] if role_name in ANALISTA_ROLE_NAMES else [scope_ids["access"]]
    role_ids[role_name] = ensure_role(token, role_name, role_desc, scopes)

print("\n[5/5] Garantindo usuários de teste...")
for user in USERS:
    ensure_user(token, user["username"], user["name"], user["password"], role_ids[user["role"]])

print("\n✓ Provisionamento concluído.")
print(json.dumps({
    "oidcAuthority": f"{base_url}/oidc",
    "apiResourceIndicator": API_RESOURCE_INDICATOR,
    "frontendAppId": frontend_app_id,
    "roles": list(role_ids.keys()),
    "users": [u["username"] for u in USERS],
}, indent=2))
PY
