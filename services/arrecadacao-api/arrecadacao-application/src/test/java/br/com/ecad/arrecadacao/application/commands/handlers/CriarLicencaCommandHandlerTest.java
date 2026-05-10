package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.audit.AuditContextProvider;
import br.com.ecad.arrecadacao.application.audit.GenericAuditEventFactory;
import br.com.ecad.arrecadacao.application.commands.CriarLicencaCommand;
import br.com.ecad.arrecadacao.domain.entities.HistoricoStatusLicenca;
import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.enums.StatusUsuarioMusica;
import br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.interfaces.HistoricoStatusLicencaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.LicencaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import br.org.ecad.audit.sdk.AuditClient;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CriarLicencaCommandHandlerTest {

    @Mock
    private LicencaRepository licencaRepository;
    @Mock
    private HistoricoStatusLicencaRepository historicoRepository;
    @Mock
    private UsuarioMusicaRepository usuarioMusicaRepository;
    @Mock
    private RubricaRepository rubricaRepository;
    @Mock
    private AuditClient auditClient;
    @Mock
    private GenericAuditEventFactory auditFactory;
    @Mock
    private AuditContextProvider auditContextProvider;

    @InjectMocks
    private CriarLicencaCommandHandler handler;

    private UUID usuarioMusicaId;
    private UUID rubricaId;
    private CriarLicencaCommand command;
    private UsuarioMusica usuarioMusica;
    private Rubrica rubrica;

    @BeforeEach
    void setUp() {
        usuarioMusicaId = UUID.randomUUID();
        rubricaId = UUID.randomUUID();
        command = new CriarLicencaCommand(usuarioMusicaId, rubricaId, LocalDate.now(), LocalDate.now().plusYears(1), "sistema");
        
        usuarioMusica = mock(UsuarioMusica.class);
        lenient().when(usuarioMusica.getId()).thenReturn(usuarioMusicaId);
        lenient().when(usuarioMusica.getRazaoSocial()).thenReturn("Razao Social");
        br.com.ecad.arrecadacao.domain.valueobjects.Cnpj cnpjMock = mock(br.com.ecad.arrecadacao.domain.valueobjects.Cnpj.class);
        lenient().when(usuarioMusica.getCnpj()).thenReturn(cnpjMock);
        lenient().when(cnpjMock.getFormatado()).thenReturn("00.000.000/0001-00");
        
        rubrica = mock(Rubrica.class);
        lenient().when(rubrica.getId()).thenReturn(rubricaId);
        lenient().when(rubrica.getSigla()).thenReturn("SIGLA");
        lenient().when(rubrica.getNome()).thenReturn("Nome");
    }

    @Test
    void deveCriarLicencaComSucesso() {
        when(usuarioMusicaRepository.findById(usuarioMusicaId)).thenReturn(Optional.of(usuarioMusica));
        when(usuarioMusica.getStatus()).thenReturn(StatusUsuarioMusica.ATIVO);
        when(rubricaRepository.findById(rubricaId)).thenReturn(Optional.of(rubrica));
        when(licencaRepository.save(any(Licenca.class))).thenAnswer(i -> i.getArgument(0));
        when(historicoRepository.save(any(HistoricoStatusLicenca.class))).thenAnswer(i -> i.getArgument(0));

        var response = handler.handle(command);

        assertNotNull(response);
        assertEquals(usuarioMusicaId, response.usuarioMusica().id());
        assertEquals(rubricaId, response.rubrica().id());
        assertEquals("ATIVA", response.status());
        
        verify(licencaRepository).save(any(Licenca.class));
        verify(historicoRepository).save(any(HistoricoStatusLicenca.class));
    }

    @Test
    void lancaErroSeUsuarioNaoEncontrado() {
        when(usuarioMusicaRepository.findById(usuarioMusicaId)).thenReturn(Optional.empty());

        assertThrows(EntidadeNaoEncontradaException.class, () -> handler.handle(command));
        verifyNoInteractions(rubricaRepository, licencaRepository, historicoRepository);
    }

    @Test
    void lancaErroSeUsuarioInativo() {
        when(usuarioMusicaRepository.findById(usuarioMusicaId)).thenReturn(Optional.of(usuarioMusica));
        when(usuarioMusica.getStatus()).thenReturn(StatusUsuarioMusica.INATIVO);

        var ex = assertThrows(IllegalStateException.class, () -> handler.handle(command));
        assertTrue(ex.getMessage().contains("INATIVO"));
        verifyNoInteractions(rubricaRepository, licencaRepository, historicoRepository);
    }

    @Test
    void lancaErroSeRubricaNaoEncontrada() {
        when(usuarioMusicaRepository.findById(usuarioMusicaId)).thenReturn(Optional.of(usuarioMusica));
        when(usuarioMusica.getStatus()).thenReturn(StatusUsuarioMusica.ATIVO);
        when(rubricaRepository.findById(rubricaId)).thenReturn(Optional.empty());

        assertThrows(EntidadeNaoEncontradaException.class, () -> handler.handle(command));
        verifyNoInteractions(licencaRepository, historicoRepository);
    }
}
