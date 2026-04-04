using DotNetEnv;
using FluentValidation;
using Identificacao.API.Endpoints;
using Identificacao.API.Infrastructure;
using Identificacao.Application.Common;
using Identificacao.Application.Captacoes.Commands;
using Identificacao.Application.Rubricas.Queries;
using Identificacao.Application.Uploads.Services;
using Identificacao.Domain.Interfaces;
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
Env.Load(Path.GetFullPath(envPath));

var builder = WebApplication.CreateBuilder(args);

// ConfigURAÇÕES DE DB
var dbHost = Environment.GetEnvironmentVariable("IDENTIFICACAO_DB_HOST") ?? "localhost";
var dbPort = Environment.GetEnvironmentVariable("IDENTIFICACAO_DB_PORT") ?? "5432";
var dbName = Environment.GetEnvironmentVariable("IDENTIFICACAO_DB_NAME") ?? "postgres";
var dbUser = Environment.GetEnvironmentVariable("IDENTIFICACAO_DB_USER") ?? "postgres";
var dbPassword = Environment.GetEnvironmentVariable("IDENTIFICACAO_DB_PASSWORD") ?? "postgres";
var schema = Environment.GetEnvironmentVariable("IDENTIFICACAO_DB_SCHEMA") ?? "identificacao";

var connectionString = $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPassword};Search Path={schema}";

builder.Services.AddDbContext<IdentificacaoDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql =>
        npgsql.MigrationsHistoryTable("__EFMigrationsHistory", schema)));

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
    var audience = Environment.GetEnvironmentVariable("OIDC_AUDIENCE") ?? "mcad-frontend";

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
                ValidateAudience = false,
                ValidateLifetime = true,
                NameClaimType = "preferred_username"
            };
            options.Events = new JwtBearerEvents
            {
                OnTokenValidated = context =>
                {
                    var azp = context.Principal?.FindFirst("azp")?.Value;
                    if (!string.Equals(azp, audience, StringComparison.Ordinal))
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
        options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
        options.AddPolicy("read", p => p.RequireRole("analista-identificacao", "consultor-identificacao"));
        options.AddPolicy("write", p => p.RequireRole("analista-identificacao"));
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
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));

// Health Checks
builder.Services.AddHealthChecks();

// Application Port
builder.WebHost.UseUrls("http://0.0.0.0:5100");

var app = builder.Build();

// Enable CORS
app.UseCors();

// Exception Handling
app.UseExceptionHandler();

// Autenticação / Autorização
if (authEnabled)
{
    app.UseAuthentication();
}
app.UseAuthorization();

// Map Endpoints
app.MapHealthChecks("/health");
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
