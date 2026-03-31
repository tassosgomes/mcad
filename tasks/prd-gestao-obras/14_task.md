---
status: done
parallelizable: false
blocked_by: ["12.0", "13.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>http_server</dependencies>
<unblocks>"15.0"</unblocks>
</task_context>

# Tarefa 14.0: Feature — Páginas (ObrasPage, ObraCreatePage, ObraDetailPage)

## Visão Geral

Criar as 3 páginas compostas. A `ObraDetailPage` é a mais complexa — lógica condicional por status (PENDENTE=edição livre+ISWC, LIBERADO=edição parcial+DP, DEPURADA=read-only+banner). Fluxo de depuração: PUT→409→modal→POST /depurar→redirect.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/cadastro/obras/pages/ObrasPage.tsx` + `.module.css`
  - `frontend/src/features/cadastro/obras/pages/ObraCreatePage.tsx`
  - `frontend/src/features/cadastro/obras/pages/ObraDetailPage.tsx` + `.module.css`
  - `frontend/src/features/cadastro/obras/index.ts`
- **Referência:**
  - `frontend/src/features/cadastro/titulares/pages/` (padrão F02)
  - `tasks/prd-gestao-obras/techspec-frontend.md` (seção "ObraDetailPage")
- **Skills:** `react-architecture`

## Subtarefas

- [ ] 14.1 **ObrasPage** — PageHeader ("Obras", botão "Nova Obra"), ObrasFilters, ObrasTable, Pagination, DeleteObraModal. State: filtros, obraParaExcluir.
- [ ] 14.2 **ObraCreatePage** — PageHeader "Nova Obra" + ObraForm (modo criar) + useCreateObra. Sucesso → navigate("/cadastro/obras") + toast.
- [ ] 14.3 **ObraDetailPage** — useParams(id) + useObra(id). Renderização condicional:
  - **DEPURADA:** DepuracaoBanner + todos campos disabled, sem ações
  - **PENDENTE:** ObraForm editável + IswcSection + DeleteObraModal
  - **LIBERADO:** ObraForm (subtitulo/tipo/genero editáveis, título dispara depuração) + ISWC read-only + DominioPublicoToggle + DeleteObraModal
  - **DOMINIO_PUBLICO:** campos read-only, DominioPublicoToggle para desmarcar
- [ ] 14.4 Implementar fluxo depuração: PUT retorna 409 `code=DEPURACAO_NECESSARIA` → armazena dados pendentes → abre DepuracaoModal → confirma → POST /depurar → navigate para nova obra + toast
- [ ] 14.5 Criar `index.ts` da feature
- [ ] 14.6 Verificar: `npm run build`

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run build` compila sem erros
- [ ] ObrasPage lista com filtros + paginação
- [ ] ObraCreatePage cria obra → toast + redirect
- [ ] ObraDetailPage PENDENTE: campos editáveis + botão ISWC
- [ ] ObraDetailPage LIBERADO: título com aviso depuração
- [ ] ObraDetailPage DEPURADA: tudo read-only + banner com link
- [ ] Fluxo depuração funcional (PUT→409→modal→POST /depurar→redirect)
