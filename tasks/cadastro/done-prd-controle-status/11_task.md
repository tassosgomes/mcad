---
status: done
parallelizable: true
blocked_by: []
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"12.0, 13.0"</unblocks>
</task_context>

# Tarefa 11.0: Feature — Types estendidos + API (8 funções novas) + Hooks (8 novos)

## Visão Geral

Estender tipos existentes de obras e fonogramas, adicionar funções de API e hooks para as 6 ações de status + 2 queries de histórico.

## Arquivos Envolvidos

- **Criar:**
  - `features/cadastro/obras/hooks/useLiberarObra.ts`
  - `features/cadastro/obras/hooks/useBloquearObra.ts`
  - `features/cadastro/obras/hooks/useDesbloquearObra.ts`
  - `features/cadastro/obras/hooks/useHistoricoObra.ts`
  - `features/cadastro/fonogramas/hooks/useLiberarFonograma.ts`
  - `features/cadastro/fonogramas/hooks/useBloquearFonograma.ts`
  - `features/cadastro/fonogramas/hooks/useDesbloquearFonograma.ts`
  - `features/cadastro/fonogramas/hooks/useHistoricoFonograma.ts`
- **Modificar:**
  - `features/cadastro/obras/api/obrasApi.ts` — +liberarObra, +bloquearObra, +desbloquearObra, +getHistoricoObra
  - `features/cadastro/obras/types/obra.ts` — +bloqueioJustificativa, status enum +BLOQUEADO, +PreRequisitoItem, +HistoricoBloqueioItem, +BloquearRequest
  - `features/cadastro/fonogramas/api/fonogramasApi.ts` — +liberarFonograma, +bloquearFonograma, +desbloquearFonograma, +getHistoricoFonograma
  - `features/cadastro/fonogramas/types/fonograma.ts` — +urlAudio, +bloqueioJustificativa, status enum +BLOQUEADO

## Subtarefas

- [x] 11.1 Estender tipos obras: +bloqueioJustificativa, +BLOQUEADO no enum, +PreRequisitoItem, +HistoricoBloqueioItem, +BloquearRequest
- [x] 11.2 Estender tipos fonogramas: +urlAudio, +bloqueioJustificativa, +BLOQUEADO
- [x] 11.3 obrasApi: +4 funções (liberar POST sem body, bloquear POST com body, desbloquear POST sem body, histórico GET)
- [x] 11.4 fonogramasApi: +4 funções (idem)
- [x] 11.5 4 hooks obras: useLiberarObra, useBloquearObra, useDesbloquearObra (mutations → invalidate ['obra', id] + ['obras']), useHistoricoObra (query)
- [x] 11.6 4 hooks fonogramas: idem pattern → invalidate ['fonograma', id] + ['fonogramas']
- [x] 11.7 `npm run build`

## Critérios de Sucesso (Verificáveis)

- [x] `npm run build` compila sem erros
- [x] 8 hooks exportados e funcionais
- [x] liberarObra envia POST sem body
- [x] bloquearObra envia POST com { justificativa }
