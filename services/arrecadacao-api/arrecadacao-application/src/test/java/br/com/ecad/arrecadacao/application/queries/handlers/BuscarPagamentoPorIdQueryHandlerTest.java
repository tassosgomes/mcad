package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.actor.ActorDisplayResponse;
import br.com.ecad.arrecadacao.application.actor.ActorDisplayResolver;
import br.com.ecad.arrecadacao.application.actor.IdentityUserLookup;
import br.com.ecad.arrecadacao.application.actor.IdentityUserProjection;
import br.com.ecad.arrecadacao.application.dto.PagamentoResponse;
import br.com.ecad.arrecadacao.application.queries.BuscarPagamentoPorIdQuery;
import br.com.ecad.arrecadacao.domain.entities.Pagamento;
import br.com.ecad.arrecadacao.domain.interfaces.PagamentoRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BuscarPagamentoPorIdQueryHandlerTest {

    private static final UUID LICENCA_ID = UUID.randomUUID();
    private static final String JUSTIFICATIVA = "Pagamento registrado em duplicidade com valor incorreto.";

    @Mock
    private PagamentoRepository pagamentoRepository;

    @Mock
    private IdentityUserLookup identityUserLookup;

    private BuscarPagamentoPorIdQueryHandler handler;

    @BeforeEach
    void setUp() {
        handler = new BuscarPagamentoPorIdQueryHandler(
                pagamentoRepository,
                new ActorDisplayResolver(identityUserLookup));
    }

    @Test
    void handle_WithEstornoActor_ShouldReturnEstornadoPorAtor() {
        Pagamento pagamento = pagamento();
        pagamento.estornar(JUSTIFICATIVA, "logto-user-estorno", "Carlos congelado");
        when(pagamentoRepository.findById(pagamento.getId())).thenReturn(Optional.of(pagamento));
        when(identityUserLookup.findBySubject("logto-user-estorno"))
                .thenReturn(Optional.of(activeUser()));

        var response = handler.handle(new BuscarPagamentoPorIdQuery(pagamento.getId()));

        assertThat(response.estornadoPor()).isEqualTo("Carlos congelado");
        assertThat(response.estornadoPorAtor().subject()).isEqualTo("logto-user-estorno");
        assertThat(response.estornadoPorAtor().label()).isEqualTo("Carlos congelado");
        assertThat(response.estornadoPorAtor().status()).isEqualTo("ATIVO");
    }

    @Test
    void handle_WithConfirmedPayment_ShouldKeepEstornoFieldsNull() {
        Pagamento pagamento = pagamento();
        when(pagamentoRepository.findById(pagamento.getId())).thenReturn(Optional.of(pagamento));

        var response = handler.handle(new BuscarPagamentoPorIdQuery(pagamento.getId()));

        assertThat(response.estornadoPor()).isNull();
        assertThat(response.estornadoPorAtor()).isNull();
        assertThat(response.estornadoEm()).isNull();
        verify(identityUserLookup, never()).findBySubject("logto-user-estorno");
    }

    @Test
    void pagamentoResponse_WhenSerialized_ShouldKeepEstornadoPorAndIncludeEstornadoPorAtor() throws Exception {
        var response = new PagamentoResponse(
                UUID.randomUUID(),
                null,
                "2.500000",
                "107.310000",
                "268.275000",
                "2026-05",
                "ESTORNADO",
                null,
                null,
                null,
                JUSTIFICATIVA,
                "Carlos Melo (carlos.melo)",
                new ActorDisplayResponse(
                        "logto-user-estorno",
                        "Carlos Melo (carlos.melo)",
                        "carlos.melo",
                        "Carlos Melo",
                        "carlos@mcad.dev",
                        "ATIVO"),
                null);

        var objectMapper = new ObjectMapper();
        var json = objectMapper.writeValueAsString(response);
        var tree = objectMapper.readTree(json);

        assertThat(tree.get("estornadoPor").asText()).isEqualTo("Carlos Melo (carlos.melo)");
        assertThat(tree.get("estornadoPorAtor").get("subject").asText()).isEqualTo("logto-user-estorno");
        assertThat(tree.get("estornadoPorAtor").get("status").asText()).isEqualTo("ATIVO");
    }

    private Pagamento pagamento() {
        return Pagamento.registrar(
                LICENCA_ID,
                new BigDecimal("2.5"),
                new BigDecimal("107.31"));
    }

    private IdentityUserProjection activeUser() {
        return new IdentityUserProjection(
                "logto-user-estorno",
                "carlos.melo",
                "Carlos Melo",
                "carlos@mcad.dev",
                false,
                null);
    }
}
