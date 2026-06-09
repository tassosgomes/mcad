package br.com.ecad.arrecadacao.domain.entities;

import br.com.ecad.arrecadacao.domain.enums.StatusLicenca;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class LicencaTest {

    private final UUID usuarioMusicaId = UUID.randomUUID();
    private final UUID rubricaId = UUID.randomUUID();
    private final LocalDate hoje = LocalDate.now();
    private final LocalDate amanha = hoje.plusDays(1);
    private final LocalDate mesQueVem = hoje.plusMonths(1);

    @Test
    @DisplayName("Deve criar licenca com validade definida com sucesso")
    void deveCriarLicencaComValidadeDefinida() {
        var licenca = Licenca.criar(usuarioMusicaId, rubricaId, hoje, mesQueVem);

        assertNotNull(licenca.getId());
        assertEquals(usuarioMusicaId, licenca.getUsuarioMusicaId());
        assertEquals(rubricaId, licenca.getRubricaId());
        assertEquals(hoje, licenca.getDataInicio());
        assertEquals(mesQueVem, licenca.getDataFim());
        assertEquals(StatusLicenca.ATIVA, licenca.getStatus());
        assertNotNull(licenca.getCriadoEm());
        assertNotNull(licenca.getAtualizadoEm());
    }

    @Test
    @DisplayName("Deve criar licenca com vigencia indefinida (dataFim null) com sucesso")
    void deveCriarLicencaComVigenciaIndefinida() {
        var licenca = Licenca.criar(usuarioMusicaId, rubricaId, hoje, null);

        assertNotNull(licenca.getId());
        assertEquals(hoje, licenca.getDataInicio());
        assertNull(licenca.getDataFim());
        assertEquals(StatusLicenca.ATIVA, licenca.getStatus());
    }

    @Test
    @DisplayName("Nao deve criar licenca com dataInicio anterior a hoje")
    void naoDeveCriarLicencaDataInicioNoPassado() {
        var ontem = hoje.minusDays(1);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            Licenca.criar(usuarioMusicaId, rubricaId, ontem, mesQueVem);
        });

        assertEquals("dataInicio nao pode ser anterior a hoje", ex.getMessage());
    }

    @Test
    @DisplayName("Nao deve criar licenca com dataFim igual a dataInicio")
    void naoDeveCriarLicencaDataFimIgualInicio() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            Licenca.criar(usuarioMusicaId, rubricaId, hoje, hoje);
        });

        assertEquals("dataFim deve ser posterior a dataInicio", ex.getMessage());
    }

    @Test
    @DisplayName("Nao deve criar licenca com dataFim anterior a dataInicio")
    void naoDeveCriarLicencaDataFimAnteriorInicio() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            Licenca.criar(usuarioMusicaId, rubricaId, amanha, hoje);
        });

        assertEquals("dataFim deve ser posterior a dataInicio", ex.getMessage());
    }

    @Test
    @DisplayName("Deve suspender licenca ATIVA")
    void deveSuspenderLicencaAtiva() {
        var licenca = Licenca.criar(usuarioMusicaId, rubricaId, hoje, mesQueVem);

        var historico = licenca.suspender("Inadimplencia", "sistema");

        assertEquals(StatusLicenca.SUSPENSA, licenca.getStatus());
        
        assertNotNull(historico);
        assertEquals(licenca.getId(), historico.getLicencaId());
        assertEquals(StatusLicenca.ATIVA, historico.getStatusAnterior());
        assertEquals(StatusLicenca.SUSPENSA, historico.getStatusNovo());
        assertEquals("Inadimplencia", historico.getJustificativa());
        assertEquals("sistema", historico.getAutor());
    }

    @Test
    @DisplayName("Nao deve suspender licenca que ja esta SUSPENSA")
    void naoDeveSuspenderLicencaSuspensa() {
        var licenca = Licenca.criar(usuarioMusicaId, rubricaId, hoje, mesQueVem);
        licenca.suspender("Inadimplencia", "sistema");

        var ex = assertThrows(IllegalStateException.class, () -> {
            licenca.suspender("Outra razao", "sistema");
        });
        
        assertTrue(ex.getMessage().contains("Somente licenças ATIVAS podem ser suspensas"));
    }

    @Test
    @DisplayName("Nao deve suspender licenca ENCERRADA")
    void naoDeveSuspenderLicencaEncerrada() {
        var licenca = Licenca.criar(usuarioMusicaId, rubricaId, hoje, mesQueVem);
        licenca.suspender("Suspensa temporariamente", "sistema");
        licenca.encerrar("Encerramento final", "sistema");

        var ex = assertThrows(IllegalStateException.class, () -> {
            licenca.suspender("Voltar a suspender", "sistema");
        });

        assertTrue(ex.getMessage().contains("Somente licenças ATIVAS podem ser suspensas"));
    }

    @Test
    @DisplayName("Deve reativar licenca SUSPENSA")
    void deveReativarLicencaSuspensa() {
        var licenca = Licenca.criar(usuarioMusicaId, rubricaId, hoje, mesQueVem);
        licenca.suspender("Inadimplencia", "sistema");

        var historico = licenca.reativar("Pagamento realizado", "sistema");

        assertEquals(StatusLicenca.ATIVA, licenca.getStatus());
        
        assertNotNull(historico);
        assertEquals(licenca.getId(), historico.getLicencaId());
        assertEquals(StatusLicenca.SUSPENSA, historico.getStatusAnterior());
        assertEquals(StatusLicenca.ATIVA, historico.getStatusNovo());
    }

    @Test
    @DisplayName("Nao deve reativar licenca ATIVA")
    void naoDeveReativarLicencaAtiva() {
        var licenca = Licenca.criar(usuarioMusicaId, rubricaId, hoje, mesQueVem);

        var ex = assertThrows(IllegalStateException.class, () -> {
            licenca.reativar("Tentar reativar", "sistema");
        });
        
        assertTrue(ex.getMessage().contains("nao esta SUSPENSA"));
    }

    @Test
    @DisplayName("Nao deve reativar licenca ENCERRADA")
    void naoDeveReativarLicencaEncerrada() {
        var licenca = Licenca.criar(usuarioMusicaId, rubricaId, hoje, mesQueVem);
        licenca.suspender("Inadimplencia", "sistema");
        licenca.encerrar("Encerrado o contrato", "sistema");

        var ex = assertThrows(IllegalStateException.class, () -> {
            licenca.reativar("Tentar reativar", "sistema");
        });
        
        assertTrue(ex.getMessage().contains("nao esta SUSPENSA"));
    }
    
    @Test
    @DisplayName("Deve encerrar licenca SUSPENSA")
    void deveEncerrarLicencaSuspensa() {
        var licenca = Licenca.criar(usuarioMusicaId, rubricaId, hoje, mesQueVem);
        licenca.suspender("Inadimplencia", "sistema");

        var historico = licenca.encerrar("Contrato cancelado", "sistema");

        assertEquals(StatusLicenca.ENCERRADA, licenca.getStatus());
        
        assertNotNull(historico);
        assertEquals(licenca.getId(), historico.getLicencaId());
        assertEquals(StatusLicenca.SUSPENSA, historico.getStatusAnterior());
        assertEquals(StatusLicenca.ENCERRADA, historico.getStatusNovo());
    }

    @Test
    @DisplayName("Nao deve encerrar licenca ATIVA diretamente")
    void naoDeveEncerrarLicencaAtiva() {
        var licenca = Licenca.criar(usuarioMusicaId, rubricaId, hoje, mesQueVem);

        var ex = assertThrows(IllegalStateException.class, () -> {
            licenca.encerrar("Cancelar direto", "sistema");
        });
        
        assertEquals("Licenca deve ser suspensa antes de ser encerrada", ex.getMessage());
    }

    @Test
    @DisplayName("Nao deve encerrar licenca que ja esta ENCERRADA")
    void naoDeveEncerrarLicencaEncerrada() {
        var licenca = Licenca.criar(usuarioMusicaId, rubricaId, hoje, mesQueVem);
        licenca.suspender("Inadimplencia", "sistema");
        licenca.encerrar("Cancelamento", "sistema");

        var ex = assertThrows(IllegalStateException.class, () -> {
            licenca.encerrar("Outro cancelamento", "sistema");
        });
        
        assertEquals("Licença já está ENCERRADA. Esta transição não é permitida.", ex.getMessage());
    }
}
