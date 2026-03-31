# Tech Spec Frontend — F03: Gestão de Obras Musicais

> **PRD:** `tasks/prd-gestao-obras/prd.md`
> **API Contract:** `tasks/prd-gestao-obras/api-contract.yaml`
> **Domínio:** Cadastro (D01)
> **Feature ID:** F03
> **Data:** 2026-03-30

---

## Resumo Executivo

Esta Tech Spec cobre a implementação frontend da feature F03 — CRUD de Obras Musicais com dois fluxos diferenciadores: **obtenção de ISWC via API externa** (botão com loading/error states) e **depuração de obras LIBERADAS** (modal de confirmação + criação automática de nova obra). Reutiliza os shared components criados em F02 (Button, TextInput, Select, FormField, Badge, Pagination, Modal, Toast) e introduz componentes específicos para os fluxos de ISWC e depuração.

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `react-architecture` | Estrutura de feature, path aliases, convenções |
| `frontend-design` | Design system Circuit Core Dark, princípios visuais |

---

## Stitch — Mockup Obrigatório

### Projeto Stitch

| Campo | Valor |
|-------|-------|
| **Projeto** | mcad |
| **ID** | `533156784329699726` |
| **Design System** | Circuit Core Dark (Asset: `b2bc911ef6b644fdac02168609989b83`) |

### Screens a Criar

| # | Nome da Screen | Descrição |
|---|---------------|-----------|
| 1 | **Obras - Listagem** | Tabela paginada com filtros (título, ISWC, tipo, status, gênero), badges de status (5 variantes incluindo DEPURADA), badge de tipo, ISWC em mono. Obras DEPURADAS com link para nova obra. |
| 2 | **Obras - Formulário Criar** | Título, Select tipo (4 opções), TextInput gênero, TextInput subtítulo. Sem ISWC (será obtido depois). |
| 3 | **Obras - Detalhe/Editar (PENDENTE)** | Campos editáveis + seção ISWC com botão "Obter ISWC" (habilitado se tem titulares) + área de titularidades (placeholder para F04). |
| 4 | **Obras - Detalhe (LIBERADO)** | Campos editáveis (exceto título que dispara depuração) + ISWC preenchido (read-only) + flag Domínio Público. |
| 5 | **Obras - Detalhe (DEPURADA)** | Todos os campos read-only + banner "Esta obra foi depurada" + link para nova obra. |
| 6 | **Obras - Modal Depuração** | "Esta alteração irá depurar a obra atual e criar uma nova obra. A obra original ficará imutável. Deseja continuar?" + Cancelar/Confirmar. |
| 7 | **Obras - Modal Excluir** | Confirmação de exclusão padrão. |

### Diretrizes Stitch

- Usar obrigatoriamente tokens do `frontend/DESIGN.md`
- Referenciar screens existentes de Associações e Titulares para consistência
- Status badges: PENDENTE (warning), LIBERADO (success), BLOQUEADO (error), DOMINIO_PUBLICO (muted), DEPURADA (secondary)
- ISWC em `--font-mono` (JetBrains Mono)
- Botão "Obter ISWC" com 3 estados visuais: habilitado, loading (spinner), desabilitado (já tem ou sem titulares)

---

## Arquitetura do Sistema

### Estrutura de Pastas

```
frontend/src/features/cadastro/
├── associacoes/              ← F01 (existente)
├── titulares/                ← F02 (existente)
└── obras/                    ← F03 (NOVO)
    ├── api/
    │   └── obrasApi.ts
    ├── components/
    │   ├── ObrasTable.tsx
    │   ├── ObrasTable.module.css
    │   ├── ObrasFilters.tsx
    │   ├── ObrasFilters.module.css
    │   ├── ObraForm.tsx
    │   ├── ObraForm.module.css
    │   ├── IswcSection.tsx           ← Seção ISWC com botão + status
    │   ├── IswcSection.module.css
    │   ├── DepuracaoBanner.tsx       ← Banner "obra depurada" + link
    │   ├── DepuracaoBanner.module.css
    │   ├── DepuracaoModal.tsx        ← Modal confirmação depuração
    │   ├── DepuracaoModal.module.css
    │   ├── DominioPublicoToggle.tsx  ← Toggle DP com confirmação
    │   ├── DominioPublicoToggle.module.css
    │   ├── DeleteObraModal.tsx
    │   └── DeleteObraModal.module.css
    ├── hooks/
    │   ├── useObras.ts               ← Listagem paginada
    │   ├── useObra.ts                ← Get by ID
    │   ├── useCreateObra.ts
    │   ├── useUpdateObra.ts
    │   ├── useDeleteObra.ts
    │   ├── useObterIswc.ts           ← Mutation para API ISWC
    │   ├── useDepurarObra.ts         ← Mutation para depuração
    │   └── useDominioPublico.ts      ← Mutation para toggle DP
    ├── pages/
    │   ├── ObrasPage.tsx             ← Listagem
    │   ├── ObrasPage.module.css
    │   ├── ObraCreatePage.tsx        ← Formulário criação
    │   ├── ObraDetailPage.tsx        ← Detalhe + Edição + ISWC + DP + Depuração
    │   └── ObraDetailPage.module.css
    ├── types/
    │   └── obra.ts
    └── index.ts
```

### Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| Uma única `ObraDetailPage` (não Editar separado) | A tela de detalhe varia por status (PENDENTE=edição livre, LIBERADO=edição parcial, DEPURADA=read-only). Melhor um componente com lógica condicional que 3 páginas. |
| `IswcSection` como componente isolado | Lógica complexa (botão com 3 estados, loading, error, tooltip) merece encapsulamento |
| `DepuracaoBanner` componente dedicado | Reutilizável na listagem (inline) e na tela de detalhe (full) |
| `DepuracaoModal` separado do `ObraForm` | O fluxo PUT → 409 → modal → POST /depurar é uma interação complexa que merece isolamento |
| `DominioPublicoToggle` isolado | Toggle + confirmação + endpoint separado (`PUT /dominio-publico`) |
| Hooks especializados por mutation | `useObterIswc`, `useDepurarObra`, `useDominioPublico` — cada um invalida queries de forma específica |

---

## Design de Implementação

### Tipos (derivados do API Contract)

```typescript
// features/cadastro/obras/types/obra.ts

export type TipoObra = 'MUSICAL' | 'LITEROMUSICAL' | 'VERSAO' | 'POT_POURRI';
export type StatusObra = 'PENDENTE' | 'LIBERADO' | 'BLOQUEADO' | 'DOMINIO_PUBLICO' | 'DEPURADA';

export interface ObraMusical {
  id: string;
  titulo: string;
  subtitulo: string | null;
  tipo: TipoObra;
  genero: string | null;
  iswc: string | null;
  status: StatusObra;
  dominioPublico: boolean;
  obraDepuradaParaId: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ObraListResponse {
  data: ObraMusical[];
  pagination: Pagination;
}

export interface CriarObraRequest {
  titulo: string;
  tipo: TipoObra;
  subtitulo?: string | null;
  genero?: string | null;
}

export interface AtualizarObraRequest {
  titulo: string;
  tipo: TipoObra;
  subtitulo?: string | null;
  genero?: string | null;
}

export interface DepurarObraRequest {
  titulo: string;
  tipo: TipoObra;
  subtitulo?: string | null;
  genero?: string | null;
}

export interface DepuracaoResponse {
  obraDepurada: ObraMusical;
  novaObra: ObraMusical;
}

export interface DominioPublicoRequest {
  dominioPublico: boolean;
}

export interface ObraFiltros {
  page: number;
  size: number;
  sort: string;
  titulo?: string;
  iswc?: string;
  tipo?: TipoObra;
  status?: StatusObra;
  genero?: string;
}
```

### API Layer

```typescript
// features/cadastro/obras/api/obrasApi.ts

export function getObras(filtros: ObraFiltros): Promise<ObraListResponse> { ... }
export function getObraById(id: string): Promise<ObraMusical> { ... }
export function criarObra(data: CriarObraRequest): Promise<ObraMusical> { ... }
export function atualizarObra(id: string, data: AtualizarObraRequest): Promise<ObraMusical> { ... }
export function excluirObra(id: string): Promise<void> { ... }
export function obterIswc(id: string): Promise<ObraMusical> { ... }  // POST sem body
export function depurarObra(id: string, data: DepurarObraRequest): Promise<DepuracaoResponse> { ... }
export function alterarDominioPublico(id: string, data: DominioPublicoRequest): Promise<ObraMusical> { ... }
```

### Hooks

```typescript
// useObras — listagem paginada
export function useObras(filtros: ObraFiltros) {
  return useQuery({
    queryKey: ['obras', filtros],
    queryFn: () => getObras(filtros),
    placeholderData: keepPreviousData,
  });
}

// useObterIswc — mutation para API externa
export function useObterIswc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (obraId: string) => obterIswc(obraId),
    onSuccess: (data) => {
      queryClient.setQueryData(['obra', data.id], data); // atualiza cache
      queryClient.invalidateQueries({ queryKey: ['obras'] }); // atualiza lista
    },
  });
}

// useDepurarObra — mutation para depuração
export function useDepurarObra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DepurarObraRequest }) => depurarObra(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
    },
  });
}
```

### Componentes Chave

#### IswcSection — Botão "Obter ISWC" com estados

```typescript
interface IswcSectionProps {
  obra: ObraMusical;
  temTitulares: boolean;  // vem de F04 quando implementado
}

export function IswcSection({ obra, temTitulares }: IswcSectionProps) {
  const obterIswc = useObterIswc();
  const { showToast } = useToast();

  const isDisabled = obra.status !== 'PENDENTE' || !temTitulares || obra.iswc !== null;

  const handleObterIswc = async () => {
    try {
      await obterIswc.mutateAsync(obra.id);
      showToast('ISWC obtido com sucesso', 'success');
    } catch (err: any) {
      showToast(err.detail || 'Erro ao obter ISWC', 'error');
    }
  };

  return (
    <div className={styles.section}>
      <FormField label="ISWC">
        <div className={styles.iswcRow}>
          <TextInput value={obra.iswc || '—'} disabled mono />
          <Button
            variant="secondary"
            disabled={isDisabled}
            onClick={handleObterIswc}
          >
            {obterIswc.isPending ? <Spinner /> : obra.iswc ? 'ISWC Obtido' : 'Obter ISWC'}
          </Button>
        </div>
      </FormField>
      {!temTitulares && (
        <span className={styles.hint}>Adicione titulares autorais antes de obter o ISWC</span>
      )}
    </div>
  );
}
```

#### ObraDetailPage — Lógica condicional por status

```typescript
export function ObraDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: obra, isLoading } = useObra(id!);
  const updateMutation = useUpdateObra();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [showDepuracaoModal, setShowDepuracaoModal] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<AtualizarObraRequest | null>(null);

  const isDepurada = obra?.status === 'DEPURADA';
  const isReadOnly = isDepurada || obra?.status === 'DOMINIO_PUBLICO';

  const handleSubmit = async (data: AtualizarObraRequest) => {
    try {
      await updateMutation.mutateAsync({ id: id!, data });
      showToast('Obra atualizada', 'success');
    } catch (err: any) {
      if (err.code === 'DEPURACAO_NECESSARIA') {
        setPendingUpdate(data);
        setShowDepuracaoModal(true);
      } else {
        showToast(err.detail || 'Erro ao atualizar', 'error');
      }
    }
  };

  // ... render condicional por status
}
```

#### DepuracaoBanner — Para obras DEPURADAS

```typescript
interface DepuracaoBannerProps {
  obraDepuradaParaId: string;
}

export function DepuracaoBanner({ obraDepuradaParaId }: DepuracaoBannerProps) {
  return (
    <div className={styles.banner}>
      <AlertCircle size={18} />
      <span>Esta obra foi depurada.</span>
      <Link to={`/cadastro/obras/${obraDepuradaParaId}`} className={styles.link}>
        Ver nova versão →
      </Link>
    </div>
  );
}
```

**Estilo do banner:**
```css
.banner {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background-color: var(--color-secondary-container);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  margin-bottom: var(--space-4);
}
.link {
  color: var(--color-accent-light);
  font-weight: 500;
}
```

### Rotas

| Path | Página | Descrição |
|------|--------|-----------|
| `/cadastro/obras` | ObrasPage | Listagem paginada |
| `/cadastro/obras/novo` | ObraCreatePage | Formulário criação |
| `/cadastro/obras/:id` | ObraDetailPage | Detalhe + edição + ISWC + DP + depuração (varia por status) |

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| **Feature — Types, API, Hooks** | | |
| `features/cadastro/obras/types/obra.ts` | Tipos | Interfaces derivadas do API Contract |
| `features/cadastro/obras/api/obrasApi.ts` | API | 8 funções (CRUD + iswc + depurar + DP) |
| `features/cadastro/obras/hooks/useObras.ts` | Hook | Listagem paginada |
| `features/cadastro/obras/hooks/useObra.ts` | Hook | Get by ID |
| `features/cadastro/obras/hooks/useCreateObra.ts` | Hook | useMutation criar |
| `features/cadastro/obras/hooks/useUpdateObra.ts` | Hook | useMutation atualizar |
| `features/cadastro/obras/hooks/useDeleteObra.ts` | Hook | useMutation excluir |
| `features/cadastro/obras/hooks/useObterIswc.ts` | Hook | useMutation obter ISWC |
| `features/cadastro/obras/hooks/useDepurarObra.ts` | Hook | useMutation depurar |
| `features/cadastro/obras/hooks/useDominioPublico.ts` | Hook | useMutation toggle DP |
| **Feature — Componentes** | | |
| `features/cadastro/obras/components/ObrasTable.tsx` + `.module.css` | Componente | Tabela com badges status/tipo, ISWC mono, link depurada |
| `features/cadastro/obras/components/ObrasFilters.tsx` + `.module.css` | Componente | 5 filtros com debounce |
| `features/cadastro/obras/components/ObraForm.tsx` + `.module.css` | Componente | Form título, tipo, subtítulo, gênero (modo criar/editar) |
| `features/cadastro/obras/components/IswcSection.tsx` + `.module.css` | Componente | ISWC read-only + botão "Obter ISWC" (3 estados) |
| `features/cadastro/obras/components/DepuracaoBanner.tsx` + `.module.css` | Componente | Banner "obra depurada" + link nova obra |
| `features/cadastro/obras/components/DepuracaoModal.tsx` + `.module.css` | Componente | Modal confirmação depuração |
| `features/cadastro/obras/components/DominioPublicoToggle.tsx` + `.module.css` | Componente | Toggle DP |
| `features/cadastro/obras/components/DeleteObraModal.tsx` + `.module.css` | Componente | Modal exclusão |
| **Feature — Páginas** | | |
| `features/cadastro/obras/pages/ObrasPage.tsx` + `.module.css` | Página | Listagem + filtros + paginação |
| `features/cadastro/obras/pages/ObraCreatePage.tsx` | Página | Formulário criação |
| `features/cadastro/obras/pages/ObraDetailPage.tsx` + `.module.css` | Página | Detalhe condicional por status |
| **Feature — Index** | | |
| `features/cadastro/obras/index.ts` | Export | Public API |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `features/cadastro/index.tsx` | Adicionar 3 rotas: `/obras`, `/obras/novo`, `/obras/:id` |
| `shared/components/layout/sidebar/Sidebar.tsx` | Adicionar "Obras" no menu Cadastro |

### Arquivos de Referência

| Caminho | Motivo |
|---------|--------|
| `frontend/DESIGN.md` | Tokens, princípios visuais, componentes |
| `tasks/prd-gestao-obras/api-contract.yaml` | Schemas para tipos TypeScript |
| `tasks/prd-gestao-obras/api-contract.md` | Exemplos JSON |
| `features/cadastro/titulares/` | Padrão de feature CRUD (F02) |
| `shared/components/ui/` | Componentes reutilizáveis (Button, TextInput, Select, Badge, Modal, Toast, Pagination) |
| Stitch screens de Obras (a serem criadas) | Referência visual pixel-perfect |

---

## Análise de Impacto

| Componente | Tipo | Descrição |
|---|---|---|
| Sidebar | Extensão | +1 item "Obras" em Cadastro |
| Cadastro routes | Extensão | +3 rotas |
| F04 futuro (Titularidades) | Integração | `IswcSection` precisa saber se obra tem titulares; inicialmente `temTitulares=false` (placeholder), F04 conectará via query |
| F05 futuro (Fonogramas) | Integração | Fonogramas referenciarão obra; a `ObraDetailPage` terá seção de fonogramas futuramente |

---

## Sequenciamento de Desenvolvimento

1. **Stitch mockups** — 7 screens no projeto mcad
2. **Types** — obra.ts (derivado do API Contract)
3. **API** — obrasApi.ts (8 funções)
4. **Hooks** — 8 hooks (queries + mutations)
5. **Componentes simples** — ObrasTable, ObrasFilters, ObraForm, DeleteObraModal
6. **Componentes especiais** — IswcSection, DepuracaoBanner, DepuracaoModal, DominioPublicoToggle
7. **Páginas** — ObrasPage, ObraCreatePage, ObraDetailPage
8. **Integração** — Routes + Sidebar

---

## Mapeamento PRD → Frontend

| Requisito | Componente |
|-----------|-----------|
| RF-01 (criar obra) | ObraCreatePage + ObraForm + useCreateObra |
| RF-04 (edição PENDENTE) | ObraDetailPage (modo edição livre) |
| RF-06/07 (depuração LIBERADO) | ObraDetailPage + DepuracaoModal + useDepurarObra |
| RF-08 (DEPURADA imutável) | ObraDetailPage (todos campos disabled) + DepuracaoBanner |
| RF-11-14 (listagem) | ObrasPage + ObrasTable + ObrasFilters + Pagination |
| RF-15-16 (botão ISWC) | IswcSection + useObterIswc |
| RF-19 (API indisponível) | IswcSection catch → toast error |
| RF-23-26 (Domínio Público) | DominioPublicoToggle + useDominioPublico |
| RF-29-32 (exclusão) | DeleteObraModal + useDeleteObra |

---

*Tech Spec Frontend gerada com a skill `flow-techspec-creator`. Para gerar tasks, use `flow-task-creator` com ambas techspecs como contexto.*
