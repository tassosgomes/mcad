package br.com.ecad.arrecadacao.application.audit;

import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.org.ecad.audit.contract.AuditEvent;
import br.org.ecad.audit.contract.DataAction;
import br.org.ecad.audit.contract.EventType;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class UsuarioMusicaAuditEventFactory {

    private static final int SCHEMA_VERSION = 1;
    private static final String SERVICE_NAME = "arrecadacao-api";
    private static final String SYSTEM_NAME = "mcad";
    private static final String SOURCE_SCHEMA = "arrecadacao";
    private static final String ENVIRONMENT = "local";
    private static final String ENTITY_TYPE = "UsuarioMusica";
    private static final String SCREEN_ID = "ARRECADACAO_USUARIOS_MUSICA";
    private static final String SCREEN_NAME = "Usuários de Música";

    public AuditEvent userAction(UsuarioMusica usuario, AuditContext context, UsuarioMusicaAuditOperation operation) {
        return new AuditEvent(
                UUID.randomUUID().toString(),
                SCHEMA_VERSION,
                EventType.USER_ACTION,
                OffsetDateTime.now(ZoneOffset.UTC),
                source(),
                actor(context),
                origin(context),
                correlation(context),
                null,
                security(),
                Map.of("reason", operation.reason()),
                null,
                new AuditEvent.UserAction(
                        operation.actionCode(),
                        operation.actionName(),
                        context.businessContext(ENTITY_TYPE, usuario.getId().toString())
                )
        );
    }

    public AuditEvent dataChange(UsuarioMusicaAuditChange change, AuditContext context) {
        return new AuditEvent(
                UUID.randomUUID().toString(),
                SCHEMA_VERSION,
                EventType.DATA_CHANGE,
                OffsetDateTime.now(ZoneOffset.UTC),
                source(),
                actor(context),
                origin(context),
                correlation(context),
                new AuditEvent.Data(
                        ENTITY_TYPE,
                        change.usuario().getId().toString(),
                        null,
                        change.operation().dataAction(),
                        change.before(),
                        usuarioMap(change.usuario()),
                        List.of()
                ),
                security(),
                Map.of("reason", change.operation().reason()),
                null,
                null
        );
    }

    public Map<String, Object> usuarioMap(UsuarioMusica usuario) {
        return Map.of(
                "id", usuario.getId().toString(),
                "razaoSocial", valueOrEmpty(usuario.getRazaoSocial()),
                "nomeFantasia", valueOrEmpty(usuario.getNomeFantasia()),
                "cnpj", usuario.getCnpj().getValor(),
                "cnpjFormatado", usuario.getCnpj().getFormatado(),
                "status", usuario.getStatus().name(),
                "endereco", enderecoMap(usuario),
                "contato", contatoMap(usuario)
        );
    }

    private AuditEvent.Source source() {
        return new AuditEvent.Source(SERVICE_NAME, SYSTEM_NAME, SOURCE_SCHEMA, ENVIRONMENT);
    }

    private AuditEvent.Actor actor(AuditContext context) {
        return new AuditEvent.Actor(
                context.userId(),
                context.username(),
                context.displayName(),
                "USER",
                context.roles(),
                context.authProvider()
        );
    }

    private AuditEvent.Origin origin(AuditContext context) {
        return new AuditEvent.Origin(
                valueOrDefault(context.channel(), "WEB"),
                context.ip(),
                context.userAgent(),
                context.route(),
                valueOrDefault(context.screenId(), SCREEN_ID),
                valueOrDefault(context.screenName(), SCREEN_NAME)
        );
    }

    private AuditEvent.Correlation correlation(AuditContext context) {
        return new AuditEvent.Correlation(
                context.traceId(),
                context.requestId(),
                context.userSessionId(),
                context.screenAccessId(),
                context.commandId(),
                null
        );
    }

    private AuditEvent.SecurityInfo security() {
        return new AuditEvent.SecurityInfo("INTERNAL", List.of());
    }

    private Map<String, Object> enderecoMap(UsuarioMusica usuario) {
        var endereco = usuario.getEndereco();
        if (endereco == null) {
            return Map.of();
        }

        return Map.of(
                "cep", valueOrEmpty(endereco.getCep()),
                "logradouro", valueOrEmpty(endereco.getLogradouro()),
                "numero", valueOrEmpty(endereco.getNumero()),
                "complemento", valueOrEmpty(endereco.getComplemento()),
                "bairro", valueOrEmpty(endereco.getBairro()),
                "cidade", valueOrEmpty(endereco.getCidade()),
                "uf", valueOrEmpty(endereco.getUf())
        );
    }

    private Map<String, Object> contatoMap(UsuarioMusica usuario) {
        var contato = usuario.getContato();
        if (contato == null) {
            return Map.of();
        }

        return Map.of(
                "nomeResponsavel", valueOrEmpty(contato.getNomeResponsavel()),
                "telefone", valueOrEmpty(contato.getTelefone()),
                "email", valueOrEmpty(contato.getEmail())
        );
    }

    private String valueOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }

    public enum UsuarioMusicaAuditOperation {
        CREATE("CADASTRAR_USUARIO_MUSICA", "Cadastrar usuário de música", "Usuário de música cadastrado", DataAction.CREATE),
        UPDATE("ATUALIZAR_USUARIO_MUSICA", "Atualizar usuário de música", "Usuário de música atualizado", DataAction.UPDATE),
        INACTIVATE("INATIVAR_USUARIO_MUSICA", "Inativar usuário de música", "Usuário de música inativado", DataAction.UPDATE),
        ACTIVATE("ATIVAR_USUARIO_MUSICA", "Ativar usuário de música", "Usuário de música ativado", DataAction.UPDATE);

        private final String actionCode;
        private final String actionName;
        private final String reason;
        private final DataAction dataAction;

        UsuarioMusicaAuditOperation(String actionCode, String actionName, String reason, DataAction dataAction) {
            this.actionCode = actionCode;
            this.actionName = actionName;
            this.reason = reason;
            this.dataAction = dataAction;
        }

        public String actionCode() {
            return actionCode;
        }

        public String actionName() {
            return actionName;
        }

        public String reason() {
            return reason;
        }

        public DataAction dataAction() {
            return dataAction;
        }
    }

    public record UsuarioMusicaAuditChange(
            UsuarioMusica usuario,
            UsuarioMusicaAuditOperation operation,
            Map<String, Object> before
    ) {
    }
}
