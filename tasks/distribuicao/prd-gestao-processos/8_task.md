---
status: pending
parallelizable: false
blocked_by: ["7.0"]
---

<task_context>
<domain>distribuicao/frontend</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>http_server</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 8.0: Frontend — componentes, páginas, roteamento

## Relacionada às User Stories

- [HU-02] Criar processo (direta — CriarProcessoPage)
- [HU-03] Listar e filtrar (direta — ProcessosPage)
- [HU-04] Visualizar detalhes (direta — ProcessoDetailPage)
- [HU-05] Aprovar (direta — ProcessoActions)
- [HU-06] Finalizar (direta — FinalizarModal)
- [HU-07] Cancelar (direta — CancelarModal)

## Visão Geral

Implementar todos os componentes visuais e páginas do módulo processos: tabela paginada com filtros, badges de status, botões de ação condicionais, modais de confirmação (cancelar com justificativa, finalizar com aviso irreversível), página de criação com seleção de disponíveis, e integração de roteamento + sidebar.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/distribuicao/processos/components/ProcessoStatusBadge.tsx`
  - `frontend/src/features/distribuicao/processos/components/ProcessosFilters.tsx`
  - `frontend/src/features/distribuicao/processos/components/ProcessosTable.tsx`
  - `frontend/src/features/distribuicao/processos/components/ProcessoActions.tsx`
  - `frontend/src/features/distribuicao/processos/components/DisponibilidadeList.tsx`
  - `frontend/src/features/distribuicao/processos/components/CancelarModal.tsx`
  - `frontend/src/features/distribuicao/processos/components/FinalizarModal.tsx`
  - `frontend/src/features/distribuicao/processos/pages/ProcessosPage.tsx`
  - `frontend/src/features/distribuicao/processos/pages/ProcessoDetailPage.tsx`
  - `frontend/src/features/distribuicao/processos/pages/CriarProcessoPage.tsx`
- **Modificar:**
  - `frontend/src/features/distribuicao/index.tsx` (adicionar 3 rotas: processos, processos/novo, processos/:id)
  - `frontend/src/shared/components/layout/sidebar/Sidebar.tsx` (adicionar sub-item "Processos")
- **Referência:**
  - `frontend/src/features/arrecadacao/pagamentos/pages/PagamentosPage.tsx` (listagem com filtros)
  - `frontend/src/features/arrecadacao/pagamentos/components/PagamentosFilters.tsx` (filtros)
  - `frontend/src/features/arrecadacao/pagamentos/components/EstornarPagamentoModal.tsx` (modal com textarea)
  - `frontend/src/features/arrecadacao/licencas/components/StatusBadgeLicenca.tsx` (badge mapping)
  - `frontend/src/features/arrecadacao/licencas/components/AlterarStatusModal.tsx` (modal destrutivo)
  - `frontend/src/shared/components/ui/` (Modal, Badge, Table, Pagination, Select, Button, PageHeader)
  - `tasks/distribuicao/prd-gestao-processos/techspec-frontend.md` (design completo)

## Subtarefas

- [ ] 8.1 Criar ProcessoStatusBadge (Record<StatusProcesso, BadgeVariant> mapping)
- [ ] 8.2 Criar ProcessosFilters (Select rubrica via useRubricas, input período, multi-select status, limpar)
- [ ] 8.3 Criar ProcessosTable (colunas: rubrica, período, status badge, verba, analista, data; linhas clicáveis)
- [ ] 8.4 Criar ProcessosPage (PageHeader + botão "Novo" + Filters + Table + Pagination + estados loading/error/empty)
- [ ] 8.5 Criar ProcessoActions (botões condicionais por estado: Calcular, Aprovar, Finalizar, Cancelar). **Adicionalmente, esconder cada botão se o usuário não tiver a permission correspondente** (`distribuicao:default:processo:calcular/aprovar/finalizar/cancelar`) lida do BFF (ADR 0004) — usar o hook/contexto de permissions já existente no frontend (ver como `arrecadacao/pagamentos/components` faz com o botão Estornar)
- [ ] 8.6 Criar CancelarModal (textarea justificativa min 10 chars + contador + botão danger)
- [ ] 8.7 Criar FinalizarModal (texto irreversível + botão danger "Confirmar Finalização")
- [ ] 8.8 Criar ProcessoDetailPage (dados + timeline transições + ProcessoActions + modais)
- [ ] 8.9 Criar DisponibilidadeList (cards/lista clicáveis com rubrica, período, verba, execuções)
- [ ] 8.10 Criar CriarProcessoPage (PageHeader + DisponibilidadeList + empty state + redirect após criar)
- [ ] 8.11 Adicionar rotas no distribuicao/index.tsx (processos, processos/novo, processos/:id)
- [ ] 8.12 Adicionar sub-item "Processos" no Sidebar **escondido se o usuário não tem `distribuicao:default:processo:listar`** (ADR 0004) — seguir o padrão de gating do sidebar já em uso em outros módulos
- [ ] 8.13 Verificar: `cd frontend && npm run build`

## Sequenciamento

- Bloqueado por: 7.0 (hooks e API)
- Desbloqueia: nenhum
- Paralelizável: Não (depende dos hooks)

## Detalhes de Implementação

Ver techspec-frontend.md para design completo de cada componente. Pontos-chave:

**ProcessoStatusBadge:**
```typescript
const STATUS_VARIANT: Record<StatusProcesso, BadgeVariant> = {
  CRIADO: 'accent', CALCULADO: 'warning', APROVADO: 'success',
  FINALIZADO: 'secondary', CANCELADO: 'error',
};
```

**ProcessosFilters — resetar page ao filtrar:**
```typescript
const handleFilterChange = (partial: Partial<ProcessoFiltros>) => {
  setFiltros(prev => ({ ...prev, ...partial, page: 1 }));
};
```

**ProcessoActions — botões condicionais (estado × permission):**
- CRIADO: Calcular (primary, gated por `processo:calcular`) + Cancelar (danger, gated por `processo:cancelar`)
- CALCULADO: Aprovar (primary, gated por `processo:aprovar`) + Cancelar (danger, gated por `processo:cancelar`)
- APROVADO: Finalizar (primary, gated por `processo:finalizar`) + Cancelar (danger, gated por `processo:cancelar`)
- FINALIZADO/CANCELADO: nenhum botão

```typescript
const { hasPermission } = usePermissions(); // hook/contexto existente
// ...
{processo.status === 'CRIADO' && hasPermission('distribuicao:default:processo:calcular') && (
  <Button variant="primary" onClick={...}>Calcular</Button>
)}
```

**CancelarModal:**
- Textarea com minLength 10, maxLength 500
- Contador de caracteres (ex: "45/500")
- Botão desabilitado se < 10 chars ou durante mutation
- Seguir padrão de EstornarPagamentoModal

**FinalizarModal:**
- Texto: "Esta ação é irreversível. Os créditos se tornarão definitivos e o Rol será bloqueado para cancelamento. Deseja continuar?"
- Botões: "Cancelar" (secondary) + "Confirmar Finalização" (danger)
- Seguir padrão de AlterarStatusModal (ação destrutiva)

**CriarProcessoPage — redirect após criar:**
```typescript
const handleSelect = async (item: Disponibilidade) => {
  const processo = await criar.mutateAsync({ rubricaSigla: item.rubrica.sigla, periodo: item.periodo });
  navigate(`/distribuicao/processos/${processo.id}`);
};
```

**Sidebar addition:**
```typescript
{ label: 'Processos', path: '/distribuicao/processos' }
```

**Rotas adicionadas ao distribuicao/index.tsx:**
```typescript
<Route path="processos" element={<ProcessosPage />} />
<Route path="processos/novo" element={<CriarProcessoPage />} />
<Route path="processos/:id" element={<ProcessoDetailPage />} />
```

## Critérios de Sucesso (Verificáveis)

- [ ] Build compila: `cd frontend && npm run build`
- [ ] TypeScript sem erros: `cd frontend && npx tsc --noEmit`
- [ ] Rota /distribuicao/processos renderiza listagem
- [ ] Rota /distribuicao/processos/novo renderiza criação com disponíveis
- [ ] Rota /distribuicao/processos/:id renderiza detalhes com ações
- [ ] Badges coloridos por status (5 variantes)
- [ ] Filtros resetam página ao alterar
- [ ] CancelarModal valida justificativa min 10 chars
- [ ] FinalizarModal exibe aviso de irreversibilidade
- [ ] Sidebar mostra "Processos" em Distribuição **apenas para usuários com `distribuicao:default:processo:listar`**
- [ ] `ProcessoActions` esconde cada botão de transição conforme a permission correspondente do usuário (validado manualmente em ambiente local com 2 usuários — analista vs. consultor)
