---
status: pending
parallelizable: false
blocked_by: ["1.0"]
---

<task_context>
<domain>backend/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"3.0"</unblocks>
</task_context>

# Tarefa 2.0: Application — Responses (+Codigo), Handlers (mapeamento), Filtros

## Visão Geral

Adicionar `Codigo` (long) em todos os DTOs de response. Atualizar mapeamentos nos handlers. Adicionar `Codigo` nos filtros de Titular, Obra e Fonograma. Adicionar filtro no repositório.

## Arquivos Envolvidos

- **Modificar:**
  - **Responses (8+):**
    - `AssociacaoResponse.cs` — +Codigo
    - `TitularResponse.cs` — +Codigo
    - `TitularResumoResponse.cs` (autocomplete + titularidades + participações) — +Codigo
    - `AssociacaoResumoResponse.cs` (aninhada no titular) — +Codigo
    - `ObraResponse.cs` — +Codigo
    - `FonogramaResponse.cs` — +Codigo
    - `FonogramaResumoResponse.cs` — +Codigo
    - `DepuracaoResponse.cs` / `DepuracaoFonogramaResponse.cs` — já retornam entidades completas (Codigo vem automaticamente)
  - **Handlers (todos os query handlers):** atualizar mapeamento entidade→response para incluir `.Codigo`
  - **Filtros:**
    - `TitularFiltro.cs` — +long? Codigo
    - `ObraFiltro` (onde estiver) — +long? Codigo
    - `FonogramaFiltro` (onde estiver) — +long? Codigo
  - **Repositórios:**
    - `TitularRepository.cs` — +`if (filtro.Codigo.HasValue) query = query.Where(t => t.Codigo == filtro.Codigo.Value);`
    - `ObraRepository.cs` — +idem
    - `FonogramaRepository.cs` — +idem

## Subtarefas

- [ ] 2.1 Adicionar `long Codigo` em todos os responses (8+ records)
- [ ] 2.2 Atualizar mapeamento em todos os query handlers (incluir `e.Codigo` no record constructor)
- [ ] 2.3 Adicionar `long? Codigo` nos 3 filtros
- [ ] 2.4 Adicionar filtro nos 3 repositórios
- [ ] 2.5 `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] GET /associacoes retorna `codigo` em cada item
- [ ] GET /titulares retorna `codigo` em cada item
- [ ] POST /titulares retorna `codigo` no response
