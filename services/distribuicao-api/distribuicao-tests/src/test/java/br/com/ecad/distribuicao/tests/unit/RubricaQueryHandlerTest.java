package br.com.ecad.distribuicao.tests.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import br.com.ecad.distribuicao.application.queries.BuscarRubricaPorSiglaQuery;
import br.com.ecad.distribuicao.application.queries.ListarRubricasQuery;
import br.com.ecad.distribuicao.application.queries.handlers.BuscarRubricaPorSiglaQueryHandler;
import br.com.ecad.distribuicao.application.queries.handlers.ListarRubricasQueryHandler;
import br.com.ecad.distribuicao.domain.entities.Rubrica;
import br.com.ecad.distribuicao.domain.exceptions.NotFoundException;
import br.com.ecad.distribuicao.domain.interfaces.RubricaRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RubricaQueryHandlerTest {

    @Mock
    private RubricaRepository rubricaRepository;

    @InjectMocks
    private ListarRubricasQueryHandler listarRubricasQueryHandler;

    @InjectMocks
    private BuscarRubricaPorSiglaQueryHandler buscarRubricaPorSiglaQueryHandler;

    @Test
    void deveListarRubricasQuandoExistemRegistros() {
        when(rubricaRepository.findAll()).thenReturn(List.of(
                Rubrica.criar("RADIO", "Rádio AM/FM", false),
                Rubrica.criar("TV_ABERTA", "TV Aberta", true)));

        var response = listarRubricasQueryHandler.handle(new ListarRubricasQuery());

        assertThat(response).hasSize(2);
        assertThat(response.getFirst().sigla()).isEqualTo("RADIO");
    }

    @Test
    void deveRetornarListaVaziaQuandoNaoExistemRubricas() {
        when(rubricaRepository.findAll()).thenReturn(List.of());

        var response = listarRubricasQueryHandler.handle(new ListarRubricasQuery());

        assertThat(response).isEmpty();
    }

    @Test
    void deveBuscarRubricaPorSiglaQuandoExistente() {
        when(rubricaRepository.findBySigla("TV_ABERTA"))
                .thenReturn(Optional.of(Rubrica.criar("TV_ABERTA", "TV Aberta", true)));

        var response = buscarRubricaPorSiglaQueryHandler.handle(new BuscarRubricaPorSiglaQuery("TV_ABERTA"));

        assertThat(response.sigla()).isEqualTo("TV_ABERTA");
        assertThat(response.exigeClassificacao()).isTrue();
    }

    @Test
    void deveLancarNotFoundQuandoRubricaNaoExiste() {
        when(rubricaRepository.findBySigla("INEXISTENTE")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> buscarRubricaPorSiglaQueryHandler.handle(
                new BuscarRubricaPorSiglaQuery("INEXISTENTE")))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Rubrica com sigla 'INEXISTENTE' não foi encontrada");
    }
}
