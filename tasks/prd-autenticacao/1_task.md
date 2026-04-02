---
status: completed
parallelizable: true
blocked_by: ["0.0"]
---

<task_context>
<domain>backend/api</domain>
<type>implementation</type>
<scope>configuration</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"2.0"</unblocks>
</task_context>

# Tarefa 1.0: Backend — JWT Authentication + ClaimsTransformation + Policies + AUTH_ENABLED

## Visão Geral

Configurar autenticação JWT Bearer no Program.cs, criar KeycloakClaimsTransformation (mapeia realm_access.roles → ClaimTypes.Role), definir policies `read` e `write`, e implementar flag AUTH_ENABLED para modo dev.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/1-Services/Cadastro.API/Infrastructure/KeycloakClaimsTransformation.cs`
- **Modificar:**
  - `services/cadastro-api/1-Services/Cadastro.API/Program.cs` — +AddAuthentication(JwtBearer), +AddAuthorization(policies), +ClaimsTransformation, +UseAuthentication/UseAuthorization, +AUTH_ENABLED flag
  - `services/cadastro-api/.env.example` — +OIDC_AUTHORITY, +OIDC_AUDIENCE, +AUTH_ENABLED
- **NuGet:** `Microsoft.AspNetCore.Authentication.JwtBearer`
- **Referência:** `docs/architecture/auth-plan.md`, `tasks/prd-autenticacao/techspec.md`

## Subtarefas

- [x] 1.1 Instalar `Microsoft.AspNetCore.Authentication.JwtBearer` no projeto API
- [x] 1.2 Criar `KeycloakClaimsTransformation` — parseia `realm_access` claim, extrai `roles[]`, adiciona como `ClaimTypes.Role`
- [x] 1.3 Program.cs: AddAuthentication(JwtBearer) com Authority/Audience do env
- [x] 1.4 Program.cs: AddAuthorization com policies `write` (analista-cadastro) e `read` (analista-cadastro + consultor)
- [x] 1.5 Program.cs: UseAuthentication + UseAuthorization (entre UseCors e endpoints)
- [x] 1.6 Program.cs: AUTH_ENABLED flag — se "false", skip authentication/authorization + log warning
- [x] 1.7 .env.example: +OIDC_AUTHORITY, +OIDC_AUDIENCE, +AUTH_ENABLED=true
- [x] 1.8 `dotnet build`

## Evidências de Execução

- `dotnet build Cadastro.API.csproj` executado com sucesso
- Com `AUTH_ENABLED=true`, `GET /api/v1/associacoes/` sem token retornou `401`
- Com `AUTH_ENABLED=false`, `GET /api/v1/associacoes/` sem token retornou `200`
- `/health` permaneceu público com `200` nos dois modos
- `KeycloakClaimsTransformation` validado com probe isolado, retornando as roles `analista-cadastro,consultor`
- Fallback policy autenticada adicionada para tornar a configuração verificável antes da task 2; a task 2 continua responsável por aplicar `read` e `write` explicitamente por endpoint

## Critérios de Sucesso (Verificáveis)

- [x] `dotnet build` compila sem erros
- [x] Com AUTH_ENABLED=true: GET sem token → 401
- [x] Com AUTH_ENABLED=false: GET sem token → 200 (modo dev)
- [x] ClaimsTransformation extrai roles de realm_access
