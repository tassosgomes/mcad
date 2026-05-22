# API Contract — F06: Ajustes por Estorno

> **Contrato gerado a partir do PRD:** `tasks/distribuicao/prd-ajustes-estorno/prd.md`
> **Spec OpenAPI:** `tasks/distribuicao/prd-ajustes-estorno/api-contract.yaml`
> **Data:** 2026-05-20

---

## Resumo de Endpoints

| Método | Path | Descrição | Auth | Roles |
|--------|------|-----------|------|-------|
| `GET` | `/api/v1/ajustes-estorno` | Listar ajustes por estorno com filtros e paginação | JWT | Analista, Consultor |
| `GET` | `/api/v1/ajustes-estorno/{id}` | Detalhar ajuste, payload original, processos e histórico | JWT | Analista, Consultor |
| `GET` | `/api/v1/processos/{id}/calculo` | Consultar cálculo com totais e linhas de ajustes por estorno | JWT | Analista, Consultor |
| `POST` | `/api/v1/processos/{id}/calcular` | Endpoint existente; passa a prever ajustes elegíveis | JWT | Analista |
| `POST` | `/api/v1/processos/{id}/finalizar` | Endpoint existente; passa a efetivar ajustes previstos | JWT | Analista |
| `POST` | `/api/v1/processos/{id}/cancelar` | Endpoint existente; passa a devolver ajustes previstos para pendência | JWT | Analista |

---

## Endpoints Detalhados

### GET /api/v1/ajustes-estorno

**Propósito:** Lista paginada de ajustes/eventos de estorno registrados na Distribuição.

**Quem consome:** Frontend — tela read-only "Ajustes por Estorno".

**Filtros:** `rubrica` (sigla), `periodoOrigem` (`YYYY-MM`), `status` (múltiplos separados por vírgula) e `pagamentoId`.

**Paginação:** `page`/`size` (padrão: `page=1`, `size=20`, máximo `size=100`).

**Request:**
```http
GET /api/v1/ajustes-estorno?rubrica=RADIO&periodoOrigem=2026-03&status=PENDENTE_APLICACAO,PREVISTO&page=1&size=20 HTTP/1.1
Host: localhost:5004
Accept: application/json
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "4f8f7f3e-5a63-4c8e-97b8-c6f6b595b1dd",
      "eventId": "74f36d49-01f8-4726-a839-621a22954ec0",
      "pagamentoId": "7d1b7a52-64be-4a3b-a0a7-2d54c9a16c02",
      "licencaId": "b9e9b9b8-3434-43dd-bf3d-600698de6b8f",
      "rubrica": { "sigla": "RADIO", "nome": "Rádio AM/FM" },
      "periodoOrigem": "2026-03",
      "valorEstornadoBruto": 1000.00,
      "valorAjusteLiquido": 850.00,
      "valorAplicado": null,
      "status": "PENDENTE_APLICACAO",
      "processoOrigemId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "processoAplicacaoId": null,
      "justificativa": "Pagamento registrado em duplicidade",
      "estornadoPor": "analista.arrecadacao@ecad.org.br",
      "estornadoEm": "2026-05-20T10:00:00Z",
      "recebidoEm": "2026-05-20T10:00:05Z",
      "previstoEm": null,
      "aplicadoEm": null
    }
  ],
  "metadata": {
    "page": 1,
    "size": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

**Response (200 OK — nenhum resultado):**
```json
{
  "items": [],
  "metadata": {
    "page": 1,
    "size": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

---

### GET /api/v1/ajustes-estorno/{id}

**Propósito:** Retorna detalhe operacional do ajuste, incluindo payload original do CloudEvent consumido, processo de origem, processo de aplicação, histórico e linhas financeiras já previstas/aplicadas.

**Quem consome:** Frontend — drawer ou página de detalhe read-only.

**Request:**
```http
GET /api/v1/ajustes-estorno/4f8f7f3e-5a63-4c8e-97b8-c6f6b595b1dd HTTP/1.1
Host: localhost:5004
Accept: application/json
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

**Response (200 OK):**
```json
{
  "id": "4f8f7f3e-5a63-4c8e-97b8-c6f6b595b1dd",
  "eventId": "74f36d49-01f8-4726-a839-621a22954ec0",
  "pagamentoId": "7d1b7a52-64be-4a3b-a0a7-2d54c9a16c02",
  "licencaId": "b9e9b9b8-3434-43dd-bf3d-600698de6b8f",
  "rubrica": { "sigla": "RADIO", "nome": "Rádio AM/FM" },
  "periodoOrigem": "2026-03",
  "valorEstornadoBruto": 1000.00,
  "valorAjusteLiquido": 850.00,
  "valorAplicado": -850.00,
  "status": "PREVISTO",
  "processoOrigemId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "processoAplicacaoId": "d2e3f4a5-6789-4abc-def1-234567890123",
  "justificativa": "Pagamento registrado em duplicidade",
  "estornadoPor": "analista.arrecadacao@ecad.org.br",
  "estornadoEm": "2026-05-20T10:00:00Z",
  "recebidoEm": "2026-05-20T10:00:05Z",
  "previstoEm": "2026-05-20T12:00:00Z",
  "aplicadoEm": null,
  "processoOrigem": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "rubrica": { "sigla": "RADIO", "nome": "Rádio AM/FM" },
    "periodo": "2026-03",
    "status": "FINALIZADO"
  },
  "processoAplicacao": {
    "id": "d2e3f4a5-6789-4abc-def1-234567890123",
    "rubrica": { "sigla": "RADIO", "nome": "Rádio AM/FM" },
    "periodo": "2026-04",
    "status": "CALCULADO"
  },
  "historicoAplicacao": [
    {
      "status": "PENDENTE_APLICACAO",
      "processoId": null,
      "ocorridoEm": "2026-05-20T10:00:05Z",
      "observacao": "Ajuste criado a partir do evento de estorno"
    },
    {
      "status": "PREVISTO",
      "processoId": "d2e3f4a5-6789-4abc-def1-234567890123",
      "ocorridoEm": "2026-05-20T12:00:00Z",
      "observacao": "Selecionado no cálculo do processo RADIO/2026-04"
    }
  ],
  "linhas": [
    {
      "id": "1dbf8f1d-5d68-4db3-bb8f-8cb4c3b54b11",
      "ajusteId": "4f8f7f3e-5a63-4c8e-97b8-c6f6b595b1dd",
      "processoOrigemId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "processoAplicacaoId": "d2e3f4a5-6789-4abc-def1-234567890123",
      "creditoOrigemId": "8a4b2ef8-6d31-4e3e-a671-29b2f654ca60",
      "titularId": "31be2647-01bb-44d0-a9c7-3e086bd16045",
      "titularNome": "Maria Silva",
      "obraId": "17de4c6c-b7d1-4d59-9e65-f71d71048d21",
      "obraTitulo": "Canção Exemplo",
      "fonogramaId": null,
      "categoria": "AUTOR",
      "subcategoriaConexa": null,
      "valorCreditoOrigem": 600.00,
      "valorAjuste": -510.00
    }
  ],
  "payloadOriginal": {
    "specversion": "1.0",
    "id": "74f36d49-01f8-4726-a839-621a22954ec0",
    "source": "urn:arrecadacao-api",
    "type": "arrecadacao.pagamento.estornado",
    "subject": "7d1b7a52-64be-4a3b-a0a7-2d54c9a16c02",
    "time": "2026-05-20T10:00:00Z",
    "datacontenttype": "application/json",
    "data": {
      "pagamentoId": "7d1b7a52-64be-4a3b-a0a7-2d54c9a16c02",
      "licencaId": "b9e9b9b8-3434-43dd-bf3d-600698de6b8f",
      "rubricaSigla": "RADIO",
      "periodo": "2026-03",
      "quantidadeUdas": "10.000000",
      "valorEstornado": "1000.00",
      "justificativa": "Pagamento registrado em duplicidade",
      "estornadoPor": "analista.arrecadacao@ecad.org.br",
      "estornadoEm": "2026-05-20T10:00:00Z"
    }
  }
}
```

**Response (404 Not Found):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.4",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Ajuste de estorno não encontrado",
  "instance": "/api/v1/ajustes-estorno/4f8f7f3e-5a63-4c8e-97b8-c6f6b595b1dd"
}
```

---

### GET /api/v1/processos/{id}/calculo

**Propósito:** Retorna a visão de cálculo do processo com créditos positivos e seção separada de ajustes por estorno previstos/aplicados.

**Quem consome:** Frontend — tela de cálculo do processo de Distribuição.

**Observação:** A F06 adiciona `resumo.totalAjustesEstorno`, `resumo.valorTotalAjustesEstorno` e a seção `ajustesEstorno`. Os créditos positivos do processo atual continuam calculados sobre a verba líquida do processo e não são recalculados por causa do ajuste.

**Request:**
```http
GET /api/v1/processos/d2e3f4a5-6789-4abc-def1-234567890123/calculo HTTP/1.1
Host: localhost:5004
Accept: application/json
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

**Response (200 OK):**
```json
{
  "processoId": "d2e3f4a5-6789-4abc-def1-234567890123",
  "rubrica": { "sigla": "RADIO", "nome": "Rádio AM/FM" },
  "periodo": "2026-04",
  "status": "CALCULADO",
  "resumo": {
    "verbaLiquida": 10000.00,
    "totalCreditos": 120,
    "valorTotalCreditos": 10000.00,
    "totalCreditosRetidos": 3,
    "valorTotalCreditosRetidos": 250.00,
    "totalRetidosLiberados": 2,
    "valorTotalRetidosLiberados": 1250.00,
    "totalAjustesEstorno": 1,
    "valorTotalAjustesEstorno": -850.00,
    "valorLiquidoDemonstravel": 10400.00
  },
  "ajustesEstorno": [
    {
      "ajusteId": "4f8f7f3e-5a63-4c8e-97b8-c6f6b595b1dd",
      "pagamentoId": "7d1b7a52-64be-4a3b-a0a7-2d54c9a16c02",
      "licencaId": "b9e9b9b8-3434-43dd-bf3d-600698de6b8f",
      "periodoOrigem": "2026-03",
      "processoOrigemId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "status": "PREVISTO",
      "justificativa": "Pagamento registrado em duplicidade",
      "valorEstornadoBruto": 1000.00,
      "valorAjusteLiquido": 850.00,
      "valorAplicado": -850.00,
      "totalLinhas": 2,
      "linhas": [
        {
          "id": "1dbf8f1d-5d68-4db3-bb8f-8cb4c3b54b11",
          "creditoOrigemId": "8a4b2ef8-6d31-4e3e-a671-29b2f654ca60",
          "titularId": "31be2647-01bb-44d0-a9c7-3e086bd16045",
          "titularNome": "Maria Silva",
          "obraId": "17de4c6c-b7d1-4d59-9e65-f71d71048d21",
          "obraTitulo": "Canção Exemplo",
          "fonogramaId": null,
          "categoria": "AUTOR",
          "subcategoriaConexa": null,
          "valorCreditoOrigem": 600.00,
          "valorAjuste": -510.00
        },
        {
          "id": "c0215d6f-5878-4769-9bd2-e2d8b8c91f50",
          "creditoOrigemId": "7483a40c-bf1a-42b6-9638-b28bbd630b21",
          "titularId": "fd7d5594-b667-4d7f-9516-4d6a9199b2d4",
          "titularNome": "João Santos",
          "obraId": "17de4c6c-b7d1-4d59-9e65-f71d71048d21",
          "obraTitulo": "Canção Exemplo",
          "fonogramaId": null,
          "categoria": "AUTOR",
          "subcategoriaConexa": null,
          "valorCreditoOrigem": 400.00,
          "valorAjuste": -340.00
        }
      ]
    }
  ]
}
```

**Response (200 OK — sem ajustes):**
```json
{
  "processoId": "d2e3f4a5-6789-4abc-def1-234567890123",
  "rubrica": { "sigla": "RADIO", "nome": "Rádio AM/FM" },
  "periodo": "2026-04",
  "status": "CALCULADO",
  "resumo": {
    "verbaLiquida": 10000.00,
    "totalCreditos": 120,
    "valorTotalCreditos": 10000.00,
    "totalCreditosRetidos": 0,
    "valorTotalCreditosRetidos": 0.00,
    "totalRetidosLiberados": 0,
    "valorTotalRetidosLiberados": 0.00,
    "totalAjustesEstorno": 0,
    "valorTotalAjustesEstorno": 0.00,
    "valorLiquidoDemonstravel": 10000.00
  },
  "ajustesEstorno": []
}
```

---

## Endpoints Existentes Impactados

### POST /api/v1/processos/{id}/calcular

Ao calcular um processo `CRIADO`, o backend deve selecionar ajustes `PENDENTE_APLICACAO` elegíveis da mesma rubrica, gerar linhas negativas proporcionais aos créditos do processo de origem e marcar os ajustes como `PREVISTO`.

**Response (200 OK):** mantém o contrato de `ProcessoResponse` definido em F02. A consulta detalhada dos ajustes previstos é feita por `GET /api/v1/processos/{id}/calculo`.

**Erros adicionais:**
- `422 Unprocessable Entity`: existe estorno registrado como `PROCESSO_CRIADO_DESATUALIZADO` para a mesma rubrica+período e o snapshot de verba do processo está desatualizado.
- `422 Unprocessable Entity`: ajuste elegível entrou em `ERRO_INTEGRIDADE` porque não há créditos válidos no processo de origem para alocação.

### POST /api/v1/processos/{id}/finalizar

Ao finalizar um processo com ajustes `PREVISTO`, o backend deve transicionar os ajustes para `APLICADO`, preencher `aplicadoEm` e publicar `distribuicao.ajuste.estorno.aplicado` via Outbox.

### POST /api/v1/processos/{id}/cancelar

Ao cancelar um processo com ajustes `PREVISTO`, o backend deve desfazer a previsão e tornar os ajustes novamente elegíveis como `PENDENTE_APLICACAO`. Processo finalizado continua irreversível.

---

## Contratos de Eventos

### Consome: `arrecadacao.pagamento.estornado`

**Origem real:** `infra/schemas/v1/ArrecadacaoPagamentoEstornado.json`

**Uso na Distribuição:** idempotência por `id` do CloudEvent e por `data.pagamentoId`; cálculo de `valorAjusteLiquido = data.valorEstornado * 0.85`.

```json
{
  "specversion": "1.0",
  "id": "74f36d49-01f8-4726-a839-621a22954ec0",
  "source": "urn:arrecadacao-api",
  "type": "arrecadacao.pagamento.estornado",
  "subject": "7d1b7a52-64be-4a3b-a0a7-2d54c9a16c02",
  "time": "2026-05-20T10:00:00Z",
  "datacontenttype": "application/json",
  "data": {
    "pagamentoId": "7d1b7a52-64be-4a3b-a0a7-2d54c9a16c02",
    "licencaId": "b9e9b9b8-3434-43dd-bf3d-600698de6b8f",
    "rubricaSigla": "RADIO",
    "periodo": "2026-03",
    "quantidadeUdas": "10.000000",
    "valorEstornado": "1000.00",
    "justificativa": "Pagamento registrado em duplicidade",
    "estornadoPor": "analista.arrecadacao@ecad.org.br",
    "estornadoEm": "2026-05-20T10:00:00Z"
  }
}
```

### Produz: `distribuicao.ajuste.estorno.registrado`

Publicado via Outbox quando um evento válido gera ajuste `PENDENTE_APLICACAO`.

```json
{
  "specversion": "1.0",
  "id": "f577617d-d241-4ca7-b62f-2e26ac33d217",
  "source": "urn:distribuicao-api",
  "type": "distribuicao.ajuste.estorno.registrado",
  "subject": "4f8f7f3e-5a63-4c8e-97b8-c6f6b595b1dd",
  "time": "2026-05-20T10:00:05Z",
  "datacontenttype": "application/json",
  "data": {
    "ajusteId": "4f8f7f3e-5a63-4c8e-97b8-c6f6b595b1dd",
    "pagamentoId": "7d1b7a52-64be-4a3b-a0a7-2d54c9a16c02",
    "licencaId": "b9e9b9b8-3434-43dd-bf3d-600698de6b8f",
    "rubricaSigla": "RADIO",
    "periodoOrigem": "2026-03",
    "processoOrigemId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "valorEstornadoBruto": "1000.00",
    "valorAjusteLiquido": "850.00",
    "status": "PENDENTE_APLICACAO",
    "estornadoPor": "analista.arrecadacao@ecad.org.br",
    "estornadoEm": "2026-05-20T10:00:00Z",
    "registradoEm": "2026-05-20T10:00:05Z"
  }
}
```

### Produz: `distribuicao.ajuste.estorno.aplicado`

Publicado via Outbox na finalização do processo que efetiva o ajuste.

```json
{
  "specversion": "1.0",
  "id": "8d7a4685-19f3-4c8a-a935-7eac6c45a90e",
  "source": "urn:distribuicao-api",
  "type": "distribuicao.ajuste.estorno.aplicado",
  "subject": "4f8f7f3e-5a63-4c8e-97b8-c6f6b595b1dd",
  "time": "2026-05-20T12:00:00Z",
  "datacontenttype": "application/json",
  "data": {
    "ajusteId": "4f8f7f3e-5a63-4c8e-97b8-c6f6b595b1dd",
    "pagamentoId": "7d1b7a52-64be-4a3b-a0a7-2d54c9a16c02",
    "licencaId": "b9e9b9b8-3434-43dd-bf3d-600698de6b8f",
    "rubricaSigla": "RADIO",
    "periodoOrigem": "2026-03",
    "periodoAplicacao": "2026-04",
    "processoOrigemId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "processoAplicacaoId": "d2e3f4a5-6789-4abc-def1-234567890123",
    "valorEstornadoBruto": "1000.00",
    "valorAjusteLiquido": "850.00",
    "valorAplicado": "-850.00",
    "totalLinhas": 2,
    "estornadoPor": "analista.arrecadacao@ecad.org.br",
    "estornadoEm": "2026-05-20T10:00:00Z",
    "aplicadoEm": "2026-05-20T12:00:00Z"
  }
}
```

---

## Schemas

### AjusteEstornoResumo

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | `string (uuid)` | Sim | Identificador local do ajuste/evento registrado |
| `eventId` | `string (uuid)` | Sim | `id` do CloudEvent consumido |
| `pagamentoId` | `string (uuid)` | Sim | Pagamento estornado na Arrecadação |
| `licencaId` | `string (uuid)` | Sim | Licença vinculada ao pagamento |
| `rubrica` | `RubricaResumo` | Sim | Rubrica afetada |
| `periodoOrigem` | `string (YYYY-MM)` | Sim | Período da verba estornada |
| `valorEstornadoBruto` | `number` | Sim | Valor bruto recebido no evento |
| `valorAjusteLiquido` | `number` | Sim | Valor líquido calculado pela regra de 85% |
| `valorAplicado` | `number` | Não | Valor negativo previsto/aplicado |
| `status` | `AjusteEstornoStatus` | Sim | Estado atual do ajuste |
| `processoOrigemId` | `string (uuid)` | Não | Processo que usou a verba antes do estorno |
| `processoAplicacaoId` | `string (uuid)` | Não | Processo que prevê/aplicou o ajuste |
| `justificativa` | `string` | Sim | Justificativa do estorno na Arrecadação |
| `estornadoPor` | `string` | Sim | Autor do estorno na Arrecadação |
| `estornadoEm` | `date-time` | Sim | Momento do estorno na Arrecadação |
| `recebidoEm` | `date-time` | Sim | Momento do consumo na Distribuição |
| `previstoEm` | `date-time` | Não | Momento em que entrou no cálculo |
| `aplicadoEm` | `date-time` | Não | Momento em que foi efetivado |

### AjusteEstornoStatus

`PENDENTE_APLICACAO`, `PREVISTO`, `APLICADO`, `CANCELADO`, `IGNORADO_SEM_DISTRIBUICAO`, `PROCESSO_CRIADO_DESATUALIZADO`, `ERRO_INTEGRIDADE`.

### LinhaAjusteEstorno

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | `string (uuid)` | Sim | Identificador da linha |
| `ajusteId` | `string (uuid)` | Sim | Ajuste relacionado |
| `processoOrigemId` | `string (uuid)` | Sim | Processo que originou o crédito compensado |
| `processoAplicacaoId` | `string (uuid)` | Sim | Processo que prevê/aplicou a linha |
| `creditoOrigemId` | `string (uuid)` | Sim | Crédito usado como base proporcional |
| `titularId` / `titularNome` | `uuid` / `string` | Sim | Titular do crédito de origem |
| `obraId` / `obraTitulo` | `uuid` / `string` | Sim | Obra do crédito de origem |
| `fonogramaId` | `uuid` | Não | Fonograma do crédito de origem, quando houver |
| `categoria` | `string` | Sim | Categoria do crédito de origem |
| `subcategoriaConexa` | `string` | Não | Subcategoria conexa, quando houver |
| `valorCreditoOrigem` | `number` | Sim | Valor positivo original usado na proporção |
| `valorAjuste` | `number` | Sim | Valor negativo alocado |

### ProcessoCalculoResumo

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `verbaLiquida` | `number` | Sim | Verba líquida do processo atual |
| `totalCreditos` | `integer` | Sim | Quantidade de créditos positivos do processo atual |
| `valorTotalCreditos` | `number` | Sim | Soma dos créditos positivos |
| `totalCreditosRetidos` | `integer` | Sim | Quantidade de créditos retidos no cálculo |
| `valorTotalCreditosRetidos` | `number` | Sim | Valor total retido no cálculo |
| `totalRetidosLiberados` | `integer` | Sim | Quantidade de créditos retidos liberados por F05 |
| `valorTotalRetidosLiberados` | `number` | Sim | Valor total liberado por F05 |
| `totalAjustesEstorno` | `integer` | Sim | Quantidade de ajustes previstos/aplicados no processo |
| `valorTotalAjustesEstorno` | `number` | Sim | Soma negativa dos ajustes por estorno |
| `valorLiquidoDemonstravel` | `number` | Sim | Total financeiro demonstrável: créditos positivos + liberações - ajustes |

### ProblemDetails

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `type` | `string (uri)` | Sim | URI de referência do tipo de erro |
| `title` | `string` | Sim | Título curto do erro |
| `status` | `integer` | Sim | HTTP status code |
| `detail` | `string` | Não | Descrição detalhada do erro |
| `instance` | `string` | Não | Path da requisição |
| `traceId` | `string` | Não | ID de rastreamento |

---

## Códigos de Erro

| Status | Código | Quando |
|--------|--------|--------|
| `400` | Bad Request | Query params inválidos (`periodoOrigem` fora de `YYYY-MM`, status desconhecido, paginação inválida) |
| `401` | Unauthorized | Token JWT ausente, expirado ou inválido |
| `403` | Forbidden | Usuário autenticado sem permissão Authz requerida |
| `404` | Not Found | Ajuste ou processo não encontrado |
| `422` | Unprocessable Entity | Cálculo bloqueado por snapshot desatualizado ou erro de integridade de ajuste |
| `500` | Internal Server Error | Falha inesperada no servidor |

---

## Permissionamento

| Permissão | Endpoint(s) | Perfil-base |
|-----------|-------------|-------------|
| `distribuicao:default:ajuste:listar` | `GET /ajustes-estorno` | consultor, analista |
| `distribuicao:default:ajuste:visualizar` | `GET /ajustes-estorno/{id}` | consultor, analista |
| `distribuicao:default:processo:visualizar` | `GET /processos/{id}/calculo` | consultor, analista |
| `distribuicao:default:processo:calcular` | `POST /processos/{id}/calcular` | analista |
| `distribuicao:default:processo:finalizar` | `POST /processos/{id}/finalizar` | analista |
| `distribuicao:default:processo:cancelar` | `POST /processos/{id}/cancelar` | analista |

---

## Premissas e Decisões

| Decisão | Justificativa |
|---------|---------------|
| Sem endpoints de criação/edição manual de ajustes | Ajustes nascem apenas do evento `arrecadacao.pagamento.estornado` |
| Listagem paginada com wrapper `items` + `metadata` | Mesmo padrão de F02 Gestão de Processos |
| Campos HTTP em camelCase e paths em português/kebab-case | Convenção dos contratos existentes |
| Valores monetários HTTP como `number` | Mantém consistência com contratos de Distribuição F02; backend usa `BigDecimal` |
| Valores monetários em eventos como string decimal | Mantém compatibilidade com schemas de eventos e evita perda em consumidores assíncronos |
| `valorAplicado` sempre negativo quando preenchido | Facilita exibição de débito no cálculo e demonstrativo futuro |
| `payloadOriginal` aparece apenas no detalhe | Evita payload pesado na listagem e preserva auditoria técnica |
| `GET /processos/{id}/calculo` separa `ajustesEstorno` dos créditos positivos | RF-24: ajustes não alteram o rateio do processo atual |
| Eventos inválidos não têm endpoint de reprocessamento nesta feature | PRD exige descarte com log e não prevê operação manual |
| `PROCESSO_CRIADO_DESATUALIZADO` é consultável na listagem | Ajuda operação a entender bloqueios de cálculo sem criar ajuste financeiro pendente |

---

*Contrato gerado seguindo o padrão de `flow-contract-creator`. Para mock server imediato: `npx @stoplight/prism-cli mock api-contract.yaml`*
