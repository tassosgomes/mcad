# Especificação Técnica Frontend — F06: Cancelamento e Recriação

> **PRD:** `tasks/prd-cancelamento-recriacao/prd.md`
> **API Contract:** `tasks/prd-cancelamento-recriacao/api-contract.yaml`
> **TechSpec Backend:** `tasks/prd-cancelamento-recriacao/techspec.md`
> **Domínio:** Identificação (D02)
> **Última revisão:** 2026-04-04

---

## Resumo Executivo

Esta feature adiciona à `CaptacaoDetailPage`: botão "Cancelar Rol" (danger) com verificação de bloqueio pós-distribuição, modal de cancelamento com justificativa + opções de recriação, banner visual para captações canceladas e redirecionamento para nova captação quando aplicável.

---

## Stitch — Mockup Obrigatório

| Campo | Valor |
|-------|-------|
| **Projeto** | mcad |
| **ID** | `533156784329699726` |

| # | Tela | Descrição |
|---|------|-----------|
| 1 | Botão "Cancelar Rol" no header | Danger, ao lado de "Fechar Rol", visível para FECHADA + dono |
| 2 | Botão desabilitado | Tooltip: "Rol já processado pela Distribuição" |
| 3 | Modal de cancelamento | Textarea justificativa + 3 radio buttons (Copiar/Vazia/Apenas) + botão danger |
| 4 | Banner captação CANCELADA | Fundo vermelho claro, justificativa, data, analista |
| 5 | Redirecionamento pós-recriação | Toast + navegação para nova captação |

---

## Arquitetura do Módulo

### Estrutura (incremental)

```
frontend/src/features/identificacao/captacoes/
├── types/
│   └── cancelamento.ts                                # NOVO
├── api/
│   └── cancelamentoApi.ts                             # NOVO
├── hooks/
│   ├── usePodeCancelar.ts                             # NOVO
│   └── useCancelarRol.ts                              # NOVO
├── pages/
│   └── CaptacaoDetailPage.tsx                         # MODIFICAR
└── components/
    ├── CancelarRolButton.tsx                          # NOVO
    ├── CancelarRolModal.tsx                           # NOVO
    ├── CancelarRolModal.module.css
    ├── CancelamentoBanner.tsx                         # NOVO
    └── CancelamentoBanner.module.css
```

---

## Tipos TypeScript

```typescript
// types/cancelamento.ts

export type OpcaoRecriacao = 'COPIAR_EXECUCOES' | 'RECRIAR_VAZIA' | 'APENAS_CANCELAR';

export interface CancelarRolRequest {
  justificativa: string;
  opcaoRecriacao: OpcaoRecriacao;
}

export interface CancelamentoResponse {
  captacaoCanceladaId: string;
  status: 'CANCELADA';
  justificativa: string;
  canceladoEm: string;
  opcaoRecriacao: OpcaoRecriacao;
  novaCaptacaoId: string | null;
  execucoesCopiadas: number | null;
  eventoPublicado: boolean;
}

export interface PodeCancelarResponse {
  captacaoId: string;
  podeCancelar: boolean;
  motivo: string | null;
  distribuicaoProcessada: boolean;
  distribuicaoProcessadaEm: string | null;
}
```

---

## Camada de API

```typescript
// api/cancelamentoApi.ts
import { apiGet, apiPost } from '@shared/services/apiIdentificacaoClient';

export function podeCancelar(captacaoId: string) {
  return apiGet<PodeCancelarResponse>(`/captacoes/${captacaoId}/pode-cancelar`);
}

export function cancelarRol(captacaoId: string, data: CancelarRolRequest) {
  return apiPost<CancelamentoResponse>(`/captacoes/${captacaoId}/cancelar`, data);
}
```

---

## Hooks

```typescript
// usePodeCancelar.ts
export function usePodeCancelar(captacaoId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['podeCancelar', captacaoId],
    queryFn: () => podeCancelar(captacaoId),
    enabled,
    staleTime: 0,
  });
}

// useCancelarRol.ts
export function useCancelarRol() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ captacaoId, data }: { captacaoId: string; data: CancelarRolRequest }) =>
      cancelarRol(captacaoId, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['captacoes'] });
      queryClient.invalidateQueries({ queryKey: ['pendentes'] });

      if (result.novaCaptacaoId) {
        // Redirecionar para nova captação
        navigate(`/identificacao/captacoes/${result.novaCaptacaoId}`);
      } else {
        // Voltar para listagem
        navigate('/identificacao/captacoes');
      }
    },
  });
}
```

---

## Design de Componentes

### CancelarRolButton.tsx

**Props:**
```typescript
interface CancelarRolButtonProps {
  captacaoId: string;
  onClick: () => void;
}
```

Consulta `usePodeCancelar(captacaoId, captacao.status === 'FECHADA')` para habilitar/desabilitar. Se `podeCancelar = false`, botão desabilitado com tooltip do `motivo`.

Visível somente se `isOwner && captacao.status === 'FECHADA'`.

### CancelarRolModal.tsx

**Props:**
```typescript
interface CancelarRolModalProps {
  captacaoId: string;
  isOpen: boolean;
  onClose: () => void;
}
```

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Cancelar Rol                                 │
├─────────────────────────────────────────────┤
│ Justificativa *                              │
│ ┌─────────────────────────────────────────┐ │
│ │ (textarea, min 10 chars)                │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ Após cancelar:                               │
│ ○ Recriar com execuções copiadas            │
│   Nova captação com todas as execuções       │
│   (status recalculado)                       │
│ ○ Recriar vazia                             │
│   Nova captação para mesma rubrica+período   │
│ ○ Apenas cancelar                           │
│   Nenhuma nova captação criada               │
│                                              │
│         [Voltar]  [Cancelar Rol] (danger)    │
└─────────────────────────────────────────────┘
```

**Validação:**
- Justificativa min 10 chars
- Opção de recriação selecionada (default: COPIAR_EXECUCOES)

**Tratamento de sucesso:**
```typescript
async function handleConfirm() {
  const result = await cancelarMutation.mutateAsync({
    captacaoId,
    data: { justificativa, opcaoRecriacao }
  });

  if (result.opcaoRecriacao === 'APENAS_CANCELAR') {
    showToast('Rol cancelado com sucesso', 'success');
  } else {
    showToast(
      `Rol cancelado. Nova captação criada${result.execucoesCopiadas ? ` com ${result.execucoesCopiadas} execuções` : ''}`,
      'success'
    );
  }
  onClose();
  // Navegação já tratada no hook
}
```

**Tratamento de erros:**

| code | Ação |
|------|------|
| `STATUS_INVALIDO` | Toast: "Captação não está mais FECHADA" |
| `DISTRIBUICAO_PROCESSADA` | Toast: "Rol já processado pela Distribuição" |
| `FORBIDDEN` | Toast: "Apenas o analista responsável pode cancelar" |

### CancelamentoBanner.tsx

**Props:**
```typescript
interface CancelamentoBannerProps {
  justificativa: string;
  canceladoEm: string;
}
```

Banner vermelho claro no topo da CaptacaoDetailPage para captações CANCELADAS:

```
┌─────────────────────────────────────────────┐
│ ❌ Captação cancelada em 16/01/2026 09:00    │
│ Motivo: Execuções com tipo de utilização     │
│ incorreto (BK em vez de TA)                 │
└─────────────────────────────────────────────┘
```

---

## Integração com CaptacaoDetailPage

```tsx
// CaptacaoDetailPage.tsx — no header:
{isOwner && captacao.status === 'FECHADA' && (
  <>
    <FecharRolButton ... />  {/* Já implementado em F05 — remover daqui se FECHADA */}
    <CancelarRolButton
      captacaoId={captacao.id}
      onClick={() => setShowCancelarModal(true)}
    />
  </>
)}

// Banner para CANCELADA:
{captacao.status === 'CANCELADA' && captacao.justificativaCancelamento && (
  <CancelamentoBanner
    justificativa={captacao.justificativaCancelamento}
    canceladoEm={captacao.canceladoEm!}
  />
)}

// Modal:
<CancelarRolModal
  captacaoId={captacao.id}
  isOpen={showCancelarModal}
  onClose={() => setShowCancelarModal(false)}
/>
```

**Nota sobre tipos da Captação:** A interface `Captacao` (F01) precisa dos novos campos:
```typescript
// Adicionar ao tipo Captacao (captacao.ts):
distribuicaoProcessada: boolean;
distribuicaoProcessadaEm: string | null;
justificativaCancelamento: string | null;
canceladoEm: string | null;
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `frontend/src/features/identificacao/captacoes/types/cancelamento.ts` | Types | Request, Response, OpcaoRecriacao |
| `frontend/src/features/identificacao/captacoes/api/cancelamentoApi.ts` | API | podeCancelar, cancelarRol |
| `frontend/src/features/identificacao/captacoes/hooks/usePodeCancelar.ts` | Hook | Verificação prévia |
| `frontend/src/features/identificacao/captacoes/hooks/useCancelarRol.ts` | Hook | Mutation com navegação |
| `frontend/src/features/identificacao/captacoes/components/CancelarRolButton.tsx` | Component | Botão danger com verificação |
| `frontend/src/features/identificacao/captacoes/components/CancelarRolModal.tsx` | Component | Justificativa + radio buttons |
| `frontend/src/features/identificacao/captacoes/components/CancelarRolModal.module.css` | Style | |
| `frontend/src/features/identificacao/captacoes/components/CancelamentoBanner.tsx` | Component | Banner vermelho |
| `frontend/src/features/identificacao/captacoes/components/CancelamentoBanner.module.css` | Style | |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `frontend/src/features/identificacao/captacoes/pages/CaptacaoDetailPage.tsx` | Adicionar CancelarRolButton + Modal + CancelamentoBanner |
| `frontend/src/features/identificacao/captacoes/types/captacao.ts` | Adicionar campos distribuicaoProcessada, justificativaCancelamento, canceladoEm |

### Arquivos de Referência

| Caminho | Motivo |
|---------|--------|
| `frontend/src/features/identificacao/captacoes/components/FecharRolModal.tsx` | Padrão de modal de ação (F05) |
| `frontend/src/shared/components/ui/modal/Modal.tsx` | Base do modal |

---

## Sequenciamento

| # | Etapa | Dependência |
|---|-------|-------------|
| 1 | Stitch mockups (5 telas) | Nenhuma |
| 2 | types/cancelamento.ts + update captacao.ts | api-contract |
| 3 | api/cancelamentoApi.ts + hooks | Etapa 2 |
| 4 | CancelarRolButton + CancelarRolModal + CancelamentoBanner | Etapa 3 + mockups |
| 5 | Integração CaptacaoDetailPage | Etapa 4 |

---

*TechSpec Frontend gerada com a skill `flow-techspec-creator`.*
