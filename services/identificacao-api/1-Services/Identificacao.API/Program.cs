using DotNetEnv;
using Ecad.Audit.AspNetCore;
using Ecad.Audit.Sdk;
using FluentValidation;
using Identificacao.API.AsyncApi;
using Identificacao.API.Audit;
using Identificacao.API.Swagger;
using Identificacao.API.Endpoints;
using Identificacao.API.Infrastructure;
using Identificacao.Application.Audit;
using Identificacao.Application.Common;
using Identificacao.Application.Captacoes.Commands;
using Identificacao.Application.Rubricas.Queries;
using Identificacao.Application.Uploads.Services;
using Identificacao.Domain.Interfaces;
using Identificacao.Infra.Audit;
using Identificacao.Infra.Data;
using Identificacao.Infra.ExternalServices;
using Identificacao.Infra.Repositories;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Polly;
using Microsoft.IdentityModel.Tokens;
using Minio;
// Busca o .env na raiz do serviço (../../.. relativo ao dir do projeto)
var envPath = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", ".env");
var fullEnvPath = Path.GetFullPath(envPath);
if (File.Exists(fullEnvPath))
{
    Env.Load(fullEnvPath);
}

var builder = WebApplication.CreateBuilder(args);

// ConfigURAÇÕES DE DB
var dbHost = Environment.GetEnvironmentVariable("IDENTIFICACAO_DB_HOST") ?? "localhost";
var dbPort = Environment.GetEnvironmentVariable("IDENTIFICACAO_DB_PORT") ?? "5432";
var dbName = Environment.GetEnvironmentVariable("IDENTIFICACAO_DB_NAME") ?? "postgres";
var dbUser = Environment.GetEnvironmentVariable("IDENTIFICACAO_DB_USER") ?? "postgres";
var dbPassword = Environment.GetEnvironmentVariable("IDENTIFICACAO_DB_PASSWORD") ?? "postgres";
var schema = Environment.GetEnvironmentVariable("IDENTIFICACAO_DB_SCHEMA") ?? "identificacao";
var dbSslMode = Environment.GetEnvironmentVariable("IDENTIFICACAO_DB_SSL_MODE") ?? "Disable";

var connectionString = $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPassword};Search Path={schema};SSL Mode={dbSslMode};Trust Server Certificate=true";
var corsAllowedOrigins = (Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS") ?? "http://localhost:5173")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
const string corsPolicyName = "FrontendOrigins";

builder.Services.AddDbContext<IdentificacaoDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql =>
        npgsql.MigrationsHistoryTable("__EFMigrationsHistory", schema))
    .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

// ─── Auditoria transversal ───────────────────────────────────────────
builder.Services.AddEcadAudit(builder.Configuration, options =>
{
    options.ServiceName = string.IsNullOrWhiteSpace(options.ServiceName) ? "identificacao-api" : options.ServiceName;
    options.System = string.IsNullOrWhiteSpace(options.System) ? "mcad" : options.System;
    options.Environment = string.IsNullOrWhiteSpace(options.Environment)
        ? builder.Environment.EnvironmentName
        : options.Environment;
    options.RabbitMqUri = AuditConfigurationHelpers.ResolveRabbitMqUri(builder.Configuration);
});
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IAuditContextProvider, HttpAuditContextProvider>();
builder.Services.AddScoped<IIdentificacaoAuditPublisher, IdentificacaoAuditPublisher>();
builder.Services.AddScoped<IAuditOutboxRepository, PostgresAuditOutboxRepository>();
builder.Services.AddScoped<IAuditClient, EfAuditOutboxClient>();

// Repositories
builder.Services.AddScoped<ICaptacaoRepository, CaptacaoRepository>();
builder.Services.AddScoped<IRubricaRepository, RubricaRepository>();
builder.Services.AddScoped<IExecucaoRepository, ExecucaoRepository>();
builder.Services.AddScoped<ITipoUtilizacaoRepository, TipoUtilizacaoRepository>();
builder.Services.AddScoped<IUploadRepository, UploadRepository>();
builder.Services.AddScoped<IErroUploadRepository, ErroUploadRepository>();
builder.Services.AddScoped<CsvParser>();
builder.Services.AddHostedService<CsvProcessorWorker>();
builder.Services.AddHostedService<Identificacao.Application.Pendentes.Services.PendentesVerificadorWorker>();

// ─── Outbox / RabbitMQ / Events ───────────────────────────────────────
builder.Services.AddScoped<IOutboxEventWriter, Identificacao.Infra.Events.OutboxEventWriter>();
builder.Services.AddSingleton<Identificacao.Domain.Interfaces.IRabbitMqPublisher>(sp =>
    new Identificacao.Infra.Events.RabbitMqPublisher(
        sp.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>(),
        sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<Identificacao.Infra.Events.RabbitMqPublisher>>()));
builder.Services.AddHostedService<Identificacao.Infra.Events.OutboxPublisherWorker>();
builder.Services.AddHostedService<Identificacao.Infra.Events.DistribuicaoEventConsumer>();

// HttpClient para Cadastro
var cadastroBaseUrl = Environment.GetEnvironmentVariable("CADASTRO_API_BASE_URL")
    ?? "http://localhost:5001/api/v1";
builder.Services.AddHttpClient<ICadastroHttpClient, CadastroHttpClient>(client =>
{
    client.BaseAddress = new Uri(cadastroBaseUrl);
    client.Timeout = TimeSpan.FromSeconds(10);
}).AddTransientHttpErrorPolicy(p => p.RetryAsync(2));

// MinIO Configurações
var minioEndpoint = Environment.GetEnvironmentVariable("MINIO_ENDPOINT") ?? "localhost:9000";
var minioAccessKey = Environment.GetEnvironmentVariable("MINIO_ACCESS_KEY") ?? "mcadadmin";
var minioSecretKey = Environment.GetEnvironmentVariable("MINIO_SECRET_KEY") ?? "mcadadmin123";

builder.Services.AddSingleton<IMinioClient>(_ =>
    new MinioClient()
        .WithEndpoint(minioEndpoint)
        .WithCredentials(minioAccessKey, minioSecretKey)
        .Build());

builder.Services.AddScoped<IMinioService, MinioService>();

// CQRS - Dispatcher e Handlers via Scrutor
builder.Services.AddScoped<IDispatcher, Dispatcher>();

builder.Services.Scan(scan => scan
    .FromAssemblyOf<ListarRubricasQuery>()
    .AddClasses(c => c.AssignableTo(typeof(IQueryHandler<,>)))
    .AsImplementedInterfaces().WithScopedLifetime());

builder.Services.Scan(scan => scan
    .FromAssemblyOf<CriarCaptacaoCommand>()
    .AddClasses(c => c.AssignableTo(typeof(ICommandHandler<,>)))
    .AsImplementedInterfaces().WithScopedLifetime());

// Validators
builder.Services.AddValidatorsFromAssemblyContaining<CriarCaptacaoCommandValidator>();

// Autenticação e Autorização
var authEnabled = Environment.GetEnvironmentVariable("AUTH_ENABLED") == "true";

if (authEnabled)
{
    var authority = Environment.GetEnvironmentVariable("OIDC_AUTHORITY") ?? "http://localhost:8080/realms/mcad";
    var audience = Environment.GetEnvironmentVariable("OIDC_AUDIENCE") ?? "https://api.mcad.local";

    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.Authority = authority;
            options.Audience = audience;
            options.RequireHttpsMetadata = false;
            options.MapInboundClaims = false;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidIssuer = authority,
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidAudiences = [audience],
                ValidateLifetime = true,
                NameClaimType = "preferred_username"
            };
        });

    builder.Services.AddTransient<IClaimsTransformation, LogtoClaimsTransformation>();

    builder.Services.AddAuthorization(options =>
    {
        options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
        // Scopes de API resource (Logto): access → todos os papéis, write → somente analistas
        options.AddPolicy("read", p => p.RequireClaim("scope", "access"));
        options.AddPolicy("write", p => p.RequireClaim("scope", "write"));
    });
}
else
{
    builder.Services.AddAuthorization(options =>
    {
        options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAssertion(_ => true).Build();
        options.AddPolicy("read", p => p.RequireAssertion(_ => true));
        options.AddPolicy("write", p => p.RequireAssertion(_ => true));
    });
}

// Global Exception Handler
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

// Configura CORS
builder.Services.AddCors(options =>
    options.AddPolicy(corsPolicyName, policy =>
        policy.WithOrigins(corsAllowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()));

// ─── Swagger (documentação REST) ──────────────────────────────────────
builder.Services.AddSwaggerDocs();

// ─── AsyncAPI (Saunter — documentação de eventos) ─────────────────────
builder.Services.AddAsyncApiDocs();

// Health Checks
builder.Services.AddHealthChecks();

// Application Port
builder.WebHost.UseUrls("http://0.0.0.0:5100");

var app = builder.Build();

// Enable CORS
app.UseCors(corsPolicyName);

// Exception Handling
app.UseExceptionHandler();

// Swagger antes do auth — middleware short-circuits antes da auth rodar
app.UseSwaggerDocs();

// Autenticação / Autorização
if (authEnabled)
{
    app.UseAuthentication();
    app.UseAuthorization();
}
else
{
    app.UseAuthorization();
}

// ─── AsyncAPI (documentação de eventos — pública) ─────────────────────
app.MapAsyncApiDocs();

// Map Endpoints
app.MapHealthChecks("/health").AllowAnonymous();
app.MapFechamentoEndpoints();
app.MapCancelamentoEndpoints();
app.MapRubricaEndpoints();
app.MapCaptacaoEndpoints();
app.MapExecucaoEndpoints();
app.MapTipoUtilizacaoEndpoints();
app.MapUploadEndpoints();
app.MapPendenteEndpoints();

// Executa Migrations no Startup
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<IdentificacaoDbContext>();
    context.Database.Migrate();
}

app.Run();

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
