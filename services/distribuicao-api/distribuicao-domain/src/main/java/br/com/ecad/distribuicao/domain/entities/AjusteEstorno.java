package br.com.ecad.distribuicao.domain.entities;

import br.com.ecad.distribuicao.domain.enums.StatusAjusteEstorno;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Representa um ajuste de estorno de arrecadação a ser aplicado em processo de distribuição.
 *
 * <p>Invariantes:
 * <ul>
 *   <li>{@code valorAjusteLiquido} é sempre positivo.</li>
 *   <li>{@code valorAplicado} é {@code null} até previsão; quando preenchido, é negativo.</li>
 *   <li>{@code PREVISTO} exige {@code processoAplicacaoId}, {@code previstoEm} e {@code valorAplicado}.</li>
 *   <li>{@code APLICADO} exige todos os campos de PREVISTO mais {@code aplicadoEm}.</li>
 *   <li>{@code PENDENTE_APLICACAO} não pode ter {@code aplicadoEm}.</li>
 *   <li>{@code IGNORADO_SEM_DISTRIBUICAO} não deve ter processo de origem nem de aplicação.</li>
 *   <li>{@code PROCESSO_CRIADO_DESATUALIZADO} referencia o processo bloqueado em {@code processoOrigemId}.</li>
 * </ul>
 */
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

    protected AjusteEstorno() {}

    // -------------------------------------------------------------------------
    // Factories
    // -------------------------------------------------------------------------

    /**
     * Cria um ajuste no status {@code PENDENTE_APLICACAO}: há processo de origem válido
     * e o ajuste deve ser aplicado em processo futuro.
     */
    public static AjusteEstorno pendente(
            EventoEstorno evento,
            ProcessoDistribuicao origem,
            String payloadOriginal,
            BigDecimal valorAjusteLiquido) {
        Objects.requireNonNull(evento, "evento must not be null");
        Objects.requireNonNull(origem, "origem must not be null");
        Objects.requireNonNull(payloadOriginal, "payloadOriginal must not be null");
        Objects.requireNonNull(valorAjusteLiquido, "valorAjusteLiquido must not be null");
        if (valorAjusteLiquido.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("valorAjusteLiquido deve ser positivo");
        }
        var ajuste = fromEvento(evento, payloadOriginal, valorAjusteLiquido);
        ajuste.status = StatusAjusteEstorno.PENDENTE_APLICACAO;
        ajuste.processoOrigemId = origem.getId();
        return ajuste;
    }

    /**
     * Cria um ajuste no status {@code IGNORADO_SEM_DISTRIBUICAO}: não existia processo
     * que tivesse usado a verba. Não tem processo de origem nem de aplicação.
     */
    public static AjusteEstorno ignoradoSemDistribuicao(
            EventoEstorno evento,
            String payloadOriginal,
            BigDecimal valorAjusteLiquido) {
        Objects.requireNonNull(evento, "evento must not be null");
        Objects.requireNonNull(payloadOriginal, "payloadOriginal must not be null");
        Objects.requireNonNull(valorAjusteLiquido, "valorAjusteLiquido must not be null");
        if (valorAjusteLiquido.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("valorAjusteLiquido deve ser positivo");
        }
        var ajuste = fromEvento(evento, payloadOriginal, valorAjusteLiquido);
        ajuste.status = StatusAjusteEstorno.IGNORADO_SEM_DISTRIBUICAO;
        // processoOrigemId e processoAplicacaoId permanecem null
        return ajuste;
    }

    /**
     * Cria um ajuste no status {@code PROCESSO_CRIADO_DESATUALIZADO}: havia processo
     * {@code CRIADO} com snapshot anterior ao estorno; o cálculo desse processo deve
     * ser bloqueado. O processo é referenciado em {@code processoOrigemId}.
     */
    public static AjusteEstorno processoCriadoDesatualizado(
            EventoEstorno evento,
            ProcessoDistribuicao processo,
            String payloadOriginal,
            BigDecimal valorAjusteLiquido) {
        Objects.requireNonNull(evento, "evento must not be null");
        Objects.requireNonNull(processo, "processo must not be null");
        Objects.requireNonNull(payloadOriginal, "payloadOriginal must not be null");
        Objects.requireNonNull(valorAjusteLiquido, "valorAjusteLiquido must not be null");
        if (valorAjusteLiquido.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("valorAjusteLiquido deve ser positivo");
        }
        var ajuste = fromEvento(evento, payloadOriginal, valorAjusteLiquido);
        ajuste.status = StatusAjusteEstorno.PROCESSO_CRIADO_DESATUALIZADO;
        ajuste.processoOrigemId = processo.getId();
        return ajuste;
    }

    private static AjusteEstorno fromEvento(
            EventoEstorno evento,
            String payloadOriginal,
            BigDecimal valorAjusteLiquido) {
        var ajuste = new AjusteEstorno();
        ajuste.id = UUID.randomUUID();
        ajuste.eventId = evento.eventId();
        ajuste.pagamentoId = evento.pagamentoId();
        ajuste.licencaId = evento.licencaId();
        ajuste.rubricaSigla = evento.rubricaSigla();
        ajuste.periodoOrigem = evento.periodoOrigem();
        ajuste.quantidadeUdas = evento.quantidadeUdas();
        ajuste.valorEstornadoBruto = evento.valorEstornadoBruto();
        ajuste.valorAjusteLiquido = valorAjusteLiquido;
        ajuste.justificativa = evento.justificativa();
        ajuste.estornadoPor = evento.estornadoPor();
        ajuste.estornadoEm = evento.estornadoEm();
        ajuste.payloadOriginal = payloadOriginal;
        ajuste.recebidoEm = Instant.now();
        return ajuste;
    }

    // -------------------------------------------------------------------------
    // Transições de estado
    // -------------------------------------------------------------------------

    /**
     * Entra o ajuste em previsão dentro de um processo de aplicação ainda não finalizado.
     * Exige status atual {@code PENDENTE_APLICACAO}.
     *
     * @param processoAplicacaoId ID do processo onde o ajuste será aplicado.
     * @param valorAplicado       valor negativo que será debitado dos créditos do processo.
     * @param previstoEm          instante em que a previsão foi realizada.
     */
    public void prever(UUID processoAplicacaoId, BigDecimal valorAplicado, Instant previstoEm) {
        if (this.status != StatusAjusteEstorno.PENDENTE_APLICACAO) {
            throw new IllegalStateException(
                    "prever() exige status PENDENTE_APLICACAO, mas status atual é: " + this.status);
        }
        Objects.requireNonNull(processoAplicacaoId, "processoAplicacaoId must not be null");
        Objects.requireNonNull(valorAplicado, "valorAplicado must not be null");
        Objects.requireNonNull(previstoEm, "previstoEm must not be null");
        if (valorAplicado.compareTo(BigDecimal.ZERO) > 0) {
            throw new IllegalArgumentException("valorAplicado deve ser negativo ou zero");
        }
        this.status = StatusAjusteEstorno.PREVISTO;
        this.processoAplicacaoId = processoAplicacaoId;
        this.valorAplicado = valorAplicado;
        this.previstoEm = previstoEm;
    }

    /**
     * Aplica definitivamente o ajuste após finalização do processo de aplicação.
     * Exige status atual {@code PREVISTO}.
     *
     * @param aplicadoEm instante em que o processo de aplicação foi finalizado.
     */
    public void aplicar(Instant aplicadoEm) {
        if (this.status != StatusAjusteEstorno.PREVISTO) {
            throw new IllegalStateException(
                    "aplicar() exige status PREVISTO, mas status atual é: " + this.status);
        }
        Objects.requireNonNull(aplicadoEm, "aplicadoEm must not be null");
        this.status = StatusAjusteEstorno.APLICADO;
        this.aplicadoEm = aplicadoEm;
    }

    /**
     * Cancela a previsão do ajuste, retornando-o a {@code PENDENTE_APLICACAO}.
     * Exige status atual {@code PREVISTO}.
     *
     * @param canceladoEm instante em que a previsão foi cancelada.
     */
    public void cancelarPrevisao(Instant canceladoEm) {
        if (this.status != StatusAjusteEstorno.PREVISTO) {
            throw new IllegalStateException(
                    "cancelarPrevisao() exige status PREVISTO, mas status atual é: " + this.status);
        }
        Objects.requireNonNull(canceladoEm, "canceladoEm must not be null");
        this.status = StatusAjusteEstorno.PENDENTE_APLICACAO;
        this.processoAplicacaoId = null;
        this.valorAplicado = null;
        this.previstoEm = null;
    }

    /**
     * Marca o ajuste com erro de integridade: havia processo de origem, mas não foi
     * possível alocar linhas por falta de créditos válidos.
     *
     * @param motivo      descrição do erro de integridade.
     * @param ocorridoEm  instante em que o erro foi detectado.
     */
    public void marcarErroIntegridade(String motivo, Instant ocorridoEm) {
        Objects.requireNonNull(motivo, "motivo must not be null");
        Objects.requireNonNull(ocorridoEm, "ocorridoEm must not be null");
        this.status = StatusAjusteEstorno.ERRO_INTEGRIDADE;
        this.erroIntegridade = motivo;
    }

    // -------------------------------------------------------------------------
    // Getters
    // -------------------------------------------------------------------------

    public UUID getId() { return id; }
    public UUID getEventId() { return eventId; }
    public UUID getPagamentoId() { return pagamentoId; }
    public UUID getLicencaId() { return licencaId; }
    public String getRubricaSigla() { return rubricaSigla; }
    public String getPeriodoOrigem() { return periodoOrigem; }
    public BigDecimal getQuantidadeUdas() { return quantidadeUdas; }
    public BigDecimal getValorEstornadoBruto() { return valorEstornadoBruto; }
    public BigDecimal getValorAjusteLiquido() { return valorAjusteLiquido; }
    public BigDecimal getValorAplicado() { return valorAplicado; }
    public String getJustificativa() { return justificativa; }
    public String getEstornadoPor() { return estornadoPor; }
    public Instant getEstornadoEm() { return estornadoEm; }
    public StatusAjusteEstorno getStatus() { return status; }
    public UUID getProcessoOrigemId() { return processoOrigemId; }
    public UUID getProcessoAplicacaoId() { return processoAplicacaoId; }
    public String getPayloadOriginal() { return payloadOriginal; }
    public Instant getRecebidoEm() { return recebidoEm; }
    public Instant getPrevistoEm() { return previstoEm; }
    public Instant getAplicadoEm() { return aplicadoEm; }
    public String getErroIntegridade() { return erroIntegridade; }
}
