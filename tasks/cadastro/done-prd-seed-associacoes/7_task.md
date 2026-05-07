---
status: done
parallelizable: false
blocked_by: ["6.0"]
---

<task_context>
<domain>backend/testing</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 7.0: Testes — Unitários e de Integração

## Relacionada às User Stories

- [HU-01] Consultar associações (validação)
- [HU-02] Associações disponíveis no startup (validação de seed)

## Visão Geral

Implementar testes unitários dos query handlers (mock do repositório) e testes de integração dos endpoints HTTP (WebApplicationFactory + Testcontainers PostgreSQL).

## Requisitos

- Testes unitários: handlers retornam dados corretos, handler por ID lança exception para ID inexistente
- Testes de integração: endpoints retornam status codes corretos, seed idempotente, 405 para escrita
- Padrão AAA (Arrange-Act-Assert)

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/5-Tests/Cadastro.UnitTests/Associacoes/GetAssociacoesQueryHandlerTests.cs`
  - `services/cadastro-api/5-Tests/Cadastro.UnitTests/Associacoes/GetAssociacaoByIdQueryHandlerTests.cs`
  - `services/cadastro-api/5-Tests/Cadastro.IntegrationTests/AssociacaoEndpointsTests.cs`
  - `services/cadastro-api/5-Tests/Cadastro.IntegrationTests/Fixtures/CadastroApiFactory.cs`
- **Referência:**
  - `services/cadastro-api/2-Application/Cadastro.Application/Associacoes/Queries/`
  - `services/cadastro-api/1-Services/Cadastro.API/Endpoints/AssociacaoEndpoints.cs`
- **Skills para consultar:**
  - `dotnet-testing` — xUnit, AAA, Moq, WebApplicationFactory, Testcontainers

## Subtarefas

- [ ] 7.1 Criar `GetAssociacoesQueryHandlerTests` — mock retorna lista, verifica mapeamento
- [ ] 7.2 Criar `GetAssociacaoByIdQueryHandlerTests` — cenários encontrado e não encontrado
- [ ] 7.3 Criar `CadastroApiFactory` — WebApplicationFactory com Testcontainers PostgreSQL
- [ ] 7.4 Criar `AssociacaoEndpointsTests`:
  - GET /associacoes → 200 com 7 itens
  - GET /associacoes/{id} → 200 com dados corretos
  - GET /associacoes/{id-inexistente} → 404
  - POST /associacoes → 405
- [ ] 7.5 Executar: `dotnet test`

## Sequenciamento

- Bloqueado por: 6.0
- Desbloqueia: Nenhum
- Paralelizável: Não

## Detalhes de Implementação

### Teste Unitário (exemplo)

```csharp
public class GetAssociacoesQueryHandlerTests
{
    [Fact]
    public async Task HandleAsync_ReturnsAllAssociacoes_MappedToResponse()
    {
        // Arrange
        var associacoes = new List<Associacao>
        {
            new(Guid.NewGuid(), "ABRAMUS", "Associação Brasileira de Música e Artes", "50.997.063/0001-32")
        };
        var mockRepo = new Mock<IAssociacaoRepository>();
        mockRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(associacoes);
        var handler = new GetAssociacoesQueryHandler(mockRepo.Object);

        // Act
        var result = await handler.HandleAsync(new GetAssociacoesQuery(), CancellationToken.None);

        // Assert
        result.Should().HaveCount(1);
        result.First().Sigla.Should().Be("ABRAMUS");
    }
}
```

### Teste de Integração (exemplo)

```csharp
public class AssociacaoEndpointsTests : IClassFixture<CadastroApiFactory>
{
    private readonly HttpClient _client;

    public AssociacaoEndpointsTests(CadastroApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Get_Associacoes_Returns200_With7Items()
    {
        var response = await _client.GetAsync("/api/v1/associacoes");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<List<AssociacaoResponse>>();
        content.Should().HaveCount(7);
    }

    [Fact]
    public async Task Post_Associacoes_Returns405()
    {
        var response = await _client.PostAsync("/api/v1/associacoes", null);
        response.StatusCode.Should().Be(HttpStatusCode.MethodNotAllowed);
    }
}
```

**Convenções da stack:**
- Padrão AAA (Arrange-Act-Assert)
- Moq para mocks em unitários
- AwesomeAssertions (`.Should()`)
- Testcontainers PostgreSQL para integração
- Naming: `MetodoSobTeste_Cenario_ResultadoEsperado`

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet test services/cadastro-api/Cadastro.sln` — todos os testes passam
- [ ] Mínimo 4 testes unitários (2 por handler)
- [ ] Mínimo 4 testes de integração (GET lista, GET por ID, GET 404, POST 405)
- [ ] Testes de integração usam Testcontainers (sem dependência de banco externo)
