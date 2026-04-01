---
status: completed
parallelizable: true
blocked_by: ["4.0"]
---

<task_context>
<domain>backend/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies></dependencies>
<unblocks>"7.0"</unblocks>
</task_context>

# Tarefa 6.0: Application — Commands (Adicionar, AjustarPercentual, Remover, Calcular)

## Visão Geral

4 commands. `CalcularPercentuaisCommand` invoca o Domain Service `CalculadoraConexos`. Todos verificam status do fonograma (LIBERADO → depuração, DEPURADO → rejeita). Adicionar/Remover marcam `PercentuaisDesatualizados`. Calcular marca `PercentuaisAtualizados`.

## Arquivos Envolvidos

- **Criar:**
  - `2-Application/.../Participacoes/Commands/AdicionarParticipacaoCommand.cs` + Handler + Validator
  - `2-Application/.../Participacoes/Commands/AjustarPercentualCommand.cs` + Handler + Validator
  - `2-Application/.../Participacoes/Commands/RemoverParticipacaoCommand.cs` + Handler
  - `2-Application/.../Participacoes/Commands/CalcularPercentuaisCommand.cs` + Handler
- **Referência:**
  - `3-Domain/.../Services/CalculadoraConexos.cs` (Domain Service)
  - `2-Application/.../Titularidades/Commands/` (padrão depuração)
- **Skills:** `dotnet-architecture` — Commands + Domain Service

## Subtarefas

- [ ] 6.1 `AdicionarParticipacaoCommand(FonogramaId, TitularId, Categoria)` + Validator + Handler: verifica status (LIBERADO→depuração, DEPURADO→reject), verifica duplicata, cria entidade (sem %), marca fonograma.PercentuaisDesatualizados se tinha cálculo, retorna ParticipacoesResponse
- [ ] 6.2 `AjustarPercentualCommand(FonogramaId, Id, Percentual)` + Validator + Handler: verifica status, busca participação, chama AjustarPercentualManual (rejeita músico), save, retorna ParticipacoesResponse
- [ ] 6.3 `RemoverParticipacaoCommand(FonogramaId, Id)` + Handler: verifica status, delete, marca desatualizado, retorna ParticipacoesResponse
- [ ] 6.4 `CalcularPercentuaisCommand(FonogramaId)` + Handler: verifica status, busca todas participações, invoca `CalculadoraConexos.Calcular(participacoes)`, marca fonograma.PercentuaisAtualizados, save, retorna ParticipacoesResponse com soma=100%
- [ ] 6.5 Verificar build: `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [ ] Adicionar: participante adicionado sem %, fonograma marcado desatualizado
- [ ] AjustarPercentual: intérprete ok, músico → DomainException (422)
- [ ] Remover: removido, fonograma marcado desatualizado
- [ ] Calcular: percentuais preenchidos conforme CalculadoraConexos, soma=100%, fonograma marcado atualizado
- [ ] Calcular sem intérprete → DomainException (422)
- [ ] Qualquer operação em LIBERADO → DepuracaoNecessariaException (409)
