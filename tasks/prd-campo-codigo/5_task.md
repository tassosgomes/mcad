---
status: pending
parallelizable: false
blocked_by: ["4.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"6.0"</unblocks>
</task_context>

# Tarefa 5.0: Frontend — Tabelas: Código como primeira coluna (6 tabelas)

## Visão Geral

Adicionar coluna "Código" como primeira coluna em todas as 6 tabelas. Exibir com prefixo "#" em fonte monoespaçada. Remover exibição de UUID onde existir.

## Arquivos Envolvidos

- **Modificar:**
  - `features/cadastro/associacoes/components/AssociacoesTable.tsx` — +coluna "Código" (#N, mono) como primeira
  - `features/cadastro/titulares/components/TitularesTable.tsx` — +idem
  - `features/cadastro/obras/components/ObrasTable.tsx` — +idem
  - `features/cadastro/fonogramas/components/FonogramasTable.tsx` — +idem
  - `features/cadastro/titularidades/components/TitularidadesTable.tsx` — +codigo no titular resumo (coluna ou inline)
  - `features/cadastro/participacoes/components/ParticipacoesTable.tsx` — +idem

## Subtarefas

- [ ] 5.1 Em cada tabela: adicionar como primeira coluna `{ key: 'codigo', header: 'Código', render: (v: number) => <span className={styles.mono}>#{v}</span> }`
- [ ] 5.2 Remover qualquer exibição de UUID nas tabelas (se existir)
- [ ] 5.3 TitularidadesTable e ParticipacoesTable: exibir `#{titular.codigo}` ao lado do nome ou como coluna
- [ ] 5.4 `npm run build`

## Critérios de Sucesso (Verificáveis)

- [ ] Todas as 6 tabelas mostram código como primeira coluna
- [ ] Formato: `#67494` em font-mono
- [ ] UUID não visível em nenhuma tabela
