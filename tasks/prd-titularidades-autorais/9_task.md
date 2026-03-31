---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>frontend/shared</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"11.0"</unblocks>
</task_context>

# Tarefa 9.0: Shared — Autocomplete + apiDeleteWithBody

## Visão Geral

Criar componente genérico `Autocomplete` (dropdown com busca, debounce, renderItem customizável — reutilizável por F06) e adicionar `apiDeleteWithBody` ao apiClient para DELETEs que retornam body (200 com soma).

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/shared/components/ui/autocomplete/Autocomplete.tsx` + `.module.css` + `index.ts`
- **Modificar:**
  - `frontend/src/shared/services/apiClient.ts` — adicionar `apiDeleteWithBody<T>`
- **Referência:**
  - `frontend/DESIGN.md` — dropdown styles (`--color-bg-elevated`, `--color-bg-highest`)
  - `tasks/prd-titularidades-autorais/techspec-frontend.md` (seção "Shared Component — Autocomplete")
- **Skills:** `react-architecture` — componentes genéricos; `frontend-design`

## Subtarefas

- [ ] 9.1 Criar `Autocomplete<T>` — props: placeholder, onSearch, results, isLoading, renderItem, onSelect, minChars (default 2). Input com onSearch callback. Dropdown com resultados estilizado. Keyboard navigation (up/down/enter/escape).
- [ ] 9.2 Estilos: dropdown `--color-bg-elevated`, hover `--color-bg-highest`, sombra `--shadow-md`, max-height 240px, z-index 50
- [ ] 9.3 `apiDeleteWithBody<T>` — DELETE que parseia response body (para F04 DELETE que retorna 200 com TitularidadesResponse)
- [ ] 9.4 Verificar: `npm run build`

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run build` compila sem erros
- [ ] Autocomplete abre dropdown ao digitar >= 2 chars
- [ ] Seleção fecha dropdown e emite onSelect
- [ ] Escape fecha dropdown
- [ ] apiDeleteWithBody parseia body corretamente
