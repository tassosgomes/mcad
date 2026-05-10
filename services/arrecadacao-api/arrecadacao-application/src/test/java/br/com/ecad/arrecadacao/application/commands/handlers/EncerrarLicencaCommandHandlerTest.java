package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.audit.AuditContextProvider;
import br.com.ecad.arrecadacao.application.audit.GenericAuditEventFactory;
import br.com.ecad.arrecadacao.application.commands.EncerrarLicencaCommand;
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
class EncerrarLicencaCommandHandlerTest {

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
    private EncerrarLicencaCommandHandler handler;

    private UUID licencaId;
    private EncerrarLicencaCommand command;
    private Licenca licenca;

    @BeforeEach
    void setUp() {
        licencaId = UUID.randomUUID();
        command = new EncerrarLicencaCommand(licencaId, "Cancelamento definitivo", "sistema");
        
        licenca = mock(Licenca.class);
        lenient().when(licenca.getId()).thenReturn(licencaId);
        lenient().when(licenca.getUsuarioMusicaId()).thenReturn(UUID.randomUUID());
        lenient().when(licenca.getRubricaId()).thenReturn(UUID.randomUUID());
        lenient().when(licenca.getStatus()).thenReturn(StatusLicenca.ATIVA);
    }

    @Test
    void deveEncerrarComSucesso() {
        when(licencaRepository.findById(licencaId)).thenReturn(Optional.of(licenca));
        when(licenca.encerrar(anyString(), anyString())).thenReturn(mock(HistoricoStatusLicenca.class));
        when(licenca.getStatus()).thenReturn(StatusLicenca.ENCERRADA);
        
        var usuario = mock(UsuarioMusica.class);
        br.com.ecad.arrecadacao.domain.valueobjects.Cnpj cnpjMock = mock(br.com.ecad.arrecadacao.domain.valueobjects.Cnpj.class);
        when(usuario.getCnpj()).thenReturn(cnpjMock);
        when(cnpjMock.getFormatado()).thenReturn("00.000.000/0001-00");
        var rubrica = mock(Rubrica.class);
        when(usuarioMusicaRepository.findById(any())).thenReturn(Optional.of(usuario));
        when(rubricaRepository.findById(any())).thenReturn(Optional.of(rubrica));

        var response = handler.handle(command);

        assertEquals("ENCERRADA", response.status());
        verify(licenca).encerrar(command.justificativa(), command.autor());
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
    void propagaErroSeLicencaJaEncerrada() {
        when(licencaRepository.findById(licencaId)).thenReturn(Optional.of(licenca));
        when(licenca.encerrar(anyString(), anyString())).thenThrow(new IllegalStateException("ja esta encerrada"));

        var ex = assertThrows(IllegalStateException.class, () -> handler.handle(command));
        assertTrue(ex.getMessage().contains("ja esta encerrada"));
        verify(licencaRepository, never()).save(any());
    }

    @Test
    void propagaErroSeLicencaSendoAtiva() {
        when(licencaRepository.findById(licencaId)).thenReturn(Optional.of(licenca));
        when(licenca.encerrar(anyString(), anyString())).thenThrow(new IllegalStateException("suspensa antes"));

        var ex = assertThrows(IllegalStateException.class, () -> handler.handle(command));
        assertTrue(ex.getMessage().contains("suspensa antes"));
        verify(licencaRepository, never()).save(any());
    }
}
