---
status: completed
parallelizable: true
blocked_by: [5.0]
---

<task_context>
<domain>engine/frontend/distribuicao</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>react,vite,tanstack-query,bff,ecad-auditoria</dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 7.0: Implementar aba "Histórico de Alterações" + gating granular em `ProcessoDetailPage`

## Relacionada às User Stories

- [US-03] Gerente de Distribuição (ver histórico) — cobertura direta
- [US-01] Diretor de Governança (auditoria visível ao Gerente) — cobertura direta
- [US-06] Operador de Suporte (LGPD — não vê justificativa/exportar) — cobertura direta

## Visão Geral

Adicionar a aba "Histórico de Alterações" em `ProcessoDetailPage` (visível apenas para Gerentes) e aplicar gating granular nos componentes existentes: ocultar "Dados do Cancelamento" para quem não tem `processo:ver-justificativa-cancelamento`; ocultar botão "Recalcular" para quem não tem `processo:recalcular-pos-calculado`; gating do botão "Exportar" (adicionar se ainda não existe).

Consome o endpoint da Tarefa 5.0 (`GET /api/distribuicao/processos/:id/historico`). Renderiza diff `before`/`after` para eventos `DATA_CHANGE` e ações para eventos `USER_ACTION`.

## Requisitos

- Novo componente `HistoricoAlteracoesTab.tsx` que consome a rota BFF e renderiza a timeline.
- `ProcessoDetailPage.tsx` ganha layout com tabs/sections: "Detalhes" (existente) e "Histórico de Alterações" (nova, gateada).
- Gating de componentes UI:
  - Seção "Dados do Cancelamento" + justificativa → `<Can permission="distribuicao:default:processo:ver-justificativa-cancelamento">`
  - Botão "Recalcular" (a adicionar se não existe; comentado/TODO se backend ainda não suporta) → `<Can permission="distribuicao:default:processo:recalcular-pos-calculado">`
  - Botão "Exportar" → `<Can permission="distribuicao:default:processo:exportar">`
- CPF de Titular nas listagens de Crédito é mascarado server-side (Tarefa 2.0); UI apenas exibe o que vem.
- Testes RTL por perfil.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/distribuicao/processos/components/HistoricoAlteracoesTab.tsx`
  - `frontend/src/features/distribuicao/processos/components/HistoricoAlteracoesTab.test.tsx`
  - `frontend/src/features/distribuicao/processos/api/historicoApi.ts` (hook Tanstack Query)
- **Modificar:**
  - `frontend/src/features/distribuicao/processos/pages/ProcessoDetailPage.tsx`:
    - Estruturar como abas/sections (Detalhes + Histórico)
    - Gating de "Dados do Cancelamento" via `<Can>`
    - Renderizar `<HistoricoAlteracoesTab>` gateado
  - `frontend/src/features/distribuicao/processos/components/ProcessoActions.tsx`:
    - Gating de "Exportar" (adicionar botão se não existe)
    - Gating de "Recalcular" se existir; senão deixar como TODO marcado
  - `frontend/src/features/distribuicao/processos/pages/ProcessoDetailPage.test.tsx`:
    - Adicionar cenários por perfil
- **Referência:**
  - `frontend/src/shared/authz/Can.tsx`
  - `docs/adr/0009-cpf-masking-permission-aware-mapper.md` (CPF é server-side)
  - `/home/tsgomes/github-tassosgomes/ecad-auditoria/audit-contract/src/main/resources/schema/audit-event-v1.schema.json` (shape do evento)
- **Skills para consultar:**
  - `react-architecture` — composição de tabs/sections
  - `react-testing` — RTL com `userEvent` para troca de aba; mock de `usePermissions`
  - `react-code-quality` — TS estrito

## Subtarefas

- [ ] 7.1 Criar `historicoApi.ts` com hook `useHistoricoProcesso(processoId)`
- [ ] 7.2 Criar `HistoricoAlteracoesTab.tsx`:
  - Loading / Error / Empty states
  - Lista cronológica de eventos
  - Para `DATA_CHANGE`: tabela ou cards mostrando diff campo-a-campo (`before` vs `after`)
  - Para `USER_ACTION`: cartão com ação + subject + timestamp
- [ ] 7.3 Refatorar `ProcessoDetailPage.tsx` para suportar abas (preservar conteúdo atual como aba "Detalhes")
- [ ] 7.4 Renderizar `<HistoricoAlteracoesTab>` dentro de `<Can permission="distribuicao:default:processo:ver-historico-alteracoes">`
- [ ] 7.5 Gating do bloco "Dados do Cancelamento" (linhas 188-198 do arquivo atual) por `<Can permission="distribuicao:default:processo:ver-justificativa-cancelamento">`
- [ ] 7.6 Adicionar botão "Exportar" em `ProcessoActions.tsx` gateado por `processo:exportar` (se design já tiver definido; senão registrar TODO + placeholder)
- [ ] 7.7 Verificar/adicionar gating em "Recalcular" em `ProcessoCalculoPage` ou `ProcessoActions` se houver botão; gateado por `processo:recalcular-pos-calculado`
- [ ] 7.8 Testes RTL `HistoricoAlteracoesTab.test.tsx`:
  - Renderiza lista quando API retorna eventos
  - Estado loading
  - Estado erro (BFF 503)
  - Render correto de DATA_CHANGE com diff
- [ ] 7.9 Atualizar `ProcessoDetailPage.test.tsx`:
  - Como Gerente → aba "Histórico" visível
  - Como Analista → aba "Histórico" ausente
  - Como Consultor → "Dados do Cancelamento" ausente em processo cancelado
  - Como Analista → botão "Exportar" presente

## Sequenciamento

- Bloqueado por: 5.0 (precisa da rota BFF de histórico)
- Desbloqueia: 8.0
- Paralelizável: Sim — em paralelo a 6.0 (telas independentes)

## Rastreabilidade

- Esta tarefa cobre: RF-02 (categoria Trilha de auditoria materializada), RF-03 (gating de UI: `ver-historico-alteracoes`, `ver-justificativa-cancelamento`, `processo:exportar`, `recalcular-pos-calculado`)
- Evidência esperada: aba renderizada corretamente para Gerente; oculta para outros; diff de DATA_CHANGE visível; testes RTL verdes

## Detalhes de Implementação

### `historicoApi.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { authedFetch } from '@shared/api/authedFetch';

export interface AuditEvent {
  id: string;
  eventType: 'SCREEN_ACCESS' | 'USER_ACTION' | 'DATA_CHANGE';
  occurredAt: string;
  subject: { id: string; name?: string; email?: string };
  entityType: string;
  entityId: string;
  action?: string;
  payload?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  correlationId?: string;
}

export interface AuditTimeline {
  events: AuditEvent[];
  page: number; size: number; total: number;
}

export function useHistoricoProcesso(processoId: string) {
  return useQuery({
    queryKey: ['distribuicao', 'processo', processoId, 'historico'],
    queryFn: () => authedFetch<AuditTimeline>(`/api/distribuicao/processos/${processoId}/historico`),
    enabled: !!processoId
  });
}
```

### `HistoricoAlteracoesTab.tsx` (esqueleto)

```tsx
export function HistoricoAlteracoesTab({ processoId }: { processoId: string }) {
  const { data, isLoading, error } = useHistoricoProcesso(processoId);

  if (isLoading) return <Loading />;
  if (error) return <ErrorState message="Não foi possível carregar o histórico" />;
  if (!data?.events?.length) return <EmptyState message="Sem alterações registradas" />;

  return (
    <ol className={styles.timeline}>
      {data.events.map(event => (
        <li key={event.id} className={styles.event}>
          <header>
            <time>{formatDateTime(event.occurredAt)}</time>
            <span className={styles.subject}>{event.subject.name ?? event.subject.id}</span>
            <Badge>{event.action ?? event.eventType}</Badge>
          </header>
          {event.eventType === 'DATA_CHANGE' && event.payload && (
            <DataChangeDiff before={event.payload.before} after={event.payload.after} />
          )}
        </li>
      ))}
    </ol>
  );
}

function DataChangeDiff({ before = {}, after = {} }: { before?: Record<string, unknown>; after?: Record<string, unknown> }) {
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  return (
    <table className={styles.diff}>
      <thead><tr><th>Campo</th><th>Antes</th><th>Depois</th></tr></thead>
      <tbody>
        {keys.map(k => (
          <tr key={k}>
            <td>{k}</td>
            <td>{String(before[k] ?? '—')}</td>
            <td>{String(after[k] ?? '—')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Mudanças em `ProcessoDetailPage.tsx`

```tsx
// Adicionar estado de aba ativa
const [activeTab, setActiveTab] = useState<'detalhes' | 'historico'>('detalhes');

// Renderizar tabs
<Tabs value={activeTab} onChange={setActiveTab}>
  <Tab value="detalhes">Detalhes</Tab>
  <Can permission="distribuicao:default:processo:ver-historico-alteracoes">
    <Tab value="historico">Histórico de Alterações</Tab>
  </Can>
</Tabs>

{activeTab === 'detalhes' && (
  <>
    {/* Conteúdo atual da página */}
    {processo.status === 'CANCELADO' && processo.justificativaCancelamento && (
      <Can permission="distribuicao:default:processo:ver-justificativa-cancelamento">
        <div className={styles.card}>
          {/* Bloco existente */}
        </div>
      </Can>
    )}
  </>
)}

{activeTab === 'historico' && (
  <Can permission="distribuicao:default:processo:ver-historico-alteracoes">
    <HistoricoAlteracoesTab processoId={processo.id} />
  </Can>
)}
```

### Mudanças em `ProcessoActions.tsx`

```tsx
// Adicionar (se não existir)
<Can permission="distribuicao:default:processo:exportar">
  <Button onClick={onExportar}>Exportar</Button>
</Can>

// Se houver botão "Recalcular":
<Can permission="distribuicao:default:processo:recalcular-pos-calculado">
  <Button onClick={onRecalcular}>Recalcular</Button>
</Can>
```

**Convenções da stack (das skills consultadas):**

- Tabs via componente próprio ou Headless UI (verificar padrão atual em `frontend/src/shared/components/ui/`)
- Vitest + RTL para testes; mock de `usePermissions` consistente com Tarefa 6.0
- Diff render simples nesta entrega — sem syntax highlighting JSON, sem virtualization
- TS estrito; tipos do contrato `audit-event-v1` em `historicoApi.ts`

## Critérios de Sucesso (Verificáveis)

- [ ] Build: `cd frontend && npm run build` sem erros
- [ ] Lint: `cd frontend && npm run lint`
- [ ] Testes: `cd frontend && npm test -- HistoricoAlteracoes ProcessoDetail` verdes
- [ ] Manual com BFF + audit-service rodando:
  - `gerente.dev` abre `/distribuicao/processos/{id}` e vê aba "Histórico" com timeline
  - `analista.dev` abre a mesma página e NÃO vê a aba
  - `consultor.dev` abre processo CANCELADO e NÃO vê "Dados do Cancelamento"
  - `gerente.dev` vê botão "Exportar" enabled; `consultor.dev` não vê
- [ ] DataChangeDiff renderiza corretamente um evento mockado com `before`/`after`
- [ ] Estado de loading exibido enquanto BFF responde; estado de erro exibido em caso de 503
