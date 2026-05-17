package br.com.ecad.distribuicao.domain.entities;

import br.com.ecad.distribuicao.domain.enums.MotivoRetencao;
import br.com.ecad.distribuicao.domain.enums.StatusCredito;
import br.com.ecad.distribuicao.domain.enums.StatusLiberacaoCredito;
import br.com.ecad.distribuicao.domain.exceptions.TransicaoInvalidaException;
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

    @Enumerated(EnumType.STRING)
    @Column(name = "motivo_retencao_original", nullable = false, length = 40)
    private MotivoRetencao motivoRetencaoOriginal;

    @Column(name = "avaliado_em", nullable = false)
    private Instant avaliadoEm;

    @Column(name = "efetivado_em")
    private Instant efetivadoEm;

    @Column(name = "cancelado_em")
    private Instant canceladoEm;

    protected CreditoLiberacao() {
    }

    public static CreditoLiberacao prevista(
            Credito creditoRetido,
            ProcessoDistribuicao processoLiberacao,
            Instant avaliadoEm) {
        Objects.requireNonNull(creditoRetido, "creditoRetido must not be null");
        Objects.requireNonNull(processoLiberacao, "processoLiberacao must not be null");
        if (creditoRetido.getStatus() != StatusCredito.RETIDO) {
            throw new TransicaoInvalidaException("Apenas crédito retido pode ter liberação prevista");
        }
        CreditoLiberacao liberacao = new CreditoLiberacao();
        liberacao.id = UUID.randomUUID();
        liberacao.creditoRetidoId = creditoRetido.getId();
        liberacao.processoOrigemId = creditoRetido.getProcessoId();
        liberacao.processoLiberacaoId = processoLiberacao.getId();
        liberacao.status = StatusLiberacaoCredito.PREVISTA;
        liberacao.valorLiberado = creditoRetido.getValorCredito();
        liberacao.motivoRetencaoOriginal = Objects.requireNonNull(
                creditoRetido.getMotivoRetencao(),
                "motivoRetencaoOriginal must not be null");
        liberacao.avaliadoEm = Objects.requireNonNull(avaliadoEm, "avaliadoEm must not be null");
        liberacao.efetivadoEm = null;
        liberacao.canceladoEm = null;
        return liberacao;
    }

    public void efetivar(Instant efetivadoEm) {
        if (this.status != StatusLiberacaoCredito.PREVISTA) {
            throw new TransicaoInvalidaException("Apenas liberação prevista pode ser efetivada");
        }
        this.status = StatusLiberacaoCredito.EFETIVADA;
        this.efetivadoEm = Objects.requireNonNull(efetivadoEm, "efetivadoEm must not be null");
        this.canceladoEm = null;
    }

    public void cancelar(Instant canceladoEm) {
        if (this.status != StatusLiberacaoCredito.PREVISTA) {
            throw new TransicaoInvalidaException("Apenas liberação prevista pode ser cancelada");
        }
        this.status = StatusLiberacaoCredito.CANCELADA;
        this.canceladoEm = Objects.requireNonNull(canceladoEm, "canceladoEm must not be null");
        this.efetivadoEm = null;
    }

    public UUID getId() {
        return id;
    }

    public UUID getCreditoRetidoId() {
        return creditoRetidoId;
    }

    public UUID getProcessoOrigemId() {
        return processoOrigemId;
    }

    public UUID getProcessoLiberacaoId() {
        return processoLiberacaoId;
    }

    public StatusLiberacaoCredito getStatus() {
        return status;
    }

    public BigDecimal getValorLiberado() {
        return valorLiberado;
    }

    public MotivoRetencao getMotivoRetencaoOriginal() {
        return motivoRetencaoOriginal;
    }

    public Instant getAvaliadoEm() {
        return avaliadoEm;
    }

    public Instant getEfetivadoEm() {
        return efetivadoEm;
    }

    public Instant getCanceladoEm() {
        return canceladoEm;
    }
}
