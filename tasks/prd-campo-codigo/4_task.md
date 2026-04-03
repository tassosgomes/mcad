---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies></dependencies>
<unblocks>"5.0"</unblocks>
</task_context>

# Tarefa 4.0: Frontend — Types (+codigo) + API (+query param) + Filtros

## Visão Geral

Adicionar `codigo: number` em todos os tipos de response. Adicionar query param `codigo` nas 3 API functions de listagem. Adicionar campo "Código" (input numérico) nos 3 componentes de filtro.

## Arquivos Envolvidos

- **Modificar:**
  - `features/cadastro/associacoes/types/associacao.ts` — +codigo: number
  - `features/cadastro/titulares/types/titular.ts` — +codigo em Titular, TitularFiltros
  - `features/cadastro/obras/types/obra.ts` — +codigo em ObraMusical, ObraFiltros
  - `features/cadastro/fonogramas/types/fonograma.ts` — +codigo em Fonograma, FonogramaResumo, FonogramaFiltros
  - `features/cadastro/titularidades/types/titularidade.ts` — +codigo em TitularResumo
  - `features/cadastro/participacoes/types/participacao.ts` — +codigo em TitularResumo (se tipo separado)
  - `features/cadastro/titulares/api/titularesApi.ts` — +params.set('codigo', ...) se presente
  - `features/cadastro/obras/api/obrasApi.ts` — +idem
  - `features/cadastro/fonogramas/api/fonogramasApi.ts` — +idem
  - `features/cadastro/titulares/components/TitularesFilters.tsx` — +TextInput "Código" (type number, mono)
  - `features/cadastro/obras/components/ObrasFilters.tsx` — +idem
  - `features/cadastro/fonogramas/components/FonogramasFilters.tsx` — +idem

## Subtarefas

- [ ] 4.1 Tipos: +`codigo: number` em todos os interfaces de response (6+ arquivos)
- [ ] 4.2 Filtros types: +`codigo?: number` em TitularFiltros, ObraFiltros, FonogramaFiltros
- [ ] 4.3 API functions: +codigo no URLSearchParams das 3 listagens
- [ ] 4.4 Filtros UI: +TextInput "Código" (mono, type number, placeholder "Ex: 67494") nos 3 componentes
- [ ] 4.5 `npm run build`

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run build` compila sem erros
- [ ] Tipos incluem codigo: number
- [ ] Campo "Código" visível nos 3 filtros
