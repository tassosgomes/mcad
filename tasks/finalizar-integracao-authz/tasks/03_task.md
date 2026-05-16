---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>backend/cadastro-api</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database,http_server</dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 3.0: Cadastro API (.NET) — ampliar `AuthEndpointsTests.cs` cobrindo CT-CAD-R01..R07

## Relacionada às User Stories

- US-01 — Dev roda testes locais 100% verde (cobertura direta)
- US-03 — CI bloqueia regressão authz (direta)

## Visão Geral

`AuthEndpointsTests.cs` já existe (11+ testes inclusos nos 154 do `dotnet test`). Ampliar a matriz para cobrir os 6 endpoints/recursos principais (Obras, Titularidades, Participações, Fonogramas, Busca, Distribuição) com 3 estados cada: **sem JWT → 401**, **JWT sem permissão → 403 `PERMISSION_DENIED`**, **JWT com permissão → 200/201**. Mais 1 teste que valida o `startup catalog registration` (CT-CAD-R07).

## Requisitos

- Cobertura de 6 endpoints × 3 estados = 18 testes (alguns já podem existir; ampliar apenas o que falta)
- Cada teste seguindo o padrão `WebApplicationFactory` + `MockEcadAuthzServer` (não mockar `IAuthorizationService` diretamente — usar HTTP mock que retorna `{Allowed: bool, Reason: string}`)
- Assert sobre `ErrorResponse {code, message, correlationId}` quando 403
- 1 teste para o startup catalog registration (`CT-CAD-R07`): mock do POST `/v1/permission-catalog/register` deve receber payload com 41 chaves `cadastro:default:*`

## Arquivos Envolvidos

- **Modificar:**
  - `mcad/services/cadastro-api/5-Tests/Cadastro.IntegrationTests/AuthEndpointsTests.cs` — adicionar cenários faltantes
- **Criar (se ausentes):**
  - `mcad/services/cadastro-api/5-Tests/Cadastro.IntegrationTests/MockEcadAuthzServer.cs` (helper, se ainda não existir)
  - `mcad/services/cadastro-api/5-Tests/Cadastro.IntegrationTests/CatalogRegistrationTests.cs` — CT-CAD-R07
- **Referência:**
  - `mcad/services/cadastro-api/1-Services/Cadastro.API/Authorization/CadastroPermissions.cs` — fonte das 41 chaves
  - `mcad/services/cadastro-api/1-Services/Cadastro.API/Endpoints/*.cs` — endpoints alvo
  - `mcad/services/cadastro-api/5-Tests/Cadastro.UnitTests/AuthzSdk/{HttpEcadAuthzClientTests,PermissionAuthorizationHandlerTests}.cs` — testes unit do SDK (modelo)
  - `ecad-authz/backend/sdk/dotnet/Ecad.Authz.AspNetCore/PermissionAuthorizationHandler.cs` — implementação a testar
- **Skills para consultar durante implementação:**
  - `csharp-testing` (ou `dotnet-testing`) — xUnit AAA, `WebApplicationFactory`, naming `Method_When_Then`
  - `csharp-code-quality` — async/await, sem `Exception` genérica, nullable strict
  - `common-restful-api` — formato `ErrorResponse {code, message, correlationId, details}`

## Subtarefas

- [ ] 3.1 Mapear endpoints já cobertos vs faltantes em `AuthEndpointsTests.cs` (output: lista de gaps)
- [ ] 3.2 Adicionar/ampliar `MockEcadAuthzServer` para retornar `{Allowed: bool}` por chave de permissão (via dicionário injetado por teste)
- [ ] 3.3 Implementar matriz 3×N: para cada endpoint (Obra:listar/criar/editar/excluir, Titularidade:*, Participacao:*, etc.) gerar 3 testes
- [ ] 3.4 Implementar CT-CAD-R07: subir app via `WebApplicationFactory` com mock HTTP capturando `POST /v1/permission-catalog/register` e validar payload com 41 chaves
- [ ] 3.5 Garantir `ErrorResponse.correlationId` propagado (assertar header `X-Correlation-Id` no response)
- [ ] 3.6 Rodar `dotnet test` e atualizar `relatorio-final.md §5` com novo total

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 8.0 (E2E assume backends estáveis)
- Paralelizável: Sim (independente das outras Lanes Backend)

## Rastreabilidade

- Esta tarefa cobre: US-01, US-03
- Evidência esperada:
  - `dotnet test 5-Tests/Cadastro.IntegrationTests/AuthEndpointsTests.cs` retorna pelo menos os 18 cenários + CT-CAD-R07 verdes
  - Total geral do `dotnet test` mantém-se ≥ 154 + novos (mínimo 18, esperado ~25)

## Detalhes de Implementação

Padrão Arrange-Act-Assert (csharp-testing):

```csharp
[Fact]
public async Task PostObra_WhenJwtMissing_Returns401()
{
    // Arrange
    using var factory = new WebApplicationFactory<Program>()
        .WithWebHostBuilder(b => b.ConfigureServices(s => s.AddSingleton<MockEcadAuthzServer>()));
    var client = factory.CreateClient();

    // Act
    var resp = await client.PostAsJsonAsync("/api/v1/obras", new { /* payload */ });

    // Assert
    Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
}

[Fact]
public async Task PostObra_WhenJwtLacksPermission_Returns403WithPermissionDenied()
{
    // Arrange
    var mockAuthz = new MockEcadAuthzServer(allowed: false, reason: "PERMISSION_DENIED");
    using var factory = CreateFactoryWithMock(mockAuthz);
    var client = factory.CreateClient();
    client.DefaultRequestHeaders.Authorization = JwtFactory.For("consultor.dev");

    // Act
    var resp = await client.PostAsJsonAsync("/api/v1/obras", validPayload);

    // Assert
    Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    var error = await resp.Content.ReadFromJsonAsync<ErrorResponse>();
    Assert.Equal("PERMISSION_DENIED", error!.Code);
    Assert.NotNull(error.CorrelationId);
}
```

**Convenções da stack:**
- `csharp-testing`: naming `Endpoint_WhenCondition_ReturnsExpected`; usar `Theory` + `InlineData` para os 3 estados se for repetitivo
- `csharp-code-quality`: `await using` para `WebApplicationFactory`; sem `Result`/`Wait()`
- `common-restful-api`: `ErrorResponse` deve ter `code`, `message`, `correlationId`, `details` (opcional)

**Como rodar com Docker no WSL2:**
Os testes integration do Cadastro já passam 154/154 — manter mesma config Testcontainers.

## Critérios de Sucesso (Verificáveis)

- [ ] Testes passam: `cd mcad/services/cadastro-api && dotnet test 5-Tests/Cadastro.IntegrationTests --filter "FullyQualifiedName~AuthEndpointsTests"`
- [ ] Testes passam: `cd mcad/services/cadastro-api && dotnet test 5-Tests/Cadastro.IntegrationTests --filter "FullyQualifiedName~CatalogRegistrationTests"`
- [ ] Build compila: `cd mcad/services/cadastro-api && dotnet build`
- [ ] Total geral mantém-se verde: `cd mcad/services/cadastro-api && dotnet test` ≥ 154 + novos
- [ ] Lint/format: `cd mcad/services/cadastro-api && dotnet format --verify-no-changes`
