---
status: completed
parallelizable: false
blocked_by: ["9.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies></dependencies>
<unblocks>"13.0"</unblocks>
</task_context>

# Tarefa 10.0: Feature — ObraSelect + Componentes Simples (Table, Filters, Form, DeleteModal)

## Visão Geral

Criar `ObraSelect` (autocomplete de obras usando shared Autocomplete) e os 4 componentes padrão da feature. FonogramaForm tem campo ISRC com validação inline de formato.

## Arquivos Envolvidos

- **Criar:**
  - `features/cadastro/fonogramas/components/ObraSelect.tsx` + `.module.css`
  - `features/cadastro/fonogramas/components/FonogramasTable.tsx` + `.module.css`
  - `features/cadastro/fonogramas/components/FonogramasFilters.tsx` + `.module.css`
  - `features/cadastro/fonogramas/components/FonogramaForm.tsx` + `.module.css`
  - `features/cadastro/fonogramas/components/DeleteFonogramaModal.tsx` + `.module.css`
- **Referência:**
  - `frontend/DESIGN.md`
  - `shared/components/ui/autocomplete/` (reutilizado por ObraSelect)
  - `features/cadastro/obras/hooks/useObras.ts` (para busca de obras no ObraSelect)
  - Stitch screens (task 8.0)

## Subtarefas

- [x] 10.1 **ObraSelect** — usa Autocomplete shared. Busca obras via `useObras` com filtro título. Renderiza: título + tipo badge + status badge. Props: value, onChange, disabled. Disabled se pré-selecionado (criação a partir da obra).
- [x] 10.2 **FonogramasTable** — colunas: ISRC (mono formatado), Obra (título), País, Status (badge 4 variantes), Data Lançamento, Ações. Sort clicável. DEPURADO mostra link "→ nova versão".
- [x] 10.3 **FonogramasFilters** — 5 filtros: ISRC (text mono, debounce), obra título (text, debounce), status (select 4 opções), país (text, debounce). Reset page=1 ao filtrar.
- [x] 10.4 **FonogramaForm** — ISRC (mono, validação formato inline via isrcValidator ao blur), ObraSelect (disabled se initialData ou query param), país (text), data gravação (date), data lançamento (date). Modo criar/editar. ISRC disabled se LIBERADO/DEPURADO.
- [x] 10.5 **DeleteFonogramaModal** — Modal "Excluir fonograma [ISRC]?". Visível apenas se PodeSerExcluido (PENDENTE).
- [x] 10.6 Verificar: `npm run build`

## Critérios de Sucesso (Verificáveis)

- [x] `npm run build` compila sem erros
- [x] ObraSelect busca e seleciona obras
- [x] ISRC exibido em mono formatado na tabela
- [x] FonogramaForm valida formato ISRC inline
- [x] DeleteModal não aparece para LIBERADO/DEPURADO
