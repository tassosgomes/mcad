using System.Security.Claims;
using System.Text.Encodings.Web;
using Ecad.Authz.Sdk;
using Identificacao.Domain.Interfaces;
using Identificacao.Infra.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using Testcontainers.PostgreSql;

namespace Identificacao.IntegrationTests.Fixtures;

/// <summary>
/// Factory de integração para a Identificação API.
///
/// Espelha o padrão usado em <c>CadastroApiFactory</c>:
/// — sobe Postgres via Testcontainers e troca o DbContext;
/// — substitui <see cref="IRabbitMqPublisher"/> por mock;
/// — substitui <see cref="IEcadAuthzClient"/> por mock (default: permite tudo);
/// — usa <see cref="TestAuthHandler"/> para emitir identidade controlada por header.
/// </summary>
public class IdentificacaoApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private const string DefaultUsername = "analista.identificacao";
    private const string TestOidcAuthority = "https://test-keycloak.local/realms/mcad";
    private const string TestOidcAudience = "mcad-frontend";

    private readonly PostgreSqlContainer _dbContainer;
    private string? _connectionString;

    public Mock<IRabbitMqPublisher> RabbitMqPublisherMock { get; } = new();

    public string ConnectionString { get; private set; } = string.Empty;

    public IdentificacaoApiFactory()
    {
        EnsureAuthEnvironment();

        _dbContainer = new PostgreSqlBuilder("postgres:16-alpine")
            .WithDatabase("identificacao_authz_test")
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
            // ── Substituir DbContext ──────────────────────────────────────
            var descriptor = services.SingleOrDefault(d =>
                d.ServiceType == typeof(DbContextOptions<IdentificacaoDbContext>));
            if (descriptor != null)
            {
                services.Remove(descriptor);
            }

            services.AddDbContext<IdentificacaoDbContext>(options =>
                options.UseNpgsql(_connectionString ?? _dbContainer.GetConnectionString())
                       .ConfigureWarnings(w => w.Ignore(
                           Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

            // ── Substituir RabbitMqPublisher por mock ─────────────────────
            var publisherDescriptors = services
                .Where(d => d.ServiceType == typeof(IRabbitMqPublisher))
                .ToList();
            foreach (var d in publisherDescriptors)
            {
                services.Remove(d);
            }
            RabbitMqPublisherMock
                .Setup(p => p.PublishAsync(
                    It.IsAny<string>(),
                    It.IsAny<CloudNative.CloudEvents.CloudEvent>(),
                    It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);
            services.AddSingleton(RabbitMqPublisherMock.Object);

            // ── Substituir HostedServices por no-op (não rodar workers) ──
            // Removemos workers de Outbox/Consumer/CSV/Pendentes para que os
            // testes de autorização não dependam de RabbitMQ/MinIO reais.
            var hostedServices = services
                .Where(d => d.ServiceType == typeof(Microsoft.Extensions.Hosting.IHostedService))
                .ToList();
            foreach (var d in hostedServices)
            {
                services.Remove(d);
            }

            // ── Substituir IEcadAuthzClient: default ALLOW ────────────────
            var authzDescriptors = services
                .Where(d => d.ServiceType == typeof(IEcadAuthzClient))
                .ToList();
            foreach (var d in authzDescriptors)
            {
                services.Remove(d);
            }

            var authzMock = new Mock<IEcadAuthzClient>();
            authzMock
                .Setup(c => c.CheckAsync(
                    It.IsAny<AuthzCheckRequest>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()))
                .ReturnsAsync(new AuthzDecision(true, "ALLOWED_TEST", 0));
            services.AddSingleton(authzMock.Object);

            // ── Esquema de autenticação de teste por header ───────────────
            services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                    options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                    options.DefaultScheme = TestAuthHandler.SchemeName;
                })
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                    TestAuthHandler.SchemeName, _ => { });
        });
    }

    public new HttpClient CreateClient()
    {
        EnsureAuthEnvironment();
        return CreateAuthenticatedClient();
    }

    public HttpClient CreateAuthenticatedClient(
        Action<IWebHostBuilder>? configureWebHost = null,
        params string[] roles)
    {
        EnsureAuthEnvironment();
        var factory = configureWebHost is null ? this : WithWebHostBuilder(configureWebHost);
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Remove(TestAuthHandler.AuthModeHeader);
        client.DefaultRequestHeaders.Remove(TestAuthHandler.RolesHeader);
        client.DefaultRequestHeaders.Remove(TestAuthHandler.UsernameHeader);
        client.DefaultRequestHeaders.Add(TestAuthHandler.UsernameHeader, DefaultUsername);
        client.DefaultRequestHeaders.Add(
            TestAuthHandler.RolesHeader,
            roles.Length == 0 ? "identificacao.analista" : string.Join(',', roles));
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

    public HttpClient CreateClientWithSub(string sub, string? displayName = null, params string[] roles)
    {
        EnsureAuthEnvironment();
        var client = CreateClient();
        client.DefaultRequestHeaders.Remove(TestAuthHandler.AuthModeHeader);
        client.DefaultRequestHeaders.Remove(TestAuthHandler.RolesHeader);
        client.DefaultRequestHeaders.Remove(TestAuthHandler.UsernameHeader);
        client.DefaultRequestHeaders.Remove(TestAuthHandler.SubHeader);
        client.DefaultRequestHeaders.Remove(TestAuthHandler.NameHeader);
        client.DefaultRequestHeaders.Add(TestAuthHandler.UsernameHeader, DefaultUsername);
        client.DefaultRequestHeaders.Add(TestAuthHandler.SubHeader, sub);
        if (displayName != null)
            client.DefaultRequestHeaders.Add(TestAuthHandler.NameHeader, displayName);
        client.DefaultRequestHeaders.Add(
            TestAuthHandler.RolesHeader,
            roles.Length == 0 ? "identificacao.analista" : string.Join(',', roles));
        return client;
    }

    public HttpClient CreateClientWithDeniedAuthz(string roles = "identificacao.analista")
    {
        var deniedMock = new Mock<IEcadAuthzClient>();
        deniedMock
            .Setup(c => c.CheckAsync(
                It.IsAny<AuthzCheckRequest>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AuthzDecision(false, "DENIED_TEST", 0));

        return CreateAuthenticatedClient(
            configureWebHost: builder => builder.ConfigureTestServices(services =>
            {
                var descriptors = services
                    .Where(d => d.ServiceType == typeof(IEcadAuthzClient))
                    .ToList();
                foreach (var d in descriptors)
                {
                    services.Remove(d);
                }
                services.AddSingleton(deniedMock.Object);
            }),
            roles: roles);
    }

    public async Task InitializeAsync()
    {
        await _dbContainer.StartAsync();
        _connectionString = _dbContainer.GetConnectionString();
        ConnectionString = _connectionString;

        // Criar schema via EnsureCreated antes do startup do app (que roda Migrate).
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentificacaoDbContext>();
        await db.Database.EnsureCreatedAsync();
    }

    public new Task DisposeAsync() => _dbContainer.StopAsync();
}

/// <summary>
/// Handler de autenticação de teste — emite o ClaimsPrincipal com base
/// nos headers <c>X-Test-Roles</c> / <c>X-Test-Username</c>. Quando
/// <c>X-Test-Auth: none</c> é enviado, retorna <c>NoResult</c> para
/// simular ausência de token (resulta em 401 na pipeline).
/// </summary>
internal sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "Test";
    public const string AuthModeHeader = "X-Test-Auth";
    public const string RolesHeader = "X-Test-Roles";
    public const string UsernameHeader = "X-Test-Username";
    public const string SubHeader = "X-Test-Sub";
    public const string NameHeader = "X-Test-Name";

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        Microsoft.Extensions.Logging.ILoggerFactory logger,
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

        var username = Request.Headers[UsernameHeader].FirstOrDefault() ?? "analista.identificacao";
        var roles = Request.Headers[RolesHeader]
            .SelectMany(value => value!.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .DefaultIfEmpty("identificacao.analista")
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var sub = Request.Headers[SubHeader].FirstOrDefault() ?? Guid.NewGuid().ToString();

        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, username),
            new("preferred_username", username),
            new("sub", sub)
        };

        var name = Request.Headers[NameHeader].FirstOrDefault();
        if (!string.IsNullOrEmpty(name))
        {
            claims.Add(new("name", name));
        }

        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var identity = new ClaimsIdentity(claims, SchemeName, ClaimTypes.Name, ClaimTypes.Role);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
