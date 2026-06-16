using System.Net;
using System.Net.Http.Json;
using AwesomeAssertions;
using Identificacao.Application.Captacoes.Commands;
using Identificacao.Application.Captacoes.Responses;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Identidade;
using Identificacao.Infra.Data;
using Identificacao.IntegrationTests.Fixtures;
using Microsoft.EntityFrameworkCore;

namespace Identificacao.IntegrationTests;

public class ResponsavelAmigavelIntegrationTests : IClassFixture<IdentificacaoApiFactory>
{
    private readonly IdentificacaoApiFactory _factory;

    private const string LogtoUserId1 = "d4e5f6a7-b8c9-4d0e-a1b2-c3d4e5f6a7b8";
    private const string LogtoUserId2 = "user-abc123";
    private const string LogtoUserId3 = "e5f6a7b8-c9d0-4e1f-b2c3-d4e5f6a7b8c9";
    private const string LogtoUserId4 = "f6a7b8c9-d0e1-4f2b-c3d4-e5f6a7b8c9d0";
    private const string RubricaRADIO = "b1a2c3d4-0001-0000-0000-000000000001";

    private Guid AnalistaId1 => AnalistaIdentificador.FromSubject(LogtoUserId1);
    private Guid AnalistaId2 => AnalistaIdentificador.FromSubject(LogtoUserId2);

    public ResponsavelAmigavelIntegrationTests(IdentificacaoApiFactory factory)
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
        ctx.ErrosUpload.RemoveRange(ctx.ErrosUpload);
        ctx.Uploads.RemoveRange(ctx.Uploads);
        ctx.Execucoes.RemoveRange(ctx.Execucoes);
        ctx.Captacoes.RemoveRange(ctx.Captacoes);
        await ctx.SaveChangesAsync();
        await ctx.Database.ExecuteSqlRawAsync("DELETE FROM identificacao.usuarios_identidade");
    }

    private async Task SeedUsuarios()
    {
        await using var ctx = CreateDbContext();
        await ctx.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO identificacao.usuarios_identidade (logto_user_id, username, display_name, email, roles, is_suspended, deleted_at_utc, raw_payload, last_event_id, last_event_type, last_event_occurred_at_utc)
VALUES ({LogtoUserId1}, 'ana.silva', 'Ana Silva', 'ana@mcad.local', jsonb_build_array('identificacao.analista'), FALSE, NULL, jsonb_build_object(), 'evt-001', 'identity.user.created', NOW()),
({LogtoUserId2}, 'bruno.costa', 'Bruno Costa', 'bruno@mcad.local', jsonb_build_array('identificacao.analista'), FALSE, NULL, jsonb_build_object(), 'evt-002', 'identity.user.created', NOW()),
({LogtoUserId3}, 'carlos.suspenso', 'Carlos Suspenso', 'carlos@mcad.local', jsonb_build_array('identificacao.analista'), TRUE, NULL, jsonb_build_object(), 'evt-003', 'identity.user.created', NOW()),
({LogtoUserId4}, 'daniel.excluido', 'Daniel Excluido', 'daniel@mcad.local', jsonb_build_array('identificacao.analista'), FALSE, NOW(), jsonb_build_object(), 'evt-004', 'identity.user.created', NOW())
");
    }

    // ── 7.3: GET /api/v1/analistas ────────────────────────────────────────

    [Fact]
    public async Task GetAnalistas_ReturnsActiveOrderedByName_WithCorrectIds()
    {
        await ResetAsync();
        await SeedUsuarios();

        var client = _factory.CreateAuthenticatedClient(roles: ["identificacao.analista"]);

        var response = await client.GetAsync("/api/v1/analistas");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var analistas = await response.Content.ReadFromJsonAsync<List<AnalistaResumoResponse>>();
        analistas.Should().NotBeNull();
        analistas.Should().HaveCount(2, "apenas ativos (exclui suspenso e excluído)");

        analistas.Should().BeInAscendingOrder(a => a!.Nome, StringComparer.OrdinalIgnoreCase);
        analistas![0].Nome.Should().Be("Ana Silva");
        analistas[1].Nome.Should().Be("Bruno Costa");

        analistas[0].Id.Should().Be(AnalistaId1, "Id deve ser FromSubject do logto_user_id (Guid path)");
        analistas[1].Id.Should().Be(AnalistaId2, "Id deve ser FromSubject do logto_user_id (MD5 path)");
    }

    // ── 7.4: E2E filter (F1 + F2) ─────────────────────────────────────────

    [Fact]
    public async Task CriarCaptacaoE2E_ComUsuarioNaProjecao_NomeResolvidoViaProjecao_FiltravelPeloIdDaCombo()
    {
        await ResetAsync();
        await SeedUsuarios();

        var client = _factory.CreateClientWithSub(LogtoUserId1, "Claim Name Should Not Be Used");
        var rubricaId = Guid.Parse(RubricaRADIO);

        var payload = new
        {
            rubricaId = rubricaId,
            periodo = DateOnly.FromDateTime(DateTime.UtcNow),
            usuarioMusicaId = Guid.NewGuid(),
            usuarioMusicaNome = "Rádio Teste E2E"
        };

        var createResponse = await client.PostAsJsonAsync("/api/v1/captacoes", payload);
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var captacao = await createResponse.Content.ReadFromJsonAsync<CaptacaoResponse>();
        captacao.Should().NotBeNull();
        captacao!.AnalistaResponsavel.Nome.Should().Be("Ana Silva",
            "nome deve vir da projeção, não do claim");
        captacao.AnalistaResponsavel.Id.Should().Be(AnalistaId1);

        var filterClient = _factory.CreateAuthenticatedClient(roles: ["identificacao.analista"]);
        var filterResponse = await filterClient.GetAsync(
            $"/api/v1/captacoes?analistaResponsavelId={AnalistaId1}&page=1&size=10");
        filterResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var listResponse = await filterResponse.Content.ReadFromJsonAsync<CaptacaoListResponse>();
        listResponse.Should().NotBeNull();
        listResponse!.Data.Should().HaveCount(1);
        listResponse.Data.First().Id.Should().Be(captacao.Id,
            "filtrar por AnalistaResponsavelId da combo deve retornar a captação criada");

        var allResponse = await filterClient.GetAsync("/api/v1/captacoes?page=1&size=10");
        allResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var allList = await allResponse.Content.ReadFromJsonAsync<CaptacaoListResponse>();
        allList!.Data.Should().ContainSingle(
            c => c.Id == captacao.Id, "sem filtro, captação deve aparecer");
    }

    // ── 7.5: Backfill (F3) ─────────────────────────────────────────────────

    [Fact]
    public async Task Backfill_CorrigeDesconhecidoCasaveis_IncluiSuspensos_EhIdempotente()
    {
        await ResetAsync();
        await SeedUsuarios();

        var rubricaId = Guid.Parse(RubricaRADIO);
        var periodoBase = DateOnly.FromDateTime(DateTime.UtcNow);

        var idNaoExistente = Guid.NewGuid();

        await using (var ctx = CreateDbContext())
        {
            var c1 = Captacao.Criar(rubricaId, periodoBase, Guid.NewGuid(), "Música A", AnalistaId1, "Desconhecido");
            var c2 = Captacao.Criar(rubricaId, periodoBase.AddDays(-1), Guid.NewGuid(), "Música B",
                AnalistaIdentificador.FromSubject(LogtoUserId3), "Desconhecido");
            var c3 = Captacao.Criar(rubricaId, periodoBase.AddDays(-2), Guid.NewGuid(), "Música C", idNaoExistente, "Desconhecido");

            ctx.Captacoes.AddRange(c1, c2, c3);
            await ctx.SaveChangesAsync();
        }

        var client = _factory.CreateAuthenticatedClient(roles: ["identificacao.analista"]);

        var response1 = await client.PostAsync("/api/v1/captacoes/manutencao/reprocessar-responsaveis", null);
        response1.StatusCode.Should().Be(HttpStatusCode.OK);

        var result1 = await response1.Content.ReadFromJsonAsync<ReprocessarResponsaveisResult>();
        result1.Should().NotBeNull();
        result1!.TotalAnalisadas.Should().Be(3);
        result1.TotalCorrigidas.Should().Be(2,
            "ativo + suspenso = 2; não-casável permanece Desconhecido");

        await using (var ctx = CreateDbContext())
        {
            var captacoes = await ctx.Captacoes.ToListAsync();
            captacoes.Single(c => c.AnalistaResponsavelId == AnalistaId1)
                .AnalistaResponsavelNome.Should().Be("Ana Silva");
            captacoes.Single(c => c.AnalistaResponsavelId == AnalistaIdentificador.FromSubject(LogtoUserId3))
                .AnalistaResponsavelNome.Should().Be("Carlos Suspenso",
                    "suspenso também deve ser resolvido");
            captacoes.Single(c => c.AnalistaResponsavelId == idNaoExistente)
                .AnalistaResponsavelNome.Should().Be("Desconhecido",
                    "sem correspondência, permanece Desconhecido");
        }

        var response2 = await client.PostAsync("/api/v1/captacoes/manutencao/reprocessar-responsaveis", null);
        response2.StatusCode.Should().Be(HttpStatusCode.OK);
        var result2 = await response2.Content.ReadFromJsonAsync<ReprocessarResponsaveisResult>();
        result2!.TotalAnalisadas.Should().Be(1,
            "apenas a não-casável continua Desconhecido");
        result2.TotalCorrigidas.Should().Be(0,
            "segunda execução é idempotente");
    }

    // ── 7.6: Auth 403 backfill ─────────────────────────────────────────────

    [Fact]
    public async Task Backfill_SemAdmin_Returns403()
    {
        await ResetAsync();
        var client = _factory.CreateClientWithDeniedAuthz("identificacao.analista");

        var response = await client.PostAsync("/api/v1/captacoes/manutencao/reprocessar-responsaveis", null);
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
            "endpoint de manutenção deve exigir permissão admin");
    }

    // ── 7.7 (Opcional): F2 fallback ────────────────────────────────────────

    [Fact]
    public async Task CriarCaptacao_SemProjecao_ComClaim_UsaClaim()
    {
        await ResetAsync();
        await SeedUsuarios();

        var subjectNaoExistente = "user-sem-projecao";
        var client = _factory.CreateClientWithSub(subjectNaoExistente, "NomeDoClaim");

        var rubricaId = Guid.Parse(RubricaRADIO);
        var payload = new
        {
            rubricaId = rubricaId,
            periodo = DateOnly.FromDateTime(DateTime.UtcNow),
            usuarioMusicaId = Guid.NewGuid(),
            usuarioMusicaNome = "Rádio Claim Fallback"
        };

        var response = await client.PostAsJsonAsync("/api/v1/captacoes", payload);
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var captacao = await response.Content.ReadFromJsonAsync<CaptacaoResponse>();
        captacao!.AnalistaResponsavel.Nome.Should().Be("NomeDoClaim",
            "sem projeção, usa nome do claim (name)");
    }

    [Fact]
    public async Task CriarCaptacao_SemProjecao_SemClaim_UsaDesconhecido()
    {
        await ResetAsync();
        await SeedUsuarios();

        var subjectNaoExistente = "user-sem-projecao-nem-claim";
        var client = _factory.CreateClientWithSub(subjectNaoExistente);

        var rubricaId = Guid.Parse(RubricaRADIO);
        var payload = new
        {
            rubricaId = rubricaId,
            periodo = DateOnly.FromDateTime(DateTime.UtcNow),
            usuarioMusicaId = Guid.NewGuid(),
            usuarioMusicaNome = "Rádio Desconhecido"
        };

        var response = await client.PostAsJsonAsync("/api/v1/captacoes", payload);
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var captacao = await response.Content.ReadFromJsonAsync<CaptacaoResponse>();
        captacao!.AnalistaResponsavel.Nome.Should().Be("Desconhecido",
            "sem projeção e sem claim, último recurso");
    }
}
