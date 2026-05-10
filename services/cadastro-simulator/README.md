# cadastro-simulator

Simulador contínuo de uso do domínio Cadastro. Roda em loop infinito gerando audit events
através de operações reais (READ / CREATE / UPDATE) autenticadas como `analista_cadastro`
via Logto ROPC (grant `password`).

## Pré-requisitos

1. **App Logto provisionada.** Rode `./scripts/provision-logto.sh` na raiz do repo. Ele
   cria a app `mcad-simulator` (Traditional Web, com grant `password`) e imprime
   `simulatorAppId` e `simulatorAppSecret` no final.
2. **Docker + Docker Compose.**

## Configuração

```bash
cd services/cadastro-simulator
cp .env.example .env
# Edite .env com OIDC_CLIENT_ID e OIDC_CLIENT_SECRET impressos pelo provision-logto.sh
```

Variáveis principais:

| Variável | Default | Descrição |
|---|---|---|
| `API_BASE_URL` | `https://mcad.tasso.dev.br/api/v1` | URL da cadastro-api |
| `OIDC_CLIENT_ID` | *(obrigatório)* | App ID da `mcad-simulator` |
| `OIDC_CLIENT_SECRET` | *(obrigatório)* | App Secret |
| `SIM_USERNAME` | `analista_cadastro` | Usuário Logto |
| `SIM_PASSWORD` | `Analista123!` | Senha |
| `READS_PER_CYCLE` | `3` | Leituras por ciclo |
| `WRITES_PER_CYCLE` | `1` | Cadastros por ciclo |
| `UPDATES_PER_CYCLE` | `1` | Updates por ciclo |
| `CYCLE_INTERVAL_SECONDS` | `300` | Pausa entre ciclos (5 min) |
| `INTRA_CYCLE_DELAY_SECONDS` | `2` | Pausa entre operações dentro do ciclo |

## Rodar

```bash
docker compose up --build -d
docker compose logs -f
```

Parar:

```bash
docker compose down
```

## O que o simulador faz

- **Warmup:** carrega lista de associações + primeira página de obras/titulares/fonogramas
  para popular o pool de IDs (permite fazer UPDATE/READ por id desde o primeiro ciclo).
- **Loop:** a cada ciclo executa `READS + WRITES + UPDATES` operações com delay
  configurável entre elas; depois dorme `CYCLE_INTERVAL_SECONDS`.
- **Auth:** login ROPC no startup, refresh automático antes do token expirar e em 401.
- **Pool em memória:** mantém até 200 IDs criados/encontrados de cada tipo
  para que UPDATE/READ atinjam entidades reais.

Operações implementadas:

| Tipo | Operações |
|---|---|
| READ | listar obras / titulares / fonogramas; GET por id |
| WRITE | POST `/titulares` (PF), POST `/obras`, POST `/fonogramas` (precisa de obra no pool) |
| UPDATE | PUT `/obras/{id}` (sufixa título), PUT `/titulares/{id}` (sufixa nome) |

Cada CREATE e UPDATE gera 2 eventos no `audit_outbox` (`UserAction` + `DataChange`),
mais 1 evento de domínio no `outbox_events` (CloudEvent), conforme o padrão do
domínio Cadastro.
