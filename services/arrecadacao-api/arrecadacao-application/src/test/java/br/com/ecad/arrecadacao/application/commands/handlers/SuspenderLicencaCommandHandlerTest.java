package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.audit.AuditContextProvider;
import br.com.ecad.arrecadacao.application.audit.GenericAuditEventFactory;
import br.com.ecad.arrecadacao.application.commands.SuspenderLicencaCommand;
import br.com.ecad.arrecadacao.domain.entities.HistoricoStatusLicenca;
import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.enums.StatusLicenca;
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

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SuspenderLicencaCommandHandlerTest {

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
    private SuspenderLicencaCommandHandler handler;

    private UUID licencaId;
    private SuspenderLicencaCommand command;
    private Licenca licenca;

    @BeforeEach
    void setUp() {
        licencaId = UUID.randomUUID();
        command = new SuspenderLicencaCommand(licencaId, "Inadimplencia", "sistema");
        
        licenca = mock(Licenca.class);
        lenient().when(licenca.getId()).thenReturn(licencaId);
        lenient().when(licenca.getUsuarioMusicaId()).thenReturn(UUID.randomUUID());
        lenient().when(licenca.getRubricaId()).thenReturn(UUID.randomUUID());
        lenient().when(licenca.getStatus()).thenReturn(StatusLicenca.ATIVA);
    }

    @Test
    void deveSuspenderComSucesso() {
        when(licencaRepository.findById(licencaId)).thenReturn(Optional.of(licenca));
        when(licenca.suspender(anyString(), anyString())).thenReturn(mock(HistoricoStatusLicenca.class));
        when(licenca.getStatus()).thenReturn(StatusLicenca.SUSPENSA);
        
        var usuario = mock(UsuarioMusica.class);
        br.com.ecad.arrecadacao.domain.valueobjects.Cnpj cnpjMock = mock(br.com.ecad.arrecadacao.domain.valueobjects.Cnpj.class);
        when(usuario.getCnpj()).thenReturn(cnpjMock);
        when(cnpjMock.getFormatado()).thenReturn("00.000.000/0001-00");
        var rubrica = mock(Rubrica.class);
        when(usuarioMusicaRepository.findById(any())).thenReturn(Optional.of(usuario));
        when(rubricaRepository.findById(any())).thenReturn(Optional.of(rubrica));

        var response = handler.handle(command);

        assertEquals("SUSPENSA", response.status());
        verify(licenca).suspender(command.justificativa(), command.autor());
        verify(licencaRepository).save(licenca);
        verify(historicoRepository).save(any());
    }

    @Test
    void lancaErroSeLicencaNaoEncontrada() {
        when(licencaRepository.findById(licencaId)).thenReturn(Optional.empty());

        assertThrows(EntidadeNaoEncontradaException.class, () -> handler.handle(command));
        verifyNoInteractions(historicoRepository, usuarioMusicaRepository, rubricaRepository);
    }

    @Test
    void propagaErroSeLicencaJaSuspensa() {
        when(licencaRepository.findById(licencaId)).thenReturn(Optional.of(licenca));
        when(licenca.suspender(anyString(), anyString())).thenThrow(new IllegalStateException("nao esta ATIVA"));

        var ex = assertThrows(IllegalStateException.class, () -> handler.handle(command));
        assertTrue(ex.getMessage().contains("nao esta ATIVA"));
        verify(licencaRepository, never()).save(any());
    }
}
