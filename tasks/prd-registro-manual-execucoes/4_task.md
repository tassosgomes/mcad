---
status: completed
parallelizable: false
blocked_by: [3.0]
---

<task_context>
<domain>identificacao/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>"5.0"</unblocks>
</task_context>

# Tarefa 4.0: Backend — Application Layer (Commands, Queries, Handlers)

## Relacionada aos Requisitos

- RF-02 — CriarExecucaoCommandHandler (RN-02, RN-03, RN-04, RN-08, RN-12)
- RF-04 — ListarExecucoesQueryHandler
- RF-05 — AtualizarExecucaoCommandHandler (recalcula status)
- RF-06 — ExcluirExecucaoCommandHandler
- RF-07 — Validação campos condicionais por rubrica
- RF-08 — Duração calculada

## Visão Geral

Implementar todos os commands, queries, handlers, validators e responses para Execuções e TiposUtilizacao. Atualizar o handler de detalhe da captação (F01) para retornar contadores reais de execuções.

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/2-Application/Identificacao.Application/TiposUtilizacao/Queries/ListarTiposUtilizacaoQuery.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/TiposUtilizacao/Queries/ListarTiposUtilizacaoQueryHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/TiposUtilizacao/Responses/TipoUtilizacaoResponse.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Execucoes/Commands/CriarExecucaoCommand.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Execucoes/Commands/CriarExecucaoCommandHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Execucoes/Commands/AtualizarExecucaoCommand.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Execucoes/Commands/AtualizarExecucaoCommandHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Execucoes/Commands/ExcluirExecucaoCommand.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Execucoes/Commands/ExcluirExecucaoCommandHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Execucoes/Queries/ListarExecucoesQuery.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Execucoes/Queries/ListarExecucoesQueryHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Execucoes/Responses/ExecucaoResponse.cs`
  - `services/identificacao-api/5-Tests/Identificacao.Tests/Application/CriarExecucaoCommandHandlerTests.cs`
  - `services/identificacao-api/5-Tests/Identificacao.Tests/Application/AtualizarExecucaoCommandHandlerTests.cs`
  - `services/identificacao-api/5-Tests/Identificacao.Tests/Application/ExcluirExecucaoCommandHandlerTests.cs`
- **Modificar:**
  - `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Queries/GetCaptacaoByIdQueryHandler.cs` (alimentar ResumoExecucoes com contadores reais)
- **Referência:**
  - `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Commands/CriarCaptacaoCommandHandler.cs` (padrão de handler)
  - `tasks/prd-registro-manual-execucoes/techspec.md` (lógica do CriarExecucaoCommandHandler)

## Subtarefas

- [x] 4.1 Criar `TipoUtilizacaoResponse`, `ListarTiposUtilizacaoQuery` + handler
- [x] 4.2 Criar `ExecucaoResponse` (record com todos os campos do api-contract)
- [x] 4.3 Criar `CriarExecucaoCommand` + validator + handler 
- [x] 4.4 Criar `AtualizarExecucaoCommand` + validator + handler 
- [x] 4.5 Criar `ExcluirExecucaoCommand` + handler 
- [x] 4.6 Criar `ListarExecucoesQuery` + handler 
- [x] 4.7 Atualizar `GetCaptacaoByIdQueryHandler` 
- [x] 4.8 Testes unitários dos 3 command handlers

## Sequenciamento

- Bloqueado por: 3.0
- Desbloqueia: 5.0
- Paralelizável: Não

## Detalhes de Implementação

**CriarExecucaoCommandHandler:** conforme TechSpec Backend — valida captação (aberta, dono), valida campos condicionais (rubrica.ExigeClassificacao), consulta Cadastro (GetObraById, GetFonogramaById), define status, cria entidade.

**CriarExecucaoCommand — inclui AnalistaId do JWT:**
```csharp
public record CriarExecucaoCommand(
    Guid CaptacaoId, Guid ObraId, Guid? FonogramaId,
    TimeOnly Inicio, TimeOnly Fim, int Quantidade,
    Guid? TipoUtilizacaoId, string? TituloPrograma,
    Guid AnalistaId
) : ICommand<ExecucaoResponse>;
```

**Validator:**
```csharp
public class CriarExecucaoCommandValidator : AbstractValidator<CriarExecucaoCommand>
{
    public CriarExecucaoCommandValidator()
    {
        RuleFor(x => x.CaptacaoId).NotEmpty();
        RuleFor(x => x.ObraId).NotEmpty();
        RuleFor(x => x.Inicio).NotEmpty();
        RuleFor(x => x.Fim).NotEmpty();
        RuleFor(x => x.Quantidade).GreaterThanOrEqualTo(1);
        RuleFor(x => x.TituloPrograma).MaximumLength(255).When(x => x.TituloPrograma != null);
    }
}
```

**Nota:** A validação de campos condicionais (tipoUtilizacaoId obrigatório para audiovisual) é feita no handler, não no validator, porque depende de dados da captação (rubrica.ExigeClassificacao) que precisam ser buscados no banco.

**GetCaptacaoByIdQueryHandler — atualização:**
```csharp
// Substituir contadores zerados por dados reais:
var total = await _execucaoRepo.ContarPorCaptacaoAsync(query.Id, ct);
var identificadas = await _execucaoRepo.ContarIdentificadasAsync(query.Id, ct);
var pendentes = await _execucaoRepo.ContarPendentesAsync(query.Id, ct);
```

**Testes — cenários obrigatórios:**

*CriarExecucaoCommandHandlerTests:*
1. `Handle_ObraLiberada_StatusIdentificada`
2. `Handle_ObraPendente_StatusPendente`
3. `Handle_RubricaAudiovisualSemTipoUtilizacao_LancaDomainException`
4. `Handle_RubricaAudiovisualSemTituloPrograma_LancaDomainException`
5. `Handle_RubricaNaoAudiovisualSemTipoUtilizacao_Permite`
6. `Handle_CaptacaoFechada_LancaDomainException`
7. `Handle_OutroAnalista_LancaForbiddenException`

*AtualizarExecucaoCommandHandlerTests:*
8. `Handle_AlteraObra_RecalculaStatus`

*ExcluirExecucaoCommandHandlerTests:*
9. `Handle_CaptacaoAberta_ExcluiComSucesso`
10. `Handle_CaptacaoFechada_LancaDomainException`
11. `Handle_OutroAnalista_LancaForbiddenException`

## Critérios de Sucesso (Verificáveis)

- [x] Build compila: `cd services/identificacao-api && dotnet build`
- [x] Testes passam: `cd services/identificacao-api && dotnet test`
- [x] 11 cenários de teste cobertos
- [x] Todos os 8 RFs mapeados para handlers
- [x] GetCaptacaoByIdQueryHandler retorna contadores reais
