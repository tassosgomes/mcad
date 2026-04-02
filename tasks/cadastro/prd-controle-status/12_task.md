---
status: done
parallelizable: true
blocked_by: ["10.0", "11.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>http_server</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 12.0: Feature — FonogramaForm +urlAudio + FonogramaDetailPage integração

## Visão Geral

Adicionar campo urlAudio ao FonogramaForm. Integrar na FonogramaDetailPage: botões Liberar/Bloquear/Desbloquear (contextual por status), banner de bloqueio, checklist de pré-requisitos ao tentar liberar, histórico de bloqueios. isReadOnly agora inclui BLOQUEADO.

## Arquivos Envolvidos

- **Modificar:**
  - `features/cadastro/fonogramas/components/FonogramaForm.tsx` — +campo urlAudio (TextInput, disabled em LIBERADO/DEPURADO/BLOQUEADO)
  - `features/cadastro/fonogramas/pages/FonogramaDetailPage.tsx` — integrar: banner bloqueio, botões status contextuais, checklist pendências (422), histórico, isReadOnly += BLOQUEADO

## Subtarefas

- [x] 12.1 FonogramaForm: +campo "URL do Áudio" (TextInput, placeholder URL, disabled em LIBERADO/DEPURADO/BLOQUEADO)
- [x] 12.2 FonogramaDetailPage: importar shared components + hooks de status
- [x] 12.3 Banner: `{fonograma.status === 'BLOQUEADO' && <BloqueioBanner justificativa={fonograma.bloqueioJustificativa} />}`
- [x] 12.4 Botões no PageHeader.action: Liberar (se PENDENTE_DOCUMENTACAO), Bloquear (se PENDENTE_*/LIBERADO), Desbloquear (se BLOQUEADO)
- [x] 12.5 Lógica Liberar: chamar useLiberarFonograma → sucesso: toast + refetch. Erro 422: extrair pendencias[] → mostrar ChecklistPreRequisitos inline/modal.
- [x] 12.6 Lógica Bloquear: abrir BloqueioModal → confirmar → useBloquearFonograma → toast
- [x] 12.7 Lógica Desbloquear: useDesbloquearFonograma → toast "Fonograma desbloqueado"
- [x] 12.8 HistoricoBloqueios: useHistoricoFonograma → renderizar no final da página
- [x] 12.9 isReadOnly: `status === 'DEPURADO' || status === 'BLOQUEADO'`
- [x] 12.10 `npm run build`

## Critérios de Sucesso (Verificáveis)

- [x] Campo urlAudio visível e editável em PENDENTE
- [x] Botão "Liberar" visível em PENDENTE_DOCUMENTACAO
- [x] Liberar com pendências → checklist visual
- [x] Banner de bloqueio visível em BLOQUEADO
- [x] Campos disabled em BLOQUEADO
- [x] Histórico exibido no final
