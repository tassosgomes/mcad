package br.com.ecad.distribuicao.domain.entities;

import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.domain.exceptions.TransicaoInvalidaException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "processos", schema = "distribuicao")
public class ProcessoDistribuicao {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "rubrica_sigla", nullable = false, length = 20)
    private String rubricaSigla;

    @Column(nullable = false, length = 7)
    private String periodo; // YYYY-MM

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusProcesso status;

    @Column(name = "verba_liquida", nullable = false, precision = 15, scale = 2)
    private BigDecimal verbaLiquida;

    @Column(name = "total_execucoes")
    private Integer totalExecucoes;

    @Column(name = "total_obras")
    private Integer totalObras;

    @Column(name = "total_pontos", precision = 18, scale = 6)
    private BigDecimal totalPontos;

    @Column(name = "total_creditos")
    private Integer totalCreditos;

    @Column(name = "valor_total_calculado", precision = 15, scale = 2)
    private BigDecimal valorTotalCalculado;

    @Column(name = "total_creditos_retidos")
    private Integer totalCreditosRetidos;

    @Column(name = "valor_total_retido", precision = 15, scale = 2)
    private BigDecimal valorTotalRetido;

    @Column(name = "total_creditos_retidos_liberados")
    private Integer totalCreditosRetidosLiberados;

    @Column(name = "valor_total_retidos_liberados", precision = 15, scale = 2)
    private BigDecimal valorTotalRetidosLiberados;

    @Column(name = "analista_responsavel", nullable = false, length = 200)
    private String analistaResponsavel;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Column(name = "calculado_em")
    private Instant calculadoEm;

    @Column(name = "aprovado_em")
    private Instant aprovadoEm;

    @Column(name = "finalizado_em")
    private Instant finalizadoEm;

    @Column(name = "cancelado_em")
    private Instant canceladoEm;

    @Column(name = "justificativa_cancelamento", length = 500)
    private String justificativaCancelamento;

    @Column(name = "snapshot_rol_id")
    private UUID snapshotRolId;

    @Column(name = "snapshot_verba_id")
    private UUID snapshotVerbaId;

    protected ProcessoDistribuicao() {}

    public static ProcessoDistribuicao criar(
            String rubricaSigla, String periodo,
            BigDecimal verbaLiquida, String analistaResponsavel,
            UUID snapshotRolId, UUID snapshotVerbaId) {
        ProcessoDistribuicao processo = new ProcessoDistribuicao();
        processo.rubricaSigla = rubricaSigla;
        processo.periodo = periodo;
        processo.status = StatusProcesso.CRIADO;
        processo.verbaLiquida = verbaLiquida;
        processo.analistaResponsavel = analistaResponsavel;
        processo.criadoEm = Instant.now();
        processo.snapshotRolId = snapshotRolId;
        processo.snapshotVerbaId = snapshotVerbaId;
        return processo;
    }

    public void marcarCalculado(int totalExecucoes) {
        validarTransicao(StatusProcesso.CRIADO, StatusProcesso.CALCULADO);
        this.status = StatusProcesso.CALCULADO;
        this.totalExecucoes = totalExecucoes;
        this.calculadoEm = Instant.now();
    }

    public void marcarCalculado(
            int totalExecucoes,
            int totalObras,
            BigDecimal totalPontos,
            int totalCreditos,
            BigDecimal valorTotalCalculado,
            int totalCreditosRetidos,
            BigDecimal valorTotalRetido) {
        marcarCalculado(
                totalExecucoes,
                totalObras,
                totalPontos,
                totalCreditos,
                valorTotalCalculado,
                totalCreditosRetidos,
                valorTotalRetido,
                0,
                BigDecimal.ZERO);
    }

    public void marcarCalculado(
            int totalExecucoes,
            int totalObras,
            BigDecimal totalPontos,
            int totalCreditos,
            BigDecimal valorTotalCalculado,
            int totalCreditosRetidos,
            BigDecimal valorTotalRetido,
            int totalCreditosRetidosLiberados,
            BigDecimal valorTotalRetidosLiberados) {
        marcarCalculado(totalExecucoes);
        this.totalObras = totalObras;
        this.totalPontos = totalPontos;
        this.totalCreditos = totalCreditos;
        this.valorTotalCalculado = valorTotalCalculado;
        this.totalCreditosRetidos = totalCreditosRetidos;
        this.valorTotalRetido = valorTotalRetido;
        this.totalCreditosRetidosLiberados = totalCreditosRetidosLiberados;
        this.valorTotalRetidosLiberados = valorTotalRetidosLiberados;
    }

    public void marcarCalculado(
            int totalExecucoes,
            int totalObras,
            BigDecimal totalPontos,
            int totalCreditos,
            BigDecimal valorTotalCalculado) {
        marcarCalculado(
                totalExecucoes,
                totalObras,
                totalPontos,
                totalCreditos,
                valorTotalCalculado,
                0,
                BigDecimal.ZERO);
    }

    public void aprovar() {
        validarTransicao(StatusProcesso.CALCULADO, StatusProcesso.APROVADO);
        this.status = StatusProcesso.APROVADO;
        this.aprovadoEm = Instant.now();
    }

    public void finalizar() {
        finalizar(Instant.now());
    }

    public void finalizar(Instant finalizadoEm) {
        validarTransicao(StatusProcesso.APROVADO, StatusProcesso.FINALIZADO);
        this.status = StatusProcesso.FINALIZADO;
        this.finalizadoEm = finalizadoEm;
    }

    public void cancelar(String justificativa) {
        cancelar(justificativa, Instant.now());
    }

    public void cancelar(String justificativa, Instant canceladoEm) {
        if (this.status == StatusProcesso.FINALIZADO) {
            throw new TransicaoInvalidaException("Processo finalizado não pode ser cancelado");
        }
        this.status = StatusProcesso.CANCELADO;
        this.justificativaCancelamento = justificativa;
        this.canceladoEm = canceladoEm;
    }

    private void validarTransicao(StatusProcesso esperado, StatusProcesso destino) {
        if (this.status != esperado) {
            throw new TransicaoInvalidaException(
                String.format("Transição inválida: %s → %s", this.status, destino)
            );
        }
    }

    // Getters

    public UUID getId() { return id; }
    public String getRubricaSigla() { return rubricaSigla; }
    public String getPeriodo() { return periodo; }
    public StatusProcesso getStatus() { return status; }
    public BigDecimal getVerbaLiquida() { return verbaLiquida; }
    public Integer getTotalExecucoes() { return totalExecucoes; }
    public Integer getTotalObras() { return totalObras; }
    public BigDecimal getTotalPontos() { return totalPontos; }
    public Integer getTotalCreditos() { return totalCreditos; }
    public BigDecimal getValorTotalCalculado() { return valorTotalCalculado; }
    public Integer getTotalCreditosRetidos() { return totalCreditosRetidos; }
    public BigDecimal getValorTotalRetido() { return valorTotalRetido; }
    public Integer getTotalCreditosRetidosLiberados() { return totalCreditosRetidosLiberados; }
    public BigDecimal getValorTotalRetidosLiberados() { return valorTotalRetidosLiberados; }
    public String getAnalistaResponsavel() { return analistaResponsavel; }
    public Instant getCriadoEm() { return criadoEm; }
    public Instant getCalculadoEm() { return calculadoEm; }
    public Instant getAprovadoEm() { return aprovadoEm; }
    public Instant getFinalizadoEm() { return finalizadoEm; }
    public Instant getCanceladoEm() { return canceladoEm; }
    public String getJustificativaCancelamento() { return justificativaCancelamento; }
    public UUID getSnapshotRolId() { return snapshotRolId; }
    public UUID getSnapshotVerbaId() { return snapshotVerbaId; }

}
