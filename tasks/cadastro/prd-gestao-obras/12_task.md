---
status: done
parallelizable: true
blocked_by: ["11.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"14.0"</unblocks>
</task_context>

# Tarefa 12.0: Feature — Componentes Simples (Table, Filters, Form, DeleteModal)

## Visão Geral

Criar os 4 componentes padrão da feature: tabela com badges (5 status + tipo), filtros com debounce (5 campos), formulário (criar/editar), modal de exclusão. Reutilizam shared components de F02.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/cadastro/obras/components/ObrasTable.tsx` + `.module.css`
  - `frontend/src/features/cadastro/obras/components/ObrasFilters.tsx` + `.module.css`
  - `frontend/src/features/cadastro/obras/components/ObraForm.tsx` + `.module.css`
  - `frontend/src/features/cadastro/obras/components/DeleteObraModal.tsx` + `.module.css`
- **Referência:**
  - `frontend/DESIGN.md`
  - `frontend/src/features/cadastro/titulares/components/` (padrão F02)
  - Stitch screens (task 10.0)
- **Skills:** `react-architecture`, `frontend-design`

## Subtarefas

- [ ] 12.1 **ObrasTable** — colunas: Título, Tipo (Badge), Gênero, ISWC (mono ou "—"), Status (Badge 5 variantes), Ações. Obras DEPURADAS mostram link "→ nova versão". Sort clicável.
- [ ] 12.2 **ObrasFilters** — 5 filtros: título (text, debounce), ISWC (text, debounce, mono), tipo (select 4 opções), status (select 5 opções), gênero (text, debounce).
- [ ] 12.3 **ObraForm** — título (obrigatório), tipo (select), subtítulo (opcional), gênero (opcional). Modo: criar (todos editáveis) ou editar (conforme status).
- [ ] 12.4 **DeleteObraModal** — usa Modal + "Excluir obra [título]?". Botões Cancelar/Excluir.
- [ ] 12.5 Verificar: `npm run build`

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run build` compila sem erros
- [ ] ObrasTable exibe 5 variantes de badge de status
- [ ] ISWC exibido em JetBrains Mono
- [ ] Filtros com debounce 300ms
- [ ] ObraForm funciona em modo criar e editar
