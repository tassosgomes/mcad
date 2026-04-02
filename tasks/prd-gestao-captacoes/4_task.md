---
status: completed
parallelizable: false
blocked_by: [2.0, 3.0]
---

<task_context>
<domain>identificacao/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>"5.0"</unblocks>
</task_context>

# Tarefa 4.0: Backend — Application Layer (Commands, Queries, Validators, Responses)

## Relacionada aos Requisitos

- RF-01 Criar Captação — `CriarCaptacaoCommandHandler` (RN-01, RN-07, RN-08)
- RF-02 Listar Captações — `ListarCaptacoesQueryHandler`
- RF-03 Visualizar Detalhes — `GetCaptacaoByIdQueryHandler`
- RF-04 Editar Captação — `AtualizarCaptacaoCommandHandler` (RN-01, RN-08, rubrica bloqueada)
- RF-05 Excluir Captação — `ExcluirCaptacaoCommandHandler` (RN-08, somente ABERTA)

## Visão Geral

Implementar todos os commands, queries, handlers, validators e DTOs de response para Captações e Rubricas. Cada handler encapsula uma regra de negócio específica e é testado unitariamente.

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/2-Application/Identificacao.Application/Rubricas/Queries/ListarRubricasQuery.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Rubricas/Queries/ListarRubricasQueryHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Rubricas/Responses/RubricaResponse.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Commands/CriarCaptacaoCommand.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Commands/CriarCaptacaoCommandHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Commands/AtualizarCaptacaoCommand.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Commands/AtualizarCaptacaoCommandHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Commands/ExcluirCaptacaoCommand.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Commands/ExcluirCaptacaoCommandHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Queries/ListarCaptacoesQuery.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Queries/ListarCaptacoesQueryHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Queries/GetCaptacaoByIdQuery.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Queries/GetCaptacaoByIdQueryHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Responses/CaptacaoResponse.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Responses/CaptacaoDetalheResponse.cs`
  - `services/identificacao-api/5-Tests/Identificacao.Tests/Application/CriarCaptacaoCommandHandlerTests.cs`
  - `services/identificacao-api/5-Tests/Identificacao.Tests/Application/AtualizarCaptacaoCommandHandlerTests.cs`
  - `services/identificacao-api/5-Tests/Identificacao.Tests/Application/ExcluirCaptacaoCommandHandlerTests.cs`
- **Referência:**
  - `services/cadastro-api/2-Application/Cadastro.Application/Obras/Commands/CriarObraCommandHandler.cs`
  - `services/cadastro-api/2-Application/Cadastro.Application/Obras/Queries/ListarObrasQueryHandler.cs`

## Subtarefas

- [x] 4.1 Criar DTOs de response: `RubricaResponse`, `CaptacaoResponse`, `CaptacaoDetalheResponse`
- [x] 4.2 Criar `ListarRubricasQuery` + handler
- [x] 4.3 Criar `CriarCaptacaoCommand` + validator + handler (RN-01: verifica unicidade, RN-08: analista do JWT)
- [x] 4.4 Criar `AtualizarCaptacaoCommand` + validator + handler (RN-01, RN-08, rubrica bloqueada com execuções)
- [x] 4.5 Criar `ExcluirCaptacaoCommand` + handler (RN-08, valida ABERTA, cascade delete)
- [x] 4.6 Criar `ListarCaptacoesQuery` + handler (filtros, paginação, sort)
- [x] 4.7 Criar `GetCaptacaoByIdQuery` + handler (com resumo de execuções)
- [x] 4.8 Testes unitários de handlers (CriarCaptacao, AtualizarCaptacao, ExcluirCaptacao)

## Sequenciamento

- Bloqueado por: 2.0, 3.0
- Desbloqueia: 5.0
- Paralelizável: Não

## Detalhes de Implementação

**CriarCaptacaoCommandHandler:**
```csharp
public class CriarCaptacaoCommandHandler : ICommandHandler<CriarCaptacaoCommand, CaptacaoResponse>
{
    private readonly ICaptacaoRepository _captacaoRepo;
    private readonly IRubricaRepository _rubricaRepo;

    public async Task<CaptacaoResponse> HandleAsync(CriarCaptacaoCommand cmd, CancellationToken ct)
    {
        var rubrica = await _rubricaRepo.GetByIdAsync(cmd.RubricaId, ct)
            ?? throw new NotFoundException("Rubrica não encontrada.", cmd.RubricaId);

        // RN-01: unicidade rubrica+período
        if (await _captacaoRepo.ExisteAtivaParaRubricaPeriodoAsync(cmd.RubricaId, cmd.Periodo, null, ct))
            throw new ConflictException($"Já existe uma captação ativa para {rubrica.Nome} em {cmd.Periodo}",
                "CAPTACAO_DUPLICADA");

        // RN-08: analista do JWT
        var captacao = Captacao.Criar(cmd.RubricaId, cmd.Periodo, cmd.UsuarioDeMusica,
            cmd.AnalistaId, cmd.AnalistaNome);

        await _captacaoRepo.AddAsync(captacao, ct);
        await _captacaoRepo.SaveChangesAsync(ct);

        return MapToResponse(captacao, rubrica);
    }
}
```

**Nota:** `AnalistaId` e `AnalistaNome` são adicionados ao command no endpoint (extraídos do JWT), não vêm do request body.

**AtualizarCaptacaoCommandHandler — rubrica bloqueada:**
```csharp
// Verificar se rubrica mudou E se há execuções
if (captacao.RubricaId != cmd.RubricaId)
{
    var totalExecucoes = await _captacaoRepo.ContarExecucoesAsync(captacao.Id, ct);
    if (totalExecucoes > 0)
        throw new ConflictException(
            "Não é possível alterar a rubrica de uma captação que já possui execuções",
            "RUBRICA_BLOQUEADA");
}
```

**GetCaptacaoByIdQueryHandler — resumo de execuções:**
```csharp
// ContarExecucoesAsync retorna 0 até F02/F03 ser implementado
var totalExecucoes = await _captacaoRepo.ContarExecucoesAsync(query.Id, ct);
var resumo = new ResumoExecucoesResponse(
    Total: totalExecucoes,
    Identificadas: 0,  // Será implementado em F04
    Pendentes: 0        // Será implementado em F04
);
```

**CaptacaoResponse:**
```csharp
public record CaptacaoResponse(
    Guid Id,
    RubricaResponse Rubrica,
    string Periodo,
    string UsuarioDeMusica,
    string Status,
    AnalistaResumoResponse AnalistaResponsavel,
    DateTime CriadoEm,
    DateTime AtualizadoEm
);

public record AnalistaResumoResponse(Guid Id, string Nome);
public record ResumoExecucoesResponse(int Total, int Identificadas, int Pendentes);

public record CaptacaoDetalheResponse(
    Guid Id,
    RubricaResponse Rubrica,
    string Periodo,
    string UsuarioDeMusica,
    string Status,
    AnalistaResumoResponse AnalistaResponsavel,
    ResumoExecucoesResponse ResumoExecucoes,
    DateTime CriadoEm,
    DateTime AtualizadoEm
);
```

**Validators (FluentValidation):**
```csharp
public class CriarCaptacaoCommandValidator : AbstractValidator<CriarCaptacaoCommand>
{
    public CriarCaptacaoCommandValidator()
    {
        RuleFor(x => x.RubricaId).NotEmpty();
        RuleFor(x => x.Periodo).NotEmpty();
        RuleFor(x => x.UsuarioDeMusica).NotEmpty().MaximumLength(255);
    }
}
```

**Testes — cenários obrigatórios:**

*CriarCaptacaoCommandHandlerTests:*
1. `Handle_DadosValidos_CriaCaptacaoAberta`
2. `Handle_RubricaPeriodoDuplicado_LancaConflictException` (RN-01)
3. `Handle_RubricaInexistente_LancaNotFoundException`

*AtualizarCaptacaoCommandHandlerTests:*
4. `Handle_CaptacaoAberta_AtualizaDados`
5. `Handle_CaptacaoFechada_LancaDomainException`
6. `Handle_OutroAnalista_LancaForbiddenException` (RN-08)
7. `Handle_AlteraRubricaComExecucoes_LancaConflictException`
8. `Handle_AlteraRubricaSemExecucoes_Permite`
9. `Handle_NovaCombinacaoDuplicada_LancaConflictException` (RN-01)

*ExcluirCaptacaoCommandHandlerTests:*
10. `Handle_CaptacaoAberta_ExcluiComSucesso`
11. `Handle_CaptacaoFechada_LancaDomainException`
12. `Handle_OutroAnalista_LancaForbiddenException`

**Convenções:**
- Padrão AAA (Arrange-Act-Assert) nos testes
- Mock de repositórios via Moq
- Handlers injetam repositórios via construtor
- Mapping estático em helper ou no handler

## Critérios de Sucesso (Verificáveis)

- [x] Build compila: `cd services/identificacao-api && dotnet build`
- [x] Testes passam: `cd services/identificacao-api && dotnet test`
- [x] 12 cenários de teste cobertos
- [x] Todos os 5 RFs mapeados para handlers específicos
