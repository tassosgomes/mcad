---
status: pending
parallelizable: false
blocked_by: ["9.0"]
---

<task_context>
<domain>arrecadacao/frontend</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>http_server</dependencies>
<unblocks>"11.0"</unblocks>
</task_context>

# Tarefa 10.0: Frontend — componentes e pages Pagamentos

## Relacionada as User Stories

- [HU-03] Registrar pagamento (cobertura direta — form com preview)
- [HU-04] Consultar pagamentos (cobertura direta — listagem com filtros)
- [HU-05] Visualizar detalhes pagamento (cobertura direta — detail page)

## Visao Geral

Implementar os 4 componentes de Pagamentos (StatusBadgePagamento, PagamentosTable, PagamentosFilters, RegistrarPagamentoForm) e as 3 pages (PagamentosPage, PagamentoCreatePage, PagamentoDetailPage). O form inclui preview em tempo real do valor calculado (quantidadeUdas × UDA vigente) e autocomplete de licenca reutilizando `useLicencas` do F03.

## Requisitos

- `StatusBadgePagamento`: CONFIRMADO verde, ESTORNADO vermelho
- `PagamentosTable`: colunas Usuario, Rubrica, Periodo, Qtd UDAs, Valor R$, Status, link detalhes
- `PagamentosFilters`: 5 filtros (razaoSocial debounce, rubrica select, periodo month, status select, reset)
- `RegistrarPagamentoForm`: autocomplete licenca (ATIVA/SUSPENSA), UDA vigente display, input quantidadeUdas, preview calculo, periodo read-only, validacao, tratamento 409/422
- `PagamentosPage`: PageHeader + botao Novo (analista) + Filters + Table + Pagination
- `PagamentoCreatePage`: PageHeader + Voltar + RegistrarPagamentoForm, redirect apos sucesso
- `PagamentoDetailPage`: dados completos, licenca expandida, botao Estornar preparado (disabled/omitido — F06)
- CSS Modules para cada componente e page

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/arrecadacao/pagamentos/components/StatusBadgePagamento.tsx`
  - `frontend/src/features/arrecadacao/pagamentos/components/StatusBadgePagamento.module.css`
  - `frontend/src/features/arrecadacao/pagamentos/components/PagamentosTable.tsx`
  - `frontend/src/features/arrecadacao/pagamentos/components/PagamentosTable.module.css`
  - `frontend/src/features/arrecadacao/pagamentos/components/PagamentosFilters.tsx`
  - `frontend/src/features/arrecadacao/pagamentos/components/PagamentosFilters.module.css`
  - `frontend/src/features/arrecadacao/pagamentos/components/RegistrarPagamentoForm.tsx`
  - `frontend/src/features/arrecadacao/pagamentos/components/RegistrarPagamentoForm.module.css`
  - `frontend/src/features/arrecadacao/pagamentos/pages/PagamentosPage.tsx`
  - `frontend/src/features/arrecadacao/pagamentos/pages/PagamentosPage.module.css`
  - `frontend/src/features/arrecadacao/pagamentos/pages/PagamentoCreatePage.tsx`
  - `frontend/src/features/arrecadacao/pagamentos/pages/PagamentoCreatePage.module.css`
  - `frontend/src/features/arrecadacao/pagamentos/pages/PagamentoDetailPage.tsx`
  - `frontend/src/features/arrecadacao/pagamentos/pages/PagamentoDetailPage.module.css`
- **Referencia:**
  - `frontend/src/features/arrecadacao/pagamentos/hooks/usePagamentos.ts`
  - `frontend/src/features/arrecadacao/pagamentos/hooks/usePagamento.ts`
  - `frontend/src/features/arrecadacao/pagamentos/hooks/useRegistrarPagamento.ts`
  - `frontend/src/features/arrecadacao/uda/hooks/useUdaVigente.ts`
  - `frontend/src/features/arrecadacao/shared/utils/formatCurrency.ts`
  - `frontend/src/features/arrecadacao/licencas/hooks/useLicencas.ts` (autocomplete)
  - `frontend/src/features/arrecadacao/licencas/components/StatusBadgeLicenca.tsx` (padrao badge)
  - `frontend/src/shared/components/ui/table/`
  - `frontend/src/shared/components/ui/pagination/`
  - `frontend/src/shared/components/ui/autocomplete/`
  - `frontend/src/shared/hooks/useDebounce.ts`
  - `frontend/src/features/cadastro/titulares/components/TitularesFilters.tsx` (padrao filtros)
- **Skills para consultar durante implementacao:**
  - `react-architecture` — feature modules, pages/components split
  - `react-code-quality` — CSS Modules, typed props, forms com estado manual

## Subtarefas

- [ ] 10.1 Criar `StatusBadgePagamento` (CONFIRMADO verde, ESTORNADO vermelho)
- [ ] 10.2 Criar `PagamentosTable` com 7 colunas, link detalhes
- [ ] 10.3 Criar `PagamentosFilters` com 5 filtros + debounce + reset
- [ ] 10.4 Criar `RegistrarPagamentoForm` com autocomplete licenca, preview valor, validacao
- [ ] 10.5 Criar `PagamentosPage` (listagem com filtros e paginacao)
- [ ] 10.6 Criar `PagamentoCreatePage` (form + redirect pos-sucesso)
- [ ] 10.7 Criar `PagamentoDetailPage` (detalhes expandidos, botao Estornar preparado)
- [ ] 10.8 Criar CSS Modules para todos os componentes e pages

## Sequenciamento

- Bloqueado por: 9.0
- Desbloqueia: 11.0
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: RF-07 a RF-17 (interface completa de pagamentos)
- Evidencia esperada: 3 pages funcionais com formulario, listagem e detalhes

## Detalhes de Implementacao

**StatusBadgePagamento:**

```tsx
interface StatusBadgePagamentoProps {
  status: StatusPagamento;
}

const STATUS_STYLES: Record<StatusPagamento, string> = {
  CONFIRMADO: styles.success,
  ESTORNADO: styles.error,
};

export function StatusBadgePagamento({ status }: StatusBadgePagamentoProps) {
  return <span className={`${styles.badge} ${STATUS_STYLES[status]}`}>{status}</span>;
}
```

**RegistrarPagamentoForm — preview em tempo real:**

```tsx
export function RegistrarPagamentoForm() {
  const [licencaId, setLicencaId] = useState('');
  const [quantidadeUdas, setQuantidadeUdas] = useState('');
  const { data: udaVigente, isError: semUda } = useUdaVigente();
  const mutation = useRegistrarPagamento();
  const navigate = useNavigate();

  // Preview calculation
  const previewValor = useMemo(() => {
    if (!udaVigente || !quantidadeUdas) return null;
    const qty = parseFloat(quantidadeUdas);
    const uda = parseFloat(udaVigente.valor);
    if (isNaN(qty) || isNaN(uda) || qty <= 0) return null;
    return (qty * uda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }, [quantidadeUdas, udaVigente]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({ licencaId, quantidadeUdas }, {
      onSuccess: (data) => {
        toast.success('Pagamento registrado');
        navigate(`/arrecadacao/pagamentos/${data.id}`);
      },
      onError: (err) => {
        // 409 → "Ja existe pagamento para esta licenca em [periodo]"
        // 422 → "Licenca encerrada" ou "Sem UDA vigente"
        toast.error(err.message);
      },
    });
  }

  // Autocomplete de licenca (ATIVA + SUSPENSA) via useLicencas
  // UDA vigente display: formatBRL(udaVigente.valor)
  // Periodo read-only: mes/ano atual
  // Preview: "X UDAs × R$ Y = R$ Z"
  // Desabilitar form se semUda
}
```

**PagamentosFilters:**

```tsx
// 5 filtros com debounce 300ms:
// - razaoSocial: TextInput com useDebounce
// - rubricaSigla: Select (7 opcoes fixas)
// - periodo: input type="month"
// - status: Select (Todos / Confirmado / Estornado)
// - Botao "Limpar filtros"
```

**PagamentoDetailPage:**

```tsx
export function PagamentoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: pagamento, isLoading } = usePagamento(id!);

  // Card com dados expandidos:
  // Licenca (id, usuario razaoSocial, rubrica sigla)
  // Qtd UDAs: formatUdas(pagamento.quantidadeUdas)
  // Valor UDA: formatBRL(pagamento.valorUdaNoMomento)
  // Valor Bruto: formatBRL(pagamento.valorBruto)
  // Periodo, Status (badge), Data Registro
  // Botao Estornar: disabled com tooltip "Disponivel na proxima versao" (F06)
}
```

**Convencoes da stack:**
- Functional components, typed props (interface)
- CSS Modules, kebab-case pastas, PascalCase arquivos
- Formularios com estado manual (useState), sem lib de forms
- useMemo para preview calculation (com motivo real)
- Debounce 300ms nos filtros de texto
- String decimal para valores (parseFloat apenas para display)
- Componentes < 300 linhas

## Criterios de Sucesso (Verificaveis)

- [ ] Build compila: `cd frontend && npm run build`
- [ ] TypeScript sem erros: `cd frontend && npx tsc --noEmit`
- [ ] PagamentosPage renderiza com filtros + tabela + paginacao
- [ ] PagamentoCreatePage mostra preview em tempo real ao digitar quantidadeUdas
- [ ] PagamentoDetailPage mostra dados expandidos com valores formatados
- [ ] StatusBadgePagamento: CONFIRMADO verde, ESTORNADO vermelho
