# Tech Spec — F05: Liberação de Créditos Retidos

> **PRD:** `tasks/distribuicao/prd-liberacao-creditos-retidos/prd.md`
> **Domínio:** Distribuição (D04)
> **Data:** 2026-05-17
> **Status:** `implemented`
> **Referências:** `vision.md`, `domains/distribuicao/domain.md`, `tasks/distribuicao/prd-retencao-creditos/prd.md`, `tasks/distribuicao/prd-retencao-creditos/techspec.md`, `mcad/frontend/DESIGN.md`

---

## Implementação

Implementado em 2026-05-17.

Artefatos principais entregues:

- migration `V7__add_creditos_liberacao.sql`, com ciclo `CALCULADO`/`RETIDO`/`LIBERADO`, tabela `credito_liberacoes` e histórico `credito_retido_reavaliacoes`;
- entidades, enums e repositórios de liberação e reavaliação;
- `CreditoRetidoLiberacaoService` para previsão, efetivação e cancelamento;
- integração nos handlers de cálculo, finalização e cancelamento;
- payloads de outbox e auditoria com totais de retidos liberados;
- seção `retidosLiberados` no contrato de `GET /api/v1/processos/{id}/calculo`;
- frontend com resumo, filtro `LIBERADO`, `RetidosLiberadosTable` e renderização na página de cálculo.

Verificações executadas:

- `rtk mvn -pl distribuicao-tests -am -DskipTests compile`;
- `rtk mvn -pl distribuicao-tests -am -Dtest=CalcularProcessoCommandHandlerTest,TransicoesCommandHandlerTest,ConsultarCalculoProcessoQueryHandlerTest -Dsurefire.failIfNoSpecifiedTests=false test`;
- `rtk mvn -pl distribuicao-tests -am -Dtest=CreditoRetidoLiberacaoServiceTest,TransicoesCommandHandlerTest -Dsurefire.failIfNoSpecifiedTests=false test`;
- `rtk npm run build`;
- `rtk npm test -- src/features/distribuicao/processos/components/CalculoSummary.test.tsx src/features/distribuicao/processos/components/CreditosFilters.test.tsx src/features/distribuicao/processos/components/CreditosTable.test.tsx src/features/distribuicao/processos/components/RetidosLiberadosTable.test.tsx src/features/distribuicao/processos/pages/ProcessoCalculoPage.test.tsx src/features/distribuicao/processos/utils/calculoFormatters.test.ts`.

## Resumo Executivo

Esta feature estende a F04 para liberar créditos retidos quando as pendências cadastrais forem resolvidas. A liberação acontece dentro do fluxo existente de Processo de Distribuição:

1. `POST /api/v1/processos/{id}/calcular` continua calculando créditos do período atual.
2. No mesmo comando, o sistema busca créditos `RETIDO` de processos `FINALIZADO` anteriores da mesma rubrica.
3. O sistema consulta o Cadastro em batch pelo ownership snapshot e cria liberações `PREVISTA` para créditos elegíveis.
4. `POST /api/v1/processos/{id}/finalizar` efetiva as liberações previstas, muda o crédito original para `LIBERADO` e publica `distribuicao.credito.liberado`.
5. `POST /api/v1/processos/{id}/cancelar` cancela liberações previstas e preserva os créditos originais como `RETIDO`.

Não há endpoint novo de escrita. A liberação é efeito dos comandos já existentes de cálculo, finalização e cancelamento.

---

## Arquitetura

### Fluxo de Cálculo com Liberação Prevista

```text
POST /api/v1/processos/{id}/calcular
        |
        v
CalcularProcessoCommandHandler
        |
        |-- calcula créditos atuais (F03/F04)
        |-- salva créditos CALCULADO/RETIDO do processo atual
        |-- busca créditos RETIDO candidatos de processos FINALIZADO anteriores
        |-- chama CadastroOwnershipClient.buscarOwnership(...) em batch
        |-- reavalia obra + titular/participação atual
        |-- salva CreditoLiberacao PREVISTA para elegíveis
        |-- salva CreditoRetidoReavaliacao para todos os candidatos avaliados (Should Have)
        |-- atualiza Processo com totais de retidos a liberar
        |-- salva outbox distribuicao.processo.calculado
        |-- salva auditoria do cálculo com totais de retidos a liberar
```

### Fluxo de Finalização com Efetivação

```text
POST /api/v1/processos/{id}/finalizar
        |
        v
FinalizarProcessoCommandHandler
        |
        |-- carrega Processo APROVADO
        |-- carrega CreditoLiberacao PREVISTA do processo
        |-- para cada liberação:
        |      |-- carrega crédito original RETIDO com lock
        |      |-- crédito.liberar(processoId, liberadoEm)
        |      |-- liberação.efetivar(liberadoEm)
        |      |-- salva outbox distribuicao.credito.liberado
        |
        |-- processo.finalizar()
        |-- salva outbox distribuicao.processo.finalizado com totais
        |-- salva outbox distribuicao.rol.processado
        |-- salva auditoria da finalização com totais liberados
```

### Decisões Técnicas

| Decisão | Justificativa |
|---|---|
| Liberação prevista no cálculo e efetiva na finalização | Mantém a máquina de estados atual e evita liberar créditos se o processo for cancelado |
| Nova entidade `CreditoLiberacao` | A liberação tem ciclo próprio (`PREVISTA`, `EFETIVADA`, `CANCELADA`) e precisa rastrear processo de origem e de liberação |
| Crédito original muda de `RETIDO` para `LIBERADO` apenas na finalização | Preserva o valor histórico e permite consulta simples por status |
| Valor liberado vem do crédito original | F05 não recalcula split, peso, percentual ou verba |
| Consulta ao Cadastro em batch | Mantém padrão da F03/F04 e evita chamada HTTP por crédito |
| Evento `distribuicao.credito.liberado` só na efetivação | Consumers recebem apenas liberações definitivas |
| Sem permissão nova | Ações continuam sendo calcular, finalizar, cancelar e visualizar processo |

---

## Backend — Domain

### Enums

Atualizar `StatusCredito`:

```java
public enum StatusCredito {
    CALCULADO,
    RETIDO,
    LIBERADO
}
```

Criar enum:

```java
public enum StatusLiberacaoCredito {
    PREVISTA,
    EFETIVADA,
    CANCELADA
}
```

Criar enum:

```java
public enum ResultadoReavaliacaoRetido {
    ELEGIVEL,
    OBRA_PENDENTE,
    OBRA_BLOQUEADA,
    TITULAR_SEM_ASSOCIACAO,
    OBRA_NAO_DISTRIBUIVEL,
    PARTICIPACAO_NAO_ENCONTRADA
}
```

### Entidade `Credito`

Estender `Credito` com campos de liberação:

```java
@Column(name = "liberado_em")
private Instant liberadoEm;

@Column(name = "processo_liberacao_id")
private UUID processoLiberacaoId;
```

Adicionar método de domínio:

```java
public void liberar(UUID processoLiberacaoId, Instant liberadoEm) {
    if (this.status != StatusCredito.RETIDO) {
        throw new TransicaoInvalidaException("Apenas crédito retido pode ser liberado");
    }
    this.status = StatusCredito.LIBERADO;
    this.processoLiberacaoId = Objects.requireNonNull(processoLiberacaoId);
    this.liberadoEm = Objects.requireNonNull(liberadoEm);
}
```

Invariantes:

- `CALCULADO`: `motivoRetencao == null`, `retidoEm == null`, `liberadoEm == null`, `processoLiberacaoId == null`
- `RETIDO`: `motivoRetencao != null`, `retidoEm != null`, `liberadoEm == null`, `processoLiberacaoId == null`
- `LIBERADO`: `motivoRetencao != null`, `retidoEm != null`, `liberadoEm != null`, `processoLiberacaoId != null`

> Atenção: a constraint `ck_creditos_retencao_status` criada na F04 precisa ser recriada. Ela hoje exige que todo status diferente de `RETIDO` tenha `motivo_retencao` e `retido_em` nulos, o que bloquearia `LIBERADO`.

### Entidade `CreditoLiberacao`

Criar entidade em `distribuicao-domain/.../entities/CreditoLiberacao.java`:

```java
@Entity
@Table(name = "credito_liberacoes", schema = "distribuicao")
public class CreditoLiberacao {
    @Id
    private UUID id;

    @Column(name = "credito_retido_id", nullable = false)
    private UUID creditoRetidoId;

    @Column(name = "processo_origem_id", nullable = false)
    private UUID processoOrigemId;

    @Column(name = "processo_liberacao_id", nullable = false)
    private UUID processoLiberacaoId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusLiberacaoCredito status;

    @Column(name = "valor_liberado", nullable = false, precision = 15, scale = 2)
    private BigDecimal valorLiberado;

    @Column(name = "motivo_retencao_original", nullable = false, length = 40)
    private MotivoRetencao motivoRetencaoOriginal;

    @Column(name = "avaliado_em", nullable = false)
    private Instant avaliadoEm;

    @Column(name = "efetivado_em")
    private Instant efetivadoEm;

    @Column(name = "cancelado_em")
    private Instant canceladoEm;
}
```

Factories/métodos:

- `CreditoLiberacao.prevista(Credito creditoRetido, ProcessoDistribuicao processoLiberacao, Instant avaliadoEm)`
- `efetivar(Instant efetivadoEm)`
- `cancelar(Instant canceladoEm)`

Invariantes:

- `PREVISTA`: `avaliadoEm != null`, `efetivadoEm == null`, `canceladoEm == null`
- `EFETIVADA`: `efetivadoEm != null`, `canceladoEm == null`
- `CANCELADA`: `canceladoEm != null`, `efetivadoEm == null`
- `valorLiberado == creditoRetido.valorCredito`

### Entidade `CreditoRetidoReavaliacao` (Should Have)

Criar entidade para registrar RF-17, inclusive candidatos não elegíveis:

```java
@Entity
@Table(name = "credito_retido_reavaliacoes", schema = "distribuicao")
public class CreditoRetidoReavaliacao {
    @Id
    private UUID id;
    private UUID creditoRetidoId;
    private UUID processoReavaliacaoId;
    private ResultadoReavaliacaoRetido resultado;
    private String detalhe;
    private Instant avaliadoEm;
}
```

Se a implementação inicial precisar reduzir escopo, manter a tabela fora do caminho crítico, mas a reavaliação deve ser logada com `creditoRetidoId`, `processoId`, `resultado` e `avaliadoEm`.

### ProcessoDistribuicao

Adicionar campos:

```java
@Column(name = "total_creditos_retidos_liberados")
private Integer totalCreditosRetidosLiberados;

@Column(name = "valor_total_retidos_liberados", precision = 15, scale = 2)
private BigDecimal valorTotalRetidosLiberados;
```

Estender `marcarCalculado(...)` para receber totais de liberação prevista:

```java
public void marcarCalculado(
        int totalExecucoes,
        int totalObras,
        BigDecimal totalPontos,
        int totalCreditos,
        BigDecimal valorTotalCalculado,
        int totalCreditosRetidos,
        BigDecimal valorTotalRetido,
        int totalCreditosRetidosLiberados,
        BigDecimal valorTotalRetidosLiberados)
```

Esses totais representam liberações previstas enquanto o processo está `CALCULADO` ou `APROVADO`, e liberações efetivadas quando o processo está `FINALIZADO`.

---

## Backend — Persistência

### Migration

Criar `V7__add_creditos_liberacao.sql` em `distribuicao-infra/src/main/resources/db/migration/`:

```sql
ALTER TABLE distribuicao.creditos
    ADD COLUMN liberado_em TIMESTAMPTZ,
    ADD COLUMN processo_liberacao_id UUID REFERENCES distribuicao.processos(id);

ALTER TABLE distribuicao.creditos
    DROP CONSTRAINT ck_creditos_retencao_status;

ALTER TABLE distribuicao.creditos
    ADD CONSTRAINT ck_creditos_lifecycle_status
    CHECK (
        (
            status = 'CALCULADO'
            AND motivo_retencao IS NULL
            AND retido_em IS NULL
            AND liberado_em IS NULL
            AND processo_liberacao_id IS NULL
        )
        OR
        (
            status = 'RETIDO'
            AND motivo_retencao IS NOT NULL
            AND retido_em IS NOT NULL
            AND liberado_em IS NULL
            AND processo_liberacao_id IS NULL
        )
        OR
        (
            status = 'LIBERADO'
            AND motivo_retencao IS NOT NULL
            AND retido_em IS NOT NULL
            AND liberado_em IS NOT NULL
            AND processo_liberacao_id IS NOT NULL
        )
    );

ALTER TABLE distribuicao.processos
    ADD COLUMN total_creditos_retidos_liberados INTEGER,
    ADD COLUMN valor_total_retidos_liberados DECIMAL(15,2);

CREATE TABLE distribuicao.credito_liberacoes (
    id                         UUID          PRIMARY KEY,
    credito_retido_id          UUID          NOT NULL REFERENCES distribuicao.creditos(id),
    processo_origem_id         UUID          NOT NULL REFERENCES distribuicao.processos(id),
    processo_liberacao_id      UUID          NOT NULL REFERENCES distribuicao.processos(id),
    status                     VARCHAR(20)   NOT NULL,
    valor_liberado             DECIMAL(15,2) NOT NULL,
    motivo_retencao_original   VARCHAR(40)   NOT NULL,
    avaliado_em                TIMESTAMPTZ   NOT NULL,
    efetivado_em               TIMESTAMPTZ,
    cancelado_em               TIMESTAMPTZ,
    CONSTRAINT ck_credito_liberacoes_status
        CHECK (status IN ('PREVISTA', 'EFETIVADA', 'CANCELADA')),
    CONSTRAINT ck_credito_liberacoes_datas
        CHECK (
            (status = 'PREVISTA' AND efetivado_em IS NULL AND cancelado_em IS NULL)
            OR (status = 'EFETIVADA' AND efetivado_em IS NOT NULL AND cancelado_em IS NULL)
            OR (status = 'CANCELADA' AND efetivado_em IS NULL AND cancelado_em IS NOT NULL)
        )
);

CREATE UNIQUE INDEX ux_credito_liberacoes_credito_nao_cancelada
    ON distribuicao.credito_liberacoes (credito_retido_id)
    WHERE status IN ('PREVISTA', 'EFETIVADA');

CREATE INDEX ix_credito_liberacoes_processo_liberacao
    ON distribuicao.credito_liberacoes (processo_liberacao_id, status);

CREATE INDEX ix_creditos_liberacao
    ON distribuicao.creditos (processo_liberacao_id, status)
    WHERE processo_liberacao_id IS NOT NULL;

CREATE TABLE distribuicao.credito_retido_reavaliacoes (
    id                       UUID          PRIMARY KEY,
    credito_retido_id        UUID          NOT NULL REFERENCES distribuicao.creditos(id),
    processo_reavaliacao_id  UUID          NOT NULL REFERENCES distribuicao.processos(id),
    resultado                VARCHAR(40)   NOT NULL,
    detalhe                  VARCHAR(500),
    avaliado_em              TIMESTAMPTZ   NOT NULL,
    CONSTRAINT ck_credito_retido_reavaliacoes_resultado
        CHECK (resultado IN (
            'ELEGIVEL',
            'OBRA_PENDENTE',
            'OBRA_BLOQUEADA',
            'TITULAR_SEM_ASSOCIACAO',
            'OBRA_NAO_DISTRIBUIVEL',
            'PARTICIPACAO_NAO_ENCONTRADA'
        ))
);

CREATE INDEX ix_credito_reavaliacoes_credito
    ON distribuicao.credito_retido_reavaliacoes (credito_retido_id, avaliado_em DESC);
```

### Repositories

Criar interfaces:

```java
public interface CreditoLiberacaoRepository {
    List<Credito> findCandidatosRetidos(UUID processoAtualId, String rubricaSigla, String periodo);
    List<CreditoLiberacao> findPrevistasByProcessoLiberacaoId(UUID processoId);
    List<CreditoLiberacao> saveAll(List<CreditoLiberacao> liberacoes);
    void cancelarPrevistasByProcessoLiberacaoId(UUID processoId, Instant canceladoEm);
}
```

```java
public interface CreditoRetidoReavaliacaoRepository {
    List<CreditoRetidoReavaliacao> saveAll(List<CreditoRetidoReavaliacao> reavaliacoes);
}
```

Implementar em `JpaCreditoLiberacaoRepository` e `JpaCreditoRetidoReavaliacaoRepository`.

#### Query de Candidatos

Usar JPQL ou SQL nativo. Critérios:

- `credito.status = RETIDO`
- processo de origem `status = FINALIZADO`
- processo de origem `rubricaSigla = processoAtual.rubricaSigla`
- processo de origem `periodo < processoAtual.periodo`
- não existe liberação com `status IN (PREVISTA, EFETIVADA)` para o crédito

Para reduzir corrida entre processos concorrentes, preferir SQL nativo com lock quando viável:

```sql
SELECT c.*
FROM distribuicao.creditos c
JOIN distribuicao.processos p ON p.id = c.processo_id
WHERE c.status = 'RETIDO'
  AND p.status = 'FINALIZADO'
  AND p.rubrica_sigla = :rubricaSigla
  AND p.periodo < :periodo
  AND NOT EXISTS (
      SELECT 1
      FROM distribuicao.credito_liberacoes l
      WHERE l.credito_retido_id = c.id
        AND l.status IN ('PREVISTA', 'EFETIVADA')
  )
ORDER BY p.periodo ASC, c.criado_em ASC, c.id ASC
FOR UPDATE SKIP LOCKED
```

Se JPQL for usado, manter o índice único parcial como barreira final de idempotência.

---

## Backend — Serviço de Liberação

Criar `CreditoRetidoLiberacaoService` em `distribuicao-application` ou `distribuicao-domain` com dependências de repository e `CadastroOwnershipClient`.

### API Interna

```java
public ResultadoLiberacaoRetidos preverLiberacoes(
        ProcessoDistribuicao processo,
        String bearerToken);

public ResultadoLiberacaoRetidos efetivarLiberacoes(
        ProcessoDistribuicao processo,
        Instant liberadoEm);

public void cancelarLiberacoesPrevistas(
        UUID processoId,
        Instant canceladoEm);
```

Records:

```java
public record ResultadoLiberacaoRetidos(
        List<CreditoLiberacao> liberacoes,
        List<CreditoRetidoReavaliacao> reavaliacoes,
        int total,
        BigDecimal valorTotal) { }
```

### Reavaliação

Algoritmo:

1. Buscar candidatos retidos.
2. Coletar `obraIds` e `fonogramaIds` distintos.
3. Chamar `CadastroOwnershipClient.buscarOwnership(obraIds, fonogramaIds, bearerToken)`.
4. Para cada crédito:
   - localizar obra no snapshot;
   - normalizar status da obra;
   - localizar participação autoral ou conexa do titular;
   - validar `associacaoSigla`;
   - produzir `ResultadoReavaliacaoRetido`.
5. Para `ELEGIVEL`, criar `CreditoLiberacao.prevista(...)`.
6. Persistir `CreditoRetidoReavaliacao` para todos os candidatos avaliados.
7. Retornar totais apenas das liberações previstas.

Regras:

- Status distribuível: `LIBERADA` ou `LIBERADO`.
- `PENDENTE` mantém resultado `OBRA_PENDENTE`.
- `BLOQUEADA` mantém resultado `OBRA_BLOQUEADA`.
- `DEPURADA`, `DOMINIO_PUBLICO`, obra não encontrada ou status desconhecido geram `OBRA_NAO_DISTRIBUIVEL`.
- Titular não encontrado na titularidade/participação atual gera `PARTICIPACAO_NAO_ENCONTRADA`.
- Titular com `associacaoSigla` nulo/blank gera `TITULAR_SEM_ASSOCIACAO`.
- Crédito conexo exige `fonogramaId` e participação do titular no fonograma original.

### Idempotência

- Antes de recalcular um processo `CRIADO`, chamar `cancelarLiberacoesPrevistas(processoId, now)` para remover previsões antigas do mesmo processo, se existirem por retry técnico.
- A unique index `ux_credito_liberacoes_credito_nao_cancelada` impede duas liberações ativas para o mesmo crédito.
- Em caso de colisão de constraint, recarregar candidatos e seguir sem duplicar.

---

## Backend — Application Handlers

### CalcularProcessoCommandHandler

Alterar o handler para:

1. Executar cálculo atual F03/F04 como hoje.
2. Cancelar previsões antigas do mesmo processo, por idempotência.
3. Persistir créditos atuais.
4. Chamar `creditoRetidoLiberacaoService.preverLiberacoes(processo, command.bearerToken())`.
5. Chamar `processo.marcarCalculado(...)` incluindo:
   - `totalCreditosRetidosLiberados`
   - `valorTotalRetidosLiberados`
6. Incluir os totais no payload de `distribuicao.processo.calculado`.
7. Incluir os totais no `dataChange.after` da auditoria.
8. Registrar métricas/logs.

Não publicar `distribuicao.credito.liberado` neste handler.

### FinalizarProcessoCommandHandler

Alterar o handler para:

1. Capturar snapshot `antes`.
2. Buscar liberações `PREVISTA` do processo.
3. Efetivar cada liberação:
   - carregar crédito original;
   - `credito.liberar(processo.getId(), liberadoEm)`;
   - `liberacao.efetivar(liberadoEm)`;
   - salvar crédito e liberação.
4. Gerar `distribuicao.credito.liberado` por liberação efetivada.
5. Chamar `processo.finalizar()`.
6. Publicar `distribuicao.processo.finalizado` com totais de retidos liberados.
7. Publicar `distribuicao.rol.processado` como hoje.
8. Auditar finalização com totais liberados.

### CancelarProcessoCommandHandler

Antes/depois de mudar o processo para `CANCELADO`, chamar:

```java
creditoRetidoLiberacaoService.cancelarLiberacoesPrevistas(
        processo.getId(),
        processo.getCanceladoEm());
```

Créditos originais não devem ser alterados.

### AprovarProcessoCommandHandler

Sem alteração funcional. O processo aprovado mantém liberações `PREVISTA` até a finalização.

---

## Backend — Eventos

### `distribuicao.credito.liberado`

Criar builder no `FinalizarProcessoCommandHandler` ou em factory dedicada:

```java
private String criarPayloadCreditoLiberado(
        ProcessoDistribuicao processoLiberacao,
        Credito creditoLiberado,
        CreditoLiberacao liberacao,
        ProcessoDistribuicao processoOrigem) { ... }
```

Payload:

```json
{
  "creditoId": "1b2f7f61-b2ac-4c69-81b5-85f6e8c1b553",
  "processoOrigemId": "4e5af094-81b8-404e-8324-82b795395d2c",
  "processoLiberacaoId": "604fe815-52c8-4ad6-a6f3-3f02ec55f922",
  "rubricaSigla": "RADIO",
  "periodoOrigem": "2026-03",
  "periodoLiberacao": "2026-04",
  "titularId": "9f0fdd3f-b4b1-4f51-bac1-62379d230e9a",
  "titularNome": "Maria Compositora",
  "obraId": "2f897625-0a2f-4f9c-9e7c-c21b9e4b34a5",
  "obraTitulo": "Meu Bem Querer",
  "fonogramaId": null,
  "categoria": "AUTORAL",
  "subcategoriaConexa": null,
  "valorLiberado": 400.00,
  "motivoRetencaoOriginal": "TITULAR_SEM_ASSOCIACAO",
  "retidoEm": "2026-05-17T14:30:00Z",
  "liberadoEm": "2026-06-10T18:45:00Z"
}
```

Usar `OutboxEventWriter.addEvent("distribuicao.credito.liberado", creditoId, payload)` ou `OutboxEvent.criar(...)`, seguindo o padrão do handler escolhido.

### Eventos de Processo

Estender payloads:

- `distribuicao.processo.calculado`
  - `totalCreditosRetidosLiberados`
  - `valorTotalRetidosLiberados`
- `distribuicao.processo.finalizado`
  - `totalCreditosRetidosLiberados`
  - `valorTotalRetidosLiberados`

---

## Backend — API

### DTOs

Atualizar `CalcularProcessoResponse`:

- `totalCreditosRetidosLiberados`
- `valorTotalRetidosLiberados`

Atualizar `CalculoProcessoResponse.CalculoResumoResponse`:

- `totalCreditosRetidosLiberados`
- `valorTotalRetidosLiberados`

Atualizar `CalculoProcessoResponse.CreditoItemResponse`:

- `liberadoEm`
- `processoLiberacaoId`

Adicionar seção no `CalculoProcessoResponse`:

```java
public record RetidosLiberadosResponse(
        List<RetidoLiberadoItemResponse> items,
        int total,
        BigDecimal valorTotal) { }

public record RetidoLiberadoItemResponse(
        UUID liberacaoId,
        UUID creditoId,
        UUID processoOrigemId,
        UUID processoLiberacaoId,
        String periodoOrigem,
        StatusLiberacaoCredito status,
        UUID titularId,
        String titularNome,
        UUID obraId,
        String obraTitulo,
        UUID fonogramaId,
        CategoriaCredito categoria,
        SubcategoriaConexa subcategoriaConexa,
        BigDecimal valorLiberado,
        MotivoRetencao motivoRetencaoOriginal,
        Instant retidoEm,
        Instant avaliadoEm,
        Instant efetivadoEm) { }
```

### Query Handler

Atualizar `ConsultarCalculoProcessoQueryHandler` para carregar:

- resumo do processo;
- créditos paginados atuais como hoje;
- liberações previstas/efetivadas do processo atual.

Não adicionar paginação de retidos liberados no MVP. Se o volume ficar alto, evoluir com query params separados (`retidosPage`, `retidosSize`) em F07.

### Contrato de Resposta

Exemplo parcial:

```json
{
  "processoId": "604fe815-52c8-4ad6-a6f3-3f02ec55f922",
  "status": "CALCULADO",
  "rubricaSigla": "RADIO",
  "periodo": "2026-04",
  "resumo": {
    "verbaLiquida": 85000.00,
    "totalCreditos": 240,
    "valorTotalCalculado": 85000.00,
    "totalCreditosRetidos": 12,
    "valorTotalRetido": 3210.75,
    "totalCreditosRetidosLiberados": 3,
    "valorTotalRetidosLiberados": 1250.00,
    "calculadoEm": "2026-06-10T18:30:00Z"
  },
  "retidosLiberados": {
    "total": 3,
    "valorTotal": 1250.00,
    "items": [
      {
        "liberacaoId": "d2f0d04c-6db7-4b0f-841d-a1c9891f1e2e",
        "creditoId": "1b2f7f61-b2ac-4c69-81b5-85f6e8c1b553",
        "processoOrigemId": "4e5af094-81b8-404e-8324-82b795395d2c",
        "processoLiberacaoId": "604fe815-52c8-4ad6-a6f3-3f02ec55f922",
        "periodoOrigem": "2026-03",
        "status": "PREVISTA",
        "titularNome": "Maria Compositora",
        "obraTitulo": "Meu Bem Querer",
        "valorLiberado": 400.00,
        "motivoRetencaoOriginal": "TITULAR_SEM_ASSOCIACAO",
        "retidoEm": "2026-05-17T14:30:00Z",
        "avaliadoEm": "2026-06-10T18:30:00Z",
        "efetivadoEm": null
      }
    ]
  }
}
```

---

## Frontend

### Guia Visual Obrigatório

Todas as tasks de frontend derivadas desta tech spec devem citar explicitamente `mcad/frontend/DESIGN.md`.

Aplicação prática:

- Seguir `mcad/frontend/DESIGN.md` para a tela de cálculo, especialmente **Cores**, **Tipografia**, **Espaçamento**, **Data Tables** e **Do's and Don'ts**.
- Usar tokens CSS existentes (`--color-bg-*`, `--color-text-*`, `--color-warning`, `--color-success`, `--font-mono`, `--space-*`).
- Não introduzir cores literais nos CSS Modules.
- Retidos a liberar devem aparecer em seção/tabela densa, sem cards decorativos soltos.
- Valores monetários, períodos e IDs devem usar `--font-mono`.
- Não criar botão "Liberar"; a ação continua sendo a finalização do processo.

### Tipos

Atualizar `frontend/src/features/distribuicao/processos/types/calculo.ts`:

```typescript
export type StatusProcesso =
  | 'CRIADO'
  | 'CALCULADO'
  | 'APROVADO'
  | 'FINALIZADO'
  | 'CANCELADO';

export type StatusCredito = 'CALCULADO' | 'RETIDO' | 'LIBERADO';

export type StatusLiberacaoCredito = 'PREVISTA' | 'EFETIVADA' | 'CANCELADA';

export interface CalculoProcessoResumo {
  // campos existentes...
  totalCreditosRetidosLiberados: number | null;
  valorTotalRetidosLiberados: string | null;
}

export interface CreditoCalculo {
  // campos existentes...
  liberadoEm: string | null;
  processoLiberacaoId: string | null;
}

export interface RetidoLiberadoItem {
  liberacaoId: string;
  creditoId: string;
  processoOrigemId: string;
  processoLiberacaoId: string;
  periodoOrigem: string;
  status: StatusLiberacaoCredito;
  titularId: string;
  titularNome: string;
  obraId: string;
  obraTitulo: string;
  fonogramaId: string | null;
  categoria: CategoriaCredito;
  subcategoriaConexa: SubcategoriaConexa | null;
  valorLiberado: string;
  motivoRetencaoOriginal: MotivoRetencao;
  retidoEm: string;
  avaliadoEm: string;
  efetivadoEm: string | null;
}

export interface RetidosLiberadosResponse {
  items: RetidoLiberadoItem[];
  total: number;
  valorTotal: string;
}

export interface CalculoProcessoResponse {
  // campos existentes...
  retidosLiberados: RetidosLiberadosResponse;
}
```

### Formatters

Atualizar `calculoFormatters.ts`:

```typescript
export function formatStatusCredito(status: StatusCredito): string {
  const labels: Record<StatusCredito, string> = {
    CALCULADO: 'Calculado',
    RETIDO: 'Retido',
    LIBERADO: 'Liberado',
  };
  return labels[status] ?? status;
}

export function formatStatusLiberacao(status: StatusLiberacaoCredito): string {
  const labels: Record<StatusLiberacaoCredito, string> = {
    PREVISTA: 'Previsto',
    EFETIVADA: 'Liberado',
    CANCELADA: 'Cancelado',
  };
  return labels[status] ?? status;
}
```

### CalculoSummary

Atualizar `CalculoSummary.tsx` para mostrar:

- `Créditos a liberar` / `Valor a liberar` quando processo estiver `CALCULADO` ou `APROVADO`.
- `Créditos liberados` / `Valor liberado` quando processo estiver `FINALIZADO`.

Design:

- Manter grid compacto de métricas.
- Usar `--font-mono` nos valores.
- Usar warning com moderação para `a liberar` e success para `liberado`.
- Referência obrigatória para a task: `mcad/frontend/DESIGN.md`, seções **Cores**, **Tipografia** e **Data Tables**.

### RetidosLiberadosTable

Criar:

- `frontend/src/features/distribuicao/processos/components/RetidosLiberadosTable.tsx`
- `frontend/src/features/distribuicao/processos/components/RetidosLiberadosTable.module.css`
- testes correspondentes.

Colunas:

- Período origem
- Titular
- Obra
- Fonograma
- Categoria
- Valor liberado
- Motivo original
- Status
- Retido em
- Avaliado/Efetivado em

Design:

- Seguir **Data Tables** do `mcad/frontend/DESIGN.md`.
- Tabela densa; sem gradientes; sem bordas sólidas novas.
- IDs curtos e valores monetários em `--font-mono`.
- Badge `PREVISTA` com tom warning, `EFETIVADA` com success e `CANCELADA` com muted/secondary.

### CreditosTable e Filtros

Atualizar `CreditosTable.tsx`:

- Badge `LIBERADO` com variante success.
- Mostrar `liberadoEm` quando status for `LIBERADO` se a coluna de data existir; se não, manter apenas na seção de retidos liberados para evitar excesso visual.

Atualizar `CreditosFilters.tsx`:

- Adicionar opção `Liberado` no filtro de status.
- Manter página resetada para 0 quando filtro muda.

### ProcessoCalculoPage

Atualizar página:

- Renderizar `RetidosLiberadosTable` abaixo do resumo e antes da tabela de créditos atuais.
- Título sugerido: `Retidos a liberar` antes da finalização e `Retidos liberados` após finalização.
- Evitar texto explicativo longo em tela; usar rótulos curtos.
- A página deve continuar escondendo ações por permission via `usePermissions`.

---

## Permissionamento e Auditoria

### Permissionamento

Nenhuma key nova em `permissions.yaml`.

| Ação | Permission existente |
|---|---|
| Calcular e prever liberações | `distribuicao:default:processo:calcular` |
| Finalizar e efetivar liberações | `distribuicao:default:processo:finalizar` |
| Cancelar previsões | `distribuicao:default:processo:cancelar` |
| Consultar liberações | `distribuicao:default:processo:visualizar` |

### Auditoria

Atualizar payload de cálculo:

```json
{
  "totalRetidosALiberar": 3,
  "valorTotalRetidosALiberar": "1250.00"
}
```

Atualizar payload de finalização:

```json
{
  "totalRetidosLiberados": 3,
  "valorTotalRetidosLiberados": "1250.00"
}
```

Não gerar `USER_ACTION` separado por crédito liberado. A ação auditável é a finalização do processo pelo Analista.

---

## Métricas e Logs

Adicionar métricas:

| Métrica | Tipo | Tags | Descrição |
|---|---|---|---|
| `distribuicao.liberacao.previstas.total` | Counter | `rubrica` | Quantidade de liberações previstas geradas |
| `distribuicao.liberacao.efetivadas.total` | Counter | `rubrica` | Quantidade de liberações efetivadas |
| `distribuicao.liberacao.valor` | DistributionSummary | `status`, `rubrica` | Valor previsto/efetivado |
| `distribuicao.liberacao.reavaliacao.total` | Counter | `resultado` | Resultado das reavaliações cadastrais |

Logs estruturados:

- `distribuicao.liberacao.previewed processoId={} total={} valorTotal={}`
- `distribuicao.liberacao.effective processoId={} total={} valorTotal={}`
- `distribuicao.liberacao.cancelled processoId={} total={}`

---

## Testes

### Unitários Backend

| Classe | Cenários |
|---|---|
| `CreditoTest` | `liberar` só aceita status `RETIDO`; preserva `motivoRetencao` e `retidoEm`; preenche `liberadoEm` e `processoLiberacaoId` |
| `CreditoLiberacaoTest` | transições `PREVISTA -> EFETIVADA`, `PREVISTA -> CANCELADA`, bloqueio de transições inválidas |
| `CreditoRetidoLiberacaoServiceTest` | candidato elegível vira liberação prevista; obra pendente/bloqueada permanece retida; titular sem associação permanece retido; participação não encontrada não libera |
| `CalcularProcessoCommandHandlerTest` | cálculo salva liberações previstas, atualiza totais no processo e auditoria inclui `totalRetidosALiberar` |
| `FinalizarProcessoCommandHandlerTest` | finalização efetiva liberações, muda créditos para `LIBERADO`, gera eventos `distribuicao.credito.liberado` |
| `CancelarProcessoCommandHandlerTest` | cancelamento cancela previsões e preserva créditos `RETIDO` |
| `JpaCreditoLiberacaoRepositoryTest` | seleção de candidatos por rubrica/período/status; não seleciona crédito com liberação ativa |

### Integração Backend

| Teste | Cenário |
|---|---|
| `CreditoLiberacaoMigrationIntegrationTest` | constraints aceitam `LIBERADO` preservando campos de retenção e rejeitam combinações inválidas |
| `CalcularProcessoLiberacaoIntegrationTest` | processo novo cria liberações `PREVISTA` para retidos elegíveis de período anterior |
| `FinalizarProcessoLiberacaoIntegrationTest` | finalização efetiva liberações, atualiza créditos e grava outbox por crédito liberado |
| `CancelarProcessoLiberacaoIntegrationTest` | cancelamento de processo com previsões deixa crédito original `RETIDO` |
| `ProcessoCalculoControllerIntegrationTest` | response retorna resumo com totais e seção `retidosLiberados` |
| `ProcessoAuditOutboxIntegrationTest` | cálculo/finalização gravam totais de liberação no audit outbox |

Nota: há dívida conhecida de Testcontainers/Docker no domínio Distribuição. Se os ITs continuarem bloqueados pela infraestrutura já documentada, registrar no relatório da task e rodar os unitários correspondentes.

### Frontend

Todas as tasks de frontend abaixo devem citar `mcad/frontend/DESIGN.md` e validar uso de tokens do design system.

| Arquivo | Cenários |
|---|---|
| `calculoFormatters.test.ts` | labels de `StatusCredito.LIBERADO` e `StatusLiberacaoCredito` |
| `CalculoSummary.test.tsx` | mostra `Créditos a liberar`/`Valor a liberar` antes da finalização e `Créditos liberados`/`Valor liberado` após finalização |
| `RetidosLiberadosTable.test.tsx` | mostra período origem, motivo original, valor, status previsto/liberado e datas |
| `CreditosFilters.test.tsx` | inclui status `Liberado` e mantém comportamento dos filtros existentes |
| `CreditosTable.test.tsx` | renderiza badge `Liberado` sem quebrar status `Calculado`/`Retido` |
| `ProcessoCalculoPage.test.tsx` | renderiza seção de retidos liberados e mantém consulta/filtragem de créditos atuais |

---

## Inventário de Artefatos

### Backend — Criar

| Caminho | Tipo | Descrição |
|---|---|---|
| `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/enums/StatusLiberacaoCredito.java` | Enum | Estados da liberação |
| `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/enums/ResultadoReavaliacaoRetido.java` | Enum | Resultado da reavaliação cadastral |
| `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/entities/CreditoLiberacao.java` | Entity | Liberação prevista/efetivada/cancelada |
| `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/entities/CreditoRetidoReavaliacao.java` | Entity | Histórico de reavaliações |
| `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/interfaces/CreditoLiberacaoRepository.java` | Interface | Repositório de liberações |
| `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/interfaces/CreditoRetidoReavaliacaoRepository.java` | Interface | Repositório de reavaliações |
| `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/services/CreditoRetidoLiberacaoService.java` | Service | Reavaliação, previsão, efetivação e cancelamento |
| `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/persistence/JpaCreditoLiberacaoRepository.java` | Repository | Implementação JPA/SQL |
| `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/persistence/JpaCreditoRetidoReavaliacaoRepository.java` | Repository | Implementação JPA |
| `services/distribuicao-api/distribuicao-infra/src/main/resources/db/migration/V7__add_creditos_liberacao.sql` | Migration | Campos, tabelas, constraints e índices |

### Backend — Modificar

| Caminho | Alteração |
|---|---|
| `distribuicao-domain/.../enums/StatusCredito.java` | Adicionar `LIBERADO` |
| `distribuicao-domain/.../entities/Credito.java` | Campos e método `liberar(...)` |
| `distribuicao-domain/.../entities/ProcessoDistribuicao.java` | Totais de retidos liberados |
| `distribuicao-domain/.../interfaces/CreditoRepository.java` | Métodos para carregar/salvar crédito com lock se necessário |
| `distribuicao-infra/.../persistence/JpaCreditoRepository.java` | Filtro por `LIBERADO`, resumo e métodos auxiliares |
| `distribuicao-application/.../commands/handlers/CalcularProcessoCommandHandler.java` | Prever liberações e atualizar totais |
| `distribuicao-application/.../commands/handlers/FinalizarProcessoCommandHandler.java` | Efetivar liberações e publicar eventos |
| `distribuicao-application/.../commands/handlers/CancelarProcessoCommandHandler.java` | Cancelar liberações previstas |
| `distribuicao-application/.../dto/CalcularProcessoResponse.java` | Totais de retidos liberados |
| `distribuicao-application/.../dto/CalculoProcessoResponse.java` | Seção `retidosLiberados` e campos `liberadoEm` |
| `distribuicao-application/.../queries/handlers/ConsultarCalculoProcessoQueryHandler.java` | Carregar seção de retidos liberados |
| `distribuicao-application/.../audit/ProcessoAuditEventFactory.java` | Incluir totais nos snapshots/dataChange |

### Frontend — Criar

| Caminho | Alteração |
|---|---|
| `frontend/src/features/distribuicao/processos/components/RetidosLiberadosTable.tsx` | Tabela de retidos a liberar/liberados |
| `frontend/src/features/distribuicao/processos/components/RetidosLiberadosTable.module.css` | Estilos conforme `mcad/frontend/DESIGN.md` |
| `frontend/src/features/distribuicao/processos/components/RetidosLiberadosTable.test.tsx` | Testes de renderização |

### Frontend — Modificar

| Caminho | Alteração |
|---|---|
| `frontend/src/features/distribuicao/processos/types/calculo.ts` | `LIBERADO`, `StatusLiberacaoCredito`, `retidosLiberados`, totais |
| `frontend/src/features/distribuicao/processos/utils/calculoFormatters.ts` | Labels de crédito liberado e status da liberação |
| `frontend/src/features/distribuicao/processos/api/processosCalculoApi.ts` | Ajustar parse/tipos se necessário |
| `frontend/src/features/distribuicao/processos/components/CalculoSummary.tsx` | Métricas de retidos a liberar/liberados |
| `frontend/src/features/distribuicao/processos/components/CalculoSummary.module.css` | Tokens do `mcad/frontend/DESIGN.md` |
| `frontend/src/features/distribuicao/processos/components/CreditosFilters.tsx` | Opção `Liberado` no filtro de status |
| `frontend/src/features/distribuicao/processos/components/CreditosTable.tsx` | Badge `LIBERADO` |
| `frontend/src/features/distribuicao/processos/pages/ProcessoCalculoPage.tsx` | Renderizar seção de retidos liberados |
| `frontend/src/features/distribuicao/processos/pages/ProcessoCalculoPage.module.css` | Layout seguindo `mcad/frontend/DESIGN.md` |

---

## Quebra Sugerida de Tasks

| Task | Escopo | Observação |
|---|---|---|
| 1.0 | Backend domain: `StatusCredito.LIBERADO`, `Credito.liberar`, `CreditoLiberacao`, enums e invariantes | Unit tests de entidades |
| 2.0 | Migration V7 + repositories de liberação/reavaliação | Recriar constraint da F04 para aceitar `LIBERADO` |
| 3.0 | Serviço de reavaliação cadastral e previsão de liberações | Batch no Cadastro, sem chamada por crédito |
| 4.0 | Integrar previsão no `CalcularProcessoCommandHandler` | Totais no processo, auditoria e logs |
| 5.0 | Integrar efetivação no `FinalizarProcessoCommandHandler` | Atualizar crédito para `LIBERADO` e publicar `distribuicao.credito.liberado` |
| 6.0 | Integrar cancelamento de previsões no `CancelarProcessoCommandHandler` | Crédito original permanece `RETIDO` |
| 7.0 | API de consulta: DTOs, query handler e controller tests | Seção `retidosLiberados` no cálculo |
| 8.0 | Frontend tipos/formatters/resumo/filtros | **Referenciar `mcad/frontend/DESIGN.md` na task; validar tokens e densidade visual** |
| 9.0 | Frontend `RetidosLiberadosTable` e página de cálculo | **Referenciar `mcad/frontend/DESIGN.md` na task; seguir Data Tables e evitar cores literais** |
| 10.0 | Testes frontend e revisão visual | **Referenciar `mcad/frontend/DESIGN.md`; cobrir tabela, resumo e status `LIBERADO`** |
| 11.0 | Integração/outbox/auditoria | Eventos `distribuicao.credito.liberado` e audit outbox |

---

## Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| Constraint da F04 impedir status `LIBERADO` com campos de retenção preenchidos | Migration V7 deve dropar `ck_creditos_retencao_status` e criar `ck_creditos_lifecycle_status` |
| Dois processos tentarem liberar o mesmo crédito retido | Unique index parcial + seleção com lock/`SKIP LOCKED` quando possível |
| Liberação prevista efetivar mesmo após cancelamento | Cancelamento deve transicionar previsões para `CANCELADA`; finalização só processa `PREVISTA` do processo atual |
| Reavaliação liberar crédito com pendência secundária | Reavaliar todos os pré-requisitos atuais, não apenas o motivo original da retenção |
| UI confundir verba atual com valores liberados | Seção separada e copy curta; valor liberado nunca somado ao total calculado |
| Tabela nova quebrar o padrão visual | Tasks frontend devem citar `mcad/frontend/DESIGN.md` e seguir Data Tables/tokens |
| Testcontainers bloquear ITs | Registrar bloqueio e garantir cobertura unitária dos caminhos críticos |

---

*Tech Spec pronta para geração de tasks. As tasks de frontend devem citar `mcad/frontend/DESIGN.md` explicitamente.*
