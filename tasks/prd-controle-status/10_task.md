---
status: done
parallelizable: true
blocked_by: ["9.0"]
---

<task_context>
<domain>frontend/shared</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"12.0, 13.0"</unblocks>
</task_context>

# Tarefa 10.0: Shared — 5 novos UI components

## Visão Geral

Criar 5 shared components reutilizáveis entre obras e fonogramas: botões de ação (Liberar/Bloquear/Desbloquear), modal de bloqueio com textarea, banner de bloqueio, checklist de pré-requisitos e lista de histórico.

## Arquivos Envolvidos

- **Criar:**
  - `shared/components/ui/status-actions/LiberarButton.tsx` + `.module.css`
  - `shared/components/ui/status-actions/BloquearButton.tsx` + `.module.css`
  - `shared/components/ui/status-actions/DesbloquearButton.tsx` + `.module.css`
  - `shared/components/ui/status-actions/index.ts`
  - `shared/components/ui/bloqueio-banner/BloqueioBanner.tsx` + `.module.css` + `index.ts`
  - `shared/components/ui/bloqueio-modal/BloqueioModal.tsx` + `.module.css` + `index.ts`
  - `shared/components/ui/checklist-prereqs/ChecklistPreRequisitos.tsx` + `.module.css` + `index.ts`
  - `shared/components/ui/historico-bloqueios/HistoricoBloqueios.tsx` + `.module.css` + `index.ts`
- **Referência:**
  - `frontend/DESIGN.md`
  - `features/cadastro/obras/components/DepuracaoBanner.tsx` (padrão para BloqueioBanner)
  - Stitch screens (task 9.0)

## Subtarefas

- [x] 10.1 **LiberarButton** — Button com `--color-success` bg, ícone CheckCircle, loading spinner. Props: onClick, isLoading, disabled.
- [x] 10.2 **BloquearButton** — Button variant danger, ícone Ban.
- [x] 10.3 **DesbloquearButton** — Button variant secondary, ícone Unlock.
- [x] 10.4 **BloqueioModal** — Modal com textarea (justificativa, mín 10 chars, validação inline), Cancelar/Bloquear(danger). Props: isOpen, onClose, onConfirm, isLoading, entityName.
- [x] 10.5 **BloqueioBanner** — `--color-error-container` bg, ícone Ban, justificativa em texto. Props: justificativa.
- [x] 10.6 **ChecklistPreRequisitos** — Lista de itens: CheckCircle (verde) se atendido, XCircle (vermelho) se pendente + detalhe. Props: pendencias[].
- [x] 10.7 **HistoricoBloqueios** — Lista cronológica: Badge BLOQUEIO (error) / DESBLOQUEIO (success) + data + justificativa. Props: items[].
- [x] 10.8 `npm run build`

## Critérios de Sucesso (Verificáveis)

- [x] `npm run build` compila sem erros
- [x] LiberarButton com fundo verde (não azul accent)
- [x] BloqueioModal valida mín 10 chars inline
- [x] ChecklistPreRequisitos renderiza check/cross por item
- [x] Todas as cores via CSS variables
