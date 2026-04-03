using DotNetEnv;
using FluentValidation;
using Identificacao.API.Endpoints;
using Identificacao.API.Infrastructure;
using Identificacao.Application.Common;
using Identificacao.Application.Captacoes.Commands;
using Identificacao.Application.Rubricas.Queries;
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

Env.Load();

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

// HttpClient para Cadastro
var cadastroBaseUrl = Environment.GetEnvironmentVariable("CADASTRO_API_BASE_URL")
    ?? "http://localhost:5001/api/v1";
builder.Services.AddHttpClient<ICadastroHttpClient, CadastroHttpClient>(client =>
{
    client.BaseAddress = new Uri(cadastroBaseUrl);
    client.Timeout = TimeSpan.FromSeconds(10);
}).AddTransientHttpErrorPolicy(p => p.RetryAsync(2));

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
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                NameClaimType = "preferred_username"
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

// Executa Migrations no Startup
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<IdentificacaoDbContext>();
    context.Database.Migrate();
}

app.Run();
