package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.queries.ListarLicencasQuery;
import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.enums.StatusLicenca;
import br.com.ecad.arrecadacao.domain.interfaces.LicencaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings({"unchecked", "null"})
class ListarLicencasQueryHandlerTest {

    @Mock
    private LicencaRepository licencaRepository;
    @Mock
    private UsuarioMusicaRepository usuarioMusicaRepository;
    @Mock
    private RubricaRepository rubricaRepository;

    @InjectMocks
    private ListarLicencasQueryHandler handler;

    private UUID licencaId = UUID.randomUUID();
    private UUID usuarioMusicaId = UUID.randomUUID();
    private UUID rubricaId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        var licenca = mock(Licenca.class);
        lenient().when(licenca.getId()).thenReturn(licencaId);
        lenient().when(licenca.getUsuarioMusicaId()).thenReturn(usuarioMusicaId);
        lenient().when(licenca.getRubricaId()).thenReturn(rubricaId);
        lenient().when(licenca.getStatus()).thenReturn(StatusLicenca.ATIVA);
        lenient().when(licenca.getDataInicio()).thenReturn(LocalDate.now());
        lenient().when(licenca.getDataFim()).thenReturn(LocalDate.now().plusYears(1));
        lenient().when(licenca.getCriadoEm()).thenReturn(Instant.now());
        lenient().when(licenca.getAtualizadoEm()).thenReturn(Instant.now());

        var usuario = mock(UsuarioMusica.class);
        lenient().when(usuario.getId()).thenReturn(usuarioMusicaId);
        lenient().when(usuario.getRazaoSocial()).thenReturn("Razao Social test");
        var cnpj = mock(Cnpj.class);
        lenient().when(usuario.getCnpj()).thenReturn(cnpj);
        lenient().when(cnpj.getFormatado()).thenReturn("00.000.000/0001-00");

        var rubrica = mock(Rubrica.class);
        lenient().when(rubrica.getId()).thenReturn(rubricaId);
        lenient().when(rubrica.getNome()).thenReturn("Nome Rubrica");
        lenient().when(rubrica.getSigla()).thenReturn("RUB");

        lenient().when(usuarioMusicaRepository.findById(usuarioMusicaId)).thenReturn(Optional.of(usuario));
        lenient().when(rubricaRepository.findById(rubricaId)).thenReturn(Optional.of(rubrica));

        var page = new PageImpl<>(List.of(licenca), PageRequest.of(0, 10), 1);
        lenient().when(licencaRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
    }

    @Test
    void consultarSemFiltrosRetornaTodosMockados() {
        var query = new ListarLicencasQuery(0, 10, null, null, null, null, null, null);
        var response = handler.handle(query);

        assertEquals(1, response.items().size());
        assertEquals(1, response.metadata().totalElements());
        assertEquals(licencaId, response.items().get(0).id());
        
        verify(licencaRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void consultarComFiltroVigenteGeraSpecificationCorreta() {
        var query = new ListarLicencasQuery(0, 10, "dataInicio", null, null, null, null, true);
        
        var captorPageable = ArgumentCaptor.forClass(Pageable.class);
        var captorSpec = ArgumentCaptor.forClass(Specification.class);
        
        handler.handle(query);

        verify(licencaRepository).findAll(captorSpec.capture(), captorPageable.capture());
        
        var pageable = captorPageable.getValue();
        assertEquals(Sort.by(Sort.Direction.ASC, "dataInicio"), pageable.getSort());
        assertNotNull(captorSpec.getValue());
    }

    @Test
    void consultarComSortDescPrefixoGeraDesc() {
        var query = new ListarLicencasQuery(0, 10, "-dataFim", null, null, null, null, null);
        
        var captorPageable = ArgumentCaptor.forClass(Pageable.class);
        
        handler.handle(query);

        verify(licencaRepository).findAll(any(), captorPageable.capture());
        assertEquals(Sort.by(Sort.Direction.DESC, "dataFim"), captorPageable.getValue().getSort());
    }

    @Test
    void consultarComFiltroStatusRepassaSpecification() {
        var query = new ListarLicencasQuery(0, 10, null, null, null, null, StatusLicenca.SUSPENSA, null);
        
        handler.handle(query);

        verify(licencaRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void consultarComFiltroUsuarioMusicaRepassaSpecification() {
        var query = new ListarLicencasQuery(0, 10, null, usuarioMusicaId, null, null, null, null);
        
        handler.handle(query);

        verify(licencaRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void consultarComFiltroVigenteFalseGeraSpecificationCorreta() {
        var query = new ListarLicencasQuery(0, 10, null, null, null, null, null, false);
        handler.handle(query);
        verify(licencaRepository).findAll(any(Specification.class), any(Pageable.class));
    }
}
