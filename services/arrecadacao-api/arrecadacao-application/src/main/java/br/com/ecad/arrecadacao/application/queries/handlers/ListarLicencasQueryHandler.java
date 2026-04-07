package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.cqrs.QueryHandler;
import br.com.ecad.arrecadacao.application.dto.LicencaResponse;
import br.com.ecad.arrecadacao.application.dto.PageResponse;
import br.com.ecad.arrecadacao.application.dto.RubricaResumoResponse;
import br.com.ecad.arrecadacao.application.dto.UsuarioMusicaResumoResponse;
import br.com.ecad.arrecadacao.application.queries.ListarLicencasQuery;
import br.com.ecad.arrecadacao.application.specification.LicencaSpecification;
import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.interfaces.LicencaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@SuppressWarnings("null")
public class ListarLicencasQueryHandler
        implements QueryHandler<ListarLicencasQuery, PageResponse<LicencaResponse>> {

    private final LicencaRepository licencaRepository;
    private final UsuarioMusicaRepository usuarioMusicaRepository;
    private final RubricaRepository rubricaRepository;

    public ListarLicencasQueryHandler(LicencaRepository licencaRepository,
                                      UsuarioMusicaRepository usuarioMusicaRepository,
                                      RubricaRepository rubricaRepository) {
        this.licencaRepository = licencaRepository;
        this.usuarioMusicaRepository = usuarioMusicaRepository;
        this.rubricaRepository = rubricaRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<LicencaResponse> handle(ListarLicencasQuery query) {
        var spec = LicencaSpecification.comFiltros(
            query.usuarioMusicaId(), query.razaoSocial(), query.rubricaSigla(),
            query.status(), query.vigente());

        var pageable = PageRequest.of(query.page(), query.size(), parseSort(query.sort()));
        var page = licencaRepository.findAll(spec, pageable);

        var content = page.getContent().stream()
            .map(licenca -> {
                var usuario = usuarioMusicaRepository.findById(licenca.getUsuarioMusicaId()).orElseThrow();
                var rubrica = rubricaRepository.findById(licenca.getRubricaId()).orElseThrow();
                return toResponse(licenca, usuario, rubrica);
            })
            .toList();

        return new PageResponse<>(content, new br.com.ecad.arrecadacao.application.dto.PaginationInfo(
            page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages()));
    }

    private Sort parseSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "criadoEm");
        }
        if (sort.startsWith("-")) {
            return Sort.by(Sort.Direction.DESC, sort.substring(1));
        }
        return Sort.by(Sort.Direction.ASC, sort);
    }

    private LicencaResponse toResponse(Licenca licenca, br.com.ecad.arrecadacao.domain.entities.UsuarioMusica usuarioMusica, br.com.ecad.arrecadacao.domain.entities.Rubrica rubrica) {
        return new LicencaResponse(
            licenca.getId(),
            new UsuarioMusicaResumoResponse(usuarioMusica.getId(), usuarioMusica.getRazaoSocial(), usuarioMusica.getCnpj().getFormatado()),
            new RubricaResumoResponse(rubrica.getId(), rubrica.getSigla(), rubrica.getNome()),
            licenca.getDataInicio(),
            licenca.getDataFim(),
            licenca.getStatus().name(),
            licenca.getCriadoEm(),
            licenca.getAtualizadoEm()
        );
    }
}
