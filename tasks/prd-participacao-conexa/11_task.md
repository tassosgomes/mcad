---
status: completed
parallelizable: true
blocked_by: ["9.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies></dependencies>
<unblocks>"12.0"</unblocks>
</task_context>

# Tarefa 11.0: Feature — ParticipacoesTable (inline edit + cadeado)

## Visão Geral

Tabela com edição inline de percentuais: click no valor de intérprete/produtor abre input inline (não modal). Músicos exibem ícone cadeado (Lock) e não são editáveis. Percentuais `null` exibem "—".

## Arquivos Envolvidos

- **Criar:**
  - `features/cadastro/participacoes/components/ParticipacoesTable.tsx` + `.module.css`
- **Referência:**
  - `features/cadastro/titularidades/components/TitularidadesTable.tsx` (padrão tabela)
  - `tasks/prd-participacao-conexa/techspec-frontend.md` (seção "ParticipacoesTable — Inline Edit")
  - Stitch screens (task 8.0)

## Subtarefas

- [ ] 11.1 Tabela: colunas Nome, Tipo (badge PF/PJ), Documento (mono), Categoria (label legível), Percentual (mono 4 casas ou "—"), Ações (remover)
- [ ] 11.2 **Inline edit**: click no percentual de item com `editavel=true` → abre `<input>` no lugar do texto. Blur ou Enter salva (chama onAjustarPercentual). Escape cancela.
- [ ] 11.3 **Cadeado**: item com `editavel=false` → exibe valor + ícone Lock (lucide-react). Click não abre input.
- [ ] 11.4 **Categoria labels**: INTERPRETE → "Intérprete", PRODUTOR_FONOGRAFICO → "Produtor Fonográfico", MUSICO_EXECUTANTE → "Músico Executante"
- [ ] 11.5 `npm run build`

## Detalhes de Implementação

```css
.editableValue { cursor: pointer; }
.editableValue:hover { background: var(--color-bg-elevated); border-radius: var(--radius-sm); }
.lockedValue { cursor: default; display: flex; align-items: center; gap: var(--space-1); }
.lockIcon { color: var(--color-text-muted); }
.inlineInput {
  width: 80px; font-family: var(--font-mono); background: var(--color-bg-elevated);
  border: 1px solid var(--color-accent); border-radius: var(--radius-sm);
  padding: var(--space-1); color: var(--color-text-primary);
}
```

## Critérios de Sucesso (Verificáveis)

- [ ] Click no percentual de intérprete → input inline aparece
- [ ] Click no percentual de músico → nada acontece (cadeado visível)
- [ ] Percentual null → "—"
- [ ] Enter/Blur salva, Escape cancela
- [ ] Valores em mono com 4 casas decimais
