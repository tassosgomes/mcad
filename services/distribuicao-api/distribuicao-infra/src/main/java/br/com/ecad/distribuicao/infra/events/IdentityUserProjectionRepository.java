package br.com.ecad.distribuicao.infra.events;

import java.sql.Timestamp;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class IdentityUserProjectionRepository {

    private static final String UPSERT_SQL = """
            INSERT INTO distribuicao.usuarios_identidade (
                logto_user_id,
                username,
                display_name,
                email,
                avatar_url,
                roles,
                is_suspended,
                deleted_at_utc,
                raw_payload,
                last_event_id,
                last_event_type,
                last_event_occurred_at_utc,
                updated_at_utc
            )
            VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb), ?, ?, CAST(? AS jsonb), ?, ?, ?, NOW())
            ON CONFLICT (logto_user_id) DO UPDATE SET
                username = EXCLUDED.username,
                display_name = EXCLUDED.display_name,
                email = EXCLUDED.email,
                avatar_url = EXCLUDED.avatar_url,
                roles = EXCLUDED.roles,
                is_suspended = EXCLUDED.is_suspended,
                deleted_at_utc = EXCLUDED.deleted_at_utc,
                raw_payload = EXCLUDED.raw_payload,
                last_event_id = EXCLUDED.last_event_id,
                last_event_type = EXCLUDED.last_event_type,
                last_event_occurred_at_utc = EXCLUDED.last_event_occurred_at_utc,
                updated_at_utc = NOW()
            """;

    private final JdbcTemplate jdbcTemplate;

    public IdentityUserProjectionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public void upsert(IdentityUserEventListener.IdentityUserEvent event) {
        var user = event.user();
        Timestamp deletedAt = "identity.user.deleted".equals(event.eventType())
                ? Timestamp.from(event.occurredAt().toInstant())
                : null;

        jdbcTemplate.update(
                UPSERT_SQL,
                user.logtoUserId(),
                user.username(),
                user.displayName(),
                user.email(),
                user.avatarUrl(),
                user.rolesJson(),
                user.suspended(),
                deletedAt,
                user.rawPayloadJson(),
                event.eventId(),
                event.eventType(),
                Timestamp.from(event.occurredAt().toInstant()));
    }
}
