"""Simulador contínuo de uso do domínio Cadastro.

Roda em loop infinito gerando audit events através de operações reais de
leitura, cadastro e atualização autenticadas como analista_cadastro via Logto ROPC.
"""
import logging
import os
import random
import re
import string
import sys
import time
from datetime import datetime, timedelta, timezone

import requests

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

API_BASE_URL = os.environ.get("API_BASE_URL", "https://mcad.tasso.dev.br/api/v1").rstrip("/")
OIDC_AUTHORITY = os.environ.get("OIDC_AUTHORITY", "https://9lcinu.logto.app/oidc").rstrip("/")
OIDC_RESOURCE = os.environ.get("OIDC_RESOURCE", "https://api.mcad.local")
CLIENT_ID = os.environ.get("OIDC_CLIENT_ID", "").strip()
CLIENT_SECRET = os.environ.get("OIDC_CLIENT_SECRET", "").strip()
USERNAME = os.environ.get("SIM_USERNAME", "analista_cadastro")
PASSWORD = os.environ.get("SIM_PASSWORD", "Analista123!")

READS = int(os.environ.get("READS_PER_CYCLE", "3"))
WRITES = int(os.environ.get("WRITES_PER_CYCLE", "1"))
UPDATES = int(os.environ.get("UPDATES_PER_CYCLE", "1"))
CYCLE_INTERVAL = int(os.environ.get("CYCLE_INTERVAL_SECONDS", "300"))
INTRA_DELAY = float(os.environ.get("INTRA_CYCLE_DELAY_SECONDS", "2"))

POOL_MAX = 200

# ---------------------------------------------------------------------------
# Dados para geração
# ---------------------------------------------------------------------------

NOMES = [
    "Ana", "Maria", "Joao", "Carlos", "Pedro", "Paulo", "Lucas", "Marcos",
    "Rafael", "Gabriel", "Felipe", "Eduardo", "Bruno", "Thiago", "Gustavo",
    "Juliana", "Fernanda", "Patricia", "Camila", "Mariana", "Gabriela",
    "Beatriz", "Larissa", "Bruna", "Leticia", "Carla", "Luciana", "Renata",
]
SOBRENOMES = [
    "Silva", "Santos", "Oliveira", "Souza", "Pereira", "Ferreira", "Almeida",
    "Costa", "Rodrigues", "Lima", "Gomes", "Carvalho", "Araujo", "Barbosa",
    "Cardoso", "Cavalcanti", "Castro", "Dias", "Fernandes", "Ribeiro",
]
ADJETIVOS = [
    "Saudosa", "Alegre", "Bela", "Doce", "Suave", "Forte", "Profunda",
    "Serena", "Apaixonada", "Eterna", "Simples", "Especial", "Livre",
    "Sonhadora", "Vibrante", "Sagrada", "Pura", "Aberta", "Infinita",
    "Encantada", "Dourada", "Nobre", "Sonora",
]
SUBSTANTIVOS = [
    "Saudade", "Amor", "Paixao", "Alegria", "Esperanca", "Manha", "Noite",
    "Estrela", "Lua", "Mar", "Rio", "Caminho", "Cancao", "Melodia", "Sonho",
    "Brisa", "Sertao", "Cidade", "Praia", "Floresta", "Memoria", "Tempo",
]
GENEROS = ["MPB", "Samba", "Sertanejo", "Forro", "Rock", "Pop", "Gospel", "Pagode", "Axe"]
TIPOS_OBRA_PESOS = [("LITEROMUSICAL", 70), ("MUSICAL", 20), ("VERSAO", 5), ("POT_POURRI", 5)]

# ---------------------------------------------------------------------------
# Geradores
# ---------------------------------------------------------------------------

def gerar_cpf() -> str:
    digits = [random.randint(0, 9) for _ in range(9)]

    def calc(arr, factor):
        s = sum(d * (factor - i) for i, d in enumerate(arr))
        r = s % 11
        return 0 if r < 2 else 11 - r

    d1 = calc(digits, 10)
    d2 = calc(digits + [d1], 11)
    cpf = "".join(str(d) for d in digits + [d1, d2])
    return f"{cpf[0:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:11]}"


def gerar_isrc() -> str:
    chars = string.ascii_uppercase + string.digits
    reg = "".join(random.choices(chars, k=3))
    ano = f"{random.randint(20, 26):02d}"
    seq = f"{random.randint(10000, 99999)}"
    return f"BR{reg}{ano}{seq}"


def gerar_titulo() -> str:
    return f"{random.choice(ADJETIVOS)} {random.choice(SUBSTANTIVOS)}"


def gerar_nome_pessoa() -> str:
    return f"{random.choice(NOMES)} {random.choice(SOBRENOMES)}"


def weighted_choice(items):
    total = sum(w for _, w in items)
    roll = random.uniform(0, total)
    acc = 0
    for v, w in items:
        acc += w
        if roll <= acc:
            return v
    return items[-1][0]

# ---------------------------------------------------------------------------
# Token manager (Logto ROPC)
# ---------------------------------------------------------------------------

class TokenManager:
    def __init__(self):
        self.access_token = None
        self.refresh_token = None
        self.expires_at = datetime.now(timezone.utc)

    def get_token(self) -> str:
        if (
            not self.access_token
            or datetime.now(timezone.utc) >= self.expires_at - timedelta(seconds=30)
        ):
            self._renew()
        return self.access_token

    def force_renew(self):
        self.access_token = None
        self._renew()

    def _renew(self):
        if self.refresh_token:
            try:
                self._do_refresh()
                return
            except Exception as exc:
                logging.warning("Refresh falhou (%s); tentando login novamente", exc)
        self._do_login()

    def _do_login(self):
        logging.info("Login Logto via ROPC (user=%s)", USERNAME)
        data = {
            "grant_type": "password",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "username": USERNAME,
            "password": PASSWORD,
            "resource": OIDC_RESOURCE,
            "scope": "access write offline_access",
        }
        r = requests.post(f"{OIDC_AUTHORITY}/token", data=data, timeout=30)
        if r.status_code >= 400:
            raise RuntimeError(f"Login falhou {r.status_code}: {r.text}")
        self._consume_token(r.json())

    def _do_refresh(self):
        data = {
            "grant_type": "refresh_token",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "refresh_token": self.refresh_token,
            "resource": OIDC_RESOURCE,
            "scope": "access write offline_access",
        }
        r = requests.post(f"{OIDC_AUTHORITY}/token", data=data, timeout=30)
        if r.status_code >= 400:
            raise RuntimeError(f"Refresh {r.status_code}: {r.text}")
        self._consume_token(r.json())

    def _consume_token(self, payload):
        self.access_token = payload["access_token"]
        if "refresh_token" in payload:
            self.refresh_token = payload["refresh_token"]
        ttl = int(payload.get("expires_in", 3600))
        self.expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl)

# ---------------------------------------------------------------------------
# Cliente HTTP
# ---------------------------------------------------------------------------

class CadastroClient:
    def __init__(self, token_mgr: TokenManager):
        self.token_mgr = token_mgr
        self.session = requests.Session()

    def _request(self, method, path, **kwargs):
        url = f"{API_BASE_URL}{path}" if path.startswith("/") else f"{API_BASE_URL}/{path}"
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {self.token_mgr.get_token()}"
        if method != "GET":
            headers.setdefault("Content-Type", "application/json")

        r = self.session.request(method, url, headers=headers, timeout=30, **kwargs)
        if r.status_code == 401:
            logging.info("401 recebido — renovando token")
            self.token_mgr.force_renew()
            headers["Authorization"] = f"Bearer {self.token_mgr.get_token()}"
            r = self.session.request(method, url, headers=headers, timeout=30, **kwargs)
        return r

    def get(self, path, params=None):
        r = self._request("GET", path, params=params)
        r.raise_for_status()
        return r.json() if r.text else None

    def post(self, path, json):
        r = self._request("POST", path, json=json)
        r.raise_for_status()
        return r.json() if r.text else None

    def put(self, path, json):
        r = self._request("PUT", path, json=json)
        r.raise_for_status()
        return r.json() if r.text else None

# ---------------------------------------------------------------------------
# Pool de IDs em memória
# ---------------------------------------------------------------------------

class Pool:
    def __init__(self):
        self.obras = []
        self.titulares = []
        self.fonogramas = []
        self.associacoes = []

    def _add(self, lst, value):
        if value and value not in lst:
            lst.append(value)
            if len(lst) > POOL_MAX:
                del lst[: len(lst) - POOL_MAX]

    def add_obra(self, oid):
        self._add(self.obras, oid)

    def add_titular(self, tid):
        self._add(self.titulares, tid)

    def add_fonograma(self, fid):
        self._add(self.fonogramas, fid)

    def random_obra(self):
        return random.choice(self.obras) if self.obras else None

    def random_titular(self):
        return random.choice(self.titulares) if self.titulares else None

    def random_fonograma(self):
        return random.choice(self.fonogramas) if self.fonogramas else None

    def random_associacao(self):
        return random.choice(self.associacoes) if self.associacoes else None

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def extract_items(payload):
    if payload is None:
        return []
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("data", "items"):
            value = payload.get(key)
            if isinstance(value, list):
                return value
    return []


def safe(operation_name, fn):
    try:
        return fn()
    except requests.HTTPError as exc:
        body = ""
        try:
            body = exc.response.text[:300]
        except Exception:
            pass
        logging.warning("%s falhou: %s %s", operation_name, exc, body)
    except Exception as exc:
        logging.warning("%s falhou: %s", operation_name, exc)
    return None

# ---------------------------------------------------------------------------
# Operações
# ---------------------------------------------------------------------------

def do_read(client: CadastroClient, pool: Pool):
    candidates = ["list_obras", "list_titulares", "list_fonogramas"]
    if pool.obras:
        candidates.append("get_obra")
    if pool.titulares:
        candidates.append("get_titular")
    if pool.fonogramas:
        candidates.append("get_fonograma")
    op = random.choice(candidates)

    if op == "list_obras":
        safe("READ list obras", lambda: client.get("/obras", params={"page": 1, "size": 20}))
    elif op == "list_titulares":
        safe("READ list titulares", lambda: client.get("/titulares", params={"page": 1, "size": 20}))
    elif op == "list_fonogramas":
        safe("READ list fonogramas", lambda: client.get("/fonogramas", params={"page": 1, "size": 20}))
    elif op == "get_obra":
        oid = pool.random_obra()
        safe(f"READ obra {oid}", lambda: client.get(f"/obras/{oid}"))
    elif op == "get_titular":
        tid = pool.random_titular()
        safe(f"READ titular {tid}", lambda: client.get(f"/titulares/{tid}"))
    elif op == "get_fonograma":
        fid = pool.random_fonograma()
        safe(f"READ fonograma {fid}", lambda: client.get(f"/fonogramas/{fid}"))
    logging.info("READ ok (%s)", op)


def do_write(client: CadastroClient, pool: Pool):
    candidates = ["titular", "obra"]
    if pool.obras:
        candidates.append("fonograma")
    op = random.choice(candidates)

    if op == "titular":
        assoc = pool.random_associacao()
        if not assoc:
            logging.warning("Sem associações no pool — pulando WRITE titular")
            return
        body = {
            "nome": gerar_nome_pessoa(),
            "tipo": "PF",
            "documento": gerar_cpf(),
            "nacionalidade": "Brasileira",
            "associacaoId": assoc,
            "caeIpi": None,
        }
        res = safe("WRITE titular", lambda: client.post("/titulares", body))
        if res and "id" in res:
            pool.add_titular(res["id"])
            logging.info("WRITE titular criado id=%s nome=%s", res["id"], body["nome"])

    elif op == "obra":
        body = {
            "titulo": gerar_titulo(),
            "subtitulo": None,
            "tipo": weighted_choice(TIPOS_OBRA_PESOS),
            "genero": random.choice(GENEROS),
        }
        res = safe("WRITE obra", lambda: client.post("/obras", body))
        if res and "id" in res:
            pool.add_obra(res["id"])
            logging.info("WRITE obra criada id=%s titulo=%s", res["id"], body["titulo"])

    elif op == "fonograma":
        obra_id = pool.random_obra()
        body = {
            "isrc": gerar_isrc(),
            "obraId": obra_id,
            "paisOrigem": "Brasil",
            "dataGravacao": None,
            "dataLancamento": None,
        }
        res = safe("WRITE fonograma", lambda: client.post("/fonogramas", body))
        if res and "id" in res:
            pool.add_fonograma(res["id"])
            logging.info("WRITE fonograma criado id=%s isrc=%s", res["id"], body["isrc"])


def do_update(client: CadastroClient, pool: Pool):
    candidates = []
    if pool.obras:
        candidates.append("obra")
    if pool.titulares:
        candidates.append("titular")
    if not candidates:
        logging.info("UPDATE ignorado — pool vazio")
        return
    op = random.choice(candidates)
    suffix = datetime.now(timezone.utc).strftime("%H%M%S")

    if op == "obra":
        oid = pool.random_obra()
        atual = safe(f"UPDATE/get obra {oid}", lambda: client.get(f"/obras/{oid}"))
        if not atual:
            return
        novo_titulo = re.sub(r" \[sim \d+\]$", "", atual.get("titulo", gerar_titulo()))
        body = {
            "titulo": f"{novo_titulo} [sim {suffix}]"[:300],
            "subtitulo": atual.get("subtitulo"),
            "tipo": atual.get("tipo") or "LITEROMUSICAL",
            "genero": atual.get("genero") or random.choice(GENEROS),
        }
        res = safe(f"UPDATE obra {oid}", lambda: client.put(f"/obras/{oid}", body))
        if res:
            logging.info("UPDATE obra id=%s", oid)

    elif op == "titular":
        tid = pool.random_titular()
        atual = safe(f"UPDATE/get titular {tid}", lambda: client.get(f"/titulares/{tid}"))
        if not atual:
            return
        nome_base = re.sub(r" \[sim \d+\]$", "", atual.get("nome", gerar_nome_pessoa()))
        associacao_id = (
            atual.get("associacaoId")
            or (atual.get("associacao") or {}).get("id")
            or pool.random_associacao()
        )
        body = {
            "nome": f"{nome_base} [sim {suffix}]"[:200],
            "nacionalidade": atual.get("nacionalidade") or "Brasileira",
            "associacaoId": associacao_id,
            "status": (atual.get("status") or "ATIVO"),
            "caeIpi": atual.get("caeIpi"),
        }
        res = safe(f"UPDATE titular {tid}", lambda: client.put(f"/titulares/{tid}", body))
        if res:
            logging.info("UPDATE titular id=%s", tid)

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

def warmup(client: CadastroClient, pool: Pool):
    logging.info("Warmup — carregando associações")
    associacoes = safe("warmup associacoes", lambda: client.get("/associacoes"))
    items = extract_items(associacoes)
    pool.associacoes = [a["id"] for a in items if "id" in a]
    if not pool.associacoes:
        raise RuntimeError("Nenhuma associação carregada — abortando")
    logging.info("Warmup — %d associações carregadas", len(pool.associacoes))

    for path, add_fn in [
        ("/obras", pool.add_obra),
        ("/titulares", pool.add_titular),
        ("/fonogramas", pool.add_fonograma),
    ]:
        items = extract_items(
            safe(f"warmup {path}", lambda p=path: client.get(p, params={"page": 1, "size": 50}))
        )
        for it in items:
            if "id" in it:
                add_fn(it["id"])
    logging.info(
        "Warmup pool — obras=%d titulares=%d fonogramas=%d",
        len(pool.obras), len(pool.titulares), len(pool.fonogramas),
    )

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        stream=sys.stdout,
    )
    if not CLIENT_ID or not CLIENT_SECRET:
        logging.error("OIDC_CLIENT_ID e OIDC_CLIENT_SECRET são obrigatórios")
        sys.exit(2)

    logging.info(
        "Simulador iniciando | api=%s | reads=%d writes=%d updates=%d ciclo=%ds",
        API_BASE_URL, READS, WRITES, UPDATES, CYCLE_INTERVAL,
    )

    token_mgr = TokenManager()
    client = CadastroClient(token_mgr)
    pool = Pool()
    warmup(client, pool)

    cycle = 0
    while True:
        cycle += 1
        logging.info("=== ciclo %d ===", cycle)

        for _ in range(READS):
            do_read(client, pool)
            time.sleep(INTRA_DELAY)

        for _ in range(WRITES):
            do_write(client, pool)
            time.sleep(INTRA_DELAY)

        for _ in range(UPDATES):
            do_update(client, pool)
            time.sleep(INTRA_DELAY)

        logging.info(
            "ciclo %d concluído | pool obras=%d titulares=%d fonogramas=%d | dormindo %ds",
            cycle, len(pool.obras), len(pool.titulares), len(pool.fonogramas), CYCLE_INTERVAL,
        )
        time.sleep(CYCLE_INTERVAL)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logging.info("Interrompido pelo usuário")
        sys.exit(0)
