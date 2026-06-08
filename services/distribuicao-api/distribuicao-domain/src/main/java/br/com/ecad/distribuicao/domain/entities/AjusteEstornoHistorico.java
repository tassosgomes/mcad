package br.com.ecad.distribuicao.domain.entities;

import br.com.ecad.distribuicao.domain.enums.StatusAjusteEstorno;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Registro histórico de mudança de estado de um {@link AjusteEstorno}.
 * Alimenta o campo {@code historicoAplicacao} do contrato de API.
 */
@Entity
@Table(name = "ajuste_estorno_historico", schema = "distribuicao")
public class AjusteEstornoHistorico {

    @Id
    private UUID id;

    @Column(name = "ajuste_id", nullable = false)
    private UUID ajusteId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private StatusAjusteEstorno status;

    @Column(name = "processo_id")
    private UUID processoId;

    @Column(name = "ocorrido_em", nullable = false)
    private Instant ocorridoEm;

    @Column(length = 500)
    private String observacao;

    protected AjusteEstornoHistorico() {}

    /**
     * Cria um registro de histórico para o ajuste informado.
     *
     * @param ajusteId    ID do ajuste ao qual o histórico pertence.
     * @param status      status registrado neste momento.
     * @param processoId  processo associado (pode ser null).
     * @param ocorridoEm  instante do evento.
     * @param observacao  observação opcional (máx. 500 caracteres).
     */
    public static AjusteEstornoHistorico registrar(
            UUID ajusteId,
            StatusAjusteEstorno status,
            UUID processoId,
            Instant ocorridoEm,
            String observacao) {
        var historico = new AjusteEstornoHistorico();
        historico.id = UUID.randomUUID();
        historico.ajusteId = ajusteId;
        historico.status = status;
        historico.processoId = processoId;
        historico.ocorridoEm = ocorridoEm;
        historico.observacao = observacao;
        return historico;
    }

    // -------------------------------------------------------------------------
    // Getters
    // -------------------------------------------------------------------------

    public UUID getId() { return id; }
    public UUID getAjusteId() { return ajusteId; }
    public StatusAjusteEstorno getStatus() { return status; }
    public UUID getProcessoId() { return processoId; }
    public Instant getOcorridoEm() { return ocorridoEm; }
    public String getObservacao() { return observacao; }
}
