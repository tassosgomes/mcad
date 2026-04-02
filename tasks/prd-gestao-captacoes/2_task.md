---
status: completed
parallelizable: false
blocked_by: [1.0]
---

<task_context>
<domain>identificacao/domain</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>none</dependencies>
<unblocks>"3.0, 4.0"</unblocks>
</task_context>

# Tarefa 2.0: Backend — Domain Layer (Entidades, Enums, Interfaces)

## Relacionada aos Requisitos

- RF-01 Criar Captação (factory method `Captacao.Criar()`)
- RF-04 Editar Captação ABERTA (método `Captacao.Atualizar()`, `ValidarPropriedade()`, `ValidarAberta()`)

## Visão Geral

Implementar as entidades de domínio Captação (aggregate root) e Rubrica (seed), o enum StatusCaptacao, as interfaces de repositório e a exceção de domínio. A Captação encapsula regras de negócio: factory method, validação de estado e propriedade.

## Requisitos

- Entidade Captação com factory method, validações de estado e propriedade
- Entidade Rubrica (seed, imutável)
- Enum StatusCaptacao (Aberta, Fechada, Cancelada)
- Interfaces de repositório (ICaptacaoRepository, IRubricaRepository)
- DomainException para regras violadas
- Testes unitários da entidade Captação

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/Captacao.cs`
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/Rubrica.cs`
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Enums/StatusCaptacao.cs`
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/ICaptacaoRepository.cs`
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/IRubricaRepository.cs`
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Exceptions/DomainException.cs`
  - `services/identificacao-api/5-Tests/Identificacao.Tests/Domain/CaptacaoTests.cs`
- **Referência:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/ObraMusical.cs` (padrão de entidade)
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/Associacao.cs` (padrão de seed entity)

## Subtarefas

- [x] 2.1 Criar enum `StatusCaptacao` (Aberta, Fechada, Cancelada)
- [x] 2.2 Criar entidade `Rubrica` com factory method estático e construtor privado
- [x] 2.3 Criar entidade `Captacao` com factory `Criar()`, métodos `Atualizar()`, `ValidarPropriedade()`, `ValidarAberta()`
- [x] 2.4 Criar `DomainException`
- [x] 2.5 Criar interfaces `ICaptacaoRepository` e `IRubricaRepository`
- [x] 2.6 Criar testes unitários `CaptacaoTests.cs`

## Sequenciamento

- Bloqueado por: 1.0
- Desbloqueia: 3.0, 4.0
- Paralelizável: Não

## Detalhes de Implementação

**Captacao.cs:**
```csharp
public class Captacao
{
    public Guid Id { get; private set; }
    public Guid RubricaId { get; private set; }
    public Rubrica Rubrica { get; private set; }
    public DateOnly Periodo { get; private set; }
    public string UsuarioDeMusica { get; private set; }
    public StatusCaptacao Status { get; private set; }
    public Guid AnalistaResponsavelId { get; private set; }
    public string AnalistaResponsavelNome { get; private set; }
    public DateTime CriadoEm { get; private set; }
    public DateTime AtualizadoEm { get; private set; }

    private Captacao() { } // EF Core

    public static Captacao Criar(Guid rubricaId, DateOnly periodo, string usuarioDeMusica,
        Guid analistaId, string analistaNome) => new()
    {
        Id = Guid.NewGuid(),
        RubricaId = rubricaId,
        Periodo = periodo,
        UsuarioDeMusica = usuarioDeMusica,
        Status = StatusCaptacao.Aberta,
        AnalistaResponsavelId = analistaId,
        AnalistaResponsavelNome = analistaNome,
        CriadoEm = DateTime.UtcNow,
        AtualizadoEm = DateTime.UtcNow
    };

    public void Atualizar(Guid rubricaId, DateOnly periodo, string usuarioDeMusica)
    {
        ValidarAberta();
        RubricaId = rubricaId;
        Periodo = periodo;
        UsuarioDeMusica = usuarioDeMusica;
        AtualizadoEm = DateTime.UtcNow;
    }

    public void ValidarPropriedade(Guid analistaId)
    {
        if (AnalistaResponsavelId != analistaId)
            throw new ForbiddenException("Apenas o analista responsável pode modificar esta captação.");
    }

    public void ValidarAberta()
    {
        if (Status != StatusCaptacao.Aberta)
            throw new DomainException("Apenas captações com status ABERTA podem ser modificadas.");
    }
}
```

**ICaptacaoRepository.cs:**
```csharp
public interface ICaptacaoRepository
{
    Task<Captacao?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<(IEnumerable<Captacao> Items, int Total)> ListarAsync(ListarCaptacoesQuery filtro, CancellationToken ct);
    Task<bool> ExisteAtivaParaRubricaPeriodoAsync(Guid rubricaId, DateOnly periodo, Guid? excluirId, CancellationToken ct);
    Task<int> ContarExecucoesAsync(Guid captacaoId, CancellationToken ct);
    Task AddAsync(Captacao captacao, CancellationToken ct);
    Task RemoveAsync(Captacao captacao, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}
```

**Testes unitários — cenários obrigatórios:**
1. `Criar_ComDadosValidos_RetornaCaptacaoAberta`
2. `Atualizar_CaptacaoAberta_AtualizaDados`
3. `Atualizar_CaptacaoFechada_LancaDomainException`
4. `ValidarPropriedade_OutroAnalista_LancaForbiddenException`
5. `ValidarPropriedade_AnalistaDono_NaoLancaExcecao`
6. `ValidarAberta_StatusAberta_NaoLancaExcecao`
7. `ValidarAberta_StatusFechada_LancaDomainException`

**Convenções:**
- Private setters em todas as propriedades
- Construtor privado sem parâmetros para EF Core
- Factory method estático `Criar()` para criação
- Lógica de negócio nos métodos da entidade
- DateTime sempre UTC

## Critérios de Sucesso (Verificáveis)

- [x] Build compila: `cd services/identificacao-api && dotnet build`
- [x] Testes passam: `cd services/identificacao-api && dotnet test --filter "FullyQualifiedName~CaptacaoTests"`
- [x] 7 cenários de teste cobertos
- [x] Entidade usa private setters e factory method
