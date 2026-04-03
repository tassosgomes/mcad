# Especificação Técnica Frontend — F03: Upload de Execuções via CSV

> **PRD:** `tasks/prd-upload-csv-execucoes/prd.md`
> **API Contract:** `tasks/prd-upload-csv-execucoes/api-contract.yaml`
> **TechSpec Backend:** `tasks/prd-upload-csv-execucoes/techspec.md`
> **Domínio:** Identificação (D02)
> **Última revisão:** 2026-04-03

---

## Resumo Executivo

Esta feature adiciona duas seções à `CaptacaoDetailPage`: botão "Importar CSV" com upload multipart e seção "Uploads" com tabela de status + relatório de erros expandível. O principal desafio de UX é o processamento assíncrono — o frontend faz polling a cada 5s enquanto o upload está sendo processado, com feedback visual claro (spinner, contadores progressivos, badge de status).

Nenhuma página nova é criada. Todos os componentes são integrados na tela de detalhe existente.

---

## Stitch — Mockup Obrigatório

| Campo | Valor |
|-------|-------|
| **Projeto** | mcad |
| **ID** | `533156784329699726` |

**Telas a desenhar:**

| # | Tela | Descrição |
|---|------|-----------|
| 1 | Seção "Uploads" na CaptacaoDetailPage | Tabela: arquivo, status (badge), linhas, criadas, erros, data. Botão "Importar CSV". Badge PROCESSANDO com spinner |
| 2 | Relatório de erros expandido | Tabela: Linha, Coluna, Erro. Paginação. Acessível ao clicar em upload COM_ERROS |
| 3 | Estado de upload em progresso | Botão "Importar CSV" + indicador de upload em andamento |

---

## Arquitetura do Módulo

### Estrutura de Pastas (incremental)

```
frontend/src/features/identificacao/captacoes/
├── types/
│   ├── captacao.ts                                    # (F01)
│   ├── execucao.ts                                    # (F02)
│   └── upload.ts                                      # NOVO
├── api/
│   ├── captacoesApi.ts                                # (F01)
│   ├── execucoesApi.ts                                # (F02)
│   ├── buscaCadastroApi.ts                            # (F02)
│   └── uploadsApi.ts                                  # NOVO
├── hooks/
│   ├── ... (hooks F01/F02)
│   ├── useUploads.ts                                  # NOVO
│   ├── useUpload.ts                                   # NOVO (polling)
│   ├── useUploadCsv.ts                                # NOVO (mutation multipart)
│   └── useErrosUpload.ts                              # NOVO
├── pages/
│   └── CaptacaoDetailPage.tsx                         # MODIFICAR
└── components/
    ├── ... (componentes F01/F02)
    ├── UploadsSection.tsx                              # NOVO
    ├── UploadsSection.module.css
    ├── UploadsTable.tsx                                # NOVO
    ├── UploadsTable.module.css
    ├── UploadCsvButton.tsx                             # NOVO
    ├── UploadCsvButton.module.css
    ├── ErrosUploadPanel.tsx                            # NOVO
    └── ErrosUploadPanel.module.css
```

---

## Tipos TypeScript

```typescript
// types/upload.ts

export type StatusUpload = 'PROCESSANDO' | 'CONCLUIDO' | 'CONCLUIDO_COM_ERROS' | 'ERRO';

export interface Upload {
  id: string;
  captacaoId: string;
  nomeArquivo: string;
  status: StatusUpload;
  totalLinhas: number | null;
  execucoesCriadas: number | null;
  totalErros: number | null;
  mensagemErro: string | null;
  criadoEm: string;
  processadoEm: string | null;
}

export interface ErroUpload {
  linha: number;
  coluna: string;
  mensagem: string;
}

export interface UploadListResponse {
  data: Upload[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}

export interface ErroUploadListResponse {
  data: ErroUpload[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}
```

---

## Camada de API

```typescript
// api/uploadsApi.ts
import { apiGet } from '@shared/services/apiIdentificacaoClient';

const base = (captacaoId: string) => `/captacoes/${captacaoId}/uploads`;

export function getUploads(captacaoId: string, page = 1, size = 20) {
  return apiGet<UploadListResponse>(`${base(captacaoId)}?page=${page}&size=${size}`);
}

export function getUploadById(captacaoId: string, id: string) {
  return apiGet<Upload>(`${base(captacaoId)}/${id}`);
}

export function getErrosUpload(captacaoId: string, id: string, page = 1, size = 50) {
  return apiGet<ErroUploadListResponse>(`${base(captacaoId)}/${id}/erros?page=${page}&size=${size}`);
}

export async function uploadCsv(captacaoId: string, arquivo: File): Promise<Upload> {
  const formData = new FormData();
  formData.append('arquivo', arquivo);

  // Upload multipart não usa apiPost (que envia JSON)
  const BASE_URL = import.meta.env.VITE_IDENTIFICACAO_API_BASE_URL || 'http://localhost:5100/api/v1';
  const token = getAuthToken?.();

  const response = await fetch(`${BASE_URL}${base(captacaoId)}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => ({ detail: 'Erro ao fazer upload' }));
    throw problem;
  }

  return response.json();
}
```

**Nota:** O `uploadCsv` usa `fetch` direto (não `apiPost`) porque o `Content-Type` é `multipart/form-data` (gerenciado automaticamente pelo browser com boundary), não `application/json`.

---

## Hooks React Query

### useUploads — Lista de uploads

```typescript
export function useUploads(captacaoId: string, page = 1) {
  return useQuery({
    queryKey: ['uploads', captacaoId, page],
    queryFn: () => getUploads(captacaoId, page),
    enabled: !!captacaoId,
  });
}
```

### useUpload — Polling individual

```typescript
export function useUpload(captacaoId: string, uploadId: string | null) {
  return useQuery({
    queryKey: ['uploads', captacaoId, uploadId],
    queryFn: () => getUploadById(captacaoId, uploadId!),
    enabled: !!uploadId,
    refetchInterval: (query) => {
      // Polling a cada 5s enquanto PROCESSANDO
      const data = query.state.data;
      return data?.status === 'PROCESSANDO' ? 5000 : false;
    },
  });
}
```

### useUploadCsv — Mutation multipart

```typescript
export function useUploadCsv(captacaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (arquivo: File) => uploadCsv(captacaoId, arquivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploads', captacaoId] });
    },
  });
}
```

### useErrosUpload — Erros paginados

```typescript
export function useErrosUpload(captacaoId: string, uploadId: string | null, page = 1) {
  return useQuery({
    queryKey: ['errosUpload', captacaoId, uploadId, page],
    queryFn: () => getErrosUpload(captacaoId, uploadId!, page, 50),
    enabled: !!uploadId,
  });
}
```

---

## Design de Componentes

### UploadsSection.tsx — Wrapper

**Props:**
```typescript
interface UploadsSectionProps {
  captacaoId: string;
  captacaoAberta: boolean;
  isOwner: boolean;
}
```

**Responsabilidades:**
- Gerencia estado de uploads (lista + upload ativo com polling)
- Gerencia painel de erros expandido
- Contém `UploadCsvButton`, `UploadsTable` e `ErrosUploadPanel`

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Uploads CSV               [Importar CSV ↑]  │
├─────────────────────────────────────────────┤
│ [UploadsTable]                               │
│  Arquivo | Status | Linhas | Criadas | Erros │
│  exec_tv_20260115.csv | ⏳ PROCESSANDO | ...│
│  exec_radio_20260115.csv | ✅ CONCLUIDO | ...│
├─────────────────────────────────────────────┤
│ [ErrosUploadPanel] (expandido ao clicar)    │
│  Linha | Coluna | Erro                       │
│  42    | tipo_utilizacao | Obrigatório...    │
└─────────────────────────────────────────────┘
```

Botão "Importar CSV" visível somente se `isOwner && captacaoAberta`.

### UploadsTable.tsx — Tabela

**Colunas:**

| Coluna | Campo | Formatação |
|--------|-------|------------|
| Arquivo | `nomeArquivo` | Texto truncado |
| Status | `status` | Badge: PROCESSANDO=spinner+accent, CONCLUIDO=success, COM_ERROS=warning, ERRO=error |
| Linhas | `totalLinhas` | Número ou `—` se null |
| Criadas | `execucoesCriadas` | Número ou `—` |
| Erros | `totalErros` | Número com link clicável se > 0 |
| Data | `criadoEm` | `dd/MM/yyyy HH:mm` |

**Ações:**
- Linha clicável quando `totalErros > 0` → expande `ErrosUploadPanel`
- Status PROCESSANDO → polling visual (spinner ao lado do badge)

### UploadCsvButton.tsx — Input file + upload

```typescript
interface UploadCsvButtonProps {
  captacaoId: string;
  disabled: boolean;
  onUploadStarted: (upload: Upload) => void;
}
```

**Fluxo:**
1. `<input type="file" accept=".csv">` hidden, trigger via botão
2. Ao selecionar arquivo → `useUploadCsv.mutateAsync(file)`
3. Sucesso (202) → chama `onUploadStarted(upload)` → inicia polling
4. Erro → toast com mensagem

**Validação client-side:**
- Extensão `.csv` (via `accept` + verificação JS)
- Arquivo não vazio

### ErrosUploadPanel.tsx — Relatório expandível

**Props:**
```typescript
interface ErrosUploadPanelProps {
  captacaoId: string;
  uploadId: string;
  isOpen: boolean;
  onClose: () => void;
}
```

**Comportamento:**
- Painel collapsible abaixo da tabela de uploads (ou modal)
- Usa `useErrosUpload(captacaoId, uploadId, page)`
- Tabela: Linha | Coluna | Erro
- Paginação (size=50)
- Header: "Erros do upload {nomeArquivo} — {totalErros} erros encontrados"

---

## Integração com CaptacaoDetailPage

```tsx
// CaptacaoDetailPage.tsx — adicionar após ExecucoesSection:
<UploadsSection
  captacaoId={captacao.id}
  captacaoAberta={captacao.status === 'ABERTA'}
  isOwner={canWrite && captacao.analistaResponsavel.id === userId}
/>
```

**Layout atualizado:**
```
┌─────────────────────────────────────────┐
│ Dados da Captação (F01)                  │
├─────────────────────────────────────────┤
│ Resumo: Total | Identificadas | Pendentes│
├─────────────────────────────────────────┤
│ Execuções (F02) — tabela + formulário   │
├─────────────────────────────────────────┤
│ Uploads CSV (F03) — tabela + importar   │  ← NOVO
└─────────────────────────────────────────┘
```

**Invalidação de cache:** Quando um upload muda de PROCESSANDO → CONCLUIDO, invalidar:
- `['uploads', captacaoId]` — lista de uploads
- `['execucoes', captacaoId]` — novas execuções foram criadas
- `['captacoes', captacaoId]` — contadores de resumo

Isso é feito no `useUpload` hook via `onSuccess` do `refetchInterval`:

```typescript
refetchInterval: (query) => {
  const prev = query.state.data;
  const current = query.state.data;
  // Quando transitar de PROCESSANDO para outro status:
  if (prev?.status === 'PROCESSANDO' && current?.status !== 'PROCESSANDO') {
    queryClient.invalidateQueries({ queryKey: ['execucoes', captacaoId] });
    queryClient.invalidateQueries({ queryKey: ['captacoes', captacaoId] });
  }
  return current?.status === 'PROCESSANDO' ? 5000 : false;
},
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `frontend/src/features/identificacao/captacoes/types/upload.ts` | Types | Upload, ErroUpload, StatusUpload, responses |
| `frontend/src/features/identificacao/captacoes/api/uploadsApi.ts` | API | getUploads, getUploadById, getErrosUpload, uploadCsv (multipart) |
| `frontend/src/features/identificacao/captacoes/hooks/useUploads.ts` | Hook | Lista de uploads |
| `frontend/src/features/identificacao/captacoes/hooks/useUpload.ts` | Hook | Polling individual (refetchInterval) |
| `frontend/src/features/identificacao/captacoes/hooks/useUploadCsv.ts` | Hook | Mutation multipart |
| `frontend/src/features/identificacao/captacoes/hooks/useErrosUpload.ts` | Hook | Erros paginados |
| `frontend/src/features/identificacao/captacoes/components/UploadsSection.tsx` | Component | Wrapper/orquestrador |
| `frontend/src/features/identificacao/captacoes/components/UploadsSection.module.css` | Style | |
| `frontend/src/features/identificacao/captacoes/components/UploadsTable.tsx` | Component | Tabela com badges de status |
| `frontend/src/features/identificacao/captacoes/components/UploadsTable.module.css` | Style | |
| `frontend/src/features/identificacao/captacoes/components/UploadCsvButton.tsx` | Component | Input file + upload |
| `frontend/src/features/identificacao/captacoes/components/UploadCsvButton.module.css` | Style | |
| `frontend/src/features/identificacao/captacoes/components/ErrosUploadPanel.tsx` | Component | Relatório expandível |
| `frontend/src/features/identificacao/captacoes/components/ErrosUploadPanel.module.css` | Style | |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `frontend/src/features/identificacao/captacoes/pages/CaptacaoDetailPage.tsx` | Adicionar `<UploadsSection>` após ExecucoesSection |

### Arquivos de Referência

| Caminho | Motivo |
|---------|--------|
| `frontend/src/features/identificacao/captacoes/components/ExecucoesSection.tsx` | Padrão de seção na detail page |
| `frontend/src/shared/components/ui/badge/Badge.tsx` | Badges de status |
| `frontend/src/shared/components/ui/pagination/Pagination.tsx` | Paginação dos erros |
| `frontend/src/shared/services/apiIdentificacaoClient.ts` | Base URL para fetch multipart |

---

## Sequenciamento

| # | Etapa | Dependência |
|---|-------|-------------|
| 1 | Stitch mockups (3 telas) | Nenhuma |
| 2 | types/upload.ts | api-contract |
| 3 | api/uploadsApi.ts | Etapa 2 |
| 4 | hooks (4 hooks) | Etapa 3 |
| 5 | UploadCsvButton + UploadsTable + ErrosUploadPanel | Etapa 4 + mockups |
| 6 | UploadsSection | Etapa 5 |
| 7 | CaptacaoDetailPage integration | Etapa 6 |

---

*TechSpec Frontend gerada com a skill `flow-techspec-creator`. Para gerar tasks, use a skill `flow-task-creator`.*
