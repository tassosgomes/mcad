using Cadastro.API.Audit;
using Cadastro.API.Authorization;
using Cadastro.API.AsyncApi;
using Cadastro.API.Endpoints;
using Cadastro.API.Infrastructure;
using Cadastro.API.Swagger;
using Cadastro.Application.Audit;
using Cadastro.Application.Associacoes.Queries;
using Cadastro.Application.Common.Authorization;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Titulares.Commands;
using Cadastro.Application.Titulares.Services;
using Cadastro.Domain.Interfaces;
using Cadastro.Infra.Audit;
using Cadastro.Infra.Data;
using Cadastro.Infra.Events;
using Cadastro.Infra.Repositories;
using Cadastro.Infra.Services;
using Cadastro.Infra.Storage;
using Ecad.Audit.AspNetCore;
using Ecad.Audit.Sdk;
using Ecad.Authz.AspNetCore;
using Ecad.Authz.Sdk;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Polly;
using Prometheus;
using System.Text;

DotEnvLoader.LoadIfPresent();

var builder = WebApplication.CreateBuilder(args);

// ─── Connection String (lida de variáveis de ambiente) ─────────────────
var dbHost     = Environment.GetEnvironmentVariable("CADASTRO_DB_HOST")     ?? "localhost";
var dbPort     = Environment.GetEnvironmentVariable("CADASTRO_DB_PORT")     ?? "5432";
var dbName     = Environment.GetEnvironmentVariable("CADASTRO_DB_NAME")     ?? "mcad";
var dbSchema   = Environment.GetEnvironmentVariable("CADASTRO_DB_SCHEMA")   ?? "cadastro";
var dbUser     = Environment.GetEnvironmentVariable("CADASTRO_DB_USER")     ?? "cadastro_svc";
var dbPassword = Environment.GetEnvironmentVariable("CADASTRO_DB_PASSWORD") ?? string.Empty;
var dbSslMode  = Environment.GetEnvironmentVariable("CADASTRO_DB_SSL_MODE") ?? "Disable";

var connectionString =
    $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPassword};Search Path={dbSchema};SSL Mode={dbSslMode};Trust Server Certificate=true";

var corsAllowedOrigins = (Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS") ?? "http://localhost:5173")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

// ─── DbContext (EF Core + PostgreSQL) ─────────────────────────────────
builder.Services.AddDbContext<CadastroDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql =>
        npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "cadastro")));

// ─── Auditoria transversal ───────────────────────────────────────────
builder.Services.AddEcadAudit(builder.Configuration, options =>
{
    options.ServiceName = string.IsNullOrWhiteSpace(options.ServiceName) ? "cadastro-api" : options.ServiceName;
    options.System = string.IsNullOrWhiteSpace(options.System) ? "mcad" : options.System;
    options.Environment = string.IsNullOrWhiteSpace(options.Environment)
        ? builder.Environment.EnvironmentName
        : options.Environment;
    options.RabbitMqUri = AuditConfigurationHelpers.ResolveRabbitMqUri(builder.Configuration);
});
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserPermissions, HttpContextCurrentUserPermissions>();
builder.Services.AddScoped<IAuditContextProvider, HttpAuditContextProvider>();
builder.Services.AddScoped<ObraAuditEventFactory>();
builder.Services.AddScoped<IObraAuditPublisher, ObraAuditPublisher>();
builder.Services.AddScoped<FonogramaAuditEventFactory>();
builder.Services.AddScoped<IFonogramaAuditPublisher, FonogramaAuditPublisher>();
builder.Services.AddScoped<TitularAuditEventFactory>();
builder.Services.AddScoped<ITitularAuditPublisher, TitularAuditPublisher>();
builder.Services.AddScoped<TitularidadeAuditEventFactory>();
builder.Services.AddScoped<ITitularidadeAuditPublisher, TitularidadeAuditPublisher>();
builder.Services.AddScoped<ParticipacaoAuditEventFactory>();
builder.Services.AddScoped<IParticipacaoAuditPublisher, ParticipacaoAuditPublisher>();
builder.Services.AddScoped<IAuditOutboxRepository, PostgresAuditOutboxRepository>();
builder.Services.AddScoped<IAuditClient, EfAuditOutboxClient>();

// ─── Repository ────────────────────────────────────────────────────────
builder.Services.AddScoped<IAssociacaoRepository, AssociacaoRepository>();
builder.Services.AddScoped<ITitularRepository, TitularRepository>();
builder.Services.AddScoped<IObraRepository, ObraRepository>();
builder.Services.AddScoped<ITitularidadeRepository, TitularidadeRepository>();
builder.Services.AddScoped<IFonogramaRepository, FonogramaRepository>();
builder.Services.AddScoped<IParticipacaoRepository, ParticipacaoRepository>();
builder.Services.AddScoped<IHistoricoBloqueioRepository, HistoricoBloqueioRepository>();
builder.Services.AddScoped<IAnexoRepository, AnexoRepository>();
builder.Services.AddScoped<ICredencialTitularRepository, CredencialTitularRepository>();
builder.Services.AddScoped<IOcorrenciaRepository, OcorrenciaRepository>();
builder.Services.AddScoped<ISolicitacaoAlteracaoRepository, SolicitacaoAlteracaoRepository>();

// ─── HttpClient + Polly ────────────────────────────────────────────────
var iswcBaseUrl = Environment.GetEnvironmentVariable("ISWC_BASE_URL") ?? "https://iswc.tasso.dev.br/";
builder.Services.AddHttpClient<IIswcService, Cadastro.Infra.ExternalServices.IswcService>(client =>
{
    client.BaseAddress = new Uri(iswcBaseUrl);
    client.Timeout = TimeSpan.FromSeconds(10);
}).AddTransientHttpErrorPolicy(p => p.RetryAsync(2));

// ─── Storage Service (proxy para upload/download com antivírus) ────────
var storageBaseUrl = Environment.GetEnvironmentVariable("STORAGE_SERVICE_URL") ?? "https://storage.tasso.dev.br/";
builder.Services.Configure<StorageOptions>(opts =>
{
    opts.BaseUrl       = storageBaseUrl;
    opts.LogToIssuer   = Environment.GetEnvironmentVariable("STORAGE_LOGTO_ISSUER") ?? "https://9lcinu.logto.app/oidc";
    opts.ClientId      = Environment.GetEnvironmentVariable("STORAGE_LOGTO_CLIENT_ID") ?? string.Empty;
    opts.ClientSecret  = Environment.GetEnvironmentVariable("STORAGE_LOGTO_CLIENT_SECRET") ?? string.Empty;
    opts.Resource      = storageBaseUrl.TrimEnd('/');
});
builder.Services.AddHttpClient<LogToM2MTokenService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});
builder.Services.AddSingleton<LogToM2MTokenService>();
builder.Services.AddHttpClient<Cadastro.Application.Storage.IStorageServiceClient, StorageServiceClient>(client =>
{
    client.BaseAddress = new Uri(storageBaseUrl);
    client.Timeout = TimeSpan.FromMinutes(5); // uploads grandes
}).AddTransientHttpErrorPolicy(p => p.RetryAsync(1));

// ─── Outbox / RabbitMQ / Events ───────────────────────────────────────
builder.Services.AddScoped<IOutboxEventWriter, OutboxEventWriter>();
builder.Services.AddSingleton<IRabbitMqPublisher>(sp =>
    new RabbitMqPublisher(
        sp.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>(),
        sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<RabbitMqPublisher>>()));
builder.Services.AddHostedService<OutboxPublisherWorker>();
builder.Services.AddHostedService<IdentityUserEventConsumer>();

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

// ─── Swagger (documentação REST) ──────────────────────────────────────
builder.Services.AddSwaggerDocs();

// ─── AsyncAPI (Saunter — documentação de eventos) ─────────────────────
builder.Services.AddAsyncApiDocs();

// ─── Health Checks ─────────────────────────────────────────────────────
builder.Services.AddHealthChecks();

// ─── CORS ──────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(corsAllowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()));

// ─── Exception Handler (GlobalExceptionHandler → ProblemDetails) ───────
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

var oidcAuthority = Environment.GetEnvironmentVariable("OIDC_AUTHORITY")
    ?? throw new InvalidOperationException("OIDC_AUTHORITY is required.");
var oidcAudience = Environment.GetEnvironmentVariable("OIDC_AUDIENCE") ?? "https://api.mcad.local";

// ─── Portal do Titular — JWT HMAC-SHA256 secret (fail-fast no startup) ──
var portalJwtSecret = Environment.GetEnvironmentVariable("PORTAL_JWT_SECRET")
    ?? throw new InvalidOperationException("PORTAL_JWT_SECRET é obrigatório (≥ 32 bytes).");

if (Encoding.UTF8.GetByteCount(portalJwtSecret) < 32)
{
    throw new InvalidOperationException(
        "PORTAL_JWT_SECRET deve ter no mínimo 32 bytes (HMAC-SHA256).");
}

// Scheme default = Keycloak/Logto ( JwtBearerDefaults.AuthenticationScheme ).
// Segundo scheme nomeado "Titular" valida tokens HMAC emitidos pelo próprio serviço.
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
            ValidateAudience = true,
            ValidAudiences = [oidcAudience]
        };
    })
    .AddJwtBearer("Titular", options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = "cadastro-api-portal",
            ValidateAudience = false,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(portalJwtSecret)),
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddTransient<IClaimsTransformation, LogtoClaimsTransformation>();

builder.Services.AddAuthorization(options =>
{
    // DefaultPolicy/FallbackPolicy preservados: endpoints internos continuam exigindo Keycloak.
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
    // Policy do Portal do Titular — aceita apenas tokens do scheme "Titular".
    options.AddPolicy("PortalTitular", p => p
        .RequireAuthenticatedUser()
        .AddAuthenticationSchemes("Titular")
        .Build());
});
builder.Services.AddEcadAuthz(builder.Configuration);

// ─── Portal do Titular — DI ────────────────────────────────────────────
// IHttpContextAccessor já registrado acima (linha AddHttpContextAccessor).
builder.Services.AddScoped<ICurrentTitular, HttpContextCurrentTitular>();
builder.Services.AddScoped<ITitularTokenService>(_ => new TitularTokenService(portalJwtSecret));

// ─── Logging estruturado ───────────────────────────────────────────────
builder.Logging.AddConsole();

// ─── OpenTelemetry (traces via OTLP) + Prometheus (métricas via /metrics) ──
builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r.AddService("cadastro-api"))
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOtlpExporter());

var app = builder.Build();

// ─── Middleware pipeline ───────────────────────────────────────────────
app.UseExceptionHandler();
app.UseHttpMetrics();
app.UseCors();

// Swagger e AsyncAPI antes do auth — middleware short-circuits antes da auth rodar
app.UseSwaggerDocs();

app.UseAuthentication();
app.UseAuthorization();

// ─── Aplicar migrations + confirmar seed no startup ───────────────────
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<CadastroDbContext>();
    context.Database.Migrate();
    var count = context.Associacoes.Count();
    app.Logger.LogInformation("Startup: {Count} associações no banco de dados", count);
}

// ─── Endpoints ────────────────────────────────────────────────────────
app.MapAssociacaoEndpoints();
app.MapTitularEndpoints();
app.MapObraEndpoints();
app.MapTitularidadeEndpoints();
app.MapFonogramaEndpoints();
app.MapParticipacaoEndpoints();
app.MapBuscaEndpoints();
app.MapDistribuicaoEndpoints();
app.MapDashboardEndpoints();
app.MapAnexoEndpoints();

// ─── AsyncAPI (documentação de eventos — pública) ─────────────────────
app.MapAsyncApiDocs();

// ─── Health Check + Métricas ──────────────────────────────────────────
app.MapHealthChecks("/health").AllowAnonymous();
app.MapMetrics("/metrics").AllowAnonymous();

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

internal static class AuditConfigurationHelpers
{
    public static string ResolveRabbitMqUri(IConfiguration configuration)
    {
        var auditRabbitMqUri = configuration["AUDIT_RABBITMQ_URI"];
        if (!string.IsNullOrWhiteSpace(auditRabbitMqUri))
        {
            return auditRabbitMqUri;
        }

        var rabbitUrl = configuration["RABBITMQ_URL"];
        if (!string.IsNullOrWhiteSpace(rabbitUrl))
        {
            return rabbitUrl;
        }

        var host = configuration["RABBITMQ_HOST"];
        if (string.IsNullOrWhiteSpace(host))
        {
            return "amqp://guest:guest@localhost:5672";
        }

        var port = configuration["RABBITMQ_PORT"];
        var user = configuration["RABBITMQ_USER"];
        var password = configuration["RABBITMQ_PASSWORD"];
        var vhost = configuration["RABBITMQ_VHOST"];
        var scheme = string.Equals(port, "5671", StringComparison.Ordinal) ? "amqps" : "amqp";

        var builder = new System.Text.StringBuilder();
        builder.Append(scheme).Append("://");

        if (!string.IsNullOrWhiteSpace(user))
        {
            builder.Append(Uri.EscapeDataString(user));
            if (!string.IsNullOrWhiteSpace(password))
            {
                builder.Append(':').Append(Uri.EscapeDataString(password));
            }

            builder.Append('@');
        }

        builder.Append(host);

        if (!string.IsNullOrWhiteSpace(port))
        {
            builder.Append(':').Append(port);
        }

        if (!string.IsNullOrWhiteSpace(vhost))
        {
            builder.Append('/').Append(Uri.EscapeDataString(vhost));
        }

        return builder.ToString();
    }
}
