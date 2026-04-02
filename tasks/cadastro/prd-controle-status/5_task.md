---
status: done
parallelizable: true
blocked_by: ["4.0"]
---

<task_context>
<domain>backend/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies></dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 5.0: Application — Commands Obra (Liberar, Bloquear, Desbloquear) + PreRequisitosException + Responses

## Visão Geral

3 commands para transição de status da obra. LiberarObraHandler usa ValidadorLiberacaoObra e lança PreRequisitosException (422 com pendencias[]) se falhar. BloquearObraHandler registra histórico. DesbloquearObraHandler registra histórico.

## Arquivos Envolvidos

- **Criar:**
  - `2-Application/.../Status/Commands/LiberarObraCommand.cs` + Handler
  - `2-Application/.../Status/Commands/BloquearObraCommand.cs` + Handler + Validator
  - `2-Application/.../Status/Commands/DesbloquearObraCommand.cs` + Handler
  - `2-Application/.../Status/Responses/PreRequisitosResponse.cs`
  - `2-Application/.../Status/Responses/HistoricoBloqueioResponse.cs`
  - `2-Application/.../Common/Exceptions/PreRequisitosException.cs`

## Subtarefas

- [x] 5.1 Criar `PreRequisitosException` com property `Pendencias: IReadOnlyList<PreRequisito>` → 422
- [x] 5.2 `LiberarObraCommand(Guid Id)` + Handler: busca obra, valida status PENDENTE, busca soma titularidades (via ITitularidadeRepository), verifica ISWC. Invoca ValidadorLiberacaoObra.Validar(). Se algum não atendido → PreRequisitosException. Se todos atendidos → obra.Liberar(), save.
- [x] 5.3 `BloquearObraCommand(Guid Id, string Justificativa)` + Validator (mín 10 chars) + Handler: obra.Bloquear(), HistoricoBloqueio.CriarBloqueio(), save.
- [x] 5.4 `DesbloquearObraCommand(Guid Id)` + Handler: obra.Desbloquear(), HistoricoBloqueio.CriarDesbloqueio(), save.
- [x] 5.5 Criar `PreRequisitosResponse` e `HistoricoBloqueioResponse` records
- [x] 5.6 `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [x] Liberar obra completa → Liberado
- [x] Liberar obra sem ISWC → PreRequisitosException com pendencias[ISWC=false]
- [x] Bloquear com justificativa < 10 → ValidationException
- [x] Bloquear ok → BLOQUEADO + histórico registrado
- [x] Desbloquear → PENDENTE + histórico registrado
