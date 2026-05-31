package br.com.ecad.arrecadacao.application.commands;

import br.com.ecad.arrecadacao.application.actor.ActorSnapshot;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshots;
import br.com.ecad.arrecadacao.application.cqrs.Command;
import br.com.ecad.arrecadacao.application.dto.ContatoRequest;
import br.com.ecad.arrecadacao.application.dto.EnderecoRequest;
import br.com.ecad.arrecadacao.application.dto.UsuarioMusicaResponse;
import java.util.Objects;

public record CriarUsuarioMusicaCommand(
    String razaoSocial,
    String nomeFantasia,
    String cnpj,
    EnderecoRequest endereco,
    ContatoRequest contato,
    ActorSnapshot actor
) implements Command<UsuarioMusicaResponse> {

    public CriarUsuarioMusicaCommand {
        Objects.requireNonNull(actor, "actor must not be null");
    }

    public CriarUsuarioMusicaCommand(String razaoSocial, String nomeFantasia, String cnpj,
                                     EnderecoRequest endereco, ContatoRequest contato, String autor) {
        this(razaoSocial, nomeFantasia, cnpj, endereco, contato, ActorSnapshots.legacy(autor));
    }

    public String autor() {
        return ActorSnapshots.labelOf(actor);
    }
}
