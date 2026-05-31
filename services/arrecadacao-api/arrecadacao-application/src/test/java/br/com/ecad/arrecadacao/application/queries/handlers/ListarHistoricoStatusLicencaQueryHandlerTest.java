package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.actor.ActorDisplayResponse;
import br.com.ecad.arrecadacao.application.actor.ActorDisplayResolver;
import br.com.ecad.arrecadacao.application.actor.IdentityUserLookup;
import br.com.ecad.arrecadacao.application.actor.IdentityUserProjection;
import br.com.ecad.arrecadacao.application.dto.HistoricoStatusLicencaResponse;
import br.com.ecad.arrecadacao.application.queries.ListarHistoricoStatusLicencaQuery;
import br.com.ecad.arrecadacao.domain.entities.HistoricoStatusLicenca;
import br.com.ecad.arrecadacao.domain.enums.StatusLicenca;
import br.com.ecad.arrecadacao.domain.interfaces.HistoricoStatusLicencaRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
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
class ListarHistoricoStatusLicencaQueryHandlerTest {

    @Mock
    private HistoricoStatusLicencaRepository historicoRepository;

    @Mock
    private IdentityUserLookup identityUserLookup;

    private ListarHistoricoStatusLicencaQueryHandler handler;

    @BeforeEach
    void setUp() {
        handler = new ListarHistoricoStatusLicencaQueryHandler(
                historicoRepository,
                new ActorDisplayResolver(identityUserLookup));
    }

    @Test
    @SuppressWarnings("unchecked")
    void handle_WithActorSnapshots_ShouldResolveActorsInBatchAndPreserveOrder() {
        // Arrange
        UUID licencaId = UUID.randomUUID();
        var currentHistory = HistoricoStatusLicenca.criar(
                licencaId,
                StatusLicenca.SUSPENSA,
                StatusLicenca.ATIVA,
                "Regularizou pagamento",
                "logto-user-1",
                "Maria congelada");
        var legacyHistory = HistoricoStatusLicenca.criar(
                licencaId,
                StatusLicenca.ATIVA,
                StatusLicenca.SUSPENSA,
                "Inadimplencia",
                "autor legado");

        when(historicoRepository.findByLicencaIdOrderByDataDesc(licencaId))
                .thenReturn(List.of(currentHistory, legacyHistory));
        when(identityUserLookup.findBySubjects(ArgumentMatchers.<Collection<String>>any()))
                .thenReturn(Map.of("logto-user-1", activeUser()));

        // Act
        List<HistoricoStatusLicencaResponse> responses =
                handler.handle(new ListarHistoricoStatusLicencaQuery(licencaId));

        // Assert
        assertThat(responses).hasSize(2);
        assertThat(responses).extracting(HistoricoStatusLicencaResponse::id)
                .containsExactly(currentHistory.getId(), legacyHistory.getId());

        HistoricoStatusLicencaResponse currentResponse = responses.get(0);
        assertThat(currentResponse.autor()).isEqualTo("Maria congelada");
        assertThat(currentResponse.ator().subject()).isEqualTo("logto-user-1");
        assertThat(currentResponse.ator().label()).isEqualTo("Maria congelada");
        assertThat(currentResponse.ator().username()).isEqualTo("maria.silva");
        assertThat(currentResponse.ator().status()).isEqualTo("ATIVO");

        HistoricoStatusLicencaResponse legacyResponse = responses.get(1);
        assertThat(legacyResponse.autor()).isEqualTo("autor legado");
        assertThat(legacyResponse.ator().subject()).isNull();
        assertThat(legacyResponse.ator().label()).isEqualTo("autor legado");
        assertThat(legacyResponse.ator().status()).isEqualTo("DESCONHECIDO");

        ArgumentCaptor<Collection<String>> subjectsCaptor = ArgumentCaptor.forClass(Collection.class);
        verify(identityUserLookup).findBySubjects(subjectsCaptor.capture());
        assertThat(subjectsCaptor.getValue()).containsExactly("logto-user-1");
        verify(identityUserLookup, never()).findBySubject("logto-user-1");
    }

    @Test
    void historicoStatusLicencaResponse_WhenSerialized_ShouldKeepAutorAndIncludeAtor() throws Exception {
        // Arrange
        var response = new HistoricoStatusLicencaResponse(
                UUID.randomUUID(),
                null,
                "ATIVA",
                "Licenca criada",
                "Maria Silva (maria.silva)",
                new ActorDisplayResponse(
                        "logto-user-1",
                        "Maria Silva (maria.silva)",
                        "maria.silva",
                        "Maria Silva",
                        "maria@mcad.dev",
                        "ATIVO"),
                null);

        // Act
        var objectMapper = new ObjectMapper();
        var json = objectMapper.writeValueAsString(response);
        var tree = objectMapper.readTree(json);

        // Assert
        assertThat(tree.get("autor").asText()).isEqualTo("Maria Silva (maria.silva)");
        assertThat(tree.get("ator").get("subject").asText()).isEqualTo("logto-user-1");
        assertThat(tree.get("ator").get("status").asText()).isEqualTo("ATIVO");
    }

    private IdentityUserProjection activeUser() {
        return new IdentityUserProjection(
                "logto-user-1",
                "maria.silva",
                "Maria Silva",
                "maria@mcad.dev",
                false,
                null);
    }
}
