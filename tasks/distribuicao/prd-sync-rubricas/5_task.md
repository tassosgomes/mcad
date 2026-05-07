---
status: completed
parallelizable: true
blocked_by: ["1.0"]
---

<task_context>
<domain>distribuicao/infra</domain>
<type>configuration</type>
<scope>configuration</scope>
<complexity>medium</complexity>
<dependencies>docker</dependencies>
<unblocks>"7.0"</unblocks>
</task_context>

# Tarefa 5.0: Infraestrutura — Docker Compose, scripts e variáveis de ambiente

## Relacionada às User Stories

- Nenhuma diretamente — infraestrutura que habilita execução local

## Visão Geral

Configurar a infraestrutura para rodar o `distribuicao-api` localmente: adicionar serviço no Docker Compose, criar schema e role PostgreSQL, adicionar roles no Keycloak, atualizar `dev.sh` e `.env.example`.

## Requisitos

- Serviço `distribuicao-api` no Docker Compose (porta 5004, depends_on postgres/rabbitmq)
- Schema `distribuicao` com role `distribuicao_app` e grants corretos
- Roles `analista-distribuicao` e `consultor-distribuicao` no Keycloak
- `dev.sh` com start/stop do distribuicao-api
- `.env.example` atualizado com variáveis novas

## Arquivos Envolvidos

- **Modificar:**
  - `docker-compose.dev.yml` (adicionar serviço distribuicao-api)
  - `scripts/provision-keycloak.sh` (adicionar roles)
  - `dev.sh` (adicionar start/stop)
  - `.env.example` (adicionar variáveis)
- **Referência:**
  - `docker-compose.dev.yml` (padrão dos serviços existentes)
  - `scripts/provision-keycloak.sh` (padrão de provisão de roles)
  - `dev.sh` (padrão de gestão de serviços)

## Subtarefas

- [ ] 5.1 Adicionar serviço `distribuicao-api` no `docker-compose.dev.yml` (porta 5004, env vars, depends_on: postgres, rabbitmq)
- [ ] 5.2 Adicionar init script para schema `distribuicao` + role `distribuicao_app` com grants (ou usar Flyway no startup)
- [ ] 5.3 Adicionar roles `analista-distribuicao` e `consultor-distribuicao` no `provision-keycloak.sh`
- [ ] 5.4 Adicionar start/stop do `distribuicao-api` no `dev.sh` (mesmo padrão dos outros serviços)
- [ ] 5.5 Adicionar variáveis no `.env.example`: `DB_USER_DISTRIBUICAO`, `DB_PASSWORD_DISTRIBUICAO`, `VITE_DISTRIBUICAO_API_BASE_URL`, `SERVER_PORT_DISTRIBUICAO`
- [ ] 5.6 Testar que `./dev.sh start` inicia o serviço sem erros

## Sequenciamento

- Bloqueado por: 1.0 (precisa do projeto Maven existir)
- Desbloqueia: 7.0 (frontend precisa do env var `VITE_DISTRIBUICAO_API_BASE_URL`)
- Paralelizável: Sim (pode rodar em paralelo com 2.0, 3.0, 4.0)

## Rastreabilidade

- Esta tarefa cobre: infraestrutura de execução
- Evidência esperada: `./dev.sh start` inicia distribuicao-api na porta 5004

## Detalhes de Implementação

**Docker Compose — serviço distribuicao-api:**
```yaml
distribuicao-api:
  build:
    context: ./services/distribuicao-api
    dockerfile: Dockerfile
  ports:
    - "5004:5004"
  environment:
    - SERVER_PORT=5004
    - DB_HOST=postgres
    - DB_PORT=5432
    - DB_NAME=mcad
    - DB_USER_DISTRIBUICAO=distribuicao_app
    - DB_PASSWORD_DISTRIBUICAO=distribuicao_app
    - RABBITMQ_HOST=rabbitmq
    - RABBITMQ_PORT=5672
    - RABBITMQ_USER=mcad
    - RABBITMQ_PASSWORD=mcad
    - RABBITMQ_VHOST=mcad
    - OIDC_ISSUER_URI=http://keycloak:8080/realms/mcad
    - AUTH_ENABLED=false
  depends_on:
    - postgres
    - rabbitmq
```

**Nota:** Se o projeto não usa Docker para build dos serviços Java (apenas para infra), seguir o padrão existente no `dev.sh` que provavelmente usa `mvn spring-boot:run` diretamente.

**provision-keycloak.sh — novas roles:**
Seguir o padrão existente para adicionar:
- `analista-distribuicao`
- `consultor-distribuicao`

**dev.sh — padrão de start/stop:**
Seguir o padrão existente (provavelmente `mvn -pl distribuicao-api spring-boot:run` em background com PID tracking).

**.env.example:**
```bash
# Distribuição API
DB_USER_DISTRIBUICAO=distribuicao_app
DB_PASSWORD_DISTRIBUICAO=distribuicao_app
VITE_DISTRIBUICAO_API_BASE_URL=http://localhost:5004/api/v1
```

## Critérios de Sucesso (Verificáveis)

- [ ] `docker-compose.dev.yml` contém serviço `distribuicao-api` na porta 5004
- [ ] `provision-keycloak.sh` cria roles `analista-distribuicao` e `consultor-distribuicao`
- [ ] `dev.sh` suporta start/stop do distribuicao-api
- [ ] `.env.example` contém variáveis `DB_USER_DISTRIBUICAO`, `VITE_DISTRIBUICAO_API_BASE_URL`
