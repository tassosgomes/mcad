---
status: pending
parallelizable: true
blocked_by: ["9.0", "10.0"]
---

<task_context>
<domain>cadastro/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>"15.0", "16.0"</unblocks>
</task_context>

# Tarefa 12.0: Aprovação/Rejeição de Solicitações pelo Analista (RF-16, RF-18, RF-19)

## Visão Geral

Implementar os endpoints de Analista para listar, aprovar e rejeitar solicitações de alteração de dados sensíveis. Ao aprovar, o handler **aplica o efeito colateral** no titular (muda nome/CAE/associação/categoria), revalidando invariantes de domínio. Auditoria two-tier registra antes/depois.

## Requisitos

- RF-16 (alteração só aplicada quando `APROVADA`), RF-18 (registra quem aprovou, quando, valor anterior e novo), RF-19 (rejeitada registra justificativa)
- Tech Spec — seção *Fluxo de Aprovação de Solicitação* e *Endpoints de API (Analista)*

## Subtarefas

- [ ] 12.1 Criar `2-Application/Cadastro.Application/Solicitacoes/Commands/AprovarSolicitacaoCommand.cs` (`record AprovarSolicitacaoCommand(Guid Id, Guid AnalistaId) : ICommand<SolicitacaoResponse>`).
- [ ] 12.2 Criar `AprovarSolicitacaoCommandHandler.cs` — seguir o fluxo da Tech Spec:
  1. Carregar `SolicitacaoAlteracao` (tracked) → se não existe, `NotFoundException`.
  2. Carregar `Titular` (tracked) via `GetByIdForUpdateAsync`.
  3. `solicitacao.Aprovar(analistaId)` — transição de estado (state machine valida).
  4. **Aplicar efeito colateral** no titular conforme `Campo`:
     - `NOME` → `titular.AtualizarNome(valorPretendido)` (ou método existente).
     - `CAE_IPI` → atualizar CAE/IPI (recriar VO `CaeIpi.Create` → `DomainException` se inválido).
     - `ASSOCIACAO` → trocar `AssociacaoId` (revalidar que a associação de destino existe via `IAssociacaoRepository`; se não existe → `DomainException` → 422; **nunca permitir vazio** — RF-20 já validado na criação).
     - `CATEGORIA` → atualizar categoria.
  5. Audit publisher registra diff before/after no `Titular` (RF-18).
  6. `_outbox.AddEvent(EventTypes.TitularContatoAtualizado, ...)` se aplicável (não para nome/CAE — apenas contato; para associação, pode emitir evento específico se desejado, mas o PRD só exige contato).
  7. `SaveChangesAsync` — atômico (solicitação + titular + outbox + audit).
- [ ] 12.3 Criar `RejeitarSolicitacaoCommand.cs` (`record RejeitarSolicitacaoCommand(Guid Id, string JustificativaRejeicao, Guid AnalistaId)`) + `RejeitarSolicitacaoCommandHandler.cs` — `solicitacao.Rejeitar(analistaId, justificativa)` (RF-19). Sem efeito colateral no titular.
- [ ] 12.4 Criar `2-Application/Cadastro.Application/Solicitacoes/Queries/ListarSolicitacoesQuery.cs` + handler — lista todas as solicitações com filtros (RF: painel do analista).
- [ ] 12.5 Criar `1-Services/Cadastro.API/Endpoints/SolicitacaoAlteracaoEndpoints.cs` — grupo `/api/v1/solicitacoes-alteracao` (scheme Keycloak):
  - `GET /` — `.RequireCadastroPermission(CadastroPermissions.SolicitacaoAlteracaoListar)`
  - `POST /{id}/aprovar` — `.RequireCadastroPermission(CadastroPermissions.SolicitacaoAlteracaoAprovar)`
  - `POST /{id}/rejeitar` — `.RequireCadastroPermission(CadastroPermissions.SolicitacaoAlteracaoRejeitar)`
  - Registrar `MapSolicitacaoAlteracaoEndpoints(app)` no `Program.cs`.
- [ ] 12.6 Testes unitários (`5-Tests/Cadastro.UnitTests/Solicitacoes/`):
  - `AprovarSolicitacaoCommandHandlerTests.cs`:
    - `NOME` aprovada → titular.Nome alterado + audit com diff (RF-16, RF-18).
    - `ASSOCIACAO` aprovada com destino válido → `AssociacaoId` trocado.
    - `ASSOCIACAO` com destino inexistente → `DomainException` (associação não existe) → 422; solicitação não persistida inconsistente.
    - `APROVADA` → aprovar de novo → `DomainException`.
  - `RejeitarSolicitacaoCommandHandlerTests.cs` — registra justificativa (RF-19); titular não alterado.

## Sequenciamento

- Bloqueado por: 9.0 (entidade SolicitacaoAlteracao + repo titular), 10.0 (permissões)
- Desbloqueia: 15.0 (frontend analista), 16.0 (testes E2E)
- Paralelizável: Sim (paralelo a 11.0 — triagem de ocorrências)

## Detalhes de Implementação

**Efeito colateral seguro:** o handler revalida invariantes no domínio. Se a associação de destino não existe, `IAssociacaoRepository.GetByIdAsync` retorna null → `DomainException` ou `NotFoundException`. A transação inteira (solicitação + titular + outbox + audit) é atômica — se qualquer passo falhar, nada é persistido (o `SaveChangesAsync` é único).

**Captura do "antes" para auditoria (RF-18):** o audit publisher lê `OriginalValues` do titular tracked **antes** da mutação. Seguir exatamente o padrão de `AtualizarTitularCommandHandler` existente (que já produz diff de nome/CAE/etc.).

**Métodos de mutação do Titular:** verificar quais métodos existem (`AtualizarNome`, `Atualizar`, etc.). Se não houver método focado para trocar apenas a associação, adicionar `titular.AlterarAssociacao(Guid novaAssociacaoId)` à entidade (mantendo private setter). Esta adição à entidade `Titular` pode ser feita aqui ou na tarefa 2.0 — coordenar.

## Critérios de Sucesso

- Solicitação `APROVADA` aplica a alteração no titular (RF-16) e registra auditoria com valor anterior/novo/autor/data (RF-18).
- Solicitação `REJEITADA` registra justificativa e não altera o titular (RF-19).
- Aprovação de associação com destino inexistente rejeitada (integridade preservada).
- Transição inválida (`APROVADA` → `APROVADA`) → 422.
- Endpoints protegidos por permissões do analista (sem permissão → 403).
- `dotnet test 5-Tests/Cadastro.UnitTests` passa.
