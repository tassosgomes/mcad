package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.actor.ActorDisplayResolver;
import br.com.ecad.arrecadacao.application.actor.IdentityUserLookup;
import br.com.ecad.arrecadacao.application.actor.IdentityUserProjection;
import br.com.ecad.arrecadacao.application.dto.PagamentoResponse;
import br.com.ecad.arrecadacao.application.queries.ListarPagamentosQuery;
import br.com.ecad.arrecadacao.domain.entities.Pagamento;
import br.com.ecad.arrecadacao.domain.interfaces.PagamentoRepository;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ListarPagamentosQueryHandlerTest {

    private static final UUID LICENCA_ID = UUID.randomUUID();
    private static final String JUSTIFICATIVA = "Pagamento registrado em duplicidade com valor incorreto.";

    @Mock
    private PagamentoRepository pagamentoRepository;

    @Mock
    private IdentityUserLookup identityUserLookup;

    private ListarPagamentosQueryHandler handler;

    @BeforeEach
    void setUp() {
        handler = new ListarPagamentosQueryHandler(
                pagamentoRepository,
                new ActorDisplayResolver(identityUserLookup));
    }

    @Test
    @SuppressWarnings("unchecked")
    void handle_WithEstornoActors_ShouldResolveActorsInBatchAndKeepConfirmedPaymentActorNull() {
        Pagamento currentEstornado = pagamento();
        currentEstornado.estornar(JUSTIFICATIVA, "logto-user-estorno", "Carlos congelado");
        Pagamento legacyEstornado = pagamento();
        legacyEstornado.estornar(JUSTIFICATIVA, "autor legado");
        Pagamento confirmado = pagamento();

        when(pagamentoRepository.findAll(any(), any()))
                .thenReturn(new PageImpl<>(List.of(currentEstornado, legacyEstornado, confirmado)));
        when(identityUserLookup.findBySubjects(ArgumentMatchers.<Collection<String>>any()))
                .thenReturn(Map.of("logto-user-estorno", activeUser()));

        var response = handler.handle(new ListarPagamentosQuery(
                0,
                20,
                null,
                null,
                null,
                null,
                null,
                null));

        List<PagamentoResponse> items = response.items();
        assertThat(items).hasSize(3);

        assertThat(items.get(0).estornadoPor()).isEqualTo("Carlos congelado");
        assertThat(items.get(0).estornadoPorAtor().subject()).isEqualTo("logto-user-estorno");
        assertThat(items.get(0).estornadoPorAtor().label()).isEqualTo("Carlos congelado");
        assertThat(items.get(0).estornadoPorAtor().username()).isEqualTo("carlos.melo");
        assertThat(items.get(0).estornadoPorAtor().status()).isEqualTo("ATIVO");

        assertThat(items.get(1).estornadoPor()).isEqualTo("autor legado");
        assertThat(items.get(1).estornadoPorAtor().subject()).isNull();
        assertThat(items.get(1).estornadoPorAtor().label()).isEqualTo("autor legado");
        assertThat(items.get(1).estornadoPorAtor().status()).isEqualTo("DESCONHECIDO");

        assertThat(items.get(2).estornadoPor()).isNull();
        assertThat(items.get(2).estornadoPorAtor()).isNull();
        assertThat(items.get(2).estornadoEm()).isNull();

        ArgumentCaptor<Collection<String>> subjectsCaptor = ArgumentCaptor.forClass(Collection.class);
        verify(identityUserLookup).findBySubjects(subjectsCaptor.capture());
        assertThat(subjectsCaptor.getValue()).containsExactly("logto-user-estorno");
        verify(identityUserLookup, never()).findBySubject("logto-user-estorno");
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
