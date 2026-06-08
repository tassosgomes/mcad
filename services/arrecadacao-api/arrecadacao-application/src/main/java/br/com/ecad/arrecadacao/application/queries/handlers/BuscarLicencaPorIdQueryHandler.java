package br.com.ecad.arrecadacao.application.queries.handlers;

import br.com.ecad.arrecadacao.application.cqrs.QueryHandler;
import br.com.ecad.arrecadacao.application.dto.LicencaResponse;
import br.com.ecad.arrecadacao.application.dto.RubricaResumoResponse;
import br.com.ecad.arrecadacao.application.dto.UsuarioMusicaResumoResponse;
import br.com.ecad.arrecadacao.application.queries.BuscarLicencaPorIdQuery;
import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.interfaces.LicencaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class BuscarLicencaPorIdQueryHandler implements QueryHandler<BuscarLicencaPorIdQuery, LicencaResponse> {

    private final LicencaRepository licencaRepository;
    private final UsuarioMusicaRepository usuarioMusicaRepository;
    private final RubricaRepository rubricaRepository;

    public BuscarLicencaPorIdQueryHandler(LicencaRepository licencaRepository,
                                          UsuarioMusicaRepository usuarioMusicaRepository,
                                          RubricaRepository rubricaRepository) {
        this.licencaRepository = licencaRepository;
        this.usuarioMusicaRepository = usuarioMusicaRepository;
        this.rubricaRepository = rubricaRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public LicencaResponse handle(BuscarLicencaPorIdQuery query) {
        var licenca = licencaRepository.findById(query.id())
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Licenca nao encontrada: " + query.id()));

        var usuario = usuarioMusicaRepository.findById(licenca.getUsuarioMusicaId()).orElseThrow();
        var rubrica = rubricaRepository.findById(licenca.getRubricaId()).orElseThrow();

        return toResponse(licenca, usuario, rubrica);
    }

    private LicencaResponse toResponse(Licenca licenca, br.com.ecad.arrecadacao.domain.entities.UsuarioMusica usuarioMusica, br.com.ecad.arrecadacao.domain.entities.Rubrica rubrica) {
        return new LicencaResponse(
            licenca.getId(),
            new UsuarioMusicaResumoResponse(usuarioMusica.getId(), usuarioMusica.getRazaoSocial(), usuarioMusica.getCnpj().getFormatado()),
            new RubricaResumoResponse(rubrica.getId(), rubrica.getSigla(), rubrica.getNome(), rubrica.isAtivo()),
            licenca.getDataInicio(),
            licenca.getDataFim(),
            licenca.getStatus().name(),
            licenca.getCriadoEm(),
            licenca.getAtualizadoEm()
        );
    }
}
