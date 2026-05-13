using Identificacao.Infra.Data;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;

namespace Identificacao.IntegrationTests.Fixtures;

/// <summary>
/// Fixture compartilhada por toda a coleção de testes de integração.
/// Sobe um único container PostgreSQL para o run e expõe o ConnectionString.
/// Cada teste deve criar seu próprio DbContext via <see cref="CreateDbContext"/>
/// e limpar o estado relevante (preferir <see cref="ResetAsync"/>).
/// </summary>
public class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container;

    public string ConnectionString { get; private set; } = string.Empty;

    public PostgresFixture()
    {
        _container = new PostgreSqlBuilder("postgres:16-alpine")
            .WithDatabase("identificacao_test")
            .WithUsername("postgres")
            .WithPassword("postgres")
            .Build();
    }

    public async Task InitializeAsync()
    {
        await _container.StartAsync();
        ConnectionString = _container.GetConnectionString();

        await using var ctx = CreateDbContext();
        await ctx.Database.EnsureCreatedAsync();
    }

    public Task DisposeAsync() => _container.StopAsync();

    public IdentificacaoDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<IdentificacaoDbContext>()
            .UseNpgsql(ConnectionString)
            .Options;
        return new IdentificacaoDbContext(options);
    }

    /// <summary>
    /// Limpa todas as tabelas em ordem segura (respeitando FKs). Use no início de cada teste.
    /// </summary>
    public async Task ResetAsync()
    {
        await using var ctx = CreateDbContext();
        ctx.OutboxEvents.RemoveRange(ctx.OutboxEvents);
        ctx.AuditOutboxEvents.RemoveRange(ctx.AuditOutboxEvents);
        ctx.ErrosUpload.RemoveRange(ctx.ErrosUpload);
        ctx.Uploads.RemoveRange(ctx.Uploads);
        ctx.Execucoes.RemoveRange(ctx.Execucoes);
        ctx.Captacoes.RemoveRange(ctx.Captacoes);
        ctx.Rubricas.RemoveRange(ctx.Rubricas);
        ctx.TiposUtilizacao.RemoveRange(ctx.TiposUtilizacao);
        await ctx.SaveChangesAsync();
    }
}

[CollectionDefinition(Name)]
public class PostgresCollection : ICollectionFixture<PostgresFixture>
{
    public const string Name = "Postgres";
}
