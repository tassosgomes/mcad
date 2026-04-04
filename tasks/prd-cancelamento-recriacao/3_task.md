---
status: completed
parallelizable: false
blocked_by: [2.0]
---

<task_context>
<domain>identificacao/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>"4.0"</unblocks>
</task_context>

# Tarefa 3.0: Backend — Application (PodeCancelar, CancelarRol) + Testes

## Relacionada aos Requisitos

- RF-01 — CancelarRolCommandHandler (justificativa + opções de recriação)
- RF-02 — Evento outbox `identificacao.rol.cancelado`
- RF-03 — 3 opções de recriação (COPIAR_EXECUCOES, RECRIAR_VAZIA, APENAS_CANCELAR)
- RF-04 — PodeCancelarQueryHandler (verifica flag distribuição)

## Visão Geral

Implementar query de verificação prévia e command de cancelamento com 3 opções de recriação atômicas, testes unitários.

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/2-Application/Identificacao.Application/Cancelamento/Queries/PodeCancelarQuery.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Cancelamento/Queries/PodeCancelarQueryHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Cancelamento/Commands/CancelarRolCommand.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Cancelamento/Commands/CancelarRolCommandHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Cancelamento/Responses/CancelamentoResponse.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Cancelamento/Responses/PodeCancelarResponse.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Cancelamento/Payloads/RolCanceladoPayload.cs`
  - `services/identificacao-api/5-Tests/Identificacao.Tests/Application/CancelarRolCommandHandlerTests.cs`

## Subtarefas

- [x] 3.1 Criar `PodeCancelarResponse`, `CancelamentoResponse`, `RolCanceladoPayload` (DTOs)
- [x] 3.2 Criar `PodeCancelarQuery` + handler — checa FECHADA + não processada
- [x] 3.3 Criar `CancelarRolCommand` + validator (justificativa min 10, opcaoRecriacao enum) + handler
- [x] 3.4 No handler: cancelar + outbox + recriação condicional (COPIAR_EXECUCOES com batch + reconsulta Cadastro, RECRIAR_VAZIA, APENAS_CANCELAR)
- [x] 3.5 Testes `CancelarRolCommandHandlerTests` — 7 cenários

## Sequenciamento

- Bloqueado por: 2.0
- Desbloqueia: 4.0
- Paralelizável: Não

## Detalhes de Implementação

**CancelarRolCommandHandler:** conforme TechSpec — valida propriedade + `captacao.Cancelar()`, cria evento outbox, recriação condicional (nova captação + cópia de execuções em batch de 100 com re-verificação de status via Cadastro), save atômico.

**Validator:**
```csharp
public class CancelarRolCommandValidator : AbstractValidator<CancelarRolCommand>
{
    public CancelarRolCommandValidator()
    {
        RuleFor(x => x.Justificativa).NotEmpty().MinimumLength(10).MaximumLength(1000);
        RuleFor(x => x.OpcaoRecriacao).Must(o =>
            o is "COPIAR_EXECUCOES" or "RECRIAR_VAZIA" or "APENAS_CANCELAR");
    }
}
```

**Testes (7):**
1. `Handle_ApenasCanc_CancelaSemNovaCaptacao`
2. `Handle_RecriarVazia_NovaCaptacaoSemExecucoes`
3. `Handle_CopiarExecucoes_NovaCaptacaoComExecucoes`
4. `Handle_OutroAnalista_LancaForbidden`
5. `Handle_DistribuicaoProcessada_LancaDomainException`
6. `Handle_JustificativaVazia_LancaValidation`
7. `Handle_EventoOutboxCriado`

## Critérios de Sucesso (Verificáveis)

- [ ] Build: `cd services/identificacao-api && dotnet build`
- [ ] Testes: `cd services/identificacao-api && dotnet test --filter "FullyQualifiedName~CancelarRol"`
- [ ] 7 cenários cobertos
- [ ] Opção COPIAR_EXECUCOES copia execuções com novos IDs
- [ ] Evento outbox na mesma transação
