using System.Data.Common;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Cadastro.Infra.Data;
using Cadastro.Infra.Events;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using Testcontainers.PostgreSql;

namespace Cadastro.IntegrationTests.Fixtures;

public class CadastroApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private const string DefaultUsername = "analista.teste";
    private const string TestOidcAuthority = "https://test-keycloak.local/realms/mcad";
    private const string TestOidcAudience = "mcad-frontend";
    private readonly PostgreSqlContainer _dbContainer;
    private string? _connectionString;

    /// <summary>Mock do publisher para evitar conexão real com RabbitMQ nos testes.</summary>
    public Mock<IRabbitMqPublisher> RabbitMqPublisherMock { get; } = new();

    /// <summary>Connection string para o container PostgreSQL — disponível após InitializeAsync.</summary>
    public string ConnectionString { get; private set; } = string.Empty;

    public CadastroApiFactory()
    {
        EnsureAuthEnvironment();

        _dbContainer = new PostgreSqlBuilder("postgres:16-alpine")
            .WithDatabase("test_mcad")
            .WithUsername("postgres")
            .WithPassword("postgres")
            .Build();
    }

    private static void EnsureAuthEnvironment()
    {
        Environment.SetEnvironmentVariable("AUTH_ENABLED", "true");
        Environment.SetEnvironmentVariable("OIDC_AUTHORITY", TestOidcAuthority);
        Environment.SetEnvironmentVariable("OIDC_AUDIENCE", TestOidcAudience);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        EnsureAuthEnvironment();

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

            services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                    options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                    options.DefaultScheme = TestAuthHandler.SchemeName;
                })
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });
        });
    }

    public new HttpClient CreateClient()
    {
        EnsureAuthEnvironment();
        return CreateAuthenticatedClient();
    }

    public HttpClient CreateAuthenticatedClient(Action<IWebHostBuilder>? configureWebHost = null, params string[] roles)
    {
        EnsureAuthEnvironment();
        var factory = configureWebHost is null ? this : WithWebHostBuilder(configureWebHost);
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Remove(TestAuthHandler.AuthModeHeader);
        client.DefaultRequestHeaders.Remove(TestAuthHandler.RolesHeader);
        client.DefaultRequestHeaders.Remove(TestAuthHandler.UsernameHeader);
        client.DefaultRequestHeaders.Add(TestAuthHandler.UsernameHeader, DefaultUsername);
        client.DefaultRequestHeaders.Add(TestAuthHandler.RolesHeader, roles.Length == 0 ? "analista-cadastro" : string.Join(',', roles));
        return client;
    }

    public HttpClient CreateUnauthenticatedClient(Action<IWebHostBuilder>? configureWebHost = null)
    {
        EnsureAuthEnvironment();
        var factory = configureWebHost is null ? this : WithWebHostBuilder(configureWebHost);
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Remove(TestAuthHandler.RolesHeader);
        client.DefaultRequestHeaders.Remove(TestAuthHandler.UsernameHeader);
        client.DefaultRequestHeaders.Remove(TestAuthHandler.AuthModeHeader);
        client.DefaultRequestHeaders.Add(TestAuthHandler.AuthModeHeader, "none");
        return client;
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

internal sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "Test";
    public const string AuthModeHeader = "X-Test-Auth";
    public const string RolesHeader = "X-Test-Roles";
    public const string UsernameHeader = "X-Test-Username";

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (string.Equals(Request.Headers[AuthModeHeader], "none", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var username = Request.Headers[UsernameHeader].FirstOrDefault() ?? "analista.teste";
        var roles = Request.Headers[RolesHeader]
            .SelectMany(value => value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .DefaultIfEmpty("analista-cadastro")
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, username),
            new("preferred_username", username),
            new("scope", "access")
        };

        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));
        if (roles.Contains("analista-cadastro", StringComparer.OrdinalIgnoreCase))
        {
            claims.Add(new Claim("scope", "write"));
        }

        var identity = new ClaimsIdentity(claims, SchemeName, ClaimTypes.Name, ClaimTypes.Role);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
