---
status: done
parallelizable: true
blocked_by: ["1.0"]
---

<task_context>
<domain>backend/domain</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"4.0, 5.0"</unblocks>
</task_context>

# Tarefa 2.0: Domain — Extensão ObraMusical + ValidadorLiberacaoObra

## Visão Geral

Estender entidade ObraMusical com métodos Liberar(), Bloquear(justificativa), Desbloquear() e property BloqueioJustificativa. Criar Domain Service ValidadorLiberacaoObra que retorna lista de PreRequisitos. Atualizar guards existentes para rejeitar BLOQUEADO.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Services/ValidadorLiberacaoObra.cs`
- **Modificar:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/ObraMusical.cs` — +BloqueioJustificativa, +Liberar(), +Bloquear(), +Desbloquear(). Atualizar Atualizar() e RequerDepuracao() para rejeitar BLOQUEADO.

## Subtarefas

- [x] 2.1 ObraMusical: +`BloqueioJustificativa` (string? private set)
- [x] 2.2 ObraMusical: +`Liberar()` — status Pendente → Liberado; rejeita outros
- [x] 2.3 ObraMusical: +`Bloquear(string justificativa)` — Pendente/Liberado → Bloqueado; rejeita Depurada
- [x] 2.4 ObraMusical: +`Desbloquear()` — Bloqueado → Pendente; limpa justificativa
- [x] 2.5 ObraMusical: atualizar `Atualizar()` para rejeitar status Bloqueado
- [x] 2.6 Criar `ValidadorLiberacaoObra.Validar(obra, somaTitularidades, temIswc)` → IReadOnlyList<PreRequisito>
- [x] 2.7 `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [x] Liberar obra PENDENTE → Liberado
- [x] Liberar obra BLOQUEADO → DomainException
- [x] Bloquear obra DEPURADA → DomainException
- [x] Desbloquear → Pendente (não Liberado)
- [x] Atualizar obra BLOQUEADO → DomainException
- [x] ValidadorLiberacaoObra retorna 4 itens com atendido true/false
