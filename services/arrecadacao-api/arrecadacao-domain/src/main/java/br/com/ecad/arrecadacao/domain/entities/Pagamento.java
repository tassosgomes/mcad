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
     * Transiciona o status para ESTORNADO.
     * Apenas pagamentos CONFIRMADOS podem ser estornados.
     * Nota: usado por F06 (Estorno) — domain method preparado agora.
     */
    public void estornar() {
        if (this.status != StatusPagamento.CONFIRMADO) {
            throw new IllegalStateException(
                "Apenas pagamentos CONFIRMADOS podem ser estornados. Status atual: " + this.status);
        }
        this.status = StatusPagamento.ESTORNADO;
        this.atualizadoEm = Instant.now();
    }

    // Getters only — quantidadeUdas, valorUdaNoMomento, valorBruto sao imulaveis apos registro
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
}
