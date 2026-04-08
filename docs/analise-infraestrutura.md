# Analise de Infraestrutura - MCAD

**Data:** 2026-04-07  
**Ambiente:** Servidor `tasso.dev.br`

---

## 1. Conectividade com Servicos Externos

| Servico | Endpoint | Porta | Status |
|---------|----------|-------|--------|
| PostgreSQL | db.tasso.dev.br | 5432 | OK |
| RabbitMQ (AMQP) | rabbitmq.tasso.dev.br | 5672 | OK |
| RabbitMQ (Management) | rabbitmq.tasso.dev.br | 15672 (HTTPS) | OK (v4.1.8) |
| Keycloak | keycloak.tasso.dev.br | 443 (HTTPS) | OK |
| MinIO | minio-api.tasso.dev.br | 443 (HTTPS) | OK (health/live: 200) |

**Resultado:** Todos os servicos de infraestrutura estao acessiveis.

---

## 2. Banco de Dados PostgreSQL

### 2.1 Schemas

| Schema | Existe | Owner |
|--------|--------|-------|
| cadastro | Sim | gestauto |
| identificacao | Sim | gestauto |
| arrecadacao | **NAO** | - |
| keycloak | (gerenciado pelo Keycloak) | gestauto |

### 2.2 Migrations - Cadastro (EF Core)

10 migrations aplicadas com sucesso:

| Migration |
|-----------|
| 20260330000900_InitialCreate |
| 20260330161039_AddTitulares |
| 20260331005127_AddObras |
| 20260331171006_AddTitularidadesAutorais |
| 20260331232545_AddFonogramas |
| 20260401131139_AddParticipacoesConexas |
| 20260401173745_AddControleStatus |
| 20260401190559_AddOutboxEvents |
| 20260403182402_SyncModel |
| 20260403190454_AddCodigo_CampoCodigo |

**Tabelas (9):** `__EFMigrationsHistory`, `associacoes`, `fonogramas`, `historico_bloqueios`, `obras_musicais`, `outbox_events`, `participacoes_conexas`, `titulares`, `titularidades_autorais`

### 2.3 Migrations - Identificacao (EF Core)

4 migrations aplicadas com sucesso:

| Migration |
|-----------|
| 20260402124543_InitialCreate |
| 20260403001452_AddExecucoesETiposUtilizacao |
| 20260403211221_AddUploadsEErros |
| 20260404210446_AddOutboxEvents |

**Tabelas (7):** `__EFMigrationsHistory`, `Captacoes`, `ErrosUpload`, `Execucoes`, `Rubricas`, `TiposUtilizacao`, `Uploads`, `outbox_events`

### 2.4 Arrecadacao (Flyway)

| Item | Status |
|------|--------|
| Schema `arrecadacao` | OK (criado em 2026-04-07) |
| Role `arrecadacao_svc` | OK (criado em 2026-04-07, senha: `arrecadacao123`) |
| Permissoes (USAGE, CRUD, CREATE, SEQUENCES) | OK (verificado) |
| Flyway migrations | **PENDENTE** - sera aplicado na primeira execucao da API |

> O schema e role foram provisionados manualmente. As migrations do Flyway serao aplicadas automaticamente quando a arrecadacao-api iniciar pela primeira vez.

---

## 3. Keycloak / Autenticacao

### 3.1 Realm `mcad`

| Item | Status |
|------|--------|
| Realm `mcad` | OK (OIDC discovery acessivel) |
| Issuer | `https://keycloak.tasso.dev.br/realms/mcad` |

### 3.2 Client `mcad-frontend`

| Propriedade | Valor |
|-------------|-------|
| Public Client | Sim |
| Standard Flow (PKCE) | Habilitado |
| Direct Access Grants | Desabilitado (correto para SPA) |
| Redirect URIs | `http://localhost:5173/*` |
| Web Origins | `http://localhost:5173` |

### 3.3 Roles

| Role | Descricao | Status |
|------|-----------|--------|
| analista-cadastro | Analista de Cadastro (leitura + escrita) | OK |
| analista-identificacao | Analista de Identificacao (leitura + escrita) | OK |
| consultor | Consultor (somente leitura) | OK |

### 3.4 Usuarios

| Usuario | Email | Habilitado | Roles | Status |
|---------|-------|------------|-------|--------|
| analista.teste | analista@mcad.dev | Sim | analista-cadastro, default-roles-mcad | OK |
| analista.ident | analista.ident@mcad.dev | Sim | analista-identificacao, default-roles-mcad | OK |
| consultor.teste | consultor@mcad.dev | Sim | consultor, default-roles-mcad | OK |

> **Nota:** Login via password grant (direct access) nao eh possivel pois `directAccessGrantsEnabled=false` no client. Isso eh o comportamento correto - o login ocorre via Authorization Code + PKCE no browser. Os usuarios foram verificados via Admin API.

---

## 4. Configuracao das APIs - Apontamento para Servidor

### 4.1 cadastro-api (.NET 8 - porta 5001)

| Config | Valor no `.env` | Aponta para servidor? |
|--------|------------------|-----------------------|
| DB Host | `db.tasso.dev.br` | Sim |
| DB Port | `5432` | Sim |
| DB Name | `mcad` | Sim |
| DB Schema | `cadastro` | Sim |
| DB User | `gestauto` | Sim |
| RabbitMQ | `amqp://mcad:mcad@rabbitmq.tasso.dev.br:5672` | Sim |
| OIDC Authority | `https://keycloak.tasso.dev.br/realms/mcad` | Sim |
| AUTH_ENABLED | `true` | Sim |

**Status:** Configuracao completa e apontando para o servidor.

### 4.2 identificacao-api (.NET 8 - porta 5100)

| Config | Valor no `.env` | Aponta para servidor? |
|--------|------------------|-----------------------|
| DB Host | `db.tasso.dev.br` | Sim |
| DB Port | `5432` | Sim |
| DB Name | `mcad` | Sim |
| DB Schema | `identificacao` | Sim |
| DB User | `gestauto` | Sim |
| RabbitMQ | `amqp://mcad:mcad@rabbitmq.tasso.dev.br:5672` | Sim |
| OIDC Authority | `https://keycloak.tasso.dev.br/realms/mcad` | Sim |
| MinIO Endpoint | `https://minio-api.tasso.dev.br` | Sim |
| CADASTRO_API_BASE_URL | `http://localhost:5001/api/v1` | **Local** (correto para dev) |

**Status:** Configuracao completa e apontando para o servidor.

### 4.3 arrecadacao-api (Java Spring Boot - porta 5003)

| Config | Valor no `.env` | Aponta para servidor? |
|--------|------------------|-----------------------|
| DB Host | `db.tasso.dev.br` | Sim |
| DB Port | `5432` | Sim |
| DB Name | `mcad` | Sim |
| DB Schema | `arrecadacao` | Sim |
| DB User | `arrecadacao_svc` | Sim |
| RabbitMQ | `rabbitmq.tasso.dev.br:5672` | Sim |
| OIDC Authority | `https://keycloak.tasso.dev.br/realms/mcad` | Sim |

**Status:** Configuracao completa e apontando para o servidor. (`.env` criado em 2026-04-07)

### 4.4 Frontend (React + Vite - porta 5173)

| Config | Valor no `.env` | Observacao |
|--------|-----------------|------------|
| VITE_API_BASE_URL | `http://localhost:5001/api/v1` | Cadastro API (local) |
| VITE_IDENTIFICACAO_API_BASE_URL | `http://localhost:5100/api/v1` | Identificacao API (local) |
| VITE_ARRECADACAO_API_BASE_URL | `http://localhost:5003/api/v1` | Arrecadacao API (local) |
| VITE_OIDC_AUTHORITY | `https://keycloak.tasso.dev.br/realms/mcad` | Sim |
| VITE_OIDC_CLIENT_ID | `mcad-frontend` | OK |

**Status:** Configuracao completa e apontando para o servidor. (OIDC corrigido em 2026-04-07)

---

## 5. Servicos Locais (APIs rodando)

| Servico | Porta | Status | Detalhe |
|---------|-------|--------|---------|
| cadastro-api | 5001 | OK | Healthy |
| identificacao-api | 5100 | OK | 401 (auth habilitado no health, API funcional) |
| arrecadacao-api | 5003 | OK | UP (DB, RabbitMQ, Disk OK) |
| frontend | 5173 | OK | 200 |

---

## 6. Resumo de Problemas Encontrados

### Resolvidos (2026-04-07)

| # | Problema | Resolucao |
|---|---------|-----------|
| 1 | Schema `arrecadacao` nao existia no servidor | Criado via SQL direto |
| 2 | Role `arrecadacao_svc` nao existia no servidor | Criado com senha `arrecadacao123` + grants |
| 3 | Arquivo `.env` ausente em `services/arrecadacao-api/` | Criado com valores do servidor |
| 4 | Frontend OIDC apontava para `localhost:8080` | Corrigido para `https://keycloak.tasso.dev.br/realms/mcad` |
| 5 | Flyway V3 falhava: `gin_trgm_ops` nao encontrado | Qualificado como `public.gin_trgm_ops` na migration |
| 6 | `VerbaService` bean nao encontrado (F05 pendente) | Criado `VerbaServiceNoOp` placeholder no modulo infra |
| 7 | Flyway migrations do arrecadacao pendentes | 10 migrations aplicadas com sucesso |
| 8 | `dev.sh` subia docker-compose desnecessario | Removido docker-compose (infra remota), adicionado load do `.env` para Java |

### OK

| Item | Status |
|------|--------|
| PostgreSQL conectividade | OK |
| RabbitMQ conectividade | OK (v4.1.8) |
| Keycloak realm + OIDC discovery | OK |
| MinIO health | OK |
| Keycloak usuarios (3) | OK - todos habilitados com roles corretas |
| Keycloak client mcad-frontend | OK - PKCE configurado |
| cadastro-api .env | OK - aponta para servidor |
| identificacao-api .env | OK - aponta para servidor |
| arrecadacao-api .env | OK - aponta para servidor (criado 2026-04-07) |
| Frontend .env OIDC | OK - aponta para servidor (corrigido 2026-04-07) |
| Migrations cadastro (10) | OK |
| Migrations identificacao (4) | OK |
| Migrations arrecadacao (10 Flyway) | OK (aplicadas 2026-04-07) |
| Schema arrecadacao | OK (criado 2026-04-07) |
| Role arrecadacao_svc | OK (criado 2026-04-07) |
| Todos os servicos rodando | OK (4/4 up) |

---

## 7. Proximos Passos

1. **Iniciar arrecadacao-api** para que o Flyway aplique as migrations automaticamente
2. **Iniciar todas as APIs e frontend** para validar end-to-end
3. **Testar login** via browser em `http://localhost:5173` com os 3 usuarios do Keycloak
