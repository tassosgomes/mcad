namespace Identificacao.Tests.Infra;

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║ Integration Tests — agora implementados em projeto separado                  ║
// ║                                                                              ║
// ║ Os testes de Infra (repositórios + Outbox + Postgres real) foram migrados    ║
// ║ para `5-Tests/Identificacao.IntegrationTests/` usando Testcontainers.        ║
// ║                                                                              ║
// ║ Cobertura atual (Integration):                                               ║
// ║   - Repositories/CaptacaoRepositoryTests       (12 testes)                   ║
// ║   - Repositories/ExecucaoRepositoryTests        (6 testes)                   ║
// ║   - Repositories/UploadRepositoryTests          (4 testes)                   ║
// ║   - Repositories/ErroUploadRepositoryTests      (2 testes)                   ║
// ║   - Repositories/RubricaRepositoryTests         (2 testes)                   ║
// ║   - Repositories/TipoUtilizacaoRepositoryTests  (3 testes)                   ║
// ║   - Events/OutboxEventWriterTests               (4 testes)                   ║
// ║                                                                              ║
// ║ Backlog remanescente (futuro):                                               ║
// ║   - OutboxPublisherWorker — background poller que consome OutboxEvents,     ║
// ║     publica no RabbitMQ e marca PublishedAt. Requer Testcontainers.RabbitMq. ║
// ║   - RabbitMqPublisher — validar exchange/routing key por evento.            ║
// ║   - PostgresAuditOutboxRepository + EfAuditOutboxClient — auditoria.        ║
// ║   - Migrations EF aplicadas (atualmente usa EnsureCreatedAsync).            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
