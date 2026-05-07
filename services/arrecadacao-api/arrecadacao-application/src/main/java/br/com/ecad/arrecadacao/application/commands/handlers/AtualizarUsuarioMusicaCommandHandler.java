package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.audit.AuditContextProvider;
import br.com.ecad.arrecadacao.application.audit.UsuarioMusicaAuditEventFactory.UsuarioMusicaAuditChange;
import br.com.ecad.arrecadacao.application.audit.UsuarioMusicaAuditEventFactory;
import br.com.ecad.arrecadacao.application.audit.UsuarioMusicaAuditEventFactory.UsuarioMusicaAuditOperation;
import br.com.ecad.arrecadacao.application.commands.AtualizarUsuarioMusicaCommand;
import br.com.ecad.arrecadacao.application.cqrs.CommandHandler;
import br.com.ecad.arrecadacao.application.dto.ContatoResponse;
import br.com.ecad.arrecadacao.application.dto.EnderecoResponse;
import br.com.ecad.arrecadacao.application.dto.UsuarioMusicaResponse;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import br.com.ecad.arrecadacao.domain.valueobjects.Contato;
import br.com.ecad.arrecadacao.domain.valueobjects.Endereco;
import br.org.ecad.audit.sdk.AuditClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Component
public class AtualizarUsuarioMusicaCommandHandler implements CommandHandler<AtualizarUsuarioMusicaCommand, UsuarioMusicaResponse> {

    private final UsuarioMusicaRepository repository;
    private final AuditClient auditClient;
    private final UsuarioMusicaAuditEventFactory auditEventFactory;
    private final AuditContextProvider auditContextProvider;

    public AtualizarUsuarioMusicaCommandHandler(UsuarioMusicaRepository repository,
                                                AuditClient auditClient,
                                                UsuarioMusicaAuditEventFactory auditEventFactory,
                                                AuditContextProvider auditContextProvider) {
        this.repository = repository;
        this.auditClient = auditClient;
        this.auditEventFactory = auditEventFactory;
        this.auditContextProvider = auditContextProvider;
    }

    @Override
    @Transactional
    public UsuarioMusicaResponse handle(AtualizarUsuarioMusicaCommand cmd) {
        UsuarioMusica entity = repository.findById(cmd.id())
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Usuário de música não encontrado"));
        Map<String, Object> before = auditEventFactory.usuarioMap(entity);

        Endereco endereco = null;
        if (cmd.endereco() != null) {
            endereco = Endereco.criar(cmd.endereco().cep(), cmd.endereco().logradouro(), cmd.endereco().numero(),
                    cmd.endereco().complemento(), cmd.endereco().bairro(), cmd.endereco().cidade(), cmd.endereco().uf());
        }

        Contato contato = null;
        if (cmd.contato() != null) {
            contato = Contato.criar(cmd.contato().nomeResponsavel(), cmd.contato().telefone(), cmd.contato().email());
        }

        entity.atualizar(cmd.razaoSocial(), cmd.nomeFantasia(), endereco, contato);
        UsuarioMusica saved = repository.save(entity);

        var auditContext = auditContextProvider.current(cmd.autor());
        auditClient.publish(auditEventFactory.userAction(saved, auditContext, UsuarioMusicaAuditOperation.UPDATE));
        auditClient.publish(auditEventFactory.dataChange(
                new UsuarioMusicaAuditChange(saved, UsuarioMusicaAuditOperation.UPDATE, before), auditContext));

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
