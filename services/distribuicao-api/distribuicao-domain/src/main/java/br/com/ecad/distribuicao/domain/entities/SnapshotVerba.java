package br.com.ecad.distribuicao.domain.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "snapshots_verba", schema = "distribuicao")
public class SnapshotVerba {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "rubrica_sigla", nullable = false)
    private String rubricaSigla;

    @Column(nullable = false)
    private String periodo;

    @Column(name = "valor_bruto", precision = 15, scale = 2)
    private BigDecimal valorBruto;

    @Column(name = "deducao_ecad", precision = 15, scale = 2)
    private BigDecimal deducaoEcad;

    @Column(name = "deducao_associacoes", precision = 15, scale = 2)
    private BigDecimal deducaoAssociacoes;

    @Column(name = "verba_liquida", nullable = false, precision = 15, scale = 2)
    private BigDecimal verbaLiquida;

    @Column(name = "recebido_em", nullable = false)
    private Instant recebidoEm;

    protected SnapshotVerba() {}

    public SnapshotVerba(String rubricaSigla, String periodo, BigDecimal valorBruto, BigDecimal deducaoEcad, BigDecimal deducaoAssociacoes, BigDecimal verbaLiquida, Instant recebidoEm) {
        this.rubricaSigla = rubricaSigla;
        this.periodo = periodo;
        this.valorBruto = valorBruto;
        this.deducaoEcad = deducaoEcad;
        this.deducaoAssociacoes = deducaoAssociacoes;
        this.verbaLiquida = verbaLiquida;
        this.recebidoEm = recebidoEm;
    }

    public UUID getId() { return id; }
    public String getRubricaSigla() { return rubricaSigla; }
    public String getPeriodo() { return periodo; }
    public BigDecimal getValorBruto() { return valorBruto; }
    public BigDecimal getDeducaoEcad() { return deducaoEcad; }
    public BigDecimal getDeducaoAssociacoes() { return deducaoAssociacoes; }
    public BigDecimal getVerbaLiquida() { return verbaLiquida; }
    public Instant getRecebidoEm() { return recebidoEm; }
}
