---
status: pending
parallelizable: false
blocked_by: ["9.0", "10.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies></dependencies>
<unblocks>"12.0"</unblocks>
</task_context>

# Tarefa 11.0: Feature — Componentes (Table, AddForm, EditModal, SomaIndicator)

## Visão Geral

4 componentes da feature: TitularidadesTable (tabela com dados + ações), AddTitularidadeForm (Autocomplete + Select categoria + Input percentual + validação Editor=PJ), EditPercentualModal (modal para editar %), SomaIndicator (badge dinâmico verde/amarelo/vermelho).

## Arquivos Envolvidos

- **Criar:**
  - `features/cadastro/titularidades/components/TitularidadesTable.tsx` + `.module.css`
  - `features/cadastro/titularidades/components/AddTitularidadeForm.tsx` + `.module.css`
  - `features/cadastro/titularidades/components/EditPercentualModal.tsx` + `.module.css`
  - `features/cadastro/titularidades/components/SomaIndicator.tsx` + `.module.css`
- **Referência:**
  - `frontend/DESIGN.md`
  - `tasks/prd-titularidades-autorais/techspec-frontend.md` (seções "Componentes")
  - Stitch screens (task 8.0)
- **Skills:** `react-architecture`, `frontend-design`

## Subtarefas

- [ ] 11.1 **TitularidadesTable** — colunas: Nome, Tipo (badge PF/PJ), Documento (mono), Categoria (AUTOR/EDITOR), Percentual (mono 4 casas + "%"), Ações (editar/remover ghost buttons). Props: items, isReadOnly, onEdit, onRemove.
- [ ] 11.2 **AddTitularidadeForm** — Autocomplete (useBuscarTitulares) com renderItem (nome + tipo badge + documento mono + sigla). Após seleção: Select categoria (AUTOR/EDITOR) + validação inline Editor=PF. Input percentual (mono, 4 casas). Botões Cancelar/Adicionar.
- [ ] 11.3 **EditPercentualModal** — Modal com input percentual (preenchido com valor atual), botões Cancelar/Salvar. Usa useEditTitularidade.
- [ ] 11.4 **SomaIndicator** — Badge: `somaCompleta` → verde (`success`), soma < 100 → amarelo (`warning`) + hint "Faltam X%", soma > 100 → vermelho (`error`) + hint "Excede em X%". Percentual em mono.
- [ ] 11.5 Verificar: `npm run build`

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run build` compila sem erros
- [ ] Table exibe badges PF/PJ e percentuais em mono
- [ ] AddForm: seleção de Editor com titular PF mostra erro inline
- [ ] SomaIndicator: 3 variantes de cor funcionais
- [ ] EditModal preenche com valor atual e salva novo
