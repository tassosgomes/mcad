# Tech Spec Frontend — F06: Participação Conexa Automática

> **PRD:** `tasks/prd-participacao-conexa/prd.md`
> **API Contract:** `tasks/prd-participacao-conexa/api-contract.yaml`
> **Domínio:** Cadastro (D01)
> **Feature ID:** F06
> **Data:** 2026-04-01

---

## Resumo Executivo

Esta Tech Spec cobre a implementação frontend das Participações Conexas — integrada à `FonogramaDetailPage` (F05) como seção, não como página própria. Segue o mesmo padrão de F04 (TitularidadesSection na ObraDetailPage) mas com complexidade adicional: botão "Calcular" com alerta de sobrescrita, percentuais editáveis inline (intérpretes/produtores) com ícone de cadeado nos músicos, indicador "desatualizado" e integração com depuração de F05.

Reutiliza: Autocomplete shared (F04), SomaIndicator (F04), Badge, Modal, Toast.

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `react-architecture` | Feature sem páginas, integração na FonogramaDetailPage |
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
| 1 | **Fonograma Detalhe — Conexos vazio** | Seção sem participantes, botão "Adicionar Participante", botão "Calcular" desabilitado (tooltip "Adicione ao menos 1 Intérprete e 1 Produtor"), soma "Pendente" |
| 2 | **Fonograma Detalhe — Conexos sem cálculo** | 3+ participantes adicionados, percentuais "—", botão "Calcular" habilitado (primary), soma "Pendente" |
| 3 | **Fonograma Detalhe — Conexos calculados** | Percentuais preenchidos, músicos com cadeado, intérpretes/produtores editáveis inline, soma 100% verde |
| 4 | **Fonograma Detalhe — Ajuste manual (dueto)** | 2 intérpretes com percentuais customizados (30%/13.7%), indicador de soma da fatia |
| 5 | **Fonograma Detalhe — Desatualizado** | Badge warning "Percentuais desatualizados" após adicionar participante sem recalcular |
| 6 | **Fonograma Detalhe — Alerta recálculo** | Modal "Os percentuais serão recalculados. Ajustes manuais serão perdidos. Continuar?" |

---

## Arquitetura do Sistema

### Estrutura de Pastas

F06 segue o mesmo padrão de F04: **sem páginas próprias** — componentes consumidos na `FonogramaDetailPage`.

```
frontend/src/features/cadastro/
├── fonogramas/                         ← F05 (existente)
│   └── pages/
│       └── FonogramaDetailPage.tsx     ← MODIFICAR: integrar seção conexos
└── participacoes/                      ← F06 (NOVO)
    ├── api/
    │   └── participacoesApi.ts
    ├── components/
    │   ├── ParticipacoesSection.tsx + .module.css     ← Composição principal
    │   ├── ParticipacoesTable.tsx + .module.css       ← Tabela com inline edit
    │   ├── AddParticipacaoForm.tsx + .module.css      ← Autocomplete + Select categoria
    │   ├── CalcularButton.tsx + .module.css            ← Botão + alerta
    │   ├── DesatualizadoBadge.tsx + .module.css        ← Badge warning
    │   └── RecalcularModal.tsx + .module.css           ← Modal alerta sobrescrita
    ├── hooks/
    │   ├── useParticipacoes.ts
    │   ├── useAddParticipacao.ts
    │   ├── useAjustarPercentual.ts
    │   ├── useRemoveParticipacao.ts
    │   └── useCalcularPercentuais.ts
    ├── types/
    │   └── participacao.ts
    └── index.ts
```

### Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| `ParticipacoesSection` como composição | Encapsula: tabela + form + botão calcular + alerta + soma. Recebe `fonogramaId` e `fonogramaStatus`. |
| `ParticipacoesTable` com inline edit | Click no percentual de intérprete/produtor abre input inline (não modal). Músicos com cadeado. |
| `CalcularButton` componente isolado | Lógica complexa: habilitado/desabilitado, tooltip, loading, alerta de sobrescrita |
| `DesatualizadoBadge` dedicado | Reutilizável; exibido quando `percentuaisDesatualizados=true` |
| `RecalcularModal` para alerta | Confirmação antes de POST /calcular quando já há percentuais |
| Depuração delegada à FonogramaDetailPage | Mesmo padrão de F04 — `onDepuracaoRequired` callback |

---

## Design de Implementação

### Tipos

```typescript
// features/cadastro/participacoes/types/participacao.ts

export type CategoriaConexo = 'INTERPRETE' | 'PRODUTOR_FONOGRAFICO' | 'MUSICO_EXECUTANTE';

export interface ParticipacaoItem {
  id: string;
  titular: TitularResumo;
  categoria: CategoriaConexo;
  percentual: number | null;  // null = não calculado
  editavel: boolean;           // true para intérprete/produtor
}

export interface ParticipacoesResponse {
  fonogramaId: string;
  participacoes: ParticipacaoItem[];
  somaPercentual: number | null;   // null se não calculados
  somaCalculada: boolean;
  percentuaisDesatualizados: boolean;
}

export interface AdicionarParticipacaoRequest {
  titularId: string;
  categoria: CategoriaConexo;
}

export interface AjustarPercentualRequest {
  percentual: number;
}
```

### API Layer

```typescript
// features/cadastro/participacoes/api/participacoesApi.ts

export function getParticipacoes(fonogramaId: string): Promise<ParticipacoesResponse> {
  return apiGet(`/fonogramas/${fonogramaId}/participacoes`);
}

export function adicionarParticipacao(fonogramaId: string, data: AdicionarParticipacaoRequest): Promise<ParticipacoesResponse> {
  return apiPost(`/fonogramas/${fonogramaId}/participacoes`, data);
}

export function ajustarPercentual(fonogramaId: string, id: string, data: AjustarPercentualRequest): Promise<ParticipacoesResponse> {
  return apiPut(`/fonogramas/${fonogramaId}/participacoes/${id}`, data);
}

export function removerParticipacao(fonogramaId: string, id: string): Promise<ParticipacoesResponse> {
  return apiDeleteWithBody(`/fonogramas/${fonogramaId}/participacoes/${id}`);
}

export function calcularPercentuais(fonogramaId: string): Promise<ParticipacoesResponse> {
  return apiPost(`/fonogramas/${fonogramaId}/participacoes/calcular`, {});
}
```

### Hooks

```typescript
// useParticipacoes — query principal
export function useParticipacoes(fonogramaId: string) {
  return useQuery({
    queryKey: ['participacoes', fonogramaId],
    queryFn: () => getParticipacoes(fonogramaId),
  });
}

// useCalcularPercentuais — mutation
export function useCalcularPercentuais(fonogramaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => calcularPercentuais(fonogramaId),
    onSuccess: (response) => {
      queryClient.setQueryData(['participacoes', fonogramaId], response);
    },
  });
}

// useAddParticipacao, useAjustarPercentual, useRemoveParticipacao
// — mesmos padrões com setQueryData
```

### Componentes Chave

#### ParticipacoesSection (composição principal)

```typescript
interface ParticipacoesProps {
  fonogramaId: string;
  fonogramaStatus: StatusFonograma;
  onDepuracaoRequired: () => void;
}

export function ParticipacoesSection({ fonogramaId, fonogramaStatus, onDepuracaoRequired }: ParticipacoesProps) {
  const { data } = useParticipacoes(fonogramaId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRecalcularModal, setShowRecalcularModal] = useState(false);

  const isReadOnly = fonogramaStatus === 'DEPURADO';
  const temInterprete = data?.participacoes.some(p => p.categoria === 'INTERPRETE');
  const temProdutor = data?.participacoes.some(p => p.categoria === 'PRODUTOR_FONOGRAFICO');
  const podeCalcular = temInterprete && temProdutor;

  const handleCalcular = () => {
    if (data?.somaCalculada) {
      setShowRecalcularModal(true); // alerta de sobrescrita
    } else {
      executarCalculo();
    }
  };

  return (
    <section>
      <div className={styles.header}>
        <h3>Participações Conexas</h3>
        <div className={styles.actions}>
          {!isReadOnly && <Button variant="ghost" onClick={() => setShowAddForm(true)}>Adicionar Participante</Button>}
          {!isReadOnly && (
            <CalcularButton
              podeCalcular={podeCalcular}
              temInterprete={temInterprete}
              temProdutor={temProdutor}
              onClick={handleCalcular}
              isLoading={calcularMutation.isPending}
            />
          )}
        </div>
      </div>

      {data?.percentuaisDesatualizados && <DesatualizadoBadge />}
      {showAddForm && <AddParticipacaoForm ... />}

      <ParticipacoesTable
        items={data?.participacoes ?? []}
        isReadOnly={isReadOnly}
        onAjustarPercentual={handleAjustar}
        onRemover={handleRemover}
      />

      <SomaIndicator
        soma={data?.somaPercentual ?? 0}
        completa={data?.somaCalculada && data?.somaPercentual === 100}
        pendente={!data?.somaCalculada}
      />

      <RecalcularModal ... />
    </section>
  );
}
```

#### ParticipacoesTable — Inline Edit

```typescript
export function ParticipacoesTable({ items, isReadOnly, onAjustarPercentual, onRemover }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  return (
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>Tipo</th>
          <th>Documento</th>
          <th>Categoria</th>
          <th>Percentual</th>
          {!isReadOnly && <th>Ações</th>}
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={item.id}>
            <td>{item.titular.nome}</td>
            <td><Badge variant={item.titular.tipo === 'PF' ? 'secondary' : 'accent'}>{item.titular.tipo}</Badge></td>
            <td className={styles.mono}>{item.titular.documentoFormatado}</td>
            <td><CategoriaLabel categoria={item.categoria} /></td>
            <td className={styles.mono}>
              {item.percentual === null ? '—' : (
                editingId === item.id ? (
                  <input className={styles.inlineInput} value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => { onAjustarPercentual(item.id, Number(editValue)); setEditingId(null); }}
                    onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                    autoFocus />
                ) : (
                  <span
                    className={item.editavel ? styles.editableValue : styles.lockedValue}
                    onClick={() => item.editavel && !isReadOnly && startEdit(item)}
                  >
                    {item.percentual.toFixed(4)}%
                    {!item.editavel && <Lock size={12} className={styles.lockIcon} />}
                  </span>
                )
              )}
            </td>
            {!isReadOnly && (
              <td>
                <Button variant="ghost" size="sm" onClick={() => onRemover(item.id)}>
                  <Trash2 size={14} />
                </Button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

#### CalcularButton

```typescript
interface CalcularButtonProps {
  podeCalcular: boolean;
  temInterprete: boolean;
  temProdutor: boolean;
  onClick: () => void;
  isLoading: boolean;
}

export function CalcularButton({ podeCalcular, temInterprete, temProdutor, onClick, isLoading }: CalcularButtonProps) {
  const tooltip = !temInterprete && !temProdutor
    ? 'Adicione ao menos 1 Intérprete e 1 Produtor'
    : !temInterprete ? 'Adicione ao menos 1 Intérprete'
    : !temProdutor ? 'Adicione ao menos 1 Produtor'
    : '';

  return (
    <div className={styles.wrapper} title={tooltip}>
      <Button variant="primary" disabled={!podeCalcular || isLoading} onClick={onClick}>
        {isLoading ? <Spinner /> : 'Calcular'}
      </Button>
    </div>
  );
}
```

#### SomaIndicator — Extensão para estado "Pendente"

```typescript
// Reutiliza SomaIndicator de F04 com estado adicional:
// pendente=true → exibe "Pendente" em vez de valor
// Extensão da prop interface
interface SomaIndicatorProps {
  soma: number;
  completa: boolean;
  pendente?: boolean;  // NOVO: true se percentuais não calculados
}
```

### Integração com FonogramaDetailPage (F05)

```typescript
// Em FonogramaDetailPage.tsx — MODIFICAR:
import { ParticipacoesSection } from '@features/cadastro/participacoes';

// Dentro do render, após FonogramaForm:
{fonograma && (
  <ParticipacoesSection
    fonogramaId={fonograma.id}
    fonogramaStatus={fonograma.status}
    onDepuracaoRequired={() => setShowDepuracaoModal(true)}
  />
)}
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| **Feature — Types, API, Hooks** | | |
| `features/cadastro/participacoes/types/participacao.ts` | Tipos | Derivados do API Contract |
| `features/cadastro/participacoes/api/participacoesApi.ts` | API | 5 funções |
| `features/cadastro/participacoes/hooks/useParticipacoes.ts` | Hook | Query principal |
| `features/cadastro/participacoes/hooks/useAddParticipacao.ts` | Hook | Mutation add |
| `features/cadastro/participacoes/hooks/useAjustarPercentual.ts` | Hook | Mutation ajuste |
| `features/cadastro/participacoes/hooks/useRemoveParticipacao.ts` | Hook | Mutation remove |
| `features/cadastro/participacoes/hooks/useCalcularPercentuais.ts` | Hook | Mutation calcular |
| **Feature — Componentes** | | |
| `features/cadastro/participacoes/components/ParticipacoesSection.tsx` + `.module.css` | Componente | Composição: header + form + table + calcular + soma |
| `features/cadastro/participacoes/components/ParticipacoesTable.tsx` + `.module.css` | Componente | Tabela com inline edit + cadeado músicos |
| `features/cadastro/participacoes/components/AddParticipacaoForm.tsx` + `.module.css` | Componente | Autocomplete + Select categoria (3 opções) |
| `features/cadastro/participacoes/components/CalcularButton.tsx` + `.module.css` | Componente | Botão + tooltip + loading |
| `features/cadastro/participacoes/components/DesatualizadoBadge.tsx` + `.module.css` | Componente | Badge warning "Percentuais desatualizados" |
| `features/cadastro/participacoes/components/RecalcularModal.tsx` + `.module.css` | Componente | Modal "Ajustes serão perdidos" |
| **Feature — Index** | | |
| `features/cadastro/participacoes/index.ts` | Export | Exporta ParticipacoesSection + hooks |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `features/cadastro/fonogramas/pages/FonogramaDetailPage.tsx` | Integrar `ParticipacoesSection` abaixo do FonogramaForm |
| `features/cadastro/titularidades/components/SomaIndicator.tsx` | Adicionar prop `pendente?: boolean` para estado "Pendente" |

### Arquivos de Referência

| Caminho | Motivo |
|---------|--------|
| `frontend/DESIGN.md` | Tokens, componentes |
| `tasks/prd-participacao-conexa/api-contract.yaml` | Schemas |
| `features/cadastro/titularidades/` | Padrão de seção integrada (F04) |
| `features/cadastro/fonogramas/pages/FonogramaDetailPage.tsx` | Página host |
| `features/cadastro/fonogramas/components/FonogramaDepuracaoModal.tsx` | Reutilizado |
| `shared/components/ui/autocomplete/` | Reutilizado |
| Stitch screens de Participações (a serem criadas) | Referência visual |

---

## Sequenciamento de Desenvolvimento

1. **Stitch mockups** — 6 screens
2. **Types + API + Hooks** — 5 funções + 5 hooks
3. **Componentes simples** — AddParticipacaoForm, CalcularButton, DesatualizadoBadge, RecalcularModal
4. **ParticipacoesTable** — inline edit + cadeado
5. **SomaIndicator fix** — adicionar prop `pendente`
6. **ParticipacoesSection** — composição principal
7. **Integração FonogramaDetailPage**

---

## Mapeamento PRD → Frontend

| Requisito | Componente |
|-----------|-----------|
| RF-01 (adicionar) | AddParticipacaoForm + Autocomplete + useAddParticipacao |
| RF-03 (duplicata) | Erro 409 → toast |
| RF-04 (sem % ao adicionar) | ParticipacoesTable exibe "—" |
| RF-05 (desatualizado) | DesatualizadoBadge |
| RF-08 (calcular) | CalcularButton + useCalcularPercentuais |
| RF-17/18 (ajuste intérprete/produtor) | ParticipacoesTable inline edit |
| RF-19 (músico não editável) | Ícone cadeado, click ignorado, PUT retorna 422 → toast |
| RF-23 (alerta sobrescrita) | RecalcularModal |
| RF-26 (depuração LIBERADO) | ParticipacoesSection `onDepuracaoRequired` → FonogramaDetailPage |
| RF-29 (tabela) | ParticipacoesTable: nome, tipo badge, documento mono, categoria, percentual mono, cadeado |
| RF-30 (soma) | SomaIndicator (verde/amarelo/pendente) |
| RF-31 (read-only DEPURADO) | ParticipacoesSection `isReadOnly` |
| RF-32 (pendente) | SomaIndicator com `pendente=true` → "Pendente" |

---

*Tech Spec Frontend gerada. Para gerar tasks, use `flow-task-creator` com ambas techspecs.*
