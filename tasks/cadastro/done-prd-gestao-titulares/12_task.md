---
status: pending
parallelizable: false
blocked_by: ["11.0"]
---

<task_context>
<domain>frontend/shared</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"14.0, 15.0"</unblocks>
</task_context>

# Tarefa 12.0: Shared UI Interação — Pagination, Modal, Toast

## Visão Geral

Criar 3 componentes de interação reutilizáveis: Pagination (controles de paginação server-side), Modal (overlay com confirm/cancel) e Toast (notificações com Provider pattern).

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/shared/components/ui/pagination/Pagination.tsx` + `.module.css` + `index.ts`
  - `frontend/src/shared/components/ui/modal/Modal.tsx` + `.module.css` + `index.ts`
  - `frontend/src/shared/components/ui/toast/Toast.tsx` + `.module.css` + `ToastProvider.tsx` + `useToast.ts` + `index.ts`
- **Referência:**
  - `frontend/DESIGN.md`
  - `tasks/prd-gestao-titulares/techspec-frontend.md` (seção "Novos Shared Components")
- **Skills:** `react-architecture` — provider pattern; `frontend-design`

## Subtarefas

- [ ] 12.1 **Pagination** — "Mostrando X-Y de Z" + botões prev/next + indicador de página. Props: pagination (page, size, total, totalPages), onPageChange.
- [ ] 12.2 **Modal** — overlay escuro (`rgba(0,0,0,0.6)`), card centralizado (`--color-bg-surface`), título, conteúdo, slot de ações. Fecha com Escape e clique no overlay. Focus trap.
- [ ] 12.3 **Toast** — notificação bottom-right, auto-dismiss 5s, variantes: success, error, warning. Animação slide-in.
- [ ] 12.4 **ToastProvider** — Context + state management. `useToast()` retorna `{ showToast(message, variant) }`.
- [ ] 12.5 `index.ts` em cada pasta
- [ ] 12.6 Verificar: `npm run build`

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run build` compila sem erros
- [ ] Pagination mostra info correta e navega entre páginas
- [ ] Modal abre/fecha com overlay, Escape e botão
- [ ] Toast aparece, auto-dismiss após 5s, 3 variantes visuais
- [ ] useToast funciona em qualquer componente dentro do ToastProvider
