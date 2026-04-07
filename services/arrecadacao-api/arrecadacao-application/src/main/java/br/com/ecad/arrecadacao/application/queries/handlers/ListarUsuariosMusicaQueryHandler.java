package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.cqrs.QueryHandler;
import br.com.ecad.arrecadacao.application.dto.ContatoResponse;
import br.com.ecad.arrecadacao.application.dto.EnderecoResponse;
import br.com.ecad.arrecadacao.application.dto.PageResponse;
import br.com.ecad.arrecadacao.application.dto.PaginationInfo;
import br.com.ecad.arrecadacao.application.dto.UsuarioMusicaResponse;
import br.com.ecad.arrecadacao.application.queries.ListarUsuariosMusicaQuery;
import br.com.ecad.arrecadacao.application.specification.UsuarioMusicaSpecification;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors;

@Component
@SuppressWarnings("null")
public class ListarUsuariosMusicaQueryHandler implements QueryHandler<ListarUsuariosMusicaQuery, PageResponse<UsuarioMusicaResponse>> {

    private final UsuarioMusicaRepository repository;

    public ListarUsuariosMusicaQueryHandler(UsuarioMusicaRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<UsuarioMusicaResponse> handle(ListarUsuariosMusicaQuery query) {
        Specification<UsuarioMusica> spec = UsuarioMusicaSpecification.comFiltros(
                query.razaoSocial(), query.cnpj(), query.status(), query.cidade());

        Pageable pageable = PageRequest.of(query.page(), query.size(), parseSort(query.sort()));
        Page<UsuarioMusica> page = repository.findAll(spec, pageable);

        PaginationInfo paginationInfo = new PaginationInfo(
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );

        return new PageResponse<>(
                page.getContent().stream().map(this::mapToResponse).collect(Collectors.toList()),
                paginationInfo
        );
    }

    private Sort parseSort(String sortParam) {
        if (sortParam == null || sortParam.isBlank()) {
            return Sort.unsorted();
        }
        if (sortParam.startsWith("-")) {
            return Sort.by(Sort.Direction.DESC, sortParam.substring(1));
        }
        return Sort.by(Sort.Direction.ASC, sortParam);
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
