---
status: completed
parallelizable: false
blocked_by: ["7.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"9.0"</unblocks>
</task_context>

# Tarefa 8.0: Frontend — Ocultar botões de ação para Consultor (todas as páginas)

## Visão Geral

Adicionar `const { hasRole } = useAuth(); const canWrite = hasRole('analista-cadastro');` em todas as páginas e componentes que exibem botões de ação, condicionando sua renderização.

## Arquivos Envolvidos

- **Modificar:**
  - `features/cadastro/titulares/pages/TitularesPage.tsx` — botão "Novo Titular" condicional
  - `features/cadastro/titulares/components/TitularesTable.tsx` — ações editar/excluir condicionais
  - `features/cadastro/obras/pages/ObrasPage.tsx` — botão "Nova Obra" condicional
  - `features/cadastro/obras/pages/ObraDetailPage.tsx` — botões ISWC, DP, Liberar, Bloquear condicionais
  - `features/cadastro/fonogramas/pages/FonogramasPage.tsx` — botão "Novo Fonograma" condicional
  - `features/cadastro/fonogramas/pages/FonogramaDetailPage.tsx` — botões ação condicionais
  - `features/cadastro/titularidades/components/TitularidadesSection.tsx` — botão "Adicionar Titular" condicional
  - `features/cadastro/participacoes/components/ParticipacoesSection.tsx` — botões "Adicionar Participante" + "Calcular" condicionais

## Subtarefas

- [x] 8.1 Em cada arquivo: `import { useAuth } from '@shared/auth'; const { hasRole } = useAuth(); const canWrite = hasRole('analista-cadastro');`
- [x] 8.2 TitularesPage: `action={canWrite ? <Button>Novo Titular</Button> : undefined}`
- [x] 8.3 TitularesTable: `{canWrite && <Button onClick={onEdit}>...</Button>}`
- [x] 8.4 ObrasPage: botão "Nova Obra" condicional
- [x] 8.5 ObraDetailPage: botões ISWC, DP, Liberar, Bloquear, Desbloquear condicionais. TitularidadesSection e ObraFonogramasSection: passar `canWrite` ou verificar internamente.
- [x] 8.6 FonogramasPage + FonogramaDetailPage: idem
- [x] 8.7 TitularidadesSection: `{canWrite && <Button>Adicionar Titular</Button>}`
- [x] 8.8 ParticipacoesSection: `{canWrite && <>Adicionar + Calcular</>}`
- [x] 8.9 `npm run build`

## Evidências de Execução

- `frontend/src/features/cadastro/titulares/pages/TitularesPage.tsx` e `TitularesTable.tsx` passaram a ocultar criação, edição e exclusão para perfis sem `analista-cadastro`
- `frontend/src/features/cadastro/obras/pages/ObrasPage.tsx`, `ObrasTable.tsx` e `ObraDetailPage.tsx` passaram a condicionar ações de escrita por `canWrite`
- `frontend/src/features/cadastro/obras/components/IswcSection.tsx`, `DominioPublicoToggle.tsx`, `ObraForm.tsx` e `frontend/src/features/cadastro/fonogramas/components/ObraFonogramasSection.tsx` foram ajustados para ocultar controles de escrita e manter dados visíveis
- `frontend/src/features/cadastro/fonogramas/pages/FonogramasPage.tsx`, `FonogramasTable.tsx`, `FonogramaDetailPage.tsx` e `FonogramaForm.tsx` passaram a ocultar ações de criação, edição, exclusão e status para consultor
- `frontend/src/features/cadastro/titularidades/components/TitularidadesSection.tsx` e `frontend/src/features/cadastro/participacoes/components/ParticipacoesSection.tsx` agora tratam `!canWrite` como modo read-only, ocultando adicionar, calcular, remover e edição inline
- `frontend/src/features/cadastro/titulares/components/TitularForm.tsx` também oculta botões de submit para evitar ações de escrita por acesso direto a rotas de formulário
- `npm run build` executado com sucesso em `frontend/`

## Critérios de Sucesso (Verificáveis)

- [x] `npm run build` compila sem erros
- [x] Com role consultor: ZERO botões de ação visíveis (criar, editar, excluir, liberar, bloquear, depurar, ISWC, DP, calcular, adicionar titular/participante)
- [x] Com role analista: TODOS os botões visíveis conforme contexto
- [x] Dados continuam visíveis para ambos os perfis
