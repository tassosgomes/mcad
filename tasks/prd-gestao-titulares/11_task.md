---
status: pending
parallelizable: false
blocked_by: ["10.0"]
---

<task_context>
<domain>frontend/shared</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies></dependencies>
<unblocks>"12.0, 14.0"</unblocks>
</task_context>

# Tarefa 11.0: Shared UI Fundação — Button, TextInput, Select, FormField, Badge

## Visão Geral

Criar 5 componentes reutilizáveis do design system que serão usados pela feature Titulares e por todas as features futuras com formulários. Seguir obrigatoriamente `frontend/DESIGN.md`.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/shared/components/ui/button/Button.tsx` + `.module.css` + `index.ts`
  - `frontend/src/shared/components/ui/text-input/TextInput.tsx` + `.module.css` + `index.ts`
  - `frontend/src/shared/components/ui/select/Select.tsx` + `.module.css` + `index.ts`
  - `frontend/src/shared/components/ui/form-field/FormField.tsx` + `.module.css` + `index.ts`
  - `frontend/src/shared/components/ui/badge/Badge.tsx` + `.module.css` + `index.ts`
- **Referência:**
  - `frontend/DESIGN.md` — tokens, cores, princípios
  - `tasks/prd-gestao-titulares/techspec-frontend.md` (seção "Novos Shared Components")
  - Stitch screens de Titulares (task 9.0)
- **Skills:** `react-architecture` — componentes, index.ts; `frontend-design` — estética

## Subtarefas

- [ ] 11.1 **Button** — variantes: primary (`--color-accent`), secondary (border), danger (`--color-error`), ghost (transparent). Tamanhos: sm, md. Props: type, disabled, onClick, children.
- [ ] 11.2 **TextInput** — label integrado, error state (borda vermelha + mensagem), disabled state, placeholder, props mono (JetBrains Mono para dados técnicos). Estilo: `--color-bg-elevated` background, `--color-border` border, `--color-accent` focus.
- [ ] 11.3 **Select** — dropdown nativo estilizado, placeholder, error state, disabled. Mesma estética do TextInput.
- [ ] 11.4 **FormField** — wrapper: label + required asterisk + children + error message. Composição: `<FormField label="Nome" required error={err}><TextInput .../></FormField>`
- [ ] 11.5 **Badge** — variantes: success (ATIVO), warning (TRANSFERINDO), muted (FALECIDO), accent (PJ), secondary (PF). Pill shape, `--font-mono` para dados técnicos.
- [ ] 11.6 `index.ts` em cada pasta
- [ ] 11.7 Verificar: `npm run build`

## Detalhes de Implementação (DESIGN.md)

### Button styles
```css
.primary { background: var(--color-accent); color: #fff; }
.primary:hover { background: var(--color-accent-hover); }
.secondary { background: transparent; border: 1px solid var(--color-border); color: var(--color-text-primary); }
.danger { background: transparent; border: 1px solid var(--color-error); color: var(--color-error); }
```

### TextInput styles
```css
.input {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
}
.input:focus { border-color: var(--color-accent); box-shadow: var(--shadow-blue); }
.input.error { border-color: var(--color-error); }
.input.mono { font-family: var(--font-mono); }
```

### Badge styles
```css
.badge { padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm); font-size: var(--text-xs); font-weight: 600; }
.success { background: rgba(34, 197, 94, 0.15); color: var(--color-success); }
.warning { background: rgba(234, 179, 8, 0.15); color: var(--color-warning); }
.muted { background: var(--color-secondary-container); color: var(--color-text-muted); }
```

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run build` compila sem erros
- [ ] Button renderiza 4 variantes com estilos corretos
- [ ] TextInput mostra error state (borda vermelha + mensagem)
- [ ] Select funciona com placeholder e options
- [ ] Badge mostra 5 variantes com cores corretas
- [ ] Cada componente tem `index.ts`
- [ ] Todas as cores vêm de CSS variables (nenhuma hardcoded)
