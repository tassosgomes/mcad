using System.Data.Common;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;
using Cadastro.Infra.Data;
using Cadastro.Infra.Events;
using Ecad.Authz.Sdk;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
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

    private readonly string _portalJwtSecret = "test-portal-jwt-secret-with-at-least-32-bytes!";
    private readonly SymmetricSecurityKey _portalSigningKey;
    private static readonly TimeSpan TokenTtl = TimeSpan.FromMinutes(60);

    private string GerarTokenTitular(Guid titularId, string nome)
    {
        var now = DateTime.UtcNow;
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, titularId.ToString()),
            new("nome", nome),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: "cadastro-api-portal",
            audience: null,
            claims: claims,
            notBefore: now,
            expires: now.Add(TokenTtl),
            signingCredentials: new SigningCredentials(_portalSigningKey, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>Mock do publisher para evitar conexão real com RabbitMQ nos testes.</summary>
    public Mock<IRabbitMqPublisher> RabbitMqPublisherMock { get; } = new();

    /// <summary>Connection string para o container PostgreSQL — disponível após InitializeAsync.</summary>
    public string ConnectionString { get; private set; } = string.Empty;

    public CadastroApiFactory()
    {
        EnsureAuthEnvironment();

        var dbContainer = new PostgreSqlBuilder("postgres:16-alpine")
            .WithDatabase("test_mcad")
            .WithUsername("postgres")
            .WithPassword("postgres")
            .Build();
        _dbContainer = dbContainer;

        _portalSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_portalJwtSecret));
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

        // Garantir que PORTAL_JWT_SECRET existe para os testes (≥32 bytes).
        Environment.SetEnvironmentVariable("PORTAL_JWT_SECRET", _portalJwtSecret);

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

            // ── Substituir IEcadAuthzClient por Mock que aprova tudo ────────
            // Nos testes de integração a identidade já é controlada pelo TestAuthHandler;
            // a chamada ao serviço de autorização externo deve ser suprimida para que
            // as permissões sejam sempre concedidas sem dependência de infraestrutura.
            var authzDescriptors = services
                .Where(d => d.ServiceType == typeof(IEcadAuthzClient))
                .ToList();
            foreach (var d in authzDescriptors) services.Remove(d);

            var authzMock = new Mock<IEcadAuthzClient>();
            authzMock
                .Setup(c => c.CheckAsync(
                    It.IsAny<AuthzCheckRequest>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()))
                .ReturnsAsync(new AuthzDecision(true, "ALLOWED_TEST", 0));
            services.AddSingleton(authzMock.Object);

            // ── Substituir autenticação: Default + Titular ──────────────────
            // O scheme default é substituído pelo TestAuthHandler (simula Keycloak JWT via headers).
            // O scheme "Titular" usa o JWT real (JwtBearer "Titular" do Program.cs) — token
            // gerado via TitularTokenService nos métodos CreateTitularClient.
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
        client.DefaultRequestHeaders.Remove(TestAuthHandler.PermissionsHeader);
        client.DefaultRequestHeaders.Remove(TestAuthHandler.UsernameHeader);
        client.DefaultRequestHeaders.Add(TestAuthHandler.UsernameHeader, DefaultUsername);
        client.DefaultRequestHeaders.Add(TestAuthHandler.RolesHeader, roles.Length == 0 ? "analista-cadastro" : string.Join(',', roles));
        return client;
    }

    public HttpClient CreateAuthenticatedClientWithPermissions(
        string username,
        string role,
        params string[] permissions)
    {
        var client = CreateAuthenticatedClient(roles: [role]);
        client.DefaultRequestHeaders.Remove(TestAuthHandler.UsernameHeader);
        client.DefaultRequestHeaders.Add(TestAuthHandler.UsernameHeader, username);
        client.DefaultRequestHeaders.Remove(TestAuthHandler.PermissionsHeader);
        if (permissions.Length > 0)
        {
            client.DefaultRequestHeaders.Add(TestAuthHandler.PermissionsHeader, string.Join(',', permissions));
        }

        return client;
    }

    public HttpClient CreateUnauthenticatedClient(Action<IWebHostBuilder>? configureWebHost = null)
    {
        EnsureAuthEnvironment();
        var factory = configureWebHost is null ? this : WithWebHostBuilder(configureWebHost);
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Remove(TestAuthHandler.RolesHeader);
        client.DefaultRequestHeaders.Remove(TestAuthHandler.UsernameHeader);
        client.DefaultRequestHeaders.Remove(TestAuthHandler.PermissionsHeader);
        client.DefaultRequestHeaders.Remove(TestAuthHandler.AuthModeHeader);
        client.DefaultRequestHeaders.Remove(TestTitularAuthHandler.TitularIdHeader);
        client.DefaultRequestHeaders.Add(TestAuthHandler.AuthModeHeader, "none");
        return client;
    }

    public HttpClient CreateTitularClient(Guid titularId, string nome = "Titular de Teste", Action<IWebHostBuilder>? configureWebHost = null)
    {
        EnsureAuthEnvironment();
        var factory = configureWebHost is null ? this : WithWebHostBuilder(configureWebHost);
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Remove(TestAuthHandler.AuthModeHeader);
        client.DefaultRequestHeaders.Remove(TestAuthHandler.RolesHeader);
        client.DefaultRequestHeaders.Remove(TestAuthHandler.UsernameHeader);
        client.DefaultRequestHeaders.Remove(TestAuthHandler.PermissionsHeader);
        client.DefaultRequestHeaders.Remove(TestTitularAuthHandler.TitularIdHeader);
        client.DefaultRequestHeaders.Add(TestAuthHandler.AuthModeHeader, "none");

        // Gerar JWT real do portal (assinado com o mesmo secret usado pela API)
        var token = GerarTokenTitular(titularId, nome);
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
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
    public const string PermissionsHeader = "X-Test-Permissions";
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
        var roles = SplitHeaderValues(Request.Headers[RolesHeader])
            .DefaultIfEmpty("analista-cadastro")
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        var permissions = SplitHeaderValues(Request.Headers[PermissionsHeader])
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, username),
            new("preferred_username", username),
            new("scope", "access")
        };

        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));
        claims.AddRange(permissions.Select(permission => new Claim("permission", permission)));
        if (roles.Contains("analista-cadastro", StringComparer.OrdinalIgnoreCase))
        {
            claims.Add(new Claim("scope", "write"));
        }

        var identity = new ClaimsIdentity(claims, SchemeName, ClaimTypes.Name, ClaimTypes.Role);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }

    private static IEnumerable<string> SplitHeaderValues(IEnumerable<string?> values)
    {
        return values
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .SelectMany(value => value!.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
    }
}

internal sealed class TestTitularAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string TitularIdHeader = "X-Test-Titular-Id";

    public TestTitularAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var titularIdString = Request.Headers[TitularIdHeader].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(titularIdString) || !Guid.TryParse(titularIdString, out var titularId) || titularId == Guid.Empty)
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, titularId.ToString()),
            new("nome", "Titular de Teste")
        };

        var identity = new ClaimsIdentity(claims, "Titular", JwtRegisteredClaimNames.Sub, ClaimTypes.Role);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "Titular");
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
