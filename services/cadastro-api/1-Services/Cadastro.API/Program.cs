using Cadastro.API.Endpoints;
using Cadastro.API.Infrastructure;
using Cadastro.Application.Associacoes.Queries;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Titulares.Commands;
using Cadastro.Domain.Interfaces;
using Cadastro.Infra.Data;
using Cadastro.Infra.Repositories;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Polly;

DotEnvLoader.LoadIfPresent();

var builder = WebApplication.CreateBuilder(args);

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

// ─── HttpClient + Polly ────────────────────────────────────────────────
builder.Services.AddHttpClient<IIswcService, Cadastro.Infra.ExternalServices.IswcService>(client =>
{
    client.BaseAddress = new Uri("https://iswc.tasso.dev.br/");
    client.Timeout = TimeSpan.FromSeconds(10);
}).AddTransientHttpErrorPolicy(p => p.RetryAsync(2));

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

// ─── Logging estruturado ───────────────────────────────────────────────
builder.Logging.AddConsole();

var app = builder.Build();

// ─── Middleware pipeline ───────────────────────────────────────────────
app.UseExceptionHandler();
app.UseCors();

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

// ─── Health Check ─────────────────────────────────────────────────────
app.MapHealthChecks("/health");

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
