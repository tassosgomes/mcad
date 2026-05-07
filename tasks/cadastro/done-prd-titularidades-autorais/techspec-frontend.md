# Tech Spec Frontend — F04: Titularidades Autorais

> **PRD:** `tasks/prd-titularidades-autorais/prd.md`
> **API Contract:** `tasks/prd-titularidades-autorais/api-contract.yaml`
> **Domínio:** Cadastro (D01)
> **Feature ID:** F04
> **Data:** 2026-03-31

---

## Resumo Executivo

Esta Tech Spec cobre a implementação frontend das Titularidades Autorais — **integrada à tela de Obras** (ObraDetailPage), não como feature com página própria. Introduz: componente **Autocomplete** reutilizável (busca de titulares com debounce), seção de titularidades com tabela + soma em tempo real + indicador de cor, e integração com o fluxo de depuração existente (F03). Também conecta o botão "Obter ISWC" (F03) com dados reais de titulares.

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `react-architecture` | Estrutura de feature, hooks, path aliases |
| `frontend-design` | Design system Circuit Core Dark, componentes |

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
| 1 | **Obra Detalhe — Seção Titulares (vazia)** | Seção "Titulares Autorais" sem itens, botão "Adicionar Titular", soma "0%", ISWC desabilitado |
| 2 | **Obra Detalhe — Seção Titulares (preenchida)** | Tabela com 2+ titulares (Autor PF + Editor PJ), percentuais mono, soma no rodapé (verde 100%), botão ISWC habilitado |
| 3 | **Obra Detalhe — Adicionar Titular (autocomplete aberto)** | Dropdown do autocomplete com resultados: nome + badge PF/PJ + documento mono + sigla associação |
| 4 | **Obra Detalhe — Soma incompleta** | Soma 60% em amarelo, indicador visual, botão ISWC desabilitado (tooltip "Soma deve ser 100%") |

### Diretrizes Stitch

- Seção integrada à ObraDetailPage existente (abaixo do formulário de dados da obra)
- Reutilizar componentes: Table, Badge, Button, FormField, Modal, Toast
- Soma: badge no rodapé — verde (#22c55e) se 100%, amarelo (#eab308) se < 100%, vermelho (#ef4444) se > 100%
- Percentuais em `--font-mono`
- Autocomplete: dropdown com `--color-bg-elevated`, hover `--color-bg-highest`

---

## Arquitetura do Sistema

### Estrutura de Pastas

F04 é diferente de F01-F03: **não tem páginas próprias** — seus componentes são consumidos dentro da `ObraDetailPage`. A feature cria hooks, API, tipos e componentes, mas não páginas/rotas.

```
frontend/src/features/cadastro/
├── obras/                           ← F03 (existente)
│   └── pages/
│       └── ObraDetailPage.tsx       ← MODIFICAR: integrar seção de titularidades
└── titularidades/                   ← F04 (NOVO)
    ├── api/
    │   └── titularidadesApi.ts
    ├── components/
    │   ├── TitularidadesSection.tsx       ← Seção completa (tabela + soma + ações)
    │   ├── TitularidadesSection.module.css
    │   ├── TitularidadesTable.tsx         ← Tabela com percentuais + ações
    │   ├── TitularidadesTable.module.css
    │   ├── AddTitularidadeForm.tsx        ← Autocomplete + categoria + percentual
    │   ├── AddTitularidadeForm.module.css
    │   ├── EditPercentualModal.tsx        ← Modal para editar percentual
    │   ├── EditPercentualModal.module.css
    │   └── SomaIndicator.tsx             ← Badge com cor dinâmica
    │   └── SomaIndicator.module.css
    ├── hooks/
    │   ├── useTitularidades.ts            ← GET titularidades da obra
    │   ├── useAddTitularidade.ts          ← POST mutation
    │   ├── useEditTitularidade.ts         ← PUT mutation
    │   ├── useRemoveTitularidade.ts       ← DELETE mutation
    │   └── useBuscarTitulares.ts          ← Autocomplete query
    ├── types/
    │   └── titularidade.ts
    └── index.ts

frontend/src/shared/
└── components/ui/
    └── autocomplete/                ← NOVO (shared, reutilizável por F06)
        ├── Autocomplete.tsx
        ├── Autocomplete.module.css
        └── index.ts
```

### Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| Feature `titularidades/` sem páginas próprias | Integrada à ObraDetailPage — titularidades são sub-recurso visual da obra |
| `TitularidadesSection` como componente composição | Encapsula: tabela + soma + form de adição + modais. Recebe `obraId` e `obraStatus` como props. |
| `Autocomplete` como shared component | Reutilizável por F06 (busca de titulares para conexos) e futuras features |
| Mutations invalidam query `['titularidades', obraId]` | Cada mutation retorna TitularidadesResponse completo — usa `setQueryData` para update instantâneo |
| Depuração delegada à ObraDetailPage | TitularidadesSection emite evento `onDepuracaoRequired` quando recebe 409, e a ObraDetailPage abre o DepuracaoModal existente |

---

## Design de Implementação

### Tipos (derivados do API Contract)

```typescript
// features/cadastro/titularidades/types/titularidade.ts

export type CategoriaAutoral = 'AUTOR' | 'EDITOR';

export interface TitularidadeItem {
  id: string;
  titular: TitularResumo;
  categoria: CategoriaAutoral;
  percentual: number;
}

export interface TitularResumo {
  id: string;
  nome: string;
  tipo: 'PF' | 'PJ';
  documentoFormatado: string;
  associacaoSigla?: string;
}

export interface TitularidadesResponse {
  obraId: string;
  titularidades: TitularidadeItem[];
  somaPercentual: number;
  somaCompleta: boolean;
}

export interface AdicionarTitularidadeRequest {
  titularId: string;
  categoria: CategoriaAutoral;
  percentual: number;
}

export interface EditarTitularidadeRequest {
  percentual: number;
}
```

### API Layer

```typescript
// features/cadastro/titularidades/api/titularidadesApi.ts

export function getTitularidades(obraId: string): Promise<TitularidadesResponse> {
  return apiGet<TitularidadesResponse>(`/obras/${obraId}/titularidades`);
}

export function adicionarTitularidade(obraId: string, data: AdicionarTitularidadeRequest): Promise<TitularidadesResponse> {
  return apiPost<TitularidadesResponse>(`/obras/${obraId}/titularidades`, data);
}

export function editarTitularidade(obraId: string, id: string, data: EditarTitularidadeRequest): Promise<TitularidadesResponse> {
  return apiPut<TitularidadesResponse>(`/obras/${obraId}/titularidades/${id}`, data);
}

export function removerTitularidade(obraId: string, id: string): Promise<TitularidadesResponse> {
  // DELETE retorna 200 com body (não 204)
  return apiDeleteWithBody<TitularidadesResponse>(`/obras/${obraId}/titularidades/${id}`);
}

export function buscarTitulares(q: string, limit = 10): Promise<TitularResumo[]> {
  return apiGet<TitularResumo[]>(`/titulares/busca?q=${encodeURIComponent(q)}&limit=${limit}`);
}
```

> **Nota:** `apiDeleteWithBody` é uma nova variante do apiClient que parseia o response body no DELETE (diferente do `apiDelete` existente que assume 204 sem body).

### Hooks

```typescript
// useTitularidades — query principal
export function useTitularidades(obraId: string) {
  return useQuery({
    queryKey: ['titularidades', obraId],
    queryFn: () => getTitularidades(obraId),
  });
}

// useAddTitularidade — mutation com update otimista do cache
export function useAddTitularidade(obraId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdicionarTitularidadeRequest) => adicionarTitularidade(obraId, data),
    onSuccess: (response) => {
      queryClient.setQueryData(['titularidades', obraId], response);
    },
  });
}

// useBuscarTitulares — autocomplete com debounce
export function useBuscarTitulares(query: string) {
  const debouncedQuery = useDebounce(query, 300);
  return useQuery({
    queryKey: ['titulares-busca', debouncedQuery],
    queryFn: () => buscarTitulares(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });
}
```

### Shared Component — Autocomplete

```typescript
// shared/components/ui/autocomplete/Autocomplete.tsx

interface AutocompleteProps<T> {
  placeholder?: string;
  onSearch: (query: string) => void;
  results: T[];
  isLoading: boolean;
  renderItem: (item: T) => ReactNode;
  onSelect: (item: T) => void;
  minChars?: number;
}

export function Autocomplete<T>({ ... }: AutocompleteProps<T>) {
  // Input com debounce → dropdown com resultados → seleção
}
```

**Estilos:**
```css
.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  max-height: 240px;
  overflow-y: auto;
  z-index: 50;
  box-shadow: var(--shadow-md);
}
.item {
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.item:hover {
  background: var(--color-bg-highest);
}
```

### Componentes da Feature

#### TitularidadesSection (composição principal)

```typescript
interface TitularidadesSectionProps {
  obraId: string;
  obraStatus: StatusObra;
  onDepuracaoRequired: () => void;  // emite para ObraDetailPage abrir modal
}

export function TitularidadesSection({ obraId, obraStatus, onDepuracaoRequired }: TitularidadesSectionProps) {
  const { data, isLoading } = useTitularidades(obraId);
  const addMutation = useAddTitularidade(obraId);
  const { showToast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const isReadOnly = obraStatus === 'DEPURADA' || obraStatus === 'DOMINIO_PUBLICO';

  const handleAdd = async (req: AdicionarTitularidadeRequest) => {
    try {
      await addMutation.mutateAsync(req);
      showToast('Titular adicionado', 'success');
      setShowAddForm(false);
    } catch (err: any) {
      if (err.code === 'DEPURACAO_NECESSARIA') {
        onDepuracaoRequired();
      } else {
        showToast(err.detail || 'Erro ao adicionar', 'error');
      }
    }
  };

  return (
    <section>
      <div className={styles.header}>
        <h3>Titulares Autorais</h3>
        {!isReadOnly && (
          <Button variant="secondary" onClick={() => setShowAddForm(true)}>
            Adicionar Titular
          </Button>
        )}
      </div>

      {showAddForm && <AddTitularidadeForm onSubmit={handleAdd} onCancel={() => setShowAddForm(false)} />}

      <TitularidadesTable
        items={data?.titularidades ?? []}
        isReadOnly={isReadOnly}
        onEdit={setEditingId}
        onRemove={handleRemove}
      />

      <SomaIndicator soma={data?.somaPercentual ?? 0} completa={data?.somaCompleta ?? false} />

      {editingId && <EditPercentualModal ... />}
    </section>
  );
}
```

#### SomaIndicator

```typescript
interface SomaIndicatorProps {
  soma: number;
  completa: boolean;
}

export function SomaIndicator({ soma, completa }: SomaIndicatorProps) {
  const variant = completa ? 'success' : soma > 100 ? 'error' : 'warning';
  return (
    <div className={styles.indicator}>
      <span className={styles.label}>Total:</span>
      <Badge variant={variant}>
        <span className={styles.mono}>{soma.toFixed(4)}%</span>
      </Badge>
      {!completa && soma < 100 && <span className={styles.hint}>Faltam {(100 - soma).toFixed(4)}%</span>}
      {soma > 100 && <span className={styles.hintError}>Excede em {(soma - 100).toFixed(4)}%</span>}
    </div>
  );
}
```

#### AddTitularidadeForm

```typescript
export function AddTitularidadeForm({ onSubmit, onCancel }: Props) {
  const [query, setQuery] = useState('');
  const [selectedTitular, setSelectedTitular] = useState<TitularResumo | null>(null);
  const [categoria, setCategoria] = useState<CategoriaAutoral | ''>('');
  const [percentual, setPercentual] = useState('');
  const { data: resultados, isLoading } = useBuscarTitulares(query);

  // Validação inline: Editor exige PJ
  const categoriaError = categoria === 'EDITOR' && selectedTitular?.tipo === 'PF'
    ? 'A categoria Editor exige titular Pessoa Jurídica' : undefined;

  return (
    <div className={styles.form}>
      <Autocomplete
        placeholder="Buscar titular por nome ou CPF/CNPJ..."
        onSearch={setQuery}
        results={resultados ?? []}
        isLoading={isLoading}
        renderItem={(t) => (
          <div className={styles.autocompleteItem}>
            <span>{t.nome}</span>
            <Badge variant={t.tipo === 'PF' ? 'secondary' : 'accent'}>{t.tipo}</Badge>
            <span className={styles.mono}>{t.documentoFormatado}</span>
          </div>
        )}
        onSelect={(t) => { setSelectedTitular(t); setQuery(t.nome); }}
      />

      {selectedTitular && (
        <>
          <Select label="Categoria" options={categoriaOptions} value={categoria} onChange={setCategoria} error={categoriaError} />
          <TextInput label="Percentual (%)" value={percentual} onChange={setPercentual} mono placeholder="0.0000" />
          <div className={styles.actions}>
            <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={!!categoriaError || !percentual}>
              Adicionar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
```

### Integração com ObraDetailPage (F03)

```typescript
// Em ObraDetailPage.tsx — MODIFICAR:
import { TitularidadesSection } from '@features/cadastro/titularidades';

// Dentro do render, após ObraForm:
{obra && (
  <TitularidadesSection
    obraId={obra.id}
    obraStatus={obra.status}
    onDepuracaoRequired={() => {
      // Reutiliza o DepuracaoModal existente de F03
      setShowDepuracaoModal(true);
    }}
  />
)}
```

### Integração com IswcSection (F03)

A `IswcSection` agora recebe `temTitulares` de dados reais:

```typescript
// Em ObraDetailPage.tsx — MODIFICAR:
const { data: titularidadesData } = useTitularidades(obra.id);
const temTitulares = (titularidadesData?.titularidades.length ?? 0) > 0;

<IswcSection obra={obra} temTitulares={temTitulares} />
```

### apiClient — Nova variante

```typescript
// shared/services/apiClient.ts — ADICIONAR:
export async function apiDeleteWithBody<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, { method: 'DELETE' });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({ status: response.status }));
    throw problem;
  }
  return response.json() as Promise<T>;
}
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| **Shared** | | |
| `shared/components/ui/autocomplete/Autocomplete.tsx` + `.module.css` + `index.ts` | Componente | Autocomplete genérico com dropdown, debounce, renderItem |
| **Feature — Types, API, Hooks** | | |
| `features/cadastro/titularidades/types/titularidade.ts` | Tipos | Derivados do API Contract |
| `features/cadastro/titularidades/api/titularidadesApi.ts` | API | 5 funções (CRUD + autocomplete) |
| `features/cadastro/titularidades/hooks/useTitularidades.ts` | Hook | Query principal |
| `features/cadastro/titularidades/hooks/useAddTitularidade.ts` | Hook | Mutation add |
| `features/cadastro/titularidades/hooks/useEditTitularidade.ts` | Hook | Mutation edit |
| `features/cadastro/titularidades/hooks/useRemoveTitularidade.ts` | Hook | Mutation remove |
| `features/cadastro/titularidades/hooks/useBuscarTitulares.ts` | Hook | Autocomplete com debounce |
| **Feature — Componentes** | | |
| `features/cadastro/titularidades/components/TitularidadesSection.tsx` + `.module.css` | Componente | Composição: header + form + table + soma |
| `features/cadastro/titularidades/components/TitularidadesTable.tsx` + `.module.css` | Componente | Tabela: nome, tipo badge, documento mono, categoria, percentual mono, ações |
| `features/cadastro/titularidades/components/AddTitularidadeForm.tsx` + `.module.css` | Componente | Autocomplete + Select categoria + Input percentual |
| `features/cadastro/titularidades/components/EditPercentualModal.tsx` + `.module.css` | Componente | Modal com input percentual |
| `features/cadastro/titularidades/components/SomaIndicator.tsx` + `.module.css` | Componente | Badge com cor dinâmica (verde/amarelo/vermelho) |
| **Feature — Index** | | |
| `features/cadastro/titularidades/index.ts` | Export | Exporta TitularidadesSection + hooks |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `shared/services/apiClient.ts` | Adicionar `apiDeleteWithBody<T>` |
| `features/cadastro/obras/pages/ObraDetailPage.tsx` | Integrar `TitularidadesSection` + passar `temTitulares` para `IswcSection` |
| `features/cadastro/obras/components/IswcSection.tsx` | Conectar `temTitulares` com dados reais (não mais placeholder) |

### Arquivos de Referência

| Caminho | Motivo |
|---------|--------|
| `frontend/DESIGN.md` | Tokens, princípios, componentes |
| `tasks/prd-titularidades-autorais/api-contract.yaml` | Schemas |
| `features/cadastro/obras/pages/ObraDetailPage.tsx` | Página que hospeda a seção |
| `features/cadastro/obras/components/IswcSection.tsx` | Integração temTitulares |
| `features/cadastro/obras/components/DepuracaoModal.tsx` | Reutilizado para depuração |
| `shared/components/ui/` | Componentes reutilizáveis existentes |
| Stitch screens de Titularidades (a serem criadas) | Referência visual |

---

## Sequenciamento de Desenvolvimento

1. **Stitch mockups** — 4 screens
2. **Shared: Autocomplete** — componente genérico reutilizável
3. **apiClient extensão** — `apiDeleteWithBody`
4. **Types + API + Hooks** — 5 funções + 5 hooks
5. **Componentes** — SomaIndicator, TitularidadesTable, AddTitularidadeForm, EditPercentualModal
6. **TitularidadesSection** — composição principal
7. **Integração ObraDetailPage** — seção + IswcSection com temTitulares real

---

## Mapeamento PRD → Frontend

| Requisito | Componente |
|-----------|-----------|
| RF-01 (adicionar titularidade) | AddTitularidadeForm + Autocomplete + useAddTitularidade |
| RF-03 (Editor exige PJ) | AddTitularidadeForm validação inline |
| RF-07 (soma exibida) | SomaIndicator (verde/amarelo/vermelho) |
| RF-09 (acúmulo papéis) | AddTitularidadeForm permite mesmo titular com categoria diferente |
| RF-12 (editar percentual) | EditPercentualModal + useEditTitularidade |
| RF-15 (remover) | TitularidadesTable botão remover + useRemoveTitularidade |
| RF-18 (tabela com dados) | TitularidadesTable (nome, tipo badge, documento mono, categoria, percentual) |
| RF-20 (read-only DEPURADA) | TitularidadesSection `isReadOnly` prop |
| RF-21 (depuração LIBERADA) | TitularidadesSection `onDepuracaoRequired` → ObraDetailPage → DepuracaoModal |
| RF-25 (habilitar ISWC) | ObraDetailPage passa `temTitulares` real para IswcSection |

---

*Tech Spec Frontend gerada. Para gerar tasks, use `flow-task-creator` com ambas techspecs.*
