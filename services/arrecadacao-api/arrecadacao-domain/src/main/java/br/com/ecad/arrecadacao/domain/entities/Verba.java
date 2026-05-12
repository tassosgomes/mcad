package br.com.ecad.arrecadacao.domain.entities;

import br.com.ecad.arrecadacao.domain.enums.StatusVerba;
import br.com.ecad.arrecadacao.domain.exceptions.VerbaEmDistribuicaoException;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Agregado materializado de verba por rubrica×período (F05).
 *
 * <p>Acumula pagamentos CONFIRMADOS, aplica deduções administrativas
 * (10% ECAD + 5% associações) e mantém a verba líquida (85% do bruto).
 * O cálculo usa subtração (bruto − ecad − assoc) para evitar drift de arredondamento.</p>
 *
 * <p>Ciclo de status irreversível: ABERTA → EM_DISTRIBUICAO → DISTRIBUIDA (RF-12).</p>
 */
@Entity
@Table(
        name = "verbas",
        schema = "arrecadacao",
        uniqueConstraints = @UniqueConstraint(name = "uq_verbas_rubrica_periodo", columnNames = {"rubrica_id", "periodo"})
)
public class Verba {

    @Id
    private UUID id;

    @Column(name = "rubrica_id", nullable = false)
    private UUID rubricaId;

    @Column(length = 7, nullable = false)
    private String periodo;

    @Column(name = "valor_bruto_total", precision = 15, scale = 2, nullable = false)
    private BigDecimal valorBrutoTotal;

    @Column(name = "deducao_ecad", precision = 15, scale = 2, nullable = false)
    private BigDecimal deducaoEcad;

    @Column(name = "deducao_associacoes", precision = 15, scale = 2, nullable = false)
    private BigDecimal deducaoAssociacoes;

    @Column(name = "verba_liquida", precision = 15, scale = 2, nullable = false)
    private BigDecimal verbaLiquida;

    @Column(name = "quantidade_pagamentos", nullable = false)
    private int quantidadePagamentos;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private StatusVerba status;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    // Join read-only para mapeamento de DTOs (RF-17)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rubrica_id", insertable = false, updatable = false)
    private Rubrica rubrica;

    protected Verba() {}

    /**
     * Cria uma nova verba com status ABERTA e todos os valores zerados.
     *
     * @param rubricaId ID da rubrica
     * @param periodo   período no formato YYYY-MM
     * @return nova instância de Verba pronta para recalcular
     */
    public static Verba abrir(UUID rubricaId, String periodo) {
        Objects.requireNonNull(rubricaId, "rubricaId e obrigatorio");
        Objects.requireNonNull(periodo, "periodo e obrigatorio");
        if (!periodo.matches("\\d{4}-\\d{2}")) {
            throw new IllegalArgumentException("periodo deve estar no formato YYYY-MM, recebido: " + periodo);
        }

        Verba v = new Verba();
        v.id = UUID.randomUUID();
        v.rubricaId = rubricaId;
        v.periodo = periodo;
        v.valorBrutoTotal = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        v.deducaoEcad = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        v.deducaoAssociacoes = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        v.verbaLiquida = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        v.quantidadePagamentos = 0;
        v.status = StatusVerba.ABERTA;
        Instant now = Instant.now();
        v.criadoEm = now;
        v.atualizadoEm = now;
        return v;
    }

    /**
     * Recalcula os valores da verba a partir do novo valor bruto total.
     *
     * <p>Aplica as deduções: 10% ECAD + 5% associações. A verba líquida é
     * calculada por subtração (RF-05) para evitar drift de arredondamento.</p>
     *
     * <p>Lança {@link VerbaEmDistribuicaoException} se o status não for ABERTA (RF-15).</p>
     *
     * @param novoBruto        novo valor bruto total (soma dos pagamentos CONFIRMADOS)
     * @param qtdPagamentos    quantidade de pagamentos CONFIRMADOS
     */
    public void recalcular(BigDecimal novoBruto, int qtdPagamentos) {
        if (status != StatusVerba.ABERTA) {
            throw new VerbaEmDistribuicaoException(
                    "Verba %s/%s esta %s e nao pode ser alterada".formatted(rubricaId, periodo, status));
        }
        Objects.requireNonNull(novoBruto, "novoBruto e obrigatorio");
        if (novoBruto.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("novoBruto nao pode ser negativo");
        }

        this.valorBrutoTotal    = scale(novoBruto);
        this.deducaoEcad        = scale(novoBruto.multiply(new BigDecimal("0.10")));
        this.deducaoAssociacoes = scale(novoBruto.multiply(new BigDecimal("0.05")));
        this.verbaLiquida       = scale(this.valorBrutoTotal
                                           .subtract(this.deducaoEcad)
                                           .subtract(this.deducaoAssociacoes));
        this.quantidadePagamentos = qtdPagamentos;
        this.atualizadoEm = Instant.now();
    }

    /**
     * Transiciona o status de ABERTA para EM_DISTRIBUICAO (RF-13).
     * Idempotente: chamar quando já está EM_DISTRIBUICAO é no-op silencioso.
     *
     * @throws IllegalStateException se o status atual for DISTRIBUIDA
     */
    public void marcarEmDistribuicao() {
        if (status == StatusVerba.EM_DISTRIBUICAO) {
            return; // idempotente
        }
        if (status != StatusVerba.ABERTA) {
            throw new IllegalStateException(
                    "Verba %s/%s nao pode transicionar para EM_DISTRIBUICAO a partir de %s"
                            .formatted(rubricaId, periodo, status));
        }
        this.status = StatusVerba.EM_DISTRIBUICAO;
        this.atualizadoEm = Instant.now();
    }

    /**
     * Transiciona o status de EM_DISTRIBUICAO para DISTRIBUIDA (RF-14).
     * Idempotente: chamar quando já está DISTRIBUIDA é no-op silencioso.
     *
     * @throws IllegalStateException se o status atual for ABERTA
     */
    public void marcarDistribuida() {
        if (status == StatusVerba.DISTRIBUIDA) {
            return; // idempotente
        }
        if (status != StatusVerba.EM_DISTRIBUICAO) {
            throw new IllegalStateException(
                    "Verba %s/%s nao pode transicionar para DISTRIBUIDA a partir de %s"
                            .formatted(rubricaId, periodo, status));
        }
        this.status = StatusVerba.DISTRIBUIDA;
        this.atualizadoEm = Instant.now();
    }

    private static BigDecimal scale(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }

    // Getters — sem setters públicos; mutação apenas via domain methods
    public UUID getId()                      { return id; }
    public UUID getRubricaId()               { return rubricaId; }
    public String getPeriodo()               { return periodo; }
    public BigDecimal getValorBrutoTotal()   { return valorBrutoTotal; }
    public BigDecimal getDeducaoEcad()       { return deducaoEcad; }
    public BigDecimal getDeducaoAssociacoes(){ return deducaoAssociacoes; }
    public BigDecimal getVerbaLiquida()      { return verbaLiquida; }
    public int getQuantidadePagamentos()     { return quantidadePagamentos; }
    public StatusVerba getStatus()           { return status; }
    public Instant getCriadoEm()             { return criadoEm; }
    public Instant getAtualizadoEm()         { return atualizadoEm; }
    public Rubrica getRubrica()              { return rubrica; }
}
