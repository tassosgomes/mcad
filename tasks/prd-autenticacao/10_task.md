---
status: completed
parallelizable: false
blocked_by: ["3.0", "9.0"]
---

<task_context>
<domain>e2e</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>http_server, external_apis</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 10.0: Validação End-to-End — Fluxo completo login → CRUD → logout

## Visão Geral

Validação manual e2e com Keycloak real: login como Analista (CRUD funciona), login como Consultor (apenas leitura), token expirado (401), logout, silent refresh.

## Pré-requisitos

- Keycloak configurado com realm `mcad`, client `mcad-frontend` (public, PKCE), roles `analista-cadastro` e `consultor`, 2 usuários de teste
- Backend rodando com AUTH_ENABLED=true
- Frontend com .env preenchido

## Subtarefas

- [x] 10.1 **Analista:** Login → criar titular → criar obra → adicionar titularidade → obter ISWC → liberar obra → bloquear → desbloquear → logout
- [x] 10.2 **Consultor:** Login → listar titulares (OK) → botão "Novo Titular" NÃO visível → tentar POST via curl com token consultor → 403
- [x] 10.3 **Token expirado:** Aguardar expiração (ou reduzir TTL no Keycloak) → request → 401 → silent refresh → request OK
- [x] 10.4 **Logout:** Clicar logout → sessão encerrada → tentar acessar rota → redireciona para login
- [x] 10.5 **Sem token (curl):** `curl http://localhost:5001/api/v1/titulares` → 401
- [x] 10.6 **Health público:** `curl http://localhost:5001/health` → 200 (sem token)

## Evidências de Execução

- Analista autenticado com Keycloak real; cabeçalho exibiu `Analista Teste` e badge `Analista`
- Criado titular `Titular E2E Analista 20260401-2335` com CPF `529.982.247-25` e associação `ABRAMUS`
- Criada obra `Obra E2E Analista 20260401-2336` e acessado detalhe `/cadastro/obras/ba449e53-d356-4805-b7fa-d379c747edd3`
- Titularidade adicionada com sucesso via UI para o titular criado, categoria `AUTOR`, percentual `100.0000%`
- `Obter ISWC` executado com sucesso; a obra recebeu `T-246535180-6` e o backend promoveu o status para `LIBERADO` no mesmo fluxo
- Ciclo de status validado via UI e backend: `LIBERADO` → `BLOQUEADO` com justificativa `Bloqueio E2E para validar ciclo de status` → `PENDENTE` após desbloqueio; histórico exibido na tela
- Consultor autenticado com Keycloak real; cabeçalho exibiu `Consultor Teste` e badge `Consultor`
- Em `/cadastro/titulares`, o consultor conseguiu listar titulares e o botão `Novo Titular` não foi renderizado
- `curl` sem token para `http://localhost:5001/api/v1/titulares` retornou `401`
- `curl` para `http://localhost:5001/health` retornou `200`
- `curl` com token real de consultor em `POST /api/v1/titulares` retornou `403`
- Logout corrigido e validado com rota pública de pós-logout (`/logout`); após clicar `Sair`, a aplicação exibiu `Logout concluido`
- Tentativa de acessar `/cadastro/titulares` após logout redirecionou para a tela do Keycloak (`Sign in to mini-ECAD`)
- Silent renew validado com Keycloak real: o frontend executou nova troca em `openid-connect/token` antes da expiração e passou a usar um novo access token (`exp` atualizado de `1775087512` para `1775087605`) sem perder a sessão
- Requisição autenticada após a renovação silenciosa seguiu retornando `200` em `GET /api/v1/titulares`
- Requisição com token antigo de consultor, já vencido, retornou `401`, confirmando rejeição de token expirado no backend

## Critérios de Sucesso (Verificáveis)

- [x] Fluxo completo Analista funciona end-to-end
- [x] Consultor não vê botões de ação e recebe 403 no backend
- [x] Silent refresh funciona (sem desconectar)
- [x] Logout encerra sessão em Keycloak
- [x] Health check público
