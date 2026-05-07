# API Contract — F06: Participação Conexa Automática

> **Contrato gerado a partir do PRD:** `tasks/prd-participacao-conexa/prd.md`
> **Spec OpenAPI:** `tasks/prd-participacao-conexa/api-contract.yaml`
> **Data:** 2026-04-01

---

## Resumo de Endpoints

| Método | Path | Descrição | Auth | Status |
|--------|------|-----------|------|--------|
| `GET` | `/api/v1/fonogramas/{id}/participacoes` | Listar participações + soma | JWT (futuro) | `200` |
| `POST` | `/api/v1/fonogramas/{id}/participacoes` | Adicionar participante (sem %) | JWT (futuro) | `201` / `409` |
| `PUT` | `.../participacoes/{pid}` | Ajustar percentual (intérprete/produtor) | JWT (futuro) | `200` / `422` / `409` |
| `DELETE` | `.../participacoes/{pid}` | Remover participante | JWT (futuro) | `200` / `409` |
| `POST` | `.../participacoes/calcular` | Calcular percentuais automáticos | JWT (futuro) | `200` / `422` / `409` |

---

## Endpoints Detalhados

### GET /fonogramas/{id}/participacoes

**Response (200) — percentuais calculados:**
```json
{
  "fonogramaId": "b1c2d3e4-...",
  "participacoes": [
    {
      "id": "aaa-...",
      "titular": { "id": "f47-...", "nome": "Djavan", "tipo": "PF", "documentoFormatado": "123.456.789-09" },
      "categoria": "INTERPRETE",
      "percentual": 43.7000,
      "editavel": true
    },
    {
      "id": "bbb-...",
      "titular": { "id": "c83-...", "nome": "EMI Records", "tipo": "PJ", "documentoFormatado": "12.345.678/0001-90" },
      "categoria": "PRODUTOR_FONOGRAFICO",
      "percentual": 41.7000,
      "editavel": true
    },
    {
      "id": "ccc-...",
      "titular": { "id": "d94-...", "nome": "Tasso Gomes", "tipo": "PF", "documentoFormatado": "987.654.321-00" },
      "categoria": "MUSICO_EXECUTANTE",
      "percentual": 14.6000,
      "editavel": false
    }
  ],
  "somaPercentual": 100.0000,
  "somaCalculada": true,
  "percentuaisDesatualizados": false
}
```

**Response (200) — percentuais não calculados:**
```json
{
  "fonogramaId": "b1c2d3e4-...",
  "participacoes": [
    { "id": "aaa-...", "titular": {...}, "categoria": "INTERPRETE", "percentual": null, "editavel": true },
    { "id": "bbb-...", "titular": {...}, "categoria": "PRODUTOR_FONOGRAFICO", "percentual": null, "editavel": true }
  ],
  "somaPercentual": null,
  "somaCalculada": false,
  "percentuaisDesatualizados": false
}
```

---

### POST /fonogramas/{id}/participacoes

**Request:**
```json
{
  "titularId": "f47ac10b-...",
  "categoria": "INTERPRETE"
}
```

**Response (201):** ParticipacoesResponse com novo participante (sem percentual se não calculado).

> **Nota:** Percentual NÃO é informado na adição. Será definido via POST /calcular.

---

### POST /fonogramas/{id}/participacoes/calcular

**Request:** Sem body — calcula a partir da composição atual.

**Response (200):**
```json
{
  "fonogramaId": "...",
  "participacoes": [
    { "categoria": "INTERPRETE", "percentual": 21.8500, "editavel": true },
    { "categoria": "INTERPRETE", "percentual": 21.8500, "editavel": true },
    { "categoria": "PRODUTOR_FONOGRAFICO", "percentual": 41.7000, "editavel": true },
    { "categoria": "MUSICO_EXECUTANTE", "percentual": 7.3000, "editavel": false },
    { "categoria": "MUSICO_EXECUTANTE", "percentual": 7.3000, "editavel": false }
  ],
  "somaPercentual": 100.0000,
  "somaCalculada": true,
  "percentuaisDesatualizados": false
}
```

**Response (422 — composição incompleta):**
```json
{
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "Fonograma deve ter ao menos 1 Intérprete e 1 Produtor Fonográfico para calcular percentuais"
}
```

---

### PUT /fonogramas/{id}/participacoes/{pid}

**Propósito:** Ajuste manual do percentual de Intérprete ou Produtor. Músico retorna 422.

**Request:**
```json
{ "percentual": 30.0000 }
```

**Response (422 — músico):**
```json
{
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "Percentual de Músico Executante não pode ser editado manualmente — é sempre igualitário"
}
```

---

### DELETE /fonogramas/{id}/participacoes/{pid}

**Response (200):** ParticipacoesResponse atualizado (com `percentuaisDesatualizados: true` se havia cálculo).

---

## Schemas Principais

### ParticipacoesResponse

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `fonogramaId` | `uuid` | ID do fonograma |
| `participacoes` | `ParticipacaoItem[]` | Lista de vínculos |
| `somaPercentual` | `decimal?` | Soma (null se não calculados) |
| `somaCalculada` | `boolean` | true se percentuais existem |
| `percentuaisDesatualizados` | `boolean` | true se composição mudou após cálculo |

### ParticipacaoItem

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | `uuid` | ID do vínculo |
| `titular` | `TitularResumo` | Dados do titular |
| `categoria` | `enum` | INTERPRETE, PRODUTOR_FONOGRAFICO, MUSICO_EXECUTANTE |
| `percentual` | `decimal?` | 4 casas (null se não calculado) |
| `editavel` | `boolean` | true para Intérprete/Produtor, false para Músico |

---

## Códigos de Erro

| Status | Code | Quando |
|--------|------|--------|
| `400` | — | Campos obrigatórios ausentes |
| `404` | — | Fonograma ou participação não encontrada |
| `409` | `DEPURACAO_NECESSARIA` | Qualquer operação em fonograma LIBERADO |
| `409` | — | Titular + categoria duplicado |
| `422` | — | Composição incompleta para calcular, editar músico, titular não encontrado |
| `500` | — | Erro inesperado |

---

## Premissas e Decisões

| Decisão | Justificativa |
|---------|---------------|
| POST /participacoes sem percentual | Percentual vem do cálculo, não da adição individual |
| POST /calcular sem body | Calcula a partir da composição existente no banco |
| `percentual: null` antes do cálculo | Frontend exibe "—" em vez de 0 |
| `percentuaisDesatualizados` no response | Frontend mostra badge "desatualizado" sem lógica local |
| `editavel` por item | Frontend sabe qual campo habilitar sem inferir pela categoria |
| PUT retorna ParticipacoesResponse completo | Soma recalculada (validação de fatia = 100%) |
| DELETE retorna 200 com body | Mesmo padrão de F04 — frontend atualiza sem GET extra |
| Músico retorna 422 no PUT | Explicita a regra em vez de silenciosamente ignorar |

---

*Contrato gerado com a skill `flow-contract-creator`. Mock server: `npx @stoplight/prism-cli mock api-contract.yaml`*
