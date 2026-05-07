package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.audit.AuditContextProvider;
import br.com.ecad.arrecadacao.application.audit.UsuarioMusicaAuditEventFactory.UsuarioMusicaAuditChange;
import br.com.ecad.arrecadacao.application.audit.UsuarioMusicaAuditEventFactory;
import br.com.ecad.arrecadacao.application.audit.UsuarioMusicaAuditEventFactory.UsuarioMusicaAuditOperation;
import br.com.ecad.arrecadacao.application.commands.CriarUsuarioMusicaCommand;
import br.com.ecad.arrecadacao.application.cqrs.CommandHandler;
import br.com.ecad.arrecadacao.application.dto.ContatoResponse;
import br.com.ecad.arrecadacao.application.dto.EnderecoResponse;
import br.com.ecad.arrecadacao.application.dto.UsuarioMusicaResponse;
import br.com.ecad.arrecadacao.domain.entities.HistoricoStatusUsuario;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.enums.StatusUsuarioMusica;
import br.com.ecad.arrecadacao.domain.exceptions.CnpjDuplicadoException;
import br.com.ecad.arrecadacao.domain.interfaces.HistoricoStatusUsuarioRepository;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import br.com.ecad.arrecadacao.domain.valueobjects.Contato;
import br.com.ecad.arrecadacao.domain.valueobjects.Endereco;
import br.org.ecad.audit.sdk.AuditClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CriarUsuarioMusicaCommandHandler implements CommandHandler<CriarUsuarioMusicaCommand, UsuarioMusicaResponse> {

    private final UsuarioMusicaRepository repository;
    private final HistoricoStatusUsuarioRepository historicoRepository;
    private final AuditClient auditClient;
    private final UsuarioMusicaAuditEventFactory auditEventFactory;
    private final AuditContextProvider auditContextProvider;

    public CriarUsuarioMusicaCommandHandler(UsuarioMusicaRepository repository,
                                            HistoricoStatusUsuarioRepository historicoRepository,
                                            AuditClient auditClient,
                                            UsuarioMusicaAuditEventFactory auditEventFactory,
                                            AuditContextProvider auditContextProvider) {
        this.repository = repository;
        this.historicoRepository = historicoRepository;
        this.auditClient = auditClient;
        this.auditEventFactory = auditEventFactory;
        this.auditContextProvider = auditContextProvider;
    }

    @Override
    @Transactional
    public UsuarioMusicaResponse handle(CriarUsuarioMusicaCommand cmd) {
        Cnpj cnpj = Cnpj.criar(cmd.cnpj());
        if (repository.existsByCnpj(cnpj)) {
            throw new CnpjDuplicadoException("CNPJ duplicate: " + cnpj.getFormatado());
        }

        Endereco endereco = null;
        if (cmd.endereco() != null) {
            endereco = Endereco.criar(cmd.endereco().cep(), cmd.endereco().logradouro(), cmd.endereco().numero(),
                    cmd.endereco().complemento(), cmd.endereco().bairro(), cmd.endereco().cidade(), cmd.endereco().uf());
        }

        Contato contato = null;
        if (cmd.contato() != null) {
            contato = Contato.criar(cmd.contato().nomeResponsavel(), cmd.contato().telefone(), cmd.contato().email());
        }

        UsuarioMusica entity = UsuarioMusica.criar(cmd.razaoSocial(), cmd.nomeFantasia(), cnpj, endereco, contato);
        UsuarioMusica saved = repository.save(entity);

        HistoricoStatusUsuario historico = HistoricoStatusUsuario.criar(
                saved.getId(), null, StatusUsuarioMusica.ATIVO, "Cadastro inicial", cmd.autor());
        historicoRepository.save(historico);

        var auditContext = auditContextProvider.current(cmd.autor());
        auditClient.publish(auditEventFactory.userAction(saved, auditContext, UsuarioMusicaAuditOperation.CREATE));
        auditClient.publish(auditEventFactory.dataChange(
                new UsuarioMusicaAuditChange(saved, UsuarioMusicaAuditOperation.CREATE, null), auditContext));

        return mapToResponse(saved);
    }

    private UsuarioMusicaResponse mapToResponse(UsuarioMusica u) {
        EnderecoResponse endDto = u.getEndereco() != null ? new EnderecoResponse(
                u.getEndereco().getCep(), u.getEndereco().getLogradouro(), u.getEndereco().getNumero(),
                u.getEndereco().getComplemento(), u.getEndereco().getBairro(), u.getEndereco().getCidade(), u.getEndereco().getUf()) : null;
        ContatoResponse contDto = u.getContato() != null ? new ContatoResponse(
                u.getContato().getNomeResponsavel(), u.getContato().getTelefone(), u.getContato().getEmail()) : null;

        return new UsuarioMusicaResponse(
                u.getId(), u.getRazaoSocial(), u.getNomeFantasia(), u.getCnpj().getValor(), u.getCnpj().getFormatado(),
                endDto, contDto, u.getStatus().name(), u.getCriadoEm(), u.getAtualizadoEm()
        );
    }
}
