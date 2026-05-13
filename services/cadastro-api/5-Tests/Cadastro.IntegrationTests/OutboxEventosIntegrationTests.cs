using System.Net;
using System.Net.Http.Json;
using Cadastro.Application.Audit;
using Cadastro.Application.Obras.Commands;
using Cadastro.Application.Obras.Responses;
using Cadastro.Application.Titulares.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;
using Cadastro.Infra.Data;
using Cadastro.Infra.Events;
using Cadastro.IntegrationTests.Fixtures;
using CloudNative.CloudEvents;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Cadastro.IntegrationTests;

/// <summary>
/// Testes de integração para os Eventos de Cadastro (F08 — Outbox Pattern).
/// 
/// RF-17: Evento é escrito na mesma transação da entidade.
/// RF-19: API responde corretamente mesmo com RabbitMQ mockado.
/// </summary>
public class OutboxEventosIntegrationTests : IClassFixture<CadastroApiFactory>
{
    private readonly HttpClient _client;
    private readonly CadastroApiFactory _factory;
    private readonly Mock<IIswcService> _mockIswcService;

    public OutboxEventosIntegrationTests(CadastroApiFactory factory)
    {
        _factory = factory;
        _mockIswcService = new Mock<IIswcService>();

        // Sobrescreve apenas o IIswcService, mantendo o mesmo container da factory
        _client = factory.CreateAuthenticatedClient(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                var desc = services.SingleOrDefault(d => d.ServiceType == typeof(IIswcService));
                if (desc != null) services.Remove(desc);
                services.AddScoped<IIswcService>(_ => _mockIswcService.Object);
            });
        });
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private static string GerarCpfValido()
    {
        var rng = new Random();
        var num = new int[9];
        for (int i = 0; i < 9; i++) num[i] = rng.Next(0, 9);
        var sum1 = 0;
        for (int i = 0; i < 9; i++) sum1 += num[i] * (10 - i);
        var r1 = sum1 % 11 < 2 ? 0 : 11 - (sum1 % 11);
        var sum2 = 0;
        for (int i = 0; i < 9; i++) sum2 += num[i] * (11 - i);
        sum2 += r1 * 2;
        var r2 = sum2 % 11 < 2 ? 0 : 11 - (sum2 % 11);
        return $"{string.Join("", num)}{r1}{r2}";
    }

    private async Task<ObraResponse> CriarELiberarObraAsync()
    {
        // 1. Criar obra
        var postRes = await _client.PostAsJsonAsync("/api/v1/obras",
            new CriarObraCommand("Obra Evento Outbox", null, "MUSICAL", "Rock"));
        postRes.EnsureSuccessStatusCode();
        var obra = await postRes.Content.ReadFromJsonAsync<ObraResponse>();

        // 2. Obter associação
        var assocJson = await _client.GetStringAsync("/api/v1/associacoes");
        var assocArr = System.Text.Json.JsonDocument.Parse(assocJson).RootElement;
        var assocId = Guid.Parse(assocArr[0].GetProperty("id").GetString()!);

        // 3. Criar titular + titularidade
        var cpf = GerarCpfValido();
        var resTitular = await _client.PostAsJsonAsync("/api/v1/titulares",
            new Cadastro.Application.Titulares.Commands.CriarTitularCommand(
                $"Titular {cpf}", "PF", cpf, "BR", assocId, null));
        resTitular.EnsureSuccessStatusCode();
        var titular = await resTitular.Content.ReadFromJsonAsync<TitularResponse>();

        await _client.PostAsJsonAsync($"/api/v1/obras/{obra!.Id}/titularidades",
            new Cadastro.API.Endpoints.AdicionarTitularidadeRequest(titular!.Id, "AUTOR", 100.0m));

        // 4. Obter ISWC → libera obra
        _mockIswcService
            .Setup(s => s.ObterIswcAsync(
                It.IsAny<string>(), It.IsAny<IEnumerable<string>>(),
                It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync($"T-{Guid.NewGuid().ToString()[..8]}");

        var iswcRes = await _client.PostAsync($"/api/v1/obras/{obra.Id}/iswc", null);
        iswcRes.EnsureSuccessStatusCode();

        return (await iswcRes.Content.ReadFromJsonAsync<ObraResponse>())!;
    }

    // Cria um DbContext independente apontando para o mesmo container PostgreSQL
    private List<Cadastro.Domain.Entities.OutboxEvent> GetOutboxEvents(string subject, string type)
    {
        var options = new Microsoft.EntityFrameworkCore.DbContextOptionsBuilder<CadastroDbContext>()
            .UseNpgsql(_factory.ConnectionString)
            .Options;
        using var context = new CadastroDbContext(options);
        return context.OutboxEvents
            .Where(e => e.Subject == subject && e.Type == type)
            .OrderByDescending(e => e.CreatedAt)
            .ToList();
    }

    // ── RF-17: Atomicidade — evento na mesma transação ─────────────────────────

    [Fact]
    public async Task RF17_LiberarObra_DeveGerarOutboxEventNaMesmaTransacao()
    {
        var obra = await CriarELiberarObraAsync();
        Assert.Equal("LIBERADO", obra.Status);

        var eventos = GetOutboxEvents(obra.Id.ToString(), "cadastro.obra.liberada");

        Assert.NotEmpty(eventos);
        var outboxEvent = eventos.First();
        Assert.Null(outboxEvent.PublishedAt); // Pending (worker não rodou)
        Assert.Contains(obra.Id.ToString(), outboxEvent.Payload);
    }

    [Fact]
    public async Task RF17_CriarTitular_DeveGerarOutboxEvent()
    {
        var assocJson = await _client.GetStringAsync("/api/v1/associacoes");
        var assocArr = System.Text.Json.JsonDocument.Parse(assocJson).RootElement;
        var assocId = Guid.Parse(assocArr[0].GetProperty("id").GetString()!);

        var cpf = GerarCpfValido();
        var resTitular = await _client.PostAsJsonAsync("/api/v1/titulares",
            new Cadastro.Application.Titulares.Commands.CriarTitularCommand(
                $"Titular Outbox {cpf}", "PF", cpf, "BR", assocId, null));
        resTitular.EnsureSuccessStatusCode();
        var titular = await resTitular.Content.ReadFromJsonAsync<TitularResponse>();

        var eventos = GetOutboxEvents(titular!.Id.ToString(), "cadastro.titular.criado");
        Assert.NotEmpty(eventos);
        Assert.Contains("titularId", eventos.First().Payload);
    }

    [Fact]
    public async Task RF17_DominioPublico_DeveGerarOutboxEvent()
    {
        var postRes = await _client.PostAsJsonAsync("/api/v1/obras",
            new CriarObraCommand("Obra DP Outbox Test", null, "MUSICAL", null));
        postRes.EnsureSuccessStatusCode();
        var obra = await postRes.Content.ReadFromJsonAsync<ObraResponse>();

        var response = await _client.PutAsJsonAsync(
            $"/api/v1/obras/{obra!.Id}/dominio-publico",
            new Cadastro.API.Endpoints.AlterarDominioPublicoRequest(true));
        response.EnsureSuccessStatusCode();

        var eventos = GetOutboxEvents(obra.Id.ToString(), "cadastro.obra.dominio-publico");
        Assert.NotEmpty(eventos);
        Assert.Contains("dominioPublico", eventos.First().Payload);
    }

    // ── RF-17 (rollback path): falha antes de SaveChanges não persiste nada ───

    /// <summary>
    /// RF-17 — atomicidade no caminho de falha.
    ///
    /// O handler ObterIswcCommandHandler executa na ordem:
    ///   1. IIswcService.ObterIswcAsync  — retorna ISWC com sucesso
    ///   2. obra.AtribuirIswc(iswc)      — muta o agregado em memória
    ///   3. _repository.Update(obra)
    ///   4. _outbox.AddEvent(...)        — enfileira OutboxEvent no DbContext (não salvo)
    ///   5. _auditPublisher.PublishAsync — ← lança aqui (mock configurado para throw)
    ///   6. SaveChangesAsync             — NUNCA executado
    ///
    /// Portanto, nem o agregado (status PENDENTE → LIBERADO) nem o OutboxEvent
    /// devem existir no banco após a falha.
    /// </summary>
    [Fact]
    [Trait("Category", "Integration")]
    public async Task RF17_QuandoHandlerFalhaAposEscreverOutbox_NadaDeveSerPersistido()
    {
        // ── Arrange: criar obra + titular usando cliente sem falha injetada ──
        // Precisamos de uma obra em status PENDENTE com pelo menos um titular,
        // mas sem chamar /iswc ainda. Reusamos partes do helper sem a etapa final.

        var assocJson = await _client.GetStringAsync("/api/v1/associacoes");
        var assocArr = System.Text.Json.JsonDocument.Parse(assocJson).RootElement;
        var assocId = Guid.Parse(assocArr[0].GetProperty("id").GetString()!);

        // 1. Criar obra
        var postRes = await _client.PostAsJsonAsync("/api/v1/obras",
            new CriarObraCommand("Obra RF17 Rollback", null, "MUSICAL", "Rock"));
        postRes.EnsureSuccessStatusCode();
        var obra = await postRes.Content.ReadFromJsonAsync<ObraResponse>();

        // 2. Criar titular e titularidade
        var cpf = GerarCpfValido();
        var resTitular = await _client.PostAsJsonAsync("/api/v1/titulares",
            new Cadastro.Application.Titulares.Commands.CriarTitularCommand(
                $"Titular RF17 {cpf}", "PF", cpf, "BR", assocId, null));
        resTitular.EnsureSuccessStatusCode();
        var titular = await resTitular.Content.ReadFromJsonAsync<TitularResponse>();

        await _client.PostAsJsonAsync($"/api/v1/obras/{obra!.Id}/titularidades",
            new Cadastro.API.Endpoints.AdicionarTitularidadeRequest(titular!.Id, "AUTOR", 100.0m));

        // ── Mock: IIswcService retorna ISWC válido; IObraAuditPublisher lança ──
        var mockIswcFailing = new Mock<IIswcService>();
        mockIswcFailing
            .Setup(s => s.ObterIswcAsync(
                It.IsAny<string>(), It.IsAny<IEnumerable<string>>(),
                It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync($"T-{Guid.NewGuid().ToString()[..8]}");

        var mockAuditFailing = new Mock<IObraAuditPublisher>();
        mockAuditFailing
            .Setup(a => a.Snapshot(It.IsAny<ObraMusical>()))
            .Returns(new Dictionary<string, object?>());
        mockAuditFailing
            .Setup(a => a.PublishAsync(
                It.IsAny<ObraMusical>(),
                It.IsAny<ObraAuditOperation>(),
                It.IsAny<IReadOnlyDictionary<string, object?>>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Falha simulada de auditoria para testar rollback RF-17"));

        // Cliente com os dois mocks sobrepostos
        var failingClient = _factory.CreateAuthenticatedClient(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                var iswcDesc = services.SingleOrDefault(d => d.ServiceType == typeof(IIswcService));
                if (iswcDesc != null) services.Remove(iswcDesc);
                services.AddScoped<IIswcService>(_ => mockIswcFailing.Object);

                var auditDesc = services.SingleOrDefault(d => d.ServiceType == typeof(IObraAuditPublisher));
                if (auditDesc != null) services.Remove(auditDesc);
                services.AddScoped<IObraAuditPublisher>(_ => mockAuditFailing.Object);
            });
        });

        // ── Act: chamar o endpoint /iswc que deve falhar ──
        var iswcRes = await failingClient.PostAsync($"/api/v1/obras/{obra.Id}/iswc", null);

        // ── Assert: a API deve retornar erro 5xx ──
        Assert.True(
            (int)iswcRes.StatusCode >= 500,
            $"Esperado 5xx mas foi {(int)iswcRes.StatusCode}");

        // ── Assert: nenhum OutboxEvent para esta obra deve existir ──
        var outboxEventos = GetOutboxEvents(obra.Id.ToString(), "cadastro.obra.liberada");
        Assert.Empty(outboxEventos);

        // ── Assert: o agregado não deve ter sido mutado no banco ──
        var optionsBuilder = new Microsoft.EntityFrameworkCore.DbContextOptionsBuilder<CadastroDbContext>()
            .UseNpgsql(_factory.ConnectionString)
            .Options;
        using var ctx = new CadastroDbContext(optionsBuilder);
        var obraNoDb = await ctx.ObrasMusicais.FindAsync(obra.Id);
        Assert.NotNull(obraNoDb);
        Assert.Equal("PENDENTE", obraNoDb.Status.ToString().ToUpperInvariant());
        Assert.Null(obraNoDb.Iswc);
    }

    // ── RF-19: API responde OK independente do RabbitMQ ────────────────────────

    [Fact]
    public async Task RF19_LiberarObra_RetornaSuccessEEventoPersistido()
    {
        // Mock do publisher configurado na factory — não conecta ao RabbitMQ real
        var obra = await CriarELiberarObraAsync();
        Assert.Equal("LIBERADO", obra.Status);

        var eventos = GetOutboxEvents(obra.Id.ToString(), "cadastro.obra.liberada");
        Assert.True(eventos.Count > 0, "Evento deveria estar na outbox");

        // Publisher NÃO deve ter sido chamado (somente o Worker chama, não a API request)
        _factory.RabbitMqPublisherMock.Verify(
            p => p.PublishAsync(It.IsAny<string>(), It.IsAny<CloudEvent>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
