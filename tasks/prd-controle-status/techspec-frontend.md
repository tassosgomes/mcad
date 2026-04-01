# Tech Spec Frontend — F07: Controle de Status

> **PRD:** `tasks/prd-controle-status/prd.md`
> **API Contract:** `tasks/prd-controle-status/api-contract.yaml`
> **Domínio:** Cadastro (D01)
> **Feature ID:** F07
> **Data:** 2026-04-01

---

## Resumo Executivo

Esta Tech Spec cobre a implementação frontend do Controle de Status — uma feature predominantemente de **extensão de telas existentes** (ObraDetailPage e FonogramaDetailPage), não de novas páginas. Introduz: botões de ação contextual (Liberar/Bloquear/Desbloquear), modal de bloqueio com justificativa, checklist de pré-requisitos para liberação, banner de bloqueio com justificativa, campo urlAudio no fonograma, badge BLOQUEADO, e seção de histórico de bloqueios. Reutiliza shared components existentes (Button, Modal, Badge, Toast, TextInput).

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `react-architecture` | Extensão de features existentes, hooks de ação |
| `frontend-design` | Botões de ação, banner de bloqueio, checklist visual |

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
| 1 | **Obra Detalhe — Botões de status (PENDENTE)** | Botão "Liberar" (primary/success) + "Bloquear" (danger). Indicadores visuais de pré-requisitos. |
| 2 | **Obra Detalhe — Checklist de liberação (pendências)** | Modal/inline com checklist: Título ✅, Tipo ✅, ISWC ❌, Titularidades ❌ (80%). |
| 3 | **Obra Detalhe — BLOQUEADO** | Banner vermelho com justificativa + data. Botão "Desbloquear". Campos disabled. |
| 4 | **Fonograma Detalhe — Botões (PENDENTE_DOCUMENTACAO)** | Botão "Liberar" + campo urlAudio preenchido. |
| 5 | **Fonograma Detalhe — BLOQUEADO** | Banner vermelho com justificativa. |
| 6 | **Modal Bloquear** | Textarea justificativa (mín 10 chars) + Cancelar/Bloquear(danger). |
| 7 | **Histórico de Bloqueios** | Lista cronológica: BLOQUEIO (justificativa) / DESBLOQUEIO + data. |

---

## Arquitetura do Sistema

### Estrutura de Pastas

F07 **não tem feature folder própria** — seus componentes e hooks são adicionados diretamente nas features existentes (obras, fonogramas) e em shared.

```
frontend/src/
├── shared/
│   └── components/ui/
│       ├── status-actions/              ← NOVO
│       │   ├── LiberarButton.tsx + .module.css
│       │   ├── BloquearButton.tsx + .module.css
│       │   ├── DesbloquearButton.tsx + .module.css
│       │   └── index.ts
│       ├── bloqueio-banner/             ← NOVO
│       │   ├── BloqueioBanner.tsx + .module.css
│       │   └── index.ts
│       ├── bloqueio-modal/              ← NOVO
│       │   ├── BloqueioModal.tsx + .module.css
│       │   └── index.ts
│       ├── checklist-prereqs/           ← NOVO
│       │   ├── ChecklistPreRequisitos.tsx + .module.css
│       │   └── index.ts
│       └── historico-bloqueios/         ← NOVO
│           ├── HistoricoBloqueios.tsx + .module.css
│           └── index.ts
│
├── features/cadastro/
│   ├── obras/
│   │   ├── hooks/
│   │   │   ├── useLiberarObra.ts        ← NOVO
│   │   │   ├── useBloquearObra.ts       ← NOVO
│   │   │   ├── useDesbloquearObra.ts    ← NOVO
│   │   │   └── useHistoricoObra.ts      ← NOVO
│   │   ├── api/
│   │   │   └── obrasApi.ts              ← MODIFICAR: +liberar, +bloquear, +desbloquear, +historico
│   │   └── pages/
│   │       └── ObraDetailPage.tsx       ← MODIFICAR: integrar botões + banner + checklist + histórico
│   │
│   └── fonogramas/
│       ├── hooks/
│       │   ├── useLiberarFonograma.ts   ← NOVO
│       │   ├── useBloquearFonograma.ts  ← NOVO
│       │   ├── useDesbloquearFonograma.ts ← NOVO
│       │   └── useHistoricoFonograma.ts ← NOVO
│       ├── api/
│       │   └── fonogramasApi.ts         ← MODIFICAR: +liberar, +bloquear, +desbloquear, +historico, urlAudio no update
│       ├── components/
│       │   └── FonogramaForm.tsx        ← MODIFICAR: +campo urlAudio
│       └── pages/
│           └── FonogramaDetailPage.tsx  ← MODIFICAR: integrar botões + banner + checklist + histórico + urlAudio
```

### Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| Shared components para botões/banner/checklist | Reutilizáveis entre obras e fonogramas (mesma semântica) |
| Sem feature folder própria | F07 estende obras e fonogramas — não tem entidade/página própria |
| Hooks de ação por entidade (não shared) | `useLiberarObra` invalida queries de `['obra', id]` — acoplado à feature |
| Checklist de pré-requisitos como componente | Renderiza `pendencias[]` do 422 como checklist visual |
| Banner de bloqueio reutiliza padrão de DepuracaoBanner | Mesmo layout (cor diferente: `--color-error-container`) |

---

## Design de Implementação

### Tipos Adicionais

```typescript
// Adicionar aos tipos existentes de obras e fonogramas:

export interface PreRequisitoItem {
  item: string;
  atendido: boolean;
  detalhe?: string | null;
}

export interface PreRequisitosError {
  type: string;
  title: string;
  status: 422;
  detail: string;
  pendencias: PreRequisitoItem[];
}

export interface HistoricoBloqueioItem {
  id: string;
  acao: 'BLOQUEIO' | 'DESBLOQUEIO';
  justificativa: string | null;
  dataHora: string;
}

export interface BloquearRequest {
  justificativa: string;
}

// Estender tipos existentes:
// ObraMusical += bloqueioJustificativa: string | null
// Fonograma += urlAudio: string | null, bloqueioJustificativa: string | null
```

### API — Funções Adicionais

```typescript
// obrasApi.ts — ADICIONAR:
export function liberarObra(id: string): Promise<ObraMusical> {
  return apiPost(`/obras/${id}/liberar`, {});
}
export function bloquearObra(id: string, data: BloquearRequest): Promise<ObraMusical> {
  return apiPost(`/obras/${id}/bloquear`, data);
}
export function desbloquearObra(id: string): Promise<ObraMusical> {
  return apiPost(`/obras/${id}/desbloquear`, {});
}
export function getHistoricoObra(id: string): Promise<HistoricoBloqueioItem[]> {
  return apiGet(`/obras/${id}/historico-bloqueios`);
}

// fonogramasApi.ts — ADICIONAR: (mesma estrutura)
export function liberarFonograma(id: string): Promise<Fonograma> { ... }
export function bloquearFonograma(id: string, data: BloquearRequest): Promise<Fonograma> { ... }
export function desbloquearFonograma(id: string): Promise<Fonograma> { ... }
export function getHistoricoFonograma(id: string): Promise<HistoricoBloqueioItem[]> { ... }
```

### Hooks de Ação

```typescript
// obras/hooks/useLiberarObra.ts
export function useLiberarObra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => liberarObra(id),
    onSuccess: (data) => {
      queryClient.setQueryData(['obra', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['obras'] });
    },
  });
}

// Padrão idêntico para bloquear, desbloquear, e fonogramas
```

### Shared Components

#### LiberarButton

```typescript
interface LiberarButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function LiberarButton({ onClick, isLoading, disabled }: LiberarButtonProps) {
  return (
    <Button variant="primary" onClick={onClick} disabled={disabled || isLoading}>
      {isLoading ? <Spinner /> : <><CheckCircle size={16} /> Liberar</>}
    </Button>
  );
}
```

**Estilo:** background `--color-success` (não `--color-accent`), hover darkened.

#### BloquearButton

```typescript
export function BloquearButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="danger" onClick={onClick}>
      <Ban size={16} /> Bloquear
    </Button>
  );
}
```

#### BloqueioModal

```typescript
interface BloqueioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (justificativa: string) => void;
  isLoading: boolean;
  entityName: string;  // "obra" ou "fonograma"
}

export function BloqueioModal({ isOpen, onClose, onConfirm, isLoading, entityName }: BloqueioModalProps) {
  const [justificativa, setJustificativa] = useState('');
  const isValid = justificativa.trim().length >= 10;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Bloquear ${entityName}`}
      actions={<>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant="danger" onClick={() => onConfirm(justificativa)} disabled={!isValid || isLoading}>
          {isLoading ? <Spinner /> : 'Bloquear'}
        </Button>
      </>}>
      <FormField label="Justificativa" required error={justificativa.length > 0 && !isValid ? 'Mínimo 10 caracteres' : undefined}>
        <textarea value={justificativa} onChange={e => setJustificativa(e.target.value)}
          placeholder="Informe o motivo do bloqueio..." rows={4} />
      </FormField>
    </Modal>
  );
}
```

#### BloqueioBanner

```typescript
interface BloqueioBannerProps {
  justificativa: string;
}

export function BloqueioBanner({ justificativa }: BloqueioBannerProps) {
  return (
    <div className={styles.banner}>
      <Ban size={18} />
      <div>
        <strong>Esta entidade está bloqueada</strong>
        <p>{justificativa}</p>
      </div>
    </div>
  );
}
```

**Estilo:** `--color-error-container` background, `--color-error` ícone, `--color-text-primary` texto.

#### ChecklistPreRequisitos

```typescript
interface ChecklistProps {
  pendencias: PreRequisitoItem[];
}

export function ChecklistPreRequisitos({ pendencias }: ChecklistProps) {
  return (
    <div className={styles.checklist}>
      <h4>Pré-requisitos para liberação</h4>
      {pendencias.map(p => (
        <div key={p.item} className={`${styles.item} ${p.atendido ? styles.ok : styles.pendente}`}>
          {p.atendido ? <CheckCircle size={16} /> : <XCircle size={16} />}
          <span>{p.item}</span>
          {p.detalhe && <span className={styles.detalhe}>{p.detalhe}</span>}
        </div>
      ))}
    </div>
  );
}
```

**Estilo:** Check verde `--color-success`, X vermelho `--color-error`, detalhe em `--color-text-muted`.

#### HistoricoBloqueios

```typescript
interface HistoricoProps {
  items: HistoricoBloqueioItem[];
}

export function HistoricoBloqueios({ items }: HistoricoProps) {
  if (items.length === 0) return null;
  return (
    <div className={styles.historico}>
      <h4>Histórico de Bloqueios</h4>
      {items.map(item => (
        <div key={item.id} className={styles.entry}>
          <Badge variant={item.acao === 'BLOQUEIO' ? 'error' : 'success'}>{item.acao}</Badge>
          <span className={styles.data}>{formatDateTime(item.dataHora)}</span>
          {item.justificativa && <p className={styles.justificativa}>{item.justificativa}</p>}
        </div>
      ))}
    </div>
  );
}
```

### Integração na ObraDetailPage

```typescript
// ObraDetailPage.tsx — MODIFICAR:

// Importar novos hooks e componentes
import { useLiberarObra, useBloquearObra, useDesbloquearObra, useHistoricoObra } from '../hooks/...';
import { LiberarButton, BloquearButton, DesbloquearButton } from '@components/ui/status-actions';
import { BloqueioBanner } from '@components/ui/bloqueio-banner';
import { BloqueioModal } from '@components/ui/bloqueio-modal';
import { ChecklistPreRequisitos } from '@components/ui/checklist-prereqs';
import { HistoricoBloqueios } from '@components/ui/historico-bloqueios';

// No render:
// 1. Banner de bloqueio (se BLOQUEADO)
{obra.status === 'BLOQUEADO' && obra.bloqueioJustificativa && (
  <BloqueioBanner justificativa={obra.bloqueioJustificativa} />
)}

// 2. Botões de ação no PageHeader.action
<div className={styles.statusActions}>
  {obra.status === 'PENDENTE' && <LiberarButton onClick={handleLiberar} isLoading={...} />}
  {(obra.status === 'PENDENTE' || obra.status === 'LIBERADO') && <BloquearButton onClick={() => setShowBloqueioModal(true)} />}
  {obra.status === 'BLOQUEADO' && <DesbloquearButton onClick={handleDesbloquear} isLoading={...} />}
</div>

// 3. Checklist de pendências (exibido inline ou em modal após tentar liberar)
{showPendencias && <ChecklistPreRequisitos pendencias={pendencias} />}

// 4. Histórico no final da página
<HistoricoBloqueios items={historicoData ?? []} />

// 5. Campos disabled quando BLOQUEADO (mesma lógica de DEPURADA)
const isReadOnly = obra.status === 'DEPURADA' || obra.status === 'BLOQUEADO' || obra.status === 'DOMINIO_PUBLICO';
```

### Integração na FonogramaDetailPage

Mesmo padrão da ObraDetailPage + campo urlAudio no FonogramaForm.

```typescript
// FonogramaForm.tsx — MODIFICAR: adicionar campo urlAudio
<FormField label="URL do Áudio">
  <TextInput
    value={formData.urlAudio ?? ''}
    onChange={(v) => setFormData(prev => ({ ...prev, urlAudio: v || null }))}
    placeholder="https://storage.example.com/audio.mp3"
    disabled={isReadOnly || fonograma?.status === 'LIBERADO'}
  />
</FormField>
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| **Shared — UI Components** | | |
| `shared/components/ui/status-actions/LiberarButton.tsx` + `.module.css` | Componente | Botão verde CheckCircle |
| `shared/components/ui/status-actions/BloquearButton.tsx` + `.module.css` | Componente | Botão danger Ban |
| `shared/components/ui/status-actions/DesbloquearButton.tsx` + `.module.css` | Componente | Botão secondary Unlock |
| `shared/components/ui/status-actions/index.ts` | Export | |
| `shared/components/ui/bloqueio-banner/BloqueioBanner.tsx` + `.module.css` | Componente | Banner error-container + justificativa |
| `shared/components/ui/bloqueio-banner/index.ts` | Export | |
| `shared/components/ui/bloqueio-modal/BloqueioModal.tsx` + `.module.css` | Componente | Modal com textarea justificativa |
| `shared/components/ui/bloqueio-modal/index.ts` | Export | |
| `shared/components/ui/checklist-prereqs/ChecklistPreRequisitos.tsx` + `.module.css` | Componente | Checklist check/cross por item |
| `shared/components/ui/checklist-prereqs/index.ts` | Export | |
| `shared/components/ui/historico-bloqueios/HistoricoBloqueios.tsx` + `.module.css` | Componente | Lista cronológica |
| `shared/components/ui/historico-bloqueios/index.ts` | Export | |
| **Hooks — Obras** | | |
| `features/cadastro/obras/hooks/useLiberarObra.ts` | Hook | Mutation liberar |
| `features/cadastro/obras/hooks/useBloquearObra.ts` | Hook | Mutation bloquear |
| `features/cadastro/obras/hooks/useDesbloquearObra.ts` | Hook | Mutation desbloquear |
| `features/cadastro/obras/hooks/useHistoricoObra.ts` | Hook | Query histórico |
| **Hooks — Fonogramas** | | |
| `features/cadastro/fonogramas/hooks/useLiberarFonograma.ts` | Hook | Mutation liberar |
| `features/cadastro/fonogramas/hooks/useBloquearFonograma.ts` | Hook | Mutation bloquear |
| `features/cadastro/fonogramas/hooks/useDesbloquearFonograma.ts` | Hook | Mutation desbloquear |
| `features/cadastro/fonogramas/hooks/useHistoricoFonograma.ts` | Hook | Query histórico |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `features/cadastro/obras/api/obrasApi.ts` | +liberarObra, +bloquearObra, +desbloquearObra, +getHistoricoObra |
| `features/cadastro/obras/types/obra.ts` | +bloqueioJustificativa, +PreRequisitoItem, +HistoricoBloqueioItem, +BloquearRequest, status enum +BLOQUEADO |
| `features/cadastro/obras/pages/ObraDetailPage.tsx` | Integrar: banner bloqueio, botões status, checklist, histórico. isReadOnly inclui BLOQUEADO. |
| `features/cadastro/fonogramas/api/fonogramasApi.ts` | +liberarFonograma, +bloquearFonograma, +desbloquearFonograma, +getHistoricoFonograma |
| `features/cadastro/fonogramas/types/fonograma.ts` | +urlAudio, +bloqueioJustificativa, status enum +BLOQUEADO |
| `features/cadastro/fonogramas/components/FonogramaForm.tsx` | +campo urlAudio (TextInput, disabled em LIBERADO/DEPURADO) |
| `features/cadastro/fonogramas/pages/FonogramaDetailPage.tsx` | Integrar: banner bloqueio, botões status, checklist, histórico, urlAudio |

### Arquivos de Referência

| Caminho | Motivo |
|---------|--------|
| `frontend/DESIGN.md` | Tokens, componentes |
| `tasks/prd-controle-status/api-contract.yaml` | Schemas |
| `shared/components/ui/modal/` | Reutilizado pelo BloqueioModal |
| `features/cadastro/obras/components/DepuracaoBanner.tsx` | Padrão visual para BloqueioBanner |
| Stitch screens de Status (a serem criadas) | Referência visual |

---

## Sequenciamento de Desenvolvimento

1. **Stitch mockups** — 7 screens
2. **Shared components** — LiberarButton, BloquearButton, DesbloquearButton, BloqueioModal, BloqueioBanner, ChecklistPreRequisitos, HistoricoBloqueios
3. **Types** — Estender tipos de obras e fonogramas (+bloqueioJustificativa, +urlAudio, +BLOQUEADO, +PreRequisitoItem)
4. **API** — Estender obrasApi e fonogramasApi (8 funções novas)
5. **Hooks** — 8 hooks novos (4 obras + 4 fonogramas)
6. **FonogramaForm** — +campo urlAudio
7. **ObraDetailPage** — Integrar botões + banner + checklist + histórico
8. **FonogramaDetailPage** — Integrar botões + banner + checklist + histórico + urlAudio

---

## Mapeamento PRD → Frontend

| Requisito | Componente |
|-----------|-----------|
| RF-01 (botão Liberar obra) | LiberarButton + useLiberarObra + ObraDetailPage |
| RF-04 (lista pendências) | ChecklistPreRequisitos (renderiza 422 pendencias[]) |
| RF-06/07 (bloquear obra) | BloquearButton + BloqueioModal + useBloquearObra |
| RF-10 (justificativa visível) | BloqueioBanner na ObraDetailPage |
| RF-11/12 (desbloquear) | DesbloquearButton + useDesbloquearObra |
| RF-14 (liberar fonograma) | LiberarButton + useLiberarFonograma + FonogramaDetailPage |
| RF-21-25 (urlAudio) | FonogramaForm + campo TextInput |
| RF-26-30 (bloquear fonograma) | Reutiliza mesmos shared components |
| RF-31-33 (histórico) | HistoricoBloqueios + useHistoricoObra/Fonograma |

---

*Tech Spec Frontend gerada. Para gerar tasks, use `flow-task-creator` com ambas techspecs.*
