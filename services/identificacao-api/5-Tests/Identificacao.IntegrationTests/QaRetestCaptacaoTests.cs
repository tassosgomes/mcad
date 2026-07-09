using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AwesomeAssertions;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Identificacao.Domain.Identidade;
using Identificacao.Infra.Data;
using Identificacao.IntegrationTests.Fixtures;
using Microsoft.EntityFrameworkCore;

namespace Identificacao.IntegrationTests;

/// <summary>
/// Re-test dos casos bloqueados ("NÃO TESTÁVEL") dos QA Reports Task 04 e 05.
///
/// Cobre:
///   • CT-03 (T04): PUT em captação FECHADA → 422
///   • CT-04c (T04): Mudar rubrica COM execuções → 409 RUBRICA_BLOQUEADA
///   • CT-06 (T04): PUT por não-dono → 403 FORBIDDEN (regressão do code drift 422→403)
///   • CT-02 (T05): DELETE em captação FECHADA → 422
///   • CT-06 (T05): DELETE por não-dono → 403 FORBIDDEN (regressão do code drift 422→403)
/// </summary>
public class QaRetestCaptacaoTests : IClassFixture<IdentificacaoApiFactory>
{
    private readonly IdentificacaoApiFactory _factory;

    private const string SubOwner = "11111111-1111-1111-1111-111111111111";
    private const string SubNaoDono = "22222222-2222-2222-2222-222222222222";
    private const string RubricaRadio = "b1a2c3d4-0001-0000-0000-000000000001";
    private const string RubricaStreaming = "b1a2c3d4-0001-0000-0000-000000000006";

    private Guid OwnerId => AnalistaIdentificador.FromSubject(SubOwner);

    public QaRetestCaptacaoTests(IdentificacaoApiFactory factory)
    {
        _factory = factory;
    }

    private IdentificacaoDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<IdentificacaoDbContext>()
            .UseNpgsql(_factory.ConnectionString)
            .ConfigureWarnings(w => w.Ignore(
                Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning))
            .Options;
        return new IdentificacaoDbContext(options);
    }

    private async Task ResetAsync()
    {
        await using var ctx = CreateDbContext();
        ctx.Execucoes.RemoveRange(ctx.Execucoes);
        ctx.Captacoes.RemoveRange(ctx.Captacoes);
        await ctx.SaveChangesAsync();
    }

    /// <summary>Cria captação ABERTA via DbContext (seed direto no banco).</summary>
    private async Task<Captacao> SeedCaptacaoAbertaAsync(DateOnly periodo, Guid? rubricaId = null)
    {
        await using var ctx = CreateDbContext();
        var captacao = Captacao.Criar(
            rubricaId ?? Guid.Parse(RubricaRadio),
            periodo,
            Guid.NewGuid(),
            "Usuario Musica Test",
            OwnerId,
            "Owner Test");
        ctx.Captacoes.Add(captacao);
        await ctx.SaveChangesAsync();
        return captacao;
    }

    /// <summary>Cria captação FECHADA via DbContext (não-produzível via API sem fluxo completo).</summary>
    private async Task<Captacao> SeedCaptacaoFechadaAsync(DateOnly periodo)
    {
        await using var ctx = CreateDbContext();
        var captacao = Captacao.Criar(
            Guid.Parse(RubricaRadio),
            periodo,
            Guid.NewGuid(),
            "Usuario Musica Fechada",
            OwnerId,
            "Owner Test");
        captacao.Fechar();
        ctx.Captacoes.Add(captacao);
        await ctx.SaveChangesAsync();
        return captacao;
    }

    /// <summary>Adiciona execução a uma captação via DbContext (bypass Cadastro API).</summary>
    private async Task SeedExecucaoAsync(Guid captacaoId)
    {
        await using var ctx = CreateDbContext();
        var execucao = Execucao.Criar(
            captacaoId,
            Guid.NewGuid(),
            null,
            "Obra Fixture",
            null,
            null,
            "Interprete",
            new TimeOnly(10, 0),
            new TimeOnly(10, 3),
            1,
            null,
            null,
            StatusExecucao.Identificada);
        ctx.Execucoes.Add(execucao);
        await ctx.SaveChangesAsync();
    }

    private HttpClient ClientOwner => _factory.CreateClientWithSub(SubOwner, "Owner Test", "identificacao.analista");

    private HttpClient ClientNaoDono => _factory.CreateClientWithSub(SubNaoDono, "Nao Dono", "identificacao.analista");

    // ───────────────────────────────────────────────────────────────────────
    //  Task 04 — Editar Captação ABERTA
    // ───────────────────────────────────────────────────────────────────────

    /// <summary>
    /// CT-03 (T04): PUT em captação FECHADA → 422 STATUS_INVALIDO.
    /// Antes: NÃO TESTÁVEL (sem FECHADA). Agora: seed direto no banco.
    /// </summary>
    [Fact]
    public async Task CT03_T04_PutEmFechada_Retorna422()
    {
        await ResetAsync();
        var fechada = await SeedCaptacaoFechadaAsync(new DateOnly(2026, 7, 1));

        var payload = new
        {
            rubricaId = Guid.Parse(RubricaRadio),
            periodo = "2026-07-01",
            usuarioMusicaId = Guid.NewGuid(),
            usuarioMusicaNome = "Alterado"
        };

        var response = await ClientOwner.PutAsJsonAsync($"/api/v1/captacoes/{fechada.Id}", payload);

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var problem = await response.Content.ReadFromJsonAsync<JsonDocument>();
        problem!.RootElement.GetProperty("detail").GetString()
            .Should().Contain("ABERTA");
    }

    /// <summary>
    /// CT-04c (T04): Mudar rubrica COM execuções → 409 RUBRICA_BLOQUEADA.
    /// Antes: NÃO TESTÁVEL (sem execuções). Agora: seed de execução no banco.
    /// </summary>
    [Fact]
    public async Task CT04c_T04_MudarRubricaComExecucoes_Retorna409RubricaBloqueada()
    {
        await ResetAsync();
        var captacao = await SeedCaptacaoAbertaAsync(new DateOnly(2026, 7, 2), Guid.Parse(RubricaStreaming));
        await SeedExecucaoAsync(captacao.Id);

        var payload = new
        {
            rubricaId = Guid.Parse(RubricaRadio),
            periodo = "2026-07-02",
            usuarioMusicaId = Guid.NewGuid(),
            usuarioMusicaNome = "Manter"
        };

        var response = await ClientOwner.PutAsJsonAsync($"/api/v1/captacoes/{captacao.Id}", payload);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var problem = await response.Content.ReadFromJsonAsync<JsonDocument>();
        problem!.RootElement.GetProperty("code").GetString()
            .Should().Be("RUBRICA_BLOQUEADA");
    }

    /// <summary>
    /// CT-06 (T04): PUT por não-dono → 403 FORBIDDEN.
    /// Regressão: antes retornava 422 (code drift). Agora deve retornar 403.
    /// </summary>
    [Fact]
    public async Task CT06_T04_PutPorNaoDono_Retorna403()
    {
        await ResetAsync();
        var captacao = await SeedCaptacaoAbertaAsync(new DateOnly(2026, 7, 3));

        var payload = new
        {
            rubricaId = Guid.Parse(RubricaRadio),
            periodo = "2026-07-03",
            usuarioMusicaId = Guid.NewGuid(),
            usuarioMusicaNome = "Tentativa Nao Dono"
        };

        var response = await ClientNaoDono.PutAsJsonAsync($"/api/v1/captacoes/{captacao.Id}", payload);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var problem = await response.Content.ReadFromJsonAsync<JsonDocument>();
        problem!.RootElement.GetProperty("detail").GetString()
            .Should().Contain("analista responsável");
    }

    // ───────────────────────────────────────────────────────────────────────
    //  Task 05 — Excluir Captação ABERTA
    // ───────────────────────────────────────────────────────────────────────

    /// <summary>
    /// CT-02 (T05): DELETE em captação FECHADA → 422 STATUS_INVALIDO.
    /// Antes: NÃO TESTÁVEL (sem FECHADA). Agora: seed direto no banco.
    /// </summary>
    [Fact]
    public async Task CT02_T05_DeleteEmFechada_Retorna422()
    {
        await ResetAsync();
        var fechada = await SeedCaptacaoFechadaAsync(new DateOnly(2026, 7, 4));

        var response = await ClientOwner.DeleteAsync($"/api/v1/captacoes/{fechada.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var problem = await response.Content.ReadFromJsonAsync<JsonDocument>();
        problem!.RootElement.GetProperty("detail").GetString()
            .Should().Contain("ABERTA");
    }

    /// <summary>
    /// CT-06 (T05): DELETE por não-dono → 403 FORBIDDEN.
    /// Regressão: antes retornava 422 (code drift). Agora deve retornar 403.
    /// </summary>
    [Fact]
    public async Task CT06_T05_DeletePorNaoDono_Retorna403()
    {
        await ResetAsync();
        var captacao = await SeedCaptacaoAbertaAsync(new DateOnly(2026, 7, 5));

        var response = await ClientNaoDono.DeleteAsync($"/api/v1/captacoes/{captacao.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var problem = await response.Content.ReadFromJsonAsync<JsonDocument>();
        problem!.RootElement.GetProperty("detail").GetString()
            .Should().Contain("analista responsável");
    }
}
