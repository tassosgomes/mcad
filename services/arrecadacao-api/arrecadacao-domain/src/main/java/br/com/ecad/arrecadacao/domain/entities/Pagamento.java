package br.com.ecad.arrecadacao.domain.entities;

import br.com.ecad.arrecadacao.domain.enums.StatusPagamento;
import br.com.ecad.arrecadacao.domain.services.BoletoFakeCalculator;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
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

    @Column(name = "estornado_por_subject", length = 128)
    private String estornadoPorSubject;

    @Column(name = "estornado_por_rotulo", length = 512)
    private String estornadoPorRotulo;

    @Column(name = "estornado_em")
    private Instant estornadoEm;

    @Column(name = "boleto_nosso_numero", length = 32)
    private String boletoNossoNumero;

    @Column(name = "boleto_linha_digitavel", length = 64)
    private String boletoLinhaDigitavel;

    @Column(name = "boleto_codigo_barras", length = 44)
    private String boletoCodigoBarras;

    @Column(name = "boleto_vencimento")
    private LocalDate boletoVencimento;

    @Column(name = "boleto_storage_file_id", length = 64)
    private String boletoStorageFileId;

    @Column(name = "boleto_storage_status", length = 32)
    private String boletoStorageStatus;

    @Column(name = "boleto_emitido_em")
    private Instant boletoEmitidoEm;

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

    public static Pagamento emitirBoleto(UUID licencaId, BigDecimal quantidadeUdas,
                                         BigDecimal valorUdaVigente, LocalDate vencimento) {
        if (vencimento == null || vencimento.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Vencimento do boleto deve ser hoje ou uma data futura");
        }
        Pagamento p = criarBase(licencaId, quantidadeUdas, valorUdaVigente);
        BoletoFakeData boletoData = BoletoFakeCalculator.generate(p.id, p.valorBruto, vencimento);
        p.status = StatusPagamento.BOLETO_EMITIDO;
        p.boletoVencimento = vencimento;
        p.boletoNossoNumero = boletoData.nossoNumero();
        p.boletoLinhaDigitavel = boletoData.linhaDigitavel();
        p.boletoCodigoBarras = boletoData.codigoBarras();
        p.boletoEmitidoEm = Instant.now();
        return p;
    }

    public void registrarBoletoNoStorage(String storageFileId, String storageStatus) {
        this.boletoStorageFileId = requireText(storageFileId, "storageFileId must not be blank");
        this.boletoStorageStatus = requireText(storageStatus, "storageStatus must not be blank");
        this.atualizadoEm = Instant.now();
    }

    private static Pagamento criarBase(UUID licencaId, BigDecimal quantidadeUdas,
                                       BigDecimal valorUdaVigente) {
        if (licencaId == null) {
            throw new IllegalArgumentException("LicencaId e obrigatorio");
        }
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

    public void estornar(String justificativa, String estornadoPorSubject, String estornadoPorRotulo) {
        String rotulo = requireText(estornadoPorRotulo, "estornadoPorRotulo must not be blank");
        String subject = requireText(estornadoPorSubject, "estornadoPorSubject must not be blank");
        estornar(justificativa, rotulo);
        this.estornadoPorSubject = subject;
        this.estornadoPorRotulo = rotulo;
    }

    private static String requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value;
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
    public String getEstornadoPorSubject() { return estornadoPorSubject; }
    public String getEstornadoPorRotulo() { return estornadoPorRotulo; }
    public Instant getEstornadoEm() { return estornadoEm; }
    public String getBoletoNossoNumero() { return boletoNossoNumero; }
    public String getBoletoLinhaDigitavel() { return boletoLinhaDigitavel; }
    public String getBoletoCodigoBarras() { return boletoCodigoBarras; }
    public LocalDate getBoletoVencimento() { return boletoVencimento; }
    public String getBoletoStorageFileId() { return boletoStorageFileId; }
    public String getBoletoStorageStatus() { return boletoStorageStatus; }
    public Instant getBoletoEmitidoEm() { return boletoEmitidoEm; }
}
