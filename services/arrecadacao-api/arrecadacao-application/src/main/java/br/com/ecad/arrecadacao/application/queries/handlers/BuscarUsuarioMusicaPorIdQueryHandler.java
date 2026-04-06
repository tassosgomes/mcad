package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.cqrs.QueryHandler;
import br.com.ecad.arrecadacao.application.dto.ContatoResponse;
import br.com.ecad.arrecadacao.application.dto.EnderecoResponse;
import br.com.ecad.arrecadacao.application.dto.UsuarioMusicaResponse;
import br.com.ecad.arrecadacao.application.queries.BuscarUsuarioMusicaPorIdQuery;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class BuscarUsuarioMusicaPorIdQueryHandler implements QueryHandler<BuscarUsuarioMusicaPorIdQuery, UsuarioMusicaResponse> {

    private final UsuarioMusicaRepository repository;

    public BuscarUsuarioMusicaPorIdQueryHandler(UsuarioMusicaRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public UsuarioMusicaResponse handle(BuscarUsuarioMusicaPorIdQuery query) {
        UsuarioMusica entity = repository.findById(query.id())
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Usuário de música não encontrado com o ID " + query.id()));

        return mapToResponse(entity);
    }

    private UsuarioMusicaResponse mapToResponse(UsuarioMusica entity) {
        EnderecoResponse endDto = entity.getEndereco() != null ? new EnderecoResponse(
                entity.getEndereco().getCep(), entity.getEndereco().getLogradouro(), entity.getEndereco().getNumero(),
                entity.getEndereco().getComplemento(), entity.getEndereco().getBairro(), entity.getEndereco().getCidade(), entity.getEndereco().getUf()) : null;
        ContatoResponse contDto = entity.getContato() != null ? new ContatoResponse(
                entity.getContato().getNomeResponsavel(), entity.getContato().getTelefone(), entity.getContato().getEmail()) : null;

        return new UsuarioMusicaResponse(
                entity.getId(), entity.getRazaoSocial(), entity.getNomeFantasia(),
                entity.getCnpj().getValor(), entity.getCnpj().getFormatado(),
                endDto, contDto, entity.getStatus().name(), entity.getCriadoEm(), entity.getAtualizadoEm()
        );
    }
}
