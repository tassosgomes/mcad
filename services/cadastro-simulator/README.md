# cadastro-simulator

Simulador contínuo de uso do domínio Cadastro. Roda em loop infinito gerando audit
events através de operações reais (READ / CREATE / UPDATE) via API HTTP.

## Modos de autenticação

Logto Cloud (a versão hospedada) **não suporta o grant `password` (ROPC)**, então o
simulador autentica de uma das duas formas:

| Modo | Como funciona | `actor.username` no audit | Setup |
|---|---|---|---|
| `client_credentials` *(default)* | App M2M autentica como serviço | `"system"` ou client_id | Apenas rodar o `provision-logto.sh` |
| `refresh_token` | Usa refresh_token de usuário real | `analista_cadastro` | Captura manual no browser (passo abaixo) |

Escolha o modo via `AUTH_MODE` no `.env`.

## Pré-requisitos

1. **App M2M provisionada.** Rode `./scripts/provision-logto.sh` na raiz do repo.
   Ele cria a app `mcad-simulator` (M2M, com role e scopes `access` + `write` no
   API resource `mcad-apis`) e imprime `simulatorAppId` e `simulatorAppSecret` no
   final do output.
2. **Docker + Docker Compose.**

## Configuração

```bash
cd services/cadastro-simulator
cp .env.example .env
# Edite .env: cole OIDC_CLIENT_ID e OIDC_CLIENT_SECRET impressos pelo provision-logto.sh
```

### Opcional: capturar refresh_token (para preservar actor.username real)

1. Acesse `https://mcad.tasso.dev.br` no browser e logue como `analista_cadastro`.
2. Abra DevTools → Application → Storage → Local Storage do `mcad.tasso.dev.br`.
3. Procure a chave do Logto SDK (algo como `logto:<client-id>:refreshToken`).
4. Copie o valor para `INITIAL_REFRESH_TOKEN` no `.env`.
5. Defina `AUTH_MODE=refresh_token`.

> O refresh_token expira em ~14 dias por padrão, mas o simulador renova automaticamente
> a cada uso, mantendo a sessão viva indefinidamente enquanto estiver rodando.

## Sanity check (recomendado antes do `docker compose up`)

Valida `.env`, tenta autenticar e faz um GET `/associacoes` para confirmar permissão:

```bash
python3 check.py
```

(Requer `pip install requests` localmente. Não usa Docker.)

## Rodar

```bash
docker compose up --build -d
docker compose logs -f
```

Parar:

```bash
docker compose down
```

## Variáveis de ambiente

| Variável | Default | Descrição |
|---|---|---|
| `API_BASE_URL` | `https://mcad-cadastro.tasso.dev.br/api/v1` | URL da cadastro-api |
| `OIDC_AUTHORITY` | `https://9lcinu.logto.app/oidc` | Authority do Logto |
| `OIDC_RESOURCE` | `https://api.mcad.local` | API resource indicator |
| `OIDC_CLIENT_ID` | *(obrigatório)* | App ID da `mcad-simulator` |
| `OIDC_CLIENT_SECRET` | *(obrigatório)* | App Secret |
| `AUTH_MODE` | `client_credentials` | `client_credentials` ou `refresh_token` |
| `INITIAL_REFRESH_TOKEN` | *(obrigatório se mode=refresh_token)* | Refresh token capturado do browser |
| `READS_PER_CYCLE` | `3` | Leituras por ciclo |
| `WRITES_PER_CYCLE` | `1` | Cadastros por ciclo |
| `UPDATES_PER_CYCLE` | `1` | Updates por ciclo |
| `CYCLE_INTERVAL_SECONDS` | `300` | Pausa entre ciclos (5 min) |
| `INTRA_CYCLE_DELAY_SECONDS` | `2` | Pausa entre operações dentro do ciclo |

## O que o simulador faz

- **Warmup:** carrega lista de associações + primeira página de obras/titulares/fonogramas
  para popular o pool de IDs (permite UPDATE/READ por id desde o primeiro ciclo).
- **Loop:** a cada ciclo executa `READS + WRITES + UPDATES` operações com delay
  configurável entre elas; depois dorme `CYCLE_INTERVAL_SECONDS`.
- **Auth:** login na inicialização, refresh automático antes do token expirar e em 401.
- **Pool em memória:** mantém até 200 IDs criados/encontrados de cada tipo
  para que UPDATE/READ atinjam entidades reais.

Operações implementadas:

| Tipo | Operações |
|---|---|
| READ | listar obras / titulares / fonogramas; GET por id |
| WRITE | POST `/titulares` (PF), POST `/obras`, POST `/fonogramas` (precisa de obra no pool) |
| UPDATE | PUT `/obras/{id}` (sufixa título), PUT `/titulares/{id}` (sufixa nome) |

Cada CREATE e UPDATE gera 2 eventos no `audit_outbox` (`UserAction` + `DataChange`),
mais 1 evento de domínio no `outbox_events` (CloudEvent).

## Headers de auditoria

Toda requisição inclui headers que o `HttpAuditContextProvider` da cadastro-api lê
para enriquecer o `AuditContext`:

| Header | Valor |
|---|---|
| `Authorization` | `Bearer <jwt>` |
| `X-Request-Id` | UUID único por request |
| `X-Correlation-Id` | mesmo UUID (correlação) |
| `X-Audit-Session-Id` | UUID gerado no startup do container — todos os events da rodada compartilham |
| `X-Audit-Route` | path da requisição |
| `X-Audit-Screen-Id` | `CADASTRO_OBRAS` / `CADASTRO_TITULARES` / `CADASTRO_FONOGRAMAS` / `CADASTRO_ASSOCIACOES` |
| `X-Audit-Screen-Name` | `Obras` / `Titulares` / `Fonogramas` / `Associações` |
| `X-Audit-Screen-Access-Id` | mesmo `X-Audit-Session-Id` (1 acesso por sessão por tela) |
| `X-Audit-Command-Id` | mesmo `X-Request-Id` (1 comando por request) |

> Nota: o frontend real não envia `X-Audit-*` hoje, então os audit events do
> simulador serão **mais ricos** (com screenId/sessionId preenchidos) que os do
> frontend. Para filtrar uma rodada específica do simulador, use
> `correlation.userSessionId = sim-<uuid>` ou `screen.screenId LIKE 'CADASTRO_%'`.

## Troubleshooting

**`401 Unauthorized` em todas as chamadas:** o token foi obtido mas a app não tem
scopes no API resource. Confira no Console do Logto que a app `mcad-simulator` tem
role `simulator-m2m` com scopes `access` + `write` (o `provision-logto.sh` faz isso
automaticamente).

**`invalid_grant` no token endpoint:** as credenciais (`OIDC_CLIENT_ID` /
`OIDC_CLIENT_SECRET`) estão erradas ou foi colado o secret de outra app.
