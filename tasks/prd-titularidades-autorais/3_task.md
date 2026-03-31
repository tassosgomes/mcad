---
status: pending
parallelizable: false
blocked_by: ["2.0"]
---

<task_context>
<domain>backend/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies>database</dependencies>
<unblocks>"5.0, 6.0"</unblocks>
</task_context>

# Tarefa 3.0: Infra Fix — PossuiVinculosAsync em ObraRepository e TitularRepository

## Visão Geral

Atualizar os métodos `PossuiVinculosAsync` que eram placeholders (retornavam `false`) para verificar a tabela `titularidades_autorais`. Isso conecta a proteção contra exclusão de obras e titulares que tenham titularidades vinculadas.

## Arquivos Envolvidos

- **Modificar:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Repositories/ObraRepository.cs` — `PossuiVinculosAsync`: verificar `titularidades_autorais` (+ fonogramas futuro F05)
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Repositories/TitularRepository.cs` — `PossuiVinculosAsync`: verificar `titularidades_autorais` (+ participações conexas futuro F06)
- **Skills:** `dotnet-architecture` — Repository Pattern

## Subtarefas

- [ ] 3.1 ObraRepository.PossuiVinculosAsync: `return await _context.TitularidadesAutorais.AnyAsync(t => t.ObraId == obraId, ct);`
- [ ] 3.2 TitularRepository.PossuiVinculosAsync: `return await _context.TitularidadesAutorais.AnyAsync(t => t.TitularId == titularId, ct);`
- [ ] 3.3 Verificar build: `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] DELETE /obras/{id} com titularidades → 409 "possui vínculos"
- [ ] DELETE /titulares/{id} com titularidades → 409 "possui vínculos"
