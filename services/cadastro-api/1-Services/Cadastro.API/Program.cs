using Cadastro.API.Endpoints;
using Cadastro.API.Infrastructure;
using Cadastro.Application.Associacoes.Queries;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Titulares.Commands;
using Cadastro.Domain.Interfaces;
using Cadastro.Infra.Data;
using Cadastro.Infra.Events;
using Cadastro.Infra.Repositories;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Polly;

DotEnvLoader.LoadIfPresent();

var builder = WebApplication.CreateBuilder(args);
var authEnabled = !string.Equals(
    builder.Configuration["AUTH_ENABLED"],
    "false",
    StringComparison.OrdinalIgnoreCase);

// ─── Connection String (lida de variáveis de ambiente) ─────────────────
var dbHost     = Environment.GetEnvironmentVariable("CADASTRO_DB_HOST")     ?? "localhost";
var dbPort     = Environment.GetEnvironmentVariable("CADASTRO_DB_PORT")     ?? "5432";
var dbName     = Environment.GetEnvironmentVariable("CADASTRO_DB_NAME")     ?? "mcad";
var dbSchema   = Environment.GetEnvironmentVariable("CADASTRO_DB_SCHEMA")   ?? "cadastro";
var dbUser     = Environment.GetEnvironmentVariable("CADASTRO_DB_USER")     ?? "cadastro_svc";
var dbPassword = Environment.GetEnvironmentVariable("CADASTRO_DB_PASSWORD") ?? string.Empty;

var connectionString =
    $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPassword};Search Path={dbSchema}";

// ─── DbContext (EF Core + PostgreSQL) ─────────────────────────────────
builder.Services.AddDbContext<CadastroDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql =>
        npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "cadastro")));

// ─── Repository ────────────────────────────────────────────────────────
builder.Services.AddScoped<IAssociacaoRepository, AssociacaoRepository>();
builder.Services.AddScoped<ITitularRepository, TitularRepository>();
builder.Services.AddScoped<IObraRepository, ObraRepository>();
builder.Services.AddScoped<ITitularidadeRepository, TitularidadeRepository>();
builder.Services.AddScoped<IFonogramaRepository, FonogramaRepository>();
builder.Services.AddScoped<IParticipacaoRepository, ParticipacaoRepository>();
builder.Services.AddScoped<IHistoricoBloqueioRepository, HistoricoBloqueioRepository>();

// ─── HttpClient + Polly ────────────────────────────────────────────────
var iswcBaseUrl = Environment.GetEnvironmentVariable("ISWC_BASE_URL") ?? "https://iswc.tasso.dev.br/";
builder.Services.AddHttpClient<IIswcService, Cadastro.Infra.ExternalServices.IswcService>(client =>
{
    client.BaseAddress = new Uri(iswcBaseUrl);
    client.Timeout = TimeSpan.FromSeconds(10);
}).AddTransientHttpErrorPolicy(p => p.RetryAsync(2));

// ─── Outbox / RabbitMQ / Events ───────────────────────────────────────
builder.Services.AddScoped<IOutboxEventWriter, OutboxEventWriter>();
builder.Services.AddSingleton<IRabbitMqPublisher>(sp =>
    new RabbitMqPublisher(
        sp.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>(),
        sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<RabbitMqPublisher>>()));
builder.Services.AddHostedService<OutboxPublisherWorker>();

// ─── CQRS — Dispatcher + Handlers (via Scrutor) ───────────────────────
builder.Services.AddScoped<IDispatcher, Dispatcher>();
builder.Services.Scan(scan => scan
    .FromAssemblyOf<GetAssociacoesQuery>()
    .AddClasses(c => c.AssignableTo(typeof(IQueryHandler<,>)))
    .AsImplementedInterfaces()
    .WithScopedLifetime());
builder.Services.Scan(scan => scan
    .FromAssemblyOf<CriarTitularCommand>()
    .AddClasses(c => c.AssignableTo(typeof(ICommandHandler<,>)))
    .AsImplementedInterfaces()
    .WithScopedLifetime());

// ─── FluentValidation — Validators ────────────────────────────────────
builder.Services.AddValidatorsFromAssemblyContaining<CriarTitularCommandValidator>();

// ─── Health Checks ─────────────────────────────────────────────────────
builder.Services.AddHealthChecks();

// ─── CORS (frontend dev em localhost:5173) ─────────────────────────────
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()));

// ─── Exception Handler (GlobalExceptionHandler → ProblemDetails) ───────
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

if (authEnabled)
{
    var oidcAuthority = Environment.GetEnvironmentVariable("OIDC_AUTHORITY");
    var oidcAudience = Environment.GetEnvironmentVariable("OIDC_AUDIENCE") ?? "mcad-frontend";

    if (string.IsNullOrWhiteSpace(oidcAuthority))
    {
        throw new InvalidOperationException("OIDC_AUTHORITY is required when AUTH_ENABLED=true.");
    }

    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.Authority = oidcAuthority;
            options.Audience = oidcAudience;
            options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
            options.MapInboundClaims = false;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidIssuer = oidcAuthority,
                ValidateIssuer = true,
                ValidateAudience = false
            };
            options.Events = new JwtBearerEvents
            {
                OnTokenValidated = context =>
                {
                    var authorizedParty = context.Principal?.FindFirst("azp")?.Value;
                    if (!string.Equals(authorizedParty, oidcAudience, StringComparison.Ordinal))
                    {
                        context.Fail("Token authorized party does not match configured audience.");
                    }

                    return Task.CompletedTask;
                }
            };
        });

    builder.Services.AddTransient<IClaimsTransformation, KeycloakClaimsTransformation>();
    builder.Services.AddAuthorization(options =>
    {
        options.FallbackPolicy = new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .Build();
        options.AddPolicy("read", policy => policy.RequireRole("analista-cadastro", "consultor", "analista-identificacao"));
        options.AddPolicy("write", policy => policy.RequireRole("analista-cadastro", "analista-identificacao"));
    });
}

// ─── Logging estruturado ───────────────────────────────────────────────
builder.Logging.AddConsole();

var app = builder.Build();

// ─── Middleware pipeline ───────────────────────────────────────────────
app.UseExceptionHandler();
app.UseCors();

if (authEnabled)
{
    app.UseAuthentication();
    app.UseAuthorization();
}
else
{
    app.Logger.LogWarning("Authentication is DISABLED");
}

// ─── Aplicar migrations + confirmar seed no startup ───────────────────
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<CadastroDbContext>();
    try
    {
        context.Database.Migrate();
        var count = context.Associacoes.Count();
        app.Logger.LogInformation("Startup: {Count} associações no banco de dados", count);
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Não foi possível aplicar migrations. Banco de dados pode não estar acessível.");
    }
}

// ─── Endpoints ────────────────────────────────────────────────────────
app.MapAssociacaoEndpoints();
app.MapTitularEndpoints();
app.MapObraEndpoints();
app.MapTitularidadeEndpoints();
app.MapFonogramaEndpoints();
app.MapParticipacaoEndpoints();
app.MapBuscaEndpoints();

// ─── Health Check ─────────────────────────────────────────────────────
app.MapHealthChecks("/health").AllowAnonymous();

app.Logger.LogInformation("Cadastro API iniciada na porta 5001");
app.Run();

// Expõe a classe Program para WebApplicationFactory nos testes de integração
public partial class Program { }

internal static class DotEnvLoader
{
    public static void LoadIfPresent()
    {
        foreach (var candidate in GetCandidates())
        {
            if (!File.Exists(candidate))
            {
                continue;
            }

            foreach (var rawLine in File.ReadLines(candidate))
            {
                var line = rawLine.Trim();
                if (string.IsNullOrWhiteSpace(line) || line.StartsWith('#'))
                {
                    continue;
                }

                var separatorIndex = line.IndexOf('=');
                if (separatorIndex <= 0)
                {
                    continue;
                }

                var key = line[..separatorIndex].Trim();
                if (string.IsNullOrWhiteSpace(key) || Environment.GetEnvironmentVariable(key) is not null)
                {
                    continue;
                }

                var value = line[(separatorIndex + 1)..].Trim().Trim('"');
                Environment.SetEnvironmentVariable(key, value);
            }

            return;
        }
    }

    private static IEnumerable<string> GetCandidates()
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var root in new[] { Directory.GetCurrentDirectory(), AppContext.BaseDirectory })
        {
            var directory = new DirectoryInfo(root);
            while (directory is not null)
            {
                var candidate = Path.Combine(directory.FullName, ".env");
                if (seen.Add(candidate))
                {
                    yield return candidate;
                }

                directory = directory.Parent;
            }
        }
    }
}
