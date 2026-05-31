package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.actor.ActorDisplayResolver;
import br.com.ecad.arrecadacao.application.actor.IdentityUserLookup;
import br.com.ecad.arrecadacao.application.actor.IdentityUserProjection;
import br.com.ecad.arrecadacao.application.queries.ConsultarUdaVigenteQuery;
import br.com.ecad.arrecadacao.domain.entities.UdaValor;
import br.com.ecad.arrecadacao.domain.interfaces.UdaValorRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConsultarUdaVigenteQueryHandlerTest {

    @Mock
    private UdaValorRepository udaValorRepository;

    @Mock
    private IdentityUserLookup identityUserLookup;

    private ConsultarUdaVigenteQueryHandler handler;

    @BeforeEach
    void setUp() {
        handler = new ConsultarUdaVigenteQueryHandler(
                udaValorRepository,
                new ActorDisplayResolver(identityUserLookup));
    }

    @Test
    void handle_WithActorSnapshot_ShouldReturnCriadoPorAtor() {
        UdaValor uda = UdaValor.criar(
                new BigDecimal("120.00"),
                LocalDate.now(),
                "logto-user-uda",
                "Ana congelada");

        when(udaValorRepository.findVigente(LocalDate.now())).thenReturn(Optional.of(uda));
        when(identityUserLookup.findBySubject("logto-user-uda"))
                .thenReturn(Optional.of(activeUser()));

        var response = handler.handle(new ConsultarUdaVigenteQuery());

        assertThat(response.criadoPor()).isEqualTo("Ana congelada");
        assertThat(response.criadoPorAtor().subject()).isEqualTo("logto-user-uda");
        assertThat(response.criadoPorAtor().label()).isEqualTo("Ana congelada");
        assertThat(response.criadoPorAtor().status()).isEqualTo("ATIVO");
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
