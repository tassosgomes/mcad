# PRD — Adição do Campo Código (Propriedade de Negócio)

> **Tipo:** Feature Transversal (Cross-Entity)
> **Prioridade:** Must Have
> **Status:** `planned`
> **Data:** 2026-04-03

---

## Visão Geral

No ECAD real, o sistema legado usa PKs inteiras sequenciais que ao longo de 20 anos se tornaram **identificadores de negócio** — os usuários se comunicam referenciando "Obra 1", "Fonograma 5672", "Titular 67493". O mini-ECAD precisa herdar essa característica para manter fidelidade ao domínio.

Esta feature adiciona um campo `codigo` (BIGINT sequencial, auto-gerado, imutável, único) nas 4 entidades principais: Associação, Titular, Obra Musical e Fonograma. O código é o **identificador visual** na interface, enquanto o UUID continua como PK técnica para todas as operações internas, FKs e APIs. As APIs continuam retornando o UUID normalmente — o código é um campo adicional no response.

---

## Objetivos

| Objetivo | Métrica de Sucesso |
|----------|-------------------|
| Identificador de negócio em todas as entidades | 100% dos registros com código sequencial único |
| Fidelidade ao domínio ECAD | Usuários referenciam entidades pelo código (não UUID) |
| Imutabilidade garantida | Zero alterações de código após criação |
| UUID continua funcional | 100% das APIs, FKs e operações internas usam UUID |

---

## Histórias de Usuário

### HU-01 — Identificar entidade pelo código
**Como** Analista de Cadastro ou Consultor,
**eu quero** ver o código numérico de cada entidade na listagem e no detalhe,
**para que** eu possa referenciar entidades da mesma forma que no sistema legado do ECAD (ex: "Obra 1542").

### HU-02 — Buscar por código
**Como** Analista de Cadastro,
**eu quero** buscar entidades pelo código numérico,
**para que** eu encontre rapidamente uma entidade quando alguém me passar o número.

### HU-03 — Código gerado automaticamente
**Como** sistema,
**eu preciso** gerar um código sequencial único automaticamente ao criar qualquer entidade,
**para que** o Analista não precise informar manualmente e não haja risco de duplicatas.

---

## Funcionalidades Principais

### 1. Campo Código nas Entidades

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-01 | As entidades Associação, Titular, Obra Musical e Fonograma devem possuir um campo `codigo` do tipo BIGINT (INT64), sequencial, auto-gerado | Must Have |
| RF-02 | O código é gerado automaticamente por uma sequence PostgreSQL independente por tabela | Must Have |
| RF-03 | O código é imutável — nunca pode ser alterado ou reutilizado após criação | Must Have |
| RF-04 | O código é único por tabela (UNIQUE constraint) | Must Have |
| RF-05 | As 7 associações do seed devem receber códigos 1 a 7 | Must Have |

**Critérios de Aceitação — RF-01:**
- **Given** o Analista cria um novo titular
- **When** o registro é salvo
- **Then** o titular recebe automaticamente um código sequencial (ex: 67494) sem intervenção do Analista

**Critérios de Aceitação — RF-03:**
- **Given** um titular com código 67493
- **When** qualquer operação de edição é executada
- **Then** o código permanece 67493 (imutável, campo read-only)

### 2. APIs — Código no Response

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-06 | Todos os endpoints de criação (POST) devem retornar o `codigo` no response junto com o `id` (UUID) | Must Have |
| RF-07 | Todos os endpoints de listagem (GET) devem retornar o `codigo` em cada item | Must Have |
| RF-08 | Todos os endpoints de detalhe (GET /{id}) devem retornar o `codigo` | Must Have |
| RF-09 | O campo `codigo` é read-only — não é aceito em requests de criação ou edição (ignorado se enviado) | Must Have |
| RF-10 | As APIs continuam usando UUID como identificador nos paths (`/api/v1/titulares/{uuid}`). O código NÃO substitui o UUID nas rotas. | Must Have |

**Critérios de Aceitação — RF-06:**
- **Given** POST /api/v1/titulares com dados válidos
- **When** o titular é criado
- **Then** o response contém `{ "id": "uuid-...", "codigo": 67494, "nome": "...", ... }`

**Critérios de Aceitação — RF-10:**
- **Given** o titular tem código 67494 e UUID "f47ac10b-..."
- **When** o Analista acessa o detalhe
- **Then** a rota é `/api/v1/titulares/f47ac10b-...` (UUID no path, não código)

### 3. Frontend — Código como Identificador Visual

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-11 | Nas listagens (tabelas), o código é a primeira coluna, exibido em `--font-mono` | Must Have |
| RF-12 | Na tela de detalhe, o código é exibido no PageHeader (ex: "Titular #67494") | Must Have |
| RF-13 | O UUID NÃO é exibido na interface (informação de infraestrutura oculta) | Must Have |
| RF-14 | O código é prefixado com "#" na exibição (ex: #1542) | Should Have |

**Critérios de Aceitação — RF-11:**
- **Given** a listagem de titulares
- **When** o usuário visualiza a tabela
- **Then** a primeira coluna é "Código" com valores numéricos em fonte monoespaçada (ex: #67494)

**Critérios de Aceitação — RF-13:**
- **Given** qualquer tela do sistema
- **When** o usuário procura o UUID
- **Then** o UUID não está visível em nenhuma parte da interface

### 4. Busca por Código

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-15 | Filtro por código (busca exata) nas listagens de Titulares, Obras e Fonogramas | Must Have |
| RF-16 | O filtro aceita apenas números inteiros | Must Have |

**Critérios de Aceitação — RF-15:**
- **Given** a listagem de titulares com filtro de código
- **When** o Analista digita "67494"
- **Then** retorna exatamente o titular com código 67494

### 5. Depuração

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-17 | Ao depurar uma obra ou fonograma, a nova entidade recebe um NOVO código (não herda o código original) | Must Have |
| RF-18 | A obra/fonograma depurada mantém seu código original (imutável) | Must Have |
| RF-19 | Na interface, a referência à nova obra/fonograma exibe o código da nova entidade (ex: "Depurada → Nova versão: #2847") | Must Have |

**Critérios de Aceitação — RF-17:**
- **Given** obra #1542 (LIBERADA) é depurada
- **When** a depuração é confirmada
- **Then** obra original mantém código #1542 (status DEPURADA), nova obra recebe código #1543 (próximo da sequence)

### 6. Ordenação e Exibição

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-20 | Ordenação por código disponível em todas as listagens (server-side) | Must Have |
| RF-21 | Ordenação default das listagens muda para código DESC (mais recente primeiro) | Should Have |

---

## Experiência do Usuário

### Antes (UUID visível)
```
Listagem: | f47ac10b-58cc-4372-a567-... | Djavan | PF | ABRAMUS | ATIVO |
Detalhe:  Titular f47ac10b-58cc-4372-a567-0e02b2c3d479
```

### Depois (código como identificador)
```
Listagem: | #67494 | Djavan | PF | ABRAMUS | ATIVO |
Detalhe:  Titular #67494
Depurada: Obra #1542 → Nova versão: #1543
```

---

## Restrições Técnicas de Alto Nível

- BIGINT (INT64) no PostgreSQL — suporta até 9.2 × 10¹⁸
- Sequences independentes por tabela: `seq_associacoes_codigo`, `seq_titulares_codigo`, `seq_obras_codigo`, `seq_fonogramas_codigo`
- UUID continua como PK, FKs e path params nas APIs
- Código é campo adicional (não substitui nada existente)
- Migration: ALTER TABLE + CREATE SEQUENCE + DEFAULT para cada tabela
- Seed: associações recebem códigos 1-7 via sequence

---

## Não-Objetivos (Fora de Escopo)

- Código NÃO substitui UUID como PK no banco
- Código NÃO é usado em FKs entre tabelas
- Código NÃO é usado nos paths das APIs (continuam UUID)
- Não implementa busca cross-entity por código (ex: buscar "1542" retornando obras E fonogramas)
- Não implementa prefixo por entidade no código (ex: O-1542 para obra, F-5672 para fonograma)
- Não é editável por nenhum perfil

---

## Questões em Aberto

Todas as questões foram resolvidas. PRD pronto para Tech Spec.

---

*PRD gerado com a skill `criador-prd-v2`.*

---

## Apêndice — Estado Implementado no Código (2026-05-19)

Este apêndice registra o comportamento encontrado no código após a implementação. O conteúdo original do PRD acima permanece como baseline de produto; as informações abaixo refletem o estado real observado em `services/cadastro-api` e `frontend/src/features/cadastro`.

### Escopo entregue

| Área | Estado real |
|------|-------------|
| Campo `codigo` nas entidades principais | Implementado em Associação, Titular, Obra Musical e Fonograma como `long`/BIGINT gerado pelo banco. |
| Sequences e unicidade | Implementado por migration `20260403190454_AddCodigo_CampoCodigo`: 4 sequences PostgreSQL, 4 colunas `Codigo` `bigint not null`, defaults com `nextval(...)` e 4 índices únicos. |
| Seed de associações | Implementado com códigos fixos 1 a 7. A sequence de associações já nasce em 8, em vez de nascer em 1 e reiniciar depois. |
| Código em responses | Implementado nas respostas principais e resumos usados por titulares, associações, obras, fonogramas, titularidades, participações e depuração. |
| Requests read-only | Implementado por ausência de `codigo` nos DTOs/commands de criação e edição. O UUID continua sendo usado nos paths e nas operações internas. |
| Busca por código | Implementada em Titulares, Obras e Fonogramas como filtro exato via query param `codigo`. |
| Exibição frontend | Implementada nas tabelas e detalhes principais: código aparece como primeira coluna ou título de detalhe com prefixo `#` e estilo monoespaçado. |
| Depuração | Implementada para Obras e Fonogramas: a entidade original mantém seu código e passa para status depurado/depurada; a nova entidade é criada com novo UUID e recebe novo código pela sequence. |

### Divergências e pendências observadas

| Requisito | Estado real |
|-----------|-------------|
| RF-20 — Ordenação por código server-side | Parcial. O frontend permite clicar na coluna Código e envia `sort=codigo`/`sort=-codigo`, mas os repositórios backend ainda não tratam esse sort e caem no fallback. |
| RF-21 — Ordenação default por código DESC | Não implementado. Os defaults atuais continuam `nome` para Titulares, `titulo` para Obras e `isrc` para Fonogramas. |
| RF-13 — UUID oculto da interface | Atendido nas telas principais de cadastro, mas há superfícies de auditoria/histórico que ainda exibem `entityId` técnico e aceitam “UUID ou código da entidade”. |
| Testes automatizados | Cobertura específica existe para criação/edição/filtro de Titular com código e depuração de Obra com novo código. Não foi encontrada cobertura dedicada para seed 1-7 de Associações, código de Fonograma, ordenação por código ou comportamento visual do frontend. |

### Observações de contrato

- Os paths continuam usando UUID (`/api/v1/titulares/{id}`, `/api/v1/obras/{id}`, `/api/v1/fonogramas/{id}`).
- O `codigo` é identificador visual e de busca exata, não substitui PK, FKs ou routing.
- As referências de depuração no frontend ainda navegam por UUID, mas exibem o código da nova entidade quando ela é carregada.

---

## Apêndice — Revalidação do Código Atual (2026-05-20)

Esta revalidação foi feita sobre o código atual e apenas complementa os registros anteriores, sem alterar o baseline do PRD.

### Confirmações mantidas

| Área | Estado revalidado |
|------|-------------------|
| Identificador de negócio | `codigo` continua implementado em Associação, Titular, Obra Musical e Fonograma. |
| Busca exata por código | Titulares, Obras e Fonogramas continuam aceitando `codigo` nas listagens e aplicando filtro exato no backend. |
| Código em responses | Responses principais de cadastro, resumos e respostas de depuração continuam carregando `Codigo`/`codigo`. |
| UUID técnico | Paths, relações, eventos de domínio e navegação interna continuam baseados em UUID. |

### Atualizações e riscos observados

| Requisito | Atualização |
|-----------|-------------|
| RF-13 — UUID oculto da interface | A ressalva ficou mais ampla: as tabelas de cadastro agora usam `RowAuditHistoryButton` em Associações, Titulares, Obras, Fonogramas, Titularidades e Participações. Para usuários com permissão de auditoria, o modal `RowAuditHistoryModal` exibe o `entityId` bruto no cabeçalho, expondo o UUID dentro das próprias telas de cadastro. |
| RF-19 — Referência à nova entidade depurada | Obras seguem alinhadas: o frontend navega por `res.novaObra.id` e banners carregam/exibem `#codigo`. Fonogramas têm divergência de contrato: o backend retorna `novoFonograma.id` dentro de `DepuracaoFonogramaResponse`, mas o frontend espera `response.novoFonogramaId`; a navegação pós-depuração de fonograma pode falhar ou apontar para `undefined`. |
| RF-20 — Ordenação por código server-side | Continua pendente. As tabelas enviam `sort=codigo` e `sort=-codigo`, mas os repositórios backend ainda não ordenam por `Codigo`. |
| RF-21 — Default por código DESC | Continua pendente. Os defaults seguem `nome`, `titulo` e `isrc`. |

### Fora do escopo confirmado

- A busca geral `/api/v1/busca` continua orientada a título, ISWC, ISRC e participantes; ela não expõe nem pesquisa pelo `codigo` de negócio. Isso permanece coerente com o não-objetivo de não criar busca cross-entity por código.
