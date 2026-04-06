package br.com.ecad.arrecadacao.application.commands;

import br.com.ecad.arrecadacao.application.cqrs.Command;
import br.com.ecad.arrecadacao.application.dto.ContatoRequest;
import br.com.ecad.arrecadacao.application.dto.EnderecoRequest;
import br.com.ecad.arrecadacao.application.dto.UsuarioMusicaResponse;

public record CriarUsuarioMusicaCommand(
    String razaoSocial,
    String nomeFantasia,
    String cnpj,
    EnderecoRequest endereco,
    ContatoRequest contato,
    String autor
) implements Command<UsuarioMusicaResponse> {}
