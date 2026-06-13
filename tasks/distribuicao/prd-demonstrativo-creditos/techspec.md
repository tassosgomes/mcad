# Tech Spec — F07: Demonstrativo de Créditos

**Feature:** F07 — Demonstrativo de Créditos
**Domínio:** Distribuição (D04)
**Serviço:** `distribuicao-api` (Java Spring Boot)
**PRD:** `tasks/distribuicao/prd-demonstrativo-creditos/prd.md`
**Data:** 2026-06-07

---

## Resumo Executivo

F07 é uma feature de consulta pura: não cria entidades, não dispara eventos, não escreve no banco. Toda a informação necessária já está na tabela `distribuicao.creditos` — o demonstrativo é uma view sobre dados que F03, F04 e F05 já persistiram.

A implementação acrescenta dois endpoints, dois query handlers, uma projeção JPQL, três métodos novos no `CreditoRepository`, dois DTOs de resposta, um controller novo e as permissões correspondentes no authz. No frontend, uma nova aba "Demonstrativos" na `ProcessoDetailPage` contém a tabela de titulares e o painel de detalhe.

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
DemonstrativoController
  ├── GET /processos/{id}/demonstrativos
  │     → ListarTitularesDemonstrativoQueryHandler
  │         → CreditoRepository.findTitularesByProcessoId()       (GROUP BY JPQL)
  │         → CreditoRepository.findLiberadosByProcessoLiberacaoId()  (merge de totalLiberado)
  │
  └── GET /processos/{id}/demonstrativos/{titularId}
        → ConsultarDemonstrativoTitularQueryHandler
            → ProcessoRepository.findById()                        (valida existência)
            → CreditoRepository.findByProcessoAndTitularAndStatus()  (Seções 1 e 2)
            → CreditoRepository.findLiberadosByProcessoLiberacaoAndTitular()  (Seção 3)
            → Seção 4 hardcoded como lista vazia (F06 a preenche)
```

Nenhuma chamada HTTP ao Cadastro, à Identificação ou à Arrecadação — o demonstrativo é autossuficiente com os dados desnormalizados em `creditos`.

---

## Design de Implementação

### Interfaces Principais

**Novos métodos em `CreditoRepository` (domain/interfaces):**

```java
// Para listagem de titulares — GROUP BY JPQL
List<TitularDemonstrativoProjection> findTitularesByProcessoId(
    UUID processoId, String titularNomeFiltro, Pageable pageable);

long countTitularesByProcessoId(UUID processoId, String titularNomeFiltro);

// Para seções 1 e 2 do demonstrativo individual
List<Credito> findByProcessoAndTitularAndStatus(
    UUID processoId, UUID titularId, StatusCredito status);

// Para seção 3 (créditos liberados neste processo)
List<Credito> findLiberadosByProcessoLiberacaoAndTitular(
    UUID processoLiberacaoId, UUID titularId);

// Para merge de totalLiberado na listagem de titulares
Map<UUID, BigDecimal> sumLiberadosByProcessoLiberacaoId(UUID processoLiberacaoId);
```

**Queries:**

```java
// distribuicao-application
record ListarTitularesDemonstrativoQuery(UUID processoId, String titularNome, int page, int size) {}
record ConsultarDemonstrativoTitularQuery(UUID processoId, UUID titularId) {}
```

### Modelos de Dados

**Projeção JPQL nova** (`domain/projections`):

```java
public record TitularDemonstrativoProjection(
    UUID titularId,
    String titularNome,
    BigDecimal totalCalculado,
    BigDecimal totalRetido,
    long quantidadeObras      // CALCULADO somente; inclui LIBERADO após merge
) {}
```

**DTO de listagem** (`TitularDemonstrativoResumoResponse`):

```java
public record TitularDemonstrativoResumoResponse(
    UUID titularId,
    String titularNome,
    String totalCalculado,   // BigDecimal → String, 2 casas
    String totalRetido,
    String totalLiberado,    // calculado após merge com query de liberados
    String totalAReceber,    // totalCalculado + totalLiberado
    int quantidadeObras
) {}
```

**DTO de listagem paginada** (`TitularesDemonstrativoPageResponse`):

```java
public record TitularesDemonstrativoPageResponse(
    List<TitularDemonstrativoResumoResponse> items,
    PaginationMetadata metadata   // reutiliza CalculoProcessoResponse.PaginationMetadata
) {}
```

**DTO de demonstrativo individual** (`DemonstrativoTitularResponse`):

```java
public record DemonstrativoTitularResponse(
    UUID processoId,
    StatusProcesso statusProcesso,
    String rubricaSigla,
    String periodo,
    UUID titularId,
    String titularNome,
    ResumoFinanceiroResponse resumo,
    List<CreditoCalculadoItem> creditosPeriodo,       // Seção 1 — CALCULADO
    List<CreditoRetidoItem>   creditosRetidos,        // Seção 2 — RETIDO
    List<CreditoLiberadoItem> creditosLiberados,      // Seção 3 — LIBERADO (processoLiberacaoId)
    List<Object>              ajustesEstorno,         // Seção 4 — sempre vazia neste PRD
    String totalAjustesEstorno                        // sempre "0.00"
) {}
```

Campos monetários em todos os DTOs: `String` com 2 casas decimais (`"1234.56"`).
Percentuais: `String` com 6 casas decimais (`"66.670000"`).

### Endpoints de API

| Método | Caminho | Handler | Permissão |
|--------|---------|---------|-----------|
| `GET` | `/api/v1/processos/{id}/demonstrativos` | `ListarTitularesDemonstrativoQueryHandler` | `distribuicao:default:demonstrativo:listar` |
| `GET` | `/api/v1/processos/{id}/demonstrativos/{titularId}` | `ConsultarDemonstrativoTitularQueryHandler` | `distribuicao:default:demonstrativo:visualizar` |

**Parâmetros do primeiro endpoint:**

| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| `titularNome` | `string` | — | Filtro parcial case-insensitive (`LOWER LIKE`) |
| `page` | `int` | `0` | Página zero-indexed |
| `size` | `int` | `20` | Itens por página (max 100) |
| `sort` | `string` | `nome` | `nome` ou `totalAReceber` |

**Ordenação por `totalAReceber`:** calculada na query base; ordenação no Java após merge dos liberados, antes da paginação, quando `sort=totalAReceber`. Para `sort=nome` (default), a ordenação é feita no JPQL (`ORDER BY LOWER(c.titularNome) ASC`).

---

## Pontos de Integração

F07 não possui dependências externas em runtime. Todo dado vem da tabela `distribuicao.creditos` e `distribuicao.processos`.

A integração com o authz-starter segue o padrão já estabelecido: `@RequiresPermission` no controller, novas chaves em `permissions.yaml` e catalog em `docs/authz/catalog/distribuicao.md`.

---

## Análise de Impacto

| Componente Afetado | Tipo de Impacto | Descrição & Risco | Ação |
|---|---|---|---|
| `CreditoRepository` (interface + impl) | Extensão | +5 métodos novos; sem alteração em métodos existentes | Baixo — additive only |
| `JpaCreditoRepository` | Extensão | Implementação JPQL dos novos métodos | Baixo |
| `permissions.yaml` | Extensão | +2 chaves `demonstrativo:listar` / `demonstrativo:visualizar` | Baixo — o authz-starter só registra no boot |
| `docs/authz/catalog/distribuicao.md` | Documentação | +1 nova seção Demonstrativo | Baixo |
| `ProcessoDetailPage.tsx` | Mudança UI | Novo tab `'demonstrativos'`; mudança em `ActiveTab` type | Baixo — aditivo |
| Nenhuma migração Flyway | — | Todos os dados já existem; nenhuma DDL nova | Zero risco de schema |

---

## Abordagem de Testes

### Testes Unitários

**`ListarTitularesDemonstrativoQueryHandlerTest`** (unit):
- Processo não encontrado → `NotFoundException`
- Listagem com titularNome filtrado → verifica merge de liberados
- Ordenação por `totalAReceber` → titular com maior soma vem primeiro
- Mock de `CreditoRepository` retornando projeções e lista de liberados

**`ConsultarDemonstrativoTitularQueryHandlerTest`** (unit):
- Titular sem créditos → `NotFoundException`
- Processo com créditos em todos os 3 statuses → seções corretas
- `totalAReceber = totalCalculado + totalLiberado` (sem RETIDO)
- Seção 4 sempre vazia

**`JpaCreditoRepositoryTest`** (unit — mock EntityManager):
- `findTitularesByProcessoId` com e sem filtro de nome
- `findByProcessoAndTitularAndStatus` retorna somente créditos do status solicitado

### Testes de Integração

**`DemonstrativoControllerIntegrationTest`** (Testcontainers PostgreSQL):
- Setup: inserir processo FINALIZADO + créditos CALCULADO + RETIDO + LIBERADO para dois titulares
- `GET /processos/{id}/demonstrativos` → lista com totais corretos por titular
- `GET /processos/{id}/demonstrativos/{titularId}` → seções 1, 2 e 3 com contagens corretas
- `GET /processos/{id}/demonstrativos/{titularNaoExistente}` → 404
- Filtro `?titularNome=silva` → case-insensitive match
- Verificar `totalAReceber = totalCalculado + totalLiberado`
- Verificar que `ajustesEstorno` retorna lista vazia e `totalAjustesEstorno = "0.00"`

---

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Projection + Repository (domain + infra)** — sem dependência; habilita todos os handlers
2. **DTOs** em `distribuicao-application` — depend de enums e projeções do domain
3. **Query + Handler de listagem** — depends em (1) e (2)
4. **Query + Handler de demonstrativo individual** — depends em (1) e (2)
5. **`DemonstrativoController`** — wires os handlers; atualizar `permissions.yaml` e catalog
6. **Frontend: tipos + API client + hooks** — sem dependência de backend se usar contratos antecipados
7. **Frontend: componentes + integração em `ProcessoDetailPage`** — depends em (6)
8. **Testes unitários** ao longo de (3)–(4); **integration tests** após (5)

### Dependências Técnicas

- Nenhuma dependência externa nova
- A dívida de Testcontainers (Docker engine 1.44+) existente pode bloquear os ITs; mitigar com `@DisabledIfSystemProperty` até a resolução, conforme padrão já adotado no módulo

---

## Monitoramento e Observabilidade

- Seguir o padrão de observabilidade já presente no serviço (Micrometer/OpenTelemetry)
- Os dois endpoints de consulta não precisam de span custom — o instrumentation automático do Spring Boot já produz spans `http.server.request`
- Log `DEBUG` no handler quando processo não for `FINALIZADO` (aviso de demonstrativo parcial)

---

## Considerações Técnicas

### Decisões Principais

**1. Extensão de `CreditoRepository` vs. novo `DemonstrativoRepository`**
A fonte de dados é exclusivamente `distribuicao.creditos`, já gerenciada por `CreditoRepository`. Criar um repositório separado seria uma abstração desnecessária para dados da mesma tabela. Novos métodos são additive-only.

**2. Dois selects + merge em Java para listagem de titulares**
O `totalLiberado` de um titular em um processo vem de créditos com `processoLiberacaoId = processoId` (origem em outro processo). Incluir isso em um único GROUP BY requer UNION ou sub-select, tornando o JPQL frágil. A abordagem de dois selects + `Map<UUID, BigDecimal>` merge em Java é mais legível e alinhada com o padrão já adotado em `ConsultarCalculoProcessoQueryHandler` (que busca `retidosLiberados` separadamente).

**3. Ordenação por `totalAReceber` fora do JPQL**
Como `totalAReceber = totalCalculado + totalLiberado` e o segundo componente vem de uma segunda query, a ordenação por esse campo é feita em Java após o merge. Para `sort=nome`, a ordenação é empurada para o JPQL. Essa bifurcação é explicitada no handler — não é um edge case silencioso.

**4. Seção 4 (ajustes) hardcoded vazia**
A migration V8 já criou `ajuste_estorno_linhas` com `titular_id`, mas F06 ainda não implementou o domain layer. Introduzir uma query ad-hoc em SQL nativo agora violaria o isolamento de domínio. O contrato de resposta reserva a seção; F06 a preenche quando o domain estiver pronto.

**5. Sem nova migration Flyway**
Todos os dados existem. Os índices `ix_creditos_processo_titular` (processo_id, titular_id) e `ix_creditos_liberacao` (processo_liberacao_id, status) já cobrem os acessos da feature.

### Riscos Conhecidos

- **JPQL com `CASE WHEN` para GROUP BY** — testado em JPA 3.1/Hibernate 6 (Spring Boot 3.3), mas validar com `JpaCreditoRepositoryTest` antes de prosseguir para IT
- **Ordenação em Java por `totalAReceber` com paginação**: página 2 de uma listagem ordenada por totalAReceber é coerente somente se toda a listagem for carregada em memória primeiro, o que não ocorre aqui. Decisão: paginação server-side funciona corretamente apenas para `sort=nome`; para `sort=totalAReceber` a ordenação é na página retornada (não global). O PRD não exige ordenação global — apenas a aba de busca. Documentar no Javadoc do handler.

### Conformidade com Padrões

- Authz via `@RequiresPermission` (ADR 0002/0003) — sem `@PreAuthorize` ou verificação local de roles
- Auditoria: F07 é somente leitura; não gera eventos de auditoria (alinhado com o padrão — apenas mutações são auditadas)
- Valores monetários: `BigDecimal` no domain; serialização para `String` no DTO via `toString()` com `setScale(2)`
- Frontend: gate de UI via `<Can permission="...">` (ADR 0004) — a aba Demonstrativos é ocultada quando o usuário não possui nenhuma das duas permissões
- Sem cross-schema queries — `distribuicao.creditos` é a única tabela acessada
