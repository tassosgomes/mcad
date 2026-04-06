package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.dto.PageResponse;
import br.com.ecad.arrecadacao.application.dto.UsuarioMusicaResponse;
import br.com.ecad.arrecadacao.application.queries.ListarUsuariosMusicaQuery;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.enums.StatusUsuarioMusica;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import br.com.ecad.arrecadacao.domain.valueobjects.Contato;
import br.com.ecad.arrecadacao.domain.valueobjects.Endereco;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ListarUsuariosMusicaQueryHandlerTest {

    @Mock
    private UsuarioMusicaRepository repository;

    @InjectMocks
    private ListarUsuariosMusicaQueryHandler handler;

    @Test
    void deveListarUsuariosComFiltrosEPaginacao() {
        UsuarioMusica entity = UsuarioMusica.criar("Teste", "Fantasia", Cnpj.criar("33683111000107"), Endereco.criar("123", "Rua", "1", "", "Bairro", "Cidade", "UF"), Contato.criar("Resp", "123", "a@a.com"));
        Page<UsuarioMusica> mockPage = new PageImpl<>(List.of(entity), PageRequest.of(0, 10), 1);

        when(repository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(mockPage);

        ListarUsuariosMusicaQuery query = new ListarUsuariosMusicaQuery(
                "Teste", null, StatusUsuarioMusica.ATIVO, null, 0, 10, "-razaoSocial"
        );

        PageResponse<UsuarioMusicaResponse> response = handler.handle(query);

        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).razaoSocial()).isEqualTo("Teste");
        assertThat(response.metadata().page()).isZero();
        assertThat(response.metadata().size()).isEqualTo(10);
        assertThat(response.metadata().totalElements()).isEqualTo(1);

        verify(repository).findAll(any(Specification.class), any(Pageable.class));
    }
}
