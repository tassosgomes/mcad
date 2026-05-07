package br.com.ecad.distribuicao.tests.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.ecad.distribuicao.domain.entities.Rubrica;
import br.com.ecad.distribuicao.domain.interfaces.RubricaRepository;
import br.com.ecad.distribuicao.infra.events.RubricaEventHandler;
import br.com.ecad.distribuicao.infra.events.RubricaEventPayload;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RubricaEventHandlerTest {

    @Mock
    private RubricaRepository rubricaRepository;

    @InjectMocks
    private RubricaEventHandler rubricaEventHandler;

    @Test
    void deveCriarRubricaQuandoSiglaNaoExiste() {
        RubricaEventPayload payload = new RubricaEventPayload("RADIO", "Rádio AM/FM", false);
        when(rubricaRepository.findBySigla("RADIO")).thenReturn(Optional.empty());

        rubricaEventHandler.handle(payload);

        verify(rubricaRepository).upsertBySigla(argThat(rubrica ->
                rubrica.getSigla().equals("RADIO")
                        && rubrica.getNome().equals("Rádio AM/FM")
                        && !rubrica.isExigeClassificacao()));
    }

    @Test
    void deveAtualizarRubricaQuandoSiglaJaExiste() {
        Rubrica existente = Rubrica.criar("RADIO", "Nome Antigo", false);
        RubricaEventPayload payload = new RubricaEventPayload("RADIO", "Rádio Atualizada", true);
        when(rubricaRepository.findBySigla("RADIO")).thenReturn(Optional.of(existente));

        rubricaEventHandler.handle(payload);

        assertThat(existente.getNome()).isEqualTo("Rádio Atualizada");
        assertThat(existente.isExigeClassificacao()).isTrue();
        verify(rubricaRepository).upsertBySigla(existente);
    }

    @Test
    void deveManterIdempotenciaQuandoMesmoPayloadChegaMaisDeUmaVez() {
        Rubrica existente = Rubrica.criar("SHOW", "Show", false);
        RubricaEventPayload payload = new RubricaEventPayload("SHOW", "Show", false);
        when(rubricaRepository.findBySigla("SHOW"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(existente));

        rubricaEventHandler.handle(payload);
        rubricaEventHandler.handle(payload);

        verify(rubricaRepository, times(2)).findBySigla("SHOW");
        verify(rubricaRepository, times(2)).upsertBySigla(argThat(rubrica -> "SHOW".equals(rubrica.getSigla())));
    }
}
