---
status: completed
parallelizable: false
blocked_by: ["2.0"]
---

<task_context>
<domain>backend/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies>database</dependencies>
<unblocks>"5.0"</unblocks>
</task_context>

# Tarefa 3.0: Infra Fix — ObraRepository.PossuiVinculosAsync + fonogramas

## Visão Geral

Estender `ObraRepository.PossuiVinculosAsync` para verificar fonogramas além de titularidades.

## Arquivos Envolvidos

- **Modificar:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Repositories/ObraRepository.cs` — `PossuiVinculosAsync`: adicionar `|| AnyAsync(f => f.ObraId == obraId)` em Fonogramas

## Subtarefas

- [x] 3.1 Atualizar PossuiVinculosAsync: `return await _context.TitularidadesAutorais.AnyAsync(...) || await _context.Fonogramas.AnyAsync(f => f.ObraId == obraId, ct);`
- [x] 3.2 Verificar build: `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [x] DELETE /obras/{id} com fonogramas vinculados → 409
