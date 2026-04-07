package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.commands.SuspenderLicencaCommand;
import br.com.ecad.arrecadacao.application.cqrs.CommandHandler;
import br.com.ecad.arrecadacao.application.dto.LicencaResponse;
import br.com.ecad.arrecadacao.application.dto.RubricaResumoResponse;
import br.com.ecad.arrecadacao.application.dto.UsuarioMusicaResumoResponse;
import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.interfaces.HistoricoStatusLicencaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.LicencaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class SuspenderLicencaCommandHandler implements CommandHandler<SuspenderLicencaCommand, LicencaResponse> {

    private final LicencaRepository licencaRepository;
    private final HistoricoStatusLicencaRepository historicoRepository;
    private final UsuarioMusicaRepository usuarioMusicaRepository;
    private final RubricaRepository rubricaRepository;

    public SuspenderLicencaCommandHandler(LicencaRepository licencaRepository,
                                          HistoricoStatusLicencaRepository historicoRepository,
                                          UsuarioMusicaRepository usuarioMusicaRepository,
                                          RubricaRepository rubricaRepository) {
        this.licencaRepository = licencaRepository;
        this.historicoRepository = historicoRepository;
        this.usuarioMusicaRepository = usuarioMusicaRepository;
        this.rubricaRepository = rubricaRepository;
    }

    @Override
    @Transactional
    public LicencaResponse handle(SuspenderLicencaCommand cmd) {
        var licenca = licencaRepository.findById(cmd.id())
            .orElseThrow(() -> new EntidadeNaoEncontradaException("Licenca nao encontrada: " + cmd.id()));

        // Domain method com guard -> throws IllegalStateException se transicao invalida
        var historico = licenca.suspender(cmd.justificativa(), cmd.autor());

        licencaRepository.save(licenca);
        historicoRepository.save(historico);

        var usuarioMusica = usuarioMusicaRepository.findById(licenca.getUsuarioMusicaId()).orElseThrow();
        var rubrica = rubricaRepository.findById(licenca.getRubricaId()).orElseThrow();
        
        return toResponse(licenca, usuarioMusica, rubrica);
    }

    private LicencaResponse toResponse(Licenca licenca, UsuarioMusica usuarioMusica, Rubrica rubrica) {
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
