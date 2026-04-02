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

# Tarefa 13.0: Feature — ObraDetailPage integração (botões + banner + checklist + histórico)

## Visão Geral

Integrar controle de status na ObraDetailPage: botões Liberar/Bloquear/Desbloquear (contextual), banner de bloqueio com justificativa, checklist de pré-requisitos ao tentar liberar, histórico de bloqueios, isReadOnly inclui BLOQUEADO.

## Arquivos Envolvidos

- **Modificar:**
  - `features/cadastro/obras/pages/ObraDetailPage.tsx` — integrar: banner bloqueio, botões status, checklist pendências, histórico, isReadOnly += BLOQUEADO

## Subtarefas

- [x] 13.1 Importar shared components (LiberarButton, BloquearButton, DesbloquearButton, BloqueioBanner, BloqueioModal, ChecklistPreRequisitos, HistoricoBloqueios) + hooks (useLiberarObra, useBloquearObra, useDesbloquearObra, useHistoricoObra)
- [x] 13.2 Banner: `{obra.status === 'BLOQUEADO' && <BloqueioBanner justificativa={obra.bloqueioJustificativa} />}`
- [x] 13.3 Botões no PageHeader.action (ao lado dos existentes):
  - PENDENTE: LiberarButton + BloquearButton
  - LIBERADO: BloquearButton (Liberar não visível — já liberado)
  - BLOQUEADO: DesbloquearButton
  - DEPURADA/DP: nenhum botão de status
- [x] 13.4 Lógica Liberar: useLiberarObra.mutateAsync → sucesso: toast + setQueryData. Erro 422: catch, extrair `pendencias[]` do erro, setState → mostrar ChecklistPreRequisitos.
- [x] 13.5 State: `showBloqueioModal`, `showPendencias`, `pendencias[]`
- [x] 13.6 Lógica Bloquear: BloqueioModal (entityName="obra") → useBloquearObra → toast
- [x] 13.7 Lógica Desbloquear: useDesbloquearObra → toast "Obra desbloqueada. Status: PENDENTE"
- [x] 13.8 HistoricoBloqueios: useHistoricoObra(obra.id) → seção no final (antes do histórico de revisão)
- [x] 13.9 isReadOnly: atualizar para incluir BLOQUEADO: `status === 'DEPURADA' || status === 'BLOQUEADO' || status === 'DOMINIO_PUBLICO'`
- [x] 13.10 Testar end-to-end: liberar → bloquear → desbloquear → re-liberar
- [x] 13.11 `npm run build`

## Detalhes de Implementação

### Lógica de catch do 422 (pendências)
```typescript
const handleLiberar = async () => {
  try {
    await liberarMutation.mutateAsync(obra.id);
    showToast('Obra liberada com sucesso', 'success');
  } catch (err: any) {
    if (err.status === 422 && err.pendencias) {
      setPendencias(err.pendencias);
      setShowPendencias(true);
    } else {
      showToast(err.detail || 'Erro ao liberar', 'error');
    }
  }
};
```

## Critérios de Sucesso (Verificáveis)

- [x] `npm run build` compila sem erros
- [x] Botão "Liberar" visível em PENDENTE → sucesso → status LIBERADO
- [x] Liberar sem ISWC → checklist com ❌ ISWC
- [x] Bloquear → modal → justificativa → BLOQUEADO + banner
- [x] BLOQUEADO: campos disabled, apenas Desbloquear visível
- [x] Desbloquear → PENDENTE, banner desaparece
- [x] Histórico exibido com BLOQUEIO/DESBLOQUEIO + datas
- [x] Fluxo completo: liberar → bloquear → desbloquear → re-liberar
