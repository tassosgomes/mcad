package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.commands.AtivarUsuarioMusicaCommand;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.interfaces.HistoricoStatusUsuarioRepository;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import br.com.ecad.arrecadacao.domain.valueobjects.Contato;
import br.com.ecad.arrecadacao.domain.valueobjects.Endereco;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AtivarUsuarioMusicaCommandHandlerTest {
    @Mock private UsuarioMusicaRepository repository;
    @Mock private HistoricoStatusUsuarioRepository historicoRepository;
    @InjectMocks private AtivarUsuarioMusicaCommandHandler handler;

    @Test
    void deveAtivar() {
        UUID id = UUID.randomUUID();
        UsuarioMusica entity = UsuarioMusica.criar("Old", "Old", Cnpj.criar("33683111000107"), Endereco.criar("123", "Rua", "1", "", "Bairro", "Cidade", "UF"), Contato.criar("Resp", "123", "a@a.com"));
        entity.inativar("justificativa", "autor");
        when(repository.findById(id)).thenReturn(Optional.of(entity));

        AtivarUsuarioMusicaCommand cmd = new AtivarUsuarioMusicaCommand(id, "justificativa-val", "autor");
        handler.handle(cmd);

        verify(repository).save(entity);
        verify(historicoRepository).save(any());
    }
}
