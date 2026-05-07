using System.Data;
using System.Text.Json;
using Cadastro.Infra.Data;
using Ecad.Audit.Contract;
using Ecad.Audit.Sdk;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Cadastro.Infra.Audit;

public sealed class PostgresAuditOutboxRepository : IAuditOutboxRepository
{
    private const int MaxErrorLength = 4000;
    private readonly CadastroDbContext _context;
    private readonly JsonSerializerOptions _jsonOptions;

    public PostgresAuditOutboxRepository(CadastroDbContext context, JsonSerializerOptions jsonOptions)
    {
        _context = context;
        _jsonOptions = jsonOptions;
    }

    public async Task SaveAsync(AuditEvent auditEvent, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(auditEvent);

        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            INSERT INTO cadastro.audit_outbox (
                id, event_id, event_type, aggregate_type, aggregate_id, payload_json, status
            ) VALUES (@id, @event_id, @event_type, @aggregate_type, @aggregate_id, CAST(@payload_json AS jsonb), 'PENDING')
            ON CONFLICT (event_id) DO NOTHING
            """;

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("id", Guid.NewGuid().ToString());
        command.Parameters.AddWithValue("event_id", auditEvent.EventId);
        command.Parameters.AddWithValue("event_type", auditEvent.EventType.ToString());
        command.Parameters.AddWithValue("aggregate_type", (object?)auditEvent.Data?.EntityType ?? DBNull.Value);
        command.Parameters.AddWithValue("aggregate_id", (object?)auditEvent.Data?.EntityId ?? DBNull.Value);
        command.Parameters.AddWithValue("payload_json", JsonSerializer.Serialize(auditEvent, _jsonOptions));
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AuditOutboxRecord>> LockPendingAsync(
        string lockOwner,
        int batchSize,
        TimeSpan lockTtl,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(lockOwner);

        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);

        var now = DateTime.UtcNow;
        var lockedUntil = now.Add(lockTtl);
        const string selectSql = """
            SELECT id, event_id, event_type, payload_json::text AS payload_json
            FROM cadastro.audit_outbox
            WHERE status IN ('PENDING', 'FAILED')
              AND available_at_utc <= @now_utc
              AND (locked_until_utc IS NULL OR locked_until_utc < @now_utc)
            ORDER BY created_at_utc
            LIMIT @batch_size
            FOR UPDATE SKIP LOCKED
            """;

        var records = new List<AuditOutboxRecord>();
        await using (var selectCommand = new NpgsqlCommand(selectSql, connection, transaction))
        {
            selectCommand.Parameters.AddWithValue("now_utc", now);
            selectCommand.Parameters.AddWithValue("batch_size", batchSize);

            await using var reader = await selectCommand.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                records.Add(new AuditOutboxRecord(
                    reader.GetString(0),
                    reader.GetString(1),
                    reader.GetString(2),
                    reader.GetString(3)));
            }
        }

        foreach (var record in records)
        {
            await LockRecordAsync(connection, transaction, record.Id, lockOwner, lockedUntil, cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        return records;
    }

    public async Task MarkSentAsync(string id, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(id);

        const string sql = """
            UPDATE cadastro.audit_outbox
            SET status = 'SENT',
                sent_at_utc = NOW(),
                locked_until_utc = NULL,
                lock_owner = NULL
            WHERE id = @id
            """;

        await ExecuteByIdAsync(sql, id, cancellationToken);
    }

    public async Task MarkFailedAsync(string id, string? errorMessage, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(id);

        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            UPDATE cadastro.audit_outbox
            SET status = 'FAILED',
                retry_count = retry_count + 1,
                last_error = @last_error,
                available_at_utc = NOW() + INTERVAL '60 seconds',
                locked_until_utc = NULL,
                lock_owner = NULL
            WHERE id = @id
            """;

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("last_error", (object?)Truncate(errorMessage) ?? DBNull.Value);
        command.Parameters.AddWithValue("id", id);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private async Task LockRecordAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        string id,
        string lockOwner,
        DateTime lockedUntil,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE cadastro.audit_outbox
            SET status = 'SENDING',
                locked_until_utc = @locked_until_utc,
                lock_owner = @lock_owner
            WHERE id = @id AND status IN ('PENDING', 'FAILED')
            """;

        await using var command = new NpgsqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("locked_until_utc", lockedUntil);
        command.Parameters.AddWithValue("lock_owner", lockOwner);
        command.Parameters.AddWithValue("id", id);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private async Task ExecuteByIdAsync(string sql, string id, CancellationToken cancellationToken)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("id", id);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private NpgsqlConnection CreateConnection()
    {
        return new NpgsqlConnection(_context.Database.GetConnectionString());
    }

    private static string? Truncate(string? value)
    {
        return value is null || value.Length <= MaxErrorLength ? value : value[..MaxErrorLength];
    }
}
