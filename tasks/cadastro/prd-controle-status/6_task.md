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

# Tarefa 6.0: Application — Commands Fonograma (Liberar, Bloquear, Desbloquear) + Query Histórico

## Visão Geral

3 commands para fonograma + query de histórico de bloqueios (reutilizável para obras e fonogramas). LiberarFonogramaHandler usa ValidadorLiberacaoFonograma com verificação de obra LIBERADA.

## Arquivos Envolvidos

- **Criar:**
  - `2-Application/.../Status/Commands/LiberarFonogramaCommand.cs` + Handler
  - `2-Application/.../Status/Commands/BloquearFonogramaCommand.cs` + Handler + Validator
  - `2-Application/.../Status/Commands/DesbloquearFonogramaCommand.cs` + Handler
  - `2-Application/.../Status/Queries/HistoricoBloqueiosQuery.cs` + Handler

## Subtarefas

- [x] 6.1 `LiberarFonogramaCommand(Guid Id)` + Handler: busca fonograma (Include Obra), valida PendenteDocumentacao, busca soma conexos, verifica obra.Status == Liberado. ValidadorLiberacaoFonograma.Validar(). Se falhar → PreRequisitosException. Se ok → fonograma.Liberar(), save.
- [x] 6.2 `BloquearFonogramaCommand(Guid Id, string Justificativa)` + Validator + Handler: fonograma.Bloquear(), histórico, save.
- [x] 6.3 `DesbloquearFonogramaCommand(Guid Id)` + Handler: fonograma.Desbloquear() → PendenteValidacao, histórico, save.
- [x] 6.4 `HistoricoBloqueiosQuery(string EntidadeTipo, Guid EntidadeId)` + Handler: busca histórico ordenado por DataHora DESC, mapeia para HistoricoBloqueioResponse[].
- [x] 6.5 `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [x] Liberar fonograma com obra PENDENTE → PreRequisitosException (Obra LIBERADA=false)
- [x] Liberar fonograma completo → Liberado
- [x] Bloquear → BLOQUEADO + histórico
- [x] Desbloquear → PENDENTE_VALIDACAO
- [x] HistoricoBloqueiosQuery retorna array ordenado
