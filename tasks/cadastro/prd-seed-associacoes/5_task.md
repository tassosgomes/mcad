---
status: done
parallelizable: true
blocked_by: ["3.0"]
---

<task_context>
<domain>backend/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"6.0"</unblocks>
</task_context>

# Tarefa 5.0: Camada Application — CQRS Queries, Handlers e DTOs

## Relacionada às User Stories

- [HU-01] Consultar associações (suporte — lógica de consulta)

## Visão Geral

Implementar as interfaces base do CQRS nativo (IQuery, IQueryHandler, ICommand, ICommandHandler, IDispatcher), o Dispatcher, e os handlers de consulta de associações com DTOs de response.

## Requisitos

- Interfaces CQRS base reutilizáveis para features futuras
- Dispatcher nativo (sem MediatR)
- GetAssociacoesQuery + Handler — lista todas
- GetAssociacaoByIdQuery + Handler — busca por ID
- AssociacaoResponse DTO

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/2-Application/Cadastro.Application/Common/CQRS/IQuery.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Common/CQRS/IQueryHandler.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Common/CQRS/ICommand.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Common/CQRS/ICommandHandler.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Common/CQRS/IDispatcher.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Common/CQRS/Dispatcher.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Associacoes/Queries/GetAssociacoesQuery.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Associacoes/Queries/GetAssociacoesQueryHandler.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Associacoes/Queries/GetAssociacaoByIdQuery.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Associacoes/Queries/GetAssociacaoByIdQueryHandler.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Associacoes/Responses/AssociacaoResponse.cs`
- **Referência:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Interfaces/IAssociacaoRepository.cs`
- **Skills para consultar:**
  - `dotnet-architecture` — CQRS nativo, Dispatcher, registro no DI

## Subtarefas

- [ ] 5.1 Criar interfaces CQRS base (IQuery, IQueryHandler, ICommand, ICommandHandler, IDispatcher)
- [ ] 5.2 Criar Dispatcher nativo com reflection
- [ ] 5.3 Criar `AssociacaoResponse` record DTO
- [ ] 5.4 Criar `GetAssociacoesQuery` + `GetAssociacoesQueryHandler`
- [ ] 5.5 Criar `GetAssociacaoByIdQuery` + `GetAssociacaoByIdQueryHandler`
- [ ] 5.6 Verificar build: `dotnet build`

## Sequenciamento

- Bloqueado por: 3.0
- Desbloqueia: 6.0
- Paralelizável: Sim — pode executar em paralelo com 4.0

## Detalhes de Implementação

### DTO Response

```csharp
namespace Cadastro.Application.Associacoes.Responses;

public record AssociacaoResponse(Guid Id, string Sigla, string Nome, string Cnpj);
```

### Query + Handler (lista)

```csharp
public record GetAssociacoesQuery() : IQuery<IEnumerable<AssociacaoResponse>>;

public class GetAssociacoesQueryHandler : IQueryHandler<GetAssociacoesQuery, IEnumerable<AssociacaoResponse>>
{
    private readonly IAssociacaoRepository _repository;

    public GetAssociacoesQueryHandler(IAssociacaoRepository repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<AssociacaoResponse>> HandleAsync(
        GetAssociacoesQuery query, CancellationToken cancellationToken)
    {
        var associacoes = await _repository.GetAllAsync(cancellationToken);
        return associacoes.Select(a => new AssociacaoResponse(a.Id, a.Sigla, a.Nome, a.Cnpj));
    }
}
```

### Query + Handler (por ID) — lança exception se não encontrado

```csharp
public record GetAssociacaoByIdQuery(Guid Id) : IQuery<AssociacaoResponse>;

// Handler lança NotFoundException se não encontrar
```

**Convenções da stack:**
- Records para Queries e DTOs (imutáveis)
- Handler recebe repositório via construtor (DI)
- Mapeamento manual (sem AutoMapper/Mapster nesta feature simples)
- CancellationToken em todos os métodos async

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] Todas as interfaces CQRS são genéricas e reutilizáveis
- [ ] Dispatcher resolve handlers via DI (ServiceProvider)
- [ ] AssociacaoResponse é um record com 4 propriedades
