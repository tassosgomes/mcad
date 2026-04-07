---
status: done
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

# Tarefa 10.0: Pages

## Relacionada as User Stories
- [HU-01] Criar licenca (cobertura direta — LicencaCreatePage)
- [HU-02] Listar licencas com filtros (cobertura direta — LicencasPage)
- [HU-03] Visualizar detalhe de licenca (cobertura direta — LicencaDetailPage)
- [HU-04] Suspender licenca (cobertura direta — LicencaDetailPage)
- [HU-05] Reativar licenca (cobertura direta — LicencaDetailPage)
- [HU-06] Encerrar licenca (cobertura direta — LicencaDetailPage)

## Visao Geral

Implementa as 3 paginas do modulo de Licencas integrando os componentes da tarefa 9.0 com os hooks da tarefa 8.0. Cada pagina gerencia o estado de filtros/paginacao, orquestra os hooks TanStack Query, exibe feedback via toast e aplica restricoes de role para acoes administrativas (botoes visiveis apenas para analista-arrecadacao).

## Requisitos

- `LicencasPage`: PageHeader "Licencas" + botao "Nova Licenca" visivel apenas para `analista-arrecadacao`; renderiza `LicencasFilters`, `LicencasTable` e `Pagination`; gerencia estado de `LicencaFiltros` (page, size, sort, filtros)
- `LicencaCreatePage`: PageHeader "Nova Licenca" com link Voltar para `/arrecadacao/licencas`; renderiza `LicencaForm`; apos sucesso de `useCreateLicenca`, redirecionar para `/arrecadacao/licencas/:id` e exibir toast de confirmacao
- `LicencaDetailPage`: PageHeader "Licenca #[id truncado]" com link Voltar; card com dados completos da licenca; botoes de acao conforme status e role (analista-arrecadacao somente): ATIVA exibe [Suspender], SUSPENSA exibe [Reativar][Encerrar], ENCERRADA sem botoes; `AlterarStatusModal` controlado por estado local; `HistoricoStatusTimeline` ao final
- Todas as paginas com CSS Module correspondente
- Estados de loading e erro tratados em cada pagina

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/arrecadacao/licencas/pages/LicencasPage.tsx`
  - `frontend/src/features/arrecadacao/licencas/pages/LicencasPage.module.css`
  - `frontend/src/features/arrecadacao/licencas/pages/LicencaCreatePage.tsx`
  - `frontend/src/features/arrecadacao/licencas/pages/LicencaCreatePage.module.css`
  - `frontend/src/features/arrecadacao/licencas/pages/LicencaDetailPage.tsx`
  - `frontend/src/features/arrecadacao/licencas/pages/LicencaDetailPage.module.css`
- **Modificar:** Nenhum
- **Referencia:**
  - `frontend/src/features/cadastro/titulares/pages/` — padrao de pages com hooks e componentes
  - `frontend/src/shared/components/layout/PageHeader/` — componente de cabecalho de pagina
  - `frontend/src/shared/components/ui/pagination/` — Pagination reutilizado
  - `frontend/src/shared/components/ui/toast/` — toast para feedback pos-acao
  - `frontend/src/app/router/` — padrao de navegacao (useNavigate, useParams)

## Subtarefas

- [x] 10.1 Criar `LicencasPage.tsx` e CSS Module (listagem com filtros, tabela e paginacao)
- [x] 10.2 Criar `LicencaCreatePage.tsx` e CSS Module (formulario com redirect apos sucesso)
- [x] 10.3 Criar `LicencaDetailPage.tsx` e CSS Module (card + acoes por status/role + modal + timeline)

## Sequenciamento

- Bloqueado por: 9.0
- Desbloqueia: 11.0
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: RF-01, RF-02, RF-03, RF-04, RF-05, RF-06 (integracao de paginas)
- Evidencia esperada: paginas renderizam com dados do backend; redirect apos criacao funciona; botoes de acao aparecem apenas para analista; modal abre e fecha corretamente

## Detalhes de Implementacao

**LicencasPage — wireframe e logica:**

```
┌─────────────────────────────────────────┐
│ PageHeader: "Licencas"  [+ Nova Licenca]│ ← botao so para analista-arrecadacao
├─────────────────────────────────────────┤
│ LicencasFilters                         │
├─────────────────────────────────────────┤
│ LicencasTable                           │
├─────────────────────────────────────────┤
│ Pagination                              │
└─────────────────────────────────────────┘
```

```typescript
// Estado inicial dos filtros
const [filtros, setFiltros] = useState<LicencaFiltros>({
  page: 0,
  size: 10,
  sort: 'criadoEm,desc',
});
const { data, isLoading, isError } = useLicencas(filtros);
// Ao mudar filtro de texto/select: resetar page para 0
// Ao mudar pagina: atualizar apenas filtros.page
```

**LicencaCreatePage — wireframe e logica:**

```
┌─────────────────────────────────────────┐
│ PageHeader: "Nova Licenca"  [← Voltar]  │
├─────────────────────────────────────────┤
│ LicencaForm                             │
└─────────────────────────────────────────┘
```

```typescript
const navigate = useNavigate();
const { mutate, isPending } = useCreateLicenca();
// onSuccess: navigate(`/arrecadacao/licencas/${novaLicenca.id}`)
// toast.success("Licenca criada com sucesso")
// onError: toast.error("Erro ao criar licenca")
```

**LicencaDetailPage — wireframe e logica:**

```
┌─────────────────────────────────────────┐
│ PageHeader: "Licenca #abc..."  [← Voltar]│
├─────────────────────────────────────────┤
│ Card: Dados da licenca                  │
│   Usuario: razaoSocial (CNPJ formatado) │
│   Rubrica: sigla — nome                 │
│   Vigencia: dataInicio → dataFim        │
│   Status: StatusBadgeLicenca            │
│   Criado em / Atualizado em             │
├─────────────────────────────────────────┤
│ Acoes (so analista-arrecadacao):        │
│   ATIVA:    [Suspender]                 │
│   SUSPENSA: [Reativar] [Encerrar]       │
│   ENCERRADA: (nenhuma acao)             │
├─────────────────────────────────────────┤
│ HistoricoStatusTimeline                 │
└─────────────────────────────────────────┘
```

```typescript
const { id } = useParams<{ id: string }>();
const { data: licenca, isLoading } = useLicenca(id!);
const { data: historico } = useHistoricoStatusLicenca(id!);
// Estado local: modalAberto: 'suspender' | 'reativar' | 'encerrar' | null
// onSuccess do modal: fechar modal + toast.success + invalidar queries
```

**Controle de role nas paginas:**

```typescript
// Usar hook de auth existente no projeto para verificar role
// Botao "Nova Licenca" e botoes de acao: renderizar condicionalmente
// Consultor ve a pagina mas nao ve os botoes de acao
// Exemplo de verificacao (adaptar ao padrao existente no projeto):
const { hasRole } = useAuth();
const isAnalista = hasRole('analista-arrecadacao');
```

## Criterios de Sucesso (Verificaveis)

- [x] Build compila: `cd frontend && npm run build`
- [x] TypeScript sem erros: `cd frontend && npx tsc --noEmit`
