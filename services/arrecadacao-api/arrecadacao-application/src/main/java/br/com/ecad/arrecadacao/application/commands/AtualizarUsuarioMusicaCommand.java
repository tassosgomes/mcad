package br.com.ecad.arrecadacao.application.commands;

import br.com.ecad.arrecadacao.application.actor.ActorSnapshot;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshots;
import br.com.ecad.arrecadacao.application.cqrs.Command;
import br.com.ecad.arrecadacao.application.dto.ContatoRequest;
import br.com.ecad.arrecadacao.application.dto.EnderecoRequest;
import br.com.ecad.arrecadacao.application.dto.UsuarioMusicaResponse;
import java.util.Objects;
import java.util.UUID;

public record AtualizarUsuarioMusicaCommand(
    UUID id,
    String razaoSocial,
    String nomeFantasia,
    EnderecoRequest endereco,
    ContatoRequest contato,
    ActorSnapshot actor
) implements Command<UsuarioMusicaResponse> {

    public AtualizarUsuarioMusicaCommand {
        Objects.requireNonNull(actor, "actor must not be null");
    }

    public AtualizarUsuarioMusicaCommand(UUID id, String razaoSocial, String nomeFantasia,
                                         EnderecoRequest endereco, ContatoRequest contato, String autor) {
        this(id, razaoSocial, nomeFantasia, endereco, contato, ActorSnapshots.legacy(autor));
    }

    public String autor() {
        return ActorSnapshots.labelOf(actor);
    }
}
