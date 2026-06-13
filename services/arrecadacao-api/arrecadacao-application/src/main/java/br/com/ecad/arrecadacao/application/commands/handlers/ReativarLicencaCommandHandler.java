package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.audit.AuditContextProvider;
import br.com.ecad.arrecadacao.application.audit.GenericAuditEventFactory;
import br.com.ecad.arrecadacao.application.audit.LicencaAuditMapper;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshots;
import br.com.ecad.arrecadacao.application.commands.ReativarLicencaCommand;
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
import br.org.ecad.audit.contract.DataAction;
import br.org.ecad.audit.sdk.AuditClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ReativarLicencaCommandHandler implements CommandHandler<ReativarLicencaCommand, LicencaResponse> {

    private static final String ENTITY_TYPE = "Licenca";
    private static final String SCREEN_ID = "ARRECADACAO_LICENCAS";
    private static final String SCREEN_NAME = "Licenças";

    private final LicencaRepository licencaRepository;
    private final HistoricoStatusLicencaRepository historicoRepository;
    private final UsuarioMusicaRepository usuarioMusicaRepository;
    private final RubricaRepository rubricaRepository;
    private final AuditClient auditClient;
    private final GenericAuditEventFactory auditFactory;
    private final AuditContextProvider auditContextProvider;

    public ReativarLicencaCommandHandler(LicencaRepository licencaRepository,
                                         HistoricoStatusLicencaRepository historicoRepository,
                                         UsuarioMusicaRepository usuarioMusicaRepository,
                                         RubricaRepository rubricaRepository,
                                         AuditClient auditClient,
                                         GenericAuditEventFactory auditFactory,
                                         AuditContextProvider auditContextProvider) {
        this.licencaRepository = licencaRepository;
        this.historicoRepository = historicoRepository;
        this.usuarioMusicaRepository = usuarioMusicaRepository;
        this.rubricaRepository = rubricaRepository;
        this.auditClient = auditClient;
        this.auditFactory = auditFactory;
        this.auditContextProvider = auditContextProvider;
    }

    @Override
    @Transactional
    public LicencaResponse handle(ReativarLicencaCommand cmd) {
        var licenca = licencaRepository.findById(cmd.id())
            .orElseThrow(() -> new EntidadeNaoEncontradaException("Licenca nao encontrada: " + cmd.id()));

        var before = LicencaAuditMapper.map(licenca);

        // Domain method com guard -> throws IllegalStateException se transicao invalida
        var historico = licenca.reativar(
            cmd.justificativa(), ActorSnapshots.subjectOf(cmd.actor()), cmd.autor());

        licencaRepository.save(licenca);
        historicoRepository.save(historico);

        var auditCtx = auditContextProvider.current(cmd.autor());
        var entityId = licenca.getId().toString();
        auditClient.publish(auditFactory.userAction(
            ENTITY_TYPE, entityId,
            "REATIVAR_LICENCA", "Reativar licença",
            "Licença reativada: " + cmd.justificativa(), SCREEN_ID, SCREEN_NAME, auditCtx));
        auditClient.publish(auditFactory.dataChange(
            ENTITY_TYPE, entityId, DataAction.UPDATE,
            before, LicencaAuditMapper.map(licenca),
            "Licença reativada", SCREEN_ID, SCREEN_NAME, auditCtx));

        var usuarioMusica = usuarioMusicaRepository.findById(licenca.getUsuarioMusicaId()).orElseThrow();
        var rubrica = rubricaRepository.findById(licenca.getRubricaId()).orElseThrow();

        return toResponse(licenca, usuarioMusica, rubrica);
    }

    private LicencaResponse toResponse(Licenca licenca, UsuarioMusica usuarioMusica, Rubrica rubrica) {
        return new LicencaResponse(
            licenca.getId(),
            new UsuarioMusicaResumoResponse(usuarioMusica.getId(), usuarioMusica.getRazaoSocial(), usuarioMusica.getCnpj().getValor()),
            new RubricaResumoResponse(rubrica.getId(), rubrica.getSigla(), rubrica.getNome(), rubrica.isAtivo()),
            licenca.getDataInicio(),
            licenca.getDataFim(),
            licenca.getStatus().name(),
            licenca.getCriadoEm(),
            licenca.getAtualizadoEm()
        );
    }
}
