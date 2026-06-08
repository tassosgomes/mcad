package br.com.ecad.distribuicao.infra.events;

import br.com.ecad.distribuicao.domain.entities.EventoEstorno;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Payload validado e tipado do CloudEvent {@code arrecadacao.pagamento.estornado}.
 * Representa o conteúdo do campo {@code data.*} após validação no listener.
 */
public record PagamentoEstornadoEventPayload(
        UUID eventId,
        UUID pagamentoId,
        UUID licencaId,
        String rubricaSigla,
        String periodoOrigem,
        BigDecimal quantidadeUdas,
        BigDecimal valorEstornadoBruto,
        String justificativa,
        String estornadoPor,
        Instant estornadoEm) {

    public EventoEstorno toEventoEstorno() {
        return new EventoEstorno(
                eventId,
                pagamentoId,
                licencaId,
                rubricaSigla,
                periodoOrigem,
                quantidadeUdas,
                valorEstornadoBruto,
                justificativa,
                estornadoPor,
                estornadoEm);
    }
}
