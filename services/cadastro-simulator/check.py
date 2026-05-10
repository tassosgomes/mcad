"""Sanity check do simulador.

Lê .env (mesmo formato do docker-compose), valida campos, tenta autenticar e
faz um GET /associacoes. Sai com código !=0 em qualquer falha.

Uso: python3 check.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import requests


def load_env(path: Path) -> dict[str, str]:
    if not path.exists():
        print(f"✗ .env não encontrado em {path}")
        sys.exit(2)
    env: dict[str, str] = {}
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        k, _, v = line.partition("=")
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def main() -> int:
    env_path = Path(__file__).parent / ".env"
    env = load_env(env_path)

    required = ["API_BASE_URL", "OIDC_AUTHORITY", "OIDC_RESOURCE", "OIDC_CLIENT_ID", "OIDC_CLIENT_SECRET"]
    missing = [k for k in required if not env.get(k)]
    if missing:
        print(f"✗ Variáveis obrigatórias ausentes: {', '.join(missing)}")
        return 2

    api_base = env["API_BASE_URL"].rstrip("/")
    authority = env["OIDC_AUTHORITY"].rstrip("/")
    resource = env["OIDC_RESOURCE"]
    client_id = env["OIDC_CLIENT_ID"]
    client_secret = env["OIDC_CLIENT_SECRET"]
    auth_mode = (env.get("AUTH_MODE") or "client_credentials").lower()
    refresh_token = env.get("INITIAL_REFRESH_TOKEN", "")

    print(f"→ AUTH_MODE = {auth_mode}")

    if auth_mode == "client_credentials":
        data = {
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
            "resource": resource,
            "scope": "access write",
        }
    elif auth_mode == "refresh_token":
        if not refresh_token:
            print("✗ AUTH_MODE=refresh_token mas INITIAL_REFRESH_TOKEN vazio")
            return 2
        data = {
            "grant_type": "refresh_token",
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "resource": resource,
            "scope": "access write offline_access",
        }
    else:
        print(f"✗ AUTH_MODE inválido: {auth_mode} (use client_credentials ou refresh_token)")
        return 2

    print(f"→ POST {authority}/token")
    r = requests.post(f"{authority}/token", data=data, timeout=30)
    if r.status_code != 200:
        print(f"✗ Auth falhou {r.status_code}: {r.text[:400]}")
        return 1
    token_data = r.json()
    access_token = token_data.get("access_token")
    if not access_token:
        print(f"✗ Resposta sem access_token: {token_data}")
        return 1
    scope = token_data.get("scope", "")
    print(f"✓ Token obtido. expires_in={token_data.get('expires_in')}s scope='{scope}'")
    if "access" not in scope.split() and "write" not in scope.split():
        print("⚠ scope esperado 'access write' não está no token — pode dar 401/403 nos endpoints.")

    print(f"→ GET {api_base}/associacoes")
    r = requests.get(
        f"{api_base}/associacoes",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=30,
    )
    if r.status_code != 200:
        print(f"✗ {api_base}/associacoes retornou {r.status_code}: {r.text[:400]}")
        return 1

    body = r.json()
    if isinstance(body, dict):
        items = body.get("data") or body.get("items") or []
    else:
        items = body
    print(f"✓ {len(items)} associações retornadas")

    print("✓ Tudo certo. Pronto para `docker compose up --build -d`.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
