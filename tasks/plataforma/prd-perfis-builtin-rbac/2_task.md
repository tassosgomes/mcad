---
status: completed
parallelizable: true
blocked_by: [1.0, 0.0]
---

<task_context>
<domain>engine/backend/cadastro</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>dotnet,httpcontext,ecad-authz-aspnetcore</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 2.0: Implementar mascaramento server-side de CPF no Cadastro (.NET) via permission-aware mapper

## Relacionada às User Stories

- [US-06] Operador de Suporte (LGPD com CPF mascarado) — cobertura direta

## Visão Geral

Implementar o mascaramento server-side de CPF/CNPJ no Cadastro, conforme ADR 0009. Introduzir a abstração `ICurrentUserPermissions`, a função pura `DocumentoMasking.Apply`, a implementação `HttpContextCurrentUserPermissions` que lê `HttpContext.User.Claims`, e modificar os query handlers de Titular para consumir o mapper consciente de permissão.

A permissão controle é `cadastro:default:titular:ver-cpf-completo`. Apenas perfis com essa permissão (Analista Cadastro, Gerente/Analista de Distribuição) recebem CPF completo; demais recebem mascarado.

**Bloqueio prévio:** Tarefa 0.0 precisa ter confirmado que o JWT do usuário é propagado em chamadas ACL Distribuição → Cadastro. Caso não seja, esta tarefa ganha subtarefas adicionais para implementar a propagação no `distribuicao-api`.

## Requisitos

- Abstração `ICurrentUserPermissions` em `Cadastro.Application/Common/Authorization/`.
- Implementação concreta `HttpContextCurrentUserPermissions` em `Cadastro.API/Authorization/` lendo claims `permission` do `HttpContext.User`.
- Função pura `DocumentoMasking.Apply` em `Cadastro.Application/Titulares/`.
- Modificar handlers que retornam `TitularResponse` ou DTOs com `Documento`/`DocumentoFormatado`.
- Registrar `IHttpContextAccessor` + `HttpContextCurrentUserPermissions` no DI (Scoped).
- Testes unitário (DocumentoMasking — função pura) e integration (matriz de caller × output).

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/2-Application/Cadastro.Application/Common/Authorization/ICurrentUserPermissions.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Titulares/DocumentoMasking.cs`
  - `services/cadastro-api/1-Services/Cadastro.API/Authorization/HttpContextCurrentUserPermissions.cs`
  - `services/cadastro-api/5-Tests/Cadastro.UnitTests/Titulares/DocumentoMaskingTests.cs`
  - `services/cadastro-api/5-Tests/Cadastro.IntegrationTests/Titulares/TitularCpfMaskingTests.cs`
- **Modificar:**
  - `services/cadastro-api/2-Application/Cadastro.Application/Titulares/Queries/ListarTitularesQueryHandler.cs` (constructor + map)
  - `services/cadastro-api/2-Application/Cadastro.Application/Titulares/Queries/BuscarTitularPorIdQueryHandler.cs` (constructor + map)
  - Demais handlers que retornem `Documento` em DTOs — a auditar via `grep -rn "Documento" services/cadastro-api/2-Application/Cadastro.Application/`
  - `services/cadastro-api/1-Services/Cadastro.API/Program.cs` (DI registration de `IHttpContextAccessor` e `ICurrentUserPermissions`)
- **Referência:**
  - `services/cadastro-api/2-Application/Cadastro.Application/Titulares/Responses/TitularResponse.cs` (DTO atual — preserva campos)
  - `services/cadastro-api/1-Services/Cadastro.API/Authorization/CadastroAuthorizationExtensions.cs` (padrão de uso do SDK ecad-authz)
  - `docs/adr/0009-cpf-masking-permission-aware-mapper.md`
- **Skills para consultar:**
  - `csharp-dotnet-architecture` — DI scoped, separação Application/API
  - `dotnet-testing` — AAA, `WebApplicationFactory`, mock de `ecad-authz` via `MockEcadAuthzServer`
  - `dotnet-code-quality` — naming, nullability

## Subtarefas

- [ ] 2.1 Criar `ICurrentUserPermissions.cs` (interface simples)
- [ ] 2.2 Criar `HttpContextCurrentUserPermissions.cs` lendo `HttpContext.User.HasClaim(c => c.Type == "permission" && c.Value == permission)`
- [ ] 2.3 Registrar `IHttpContextAccessor` + `HttpContextCurrentUserPermissions` (Scoped) em `Program.cs`
- [ ] 2.4 Criar `DocumentoMasking.cs` (função pura)
- [ ] 2.5 Auditar handlers que retornam `Documento` via `grep` e listar candidatos
- [ ] 2.6 Modificar `ListarTitularesQueryHandler` e `BuscarTitularPorIdQueryHandler` — receber `ICurrentUserPermissions` via DI, aplicar `DocumentoMasking.Apply`
- [ ] 2.7 Aplicar a mesma alteração nos demais handlers encontrados em 2.5
- [ ] 2.8 Implementar `DocumentoMaskingTests` (unit)
- [ ] 2.9 Implementar `TitularCpfMaskingTests` (integration, com `WebApplicationFactory` + `MockEcadAuthzServer`)
- [ ] 2.10 Garantir que testes existentes de Titulares continuam passando (matriz de regressão)
- [ ] 2.11 [Condicional, se Tarefa 0.0 indicou cenário B/C] Implementar propagação de JWT no cliente ACL de Distribuição (a ser desdobrado conforme investigação)

## Sequenciamento

- Bloqueado por: 1.0 (precisa da permissão `cadastro:default:titular:ver-cpf-completo` registrada no `ecad-authz`); 0.0 (precisa do desfecho da investigação de JWT — pode ser uma das subtarefas 2.11)
- Desbloqueia: nada diretamente (consumido por testes E2E e pela UI de Distribuição em Tarefa 7.0 indiretamente)
- Paralelizável: Sim — pode rodar em paralelo a 3.0, 4.0, 5.0

## Rastreabilidade

- Esta tarefa cobre: US-06 (LGPD), RF-07 (backward compat de CPF para Analista atual), parte da Conformidade LGPD do PRD
- Evidência esperada: testes integration provando que (a) `analista.dev` (com a permissão) recebe CPF completo, (b) `consultor.dev` (sem) recebe mascarado, (c) sem JWT → 401

## Detalhes de Implementação

### 2.1 `ICurrentUserPermissions.cs`

```csharp
namespace Cadastro.Application.Common.Authorization;

public interface ICurrentUserPermissions
{
    bool Has(string permission);
}
```

### 2.2 `HttpContextCurrentUserPermissions.cs`

```csharp
using Cadastro.Application.Common.Authorization;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace Cadastro.API.Authorization;

public sealed class HttpContextCurrentUserPermissions(IHttpContextAccessor accessor)
    : ICurrentUserPermissions
{
    public bool Has(string permission)
    {
        var user = accessor.HttpContext?.User;
        if (user?.Identity?.IsAuthenticated != true) return false;

        // O SDK Ecad.Authz.AspNetCore popula claims do tipo "permission".
        // Validar o nome exato do claim com a documentação do SDK e/ou debug.
        return user.HasClaim(c => c.Type == "permission" && c.Value == permission);
    }
}
```

> **Atenção:** confirmar o nome exato do claim populado pelo `Ecad.Authz.AspNetCore` (pode ser `permission`, `permissions`, `urn:ecad:permission` ou outro). Consultar o SDK em `/home/tsgomes/github-tassosgomes/ecad-authz/backend/sdk/dotnet/Ecad.Authz.AspNetCore/`.

### 2.3 `Program.cs` (registro DI)

```csharp
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserPermissions, HttpContextCurrentUserPermissions>();
```

### 2.4 `DocumentoMasking.cs`

```csharp
namespace Cadastro.Application.Titulares;

public static class DocumentoMasking
{
    private const string CpfMaskedRaw = "XXXXXXXXXXX";          // 11 X's
    private const string CnpjMaskedRaw = "XXXXXXXXXXXXXX";      // 14 X's
    private const string CpfMaskedFormatted = "XXX.***.***-XX"; // 14 chars (formato visual)
    private const string CnpjMaskedFormatted = "XX.XXX.***/****-XX"; // 18 chars

    public static (string Documento, string DocumentoFormatado) Apply(
        string documento,
        string documentoFormatado,
        bool fullAllowed)
    {
        if (fullAllowed) return (documento, documentoFormatado);

        return documento.Length switch
        {
            11 => (CpfMaskedRaw, CpfMaskedFormatted),
            14 => (CnpjMaskedRaw, CnpjMaskedFormatted),
            _ => (new string('X', documento.Length), documentoFormatado)
        };
    }
}
```

### 2.6 Exemplo de modificação em `ListarTitularesQueryHandler`

```csharp
public class ListarTitularesQueryHandler(
    ITitularRepository repository,
    ICurrentUserPermissions permissions) // NOVO
{
    public async Task<ListarTitularesResponse> Handle(ListarTitularesQuery query, CancellationToken ct)
    {
        var pagina = await repository.ListarAsync(/* ... */, ct);
        var fullCpf = permissions.Has("cadastro:default:titular:ver-cpf-completo");

        return new ListarTitularesResponse(
            pagina.Itens.Select(t =>
            {
                var (doc, docFmt) = DocumentoMasking.Apply(t.Documento, t.DocumentoFormatado, fullCpf);
                return new TitularItemResponse(
                    /* … */,
                    Documento: doc,
                    DocumentoFormatado: docFmt,
                    /* … */
                );
            }).ToList(),
            // demais campos
        );
    }
}
```

### 2.8 `DocumentoMaskingTests.cs` (unit, AAA)

```csharp
using AwesomeAssertions;
using Cadastro.Application.Titulares;
using Xunit;

namespace Cadastro.UnitTests.Titulares;

public class DocumentoMaskingTests
{
    [Fact]
    public void Apply_FullAllowedTrue_ReturnsOriginalValues()
    {
        // Arrange
        var documento = "12345678909";
        var documentoFormatado = "123.456.789-09";

        // Act
        var (doc, docFmt) = DocumentoMasking.Apply(documento, documentoFormatado, fullAllowed: true);

        // Assert
        doc.Should().Be("12345678909");
        docFmt.Should().Be("123.456.789-09");
    }

    [Fact]
    public void Apply_FullAllowedFalseAndCpf_ReturnsMaskedCpf()
    {
        var (doc, docFmt) = DocumentoMasking.Apply("12345678909", "123.456.789-09", fullAllowed: false);

        doc.Should().Be("XXXXXXXXXXX");
        docFmt.Should().Be("XXX.***.***-XX");
    }

    [Fact]
    public void Apply_FullAllowedFalseAndCnpj_ReturnsMaskedCnpj()
    {
        var (doc, docFmt) = DocumentoMasking.Apply("12345678000199", "12.345.678/0001-99", fullAllowed: false);

        doc.Should().Be("XXXXXXXXXXXXXX");
        docFmt.Should().Be("XX.XXX.***/****-XX");
    }
}
```

### 2.9 `TitularCpfMaskingTests.cs` (integration)

Estrutura (esqueleto AAA):

```csharp
public class TitularCpfMaskingTests : IClassFixture<CadastroIntegrationFixture>
{
    [Fact]
    public async Task GetTitular_CallerWithVerCpfCompleto_ReturnsDocumentoCompleto()
    {
        // Arrange
        var titular = await SeedTitularPf("12345678909");
        using var client = Factory.CreateClientWithPermissions(
            "cadastro:default:titular:visualizar",
            "cadastro:default:titular:ver-cpf-completo");

        // Act
        var response = await client.GetFromJsonAsync<TitularResponse>($"/api/v1/titulares/{titular.Id}");

        // Assert
        response!.Documento.Should().Be("12345678909");
        response.DocumentoFormatado.Should().Be("123.456.789-09");
    }

    [Fact]
    public async Task GetTitular_CallerWithoutVerCpfCompleto_ReturnsDocumentoMascarado()
    {
        // Arrange
        var titular = await SeedTitularPf("12345678909");
        using var client = Factory.CreateClientWithPermissions("cadastro:default:titular:visualizar");

        // Act
        var response = await client.GetFromJsonAsync<TitularResponse>($"/api/v1/titulares/{titular.Id}");

        // Assert
        response!.Documento.Should().Be("XXXXXXXXXXX");
        response.DocumentoFormatado.Should().Be("XXX.***.***-XX");
    }
}
```

**Convenções da stack (das skills consultadas):**

- AAA explícito em todos os testes (`csharp-dotnet-architecture` + `dotnet-testing`)
- Naming `MethodName_Condition_ExpectedBehavior` (ex.: `Apply_FullAllowedFalseAndCpf_ReturnsMaskedCpf`)
- AwesomeAssertions, não FluentAssertions ou xUnit `Assert.*` direto
- Mock HTTP do `ecad-authz` via `MockEcadAuthzServer` reusando padrão existente em `Cadastro.IntegrationTests/AuthEndpointsTests.cs`
- Testcontainers PostgreSQL para o banco
- Sem mocks de classes do próprio domínio (mockar apenas `ecad-authz` HTTP)

## Critérios de Sucesso (Verificáveis)

- [ ] Build compila: `cd services/cadastro-api && dotnet build`
- [ ] Unit tests passam: `cd services/cadastro-api && dotnet test 5-Tests/Cadastro.UnitTests --filter "FullyQualifiedName~DocumentoMasking"`
- [ ] Integration tests passam: `cd services/cadastro-api && dotnet test 5-Tests/Cadastro.IntegrationTests --filter "FullyQualifiedName~TitularCpfMasking"`
- [ ] Toda a suíte de Cadastro passa sem regressão: `cd services/cadastro-api && dotnet test` (todos os testes verdes)
- [ ] `dotnet format --verify-no-changes` passa (sem ofensa a code style)
- [ ] Manual: chamar `GET /api/v1/titulares/{id}` com JWT de `analista.dev` → CPF completo; com JWT de `consultor.dev` → mascarado
- [ ] `grep -rn "TitularResponse" services/cadastro-api/2-Application/Cadastro.Application/` mostra zero ocorrências onde o mapeamento não passa por `DocumentoMasking.Apply` (audit)
