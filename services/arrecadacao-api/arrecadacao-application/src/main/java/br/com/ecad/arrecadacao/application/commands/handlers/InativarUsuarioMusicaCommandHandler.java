package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.commands.InativarUsuarioMusicaCommand;
import br.com.ecad.arrecadacao.application.cqrs.CommandHandler;
import br.com.ecad.arrecadacao.domain.entities.HistoricoStatusUsuario;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.interfaces.HistoricoStatusUsuarioRepository;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class InativarUsuarioMusicaCommandHandler implements CommandHandler<InativarUsuarioMusicaCommand, Void> {

    private final UsuarioMusicaRepository repository;
    private final HistoricoStatusUsuarioRepository historicoRepository;

    public InativarUsuarioMusicaCommandHandler(UsuarioMusicaRepository repository, HistoricoStatusUsuarioRepository historicoRepository) {
        this.repository = repository;
        this.historicoRepository = historicoRepository;
    }

    @Override
    @Transactional
    public Void handle(InativarUsuarioMusicaCommand cmd) {
        UsuarioMusica entity = repository.findById(cmd.id())
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Usuário de música não encontrado"));

        HistoricoStatusUsuario historico = entity.inativar(cmd.justificativa(), cmd.autor());
        repository.save(entity);
        historicoRepository.save(historico);

        return null;
    }
}
