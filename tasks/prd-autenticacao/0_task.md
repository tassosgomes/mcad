---
status: completed
parallelizable: true
blocked_by: []
---

<task_context>
<domain>infra/auth</domain>
<type>configuration</type>
<scope>configuration</scope>
<complexity>medium</complexity>
<dependencies>external_apis</dependencies>
<unblocks>"1.0, 4.0"</unblocks>
</task_context>

# Tarefa 0.0: Keycloak — Configurar Realm, Client, Roles e Usuários de Teste

## Visão Geral

Configurar o Keycloak externo (já existente) com realm, client SPA (public, PKCE), roles e usuários de teste para o mini-ECAD. Os dados de conexão do Keycloak são fornecidos via .env. Esta task é pré-requisito para backend (1.0) e frontend (4.0).

## Pré-requisitos

- Keycloak acessível (URL fornecida no .env)
- Acesso admin ao Keycloak

## Subtarefas

- [x] 0.1 **Realm:** Criar realm `mcad` (ou usar realm existente conforme .env)
- [x] 0.2 **Client SPA:** Criar client `mcad-frontend`:
  - Client type: **Public** (sem client secret)
  - Standard flow enabled: **ON** (Authorization Code)
  - Direct access grants: **OFF**
  - Valid redirect URIs: `http://localhost:5173/*`
  - Valid post logout redirect URIs: `http://localhost:5173/*`
  - Web origins: `http://localhost:5173`
  - PKCE: **S256** (Advanced → Proof Key for Code Exchange)
- [x] 0.3 **Realm Roles:** Criar 2 roles:
  - `analista-cadastro` — Analista de Cadastro (leitura + escrita)
  - `consultor` — Consultor (somente leitura)
- [x] 0.4 **Usuário Analista (teste):** Criar usuário:
  - Username: `analista.teste`
  - Email: `analista@mcad.dev`
  - First Name: `Analista`
  - Last Name: `Teste`
  - Password: (definir, não temporário)
  - Role mapping: `analista-cadastro`
- [x] 0.5 **Usuário Consultor (teste):** Criar usuário:
  - Username: `consultor.teste`
  - Email: `consultor@mcad.dev`
  - First Name: `Consultor`
  - Last Name: `Teste`
  - Password: (definir, não temporário)
  - Role mapping: `consultor`
- [x] 0.6 **Verificar claim:** Obter token via Postman/curl com fluxo PKCE e verificar que `realm_access.roles` contém a role correta
- [x] 0.7 **Documentar:** Atualizar `.env` do backend e frontend com os dados reais do Keycloak

## Evidências de Execução

- Provisionamento automatizado por [scripts/provision-keycloak.sh](/home/tsgomes/mcad/scripts/provision-keycloak.sh)
- Realm validado via Admin API: `mcad`
- Client validado: `mcad-frontend` como public client, PKCE `S256`, `standardFlowEnabled=true`, `directAccessGrantsEnabled=false`
- Usuário `analista.teste` validado com role `analista-cadastro`
- Usuário `consultor.teste` validado com role `consultor`
- Token PKCE validado com `azp=mcad-frontend` e `realm_access.roles` contendo `analista-cadastro`
- Backend configurado em [/.env](/home/tsgomes/mcad/.env)
- Frontend configurado em [frontend/.env](/home/tsgomes/mcad/frontend/.env) e [frontend/.env.example](/home/tsgomes/mcad/frontend/.env.example)

## Detalhes — Obter Token para Verificação (curl)

```bash
# 1. Obter authorization URL (abrir no browser para login interativo)
# Ou usar Direct Grant temporariamente para teste:
curl -X POST https://{KEYCLOAK_HOST}/realms/mcad/protocol/openid-connect/token \
  -d "grant_type=password" \
  -d "client_id=mcad-frontend" \
  -d "username=analista.teste" \
  -d "password={PASSWORD}" \
  -d "scope=openid"

# 2. Decodificar o access_token (jwt.io) e verificar:
# - "realm_access": { "roles": ["analista-cadastro"] }
```

## Dados do .env (a serem preenchidos)

### Backend (.env)
```env
OIDC_AUTHORITY=https://{KEYCLOAK_HOST}/realms/mcad
OIDC_AUDIENCE=mcad-frontend
AUTH_ENABLED=true
```

### Frontend (.env)
```env
VITE_OIDC_AUTHORITY=https://{KEYCLOAK_HOST}/realms/mcad
VITE_OIDC_CLIENT_ID=mcad-frontend
VITE_OIDC_REDIRECT_URI=http://localhost:5173/callback
VITE_OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:5173
```

## Critérios de Sucesso (Verificáveis)

- [x] Realm `mcad` existe no Keycloak
- [x] Client `mcad-frontend` configurado como Public + PKCE S256
- [x] Roles `analista-cadastro` e `consultor` existem
- [x] Usuário `analista.teste` tem role `analista-cadastro`
- [x] Usuário `consultor.teste` tem role `consultor`
- [x] Token obtido contém `realm_access.roles` com a role correta
- [x] .env do backend e frontend preenchidos com dados reais
