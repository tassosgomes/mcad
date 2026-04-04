# API Contract — F02: Gestão de Usuários de Música

> **Contrato gerado a partir do PRD:** `tasks/arrecadacao/prd-gestao-usuarios-musica/prd.md`
> **Spec OpenAPI:** `tasks/arrecadacao/prd-gestao-usuarios-musica/api-contract.yaml`
> **Data:** 2026-04-04

---

## Resumo de Endpoints

| Método | Path | Descrição | Auth | Status |
|--------|------|-----------|------|--------|
| `GET` | `/api/v1/usuarios-musica` | Listar com paginação e filtros | JWT Bearer | `200` |
| `POST` | `/api/v1/usuarios-musica` | Criar novo Usuário | JWT (Analista) | `201` / `409` / `422` |
| `GET` | `/api/v1/usuarios-musica/{id}` | Buscar por ID | JWT Bearer | `200` / `404` |
| `PUT` | `/api/v1/usuarios-musica/{id}` | Atualizar dados (exceto CNPJ e status) | JWT (Analista) | `200` / `404` |
| `POST` | `/api/v1/usuarios-musica/{id}/inativar` | Inativar com justificativa | JWT (Analista) | `200` / `422` |
| `POST` | `/api/v1/usuarios-musica/{id}/ativar` | Reativar com justificativa | JWT (Analista) | `200` / `422` |
| `GET` | `/api/v1/usuarios-musica/{id}/historico-status` | Listar histórico de status | JWT Bearer | `200` / `404` |

---

## Endpoints Detalhados

### GET /api/v1/usuarios-musica

**Propósito:** Lista paginada de Usuários de Música com filtros server-side.

**Quem consome:**
- Frontend — tela de listagem com filtros e paginação
- Frontend — busca/seleção no cadastro de licenças (F03, futuro)

**Query Parameters:**

| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `page` | int | 1 | Página (começa em 1) |
| `size` | int | 20 | Itens por página (máx 100) |
| `sort` | string | `razaoSocial` | Campo de ordenação. `-` para DESC |
| `razaoSocial` | string | — | Filtro parcial, case-insensitive |
| `cnpj` | string | — | Filtro parcial, alfanuméricos |
| `status` | enum | — | ATIVO ou INATIVO |
| `cidade` | string | — | Filtro parcial, case-insensitive |

**Request:**
```http
GET /api/v1/usuarios-musica?page=1&size=20&status=ATIVO&cidade=são+paulo HTTP/1.1
Host: localhost:5003
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "razaoSocial": "Rádio Cidade FM Ltda",
      "nomeFantasia": "Rádio Cidade FM",
      "cnpj": "50997063000132",
      "cnpjFormatado": "50.997.063/0001-32",
      "endereco": {
        "cep": "01001000",
        "logradouro": "Praça da Sé",
        "numero": "1000",
        "complemento": "Sala 301",
        "bairro": "Sé",
        "cidade": "São Paulo",
        "uf": "SP"
      },
      "contato": {
        "nomeResponsavel": "João Silva",
        "telefone": "(11) 99999-8888",
        "email": "contato@radiocidade.com.br"
      },
      "status": "ATIVO",
      "criadoEm": "2026-04-04T10:30:00Z",
      "atualizadoEm": "2026-04-04T14:22:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "size": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### POST /api/v1/usuarios-musica

**Propósito:** Criar novo Usuário de Música. Status inicial é sempre ATIVO.

**Quem consome:** Frontend — formulário de cadastro

**Request:**
```http
POST /api/v1/usuarios-musica HTTP/1.1
Host: localhost:5003
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json

{
  "razaoSocial": "Rádio Cidade FM Ltda",
  "nomeFantasia": "Rádio Cidade FM",
  "cnpj": "50997063000132",
  "endereco": {
    "cep": "01001000",
    "logradouro": "Praça da Sé",
    "numero": "1000",
    "complemento": "Sala 301",
    "bairro": "Sé",
    "cidade": "São Paulo",
    "uf": "SP"
  },
  "contato": {
    "nomeResponsavel": "João Silva",
    "telefone": "(11) 99999-8888",
    "email": "contato@radiocidade.com.br"
  }
}
```

**Response (201 Created):** Retorna o objeto completo `UsuarioMusicaResponse`.

**Response (409 Conflict):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.8",
  "title": "Conflict",
  "status": 409,
  "detail": "Já existe um Usuário de Música cadastrado com este CNPJ: 50.997.063/0001-32"
}
```

**Response (422 Unprocessable Entity):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "CNPJ inválido"
}
```

---

### GET /api/v1/usuarios-musica/{id}

**Propósito:** Dados completos de um Usuário específico.

**Quem consome:** Frontend (detalhes), F03 (vincular licença)

**Response (200 OK):** Objeto `UsuarioMusicaResponse` completo.

**Response (404 Not Found):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.4",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Usuário de Música com ID 'f47ac10b-...' não foi encontrado"
}
```

---

### PUT /api/v1/usuarios-musica/{id}

**Propósito:** Atualizar dados editáveis. CNPJ e status NÃO são alteráveis.

**Request:**
```json
{
  "razaoSocial": "Rádio Cidade FM Ltda - ME",
  "nomeFantasia": "Rádio Cidade",
  "endereco": {
    "cep": "01001000",
    "logradouro": "Praça da Sé",
    "numero": "1000",
    "complemento": "Sala 502",
    "bairro": "Sé",
    "cidade": "São Paulo",
    "uf": "SP"
  },
  "contato": {
    "nomeResponsavel": "Maria Santos",
    "telefone": "(11) 98888-7777",
    "email": "maria@radiocidade.com.br"
  }
}
```

**Response (200 OK):** Objeto atualizado `UsuarioMusicaResponse`.

---

### POST /api/v1/usuarios-musica/{id}/inativar

**Propósito:** Inativar com justificativa obrigatória. Rejeita se já inativo.

**Request:**
```json
{
  "justificativa": "Empresa encerrou atividades no segmento musical"
}
```

**Response (200 OK):** Objeto `UsuarioMusicaResponse` com status = INATIVO.

**Response (422 — já inativo):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "Usuário de Música já está INATIVO"
}
```

---

### POST /api/v1/usuarios-musica/{id}/ativar

**Propósito:** Reativar com justificativa obrigatória. Rejeita se já ativo.

**Request:**
```json
{
  "justificativa": "Empresa retomou atividades e renovou licença"
}
```

**Response (200 OK):** Objeto `UsuarioMusicaResponse` com status = ATIVO.

---

### GET /api/v1/usuarios-musica/{id}/historico-status

**Propósito:** Histórico de ativações/inativações, ordenado do mais recente ao mais antigo.

**Response (200 OK):**
```json
[
  {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "statusAnterior": "ATIVO",
    "statusNovo": "INATIVO",
    "justificativa": "Empresa encerrou atividades no segmento musical",
    "autor": "analista.arrecadacao",
    "data": "2026-04-04T15:30:00Z"
  },
  {
    "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
    "statusAnterior": null,
    "statusNovo": "ATIVO",
    "justificativa": "Cadastro inicial",
    "autor": "analista.arrecadacao",
    "data": "2026-04-01T10:00:00Z"
  }
]
```

---

## Schemas

### UsuarioMusicaResponse

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | `uuid` | Sim | Identificador único |
| `razaoSocial` | `string (max 200)` | Sim | Razão social da empresa |
| `nomeFantasia` | `string (max 200)` | Não | Nome fantasia |
| `cnpj` | `string (14 chars)` | Sim | CNPJ sem formatação (alfanumérico) |
| `cnpjFormatado` | `string` | Sim | CNPJ formatado (AA.BBB.CCC/DDDD-EE) |
| `endereco` | `Endereco` | Sim | Endereço completo |
| `contato` | `Contato` | Sim | Dados de contato |
| `status` | `enum (ATIVO, INATIVO)` | Sim | Status atual |
| `criadoEm` | `datetime` | Sim | Data de criação |
| `atualizadoEm` | `datetime` | Sim | Última atualização |

### Endereco

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `cep` | `string (8 dígitos)` | Sim | CEP sem formatação |
| `logradouro` | `string (max 200)` | Sim | Rua, avenida, etc. |
| `numero` | `string (max 20)` | Sim | Número |
| `complemento` | `string (max 100)` | Não | Complemento |
| `bairro` | `string (max 100)` | Sim | Bairro |
| `cidade` | `string (max 100)` | Sim | Cidade |
| `uf` | `string (2 chars)` | Sim | UF (sigla) |

### Contato

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `nomeResponsavel` | `string (max 200)` | Sim | Nome do responsável |
| `telefone` | `string (max 20)` | Não | Telefone (formato livre) |
| `email` | `string (email)` | Não | Email de contato |

### HistoricoStatusResponse

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | `uuid` | Sim | ID do registro |
| `statusAnterior` | `enum` | Não | Status antes da mudança (null no cadastro) |
| `statusNovo` | `enum` | Sim | Novo status |
| `justificativa` | `string` | Sim | Texto da justificativa |
| `autor` | `string` | Sim | Username do autor (JWT) |
| `data` | `datetime` | Sim | Data/hora da mudança |

---

## Códigos de Erro

| Status | Código | Quando |
|--------|--------|--------|
| `400` | Validation Error | Campos obrigatórios ausentes, formato inválido, razão social < 3 chars, justificativa < 10 chars |
| `401` | Unauthorized | Token JWT ausente, expirado ou inválido |
| `403` | Forbidden | Consultor tentando executar ação de escrita |
| `404` | Resource Not Found | ID não corresponde a nenhum Usuário |
| `409` | Conflict | CNPJ já cadastrado no sistema |
| `422` | Unprocessable Entity | CNPJ inválido (módulo 11), tentar inativar já inativo, tentar ativar já ativo |
| `500` | Internal Server Error | Falha inesperada no servidor |

---

## Premissas e Decisões

| Decisão | Justificativa |
|---------|---------------|
| JWT Bearer via Keycloak | Padrão do projeto |
| Roles: analista-arrecadacao (R+W), consultor-arrecadacao (R) | Consistente com Domain Doc |
| CNPJ como Value Object (não string) | Referência: `Cadastro.Domain.ValueObjects.Cnpj`. Validação módulo 11 alfanumérico |
| CNPJ imutável após criação | RF-04 do PRD — evita inconsistências com licenças vinculadas |
| Sem DELETE — apenas inativação | RF-05 do PRD — preserva integridade referencial com F03/F04 |
| ViaCEP no frontend (não backend) | API pública, sem auth, chamada direto do browser. Fallback manual |
| Endpoints `/inativar` e `/ativar` separados (não PATCH status) | Justificativa obrigatória + histórico exigem payload específico |
| Histórico como sub-recurso | Padrão REST — `/usuarios-musica/{id}/historico-status` |
| Paginação page/size (default 1/20) | Consistente com Cadastro API |
| Sort com prefixo `-` para DESC | Padrão do projeto (Titulares usa mesmo padrão) |
| camelCase nos campos JSON | Convenção do projeto |
| CEP armazenado sem formatação (8 dígitos) | Consistente com CNPJ — formatação é responsabilidade do frontend |
| Autor do histórico extraído do JWT | Claim `preferred_username` — sem campo manual |

---

*Contrato gerado com a skill `flow-contract-creator`. Para mock server imediato: `npx @stoplight/prism-cli mock api-contract.yaml`*
