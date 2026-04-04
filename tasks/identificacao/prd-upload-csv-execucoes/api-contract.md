# API Contract — F03: Upload de Execuções via CSV

> **Gerado a partir de:** `tasks/prd-upload-csv-execucoes/prd.md`
> **Data:** 2026-04-03
> **Status:** Rascunho
> **Versão do contrato:** 1.0.0

---

## Premissas e Decisões

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Sub-recurso | `/captacoes/{captacaoId}/uploads` | Uploads pertencem a uma captação |
| Upload | `multipart/form-data` | Padrão para envio de arquivos |
| Response do POST | `202 Accepted` (não 201) | Processamento assíncrono — recurso ainda não está pronto |
| Polling | GET no upload individual | Frontend consulta status a cada 5s |
| Erros | Sub-recurso `/uploads/{id}/erros` | Separado do upload para paginação independente |
| TTL dos erros | 30 dias | Evitar acúmulo de dados no banco |

---

## Resumo de Endpoints

| Método | Path | Descrição | Auth | Status Possíveis |
|--------|------|-----------|------|-----------------|
| `GET` | `/api/v1/captacoes/{captacaoId}/uploads` | Listar uploads | read | 200, 401, 404, 500 |
| `POST` | `/api/v1/captacoes/{captacaoId}/uploads` | Upload CSV | write | 202, 400, 401, 403, 404, 422, 500 |
| `GET` | `/api/v1/captacoes/{captacaoId}/uploads/{id}` | Status do upload | read | 200, 401, 404, 500 |
| `GET` | `/api/v1/captacoes/{captacaoId}/uploads/{id}/erros` | Relatório de erros | read | 200, 401, 404, 500 |

---

## Endpoints Detalhados

### `POST /api/v1/captacoes/{captacaoId}/uploads` — Upload CSV

**Propósito:** Enviar arquivo CSV para processamento assíncrono.
**Consumido por:** Frontend — botão "Importar CSV" na CaptacaoDetailPage

#### Request (multipart/form-data)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `arquivo` | binary | Arquivo CSV (UTF-8, separador `;`, max 10.000 linhas) |

#### Response 202

```json
{
  "id": "u1a2b3c4-5678-90ab-cdef-123456789012",
  "captacaoId": "c1d2e3f4-5678-90ab-cdef-123456789012",
  "nomeArquivo": "execucoes_tv_aberta_20260115.csv",
  "status": "PROCESSANDO",
  "totalLinhas": null,
  "execucoesCriadas": null,
  "totalErros": null,
  "mensagemErro": null,
  "criadoEm": "2026-01-15T16:00:00Z",
  "processadoEm": null
}
```

#### Erros Possíveis

| HTTP | code | Quando ocorre |
|------|------|---------------|
| 400 | `FORMATO_INVALIDO` | Arquivo não é .csv |
| 400 | `ARQUIVO_VAZIO` | Arquivo vazio ou sem header |
| 403 | `FORBIDDEN` | Não é o dono da captação |
| 404 | `NOT_FOUND` | Captação não encontrada |
| 422 | `STATUS_INVALIDO` | Captação não está ABERTA |

---

### `GET /api/v1/captacoes/{captacaoId}/uploads` — Listar uploads

**Propósito:** Seção "Uploads" na CaptacaoDetailPage com status de cada importação.
**Consumido por:** Frontend — tabela de uploads com polling

#### Response 200

```json
{
  "data": [
    {
      "id": "u1a2b3c4-5678-90ab-cdef-123456789012",
      "captacaoId": "c1d2e3f4-5678-90ab-cdef-123456789012",
      "nomeArquivo": "execucoes_tv_aberta_20260115.csv",
      "status": "CONCLUIDO_COM_ERROS",
      "totalLinhas": 1500,
      "execucoesCriadas": 1420,
      "totalErros": 80,
      "mensagemErro": null,
      "criadoEm": "2026-01-15T16:00:00Z",
      "processadoEm": "2026-01-15T16:02:35Z"
    },
    {
      "id": "u2b3c4d5-6789-0abc-def1-234567890123",
      "captacaoId": "c1d2e3f4-5678-90ab-cdef-123456789012",
      "nomeArquivo": "execucoes_radio_20260115.csv",
      "status": "CONCLUIDO",
      "totalLinhas": 500,
      "execucoesCriadas": 480,
      "totalErros": 0,
      "mensagemErro": null,
      "criadoEm": "2026-01-15T15:30:00Z",
      "processadoEm": "2026-01-15T15:30:45Z"
    }
  ],
  "pagination": {
    "page": 1,
    "size": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

---

### `GET /api/v1/captacoes/{captacaoId}/uploads/{id}` — Status do upload

**Propósito:** Polling individual para acompanhar processamento em andamento.
**Consumido por:** Frontend — polling a cada 5s enquanto `status === "PROCESSANDO"`

#### Response 200

Mesmo schema de `UploadResponse`. Campos `totalLinhas`, `execucoesCriadas` e `totalErros` são `null` enquanto `status === "PROCESSANDO"`.

---

### `GET /api/v1/captacoes/{captacaoId}/uploads/{id}/erros` — Relatório de erros

**Propósito:** Detalhamento dos erros por linha/coluna para o analista corrigir o CSV.
**Consumido por:** Frontend — tabela expandível ao clicar no upload com erros

#### Query Parameters

| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| `page` | integer | 1 | Página |
| `size` | integer | 50 | Itens por página (max 100) |

#### Response 200

```json
{
  "data": [
    { "linha": 5, "coluna": "tipo_utilizacao", "mensagem": "Obrigatório para a rubrica TV Aberta" },
    { "linha": 12, "coluna": "inicio", "mensagem": "Formato de hora inválido. Esperado HH:mm:ss" },
    { "linha": 20, "coluna": "isrc", "mensagem": "ISRC BRUM71500001 já registrado com horário diferente (linha 5)" },
    { "linha": 33, "coluna": "isrc/iswc", "mensagem": "Ao menos um identificador (ISRC ou ISWC) é obrigatório" },
    { "linha": 45, "coluna": "tipo_utilizacao", "mensagem": "ISRC BRUM71500002 na linha 45 tem tipo de utilização divergente da linha 38" }
  ],
  "pagination": {
    "page": 1,
    "size": 50,
    "total": 80,
    "totalPages": 2
  }
}
```

---

## Schemas de Entidades

### Upload

| Campo | Tipo | Obrigatório | Nullable | Descrição |
|-------|------|-------------|----------|-----------|
| `id` | UUID | Sim | Não | Identificador único |
| `captacaoId` | UUID | Sim | Não | Captação associada |
| `nomeArquivo` | string | Sim | Não | Nome original do arquivo |
| `status` | enum | Sim | Não | `PROCESSANDO`, `CONCLUIDO`, `CONCLUIDO_COM_ERROS`, `ERRO` |
| `totalLinhas` | integer | Não | Sim | Preenchido após leitura do CSV |
| `execucoesCriadas` | integer | Não | Sim | Após processamento |
| `totalErros` | integer | Não | Sim | Após processamento |
| `mensagemErro` | string | Não | Sim | Erro global (quando status=ERRO) |
| `criadoEm` | datetime | Sim | Não | Data do upload |
| `processadoEm` | datetime | Não | Sim | Data de conclusão |

### Erro de Upload

| Campo | Tipo | Obrigatório | Nullable | Descrição |
|-------|------|-------------|----------|-----------|
| `linha` | integer | Sim | Não | Número da linha (1-indexed, exclui header) |
| `coluna` | string | Sim | Não | Nome da coluna com erro |
| `mensagem` | string | Sim | Não | Descrição do erro |

---

## Códigos de Erro

| HTTP | code | Descrição |
|------|------|-----------|
| 400 | `FORMATO_INVALIDO` | Arquivo não é .csv |
| 400 | `ARQUIVO_VAZIO` | Arquivo vazio ou sem header válido |
| 401 | `UNAUTHORIZED` | Token ausente ou expirado |
| 403 | `FORBIDDEN` | Não é o dono da captação |
| 404 | `NOT_FOUND` | Captação ou upload não encontrado |
| 422 | `STATUS_INVALIDO` | Captação não está ABERTA |
| 500 | `INTERNAL_ERROR` | Erro interno |

---

## Questões em Aberto

Todas resolvidas. Contrato pronto para implementação.

---

*Contrato gerado com a skill `flow-contract-creator`. Próximos passos: gerar TechSpec Backend e TechSpec Frontend referenciando este contrato.*
