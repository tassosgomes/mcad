package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.audit.AuditContextProvider;
import br.com.ecad.arrecadacao.application.audit.GenericAuditEventFactory;
import br.com.ecad.arrecadacao.application.audit.LicencaAuditMapper;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshots;
import br.com.ecad.arrecadacao.application.commands.CriarLicencaCommand;
import br.com.ecad.arrecadacao.application.cqrs.CommandHandler;
import br.com.ecad.arrecadacao.application.dto.LicencaResponse;
import br.com.ecad.arrecadacao.application.dto.RubricaResumoResponse;
import br.com.ecad.arrecadacao.application.dto.UsuarioMusicaResumoResponse;
import br.com.ecad.arrecadacao.domain.entities.HistoricoStatusLicenca;
import br.com.ecad.arrecadacao.domain.entities.Licenca;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.enums.StatusLicenca;
import br.com.ecad.arrecadacao.domain.enums.StatusUsuarioMusica;
import br.com.ecad.arrecadacao.domain.interfaces.HistoricoStatusLicencaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.LicencaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException;
import br.org.ecad.audit.contract.DataAction;
import br.org.ecad.audit.sdk.AuditClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CriarLicencaCommandHandler implements CommandHandler<CriarLicencaCommand, LicencaResponse> {

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

    public CriarLicencaCommandHandler(LicencaRepository licencaRepository,
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
    public LicencaResponse handle(CriarLicencaCommand cmd) {
        // 1. Validar UsuarioMusica existe e esta ATIVO
        var usuarioMusica = usuarioMusicaRepository.findById(cmd.usuarioMusicaId())
            .orElseThrow(() -> new EntidadeNaoEncontradaException(
                "UsuarioMusica nao encontrado: " + cmd.usuarioMusicaId()));

        if (usuarioMusica.getStatus() != StatusUsuarioMusica.ATIVO) {
            throw new IllegalStateException(
                "Nao e possivel criar licenca para usuario INATIVO");
        }

        // 2. Validar Rubrica existe
        var rubrica = rubricaRepository.findById(cmd.rubricaId())
            .orElseThrow(() -> new EntidadeNaoEncontradaException(
                "Rubrica nao encontrada: " + cmd.rubricaId()));

        // 3. Criar entidade via domain factory (valida datas)
        var licenca = Licenca.criar(
            cmd.usuarioMusicaId(), cmd.rubricaId(),
            cmd.dataInicio(), cmd.dataFim());

        licencaRepository.save(licenca);

        // 4. Criar historico inicial
        var historico = HistoricoStatusLicenca.criar(
            licenca.getId(), null, StatusLicenca.ATIVA,
            "Licenca criada", ActorSnapshots.subjectOf(cmd.actor()), cmd.autor());
        historicoRepository.save(historico);

        // 5. Auditoria
        var auditCtx = auditContextProvider.current(cmd.autor());
        var entityId = licenca.getId().toString();
        auditClient.publish(auditFactory.userAction(
            ENTITY_TYPE, entityId,
            "CADASTRAR_LICENCA", "Cadastrar licença",
            "Licença cadastrada", SCREEN_ID, SCREEN_NAME, auditCtx));
        auditClient.publish(auditFactory.dataChange(
            ENTITY_TYPE, entityId, DataAction.CREATE,
            null, LicencaAuditMapper.map(licenca),
            "Licença cadastrada", SCREEN_ID, SCREEN_NAME, auditCtx));

        // 6. Mapear para response com dados expandidos
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
