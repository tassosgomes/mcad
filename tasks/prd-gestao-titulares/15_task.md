---
status: completed
parallelizable: false
blocked_by: ["12.0", "14.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 15.0: Feature — Páginas + Rotas + Sidebar + ToastProvider

## Relacionada às User Stories

- Todas as HUs — composição final das páginas

## Visão Geral

Criar as 3 páginas (Listagem, Criar, Editar), registrar rotas no Cadastro, adicionar "Titulares" na sidebar, wrappear App com ToastProvider e testar end-to-end com backend rodando.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/cadastro/titulares/pages/TitularesPage.tsx` + `.module.css`
  - `frontend/src/features/cadastro/titulares/pages/TitularCreatePage.tsx`
  - `frontend/src/features/cadastro/titulares/pages/TitularEditPage.tsx` + `.module.css`
  - `frontend/src/features/cadastro/titulares/index.ts`
- **Modificar:**
  - `frontend/src/features/cadastro/index.tsx` — adicionar 3 rotas: `/titulares`, `/titulares/novo`, `/titulares/:id/editar`
  - `frontend/src/shared/components/layout/sidebar/Sidebar.tsx` — adicionar item "Titulares" em Cadastro
  - `frontend/src/App.tsx` — wrappear com ToastProvider
- **Referência:**
  - `tasks/prd-gestao-titulares/techspec-frontend.md` — seções Páginas, Rotas
  - Stitch screens (task 9.0)
  - `frontend/src/features/cadastro/associacoes/pages/AssociacoesPage.tsx` — padrão
- **Skills:** `react-architecture` — features, routing, lazy loading

## Subtarefas

- [x] 15.1 **TitularesPage** — composição: PageHeader (com botão "Novo Titular"), TitularesFilters, TitularesTable, Pagination, DeleteTitularModal. State: filtros, titularParaExcluir. Toasts de sucesso/erro.
- [x] 15.2 **TitularCreatePage** — PageHeader "Novo Titular" + TitularForm (modo criação) + useCreateTitular. Sucesso → navigate("/cadastro/titulares") + toast "Titular criado com sucesso". Erro → toast com mensagem do ProblemDetails.
- [x] 15.3 **TitularEditPage** — useParams(id) + useTitular(id) + TitularForm (modo edição) + useUpdateTitular. Loading/error states. Sucesso → navigate back + toast.
- [x] 15.4 Criar `index.ts` da feature (exporta TitularesPage, TitularCreatePage, TitularEditPage)
- [x] 15.5 Atualizar `features/cadastro/index.tsx` com 3 novas rotas
- [x] 15.6 Atualizar Sidebar: adicionar `{ label: 'Titulares', path: '/cadastro/titulares' }` em Cadastro
- [x] 15.7 Wrappear App com ToastProvider
- [x] 15.8 Testar end-to-end: frontend + backend rodando

## Detalhes de Implementação

### TitularesPage (composição final)
```typescript
export function TitularesPage() {
  const [filtros, setFiltros] = useState<TitularFiltros>({ page: 1, size: 20, sort: 'nome' });
  const { data, isLoading, error, refetch } = useTitulares(filtros);
  const deleteMutation = useDeleteTitular();
  const [titularParaExcluir, setTitularParaExcluir] = useState<Titular | null>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(titularParaExcluir!.id);
      showToast('Titular excluído com sucesso', 'success');
      setTitularParaExcluir(null);
    } catch (err: any) {
      showToast(err.detail || 'Erro ao excluir titular', 'error');
    }
  };

  // ... render com PageHeader, Filters, Table, Pagination, DeleteModal
}
```

### Sidebar update
```typescript
children: [
  { label: 'Associações', path: '/cadastro/associacoes' },
  { label: 'Titulares', path: '/cadastro/titulares' },
],
```

### Routes update
```typescript
<Route path="titulares" element={<TitularesPage />} />
<Route path="titulares/novo" element={<TitularCreatePage />} />
<Route path="titulares/:id/editar" element={<TitularEditPage />} />
```

## Critérios de Sucesso (Verificáveis)

- [x] `npm run build` compila sem erros
- [x] Navegar para `/cadastro/titulares` exibe listagem paginada
- [x] Sidebar mostra "Titulares" abaixo de "Associações"
- [x] Clicar "Novo Titular" navega para formulário de criação
- [x] Criar titular PF → toast "Titular criado", redirect para listagem
- [x] Criar titular com CPF duplicado → toast com erro 409
- [x] Editar titular → campos tipo/documento disabled
- [x] Excluir titular → modal de confirmação → toast "Titular excluído"
- [x] Filtros funcionam com debounce
- [x] Paginação funciona (prev/next)
- [x] Ordenação por coluna funciona (click no header)
