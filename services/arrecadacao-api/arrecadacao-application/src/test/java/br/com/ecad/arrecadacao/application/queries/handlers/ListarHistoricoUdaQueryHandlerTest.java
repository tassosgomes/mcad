package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.actor.ActorDisplayResponse;
import br.com.ecad.arrecadacao.application.actor.ActorDisplayResolver;
import br.com.ecad.arrecadacao.application.actor.IdentityUserLookup;
import br.com.ecad.arrecadacao.application.actor.IdentityUserProjection;
import br.com.ecad.arrecadacao.application.dto.UdaResponse;
import br.com.ecad.arrecadacao.application.queries.ListarHistoricoUdaQuery;
import br.com.ecad.arrecadacao.domain.entities.UdaValor;
import br.com.ecad.arrecadacao.domain.interfaces.UdaValorRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ListarHistoricoUdaQueryHandlerTest {

    @Mock
    private UdaValorRepository udaValorRepository;

    @Mock
    private IdentityUserLookup identityUserLookup;

    private ListarHistoricoUdaQueryHandler handler;

    @BeforeEach
    void setUp() {
        handler = new ListarHistoricoUdaQueryHandler(
                udaValorRepository,
                new ActorDisplayResolver(identityUserLookup));
    }

    @Test
    @SuppressWarnings("unchecked")
    void handle_WithActorSnapshots_ShouldResolveActorsInBatchAndPreserveOrder() {
        UdaValor currentUda = UdaValor.criar(
                new BigDecimal("120.00"),
                LocalDate.of(2026, 7, 1),
                "logto-user-uda",
                "Ana congelada");
        UdaValor legacyUda = UdaValor.criar(
                new BigDecimal("110.00"),
                LocalDate.of(2026, 6, 1),
                "autor legado");

        when(udaValorRepository.findAllOrderByDataVigenciaDesc())
                .thenReturn(List.of(currentUda, legacyUda));
        when(identityUserLookup.findBySubjects(ArgumentMatchers.<Collection<String>>any()))
                .thenReturn(Map.of("logto-user-uda", activeUser()));

        List<UdaResponse> responses = handler.handle(new ListarHistoricoUdaQuery());

        assertThat(responses).hasSize(2);
        assertThat(responses).extracting(UdaResponse::id)
                .containsExactly(currentUda.getId(), legacyUda.getId());

        UdaResponse currentResponse = responses.get(0);
        assertThat(currentResponse.criadoPor()).isEqualTo("Ana congelada");
        assertThat(currentResponse.criadoPorAtor().subject()).isEqualTo("logto-user-uda");
        assertThat(currentResponse.criadoPorAtor().label()).isEqualTo("Ana congelada");
        assertThat(currentResponse.criadoPorAtor().username()).isEqualTo("ana.lima");
        assertThat(currentResponse.criadoPorAtor().status()).isEqualTo("ATIVO");

        UdaResponse legacyResponse = responses.get(1);
        assertThat(legacyResponse.criadoPor()).isEqualTo("autor legado");
        assertThat(legacyResponse.criadoPorAtor().subject()).isNull();
        assertThat(legacyResponse.criadoPorAtor().label()).isEqualTo("autor legado");
        assertThat(legacyResponse.criadoPorAtor().status()).isEqualTo("DESCONHECIDO");

        ArgumentCaptor<Collection<String>> subjectsCaptor = ArgumentCaptor.forClass(Collection.class);
        verify(identityUserLookup).findBySubjects(subjectsCaptor.capture());
        assertThat(subjectsCaptor.getValue()).containsExactly("logto-user-uda");
        verify(identityUserLookup, never()).findBySubject("logto-user-uda");
    }

    @Test
    void udaResponse_WhenSerialized_ShouldKeepCriadoPorAndIncludeCriadoPorAtor() throws Exception {
        var response = new UdaResponse(
                UUID.randomUUID(),
                "120.000000",
                LocalDate.of(2026, 7, 1),
                null,
                "Ana Lima (ana.lima)",
                new ActorDisplayResponse(
                        "logto-user-uda",
                        "Ana Lima (ana.lima)",
                        "ana.lima",
                        "Ana Lima",
                        "ana@mcad.dev",
                        "ATIVO"));

        var objectMapper = new ObjectMapper();
        var json = objectMapper.writeValueAsString(response);
        var tree = objectMapper.readTree(json);

        assertThat(tree.get("criadoPor").asText()).isEqualTo("Ana Lima (ana.lima)");
        assertThat(tree.get("criadoPorAtor").get("subject").asText()).isEqualTo("logto-user-uda");
        assertThat(tree.get("criadoPorAtor").get("status").asText()).isEqualTo("ATIVO");
    }

    private IdentityUserProjection activeUser() {
        return new IdentityUserProjection(
                "logto-user-uda",
                "ana.lima",
                "Ana Lima",
                "ana@mcad.dev",
                false,
                null);
    }
}
