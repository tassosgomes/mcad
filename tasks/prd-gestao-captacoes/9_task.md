---
status: completed
parallelizable: false
blocked_by: [5.0, 7.0, 8.0]
---

<task_context>
<domain>identificacao/frontend</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>http_server</dependencies>
<unblocks>"none"</unblocks>
</task_context>

# Tarefa 9.0: Frontend — Pages e Roteamento

## Relacionada aos Requisitos

- RF-01 — CaptacaoCreatePage (criação)
- RF-02 — CaptacoesPage (listagem com filtros)
- RF-03 — CaptacaoDetailPage (detalhe)
- RF-04 — CaptacaoDetailPage (edição inline)
- RF-05 — CaptacoesPage + CaptacaoDetailPage (exclusão com modal)

## Visão Geral

Implementar as 3 páginas (listagem, criação, detalhe/edição), o módulo de rotas do Identificação, e integrar com o router e sidebar existentes. Esta é a task final que conecta tudo.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/identificacao/captacoes/pages/CaptacoesPage.tsx`
  - `frontend/src/features/identificacao/captacoes/pages/CaptacaoCreatePage.tsx`
  - `frontend/src/features/identificacao/captacoes/pages/CaptacaoDetailPage.tsx`
  - `frontend/src/features/identificacao/captacoes/index.ts`
  - `frontend/src/features/identificacao/index.tsx`
- **Modificar:**
  - `frontend/src/app/router/routes.tsx` (adicionar rota `/identificacao/*` com lazy loading)
  - `frontend/src/shared/components/layout/sidebar/Sidebar.tsx` (habilitar Identificação + child Captações)
  - `frontend/.env.example` (adicionar `VITE_IDENTIFICACAO_API_BASE_URL`)
- **Referência:**
  - `frontend/src/features/cadastro/obras/pages/ObrasPage.tsx` (padrão de listagem)
  - `frontend/src/features/cadastro/obras/pages/ObraDetailPage.tsx` (padrão de detalhe)
  - `frontend/src/features/cadastro/index.tsx` (padrão de rotas de feature)

## Subtarefas

- [x] 9.1 Criar `CaptacoesPage.tsx` — estado de filtros (default: page 1, size 20, sort -periodo), useCaptacoes, useAuth para canWrite, navigate para criar/detalhar, delete com modal e toast
- [x] 9.2 Criar `CaptacaoCreatePage.tsx` — CaptacaoForm sem initialData, useCreateCaptacao, toast sucesso/erro, navigate back, tratamento 409 CAPTACAO_DUPLICADA
- [x] 9.3 Criar `CaptacaoDetailPage.tsx` — useCaptacao(id), cards de resumo de execuções, CaptacaoForm com initialData, useUpdateCaptacao, delete com modal, tratamento 409 RUBRICA_BLOQUEADA/CAPTACAO_DUPLICADA, 422 STATUS_INVALIDO, 403 FORBIDDEN
- [x] 9.4 Criar `captacoes/index.ts` (barrel export das 3 pages)
- [x] 9.5 Criar `identificacao/index.tsx` (Routes: captacoes, captacoes/nova, captacoes/:id)
- [x] 9.6 Modificar `routes.tsx` — adicionar lazy import de IdentificacaoRoutes e rota `/identificacao/*`
- [x] 9.7 Modificar `Sidebar.tsx` — habilitar seção Identificação (disabled: false) + children: [{label: 'Captações', path: '/identificacao/captacoes'}]
- [x] 9.8 Modificar `.env.example` — adicionar `VITE_IDENTIFICACAO_API_BASE_URL=http://localhost:5100/api/v1`
- [x] 9.9 Teste de integração manual: navegar pela UI, criar/editar/excluir captação

## Sequenciamento

- Bloqueado por: 5.0 (backend rodando), 7.0 (hooks), 8.0 (componentes)
- Desbloqueia: Nenhum (task final)
- Paralelizável: Não

## Detalhes de Implementação

**CaptacoesPage.tsx:**
```typescript
export function CaptacoesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasRole, user } = useAuth();
  const canWrite = hasRole('analista-identificacao');
  const userId = user?.profile.sub;

  const [filtros, setFiltros] = useState<CaptacaoFiltros>({
    page: 1, size: 20, sort: '-periodo'
  });
  const [captacaoParaExcluir, setCaptacaoParaExcluir] = useState<Captacao | null>(null);

  const { data, isLoading, error, refetch } = useCaptacoes(filtros);
  const deleteMutation = useDeleteCaptacao();

  useDocumentTitle('Captações — Identificação');

  async function handleDelete() {
    if (!captacaoParaExcluir) return;
    try {
      await deleteMutation.mutateAsync(captacaoParaExcluir.id);
      showToast('Captação excluída com sucesso', 'success');
      setCaptacaoParaExcluir(null);
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      showToast(problem.detail || 'Erro ao excluir captação', 'error');
    }
  }

  return (
    <div>
      <PageHeader title="Captações" action={
        canWrite ? <Button onClick={() => navigate('/identificacao/captacoes/nova')}>Nova Captação</Button> : undefined
      } />
      <CaptacaoFilters filtros={filtros} onChange={setFiltros} />
      {isLoading ? <Loading /> : error ? <ErrorState onRetry={refetch} /> : (
        <>
          <CaptacoesTable
            data={data!.data}
            canWrite={canWrite}
            currentUserId={userId ?? ''}
            sort={filtros.sort ?? '-periodo'}
            onSortChange={(sort) => setFiltros(f => ({ ...f, sort, page: 1 }))}
            onView={(id) => navigate(`/identificacao/captacoes/${id}`)}
            onDelete={setCaptacaoParaExcluir}
          />
          <Pagination
            pagination={data!.pagination}
            onPageChange={(page) => setFiltros(f => ({ ...f, page }))}
          />
        </>
      )}
      <DeleteCaptacaoModal
        captacao={captacaoParaExcluir}
        isOpen={!!captacaoParaExcluir}
        isDeleting={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setCaptacaoParaExcluir(null)}
      />
    </div>
  );
}
```

**CaptacaoDetailPage.tsx — tratamento de erros:**
```typescript
async function handleUpdate(data: AtualizarCaptacaoRequest) {
  try {
    await updateMutation.mutateAsync({ id: captacao!.id, data });
    showToast('Captação atualizada com sucesso', 'success');
  } catch (err: unknown) {
    const problem = err as { code?: string; detail?: string };
    switch (problem.code) {
      case 'CAPTACAO_DUPLICADA':
        showToast(problem.detail || 'Já existe captação para esta rubrica+período', 'error');
        break;
      case 'RUBRICA_BLOQUEADA':
        showToast('Não é possível alterar a rubrica com execuções vinculadas', 'error');
        break;
      case 'STATUS_INVALIDO':
        showToast('Apenas captações ABERTAS podem ser editadas', 'error');
        break;
      default:
        showToast(problem.detail || 'Erro ao atualizar captação', 'error');
    }
  }
}
```

**CaptacaoDetailPage — layout com resumo de execuções:**
```tsx
<div className={styles.resumoCards}>
  <div className={styles.card}>
    <span className={styles.cardLabel}>Total</span>
    <span className={styles.cardValue}>{captacao.resumoExecucoes.total}</span>
  </div>
  <div className={styles.card}>
    <span className={styles.cardLabel}>Identificadas</span>
    <span className={styles.cardValue}>{captacao.resumoExecucoes.identificadas}</span>
  </div>
  <div className={styles.card}>
    <span className={styles.cardLabel}>Pendentes</span>
    <span className={styles.cardValue}>{captacao.resumoExecucoes.pendentes}</span>
  </div>
</div>
```

**identificacao/index.tsx:**
```typescript
import { Routes, Route } from 'react-router-dom';
import { CaptacoesPage, CaptacaoCreatePage, CaptacaoDetailPage } from './captacoes';

export default function IdentificacaoRoutes() {
  return (
    <Routes>
      <Route path="captacoes" element={<CaptacoesPage />} />
      <Route path="captacoes/nova" element={<CaptacaoCreatePage />} />
      <Route path="captacoes/:id" element={<CaptacaoDetailPage />} />
    </Routes>
  );
}
```

**routes.tsx — adição:**
```typescript
const IdentificacaoRoutes = lazy(() => import('@features/identificacao'));

// Dentro dos children do layout:
{
  path: 'identificacao/*',
  element: (
    <Suspense fallback={<Loading />}>
      <IdentificacaoRoutes />
    </Suspense>
  )
}
```

**Sidebar.tsx — habilitar Identificação:**
```typescript
// Mudar de:
{ label: 'Identificação', icon: Search, basePath: '/identificacao', disabled: true },
// Para:
{
  label: 'Identificação',
  icon: Search,
  basePath: '/identificacao',
  disabled: false,
  children: [
    { label: 'Captações', path: '/identificacao/captacoes' },
  ],
},
```

## Critérios de Sucesso (Verificáveis)

- [x] Build compila: `cd frontend && npm run build`
- [x] TypeScript sem erros: `cd frontend && npx tsc --noEmit`
- [x] Navegação para `/identificacao/captacoes` exibe a listagem
- [x] Sidebar mostra "Identificação > Captações" habilitado
- [x] Criar captação via formulário → 201, toast sucesso, redirecionamento para listagem
- [x] Editar captação ABERTA → 200, toast sucesso
- [x] Excluir captação ABERTA → 204, toast sucesso, item removido da lista
- [x] Erro 409 CAPTACAO_DUPLICADA → toast com mensagem do backend
- [x] Consultor sem role `analista-identificacao` → botões de escrita ocultos
