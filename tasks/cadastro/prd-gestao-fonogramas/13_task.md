---
status: completed
parallelizable: false
blocked_by: ["10.0", "11.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>http_server</dependencies>
<unblocks>"14.0"</unblocks>
</task_context>

# Tarefa 13.0: Feature — Páginas (Listagem, Criar, Detalhe)

## Visão Geral

3 páginas. `FonogramaCreatePage` aceita `?obraId=` query param (pré-seleciona obra). `FonogramaDetailPage` com lógica condicional por status (PENDENTE=edição livre incluindo ISRC, LIBERADO=ISRC read-only+país/datas editáveis, DEPURADO=tudo read-only+banner). Fluxo depuração: PUT→409→modal→POST /depurar→redirect.

## Arquivos Envolvidos

- **Criar:**
  - `features/cadastro/fonogramas/pages/FonogramasPage.tsx` + `.module.css`
  - `features/cadastro/fonogramas/pages/FonogramaCreatePage.tsx`
  - `features/cadastro/fonogramas/pages/FonogramaDetailPage.tsx` + `.module.css`
  - `features/cadastro/fonogramas/index.ts`
- **Referência:**
  - `features/cadastro/obras/pages/ObraDetailPage.tsx` (padrão detalhe condicional)
  - Stitch screens (task 8.0)

## Subtarefas

- [x] 13.1 **FonogramasPage** — PageHeader "Fonogramas" + botão "Novo Fonograma", FonogramasFilters, FonogramasTable, Pagination, DeleteFonogramaModal.
- [x] 13.2 **FonogramaCreatePage** — Lê `?obraId=` de searchParams. Se presente, pré-seleciona obra no ObraSelect (disabled). FonogramaForm modo criar + useCreateFonograma. Sucesso → navigate + toast.
- [x] 13.3 **FonogramaDetailPage** — useFonograma(id). Renderização condicional:
  - **DEPURADO:** FonogramaDepuracaoBanner + todos campos disabled
  - **PENDENTE_*:** FonogramaForm editável (incluindo ISRC) + DeleteFonogramaModal
  - **LIBERADO:** ISRC disabled (alteração → depuração), país/datas editáveis
  - Placeholder para seção conexos (F06)
- [x] 13.4 Fluxo depuração: PUT retorna 409 code=DEPURACAO_NECESSARIA → armazena dados → FonogramaDepuracaoModal → confirma → POST /depurar → navigate novo + toast
- [x] 13.5 Criar `index.ts` da feature
- [x] 13.6 Verificar: `npm run build`

## Critérios de Sucesso (Verificáveis)

- [x] `npm run build` compila sem erros
- [x] FonogramasPage lista com filtros + paginação
- [x] FonogramaCreatePage com ?obraId pré-seleciona obra (disabled)
- [x] FonogramaDetailPage PENDENTE: ISRC editável
- [x] FonogramaDetailPage LIBERADO: ISRC disabled, país editável
- [x] FonogramaDetailPage DEPURADO: tudo read-only + banner
- [x] Fluxo depuração funcional
