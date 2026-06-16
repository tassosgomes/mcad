package br.com.ecad.arrecadacao.integration;

import br.com.ecad.arrecadacao.api.ArrecadacaoApplication;
import br.com.ecad.arrecadacao.application.commands.AtivarUsuarioMusicaCommand;
import br.com.ecad.arrecadacao.application.commands.AtualizarUsuarioMusicaCommand;
import br.com.ecad.arrecadacao.application.commands.CriarUsuarioMusicaCommand;
import br.com.ecad.arrecadacao.application.commands.InativarUsuarioMusicaCommand;
import br.com.ecad.arrecadacao.application.commands.handlers.AtivarUsuarioMusicaCommandHandler;
import br.com.ecad.arrecadacao.application.commands.handlers.AtualizarUsuarioMusicaCommandHandler;
import br.com.ecad.arrecadacao.application.commands.handlers.CriarUsuarioMusicaCommandHandler;
import br.com.ecad.arrecadacao.application.commands.handlers.InativarUsuarioMusicaCommandHandler;
import br.com.ecad.arrecadacao.application.dto.ContatoRequest;
import br.com.ecad.arrecadacao.application.dto.EnderecoRequest;
import br.com.ecad.arrecadacao.config.TestSecurityConfig;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import br.com.ecad.arrecadacao.domain.valueobjects.Contato;
import br.com.ecad.arrecadacao.domain.valueobjects.Endereco;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataOutboxEventRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

import br.org.ecad.audit.sdk.AuditClient;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

/**
 * IT que valida que operacoes de write em UsuarioMusica geram evento no Outbox
 * com types {@code arrecadacao.usuario-musica.criado} e
 * {@code arrecadacao.usuario-musica.atualizado}.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(
        classes = ArrecadacaoApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration")
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@SuppressWarnings("null")
class UsuarioMusicaEventOutboxIT {

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("mcad")
            .withUsername("gestauto")
            .withPassword("gestauto123");

    @DynamicPropertySource
    static void configureTestDatabase(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private UsuarioMusicaRepository usuarioMusicaRepository;

    @Autowired
    private SpringDataOutboxEventRepository outboxEventRepository;

    @Autowired
    private CriarUsuarioMusicaCommandHandler criarHandler;

    @Autowired
    private AtualizarUsuarioMusicaCommandHandler atualizarHandler;

    @Autowired
    private InativarUsuarioMusicaCommandHandler inativarHandler;

    @Autowired
    private AtivarUsuarioMusicaCommandHandler ativarHandler;

    @Autowired
    private PlatformTransactionManager txManager;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    @MockBean
    private AuditClient auditClient;

    @Test
    void criarUsuarioMusica_DeveGerarEventoOutboxUsuarioMusicaCriado() {
        TransactionTemplate tt = new TransactionTemplate(txManager);

        tt.execute(status -> {
            var cmd = new CriarUsuarioMusicaCommand(
                    "Radio Globo SP Ltda", "Radio Globo", "12345678000190",
                    new EnderecoRequest("12345-678", "Rua A", "100", "", "Centro", "Sao Paulo", "SP"),
                    new ContatoRequest("Joao", "11999999999", "joao@radio.com"),
                    "admin");
            criarHandler.handle(cmd);
            return null;
        });

        tt.execute(status -> {
            var eventos = outboxEventRepository.findAll().stream()
                    .filter(e -> "arrecadacao.usuario-musica.criado".equals(e.getType()))
                    .toList();

            assertThat(eventos)
                    .as("Deve haver pelo menos um evento arrecadacao.usuario-musica.criado no Outbox")
                    .isNotEmpty();
            return null;
        });
    }

    @Test
    void atualizarUsuarioMusica_DeveGerarEventoOutboxUsuarioMusicaAtualizado() {
        TransactionTemplate tt = new TransactionTemplate(txManager);

        UUID id = tt.execute(status -> {
            var entity = UsuarioMusica.criar(
                    "Radio Atualizar Ltda", "Radio Atualizar",
                    Cnpj.criar("33683111000107"),
                    Endereco.criar("12345-678", "Rua B", "200", "", "Bairro", "Rio", "RJ"),
                    Contato.criar("Maria", "21988888888", "maria@radio.com"));
            return usuarioMusicaRepository.save(entity).getId();
        });

        tt.execute(status -> {
            var cmd = new AtualizarUsuarioMusicaCommand(
                    id, "Radio Atualizada Ltda", "Radio Atualizada",
                    new EnderecoRequest("99999-999", "Rua Nova", "3", "", "Bairro Novo", "Cidade Nova", "XX"),
                    new ContatoRequest("Novo Resp", "456", "b@b.com"),
                    "admin");
            atualizarHandler.handle(cmd);
            return null;
        });

        tt.execute(status -> {
            var eventos = outboxEventRepository.findAll().stream()
                    .filter(e -> "arrecadacao.usuario-musica.atualizado".equals(e.getType()))
                    .toList();

            assertThat(eventos)
                    .as("Deve haver evento arrecadacao.usuario-musica.atualizado apos atualizacao")
                    .isNotEmpty();
            return null;
        });
    }

    @Test
    void inativarUsuarioMusica_DeveGerarEventoOutboxUsuarioMusicaAtualizado() {
        TransactionTemplate tt = new TransactionTemplate(txManager);

        UUID id = tt.execute(status -> {
            var entity = UsuarioMusica.criar(
                    "Radio Inativar Ltda", "Radio Inativar",
                    Cnpj.criar("12345678000190"),
                    Endereco.criar("12345-678", "Rua C", "300", "", "Bairro", "SP", "SP"),
                    Contato.criar("Pedro", "11888888888", "pedro@radio.com"));
            return usuarioMusicaRepository.save(entity).getId();
        });

        tt.execute(status -> {
            var cmd = new InativarUsuarioMusicaCommand(id, "Obsoleto", "admin");
            inativarHandler.handle(cmd);
            return null;
        });

        tt.execute(status -> {
            var eventos = outboxEventRepository.findAll().stream()
                    .filter(e -> "arrecadacao.usuario-musica.atualizado".equals(e.getType()))
                    .toList();

            assertThat(eventos)
                    .as("Deve haver evento arrecadacao.usuario-musica.atualizado apos inativacao")
                    .isNotEmpty();
            return null;
        });
    }

    @Test
    void ativarUsuarioMusica_DeveGerarEventoOutboxUsuarioMusicaAtualizado() {
        TransactionTemplate tt = new TransactionTemplate(txManager);

        UUID id = tt.execute(status -> {
            var entity = UsuarioMusica.criar(
                    "Radio Ativar Ltda", "Radio Ativar",
                    Cnpj.criar("33683111000107"),
                    Endereco.criar("12345-678", "Rua D", "400", "", "Bairro", "BH", "MG"),
                    Contato.criar("Ana", "31888888888", "ana@radio.com"));
            entity.inativar("Obsoleto", "admin");
            return usuarioMusicaRepository.save(entity).getId();
        });

        tt.execute(status -> {
            var cmd = new AtivarUsuarioMusicaCommand(id, "Reativacao", "admin");
            ativarHandler.handle(cmd);
            return null;
        });

        tt.execute(status -> {
            var eventos = outboxEventRepository.findAll().stream()
                    .filter(e -> "arrecadacao.usuario-musica.atualizado".equals(e.getType()))
                    .toList();

            assertThat(eventos)
                    .as("Deve haver evento arrecadacao.usuario-musica.atualizado apos ativacao")
                    .isNotEmpty();
            return null;
        });
    }
}
