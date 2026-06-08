package br.com.ecad.arrecadacao.integration;

import br.com.ecad.arrecadacao.api.ArrecadacaoApplication;
import br.com.ecad.arrecadacao.application.commands.AtivarRubricaCommand;
import br.com.ecad.arrecadacao.application.commands.AtualizarRubricaCommand;
import br.com.ecad.arrecadacao.application.commands.CriarRubricaCommand;
import br.com.ecad.arrecadacao.application.commands.InativarRubricaCommand;
import br.com.ecad.arrecadacao.application.commands.handlers.AtivarRubricaCommandHandler;
import br.com.ecad.arrecadacao.application.commands.handlers.AtualizarRubricaCommandHandler;
import br.com.ecad.arrecadacao.application.commands.handlers.CriarRubricaCommandHandler;
import br.com.ecad.arrecadacao.application.commands.handlers.InativarRubricaCommandHandler;
import br.com.ecad.arrecadacao.config.TestSecurityConfig;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository;
import br.com.ecad.arrecadacao.infra.persistence.SpringDataOutboxEventRepository;
import br.com.ecad.arrecadacao.domain.services.SiglaSuggester;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.springframework.amqp.rabbit.core.RabbitTemplate;

/**
 * IT que valida que operações de write em Rubrica geram evento no Outbox
 * com type = {@code arrecadacao.rubrica.atualizada}.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(
        classes = ArrecadacaoApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration")
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@SuppressWarnings("null")
class RubricaEventOutboxIT {

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
    private RubricaRepository rubricaRepository;

    @Autowired
    private SpringDataOutboxEventRepository outboxEventRepository;

    @Autowired
    private CriarRubricaCommandHandler criarHandler;

    @Autowired
    private AtualizarRubricaCommandHandler atualizarHandler;

    @Autowired
    private InativarRubricaCommandHandler inativarHandler;

    @Autowired
    private AtivarRubricaCommandHandler ativarHandler;

    @Autowired
    private PlatformTransactionManager txManager;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    @MockBean
    private SiglaSuggester siglaSuggester;

    @Test
    void criarRubrica_DeveGerarEventoOutboxRubricaAtualizada() {
        // Arrange
        when(siglaSuggester.sugerir(anyString())).thenReturn("RADIO");
        when(rubricaRepository.existsBySigla("RADIO")).thenReturn(false);
        when(rubricaRepository.save(any(Rubrica.class))).thenAnswer(i -> i.getArgument(0));

        TransactionTemplate tt = new TransactionTemplate(txManager);

        UUID rubricaId = UUID.randomUUID();

        // Act
        tt.execute(status -> {
            var cmd = new CriarRubricaCommand("Rádio", false, null, "admin");
            criarHandler.handle(cmd);
            return null;
        });

        // Assert
        tt.execute(status -> {
            var eventos = outboxEventRepository.findAll().stream()
                    .filter(e -> "arrecadacao.rubrica.atualizada".equals(e.getType()))
                    .toList();

            assertThat(eventos)
                    .as("Deve haver pelo menos um evento arrecadacao.rubrica.atualizada no Outbox")
                    .isNotEmpty();
            return null;
        });
    }

    @Test
    void inativarRubrica_DeveGerarEventoOutboxRubricaAtualizada() {
        // Arrange
        UUID id = UUID.randomUUID();
        Rubrica rubrica = new Rubrica(id, "INAT", "Inativar", false, true);
        when(rubricaRepository.findById(id)).thenReturn(java.util.Optional.of(rubrica));
        when(rubricaRepository.save(any(Rubrica.class))).thenAnswer(i -> i.getArgument(0));

        TransactionTemplate tt = new TransactionTemplate(txManager);

        // Act
        tt.execute(status -> {
            var cmd = new InativarRubricaCommand(id, "Obsoleto", "admin");
            inativarHandler.handle(cmd);
            return null;
        });

        // Assert
        tt.execute(status -> {
            var eventos = outboxEventRepository.findAll().stream()
                    .filter(e -> "arrecadacao.rubrica.atualizada".equals(e.getType()))
                    .toList();

            assertThat(eventos)
                    .as("Deve haver evento arrecadacao.rubrica.atualizada após inativação")
                    .isNotEmpty();
            return null;
        });
    }

    @Test
    void ativarRubrica_DeveGerarEventoOutboxRubricaAtualizada() {
        // Arrange
        UUID id = UUID.randomUUID();
        Rubrica rubrica = new Rubrica(id, "ATIV", "Ativar", false, false);
        when(rubricaRepository.findById(id)).thenReturn(java.util.Optional.of(rubrica));
        when(rubricaRepository.save(any(Rubrica.class))).thenAnswer(i -> i.getArgument(0));

        TransactionTemplate tt = new TransactionTemplate(txManager);

        // Act
        tt.execute(status -> {
            var cmd = new AtivarRubricaCommand(id, "Reativacao", "admin");
            ativarHandler.handle(cmd);
            return null;
        });

        // Assert
        tt.execute(status -> {
            var eventos = outboxEventRepository.findAll().stream()
                    .filter(e -> "arrecadacao.rubrica.atualizada".equals(e.getType()))
                    .toList();

            assertThat(eventos)
                    .as("Deve haver evento arrecadacao.rubrica.atualizada após ativação")
                    .isNotEmpty();
            return null;
        });
    }

    @Test
    void atualizarRubrica_DeveGerarEventoOutboxRubricaAtualizada() {
        // Arrange
        UUID id = UUID.randomUUID();
        Rubrica rubrica = new Rubrica(id, "ATUAL", "Atual", false, true);
        when(rubricaRepository.findById(id)).thenReturn(java.util.Optional.of(rubrica));
        when(rubricaRepository.save(any(Rubrica.class))).thenAnswer(i -> i.getArgument(0));

        TransactionTemplate tt = new TransactionTemplate(txManager);

        // Act
        tt.execute(status -> {
            var cmd = new AtualizarRubricaCommand(id, "Atualizado", true, "admin");
            atualizarHandler.handle(cmd);
            return null;
        });

        // Assert
        tt.execute(status -> {
            var eventos = outboxEventRepository.findAll().stream()
                    .filter(e -> "arrecadacao.rubrica.atualizada".equals(e.getType()))
                    .toList();

            assertThat(eventos)
                    .as("Deve haver evento arrecadacao.rubrica.atualizada após atualização")
                    .isNotEmpty();
            return null;
        });
    }
}
