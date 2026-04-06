# Especificação Técnica Frontend — F05: Fechamento do Rol

> **PRD:** `tasks/prd-fechamento-rol/prd.md`
> **API Contract:** `tasks/prd-fechamento-rol/api-contract.yaml`
> **TechSpec Backend:** `tasks/prd-fechamento-rol/techspec.md`
> **Domínio:** Identificação (D02)
> **Última revisão:** 2026-04-04

---

## Resumo Executivo

Esta feature adiciona à `CaptacaoDetailPage`: botão "Fechar Rol" com modal de checklist de pré-requisitos, confirmação de fechamento e estados visuais pós-fechamento. Não cria páginas novas — tudo é integrado na tela existente. O modal consulta o endpoint de pré-requisitos e habilita o botão de confirmação somente quando todos estão atendidos.

---

## Stitch — Mockup Obrigatório

| Campo | Valor |
|-------|-------|
| **Projeto** | mcad |
| **ID** | `533156784329699726` |

| # | Tela | Descrição |
|---|------|-----------|
| 1 | Botão "Fechar Rol" no header da CaptacaoDetailPage | Visível para ABERTA + dono, ao lado de "Excluir" |
| 2 | Modal de fechamento — checklist atendida | Todos ✅, resumo (150 exec, TV Aberta, 15/01/2026), botão "Confirmar Fechamento" habilitado |
| 3 | Modal de fechamento — com problemas | Itens ❌ em vermelho com detalhe, botão desabilitado |
| 4 | Estado pós-fechamento | Badge FECHADA, sem botões de edição/exclusão, sem "Adicionar Execução" |

---

## Arquitetura do Módulo

### Estrutura (incremental — sem pasta nova)

```
frontend/src/features/identificacao/captacoes/
├── types/
│   └── fechamento.ts                                  # NOVO
├── api/
│   └── fechamentoApi.ts                               # NOVO
├── hooks/
│   ├── usePreRequisitos.ts                            # NOVO
│   └── useFecharRol.ts                                # NOVO
├── pages/
│   └── CaptacaoDetailPage.tsx                         # MODIFICAR
└── components/
    ├── FecharRolButton.tsx                            # NOVO
    ├── FecharRolModal.tsx                             # NOVO
    ├── FecharRolModal.module.css
    ├── ChecklistPreRequisitos.tsx                     # NOVO
    └── ChecklistPreRequisitos.module.css
```

---

## Tipos TypeScript

```typescript
// types/fechamento.ts

export interface PreRequisitoItem {
  id: string;
  descricao: string;
  atendido: boolean;
  detalhe: string | null;
}

export interface ResumoFechamento {
  totalExecucoes: number;
  identificadas: number;
  pendentes: number;
  rubrica: string;
  periodo: string;
  exigeClassificacao: boolean;
}

export interface PreRequisitosResponse {
  captacaoId: string;
  todosAtendidos: boolean;
  itens: PreRequisitoItem[];
  resumo: ResumoFechamento;
}

export interface FechamentoResponse {
  captacaoId: string;
  status: 'FECHADA';
  fechadoEm: string;
  totalExecucoes: number;
  eventoPublicado: boolean;
}
```

---

## Camada de API

```typescript
// api/fechamentoApi.ts
import { apiGet, apiPost } from '@shared/services/apiIdentificacaoClient';

export function getPreRequisitos(captacaoId: string) {
  return apiGet<PreRequisitosResponse>(`/captacoes/${captacaoId}/pre-requisitos`);
}

export function fecharRol(captacaoId: string) {
  return apiPost<FechamentoResponse>(`/captacoes/${captacaoId}/fechar`, {});
}
```

---

## Hooks

```typescript
// usePreRequisitos.ts
export function usePreRequisitos(captacaoId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['preRequisitos', captacaoId],
    queryFn: () => getPreRequisitos(captacaoId),
    enabled,
    staleTime: 0, // Sempre buscar dados frescos ao abrir modal
  });
}

// useFecharRol.ts
export function useFecharRol() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (captacaoId: string) => fecharRol(captacaoId),
    onSuccess: (_, captacaoId) => {
      queryClient.invalidateQueries({ queryKey: ['captacoes', captacaoId] });
      queryClient.invalidateQueries({ queryKey: ['captacoes'] }); // lista
      queryClient.invalidateQueries({ queryKey: ['pendentes'] }); // tela F04
    },
  });
}
```

---

## Design de Componentes

### FecharRolButton.tsx

**Props:**
```typescript
interface FecharRolButtonProps {
  onClick: () => void;
  disabled: boolean;
}
```

Botão no header da CaptacaoDetailPage, ao lado do badge de status. Variante `primary`. Visível somente se `isOwner && captacao.status === 'ABERTA'`.

### FecharRolModal.tsx

**Props:**
```typescript
interface FecharRolModalProps {
  captacaoId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
```

**Fluxo:**
1. Modal abre → dispara `usePreRequisitos(captacaoId, isOpen)`
2. Exibe loading enquanto busca
3. Exibe `ChecklistPreRequisitos` com itens + resumo
4. Botão "Confirmar Fechamento" habilitado somente se `todosAtendidos`
5. Ao confirmar → `useFecharRol.mutateAsync(captacaoId)`
6. Sucesso → toast "Rol fechado com sucesso" + `onSuccess()` (page refetch)
7. Erro → toast com detail do ProblemDetails

### ChecklistPreRequisitos.tsx

**Props:**
```typescript
interface ChecklistPreRequisitosProps {
  itens: PreRequisitoItem[];
  resumo: ResumoFechamento;
}
```

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Resumo: TV Aberta — 15/01/2026              │
│ 150 execuções · 150 identificadas · 0 pend. │
├─────────────────────────────────────────────┤
│ ✅ Ao menos 1 execução registrada           │
│ ✅ Nenhuma execução pendente                │
│ ✅ Obras/fonogramas liberadas no Cadastro   │
│ ✅ Tipo de utilização em todas execuções    │
│ ✅ Início/fim em todas execuções            │
├─────────────────────────────────────────────┤
│              [Confirmar Fechamento]          │
└─────────────────────────────────────────────┘
```

Itens ❌: texto em vermelho, detalhe abaixo (ex: "3 execuções pendentes de identificação").

---

## Integração com CaptacaoDetailPage

```tsx
// CaptacaoDetailPage.tsx — no header, adicionar:
{isOwner && captacao.status === 'ABERTA' && (
  <FecharRolButton onClick={() => setShowFecharModal(true)} disabled={false} />
)}

// Estado pós-fechamento:
{captacao.status === 'FECHADA' && (
  <Badge variant="success">FECHADA</Badge>
  // Botões de edição/exclusão/adicionar execução ocultos
)}

// Modal:
<FecharRolModal
  captacaoId={captacao.id}
  isOpen={showFecharModal}
  onClose={() => setShowFecharModal(false)}
  onSuccess={() => { setShowFecharModal(false); refetch(); }}
/>
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `frontend/src/features/identificacao/captacoes/types/fechamento.ts` | Types | PreRequisitos, Resumo, Fechamento |
| `frontend/src/features/identificacao/captacoes/api/fechamentoApi.ts` | API | getPreRequisitos, fecharRol |
| `frontend/src/features/identificacao/captacoes/hooks/usePreRequisitos.ts` | Hook | Query com staleTime 0 |
| `frontend/src/features/identificacao/captacoes/hooks/useFecharRol.ts` | Hook | Mutation |
| `frontend/src/features/identificacao/captacoes/components/FecharRolButton.tsx` | Component | Botão no header |
| `frontend/src/features/identificacao/captacoes/components/FecharRolModal.tsx` | Component | Modal com checklist |
| `frontend/src/features/identificacao/captacoes/components/FecharRolModal.module.css` | Style | |
| `frontend/src/features/identificacao/captacoes/components/ChecklistPreRequisitos.tsx` | Component | Lista ✅/❌ + resumo |
| `frontend/src/features/identificacao/captacoes/components/ChecklistPreRequisitos.module.css` | Style | |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `frontend/src/features/identificacao/captacoes/pages/CaptacaoDetailPage.tsx` | Adicionar FecharRolButton no header + FecharRolModal + estado pós-fechamento |

### Arquivos de Referência

| Caminho | Motivo |
|---------|--------|
| `frontend/src/features/cadastro/obras/pages/ObraDetailPage.tsx` | Padrão de status actions no header |
| `frontend/src/shared/components/ui/modal/Modal.tsx` | Base do modal |
| `frontend/src/shared/components/ui/badge/Badge.tsx` | Badges ✅/❌ |

---

## Sequenciamento

| # | Etapa | Dependência |
|---|-------|-------------|
| 1 | Stitch mockups (4 telas) | Nenhuma |
| 2 | types/fechamento.ts | api-contract |
| 3 | api/fechamentoApi.ts + hooks | Etapa 2 |
| 4 | ChecklistPreRequisitos + FecharRolModal | Etapa 3 + mockups |
| 5 | FecharRolButton + integração CaptacaoDetailPage | Etapa 4 |

---

*TechSpec Frontend gerada com a skill `flow-techspec-creator`.*
