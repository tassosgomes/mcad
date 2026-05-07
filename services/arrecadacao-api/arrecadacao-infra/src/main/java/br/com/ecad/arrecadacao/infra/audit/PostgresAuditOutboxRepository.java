package br.com.ecad.arrecadacao.infra.audit;

import br.org.ecad.audit.contract.AuditEvent;
import br.org.ecad.audit.sdk.AuditOutboxRecord;
import br.org.ecad.audit.sdk.AuditOutboxRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public class PostgresAuditOutboxRepository implements AuditOutboxRepository {
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public PostgresAuditOutboxRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public void save(AuditEvent event) {
        String sql = """
                INSERT INTO arrecadacao.audit_outbox (
                    id, event_id, event_type, aggregate_type, aggregate_id, payload_json, status
                ) VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb), 'PENDING')
                """;
        try {
            jdbcTemplate.update(
                    sql,
                    UUID.randomUUID().toString(),
                    event.eventId(),
                    event.eventType().name(),
                    aggregateType(event),
                    aggregateId(event),
                    toJson(event)
            );
        } catch (DuplicateKeyException ignored) {
            // Duplicate audit event publication is idempotent at producer level.
        }
    }

    @Override
    @Transactional
    public List<AuditOutboxRecord> lockPending(String lockOwner, int batchSize, Duration lockTtl) {
        Instant now = Instant.now();
        Instant lockedUntil = now.plus(lockTtl);
        String selectSql = """
                SELECT id, event_id, event_type, payload_json::text AS payload_json
                FROM arrecadacao.audit_outbox
                WHERE status IN ('PENDING', 'FAILED')
                  AND available_at_utc <= ?
                  AND (locked_until_utc IS NULL OR locked_until_utc < ?)
                ORDER BY created_at_utc
                LIMIT ?
                FOR UPDATE SKIP LOCKED
                """;
        List<AuditOutboxRecord> records = jdbcTemplate.query(
                selectSql,
                (resultSet, rowNum) -> new AuditOutboxRecord(
                        resultSet.getString("id"),
                        resultSet.getString("event_id"),
                        resultSet.getString("event_type"),
                        resultSet.getString("payload_json")
                ),
                Timestamp.from(now),
                Timestamp.from(now),
                batchSize
        );
        records.forEach(record -> lockRecord(record, lockedUntil, lockOwner));
        return records;
    }

    @Override
    public void markSent(String id) {
        jdbcTemplate.update(
                """
                UPDATE arrecadacao.audit_outbox
                SET status = 'SENT',
                    sent_at_utc = NOW(),
                    locked_until_utc = NULL,
                    lock_owner = NULL
                WHERE id = ?
                """,
                id
        );
    }

    @Override
    public void markFailed(String id, String errorMessage) {
        jdbcTemplate.update(
                """
                UPDATE arrecadacao.audit_outbox
                SET status = 'FAILED',
                    retry_count = retry_count + 1,
                    last_error = ?,
                    available_at_utc = NOW() + INTERVAL '60 seconds',
                    locked_until_utc = NULL,
                    lock_owner = NULL
                WHERE id = ?
                """,
                truncate(errorMessage),
                id
        );
    }

    private void lockRecord(AuditOutboxRecord record, Instant lockedUntil, String lockOwner) {
        jdbcTemplate.update(
                """
                UPDATE arrecadacao.audit_outbox
                SET status = 'SENDING',
                    locked_until_utc = ?,
                    lock_owner = ?
                WHERE id = ? AND status IN ('PENDING', 'FAILED')
                """,
                Timestamp.from(lockedUntil),
                lockOwner,
                record.id()
        );
    }

    private String aggregateType(AuditEvent event) {
        return event.data() == null ? null : event.data().entityType();
    }

    private String aggregateId(AuditEvent event) {
        return event.data() == null ? null : event.data().entityId();
    }

    private String toJson(AuditEvent event) {
        try {
            return objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException exception) {
            throw new AuditOutboxSerializationException("Could not serialize audit event", exception);
        }
    }

    private String truncate(String value) {
        if (value == null || value.length() <= 4000) {
            return value;
        }
        return value.substring(0, 4000);
    }
}
