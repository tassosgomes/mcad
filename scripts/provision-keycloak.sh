#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Environment file not found: $ENV_FILE" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

: "${KEY_CLOAK_HOST:?KEY_CLOAK_HOST is required}"
: "${KEY_CLOAK_USER:?KEY_CLOAK_USER is required}"
: "${KEY_CLOAK_PASS:?KEY_CLOAK_PASS is required}"

export KEYCLOAK_BASE_URL="${KEY_CLOAK_HOST%/}"
export KEYCLOAK_ADMIN_USERNAME="$KEY_CLOAK_USER"
export KEYCLOAK_ADMIN_PASSWORD="$KEY_CLOAK_PASS"
export TARGET_REALM="${KEY_CLOAK_REALM:-mcad}"
export CLIENT_ID="${KEYCLOAK_CLIENT_ID:-mcad-frontend}"
export DIRECT_CLIENT_ID="${KEYCLOAK_DIRECT_CLIENT_ID:-mcad-cli}"
export ANALISTA_USERNAME="${KEYCLOAK_ANALISTA_USERNAME:-analista.teste}"
export ANALISTA_EMAIL="${KEYCLOAK_ANALISTA_EMAIL:-analista@mcad.dev}"
export ANALISTA_FIRST_NAME="${KEYCLOAK_ANALISTA_FIRST_NAME:-Analista}"
export ANALISTA_LAST_NAME="${KEYCLOAK_ANALISTA_LAST_NAME:-Teste}"
export ANALISTA_PASSWORD="${KEYCLOAK_ANALISTA_PASSWORD:-Analista123!}"
export ANALISTA_IDENT_USERNAME="${KEYCLOAK_ANALISTA_IDENT_USERNAME:-analista.ident}"
export ANALISTA_IDENT_EMAIL="${KEYCLOAK_ANALISTA_IDENT_EMAIL:-analista.ident@mcad.dev}"
export ANALISTA_IDENT_FIRST_NAME="${KEYCLOAK_ANALISTA_IDENT_FIRST_NAME:-Analista}"
export ANALISTA_IDENT_LAST_NAME="${KEYCLOAK_ANALISTA_IDENT_LAST_NAME:-Identificacao}"
export ANALISTA_IDENT_PASSWORD="${KEYCLOAK_ANALISTA_IDENT_PASSWORD:-Analista123!}"
export ANALISTA_ARRECADACAO_USERNAME="${KEYCLOAK_ANALISTA_ARRECADACAO_USERNAME:-analista.arrec}"
export ANALISTA_ARRECADACAO_EMAIL="${KEYCLOAK_ANALISTA_ARRECADACAO_EMAIL:-analista.arrec@mcad.dev}"
export ANALISTA_ARRECADACAO_FIRST_NAME="${KEYCLOAK_ANALISTA_ARRECADACAO_FIRST_NAME:-Analista}"
export ANALISTA_ARRECADACAO_LAST_NAME="${KEYCLOAK_ANALISTA_ARRECADACAO_LAST_NAME:-Arrecadacao}"
export ANALISTA_ARRECADACAO_PASSWORD="${KEYCLOAK_ANALISTA_ARRECADACAO_PASSWORD:-Analista123!}"
export ANALISTA_DISTRIBUICAO_USERNAME="${KEYCLOAK_ANALISTA_DISTRIBUICAO_USERNAME:-analista.distrib}"
export ANALISTA_DISTRIBUICAO_EMAIL="${KEYCLOAK_ANALISTA_DISTRIBUICAO_EMAIL:-analista.distrib@mcad.dev}"
export ANALISTA_DISTRIBUICAO_FIRST_NAME="${KEYCLOAK_ANALISTA_DISTRIBUICAO_FIRST_NAME:-Analista}"
export ANALISTA_DISTRIBUICAO_LAST_NAME="${KEYCLOAK_ANALISTA_DISTRIBUICAO_LAST_NAME:-Distribuicao}"
export ANALISTA_DISTRIBUICAO_PASSWORD="${KEYCLOAK_ANALISTA_DISTRIBUICAO_PASSWORD:-Analista123!}"
export CONSULTOR_USERNAME="${KEYCLOAK_CONSULTOR_USERNAME:-consultor.teste}"
export CONSULTOR_EMAIL="${KEYCLOAK_CONSULTOR_EMAIL:-consultor@mcad.dev}"
export CONSULTOR_FIRST_NAME="${KEYCLOAK_CONSULTOR_FIRST_NAME:-Consultor}"
export CONSULTOR_LAST_NAME="${KEYCLOAK_CONSULTOR_LAST_NAME:-Teste}"
export CONSULTOR_PASSWORD="${KEYCLOAK_CONSULTOR_PASSWORD:-Consultor123!}"
export CONSULTOR_ARRECADACAO_USERNAME="${KEYCLOAK_CONSULTOR_ARRECADACAO_USERNAME:-consultor.arrec}"
export CONSULTOR_ARRECADACAO_EMAIL="${KEYCLOAK_CONSULTOR_ARRECADACAO_EMAIL:-consultor.arrec@mcad.dev}"
export CONSULTOR_ARRECADACAO_FIRST_NAME="${KEYCLOAK_CONSULTOR_ARRECADACAO_FIRST_NAME:-Consultor}"
export CONSULTOR_ARRECADACAO_LAST_NAME="${KEYCLOAK_CONSULTOR_ARRECADACAO_LAST_NAME:-Arrecadacao}"
export CONSULTOR_ARRECADACAO_PASSWORD="${KEYCLOAK_CONSULTOR_ARRECADACAO_PASSWORD:-Consultor123!}"
export CONSULTOR_DISTRIBUICAO_USERNAME="${KEYCLOAK_CONSULTOR_DISTRIBUICAO_USERNAME:-consultor.distrib}"
export CONSULTOR_DISTRIBUICAO_EMAIL="${KEYCLOAK_CONSULTOR_DISTRIBUICAO_EMAIL:-consultor.distrib@mcad.dev}"
export CONSULTOR_DISTRIBUICAO_FIRST_NAME="${KEYCLOAK_CONSULTOR_DISTRIBUICAO_FIRST_NAME:-Consultor}"
export CONSULTOR_DISTRIBUICAO_LAST_NAME="${KEYCLOAK_CONSULTOR_DISTRIBUICAO_LAST_NAME:-Distribuicao}"
export CONSULTOR_DISTRIBUICAO_PASSWORD="${KEYCLOAK_CONSULTOR_DISTRIBUICAO_PASSWORD:-Consultor123!}"

python3 - <<'PY'
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

base_url = os.environ["KEYCLOAK_BASE_URL"]
admin_username = os.environ["KEYCLOAK_ADMIN_USERNAME"]
admin_password = os.environ["KEYCLOAK_ADMIN_PASSWORD"]
realm_name = os.environ["TARGET_REALM"]
client_id = os.environ["CLIENT_ID"]


def post_form(url: str, data: dict[str, str]) -> dict:
    body = urllib.parse.urlencode(data).encode()
    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode())


def request_json(method: str, path: str, token: str, payload: dict | list | None = None) -> dict | list | None:
    url = f"{base_url}{path}"
    headers = {"Authorization": f"Bearer {token}"}
    data = None
    if payload is not None:
        data = json.dumps(payload).encode()
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read().decode()
            if not body:
                return None
            return json.loads(body)
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        error_body = exc.read().decode()
        raise RuntimeError(f"{method} {path} failed: {exc.code} {error_body}") from exc


def ensure_realm(token: str) -> None:
    realm = request_json("GET", f"/admin/realms/{realm_name}", token)
    if realm is not None:
        return

    request_json(
        "POST",
        "/admin/realms",
        token,
        {
            "realm": realm_name,
            "enabled": True,
            "displayName": "mini-ECAD",
            "registrationAllowed": False,
            "loginWithEmailAllowed": True,
            "duplicateEmailsAllowed": False,
            "resetPasswordAllowed": True,
        },
    )


def ensure_role(token: str, role_name: str, description: str) -> None:
    role = request_json("GET", f"/admin/realms/{realm_name}/roles/{urllib.parse.quote(role_name, safe='')}", token)
    if role is not None:
        return

    request_json(
        "POST",
        f"/admin/realms/{realm_name}/roles",
        token,
        {"name": role_name, "description": description},
    )


def ensure_client(token: str) -> dict:
    existing = request_json(
        "GET",
        f"/admin/realms/{realm_name}/clients?clientId={urllib.parse.quote(client_id)}",
        token,
    )
    if existing:
        client = existing[0]
        request_json(
            "PUT",
            f"/admin/realms/{realm_name}/clients/{client['id']}",
            token,
            {
                **client,
                "enabled": True,
                "publicClient": True,
                "standardFlowEnabled": True,
                "directAccessGrantsEnabled": False,
                "serviceAccountsEnabled": False,
                "redirectUris": ["http://localhost:5173/*"],
                "webOrigins": ["http://localhost:5173"],
                "attributes": {
                    **client.get("attributes", {}),
                    "pkce.code.challenge.method": "S256",
                    "post.logout.redirect.uris": "http://localhost:5173/*",
                },
            },
        )
        return request_json("GET", f"/admin/realms/{realm_name}/clients/{client['id']}", token)

    request_json(
        "POST",
        f"/admin/realms/{realm_name}/clients",
        token,
        {
            "clientId": client_id,
            "name": "mcad-frontend",
            "enabled": True,
            "protocol": "openid-connect",
            "publicClient": True,
            "standardFlowEnabled": True,
            "directAccessGrantsEnabled": False,
            "serviceAccountsEnabled": False,
            "redirectUris": ["http://localhost:5173/*"],
            "webOrigins": ["http://localhost:5173"],
            "attributes": {
                "pkce.code.challenge.method": "S256",
                "post.logout.redirect.uris": "http://localhost:5173/*",
            },
        },
    )
    created = request_json(
        "GET",
        f"/admin/realms/{realm_name}/clients?clientId={urllib.parse.quote(client_id)}",
        token,
    )
    return created[0]


def ensure_direct_access_client(token: str) -> dict:
    existing = request_json(
        "GET",
        f"/admin/realms/{realm_name}/clients?clientId={urllib.parse.quote(os.environ['DIRECT_CLIENT_ID'])}",
        token,
    )
    if existing:
        client = existing[0]
        request_json(
            "PUT",
            f"/admin/realms/{realm_name}/clients/{client['id']}",
            token,
            {
                **client,
                "enabled": True,
                "publicClient": True,
                "standardFlowEnabled": False,
                "directAccessGrantsEnabled": True,
                "serviceAccountsEnabled": False,
                "redirectUris": [],
                "webOrigins": [],
            },
        )
        return request_json("GET", f"/admin/realms/{realm_name}/clients/{client['id']}", token)

    request_json(
        "POST",
        f"/admin/realms/{realm_name}/clients",
        token,
        {
            "clientId": os.environ["DIRECT_CLIENT_ID"],
            "name": "mcad-cli",
            "enabled": True,
            "protocol": "openid-connect",
            "publicClient": True,
            "standardFlowEnabled": False,
            "directAccessGrantsEnabled": True,
            "serviceAccountsEnabled": False,
            "redirectUris": [],
            "webOrigins": [],
        },
    )
    created = request_json(
        "GET",
        f"/admin/realms/{realm_name}/clients?clientId={urllib.parse.quote(os.environ['DIRECT_CLIENT_ID'])}",
        token,
    )
    return created[0]


def ensure_audience_mapper(token: str, client_internal_id: str, target_audience: str) -> None:
    mapper_name = f"audience-{target_audience}"
    mappers = request_json(
        "GET",
        f"/admin/realms/{realm_name}/clients/{client_internal_id}/protocol-mappers/models",
        token,
    ) or []
    if any(m.get("name") == mapper_name for m in mappers):
        return

    request_json(
        "POST",
        f"/admin/realms/{realm_name}/clients/{client_internal_id}/protocol-mappers/models",
        token,
        {
            "name": mapper_name,
            "protocol": "openid-connect",
            "protocolMapper": "oidc-audience-mapper",
            "config": {
                "included.client.audience": target_audience,
                "id.token.claim": "false",
                "access.token.claim": "true",
            },
        },
    )


def ensure_user(token: str, username: str, email: str, first_name: str, last_name: str, password: str, role_name: str) -> None:
    users = request_json(
        "GET",
        f"/admin/realms/{realm_name}/users?username={urllib.parse.quote(username)}",
        token,
    )
    if users:
        user = users[0]
        user_id = user["id"]
        request_json(
            "PUT",
            f"/admin/realms/{realm_name}/users/{user_id}",
            token,
            {
                "id": user_id,
                "username": username,
                "email": email,
                "firstName": first_name,
                "lastName": last_name,
                "enabled": True,
                "emailVerified": True,
            },
        )
    else:
        request_json(
            "POST",
            f"/admin/realms/{realm_name}/users",
            token,
            {
                "username": username,
                "email": email,
                "firstName": first_name,
                "lastName": last_name,
                "enabled": True,
                "emailVerified": True,
            },
        )
        users = request_json(
            "GET",
            f"/admin/realms/{realm_name}/users?username={urllib.parse.quote(username)}",
            token,
        )
        user = users[0]
        user_id = user["id"]

    request_json(
        "PUT",
        f"/admin/realms/{realm_name}/users/{user_id}/reset-password",
        token,
        {
            "type": "password",
            "temporary": False,
            "value": password,
        },
    )

    role = request_json("GET", f"/admin/realms/{realm_name}/roles/{urllib.parse.quote(role_name, safe='')}", token)
    current_roles = request_json("GET", f"/admin/realms/{realm_name}/users/{user_id}/role-mappings/realm", token) or []
    if not any(current_role.get("name") == role_name for current_role in current_roles):
        request_json(
            "POST",
            f"/admin/realms/{realm_name}/users/{user_id}/role-mappings/realm",
            token,
            [{"id": role["id"], "name": role["name"]}],
        )


admin_token = post_form(
    f"{base_url}/realms/master/protocol/openid-connect/token",
    {
        "client_id": "admin-cli",
        "username": admin_username,
        "password": admin_password,
        "grant_type": "password",
    },
)["access_token"]

ensure_realm(admin_token)
ensure_role(admin_token, "analista-cadastro", "Analista de Cadastro (leitura + escrita)")
ensure_role(admin_token, "analista-identificacao", "Analista de Identificação (leitura + escrita)")
ensure_role(admin_token, "analista-arrecadacao", "Analista de Arrecadação (leitura + escrita)")
ensure_role(admin_token, "analista-distribuicao", "Analista de Distribuição (leitura + escrita)")
ensure_role(admin_token, "consultor", "Consultor (somente leitura)")
ensure_role(admin_token, "consultor-arrecadacao", "Consultor de Arrecadação (somente leitura)")
ensure_role(admin_token, "consultor-distribuicao", "Consultor de Distribuição (somente leitura)")
frontend_client = ensure_client(admin_token)
ensure_audience_mapper(admin_token, frontend_client["id"], client_id)
direct_client = ensure_direct_access_client(admin_token)
ensure_audience_mapper(admin_token, direct_client["id"], client_id)
ensure_user(
    admin_token,
    os.environ["ANALISTA_USERNAME"],
    os.environ["ANALISTA_EMAIL"],
    os.environ["ANALISTA_FIRST_NAME"],
    os.environ["ANALISTA_LAST_NAME"],
    os.environ["ANALISTA_PASSWORD"],
    "analista-cadastro",
)
ensure_user(
    admin_token,
    os.environ["CONSULTOR_USERNAME"],
    os.environ["CONSULTOR_EMAIL"],
    os.environ["CONSULTOR_FIRST_NAME"],
    os.environ["CONSULTOR_LAST_NAME"],
    os.environ["CONSULTOR_PASSWORD"],
    "consultor",
)
ensure_user(
    admin_token,
    os.environ["ANALISTA_IDENT_USERNAME"],
    os.environ["ANALISTA_IDENT_EMAIL"],
    os.environ["ANALISTA_IDENT_FIRST_NAME"],
    os.environ["ANALISTA_IDENT_LAST_NAME"],
    os.environ["ANALISTA_IDENT_PASSWORD"],
    "analista-identificacao",
)
ensure_user(
    admin_token,
    os.environ["ANALISTA_ARRECADACAO_USERNAME"],
    os.environ["ANALISTA_ARRECADACAO_EMAIL"],
    os.environ["ANALISTA_ARRECADACAO_FIRST_NAME"],
    os.environ["ANALISTA_ARRECADACAO_LAST_NAME"],
    os.environ["ANALISTA_ARRECADACAO_PASSWORD"],
    "analista-arrecadacao",
)
ensure_user(
    admin_token,
    os.environ["ANALISTA_DISTRIBUICAO_USERNAME"],
    os.environ["ANALISTA_DISTRIBUICAO_EMAIL"],
    os.environ["ANALISTA_DISTRIBUICAO_FIRST_NAME"],
    os.environ["ANALISTA_DISTRIBUICAO_LAST_NAME"],
    os.environ["ANALISTA_DISTRIBUICAO_PASSWORD"],
    "analista-distribuicao",
)
ensure_user(
    admin_token,
    os.environ["CONSULTOR_ARRECADACAO_USERNAME"],
    os.environ["CONSULTOR_ARRECADACAO_EMAIL"],
    os.environ["CONSULTOR_ARRECADACAO_FIRST_NAME"],
    os.environ["CONSULTOR_ARRECADACAO_LAST_NAME"],
    os.environ["CONSULTOR_ARRECADACAO_PASSWORD"],
    "consultor-arrecadacao",
)
ensure_user(
    admin_token,
    os.environ["CONSULTOR_DISTRIBUICAO_USERNAME"],
    os.environ["CONSULTOR_DISTRIBUICAO_EMAIL"],
    os.environ["CONSULTOR_DISTRIBUICAO_FIRST_NAME"],
    os.environ["CONSULTOR_DISTRIBUICAO_LAST_NAME"],
    os.environ["CONSULTOR_DISTRIBUICAO_PASSWORD"],
    "consultor-distribuicao",
)

print(json.dumps(
    {
        "realm": realm_name,
        "clientId": client_id,
        "directClientId": os.environ["DIRECT_CLIENT_ID"],
        "analistaUser": os.environ["ANALISTA_USERNAME"],
        "analistaIdentUser": os.environ["ANALISTA_IDENT_USERNAME"],
        "analistaArrecadacaoUser": os.environ["ANALISTA_ARRECADACAO_USERNAME"],
        "analistaDistribuicaoUser": os.environ["ANALISTA_DISTRIBUICAO_USERNAME"],
        "consultorUser": os.environ["CONSULTOR_USERNAME"],
        "consultorArrecadacaoUser": os.environ["CONSULTOR_ARRECADACAO_USERNAME"],
        "consultorDistribuicaoUser": os.environ["CONSULTOR_DISTRIBUICAO_USERNAME"],
    },
    indent=2,
))
PY
