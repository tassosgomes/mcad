using System.Data.Common;
using Cadastro.Infra.Data;
using Cadastro.Infra.Events;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Testcontainers.PostgreSql;

namespace Cadastro.IntegrationTests.Fixtures;

public class CadastroApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _dbContainer;
    private string? _connectionString;

    /// <summary>Mock do publisher para evitar conexão real com RabbitMQ nos testes.</summary>
    public Mock<IRabbitMqPublisher> RabbitMqPublisherMock { get; } = new();

    /// <summary>Connection string para o container PostgreSQL — disponível após InitializeAsync.</summary>
    public string ConnectionString { get; private set; } = string.Empty;

    public CadastroApiFactory()
    {
        _dbContainer = new PostgreSqlBuilder()
            .WithImage("postgres:16-alpine")
            .WithDatabase("test_mcad")
            .WithUsername("postgres")
            .WithPassword("postgres")
            .Build();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // ── Substituir DbContext ──────────────────────────────────────────
            var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<CadastroDbContext>));
            if (descriptor != null)
            {
                services.Remove(descriptor);
            }

            services.AddDbContext<CadastroDbContext>(options =>
            {
                options.UseNpgsql(_connectionString ?? _dbContainer.GetConnectionString());
            });

            // ── Substituir IRabbitMqPublisher por Mock ──────────────────────
            var publisherDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IRabbitMqPublisher));
            if (publisherDescriptor != null)
            {
                services.Remove(publisherDescriptor);
            }

            RabbitMqPublisherMock
                .Setup(p => p.PublishAsync(It.IsAny<string>(), It.IsAny<CloudNative.CloudEvents.CloudEvent>(), It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);
            services.AddSingleton(RabbitMqPublisherMock.Object);
        });
    }

    public async Task InitializeAsync()
    {
        await _dbContainer.StartAsync();
        _connectionString = _dbContainer.GetConnectionString();
        ConnectionString = _connectionString;

        // Criar schema UMA vez (no container), usando EnsureCreated
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CadastroDbContext>();
        await db.Database.EnsureCreatedAsync();
    }

    public new Task DisposeAsync()
    {
        return _dbContainer.StopAsync();
    }
}
