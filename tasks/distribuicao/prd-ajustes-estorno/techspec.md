# Tech Spec — F06: Ajustes por Estorno

> **PRD:** `tasks/distribuicao/prd-ajustes-estorno/prd.md`
> **API Contract:** `tasks/distribuicao/prd-ajustes-estorno/api-contract.yaml`
> **Domínio:** Distribuição (D04)
> **Data:** 2026-05-20
> **Status:** `techspec-ready`
> **Referências:** `vision.md`, `domains/distribuicao/domain.md`, `infra/schemas/v1/ArrecadacaoPagamentoEstornado.json`, `tasks/distribuicao/prd-gestao-processos/techspec.md`, `tasks/distribuicao/prd-retencao-creditos/techspec.md`, `tasks/distribuicao/prd-liberacao-creditos-retidos/techspec.md`, `frontend/DESIGN.md`

---

## Resumo Executivo

Esta feature fecha a lacuna entre Arrecadação e Distribuição quando um pagamento confirmado é estornado depois que a verba daquele período já foi usada em um processo de distribuição. A Arrecadação publica `arrecadacao.pagamento.estornado`; a Distribuição deve consumir esse evento, registrar um `AjusteEstorno` idempotente e aplicar o débito no próximo processo elegível da mesma rubrica.

A implementação deve ser incremental sobre o estado atual da `distribuicao-api`, que já possui:

- cálculo de créditos e consulta `GET /api/v1/processos/{id}/calculo`;
- retenção de créditos (F04);
- liberação de créditos retidos (F05);
- outbox, auditoria e permissionamento via `authz-spring-boot-starter`.

Blocos principais:

1. Consumir `arrecadacao.pagamento.estornado` em RabbitMQ e persistir o CloudEvent original.
2. Criar entidades/tabelas `ajustes_estorno`, `ajuste_estorno_linhas` e `ajuste_estorno_historico`.
3. Classificar o evento como `PENDENTE_APLICACAO`, `IGNORADO_SEM_DISTRIBUICAO` ou `PROCESSO_CRIADO_DESATUALIZADO`.
4. No cálculo, selecionar ajustes pendentes elegíveis, alocar linhas negativas proporcionais aos créditos do processo de origem e marcar como `PREVISTO`.
5. Na finalização, efetivar ajustes previstos como `APLICADO` e publicar `distribuicao.ajuste.estorno.aplicado`.
6. No cancelamento, desfazer previsões e devolver ajustes para `PENDENTE_APLICACAO`.
7. Expor listagem/detalhe read-only de ajustes e estender a tela de cálculo com totais e tabela de débitos por estorno.

Não há endpoint de escrita acionado diretamente por usuário para criar, editar ou aplicar ajuste.

---

## Arquitetura

### Fluxo de Registro do Estorno

```text
RabbitMQ: arrecadacao.events
  routing key: arrecadacao.pagamento.estornado
        |
        v
PagamentoEstornadoEventListener
        |
        |-- valida CloudEvent 1.0 e campos obrigatórios
        |-- descarta inválidos com log, sem requeue
        v
PagamentoEstornadoEventHandler
        |
        |-- idempotência por eventId e pagamentoId
        |-- localiza processo não cancelado por rubrica+período
        |-- calcula valor líquido = valorEstornado * 0.85
        v
Transação
        |
        |-- salva AjusteEstorno + payload original
        |-- salva histórico inicial
        |-- se PENDENTE_APLICACAO, salva outbox distribuicao.ajuste.estorno.registrado
```

### Fluxo de Cálculo com Ajuste Previsto

```text
POST /api/v1/processos/{id}/calcular
        |
        v
CalcularProcessoCommandHandler
        |
        |-- valida processo CRIADO
        |-- bloqueia cálculo se houver PROCESSO_CRIADO_DESATUALIZADO para o processo
        |-- executa cálculo atual F03/F04
        |-- prevê liberações F05
        |-- seleciona ajustes PENDENTE_APLICACAO elegíveis
        |-- aloca linhas negativas por crédito do processo de origem
        |-- marca ajustes como PREVISTO
        |-- atualiza totais do processo
        |-- salva outbox distribuicao.processo.calculado com totais de ajuste
        |-- salva auditoria com totais de ajuste
```

### Fluxo de Finalização e Cancelamento

```text
POST /api/v1/processos/{id}/finalizar
        |
        |-- processo.finalizar()
        |-- efetiva liberações F05
        |-- efetiva ajustes PREVISTO => APLICADO
        |-- publica distribuicao.ajuste.estorno.aplicado por ajuste
        |-- publica distribuicao.processo.finalizado com totais

POST /api/v1/processos/{id}/cancelar
        |
        |-- processo.cancelar(justificativa)
        |-- cancela liberações previstas F05
        |-- cancela previsões de ajuste e volta ajustes para PENDENTE_APLICACAO
        |-- publica distribuicao.processo.cancelado com totais
```

### Decisões Técnicas

| Decisão | Justificativa |
|---|---|
| Ajuste é entidade própria | O ajuste nasce de evento externo e só vira linha financeira quando aplicado |
| Linha negativa em tabela própria | Evita misturar débito por estorno com `Credito`, que representa crédito calculado positivo |
| Valor líquido derivado no consumo | O evento atual traz valor bruto; PRD define regra PoC de 85% |
| Aplicação prevista no cálculo e definitiva na finalização | Mantém a máquina de estados usada em F05 |
| Alocação usa créditos históricos do processo de origem | Não recalcula split, peso ou percentual cadastral |
| Evento inválido é descartado com log | Evita travar o consumidor por evento malformado |
| `payloadOriginal` só no detalhe | Mantém listagem leve e preserva auditoria técnica |
| Sem chamada HTTP à Arrecadação | O evento é o contrato entre domínios |

---

## Backend — Domain

### Enums

Criar `StatusAjusteEstorno` em `distribuicao-domain/.../enums/`:

```java
public enum StatusAjusteEstorno {
    PENDENTE_APLICACAO,
    PREVISTO,
    APLICADO,
    CANCELADO,
    IGNORADO_SEM_DISTRIBUICAO,
    PROCESSO_CRIADO_DESATUALIZADO,
    ERRO_INTEGRIDADE
}
```

Uso dos status:

- `PENDENTE_APLICACAO`: há processo de origem calculado/aprovado/finalizado e o ajuste deve ser aplicado em processo futuro.
- `PREVISTO`: ajuste entrou no cálculo de um processo ainda não finalizado.
- `APLICADO`: processo de aplicação foi finalizado.
- `CANCELADO`: status de histórico de uma previsão cancelada; neste desenho, o status atual do ajuste volta para `PENDENTE_APLICACAO`.
- `IGNORADO_SEM_DISTRIBUICAO`: não existia processo que tivesse usado a verba.
- `PROCESSO_CRIADO_DESATUALIZADO`: havia processo `CRIADO` com snapshot anterior ao estorno; o cálculo desse processo deve ser bloqueado.
- `ERRO_INTEGRIDADE`: havia processo de origem, mas não foi possível alocar linhas por falta de créditos válidos.

### Entidade `AjusteEstorno`

Criar em `distribuicao-domain/.../entities/AjusteEstorno.java`:

```java
@Entity
@Table(name = "ajustes_estorno", schema = "distribuicao")
public class AjusteEstorno {
    @Id
    private UUID id;

    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Column(name = "pagamento_id", nullable = false)
    private UUID pagamentoId;

    @Column(name = "licenca_id", nullable = false)
    private UUID licencaId;

    @Column(name = "rubrica_sigla", nullable = false, length = 20)
    private String rubricaSigla;

    @Column(name = "periodo_origem", nullable = false, length = 7)
    private String periodoOrigem;

    @Column(name = "quantidade_udas", nullable = false, precision = 18, scale = 6)
    private BigDecimal quantidadeUdas;

    @Column(name = "valor_estornado_bruto", nullable = false, precision = 15, scale = 2)
    private BigDecimal valorEstornadoBruto;

    @Column(name = "valor_ajuste_liquido", nullable = false, precision = 15, scale = 2)
    private BigDecimal valorAjusteLiquido;

    @Column(name = "valor_aplicado", precision = 15, scale = 2)
    private BigDecimal valorAplicado;

    @Column(nullable = false, length = 1000)
    private String justificativa;

    @Column(name = "estornado_por", nullable = false, length = 200)
    private String estornadoPor;

    @Column(name = "estornado_em", nullable = false)
    private Instant estornadoEm;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private StatusAjusteEstorno status;

    @Column(name = "processo_origem_id")
    private UUID processoOrigemId;

    @Column(name = "processo_aplicacao_id")
    private UUID processoAplicacaoId;

    @Column(name = "payload_original", columnDefinition = "TEXT", nullable = false)
    private String payloadOriginal;

    @Column(name = "recebido_em", nullable = false)
    private Instant recebidoEm;

    @Column(name = "previsto_em")
    private Instant previstoEm;

    @Column(name = "aplicado_em")
    private Instant aplicadoEm;

    @Column(name = "erro_integridade", length = 500)
    private String erroIntegridade;
}
```

Factories/métodos:

```java
public static AjusteEstorno pendente(EventoEstorno evento, ProcessoDistribuicao origem, String payloadOriginal);
public static AjusteEstorno ignoradoSemDistribuicao(EventoEstorno evento, String payloadOriginal);
public static AjusteEstorno processoCriadoDesatualizado(EventoEstorno evento, ProcessoDistribuicao processo, String payloadOriginal);

public void prever(UUID processoAplicacaoId, BigDecimal valorAplicado, Instant previstoEm);
public void aplicar(Instant aplicadoEm);
public void cancelarPrevisao(Instant canceladoEm);
public void marcarErroIntegridade(String motivo, Instant ocorridoEm);
```

Invariantes:

- `valorAjusteLiquido` é sempre positivo.
- `valorAplicado` é `null` até previsão; quando preenchido, é negativo.
- `PREVISTO` exige `processoAplicacaoId`, `previstoEm` e `valorAplicado`.
- `APLICADO` exige `processoAplicacaoId`, `previstoEm`, `valorAplicado` e `aplicadoEm`.
- `PENDENTE_APLICACAO` não pode ter `aplicadoEm`.
- `IGNORADO_SEM_DISTRIBUICAO` não deve ter processo de origem nem aplicação.
- `PROCESSO_CRIADO_DESATUALIZADO` deve referenciar o processo criado bloqueado em `processoOrigemId`.

### Entidade `AjusteEstornoLinha`

Criar em `distribuicao-domain/.../entities/AjusteEstornoLinha.java`:

```java
@Entity
@Table(name = "ajuste_estorno_linhas", schema = "distribuicao")
public class AjusteEstornoLinha {
    @Id
    private UUID id;

    @Column(name = "ajuste_id", nullable = false)
    private UUID ajusteId;

    @Column(name = "processo_origem_id", nullable = false)
    private UUID processoOrigemId;

    @Column(name = "processo_aplicacao_id", nullable = false)
    private UUID processoAplicacaoId;

    @Column(name = "credito_origem_id", nullable = false)
    private UUID creditoOrigemId;

    @Column(name = "titular_id", nullable = false)
    private UUID titularId;

    @Column(name = "titular_nome", nullable = false, length = 200)
    private String titularNome;

    @Column(name = "obra_id", nullable = false)
    private UUID obraId;

    @Column(name = "obra_titulo", nullable = false, length = 300)
    private String obraTitulo;

    @Column(name = "fonograma_id")
    private UUID fonogramaId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CategoriaCredito categoria;

    @Enumerated(EnumType.STRING)
    @Column(name = "subcategoria_conexa", length = 20)
    private SubcategoriaConexa subcategoriaConexa;

    @Column(name = "valor_credito_origem", nullable = false, precision = 15, scale = 2)
    private BigDecimal valorCreditoOrigem;

    @Column(name = "valor_ajuste", nullable = false, precision = 15, scale = 2)
    private BigDecimal valorAjuste;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;
}
```

Regras:

- `valorAjuste` sempre negativo.
- A soma das linhas por `ajusteId + processoAplicacaoId` deve ser exatamente igual a `ajuste.valorAplicado`.
- Linhas são snapshots; não consultar Cadastro para preencher titular/obra/fonograma.

### Entidade `AjusteEstornoHistorico`

Criar em `distribuicao-domain/.../entities/AjusteEstornoHistorico.java` para alimentar `historicoAplicacao` do contrato:

```java
@Entity
@Table(name = "ajuste_estorno_historico", schema = "distribuicao")
public class AjusteEstornoHistorico {
    @Id
    private UUID id;
    private UUID ajusteId;
    private StatusAjusteEstorno status;
    private UUID processoId;
    private Instant ocorridoEm;
    private String observacao;
}
```

Eventos de histórico mínimos:

- registro inicial do evento;
- previsão no cálculo;
- cancelamento de previsão;
- aplicação definitiva;
- erro de integridade.

### ProcessoDistribuicao

Adicionar campos:

```java
@Column(name = "total_ajustes_estorno")
private Integer totalAjustesEstorno;

@Column(name = "valor_total_ajustes_estorno", precision = 15, scale = 2)
private BigDecimal valorTotalAjustesEstorno;
```

Estender `marcarCalculado(...)` para receber também:

```java
int totalAjustesEstorno,
BigDecimal valorTotalAjustesEstorno
```

Observações:

- `valorTotalAjustesEstorno` deve ser negativo ou zero.
- `valorTotalCalculado` continua representando créditos positivos do processo atual.
- `valorTotalRetidosLiberados` continua representando liberações F05.
- `valorLiquidoDemonstravel` pode ser derivado no DTO:

```text
valorLiquidoDemonstravel =
  valorTotalCalculado
  + valorTotalRetidosLiberados
  + valorTotalAjustesEstorno
```

---

## Backend — Persistência

### Migration

Criar `V8__add_ajustes_estorno.sql` em `distribuicao-infra/src/main/resources/db/migration/`:

```sql
ALTER TABLE distribuicao.processos
    ADD COLUMN total_ajustes_estorno INTEGER,
    ADD COLUMN valor_total_ajustes_estorno DECIMAL(15,2);

CREATE TABLE distribuicao.ajustes_estorno (
    id                         UUID          PRIMARY KEY,
    event_id                   UUID          NOT NULL,
    pagamento_id               UUID          NOT NULL,
    licenca_id                 UUID          NOT NULL,
    rubrica_sigla              VARCHAR(20)   NOT NULL,
    periodo_origem             VARCHAR(7)    NOT NULL,
    quantidade_udas            DECIMAL(18,6) NOT NULL,
    valor_estornado_bruto      DECIMAL(15,2) NOT NULL,
    valor_ajuste_liquido       DECIMAL(15,2) NOT NULL,
    valor_aplicado             DECIMAL(15,2),
    justificativa              VARCHAR(1000) NOT NULL,
    estornado_por              VARCHAR(200)  NOT NULL,
    estornado_em               TIMESTAMPTZ   NOT NULL,
    status                     VARCHAR(40)   NOT NULL,
    processo_origem_id         UUID REFERENCES distribuicao.processos(id),
    processo_aplicacao_id      UUID REFERENCES distribuicao.processos(id),
    payload_original           TEXT          NOT NULL,
    recebido_em                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    previsto_em                TIMESTAMPTZ,
    aplicado_em                TIMESTAMPTZ,
    erro_integridade           VARCHAR(500),
    CONSTRAINT ux_ajustes_estorno_event_id UNIQUE (event_id),
    CONSTRAINT ux_ajustes_estorno_pagamento_id UNIQUE (pagamento_id),
    CONSTRAINT ck_ajustes_estorno_status CHECK (status IN (
        'PENDENTE_APLICACAO',
        'PREVISTO',
        'APLICADO',
        'CANCELADO',
        'IGNORADO_SEM_DISTRIBUICAO',
        'PROCESSO_CRIADO_DESATUALIZADO',
        'ERRO_INTEGRIDADE'
    )),
    CONSTRAINT ck_ajustes_estorno_valores CHECK (
        valor_estornado_bruto >= 0
        AND valor_ajuste_liquido >= 0
        AND (valor_aplicado IS NULL OR valor_aplicado <= 0)
    ),
    CONSTRAINT ck_ajustes_estorno_datas CHECK (
        (status = 'PREVISTO' AND processo_aplicacao_id IS NOT NULL AND previsto_em IS NOT NULL)
        OR (status = 'APLICADO' AND processo_aplicacao_id IS NOT NULL AND previsto_em IS NOT NULL AND aplicado_em IS NOT NULL)
        OR (status NOT IN ('PREVISTO', 'APLICADO'))
    )
);

CREATE INDEX ix_ajustes_estorno_listagem
    ON distribuicao.ajustes_estorno (status, rubrica_sigla, periodo_origem, estornado_em DESC);

CREATE INDEX ix_ajustes_estorno_aplicacao
    ON distribuicao.ajustes_estorno (processo_aplicacao_id, status)
    WHERE processo_aplicacao_id IS NOT NULL;

CREATE INDEX ix_ajustes_estorno_pendentes
    ON distribuicao.ajustes_estorno (rubrica_sigla, estornado_em, pagamento_id)
    WHERE status = 'PENDENTE_APLICACAO';

CREATE TABLE distribuicao.ajuste_estorno_linhas (
    id                         UUID          PRIMARY KEY,
    ajuste_id                  UUID          NOT NULL REFERENCES distribuicao.ajustes_estorno(id) ON DELETE CASCADE,
    processo_origem_id         UUID          NOT NULL REFERENCES distribuicao.processos(id),
    processo_aplicacao_id      UUID          NOT NULL REFERENCES distribuicao.processos(id),
    credito_origem_id          UUID          NOT NULL REFERENCES distribuicao.creditos(id),
    titular_id                 UUID          NOT NULL,
    titular_nome               VARCHAR(200)  NOT NULL,
    obra_id                    UUID          NOT NULL,
    obra_titulo                VARCHAR(300)  NOT NULL,
    fonograma_id               UUID,
    categoria                  VARCHAR(20)   NOT NULL,
    subcategoria_conexa        VARCHAR(20),
    valor_credito_origem       DECIMAL(15,2) NOT NULL,
    valor_ajuste               DECIMAL(15,2) NOT NULL,
    criado_em                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_ajuste_estorno_linhas_valor CHECK (
        valor_credito_origem > 0 AND valor_ajuste <= 0
    )
);

CREATE UNIQUE INDEX ux_ajuste_estorno_linhas_credito
    ON distribuicao.ajuste_estorno_linhas (ajuste_id, credito_origem_id);

CREATE INDEX ix_ajuste_estorno_linhas_processo_aplicacao
    ON distribuicao.ajuste_estorno_linhas (processo_aplicacao_id, ajuste_id);

CREATE TABLE distribuicao.ajuste_estorno_historico (
    id             UUID          PRIMARY KEY,
    ajuste_id      UUID          NOT NULL REFERENCES distribuicao.ajustes_estorno(id) ON DELETE CASCADE,
    status         VARCHAR(40)   NOT NULL,
    processo_id    UUID REFERENCES distribuicao.processos(id),
    ocorrido_em    TIMESTAMPTZ   NOT NULL,
    observacao     VARCHAR(500),
    CONSTRAINT ck_ajuste_estorno_historico_status CHECK (status IN (
        'PENDENTE_APLICACAO',
        'PREVISTO',
        'APLICADO',
        'CANCELADO',
        'IGNORADO_SEM_DISTRIBUICAO',
        'PROCESSO_CRIADO_DESATUALIZADO',
        'ERRO_INTEGRIDADE'
    ))
);

CREATE INDEX ix_ajuste_estorno_historico_ajuste
    ON distribuicao.ajuste_estorno_historico (ajuste_id, ocorrido_em ASC);
```

### Repositories

Criar interfaces em `distribuicao-domain/.../interfaces/`:

```java
public interface AjusteEstornoRepository {
    Optional<AjusteEstorno> findById(UUID id);
    Optional<AjusteEstorno> findByEventId(UUID eventId);
    Optional<AjusteEstorno> findByPagamentoId(UUID pagamentoId);
    AjusteEstorno save(AjusteEstorno ajuste);

    AjusteEstornoPage findAll(AjusteEstornoFiltro filtro, int page, int size);

    List<AjusteEstorno> findPendentesElegiveisForUpdate(
            String rubricaSigla,
            String periodoAplicacao);

    List<AjusteEstorno> findPrevistosByProcessoAplicacaoId(UUID processoId);
    boolean existsBloqueioSnapshotDesatualizado(UUID processoId);
}
```

```java
public interface AjusteEstornoLinhaRepository {
    List<AjusteEstornoLinha> saveAll(List<AjusteEstornoLinha> linhas);
    List<AjusteEstornoLinha> findByAjusteId(UUID ajusteId);
    List<AjusteEstornoLinha> findByProcessoAplicacaoId(UUID processoId);
    void deleteByAjusteIdAndProcessoAplicacaoId(UUID ajusteId, UUID processoAplicacaoId);
}
```

```java
public interface AjusteEstornoHistoricoRepository {
    AjusteEstornoHistorico save(AjusteEstornoHistorico historico);
    List<AjusteEstornoHistorico> findByAjusteId(UUID ajusteId);
}
```

Estender `CreditoRepository`:

```java
List<Credito> findByProcessoIdForAjuste(UUID processoId);
```

Critérios:

- `processoId = :processoId`;
- `valorCredito > 0`;
- incluir status `CALCULADO`, `RETIDO` e `LIBERADO`;
- ordenar por `criadoEm ASC, id ASC`.

Estender `ProcessoRepository`:

```java
Optional<ProcessoDistribuicao> findAtivoByRubricaSiglaAndPeriodo(String rubricaSigla, String periodo);
Optional<ProcessoDistribuicao> findByIdForUpdate(UUID id);
```

`findAtivoByRubricaSiglaAndPeriodo` deve ignorar `CANCELADO` e respeitar a constraint de processo ativo.

---

## Backend — Consumo de Evento

### Configuração RabbitMQ

Atualizar `application.yml`:

```yaml
app:
  rabbitmq:
    queues:
      estornos: ${RABBITMQ_QUEUE_ESTORNOS:distribuicao.pagamento-estornado}
    routing-keys:
      pagamento-estornado: arrecadacao.pagamento.estornado
```

Atualizar `RabbitMqConfig`:

```java
@Bean
public Queue pagamentoEstornadoQueue(
        @Value("${app.rabbitmq.queues.estornos:distribuicao.pagamento-estornado}") String queueName) {
    return QueueBuilder.durable(queueName).build();
}

@Bean
public Binding bindPagamentoEstornado(
        @Qualifier("pagamentoEstornadoQueue") Queue queue,
        @Qualifier("arrecadacaoEventsExchange") TopicExchange exchange,
        @Value("${app.rabbitmq.routing-keys.pagamento-estornado:arrecadacao.pagamento.estornado}") String routingKey) {
    return BindingBuilder.bind(queue).to(exchange).with(routingKey);
}
```

### Listener

Criar `PagamentoEstornadoEventListener` em `distribuicao-infra/.../events/`, seguindo o padrão de `VerbaEventListener`, mas preservando o payload original:

```java
@RabbitListener(queues = "${app.rabbitmq.queues.estornos:distribuicao.pagamento-estornado}")
public void onMessage(Message message) {
    try {
        JsonNode cloudEvent = objectMapper.readTree(message.getBody());
        PagamentoEstornadoEventPayload payload = parseAndValidate(cloudEvent);
        pagamentoEstornadoEventHandler.handle(payload, cloudEvent.toString());
    } catch (EventoInvalidoException exception) {
        LOGGER.error("Evento de estorno descartado: {}", exception.getMessage());
    } catch (Exception exception) {
        LOGGER.error("Erro ao processar evento de estorno", exception);
    }
}
```

Validações obrigatórias:

- `specversion = "1.0"`;
- `type = "arrecadacao.pagamento.estornado"`;
- `id`, `source`, `subject`, `time`, `datacontenttype`, `data`;
- em `data`: `pagamentoId`, `licencaId`, `rubricaSigla`, `periodo`, `quantidadeUdas`, `valorEstornado`, `justificativa`, `estornadoPor`, `estornadoEm`.

Erros de validação não devem lançar exceção para o container reprocessar. O listener deve logar e retornar.

### Handler

Criar `PagamentoEstornadoEventHandler`:

```java
@Service
public class PagamentoEstornadoEventHandler {
    @Transactional
    public void handle(PagamentoEstornadoEventPayload payload, String payloadOriginal) { ... }
}
```

Algoritmo:

1. Se `eventId` já existe, retornar sem ação.
2. Se `pagamentoId` já existe:
   - se payload equivalente, retornar sem ação;
   - se payload divergente, logar conflito operacional e manter primeiro registro.
3. Calcular `valorAjusteLiquido = valorEstornadoBruto * 0.85`, com escala 2 e `HALF_UP`.
4. Buscar processo ativo por `rubricaSigla + periodo`.
5. Classificar:
   - sem processo ativo: `IGNORADO_SEM_DISTRIBUICAO`;
   - processo `CRIADO`: `PROCESSO_CRIADO_DESATUALIZADO`;
   - processo `CALCULADO`, `APROVADO` ou `FINALIZADO`: `PENDENTE_APLICACAO`;
   - outros estados: tratar como sem distribuição.
6. Salvar ajuste e histórico inicial.
7. Se status `PENDENTE_APLICACAO`, publicar outbox `distribuicao.ajuste.estorno.registrado`.

Payload de outbox deve seguir `api-contract.yaml`.

---

## Backend — Serviço de Aplicação

Criar `AjusteEstornoAplicacaoService` em `distribuicao-application`:

```java
public class AjusteEstornoAplicacaoService {
    public void validarCalculoPermitido(ProcessoDistribuicao processo);

    public ResultadoAjustesEstorno preverAjustes(
            ProcessoDistribuicao processo,
            Instant previstoEm);

    public ResultadoAjustesEstorno efetivarAjustes(
            ProcessoDistribuicao processo,
            Instant aplicadoEm);

    public ResultadoAjustesEstorno cancelarPrevisoes(
            UUID processoId,
            Instant canceladoEm);
}
```

Records:

```java
public record ResultadoAjustesEstorno(
        List<AjusteEstorno> ajustes,
        List<AjusteEstornoLinha> linhas,
        int total,
        BigDecimal valorTotal) { }
```

`valorTotal` deve ser negativo ou `BigDecimal.ZERO`.

### Elegibilidade

`preverAjustes` deve selecionar ajustes:

- `status = PENDENTE_APLICACAO`;
- mesma `rubricaSigla` do processo em cálculo;
- sem `processoAplicacaoId`;
- não bloqueados por outro processo ativo;
- ordenados por `estornadoEm ASC, pagamentoId ASC`;
- com regra de período:
  - se processo de origem está `FINALIZADO`, processo de aplicação deve ter `periodo > periodoOrigem`;
  - se processo de origem foi cancelado depois do registro do ajuste, pode aplicar em processo da mesma rubrica e mesmo período;
  - para origem ainda `CALCULADO` ou `APROVADO`, aplicar apenas em período posterior.

Consulta deve usar lock pessimista ou SQL `FOR UPDATE SKIP LOCKED` para evitar duas previsões concorrentes.

### Alocação Monetária

Para cada ajuste elegível:

1. Buscar créditos válidos do processo de origem com `CreditoRepository.findByProcessoIdForAjuste`.
2. Somar `valorCredito` dos créditos.
3. Se soma é zero ou lista vazia:
   - marcar ajuste como `ERRO_INTEGRIDADE`;
   - salvar histórico;
   - não impedir o cálculo inteiro, a menos que o erro tenha ocorrido após selecionar o ajuste com lock e a regra de negócio opte por bloquear. Preferência: registrar erro e seguir com demais ajustes.
4. Distribuir o valor líquido em centavos:
   - trabalhar com valor positivo `valorAjusteLiquido`;
   - calcular quota exata por crédito com alta precisão;
   - arredondar para centavos usando método determinístico de maior resto;
   - empates por `credito.criadoEm ASC, credito.id ASC`;
   - persistir `valorAjuste` negativo.

Pseudocódigo:

```java
BigDecimal totalOrigem = creditos.stream()
        .map(Credito::getValorCredito)
        .reduce(BigDecimal.ZERO, BigDecimal::add);

List<AlocacaoParcial> parciais = creditos.stream()
        .map(c -> quota(c, ajuste.getValorAjusteLiquido(), totalOrigem))
        .toList();

long totalCents = toCents(ajuste.getValorAjusteLiquido());
long centsAlocados = parciais.stream().mapToLong(AlocacaoParcial::floorCents).sum();
long residuo = totalCents - centsAlocados;

// adicionar 1 centavo aos maiores restos ate residuo zerar
```

Exemplo:

- créditos origem: 600.00 e 400.00;
- ajuste líquido: 85.00;
- linhas: -51.00 e -34.00.

### Cancelamento de Previsão

`cancelarPrevisoes(processoId, canceladoEm)`:

1. Buscar ajustes `PREVISTO` por `processoAplicacaoId`.
2. Excluir linhas desse `ajusteId + processoAplicacaoId`.
3. Para cada ajuste:
   - salvar histórico `CANCELADO`;
   - limpar `processoAplicacaoId`, `previstoEm`, `valorAplicado`;
   - voltar status para `PENDENTE_APLICACAO`.

Não alterar ajustes `APLICADO`.

---

## Backend — Application Handlers

### CalcularProcessoCommandHandler

Alterar o fluxo atual:

1. Buscar processo e validar `status = CRIADO`.
2. Chamar `ajusteEstornoAplicacaoService.validarCalculoPermitido(processo)`.
3. Executar cálculo atual F03/F04.
4. Cancelar liberações previstas F05 do mesmo processo, como hoje.
5. Persistir créditos atuais.
6. Prever liberações F05.
7. Chamar `ajusteEstornoAplicacaoService.preverAjustes(processo, Instant.now())`.
8. Chamar `processo.marcarCalculado(...)` com totais existentes +:
   - `totalAjustesEstorno`;
   - `valorTotalAjustesEstorno`.
9. Salvar processo.
10. Publicar `distribuicao.processo.calculado` com totais de ajustes.
11. Auditar cálculo com `totalAjustesEstorno` e `valorTotalAjustesEstorno`.
12. Registrar métricas/logs de ajuste.

Erro esperado:

- Se existir ajuste `PROCESSO_CRIADO_DESATUALIZADO` vinculado ao processo, lançar `PreRequisitosException` com mensagem orientada à recriação/refresh do processo. HTTP final: `422`.

### FinalizarProcessoCommandHandler

Alterar o fluxo atual:

1. Capturar snapshot `antes`.
2. Chamar `processo.finalizar(finalizadoEm)`.
3. Efetivar liberações F05.
4. Chamar `ajusteEstornoAplicacaoService.efetivarAjustes(processo, finalizadoEm)`.
5. Salvar processo.
6. Publicar `distribuicao.ajuste.estorno.aplicado` por ajuste efetivado.
7. Publicar `distribuicao.processo.finalizado` incluindo:
   - `totalAjustesEstorno`;
   - `valorTotalAjustesEstorno`.
8. Publicar `distribuicao.rol.processado` como hoje.
9. Auditar finalização com ids/totais dos ajustes aplicados.

### CancelarProcessoCommandHandler

Alterar o fluxo atual:

1. Validar justificativa.
2. Capturar snapshot `antes`.
3. Chamar `processo.cancelar(...)`.
4. Cancelar liberações previstas F05.
5. Chamar `ajusteEstornoAplicacaoService.cancelarPrevisoes(processo.getId(), canceladoEm)`.
6. Publicar `distribuicao.processo.cancelado` incluindo totais de ajustes devolvidos para pendência.
7. Auditar cancelamento indicando ajustes revertidos.

### AprovarProcessoCommandHandler

Sem alteração funcional. Ajustes permanecem `PREVISTO` enquanto processo está `CALCULADO` ou `APROVADO`.

---

## Backend — API

### Controller de Ajustes

Criar `AjusteEstornoController` em `distribuicao-api/.../controllers/`:

```java
@RestController
@RequestMapping("/api/v1/ajustes-estorno")
public class AjusteEstornoController {

    @GetMapping
    @RequiresPermission("distribuicao:default:ajuste:listar")
    public ResponseEntity<AjusteEstornoPageResponse> listar(...);

    @GetMapping("/{id}")
    @RequiresPermission("distribuicao:default:ajuste:visualizar")
    public ResponseEntity<AjusteEstornoDetalheResponse> buscarPorId(@PathVariable UUID id);
}
```

Query params:

- `rubrica`;
- `periodoOrigem`;
- `status` CSV;
- `pagamentoId`;
- `page` e `size`;
- `sort`, se mantido pelo handler.

### DTOs

Criar DTOs em `distribuicao-application/.../dto/`:

- `AjusteEstornoResumoResponse`;
- `AjusteEstornoDetalheResponse`;
- `AjusteEstornoPageResponse`;
- `AjusteEstornoLinhaResponse`;
- `AjusteEstornoHistoricoResponse`;
- `AjusteEstornoProcessoResumoResponse`.

Os campos devem seguir `api-contract.yaml`.

### Queries

Criar:

- `ListarAjustesEstornoQuery`;
- `BuscarAjusteEstornoPorIdQuery`;
- `ListarAjustesEstornoQueryHandler`;
- `BuscarAjusteEstornoPorIdQueryHandler`.

`BuscarAjusteEstornoPorIdQueryHandler` deve carregar:

- ajuste;
- rubrica pelo `RubricaRepository`, para compor `{ sigla, nome }`;
- processo de origem e de aplicação, quando existirem;
- histórico;
- linhas;
- payload original.

### Extensão de `GET /api/v1/processos/{id}/calculo`

Atualizar `CalculoProcessoResponse` preservando os campos já existentes de F04/F05 (`creditos`, `retidosLiberados`) e adicionando:

```java
public record CalculoResumoResponse(
        // campos existentes...
        Integer totalAjustesEstorno,
        BigDecimal valorTotalAjustesEstorno,
        BigDecimal valorLiquidoDemonstravel) { }

public record AjustesEstornoResponse(
        List<AjusteEstornoCalculoItemResponse> items,
        int total,
        BigDecimal valorTotal) { }
```

Top-level:

```java
public record CalculoProcessoResponse(
        UUID processoId,
        StatusProcesso status,
        String rubricaSigla,
        String periodo,
        CalculoResumoResponse resumo,
        RetidosLiberadosResponse retidosLiberados,
        AjustesEstornoResponse ajustesEstorno,
        CreditosPaginadosResponse creditos) { }
```

Nota de compatibilidade com o contrato:

- `api-contract.yaml` documenta a seção `ajustesEstorno` e os novos totais.
- A implementação pode manter `rubricaSigla`, `creditos` e `retidosLiberados` por compatibilidade com a tela atual.
- Se o frontend optar pelo formato `rubrica: { sigla, nome }` do contrato, adicionar esse campo sem remover `rubricaSigla` no mesmo release.

### Authz

Atualizar `services/distribuicao-api/distribuicao-api/src/main/resources/permissions.yaml`:

```yaml
- key: distribuicao:default:ajuste:listar
  name: Listar ajustes por estorno
  description: Lista ajustes por estorno registrados na Distribuição.
  resource: ajuste
  action: listar

- key: distribuicao:default:ajuste:visualizar
  name: Visualizar ajuste por estorno
  description: Detalhe read-only de um ajuste por estorno.
  resource: ajuste
  action: visualizar
```

Atualizar também:

- `docs/authz/catalog/distribuicao.md`;
- seeds/catálogos de papéis, se o repositório mantiver seed estático;
- testes de `AuthzPermissionEnforcementTest`.

---

## Backend — Eventos

### Produz `distribuicao.ajuste.estorno.registrado`

Publicado somente quando o evento gera ajuste `PENDENTE_APLICACAO`.

```json
{
  "ajusteId": "uuid",
  "pagamentoId": "uuid",
  "licencaId": "uuid",
  "rubricaSigla": "RADIO",
  "periodoOrigem": "2026-03",
  "processoOrigemId": "uuid",
  "valorEstornadoBruto": "1000.00",
  "valorAjusteLiquido": "850.00",
  "status": "PENDENTE_APLICACAO",
  "estornadoPor": "analista.arrecadacao@ecad.org.br",
  "estornadoEm": "2026-05-20T10:00:00Z",
  "registradoEm": "2026-05-20T10:00:05Z"
}
```

### Produz `distribuicao.ajuste.estorno.aplicado`

Publicado na finalização do processo, um evento por ajuste aplicado.

```json
{
  "ajusteId": "uuid",
  "pagamentoId": "uuid",
  "licencaId": "uuid",
  "rubricaSigla": "RADIO",
  "periodoOrigem": "2026-03",
  "periodoAplicacao": "2026-04",
  "processoOrigemId": "uuid",
  "processoAplicacaoId": "uuid",
  "valorEstornadoBruto": "1000.00",
  "valorAjusteLiquido": "850.00",
  "valorAplicado": "-850.00",
  "totalLinhas": 12,
  "estornadoPor": "analista.arrecadacao@ecad.org.br",
  "estornadoEm": "2026-05-20T10:00:00Z",
  "aplicadoEm": "2026-05-20T12:00:00Z"
}
```

### Eventos de Processo

Estender payloads atuais:

- `distribuicao.processo.calculado`;
- `distribuicao.processo.finalizado`;
- `distribuicao.processo.cancelado`.

Campos novos:

```json
{
  "totalAjustesEstorno": 1,
  "valorTotalAjustesEstorno": "-850.00"
}
```

Usar string decimal se o payload já for preparado explicitamente para evento externo; manter compatibilidade se payload atual serializa `BigDecimal` como número.

---

## Auditoria e Observabilidade

### Auditoria

O consumo de `arrecadacao.pagamento.estornado` não deve gerar `userAction`, pois a ação humana ocorreu na Arrecadação.

Estender auditoria dos comandos existentes:

- cálculo: `dataChange.after` com `totalAjustesEstorno` e `valorTotalAjustesEstorno`;
- finalização: ids dos ajustes efetivados e valor aplicado;
- cancelamento: ids dos ajustes devolvidos para pendência.

### Logs

Adicionar logs estruturados:

- `distribuicao.ajuste_estorno.evento_recebido`;
- `distribuicao.ajuste_estorno.registrado`;
- `distribuicao.ajuste_estorno.ignorado`;
- `distribuicao.ajuste_estorno.processo_criado_desatualizado`;
- `distribuicao.ajuste_estorno.previsto`;
- `distribuicao.ajuste_estorno.aplicado`;
- `distribuicao.ajuste_estorno.erro_integridade`;
- `distribuicao.ajuste_estorno.conflito_pagamento`.

Campos mínimos: `eventId`, `pagamentoId`, `ajusteId`, `rubricaSigla`, `periodoOrigem`, `processoOrigemId`, `processoAplicacaoId`.

### Métricas

Adicionar métricas Micrometer:

- `distribuicao.ajuste_estorno.events.received`;
- `distribuicao.ajuste_estorno.events.invalid`;
- `distribuicao.ajuste_estorno.registered`;
- `distribuicao.ajuste_estorno.ignored`;
- `distribuicao.ajuste_estorno.integrity_errors`;
- `distribuicao.ajuste_estorno.applied`;
- `distribuicao.ajuste_estorno.valor_aplicado`.

---

## Frontend

### Guia Visual Obrigatório

Todas as tasks de frontend derivadas desta tech spec devem citar `frontend/DESIGN.md`.

Aplicação prática:

- Usar componentes existentes (`PageHeader`, `Table`, `Pagination`, `Badge`, `Button`, inputs/selects).
- Manter tela operacional densa, sem composição de landing page.
- Valores monetários, períodos e IDs devem usar estilo monoespaçado quando o componente existente permitir.
- Débitos por estorno devem aparecer como valores negativos, com tom de alerta/atenção consistente com os tokens CSS existentes.
- Não criar ação de "Aplicar ajuste"; ajustes são somente leitura para usuário.

### Novo módulo `ajustes-estorno`

Criar:

```text
frontend/src/features/distribuicao/ajustes-estorno/
  api/ajustesEstornoApi.ts
  api/ajustesEstornoApi.test.ts
  hooks/useAjustesEstorno.ts
  hooks/useAjusteEstorno.ts
  types/ajusteEstorno.ts
  pages/AjustesEstornoPage.tsx
  pages/AjustesEstornoPage.module.css
  components/AjustesEstornoFilters.tsx
  components/AjustesEstornoTable.tsx
  components/AjusteEstornoDetailDrawer.tsx
  components/AjusteEstornoStatusBadge.tsx
```

### Rotas e Menu

Atualizar `frontend/src/features/distribuicao/index.tsx`:

```tsx
<Route path="ajustes-estorno" element={<AjustesEstornoPage />} />
```

Atualizar `Sidebar.tsx`:

```tsx
{
  label: 'Ajustes por Estorno',
  path: '/distribuicao/ajustes-estorno',
  requiredPermission: 'distribuicao:default:ajuste:listar',
}
```

Adicionar `distribuicao:default:ajuste:listar` em `requiredPermissions` do grupo Distribuição.

### Tipos

Criar tipos alinhados ao `api-contract.yaml`:

```typescript
export type AjusteEstornoStatus =
  | 'PENDENTE_APLICACAO'
  | 'PREVISTO'
  | 'APLICADO'
  | 'CANCELADO'
  | 'IGNORADO_SEM_DISTRIBUICAO'
  | 'PROCESSO_CRIADO_DESATUALIZADO'
  | 'ERRO_INTEGRIDADE';

export interface AjusteEstornoResumo {
  id: string;
  eventId: string;
  pagamentoId: string;
  licencaId: string;
  rubrica: { sigla: string; nome: string };
  periodoOrigem: string;
  valorEstornadoBruto: string;
  valorAjusteLiquido: string;
  valorAplicado: string | null;
  status: AjusteEstornoStatus;
  processoOrigemId: string | null;
  processoAplicacaoId: string | null;
  justificativa: string;
  estornadoPor: string;
  estornadoEm: string;
  recebidoEm: string;
  previstoEm: string | null;
  aplicadoEm: string | null;
}
```

Atualizar `processos/types/calculo.ts`:

- adicionar `totalAjustesEstorno`;
- adicionar `valorTotalAjustesEstorno`;
- adicionar `valorLiquidoDemonstravel`;
- adicionar seção `ajustesEstorno`.

### Página de Listagem

`AjustesEstornoPage`:

- filtros por rubrica, período origem, status e pagamentoId;
- tabela com pagamento, rubrica, período origem, status, valor bruto, valor líquido, valor aplicado, justificativa truncada, datas;
- clique na linha abre drawer de detalhe;
- estado vazio;
- paginação server-side.

### Tela de Cálculo

Atualizar `ProcessoCalculoPage`:

- `CalculoSummary` deve exibir:
  - "Ajustes por estorno";
  - "Valor ajustado" com valor negativo;
  - "Valor demonstrável" se `valorLiquidoDemonstravel` for retornado.
- Adicionar seção separada de ajustes, antes de créditos calculados:
  - título "Ajustes por estorno";
  - tabela com pagamento, período origem, justificativa, valor bruto, valor líquido, valor aplicado e status;
  - expansão/detalhe para linhas por titular.
- Manter créditos positivos e retidos liberados em seções separadas.

---

## Testes

### Backend Unitários

Adicionar testes:

- `AjusteEstornoTest`
  - factories por status;
  - transições `prever`, `aplicar`, `cancelarPrevisao`, `marcarErroIntegridade`;
  - invariantes de valor negativo.
- `PagamentoEstornadoEventListenerTest`
  - evento válido;
  - evento sem `rubricaSigla`;
  - decimal inválido;
  - tipo errado.
- `PagamentoEstornadoEventHandlerTest`
  - sem processo => `IGNORADO_SEM_DISTRIBUICAO`;
  - processo `CRIADO` => `PROCESSO_CRIADO_DESATUALIZADO`;
  - processo `CALCULADO`/`APROVADO`/`FINALIZADO` => `PENDENTE_APLICACAO`;
  - redelivery mesmo eventId;
  - mesmo pagamentoId com payload divergente.
- `AjusteEstornoAplicacaoServiceTest`
  - seleção de elegíveis;
  - origem finalizada exige período posterior;
  - origem cancelada permite mesmo período;
  - alocação 600/400 para ajuste 85 => -51/-34;
  - resíduo fecha exatamente;
  - sem créditos válidos => `ERRO_INTEGRIDADE`.

### Backend Application/Integração

Adicionar ou estender:

- `CalcularProcessoCommandHandlerTest`
  - cálculo com ajuste pendente marca `PREVISTO`;
  - cálculo bloqueado por `PROCESSO_CRIADO_DESATUALIZADO`;
  - payload de `distribuicao.processo.calculado` inclui totais.
- `TransicoesCommandHandlerTest`
  - finalizar efetiva ajuste e publica evento;
  - cancelar devolve ajuste para pendência e apaga linhas.
- `ConsultarCalculoProcessoQueryHandlerTest`
  - retorna `ajustesEstorno`, totais e linhas.
- `AjusteEstornoControllerIntegrationTest`
  - listagem com filtros;
  - detalhe com payload original/histórico/linhas;
  - 404.
- `AuthzPermissionEnforcementTest`
  - 401/403/200 para `GET /ajustes-estorno`;
  - 401/403/200 para `GET /ajustes-estorno/{id}`.
- `CreditoRepositoryIntegrationTest`
  - `findByProcessoIdForAjuste` inclui `CALCULADO`, `RETIDO`, `LIBERADO`.

### Frontend

Adicionar testes:

- `ajustesEstornoApi.test.ts`;
- `AjustesEstornoTable.test.tsx`;
- `AjustesEstornoFilters.test.tsx`;
- `AjusteEstornoDetailDrawer.test.tsx`;
- `AjusteEstornoStatusBadge.test.tsx`;
- `ProcessoCalculoPage.test.tsx` cobrindo seção de ajustes;
- `CalculoSummary.test.tsx` cobrindo card/metric de ajustes;
- `calculoFormatters.test.ts` cobrindo valores negativos.

### Comandos de Verificação Esperados

```bash
rtk mvn -pl distribuicao-tests -am -Dtest=PagamentoEstornadoEventListenerTest,PagamentoEstornadoEventHandlerTest,AjusteEstornoAplicacaoServiceTest,CalcularProcessoCommandHandlerTest,TransicoesCommandHandlerTest,ConsultarCalculoProcessoQueryHandlerTest,AjusteEstornoControllerIntegrationTest -Dsurefire.failIfNoSpecifiedTests=false test
```

```bash
rtk npm test -- src/features/distribuicao/ajustes-estorno src/features/distribuicao/processos/components/CalculoSummary.test.tsx src/features/distribuicao/processos/pages/ProcessoCalculoPage.test.tsx
```

```bash
rtk mvn -pl distribuicao-tests -am -DskipTests compile
rtk npm run build
```

---

## Plano de Implementação

1. Criar migration V8, entidades, enums e repositories.
2. Implementar consumer `PagamentoEstornadoEventListener` + handler de registro.
3. Implementar `AjusteEstornoAplicacaoService` com alocação monetária e histórico.
4. Integrar cálculo/finalização/cancelamento aos handlers existentes.
5. Estender DTOs, queries e controller de ajustes.
6. Atualizar permissionamento, catálogo e testes Authz.
7. Atualizar frontend: rota/listagem/detalhe e seção de cálculo.
8. Adicionar testes unitários, integração e frontend.
9. Rodar verificações de backend/frontend.

---

## Riscos e Cuidados

| Risco | Mitigação |
|---|---|
| Dupla aplicação por concorrência | Unique constraints + lock `FOR UPDATE SKIP LOCKED` em pendentes |
| Soma de linhas diferente do ajuste | Algoritmo por centavos e teste de resíduo |
| Quebra da tela atual de cálculo | Preservar campos existentes de `CalculoProcessoResponse` e adicionar seção nova |
| Evento inválido travar fila | Listener descarta inválido com log e sem requeue |
| Snapshot de verba antigo ser usado | Bloquear cálculo com `PROCESSO_CRIADO_DESATUALIZADO` vinculado ao processo |
| Ajuste sobre origem sem créditos | Marcar `ERRO_INTEGRIDADE`, logar e expor na listagem/detalhe |
| Divergência do contrato de Arrecadação | Validar contra `ArrecadacaoPagamentoEstornado.json`; não aceitar enriquecimento HTTP |

---

## Critérios de Pronto

- Evento `arrecadacao.pagamento.estornado` válido é registrado idempotentemente.
- Evento inválido é descartado com log e não trava o consumidor.
- Ajuste pendente é aplicado no próximo processo elegível e gera linhas negativas proporcionais.
- Soma das linhas fecha exatamente com `valorAjusteLiquido * -1`.
- Finalização transiciona `PREVISTO -> APLICADO` e publica `distribuicao.ajuste.estorno.aplicado`.
- Cancelamento devolve ajuste previsto para `PENDENTE_APLICACAO`.
- `GET /api/v1/ajustes-estorno` e `GET /api/v1/ajustes-estorno/{id}` seguem o contrato.
- `GET /api/v1/processos/{id}/calculo` retorna totais e seção de ajustes.
- Permissões Authz novas estão no catálogo e cobertas por teste.
- Frontend exibe listagem read-only e seção de ajustes na tela de cálculo.
