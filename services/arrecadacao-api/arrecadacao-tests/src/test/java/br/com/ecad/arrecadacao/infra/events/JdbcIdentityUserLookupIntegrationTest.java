package br.com.ecad.arrecadacao.infra.events;

import br.com.ecad.arrecadacao.application.actor.IdentityUserProjection;
import br.com.ecad.arrecadacao.config.TestSecurityConfig;
import br.com.ecad.arrecadacao.config.VerbaServiceTestConfig;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        classes = br.com.ecad.arrecadacao.api.ArrecadacaoApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration")
@ActiveProfiles("test")
@Import({TestSecurityConfig.class, VerbaServiceTestConfig.class})
@Transactional
@SuppressWarnings("null")
class JdbcIdentityUserLookupIntegrationTest {

    @Autowired JdbcIdentityUserLookup lookup;
    @Autowired JdbcTemplate jdbcTemplate;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    @Test
    void findBySubject_WithLogtoUserId_ShouldReturnProjectionAndStatusInputs() {
        // Arrange
        insertIdentityUser(
                "lookup-active",
                "active.user",
                "Active User",
                "active.user@mcad.dev",
                false,
                null);
        insertIdentityUser(
                "lookup-suspended",
                "suspended.user",
                "Suspended User",
                "suspended.user@mcad.dev",
                true,
                null);
        Instant deletedAt = Instant.parse("2026-05-01T10:15:30Z");
        insertIdentityUser(
                "lookup-removed",
                "removed.user",
                "Removed User",
                "removed.user@mcad.dev",
                false,
                deletedAt);

        // Act
        var active = lookup.findBySubject("lookup-active");
        var suspended = lookup.findBySubject("lookup-suspended");
        var removed = lookup.findBySubject("lookup-removed");
        var missing = lookup.findBySubject("lookup-missing");

        // Assert
        assertThat(active)
                .isPresent()
                .get()
                .satisfies(projection -> {
                    assertThat(projection.subject()).isEqualTo("lookup-active");
                    assertThat(projection.username()).isEqualTo("active.user");
                    assertThat(projection.displayName()).isEqualTo("Active User");
                    assertThat(projection.suspended()).isFalse();
                    assertThat(projection.deletedAtUtc()).isNull();
                });
        assertThat(suspended)
                .isPresent()
                .get()
                .extracting(IdentityUserProjection::suspended)
                .isEqualTo(true);
        assertThat(removed)
                .isPresent()
                .get()
                .extracting(IdentityUserProjection::deletedAtUtc)
                .isEqualTo(deletedAt);
        assertThat(missing).isEmpty();
    }

    @Test
    void findBySubjects_WithRepeatedAndBlankSubjects_ShouldReturnOnlyStoredUsersByLogtoUserId() {
        // Arrange
        insertIdentityUser(
                "lookup-batch-1",
                "batch.one",
                "Batch One",
                "batch.one@mcad.dev",
                false,
                null);
        insertIdentityUser(
                "lookup-batch-2",
                "batch.two",
                "Batch Two",
                "batch.two@mcad.dev",
                false,
                null);

        // Act
        var result = lookup.findBySubjects(List.of(
                "lookup-batch-1",
                " ",
                "lookup-batch-1",
                "lookup-batch-2",
                "lookup-batch-missing"));

        // Assert
        assertThat(result).containsOnlyKeys("lookup-batch-1", "lookup-batch-2");
        assertThat(result.get("lookup-batch-1").username()).isEqualTo("batch.one");
        assertThat(result.get("lookup-batch-2").username()).isEqualTo("batch.two");
    }

    private void insertIdentityUser(
            String subject,
            String username,
            String displayName,
            String email,
            boolean suspended,
            Instant deletedAt
    ) {
        jdbcTemplate.update("""
                INSERT INTO arrecadacao.usuarios_identidade (
                    logto_user_id,
                    username,
                    display_name,
                    email,
                    roles,
                    is_suspended,
                    deleted_at_utc,
                    raw_payload,
                    last_event_id,
                    last_event_type,
                    last_event_occurred_at_utc
                )
                VALUES (?, ?, ?, ?, '[]'::jsonb, ?, ?, '{}'::jsonb, ?, 'identity.user.updated', NOW())
                ON CONFLICT (logto_user_id) DO UPDATE SET
                    username = EXCLUDED.username,
                    display_name = EXCLUDED.display_name,
                    email = EXCLUDED.email,
                    is_suspended = EXCLUDED.is_suspended,
                    deleted_at_utc = EXCLUDED.deleted_at_utc,
                    updated_at_utc = NOW()
                """,
                subject,
                username,
                displayName,
                email,
                suspended,
                deletedAt == null ? null : Timestamp.from(deletedAt),
                "evt-" + subject);
    }
}
