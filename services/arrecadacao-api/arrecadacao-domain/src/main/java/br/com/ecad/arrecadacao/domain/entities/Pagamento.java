package br.com.ecad.arrecadacao.domain.entities;

import br.com.ecad.arrecadacao.domain.enums.StatusPagamento;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.YearMonth;
import java.util.UUID;

@Entity
@Table(name = "pagamento", schema = "arrecadacao")
public class Pagamento {

    @Id
    private UUID id;

    @Column(name = "licenca_id", nullable = false)
    private UUID licencaId;

    @Column(name = "quantidade_udas", precision = 18, scale = 6, nullable = false)
    private BigDecimal quantidadeUdas;

    @Column(name = "valor_uda_no_momento", precision = 18, scale = 6, nullable = false)
    private BigDecimal valorUdaNoMomento;

    @Column(name = "valor_bruto", precision = 18, scale = 6, nullable = false)
    private BigDecimal valorBruto;

    @Column(name = "periodo", length = 7, nullable = false)
    private String periodo; // YYYY-MM

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private StatusPagamento status;

    @Column(name = "data_registro", nullable = false)
    private Instant dataRegistro;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    // F06 — campos de estorno (nullable quando CONFIRMADO)
    @Column(name = "justificativa_estorno", length = 500)
    private String justificativaEstorno;

    @Column(name = "estornado_por", length = 200)
    private String estornadoPor;

    @Column(name = "estornado_em")
    private Instant estornadoEm;

    // Read-only join for Specification and DTO mapping
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "licenca_id", insertable = false, updatable = false)
    private Licenca licenca;

    protected Pagamento() {}

    public static Pagamento registrar(UUID licencaId, BigDecimal quantidadeUdas,
                                      BigDecimal valorUdaVigente) {
        if (quantidadeUdas == null || quantidadeUdas.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("QuantidadeUdas deve ser maior que zero");
        }
        if (valorUdaVigente == null || valorUdaVigente.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("ValorUdaVigente deve ser maior que zero");
        }
        Pagamento p = new Pagamento();
        p.id = UUID.randomUUID();
        p.licencaId = licencaId;
        p.quantidadeUdas = quantidadeUdas.setScale(6, RoundingMode.HALF_UP);
        p.valorUdaNoMomento = valorUdaVigente.setScale(6, RoundingMode.HALF_UP);
        p.valorBruto = quantidadeUdas.multiply(valorUdaVigente).setScale(6, RoundingMode.HALF_UP);
        p.periodo = YearMonth.now().toString(); // YYYY-MM
        p.status = StatusPagamento.CONFIRMADO;
        Instant now = Instant.now();
        p.dataRegistro = now;
        p.criadoEm = now;
        p.atualizadoEm = now;
        return p;
    }

    /**
     * Transiciona o status para ESTORNADO, preenchendo os campos de auditoria.
     * Apenas pagamentos CONFIRMADOS podem ser estornados (RN-E01).
     * Justificativa obrigatória entre 10-500 caracteres (RN-E02).
     *
     * @param justificativa motivo do estorno (10-500 chars)
     * @param autor         username do autor do estorno
     */
    public void estornar(String justificativa, String autor) {
        if (this.status != StatusPagamento.CONFIRMADO) {
            throw new IllegalStateException(
                "Apenas pagamentos CONFIRMADOS podem ser estornados. Status atual: " + this.status);
        }
        if (justificativa == null || justificativa.length() < 10 || justificativa.length() > 500) {
            throw new IllegalArgumentException(
                "Justificativa must be between 10 and 500 characters");
        }
        if (autor == null || autor.isBlank()) {
            throw new IllegalArgumentException("Autor must not be blank");
        }
        this.status = StatusPagamento.ESTORNADO;
        this.justificativaEstorno = justificativa;
        this.estornadoPor = autor;
        this.estornadoEm = Instant.now();
        this.atualizadoEm = Instant.now();
    }

    // Getters only — quantidadeUdas, valorUdaNoMomento, valorBruto sao imutaveis apos registro
    public UUID getId() { return id; }
    public UUID getLicencaId() { return licencaId; }
    public BigDecimal getQuantidadeUdas() { return quantidadeUdas; }
    public BigDecimal getValorUdaNoMomento() { return valorUdaNoMomento; }
    public BigDecimal getValorBruto() { return valorBruto; }
    public String getPeriodo() { return periodo; }
    public StatusPagamento getStatus() { return status; }
    public Instant getDataRegistro() { return dataRegistro; }
    public Instant getCriadoEm() { return criadoEm; }
    public Instant getAtualizadoEm() { return atualizadoEm; }
    public Licenca getLicenca() { return licenca; }

    // F06 — getters dos campos de estorno
    public String getJustificativaEstorno() { return justificativaEstorno; }
    public String getEstornadoPor() { return estornadoPor; }
    public Instant getEstornadoEm() { return estornadoEm; }
}
