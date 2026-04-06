package br.com.ecad.arrecadacao.application.commands;

import br.com.ecad.arrecadacao.application.cqrs.Command;
import br.com.ecad.arrecadacao.application.dto.ContatoRequest;
import br.com.ecad.arrecadacao.application.dto.EnderecoRequest;
import br.com.ecad.arrecadacao.application.dto.UsuarioMusicaResponse;
import java.util.UUID;

public record AtualizarUsuarioMusicaCommand(
    UUID id,
    String razaoSocial,
    String nomeFantasia,
    EnderecoRequest endereco,
    ContatoRequest contato,
    String autor
) implements Command<UsuarioMusicaResponse> {}
