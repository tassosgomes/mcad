---
status: completed
parallelizable: false
blocked_by: ["2.0"]
---

<task_context>
<domain>backend/testing</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies></dependencies>
<unblocks>"10.0"</unblocks>
</task_context>

# Tarefa 3.0: Backend — Testes (unitários ClaimsTransformation + integração auth)

## Visão Geral

Testes unitários do KeycloakClaimsTransformation e testes de integração com mock JWT para validar que endpoints estão corretamente protegidos (401 sem token, 403 consultor→write, 200 consultor→read, 200 analista→write).

## Arquivos Envolvidos

- **Criar:**
  - `5-Tests/Cadastro.UnitTests/Infrastructure/KeycloakClaimsTransformationTests.cs`
  - `5-Tests/Cadastro.IntegrationTests/AuthEndpointsTests.cs`
- **Modificar:**
  - `5-Tests/Cadastro.IntegrationTests/Fixtures/CadastroApiFactory.cs` — configurar mock JWT para testes (AddAuthentication com mock scheme ou TestAuthHandler)

## Subtarefas

- [x] 3.1 ClaimsTransformationTests: com realm_access (extrai roles), sem realm_access (não falha), com roles vazio
- [x] 3.2 CadastroApiFactory: configurar TestAuthHandler que gera tokens com roles parametrizáveis
- [x] 3.3 AuthEndpointsTests: GET /titulares sem token → 401, GET /titulares com consultor → 200, POST /titulares com consultor → 403, POST /titulares com analista → 201 (ou 400/422 por validação, não 403), GET /health sem token → 200
- [x] 3.4 Verificar que testes existentes continuam passando (ajustar para enviar token)

## Critérios de Sucesso (Verificáveis)

- [x] `dotnet test` — todos passam (existentes + novos)
- [x] Mínimo 3 testes unitários + 5 testes integração auth
- [x] Testes existentes adaptados para enviar token mock

## Evidências de Execução

- Criado `KeycloakClaimsTransformationTests` com 3 cenários: extração de roles, ausência de `realm_access` e lista de roles vazia.
- Criado `AuthEndpointsTests` com 5 cenários: `401` sem token, `200` para leitura com `consultor`, `403` para escrita com `consultor`, `201` para escrita com `analista-cadastro` e `200` em `/health` sem autenticação.
- `CadastroApiFactory` passou a configurar `TestAuthHandler` e helpers para cliente autenticado/não autenticado, além de reafirmar o ambiente OIDC de teste antes de cada host/client para evitar race entre fixtures.
- Testes existentes que usavam `WithWebHostBuilder(...).CreateClient()` foram ajustados para usar cliente autenticado da factory.
- Validação executada com sucesso:
  - `dotnet test 5-Tests/Cadastro.UnitTests/Cadastro.UnitTests.csproj` → 170 testes passando
  - `dotnet test 5-Tests/Cadastro.IntegrationTests/Cadastro.IntegrationTests.csproj` → 64 testes passando
