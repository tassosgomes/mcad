---
status: completed
parallelizable: false
blocked_by: ["9.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"14.0"</unblocks>
</task_context>

# Tarefa 12.0: Feature — ObraFonogramasSection

## Visão Geral

Seção integrada na ObraDetailPage que lista fonogramas da obra (sem paginação) com botão "Novo Fonograma" que navega para criação com obra pré-selecionada. Read-only para obras DEPURADAS.

## Arquivos Envolvidos

- **Criar:**
  - `features/cadastro/fonogramas/components/ObraFonogramasSection.tsx` + `.module.css`
- **Referência:**
  - `features/cadastro/titularidades/components/TitularidadesSection.tsx` (padrão de seção)
  - Stitch screen "Obra Detalhe - Seção Fonogramas" (task 8.0)

## Subtarefas

- [x] 12.1 Criar `ObraFonogramasSection` — props: obraId, obraStatus. Usa `useFonogramasDaObra(obraId)`. Tabela simples: ISRC (mono formatado), Status (badge), País, Data Lançamento. Click na row → navigate para `/cadastro/fonogramas/{id}`. Botão "Novo Fonograma" → navigate para `/cadastro/fonogramas/novo?obraId={obraId}`. Read-only se DEPURADA/DP.
- [x] 12.2 Verificar: `npm run build`

## Critérios de Sucesso (Verificáveis)

- [x] Seção exibe fonogramas da obra
- [x] Click na row navega para detalhe do fonograma
- [x] "Novo Fonograma" navega com ?obraId query param
- [x] Read-only em obra DEPURADA (sem botão)
