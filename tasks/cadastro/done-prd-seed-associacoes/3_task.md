---
status: done
parallelizable: false
blocked_by: ["2.0"]
---

<task_context>
<domain>backend/domain</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies></dependencies>
<unblocks>"4.0, 5.0"</unblocks>
</task_context>

# Tarefa 3.0: Camada Domain — Entidade Associacao e Interface do Repositório

## Relacionada às User Stories

- [HU-02] Associações disponíveis no startup (suporte — modelo de dados)

## Visão Geral

Criar a entidade de domínio `Associacao` e a interface `IAssociacaoRepository` (read-only) na camada Domain. Esta camada não tem dependências externas.

## Requisitos

- Entidade com Id (Guid), Nome, Sigla, Cnpj
- Construtor que valida argumentos não-nulos
- Construtor privado para EF Core
- Interface de repositório apenas com métodos de leitura (GetAll, GetById)

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/Associacao.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Interfaces/IAssociacaoRepository.cs`
- **Skills para consultar:**
  - `dotnet-architecture` — Repository Pattern, entidades de domínio
  - `dotnet-code-quality` — convenções PascalCase, ArgumentNullException

## Subtarefas

- [ ] 3.1 Criar entidade `Associacao` com propriedades encapsuladas (private set)
- [ ] 3.2 Criar interface `IAssociacaoRepository` com GetAllAsync e GetByIdAsync
- [ ] 3.3 Verificar build: `dotnet build`

## Sequenciamento

- Bloqueado por: 2.0
- Desbloqueia: 4.0, 5.0
- Paralelizável: Não

## Detalhes de Implementação

### Entidade Associacao

```csharp
namespace Cadastro.Domain.Entities;

public class Associacao
{
    public Guid Id { get; private set; }
    public string Nome { get; private set; }
    public string Sigla { get; private set; }
    public string Cnpj { get; private set; }

    private Associacao() { } // EF Core

    public Associacao(Guid id, string nome, string sigla, string cnpj)
    {
        Id = id;
        Nome = nome ?? throw new ArgumentNullException(nameof(nome));
        Sigla = sigla ?? throw new ArgumentNullException(nameof(sigla));
        Cnpj = cnpj ?? throw new ArgumentNullException(nameof(cnpj));
    }
}
```

### Interface do Repositório

```csharp
namespace Cadastro.Domain.Interfaces;

public interface IAssociacaoRepository
{
    Task<IEnumerable<Associacao>> GetAllAsync(CancellationToken cancellationToken);
    Task<Associacao?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
}
```

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] Domain project continua com 0 PackageReferences
- [ ] Entidade tem construtor privado para EF Core
- [ ] Interface expõe apenas métodos de leitura
