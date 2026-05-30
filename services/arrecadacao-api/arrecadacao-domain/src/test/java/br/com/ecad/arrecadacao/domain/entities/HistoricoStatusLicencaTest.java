package br.com.ecad.arrecadacao.domain.entities;

import br.com.ecad.arrecadacao.domain.enums.StatusLicenca;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class HistoricoStatusLicencaTest {

    private final UUID licencaId = UUID.randomUUID();

    @Test
    @DisplayName("Deve criar historico com todos os campos validos")
    void deveCriarHistoricoComSucesso() {
        var historico = HistoricoStatusLicenca.criar(
                licencaId, StatusLicenca.ATIVA, StatusLicenca.SUSPENSA,
                "Inadimplencia recorrente", "sistema");

        assertNotNull(historico.getId());
        assertEquals(licencaId, historico.getLicencaId());
        assertEquals(StatusLicenca.ATIVA, historico.getStatusAnterior());
        assertEquals(StatusLicenca.SUSPENSA, historico.getStatusNovo());
        assertEquals("Inadimplencia recorrente", historico.getJustificativa());
        assertEquals("sistema", historico.getAutor());
        assertNull(historico.getAtorSubject());
        assertNull(historico.getAutorRotulo());
        assertNotNull(historico.getData());
    }

    @Test
    @DisplayName("Deve criar historico inicial com statusAnterior null")
    void deveCriarHistoricoInicial() {
        var historico = HistoricoStatusLicenca.criar(
                licencaId, null, StatusLicenca.ATIVA,
                "Criacao de licenca", "usuario123");

        assertNotNull(historico.getId());
        assertNull(historico.getStatusAnterior());
        assertEquals(StatusLicenca.ATIVA, historico.getStatusNovo());
    }

    @Test
    @DisplayName("Nao deve criar historico com justificativa nula")
    void naoDeveCriarComJustificativaNula() {
        assertThrows(NullPointerException.class, () -> {
            HistoricoStatusLicenca.criar(licencaId, StatusLicenca.ATIVA, StatusLicenca.SUSPENSA, null, "sistema");
        });
    }

    @Test
    @DisplayName("Nao deve criar historico com justificativa menor que 10 caracteres")
    void naoDeveCriarComJustificativaCurta() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            HistoricoStatusLicenca.criar(licencaId, StatusLicenca.ATIVA, StatusLicenca.SUSPENSA, "curta", "sistema");
        });

        assertEquals("Justificativa deve ter no minimo 10 caracteres", ex.getMessage());
    }

    @Test
    void criar_AutorNull_DeveLancar() {
        assertThrows(NullPointerException.class, () -> {
            HistoricoStatusLicenca.criar(
                    licencaId, StatusLicenca.ATIVA, StatusLicenca.SUSPENSA,
                    "Inadimplencia recorrente", null);
        });
    }

    @Test
    void criar_ComSnapshotAtor_DevePersistirSubjectRotuloELegado() {
        var historico = HistoricoStatusLicenca.criar(
                licencaId, StatusLicenca.ATIVA, StatusLicenca.SUSPENSA,
                "Inadimplencia recorrente", "logto-user-1", "Maria Silva (maria.silva)");

        assertEquals("logto-user-1", historico.getAtorSubject());
        assertEquals("Maria Silva (maria.silva)", historico.getAutorRotulo());
        assertEquals("Maria Silva (maria.silva)", historico.getAutor());
    }

    @Test
    void criar_ComSnapshotAtorERotuloEmBranco_DeveLancar() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            HistoricoStatusLicenca.criar(
                    licencaId, StatusLicenca.ATIVA, StatusLicenca.SUSPENSA,
                    "Inadimplencia recorrente", "logto-user-1", " ");
        });

        assertEquals("autorRotulo e obrigatorio", ex.getMessage());
    }
}
