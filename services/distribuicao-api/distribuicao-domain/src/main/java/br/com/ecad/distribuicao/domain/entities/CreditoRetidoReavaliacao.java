package br.com.ecad.distribuicao.domain.entities;

import br.com.ecad.distribuicao.domain.enums.ResultadoReavaliacaoRetido;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "credito_retido_reavaliacoes", schema = "distribuicao")
public class CreditoRetidoReavaliacao {

    @Id
    private UUID id;

    @Column(name = "credito_retido_id", nullable = false)
    private UUID creditoRetidoId;

    @Column(name = "processo_reavaliacao_id", nullable = false)
    private UUID processoReavaliacaoId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private ResultadoReavaliacaoRetido resultado;

    @Column(length = 500)
    private String detalhe;

    @Column(name = "avaliado_em", nullable = false)
    private Instant avaliadoEm;

    protected CreditoRetidoReavaliacao() {
    }

    public static CreditoRetidoReavaliacao registrar(
            UUID creditoRetidoId,
            UUID processoReavaliacaoId,
            ResultadoReavaliacaoRetido resultado,
            String detalhe,
            Instant avaliadoEm) {
        CreditoRetidoReavaliacao reavaliacao = new CreditoRetidoReavaliacao();
        reavaliacao.id = UUID.randomUUID();
        reavaliacao.creditoRetidoId = Objects.requireNonNull(
                creditoRetidoId,
                "creditoRetidoId must not be null");
        reavaliacao.processoReavaliacaoId = Objects.requireNonNull(
                processoReavaliacaoId,
                "processoReavaliacaoId must not be null");
        reavaliacao.resultado = Objects.requireNonNull(resultado, "resultado must not be null");
        reavaliacao.detalhe = detalhe;
        reavaliacao.avaliadoEm = Objects.requireNonNull(avaliadoEm, "avaliadoEm must not be null");
        return reavaliacao;
    }

    public UUID getId() {
        return id;
    }

    public UUID getCreditoRetidoId() {
        return creditoRetidoId;
    }

    public UUID getProcessoReavaliacaoId() {
        return processoReavaliacaoId;
    }

    public ResultadoReavaliacaoRetido getResultado() {
        return resultado;
    }

    public String getDetalhe() {
        return detalhe;
    }

    public Instant getAvaliadoEm() {
        return avaliadoEm;
    }
}
