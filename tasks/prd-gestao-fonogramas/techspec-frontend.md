# Tech Spec Frontend — F05: Gestão de Fonogramas

> **PRD:** `tasks/prd-gestao-fonogramas/prd.md`
> **API Contract:** `tasks/prd-gestao-fonogramas/api-contract.yaml`
> **Domínio:** Cadastro (D01)
> **Feature ID:** F05
> **Data:** 2026-03-31

---

## Resumo Executivo

Esta Tech Spec cobre a implementação frontend de Fonogramas — a primeira feature com **dual view**: tela própria (`/cadastro/fonogramas`) para CRUD completo e seção dentro da ObraDetailPage para listar fonogramas vinculados. Introduz o componente `ObraSelect` (autocomplete de obras para seleção), reutiliza os padrões de depuração de F03 (banner + modal) e o Autocomplete shared de F04. ISRC exibido em mono com formatação `CC-XXX-YY-NNNNN`.

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `react-architecture` | Estrutura de feature, dual view, path aliases |
| `frontend-design` | Design system Circuit Core Dark |

---

## Stitch — Mockup Obrigatório

### Projeto Stitch

| Campo | Valor |
|-------|-------|
| **Projeto** | mcad |
| **ID** | `533156784329699726` |

### Screens a Criar

| # | Nome da Screen | Descrição |
|---|---------------|-----------|
| 1 | **Fonogramas - Listagem** | Tabela paginada: ISRC (mono), título da obra, país, status (badge 4 variantes), data lançamento. Filtros: ISRC, obra, status, país. |
| 2 | **Fonogramas - Criar** | Form: ISRC (mono, validação formato), obra (autocomplete), país, data gravação, data lançamento. |
| 3 | **Fonogramas - Detalhe PENDENTE** | Campos editáveis (incluindo ISRC). Seção participações conexas (placeholder para F06). |
| 4 | **Fonogramas - Detalhe LIBERADO** | ISRC read-only (alteração → depuração). País/datas editáveis. Conexos exibidos. |
| 5 | **Fonogramas - Detalhe DEPURADO** | Tudo read-only + banner depuração + link novo fonograma. |
| 6 | **Obra Detalhe - Seção Fonogramas** | Tabela simples na ObraDetailPage: ISRC mono, status badge, país, data. Botão "Novo Fonograma". |

---

## Arquitetura do Sistema

### Estrutura de Pastas

```
frontend/src/features/cadastro/
├── obras/                          ← F03 (existente)
│   └── pages/
│       └── ObraDetailPage.tsx      ← MODIFICAR: adicionar seção fonogramas
├── titularidades/                  ← F04 (existente)
└── fonogramas/                     ← F05 (NOVO)
    ├── api/
    │   └── fonogramasApi.ts
    ├── components/
    │   ├── FonogramasTable.tsx + .module.css
    │   ├── FonogramasFilters.tsx + .module.css
    │   ├── FonogramaForm.tsx + .module.css
    │   ├── FonogramaDepuracaoBanner.tsx + .module.css
    │   ├── FonogramaDepuracaoModal.tsx + .module.css
    │   ├── DeleteFonogramaModal.tsx + .module.css
    │   ├── ObraFonogramasSection.tsx + .module.css   ← Seção na ObraDetailPage
    │   └── ObraSelect.tsx + .module.css              ← Autocomplete de obras
    ├── hooks/
    │   ├── useFonogramas.ts
    │   ├── useFonograma.ts
    │   ├── useFonogramasDaObra.ts
    │   ├── useCreateFonograma.ts
    │   ├── useUpdateFonograma.ts
    │   ├── useDeleteFonograma.ts
    │   └── useDepurarFonograma.ts
    ├── utils/
    │   ├── isrcValidator.ts
    │   └── isrcFormatter.ts
    ├── pages/
    │   ├── FonogramasPage.tsx + .module.css
    │   ├── FonogramaCreatePage.tsx
    │   └── FonogramaDetailPage.tsx + .module.css
    ├── types/
    │   └── fonograma.ts
    └── index.ts
```

### Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| Tela própria + seção na obra (dual view) | Fonograma é entidade independente (tem ISRC, status, depuração) mas pertence a uma obra |
| `ObraSelect` como componente da feature (não shared) | Específico para seleção de obra; usa Autocomplete shared internamente |
| `ObraFonogramasSection` como componente (não página) | Integrada na ObraDetailPage, similar à TitularidadesSection (F04) |
| Reutilização de padrões F03 (depuração) | Banner + Modal com mesmo design, adaptado para fonograma |
| ISRC validação no frontend (utils) | Feedback imediato ao digitar; backend valida definitivamente |
| `useFonogramasDaObra` separado de `useFonogramas` | Sem paginação (array direto) vs com paginação — queries diferentes |

---

## Design de Implementação

### Tipos

```typescript
// features/cadastro/fonogramas/types/fonograma.ts

export type StatusFonograma = 'PENDENTE_VALIDACAO' | 'PENDENTE_DOCUMENTACAO' | 'LIBERADO' | 'DEPURADO';

export interface Fonograma {
  id: string;
  isrc: string;
  isrcFormatado: string;
  obra: ObraResumo;
  paisOrigem: string;
  dataGravacao: string | null;
  dataLancamento: string | null;
  status: StatusFonograma;
  fonogramaDepuradoParaId: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ObraResumo {
  id: string;
  titulo: string;
  status: string;
}

export interface FonogramaResumo {
  id: string;
  isrcFormatado: string;
  status: StatusFonograma;
  paisOrigem: string;
  dataLancamento: string | null;
}

export interface FonogramaListResponse {
  data: Fonograma[];
  pagination: Pagination;
}

export interface CriarFonogramaRequest {
  isrc: string;
  obraId: string;
  paisOrigem: string;
  dataGravacao?: string | null;
  dataLancamento?: string | null;
}

export interface AtualizarFonogramaRequest {
  isrc: string;
  paisOrigem: string;
  dataGravacao?: string | null;
  dataLancamento?: string | null;
}

export interface DepurarFonogramaRequest {
  isrc: string;
  paisOrigem: string;
  dataGravacao?: string | null;
  dataLancamento?: string | null;
}

export interface DepuracaoFonogramaResponse {
  fonogramaDepurado: Fonograma;
  novoFonograma: Fonograma;
}

export interface FonogramaFiltros {
  page: number;
  size: number;
  sort: string;
  isrc?: string;
  obraId?: string;
  obraTitulo?: string;
  status?: StatusFonograma;
  pais?: string;
}
```

### API Layer

```typescript
// features/cadastro/fonogramas/api/fonogramasApi.ts

export function getFonogramas(filtros: FonogramaFiltros): Promise<FonogramaListResponse> { ... }
export function getFonogramaById(id: string): Promise<Fonograma> { ... }
export function getFonogramasDaObra(obraId: string): Promise<FonogramaResumo[]> { ... }
export function criarFonograma(data: CriarFonogramaRequest): Promise<Fonograma> { ... }
export function atualizarFonograma(id: string, data: AtualizarFonogramaRequest): Promise<Fonograma> { ... }
export function excluirFonograma(id: string): Promise<void> { ... }
export function depurarFonograma(id: string, data: DepurarFonogramaRequest): Promise<DepuracaoFonogramaResponse> { ... }
```

### Hooks

```typescript
// useFonogramas — listagem paginada
export function useFonogramas(filtros: FonogramaFiltros) {
  return useQuery({
    queryKey: ['fonogramas', filtros],
    queryFn: () => getFonogramas(filtros),
    placeholderData: keepPreviousData,
  });
}

// useFonogramasDaObra — array direto (sem paginação)
export function useFonogramasDaObra(obraId: string) {
  return useQuery({
    queryKey: ['fonogramas-obra', obraId],
    queryFn: () => getFonogramasDaObra(obraId),
  });
}

// useDepurarFonograma
export function useDepurarFonograma() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DepurarFonogramaRequest }) => depurarFonograma(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fonogramas'] });
      queryClient.invalidateQueries({ queryKey: ['fonogramas-obra'] });
    },
  });
}
```

### Utils — ISRC

```typescript
// utils/isrcValidator.ts
export function isValidIsrc(isrc: string): boolean {
  const limpo = isrc.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (limpo.length !== 12) return false;
  // CC (letras) + XXX (alfanumérico) + YY (dígitos) + NNNNN (dígitos)
  return /^[A-Z]{2}[A-Z0-9]{3}\d{2}\d{5}$/.test(limpo);
}

// utils/isrcFormatter.ts
export function formatIsrc(isrc: string): string {
  // BRABC2312345 → BR-ABC-23-12345
  return `${isrc.slice(0,2)}-${isrc.slice(2,5)}-${isrc.slice(5,7)}-${isrc.slice(7)}`;
}
```

### Componentes Chave

#### ObraSelect — Autocomplete de obras

```typescript
interface ObraSelectProps {
  value: ObraResumo | null;
  onChange: (obra: ObraResumo | null) => void;
  disabled?: boolean;
}

export function ObraSelect({ value, onChange, disabled }: ObraSelectProps) {
  // Usa Autocomplete shared internamente
  // Busca obras por título via GET /obras?titulo=...&size=10
  // Renderiza: título + tipo badge + status badge
}
```

#### ObraFonogramasSection — Seção na ObraDetailPage

```typescript
interface ObraFonogramasSectionProps {
  obraId: string;
  obraStatus: StatusObra;
}

export function ObraFonogramasSection({ obraId, obraStatus }: ObraFonogramasSectionProps) {
  const { data: fonogramas, isLoading } = useFonogramasDaObra(obraId);
  const navigate = useNavigate();
  const isReadOnly = obraStatus === 'DEPURADA' || obraStatus === 'DOMINIO_PUBLICO';

  return (
    <section>
      <div className={styles.header}>
        <h3>Fonogramas</h3>
        {!isReadOnly && (
          <Button variant="secondary"
            onClick={() => navigate(`/cadastro/fonogramas/novo?obraId=${obraId}`)}>
            Novo Fonograma
          </Button>
        )}
      </div>
      {isLoading ? <Loading /> : (
        <table>  {/* Tabela simples: ISRC mono, status badge, país, data */}
          {fonogramas?.map(f => (
            <tr key={f.id} onClick={() => navigate(`/cadastro/fonogramas/${f.id}`)}>
              <td className={styles.mono}>{f.isrcFormatado}</td>
              <td><Badge variant={statusVariant(f.status)}>{f.status}</Badge></td>
              <td>{f.paisOrigem}</td>
              <td>{f.dataLancamento || '—'}</td>
            </tr>
          ))}
        </table>
      )}
    </section>
  );
}
```

#### FonogramaDetailPage — Lógica condicional por status

```typescript
export function FonogramaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: fonograma } = useFonograma(id!);
  const updateMutation = useUpdateFonograma();
  const [showDepuracaoModal, setShowDepuracaoModal] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<AtualizarFonogramaRequest | null>(null);

  const isDepurado = fonograma?.status === 'DEPURADO';
  const isReadOnly = isDepurado;

  const handleSubmit = async (data: AtualizarFonogramaRequest) => {
    try {
      await updateMutation.mutateAsync({ id: id!, data });
      showToast('Fonograma atualizado', 'success');
    } catch (err: any) {
      if (err.code === 'DEPURACAO_NECESSARIA') {
        setPendingUpdate(data);
        setShowDepuracaoModal(true);
      } else {
        showToast(err.detail || 'Erro', 'error');
      }
    }
  };

  return (
    <div>
      <PageHeader title={`Fonograma ${fonograma?.isrcFormatado}`} />
      {isDepurado && <FonogramaDepuracaoBanner fonogramaDepuradoParaId={fonograma!.fonogramaDepuradoParaId!} />}
      <FonogramaForm
        initialData={fonograma}
        onSubmit={handleSubmit}
        isReadOnly={isReadOnly}
        isSubmitting={updateMutation.isPending}
      />
      {/* Placeholder para seção de participações conexas (F06) */}
      {showDepuracaoModal && <FonogramaDepuracaoModal ... />}
    </div>
  );
}
```

### Rotas

| Path | Página | Descrição |
|------|--------|-----------|
| `/cadastro/fonogramas` | FonogramasPage | Listagem paginada |
| `/cadastro/fonogramas/novo` | FonogramaCreatePage | Formulário (aceita `?obraId=` query param) |
| `/cadastro/fonogramas/:id` | FonogramaDetailPage | Detalhe condicional por status |

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| **Feature — Types, API, Hooks, Utils** | | |
| `features/cadastro/fonogramas/types/fonograma.ts` | Tipos | Derivados do API Contract |
| `features/cadastro/fonogramas/api/fonogramasApi.ts` | API | 7 funções |
| `features/cadastro/fonogramas/hooks/useFonogramas.ts` | Hook | Listagem paginada |
| `features/cadastro/fonogramas/hooks/useFonograma.ts` | Hook | Get by ID |
| `features/cadastro/fonogramas/hooks/useFonogramasDaObra.ts` | Hook | Array por obra |
| `features/cadastro/fonogramas/hooks/useCreateFonograma.ts` | Hook | Mutation criar |
| `features/cadastro/fonogramas/hooks/useUpdateFonograma.ts` | Hook | Mutation atualizar |
| `features/cadastro/fonogramas/hooks/useDeleteFonograma.ts` | Hook | Mutation excluir |
| `features/cadastro/fonogramas/hooks/useDepurarFonograma.ts` | Hook | Mutation depurar |
| `features/cadastro/fonogramas/utils/isrcValidator.ts` | Utility | Validação formato ISRC |
| `features/cadastro/fonogramas/utils/isrcFormatter.ts` | Utility | Formatação CC-XXX-YY-NNNNN |
| **Feature — Componentes** | | |
| `features/cadastro/fonogramas/components/FonogramasTable.tsx` + `.module.css` | Componente | Tabela paginada com badges, ISRC mono, obra título |
| `features/cadastro/fonogramas/components/FonogramasFilters.tsx` + `.module.css` | Componente | 5 filtros com debounce |
| `features/cadastro/fonogramas/components/FonogramaForm.tsx` + `.module.css` | Componente | ISRC (mono, validação inline), ObraSelect, país, datas |
| `features/cadastro/fonogramas/components/ObraSelect.tsx` + `.module.css` | Componente | Autocomplete de obras (usa Autocomplete shared) |
| `features/cadastro/fonogramas/components/FonogramaDepuracaoBanner.tsx` + `.module.css` | Componente | Banner "depurado" + link |
| `features/cadastro/fonogramas/components/FonogramaDepuracaoModal.tsx` + `.module.css` | Componente | Modal confirmação depuração |
| `features/cadastro/fonogramas/components/DeleteFonogramaModal.tsx` + `.module.css` | Componente | Modal exclusão |
| `features/cadastro/fonogramas/components/ObraFonogramasSection.tsx` + `.module.css` | Componente | Seção na ObraDetailPage |
| **Feature — Páginas** | | |
| `features/cadastro/fonogramas/pages/FonogramasPage.tsx` + `.module.css` | Página | Listagem |
| `features/cadastro/fonogramas/pages/FonogramaCreatePage.tsx` | Página | Criação (aceita ?obraId) |
| `features/cadastro/fonogramas/pages/FonogramaDetailPage.tsx` + `.module.css` | Página | Detalhe condicional |
| **Feature — Index** | | |
| `features/cadastro/fonogramas/index.ts` | Export | Public API |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `features/cadastro/index.tsx` | Adicionar 3 rotas: `/fonogramas`, `/fonogramas/novo`, `/fonogramas/:id` |
| `features/cadastro/obras/pages/ObraDetailPage.tsx` | Integrar `ObraFonogramasSection` (abaixo de TitularidadesSection) |
| `shared/components/layout/sidebar/Sidebar.tsx` | Adicionar "Fonogramas" no menu Cadastro |

### Arquivos de Referência

| Caminho | Motivo |
|---------|--------|
| `frontend/DESIGN.md` | Tokens, componentes |
| `tasks/prd-gestao-fonogramas/api-contract.yaml` | Schemas |
| `features/cadastro/obras/` | Padrão de depuração (banner, modal) |
| `features/cadastro/titularidades/` | Padrão de seção integrada em ObraDetailPage |
| `shared/components/ui/autocomplete/` | Reutilizado por ObraSelect |
| Stitch screens de Fonogramas (a serem criadas) | Referência visual |

---

## Sequenciamento de Desenvolvimento

1. **Stitch mockups** — 6 screens
2. **Utils** — isrcValidator, isrcFormatter
3. **Types + API + Hooks** — 7 funções + 7 hooks
4. **ObraSelect** — Autocomplete de obras (usa shared Autocomplete)
5. **Componentes simples** — FonogramasTable, FonogramasFilters, FonogramaForm, DeleteModal
6. **Componentes depuração** — DepuracaoBanner, DepuracaoModal
7. **ObraFonogramasSection** — Seção na ObraDetailPage
8. **Páginas** — FonogramasPage, FonogramaCreatePage, FonogramaDetailPage
9. **Integração** — Routes + Sidebar + ObraDetailPage

---

## Mapeamento PRD → Frontend

| Requisito | Componente |
|-----------|-----------|
| RF-01 (criar) | FonogramaCreatePage + FonogramaForm + ObraSelect |
| RF-02 (ISRC formato) | isrcValidator + FonogramaForm validação inline |
| RF-06/07/08/09 (listagem) | FonogramasPage + FonogramasTable + FonogramasFilters |
| RF-10/11/12 (seção na obra) | ObraFonogramasSection integrada na ObraDetailPage |
| RF-14 (edição PENDENTE) | FonogramaDetailPage modo edição livre |
| RF-16 (ISRC LIBERADO → depuração) | FonogramaDetailPage + DepuracaoModal (fluxo PUT→409→modal→POST /depurar) |
| RF-17 (país/datas sem depuração) | FonogramaForm: campos sempre editáveis |
| RF-19 (banner DEPURADO) | FonogramaDepuracaoBanner + link |
| RF-28 (exclusão PENDENTE) | DeleteFonogramaModal |
| RF-29 (LIBERADO/DEPURADO sem exclusão) | DeleteModal não visível nesses status |

---

*Tech Spec Frontend gerada. Para gerar tasks, use `flow-task-creator` com ambas techspecs.*
