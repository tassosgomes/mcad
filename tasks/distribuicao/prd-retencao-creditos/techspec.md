# Tech Spec — F04: Retenção de Créditos

> **PRD:** `tasks/distribuicao/prd-retencao-creditos/prd.md`
> **Domínio:** Distribuição (D04)
> **Data:** 2026-05-17
> **Status:** `implemented`
> **Referências:** `vision.md`, `domains/distribuicao/domain.md`, `tasks/distribuicao/prd-liberacao-creditos-retidos/techspec.md`, `frontend/DESIGN.md`

---

## Implementação

Implementado em 2026-05-17.

Artefatos principais entregues:

- enum `MotivoRetencao` e status `RETIDO` em `StatusCredito`;
- factories e campos de retenção em `Credito`;
- cálculo de retenção em `CalculadoraCreditos`, incluindo precedência `OBRA_BLOQUEADA`, `OBRA_PENDENTE`, `TITULAR_SEM_ASSOCIACAO`;
- totais `totalCreditosRetidos` e `valorTotalRetido` em `ResumoCalculo`, `ProcessoDistribuicao`, responses e projeções;
- migration `V6__add_creditos_retencao.sql`;
- filtros `status` e `motivoRetencao` no contrato de consulta de cálculo;
- outbox `distribuicao.credito.retido`, payload de processo calculado, auditoria, métricas e logs de retenção;
- ACL de Cadastro mapeando `status` e `associacaoSigla`;
- frontend com tipos, API client, formatadores, resumo, filtros e tabela de créditos com motivo de retenção.

Observação de estado atual: a codebase também contém F05, portanto `StatusCredito` já possui `LIBERADO` e a migration `V7__add_creditos_liberacao.sql` evolui as constraints de F04 para aceitar créditos liberados preservando motivo/data de retenção.

Verificações executadas:

- `rtk mvn -pl distribuicao-tests -am -Dtest=CalculadoraCreditosTest,CalcularProcessoCommandHandlerTest,ConsultarCalculoProcessoQueryHandlerTest,JpaCreditoRepositoryTest,HttpCadastroOwnershipClientTest -Dsurefire.failIfNoSpecifiedTests=false test`;
- `rtk npm test -- src/features/distribuicao/processos/api/processosCalculoApi.test.ts src/features/distribuicao/processos/components/CalculoSummary.test.tsx src/features/distribuicao/processos/components/CreditosFilters.test.tsx src/features/distribuicao/processos/components/CreditosTable.test.tsx src/features/distribuicao/processos/utils/calculoFormatters.test.ts`.

## Resumo Executivo

Esta feature estende o cálculo de créditos já existente em `distribuicao-api` para classificar automaticamente créditos como `RETIDO` quando houver pendência cadastral: obra `PENDENTE`, obra `BLOQUEADA` ou titular sem associação. O cálculo monetário não muda; a diferença é persistir status, motivo e data de retenção, publicar `distribuicao.credito.retido` via outbox e expor os totais na API/tela de cálculo.

O escopo é incremental e deve preservar a arquitetura atual:

1. Enriquecer o ACL de Cadastro para mapear `status` de obra/fonograma e `associacaoSigla`.
2. Estender domínio de cálculo (`Credito`, `StatusCredito`, records de ownership, `ResultadoCalculo`/`ResumoCalculo`).
3. Adicionar migration com campos de retenção em `creditos` e totais em `processos`.
4. Publicar eventos de retenção na mesma transação do cálculo.
5. Atualizar `GET /api/v1/processos/{id}/calculo` e a tela `ProcessoCalculoPage`.

Não há endpoint de escrita novo. A ação continua sendo `POST /api/v1/processos/{id}/calcular`, protegida por `distribuicao:default:processo:calcular`.

---

## Arquitetura

### Fluxo de Cálculo com Retenção

```text
POST /api/v1/processos/{id}/calcular
        |
        v
CalcularProcessoCommandHandler
        |
        |-- carrega Processo + SnapshotRol + SnapshotVerba
        |-- parseia Rol
        |-- chama CadastroOwnershipClient.buscarOwnership(...)
        v
CalculadoraCreditos
        |
        |-- calcula verba por obra
        |-- calcula créditos por titular
        |-- avalia motivo de retenção por crédito
        |-- retorna creditos + resumo com totais retidos
        v
Transação
        |
        |-- delete créditos anteriores do processo
        |-- save créditos CALCULADO/RETIDO
        |-- atualiza processo para CALCULADO com totais
        |-- save outbox distribuicao.processo.calculado
        |-- save outbox distribuicao.credito.retido (1 por crédito retido)
        |-- save auditoria do cálculo com totais retidos
```

### Decisões Técnicas

| Decisão | Justificativa |
|---|---|
| Retenção no cálculo, não em handler separado | A retenção depende dos mesmos dados e alocações da F03; evita drift entre valor calculado e status |
| Mesma tabela `creditos` | Crédito retido é um crédito calculado com bloqueio operacional, não uma entidade paralela para F04 |
| Um motivo principal por crédito | Atende F04; F05 reavalia todos os pré-requisitos no Cadastro antes de liberar |
| Evento por crédito retido | Facilita Analytics e evita payload de processo grande demais |
| Sem nova permission | A operação de retenção é efeito do cálculo; consulta usa `visualizar` |

---

## Backend — Domain

### Enums

Adicionar `RETIDO` ao enum existente:

```java
public enum StatusCredito {
    CALCULADO,
    RETIDO
}
```

Criar enum:

```java
public enum MotivoRetencao {
    OBRA_PENDENTE,
    OBRA_BLOQUEADA,
    TITULAR_SEM_ASSOCIACAO
}
```

> Escopo isolado da F04: `CALCULADO` e `RETIDO`. Na codebase atual, `LIBERADO` existe porque a F05 já foi implementada sobre esta base.

### Ownership Records

Estender records atuais em `distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/calculo/`:

```java
public record ObraOwnership(
        UUID obraId,
        String titulo,
        String status,
        List<ParticipacaoOwnership> titularidades) { ... }

public record FonogramaOwnership(
        UUID fonogramaId,
        UUID obraId,
        String status,
        List<ParticipacaoOwnership> participacoes) { ... }

public record ParticipacaoOwnership(
        UUID titularId,
        String titularNome,
        String associacaoSigla,
        CategoriaCredito categoria,
        SubcategoriaConexa subcategoriaConexa,
        BigDecimal percentual) { ... }
```

Regras:

- `status` de obra é obrigatório.
- `associacaoSigla` pode ser `null` ou blank; isso indica retenção por `TITULAR_SEM_ASSOCIACAO`.
- `status` de fonograma é mapeado para rastreabilidade, mas não retém crédito na F04.

### Entidade Credito

Estender `Credito`:

```java
@Enumerated(EnumType.STRING)
@Column(name = "motivo_retencao", length = 40)
private MotivoRetencao motivoRetencao;

@Column(name = "retido_em")
private Instant retidoEm;
```

Substituir factory única `calculado(...)` por duas factories ou uma factory comum com método de classificação. Preferência:

```java
public static Credito calculado(...);

public static Credito retido(
        ...,
        MotivoRetencao motivoRetencao,
        Instant retidoEm);
```

Invariantes de domínio:

- `CALCULADO`: `motivoRetencao == null` e `retidoEm == null`
- `RETIDO`: `motivoRetencao != null` e `retidoEm != null`
- `valorCredito`, `valorObra`, `percentualAplicado` e `pontosObra` continuam obrigatórios para ambos.

### ResumoCalculo

Estender o record:

```java
public record ResumoCalculo(
        BigDecimal verbaLiquida,
        int totalExecucoes,
        BigDecimal totalPontos,
        int totalObras,
        int totalCreditos,
        BigDecimal valorTotalCalculado,
        int totalCreditosRetidos,
        BigDecimal valorTotalRetido,
        Instant calculadoEm) { }
```

`valorTotalCalculado` continua sendo a soma de todos os créditos, inclusive retidos. `valorTotalRetido` é subtotal dos créditos com `status=RETIDO`.

### Regra de Classificação

Adicionar função privada em `CalculadoraCreditos`:

```java
private Optional<MotivoRetencao> motivoRetencao(
        ObraOwnership obra,
        ParticipacaoOwnership participacao) {
    String statusObra = normalize(obra.status());
    if ("BLOQUEADA".equals(statusObra)) {
        return Optional.of(MotivoRetencao.OBRA_BLOQUEADA);
    }
    if ("PENDENTE".equals(statusObra)) {
        return Optional.of(MotivoRetencao.OBRA_PENDENTE);
    }
    if ("DEPURADA".equals(statusObra) || "DOMINIO_PUBLICO".equals(statusObra)) {
        throw new PreRequisitosException("Obra não distribuível: " + obra.obraId());
    }
    if (!"LIBERADA".equals(statusObra) && !"LIBERADO".equals(statusObra)) {
        throw new PreRequisitosException("Status de obra desconhecido para distribuição: " + obra.status());
    }
    if (!hasText(participacao.associacaoSigla())) {
        return Optional.of(MotivoRetencao.TITULAR_SEM_ASSOCIACAO);
    }
    return Optional.empty();
}
```

Notas:

- Aceitar `LIBERADA` e `LIBERADO` defensivamente porque há lacuna documentada de nomenclatura de status entre fluxos.
- A precedência do PRD deve ser respeitada: obra bloqueada, obra pendente, titular sem associação.
- A função deve ser chamada no momento de criar cada `Credito`, depois da alocação monetária.

---

## Backend — Infra e Persistência

### Migration

Criar `V6__add_creditos_retencao.sql` em `distribuicao-infra/src/main/resources/db/migration/`:

```sql
ALTER TABLE distribuicao.creditos
    ADD COLUMN motivo_retencao VARCHAR(40),
    ADD COLUMN retido_em TIMESTAMPTZ;

ALTER TABLE distribuicao.creditos
    ADD CONSTRAINT ck_creditos_retencao_status
    CHECK (
        (status = 'RETIDO' AND motivo_retencao IS NOT NULL AND retido_em IS NOT NULL)
        OR
        (status <> 'RETIDO' AND motivo_retencao IS NULL AND retido_em IS NULL)
    );

ALTER TABLE distribuicao.creditos
    ADD CONSTRAINT ck_creditos_motivo_retencao
    CHECK (
        motivo_retencao IS NULL
        OR motivo_retencao IN ('OBRA_PENDENTE', 'OBRA_BLOQUEADA', 'TITULAR_SEM_ASSOCIACAO')
    );

ALTER TABLE distribuicao.processos
    ADD COLUMN total_creditos_retidos INTEGER,
    ADD COLUMN valor_total_retido DECIMAL(15,2);

CREATE INDEX ix_creditos_processo_status
    ON distribuicao.creditos (processo_id, status);

CREATE INDEX ix_creditos_processo_motivo_retencao
    ON distribuicao.creditos (processo_id, motivo_retencao)
    WHERE motivo_retencao IS NOT NULL;
```

### ProcessoDistribuicao

Estender `marcarCalculado(...)` para receber e persistir:

- `totalCreditosRetidos`
- `valorTotalRetido`

Manter a transição `CRIADO -> CALCULADO` inalterada.

### Repositório de Créditos

Estender `CreditoFiltro`:

```java
public record CreditoFiltro(
        UUID processoId,
        CategoriaCredito categoria,
        UUID titularId,
        UUID obraId,
        StatusCredito status,
        MotivoRetencao motivoRetencao) { }
```

Atualizar `JpaCreditoRepository.findByProcessoId(...)` para adicionar filtros opcionais:

- `status`
- `motivoRetencao`

Atualizar projeção `CalculoResumoProjection` e query de resumo para retornar:

- `totalCreditosRetidos`
- `valorTotalRetido`

---

## Backend — ACL Cadastro

### DTOs do Client

Estender records internos em `HttpCadastroOwnershipClient`:

```java
private record CadastroObraResponse(
        UUID obraId,
        String titulo,
        String status,
        List<CadastroTitularidadeResponse> titularidades) { }

private record CadastroTitularidadeResponse(
        UUID titularId,
        String nome,
        String associacaoSigla,
        BigDecimal percentual) { }

private record CadastroFonogramaResponse(
        UUID fonogramaId,
        UUID obraId,
        String status,
        List<CadastroParticipacaoResponse> participacoes) { }

private record CadastroParticipacaoResponse(
        UUID titularId,
        String nome,
        String associacaoSigla,
        String categoria,
        BigDecimal percentual) { }
```

Mapear `status` e `associacaoSigla` para os domain records. Se `status` vier nulo/blank, lançar `CadastroIntegrationException` ou `PreRequisitosException` conforme padrão atual de contrato inválido.

### Compatibilidade com Cadastro

O endpoint de Cadastro já retorna:

- `ObraOwnershipSnapshotResponse.Status`
- `TitularidadeOwnershipSnapshotResponse.AssociacaoSigla`
- `FonogramaOwnershipSnapshotResponse.Status`
- `ParticipacaoOwnershipSnapshotResponse.AssociacaoSigla`

Não há necessidade de alterar o serviço Cadastro para F04.

---

## Backend — Application

### CalcularProcessoCommandHandler

Atualizar handler para:

1. Receber `ResultadoCalculo` com créditos calculados/retidos.
2. Persistir todos os créditos com `creditoRepository.saveAll(...)`.
3. Chamar `processo.marcarCalculado(...)` com totais retidos.
4. Incluir totais retidos no payload de `distribuicao.processo.calculado`.
5. Salvar um `OutboxEvent` `distribuicao.credito.retido` para cada crédito retido.
6. Incluir totais retidos no `dataChange.after` de auditoria.
7. Registrar métricas/logs de retenção.

### Evento `distribuicao.credito.retido`

Adicionar builder privado:

```java
private String criarPayloadCreditoRetido(
        ProcessoDistribuicao processo,
        Credito credito) { ... }
```

Payload:

```json
{
  "creditoId": "uuid",
  "processoId": "uuid",
  "rubricaSigla": "RADIO",
  "periodo": "2026-03",
  "titularId": "uuid",
  "titularNome": "Maria Compositora",
  "obraId": "uuid",
  "obraTitulo": "Meu Bem Querer",
  "fonogramaId": null,
  "categoria": "AUTORAL",
  "subcategoriaConexa": null,
  "valorCredito": 400.00,
  "motivoRetencao": "TITULAR_SEM_ASSOCIACAO",
  "retidoEm": "2026-05-17T14:30:00Z"
}
```

Usar `OutboxEvent.criar("distribuicao.credito.retido", credito.getId().toString(), payload)`.

### Métricas e Logs

Adicionar métricas:

| Métrica | Tipo | Tags | Descrição |
|---|---|---|---|
| `distribuicao.retencao.creditos.generated` | Counter | `motivo` | Quantidade de créditos retidos gerados |
| `distribuicao.retencao.valor.total` | DistributionSummary | `motivo` | Valor retido por motivo |

Log de sucesso do cálculo deve incluir:

```text
totalCreditosRetidos={} valorTotalRetido={}
```

---

## Backend — API

### Query Params

Atualizar `ProcessoCalculoController.consultar(...)`:

```java
@RequestParam(required = false) String status,
@RequestParam(required = false) String motivoRetencao
```

Parsing:

- `status`: converter para `StatusCredito`; inválido retorna `400 Bad Request` ou `422 Unprocessable Entity` conforme padrão atual do controller.
- `motivoRetencao`: converter para `MotivoRetencao`.

### DTOs

Atualizar `CalcularProcessoResponse`:

- `totalCreditosRetidos`
- `valorTotalRetido`

Atualizar `CalculoProcessoResponse.CalculoResumoResponse`:

- `totalCreditosRetidos`
- `valorTotalRetido`

Atualizar `CalculoProcessoResponse.CreditoItemResponse`:

- `motivoRetencao`
- `retidoEm`

### Contrato da Resposta

Exemplo parcial:

```json
{
  "processoId": "4e5af094-81b8-404e-8324-82b795395d2c",
  "status": "CALCULADO",
  "rubricaSigla": "RADIO",
  "periodo": "2026-03",
  "resumo": {
    "verbaLiquida": 85000.00,
    "totalExecucoes": 1200,
    "totalPontos": 1200.000000,
    "totalObras": 80,
    "totalCreditos": 240,
    "valorTotalCalculado": 85000.00,
    "totalCreditosRetidos": 12,
    "valorTotalRetido": 3210.75,
    "calculadoEm": "2026-05-17T14:30:00Z"
  },
  "creditos": {
    "items": [
      {
        "id": "1b2f7f61-b2ac-4c69-81b5-85f6e8c1b553",
        "status": "RETIDO",
        "motivoRetencao": "TITULAR_SEM_ASSOCIACAO",
        "retidoEm": "2026-05-17T14:30:00Z"
      }
    ],
    "metadata": {
      "page": 0,
      "size": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

## Frontend

### Guia Visual Obrigatório

Todas as tarefas de tela geradas a partir desta tech spec devem referenciar explicitamente `mcad/frontend/DESIGN.md`.

Aplicação prática nas telas:

- Usar tokens existentes (`--color-bg-*`, `--color-text-*`, `--font-mono`, `--space-*`) em vez de cores literais.
- Preservar o padrão dark-first "Circuit Core Dark".
- Para tabelas, seguir a seção **Data Tables** do `DESIGN.md`: alta densidade, números em `--font-mono`, separação por superfície/ritmo, sem decoração desnecessária.
- Evitar novas bordas sólidas decorativas; quando a implementação existente já usa borda em tabela, não ampliar o padrão sem necessidade.
- Cards/resumos devem usar layering tonal, não gradientes.

### Tipos

Atualizar `frontend/src/features/distribuicao/processos/types/calculo.ts`:

```typescript
export type StatusCredito = 'CALCULADO' | 'RETIDO' | 'LIBERADO';

export type MotivoRetencao =
  | 'OBRA_PENDENTE'
  | 'OBRA_BLOQUEADA'
  | 'TITULAR_SEM_ASSOCIACAO';

export interface CalculoProcessoResumo {
  verbaLiquida: string;
  totalExecucoes: number | null;
  totalPontos: string | null;
  totalObras: number | null;
  totalCreditos: number | null;
  valorTotalCalculado: string | null;
  totalCreditosRetidos: number | null;
  valorTotalRetido: string | null;
  calculadoEm: string | null;
}

export interface CreditoCalculo {
  // campos existentes...
  status: StatusCredito;
  motivoRetencao: MotivoRetencao | null;
  retidoEm: string | null;
}

export interface CalculoProcessoFilters {
  page?: number;
  size?: number;
  categoria?: CategoriaCredito | '';
  titularId?: string;
  obraId?: string;
  status?: StatusCredito | '';
  motivoRetencao?: MotivoRetencao | '';
}
```

Observação: na entrega isolada da F04, o backend retornaria apenas `CALCULADO` e `RETIDO`. Na codebase atual, manter `LIBERADO` porque a F05 já adicionou a liberação de retidos.

### API Client

Atualizar `processosCalculoApi.ts`:

```typescript
appendParam(params, 'status', filters.status);
appendParam(params, 'motivoRetencao', filters.motivoRetencao);
```

### Formatters

Atualizar `calculoFormatters.ts`:

```typescript
export function formatMotivoRetencao(motivo: MotivoRetencao | null): string {
  if (!motivo) return '-';
  const labels: Record<MotivoRetencao, string> = {
    OBRA_PENDENTE: 'Obra pendente',
    OBRA_BLOQUEADA: 'Obra bloqueada',
    TITULAR_SEM_ASSOCIACAO: 'Titular sem associação',
  };
  return labels[motivo] ?? motivo;
}
```

### CalculoSummary

Atualizar `CalculoSummary.tsx` para mostrar:

- `Créditos retidos`
- `Valor retido`

O valor retido deve ser subtotal informativo, não desconto do total calculado.

Design:

- Manter grid compacto de métricas.
- Usar `--font-mono` nos valores monetários e numéricos.
- Para `Valor retido`, usar cor de warning (`--color-warning`) com moderação, sem criar card isolado fora do padrão.
- Referência obrigatória para a task de tela: `mcad/frontend/DESIGN.md`, seções **Cores**, **Tipografia**, **Data Tables** e **Do's and Don'ts**.

### CreditosFilters

Adicionar filtros:

- Status: `Todos`, `Calculado`, `Retido`
- Motivo: `Todos`, `Obra pendente`, `Obra bloqueada`, `Titular sem associação`

Regras:

- Resetar página para 0 ao alterar filtros, mantendo comportamento atual.
- O filtro motivo pode ficar habilitado sempre; se status `CALCULADO` + motivo for enviado, backend retornará vazio.
- Usar `select` nativo como os filtros atuais, preservando densidade visual.
- Referência obrigatória para a task de tela: `mcad/frontend/DESIGN.md`, seções **Inputs** e **Espaçamento**.

### CreditosTable

Atualizar colunas:

- Adicionar coluna `Motivo` após `Status`.
- Mostrar `formatMotivoRetencao(credito.motivoRetencao)`.
- Badge de status:
  - `CALCULADO`: `success`
  - `RETIDO`: `warning`

Se o componente `Badge` não tiver variante `warning`, criar extensão mínima no componente compartilhado ou usar variante existente com classe local específica. Não usar cor literal.

Design:

- Manter tabela densa.
- Manter valores monetários e percentuais com `--font-mono`.
- Evitar truncar motivo de retenção em telas desktop.
- Se a largura mínima da tabela aumentar, ajustar `min-width` sem quebrar responsividade.
- Referência obrigatória para a task de tela: `mcad/frontend/DESIGN.md`, seção **Data Tables**.

### ProcessoCalculoPage

Atualizar estado de filtros:

```typescript
interface UiFilters {
  categoria: CategoriaCredito | '';
  titularId: string;
  obraId: string;
  status: StatusCredito | '';
  motivoRetencao: MotivoRetencao | '';
}
```

Atualizar `queryFilters` para passar `status` e `motivoRetencao`.

Texto da seção pode continuar "Créditos calculados", pois créditos retidos fazem parte do cálculo. Evitar texto instrucional longo em tela.

---

## Permissionamento e Auditoria

### Permissionamento

Nenhuma key nova em `permissions.yaml`.

| Ação | Permission existente |
|---|---|
| Calcular e gerar retenções | `distribuicao:default:processo:calcular` |
| Consultar resumo/lista de retenções | `distribuicao:default:processo:visualizar` |

Manter `@RequiresPermission` nos endpoints atuais.

### Auditoria

Atualizar o payload de `dataChange.after` no cálculo para incluir:

```json
{
  "totalCreditosRetidos": 12,
  "valorTotalRetido": "3210.75"
}
```

Não criar `userAction` separado para cada crédito retido. A ação auditável do usuário é o cálculo do processo.

---

## Testes

### Unitários Backend

| Classe | Cenários |
|---|---|
| `CalculadoraCreditosTest` | crédito sem pendência fica `CALCULADO`; obra `PENDENTE` retém todos os créditos da obra; obra `BLOQUEADA` tem precedência sobre titular sem associação; titular sem associação retém apenas seu crédito; `DOMINIO_PUBLICO` e `DEPURADA` falham |
| `CreditoTest` | invariantes de `CALCULADO` e `RETIDO`; motivo/data obrigatórios para retido |
| `HttpCadastroOwnershipClientTest` | mapeia `status` e `associacaoSigla`; `associacaoSigla=null` é aceito; `status` ausente falha |
| `CalcularProcessoCommandHandlerTest` | salva eventos `distribuicao.credito.retido`; atualiza totais retidos; auditoria inclui totais |
| `JpaCreditoRepositoryTest` | filtros por `status` e `motivoRetencao` |

### Integração Backend

| Teste | Cenário |
|---|---|
| `CalcularProcessoRetencaoIntegrationTest` | cálculo com créditos mistos persiste `CALCULADO` e `RETIDO`, campos de retenção e totais no processo |
| `ProcessoCalculoControllerIntegrationTest` | `GET /calculo?status=RETIDO`, `GET /calculo?motivoRetencao=...`, response contém novos campos |
| `OutboxRetencaoIntegrationTest` | um evento `distribuicao.credito.retido` por crédito retido |
| `ProcessoAuditOutboxIntegrationTest` | cálculo grava `dataChange.after.totalCreditosRetidos` e `valorTotalRetido` |

Nota: há dívida conhecida de Testcontainers/Docker no domínio Distribuição. Se os ITs continuarem bloqueados pela infraestrutura já documentada, registrar no relatório da task e rodar os unitários correspondentes.

### Frontend

| Arquivo | Cenários |
|---|---|
| `calculoFormatters.test.ts` | labels de `MotivoRetencao`; status `RETIDO` |
| `CreditosFilters.test.tsx` | altera status/motivo e chama `onChange`; mantém filtros existentes |
| `CreditosTable.test.tsx` | mostra badge `Retido`, motivo, data quando aplicável; créditos calculados mostram motivo `-` |
| `CalculoSummary.test.tsx` | mostra `Créditos retidos` e `Valor retido` com formatação BRL |
| `ProcessoCalculoPage.test.tsx` | envia filtros `status` e `motivoRetencao` para hook/API |

Todas as tasks de frontend devem citar `mcad/frontend/DESIGN.md` e validar que os CSS Modules usam tokens do design system, não cores literais.

---

## Inventário de Artefatos

### Backend — Criar

| Caminho | Tipo | Descrição |
|---|---|---|
| `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/enums/MotivoRetencao.java` | Enum | Motivos `OBRA_PENDENTE`, `OBRA_BLOQUEADA`, `TITULAR_SEM_ASSOCIACAO` |
| `services/distribuicao-api/distribuicao-infra/src/main/resources/db/migration/V6__add_creditos_retencao.sql` | Migration | Campos de retenção, constraints e índices |
| `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/unit/CalculadoraRetencaoTest.java` | Teste | Cenários de retenção no cálculo |
| `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/integration/CalcularProcessoRetencaoIntegrationTest.java` | Teste | Persistência e resumo de retenções |

### Backend — Modificar

| Caminho | Alteração |
|---|---|
| `distribuicao-domain/.../enums/StatusCredito.java` | Adicionar `RETIDO` |
| `distribuicao-domain/.../entities/Credito.java` | Campos/factories de retenção |
| `distribuicao-domain/.../entities/ProcessoDistribuicao.java` | Totais de retenção no cálculo |
| `distribuicao-domain/.../calculo/ObraOwnership.java` | Adicionar `status` |
| `distribuicao-domain/.../calculo/FonogramaOwnership.java` | Adicionar `status` |
| `distribuicao-domain/.../calculo/ParticipacaoOwnership.java` | Adicionar `associacaoSigla` |
| `distribuicao-domain/.../calculo/CalculadoraCreditos.java` | Classificação de retenção |
| `distribuicao-domain/.../calculo/ResumoCalculo.java` | Totais retidos |
| `distribuicao-domain/.../filters/CreditoFiltro.java` | Filtros `status` e `motivoRetencao` |
| `distribuicao-domain/.../projections/CalculoResumoProjection.java` | Novos campos de resumo |
| `distribuicao-application/.../commands/handlers/CalcularProcessoCommandHandler.java` | Persistência, outbox e auditoria de retenção |
| `distribuicao-application/.../dto/CalcularProcessoResponse.java` | Novos campos de resumo |
| `distribuicao-application/.../dto/CalculoProcessoResponse.java` | Novos campos por crédito e resumo |
| `distribuicao-api/.../controllers/ProcessoCalculoController.java` | Query params `status` e `motivoRetencao` |
| `distribuicao-infra/.../cadastro/HttpCadastroOwnershipClient.java` | Mapear `status` e `associacaoSigla` |
| `distribuicao-infra/.../persistence/JpaCreditoRepository.java` | Filtros e projeção do resumo |

### Frontend — Modificar

| Caminho | Alteração |
|---|---|
| `frontend/src/features/distribuicao/processos/types/calculo.ts` | `MotivoRetencao`, campos retidos, filtros |
| `frontend/src/features/distribuicao/processos/api/processosCalculoApi.ts` | Enviar `status` e `motivoRetencao` |
| `frontend/src/features/distribuicao/processos/utils/calculoFormatters.ts` | `formatMotivoRetencao`, labels de status |
| `frontend/src/features/distribuicao/processos/components/CalculoSummary.tsx` | Métricas de retenção |
| `frontend/src/features/distribuicao/processos/components/CalculoSummary.module.css` | Ajustes com tokens de `frontend/DESIGN.md` |
| `frontend/src/features/distribuicao/processos/components/CreditosFilters.tsx` | Filtros status/motivo |
| `frontend/src/features/distribuicao/processos/components/CreditosFilters.module.css` | Ajustes com tokens de `frontend/DESIGN.md` |
| `frontend/src/features/distribuicao/processos/components/CreditosTable.tsx` | Coluna motivo e badge `RETIDO` |
| `frontend/src/features/distribuicao/processos/components/CreditosTable.module.css` | Ajuste de largura/tokens seguindo `frontend/DESIGN.md` |
| `frontend/src/features/distribuicao/processos/pages/ProcessoCalculoPage.tsx` | Estado dos novos filtros |

---

## Quebra Sugerida de Tasks

| Task | Escopo | Observação |
|---|---|---|
| 1.0 | Backend domain: enums, ownership records, `Credito`, `ResumoCalculo` | Sem Spring; foco em unit tests |
| 2.0 | Calculadora de retenção | Cobrir precedência e valores monetários |
| 3.0 | Migration + JPA + filtros de repository | Incluir constraints de integridade |
| 4.0 | ACL Cadastro + testes de client | Não alterar Cadastro se contrato atual já atende |
| 5.0 | Handler de cálculo + outbox + auditoria | Um evento por crédito retido |
| 6.0 | API response/query params + controller tests | `status` e `motivoRetencao` |
| 7.0 | Tela de cálculo: tipos, API, filtros, resumo, tabela | **Referenciar `mcad/frontend/DESIGN.md` na task** |
| 8.0 | Testes frontend e revisão visual | **Referenciar `mcad/frontend/DESIGN.md`; validar tokens e tabela dark-first** |

---

## Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| Contrato de status de obra divergir (`LIBERADO` vs `LIBERADA`) | Normalizar defensivamente no cálculo e cobrir ambos em teste |
| Crédito retido com múltiplas pendências perder motivo secundário | F05 sempre reavalia Cadastro antes de liberar; motivo principal é suficiente para F04 |
| Evento por crédito retido aumentar volume de outbox | Volume da PoC é baixo; evento unitário melhora idempotência e Analytics |
| UI ficar larga demais com nova coluna | Ajustar `min-width` da tabela e manter scroll horizontal existente |
| Testcontainers bloquear ITs | Registrar bloqueio e garantir cobertura unitária dos caminhos críticos |

---

*Tech Spec implementada. Manter como referência técnica da F04; evoluções de liberação ficam documentadas na F05.*
