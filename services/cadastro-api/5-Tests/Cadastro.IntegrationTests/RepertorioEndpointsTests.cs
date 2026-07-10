using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using AwesomeAssertions;
using Cadastro.API.Authorization;
using Cadastro.Application.Repertorios;
using Cadastro.Application.Repertorios.Commands;
using Cadastro.Application.Repertorios.Queries;
using Cadastro.Application.Repertorios.Responses;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Cadastro.Infra.Data;
using Cadastro.IntegrationTests.Fixtures;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Cadastro.IntegrationTests;

public class RepertorioEndpointsTests : IClassFixture<CadastroApiFactory>
{
    private readonly HttpClient _client;
    private readonly CadastroApiFactory _factory;
    private readonly Mock<IIswcService> _mockIswcService;

    private static readonly string[] RequiredPermissions =
    [
        CadastroPermissions.AssociacaoListar,
        CadastroPermissions.RepertorioCriar,
        CadastroPermissions.TitularCriar,
        CadastroPermissions.TitularidadeAdicionar,
        CadastroPermissions.TitularidadeListar,
        CadastroPermissions.ObraVisualizar
    ];

    public RepertorioEndpointsTests(CadastroApiFactory factory)
    {
        _factory = factory;
        _mockIswcService = new Mock<IIswcService>();

        _client = factory.CreateAuthenticatedClient(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IIswcService));
                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }
                services.AddScoped<IIswcService>(_ => _mockIswcService.Object);
            });
        });
        _client.DefaultRequestHeaders.Remove(TestAuthHandler.PermissionsHeader);
        _client.DefaultRequestHeaders.Add(TestAuthHandler.PermissionsHeader, string.Join(',', RequiredPermissions));
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "test-token");
    }

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

    private static string GerarCnpjValido()
    {
        var rng = new Random();
        var num = new int[12];
        for (int i = 0; i < 12; i++) num[i] = rng.Next(0, 9);
        var pesos1 = new[] { 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 };
        var sum1 = 0;
        for (int i = 0; i < 12; i++) sum1 += num[i] * pesos1[i];
        var r1 = sum1 % 11 < 2 ? 0 : 11 - (sum1 % 11);
        var pesos2 = new[] { 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 };
        var sum2 = 0;
        for (int i = 0; i < 12; i++) sum2 += num[i] * pesos2[i];
        sum2 += r1 * 2;
        var r2 = sum2 % 11 < 2 ? 0 : 11 - (sum2 % 11);
        return $"{string.Join("", num)}{r1}{r2}";
    }

    private async Task<Guid> ObterAssociacaoIdAsync()
    {
        var assocResponse = await _client.GetFromJsonAsync<dynamic[]>("/api/v1/associacoes");
        return Guid.Parse(assocResponse![0].GetProperty("id").GetString()!);
    }

    private List<Cadastro.Domain.Entities.OutboxEvent> GetOutboxEvents(string subject, string type)
    {
        var options = new DbContextOptionsBuilder<CadastroDbContext>()
            .UseNpgsql(_factory.ConnectionString)
            .Options;
        using var context = new CadastroDbContext(options);
        return context.OutboxEvents
            .Where(e => e.Subject == subject && e.Type == type)
            .OrderByDescending(e => e.CreatedAt)
            .ToList();
    }

    private int CountAuditRecords()
    {
        var options = new DbContextOptionsBuilder<CadastroDbContext>()
            .UseNpgsql(_factory.ConnectionString)
            .Options;
        using var context = new CadastroDbContext(options);
        return context.AuditOutboxEvents.Count();
    }

    private int CountObras()
    {
        var options = new DbContextOptionsBuilder<CadastroDbContext>()
            .UseNpgsql(_factory.ConnectionString)
            .Options;
        using var context = new CadastroDbContext(options);
        return context.ObrasMusicais.Count();
    }

    private int CountFonogramas()
    {
        var options = new DbContextOptionsBuilder<CadastroDbContext>()
            .UseNpgsql(_factory.ConnectionString)
            .Options;
        using var context = new CadastroDbContext(options);
        return context.Fonogramas.Count();
    }

    private int CountTitulares()
    {
        var options = new DbContextOptionsBuilder<CadastroDbContext>()
            .UseNpgsql(_factory.ConnectionString)
            .Options;
        using var context = new CadastroDbContext(options);
        return context.Titulares.Count();
    }

    private object CriarPayloadRepertorio(Guid assocId, string cpfAutor, string cpfInterprete, string? cnpjEditor = null, string? isrcOverride = null)
    {
        var autorKey = "0";
        var editorKey = "1";
        var interpreteKey = "2";

        var titulares = new List<object>
        {
            new
            {
                titularId = (Guid?)null,
                novoTitular = new
                {
                    nome = $"Autor {cpfAutor}",
                    tipoPessoa = "PF",
                    documento = cpfAutor,
                    nacionalidade = "BR",
                    associacaoId = assocId,
                    caeIpi = (string?)null
                }
            }
        };

        if (!string.IsNullOrWhiteSpace(cnpjEditor))
        {
            titulares.Add(new
            {
                titularId = (Guid?)null,
                novoTitular = new
                {
                    nome = $"Editora {cnpjEditor}",
                    tipoPessoa = "PJ",
                    documento = cnpjEditor,
                    nacionalidade = "BR",
                    associacaoId = assocId,
                    caeIpi = (string?)null
                }
            });
        }

        titulares.Add(new
        {
            titularId = (Guid?)null,
            novoTitular = new
            {
                nome = $"Interprete {cpfInterprete}",
                tipoPessoa = "PF",
                documento = cpfInterprete,
                nacionalidade = "BR",
                associacaoId = assocId,
                caeIpi = (string?)null
            }
        });

        var titularidades = new List<object>();

        if (string.IsNullOrWhiteSpace(cnpjEditor))
        {
            titularidades.Add(new
            {
                titularLocalKey = autorKey,
                categoria = "AUTOR",
                percentual = 100.00m
            });
        }
        else
        {
            titularidades.Add(new
            {
                titularLocalKey = autorKey,
                categoria = "AUTOR",
                percentual = 75.0000m
            });
            titularidades.Add(new
            {
                titularLocalKey = editorKey,
                categoria = "EDITOR",
                percentual = 25.0000m
            });
        }

        var isrc = isrcOverride ?? $"BR{new Random().Next(100000, 999999)}" + $"{new Random().Next(10000, 99999)}";

        var fonogramas = new List<object>
        {
            new
            {
                isrc = isrc,
                pais = "BR",
                dataGravacao = (string?)null,
                dataLancamento = (string?)null,
                urlAudio = (string?)null,
                participacoes = new List<object>
                {
                    new
                    {
                        titularLocalKey = interpreteKey,
                        papel = "INTERPRETE"
                    }
                }
            }
        };

        return new
        {
            obra = new
            {
                titulo = $"Obra de Teste {Guid.NewGuid().ToString()[..8]}",
                subtitulo = (string?)null,
                tipo = "MUSICAL",
                genero = (string?)null
            },
            titulares = titulares.ToArray(),
            titularidades = titularidades.ToArray(),
            fonogramas = fonogramas.ToArray()
        };
    }

    [Fact]
    public async Task Post_RepertorioCompleto_DeveRetornar201ELocation()
    {
        var assocId = await ObterAssociacaoIdAsync();
        var cpfAutor = GerarCpfValido();
        var cpfInterprete = GerarCpfValido();
        var cnpjEditor = GerarCnpjValido();

        _mockIswcService
            .Setup(s => s.ObterIswcAsync(It.IsAny<string>(), It.IsAny<IEnumerable<string>>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync($"T-{Guid.NewGuid().ToString()[..8]}");

        var initialObraCount = CountObras();
        var initialFonoCount = CountFonogramas();
        var initialTitularCount = CountTitulares();
        var initialAuditCount = CountAuditRecords();

        var payload = CriarPayloadRepertorio(assocId, cpfAutor, cpfInterprete, cnpjEditor);

        var response = await _client.PostAsJsonAsync("/api/v1/repertorios", payload);

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var result = await response.Content.ReadFromJsonAsync<CadastroRepertorioResponse>();
        result.Should().NotBeNull();
        result!.StatusObra.Should().Be("LIBERADO");
        result.IswcObtido.Should().BeTrue();
        result.Iswc.Should().NotBeNullOrEmpty();

        response.Headers.Location.Should().NotBeNull();
        response.Headers.Location!.ToString().Should().Be($"/api/v1/obras/{result.ObraId}");

        result.Fonogramas.Should().HaveCount(1);
        result.FonogramaLinks.Should().HaveCount(1);

        CountObras().Should().Be(initialObraCount + 1);
        CountFonogramas().Should().Be(initialFonoCount + 1);
        CountTitulares().Should().Be(initialTitularCount + 3);

        var outboxEvents = GetOutboxEvents(result.ObraId.ToString(), "cadastro.obra.liberada");
        outboxEvents.Should().NotBeEmpty();

        CountAuditRecords().Should().BeGreaterThan(initialAuditCount);
    }

    [Fact]
    public async Task Post_Repertorio_IswcIndisponivel_DeveRetornar502ENadaPersistido()
    {
        var assocId = await ObterAssociacaoIdAsync();
        var cpfAutor = GerarCpfValido();
        var cpfInterprete = GerarCpfValido();

        _mockIswcService
            .Setup(s => s.ObterIswcAsync(It.IsAny<string>(), It.IsAny<IEnumerable<string>>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new RepertorioIswcIndisponivelException("Serviço ISWC indisponível."));

        var initialObraCount = CountObras();
        var initialFonoCount = CountFonogramas();
        var initialTitularCount = CountTitulares();

        var payload = CriarPayloadRepertorio(assocId, cpfAutor, cpfInterprete);

        var response = await _client.PostAsJsonAsync("/api/v1/repertorios", payload);

        response.StatusCode.Should().Be(HttpStatusCode.BadGateway);

        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        problem.Should().NotBeNull();
        problem!.Title.Should().Be("Serviço ISWC indisponível");
        problem.Extensions.Should().ContainKey("code");
        problem.Extensions["code"]!.ToString().Should().Be("ISWC_INDISPONIVEL");

        CountObras().Should().Be(initialObraCount);
        CountFonogramas().Should().Be(initialFonoCount);
        CountTitulares().Should().Be(initialTitularCount);
    }

    [Fact]
    public async Task Post_RepertorioPendente_DeveRetornar201ComStatusPendente()
    {
        var assocId = await ObterAssociacaoIdAsync();
        var cpfAutor = GerarCpfValido();
        var cpfInterprete = GerarCpfValido();

        // O endpoint /pendentes não chama ISWC; não configurar mock.
        var initialObraCount = CountObras();
        var initialFonoCount = CountFonogramas();

        var payload = CriarPayloadRepertorio(assocId, cpfAutor, cpfInterprete);

        var response = await _client.PostAsJsonAsync("/api/v1/repertorios/pendentes", payload);

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var result = await response.Content.ReadFromJsonAsync<CadastroRepertorioResponse>();
        result.Should().NotBeNull();
        result!.StatusObra.Should().Be("PENDENTE");
        result.IswcObtido.Should().BeFalse();
        result.Iswc.Should().BeNull();

        response.Headers.Location.Should().NotBeNull();
        response.Headers.Location!.ToString().Should().Be($"/api/v1/obras/{result.ObraId}");

        CountObras().Should().Be(initialObraCount + 1);
        CountFonogramas().Should().Be(initialFonoCount + 1);
    }

    [Fact]
    public async Task Post_Repertorio_IsrcDuplicado_DeveRetornar409ENadaPersistido()
    {
        var assocId = await ObterAssociacaoIdAsync();
        var cpfAutor1 = GerarCpfValido();
        var cpfInterprete1 = GerarCpfValido();

        _mockIswcService
            .Setup(s => s.ObterIswcAsync(It.IsAny<string>(), It.IsAny<IEnumerable<string>>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync($"T-{Guid.NewGuid().ToString()[..8]}");

        // Primeiro repertório: cria o fonograma com um ISRC
        var isrc = $"BR{new Random().Next(100000, 999999)}" + $"{new Random().Next(10000, 99999)}";
        var payload1 = CriarPayloadRepertorio(assocId, cpfAutor1, cpfInterprete1, isrcOverride: isrc);
        var resp1 = await _client.PostAsJsonAsync("/api/v1/repertorios", payload1);
        resp1.StatusCode.Should().Be(HttpStatusCode.Created);

        var initialObraCount = CountObras();
        var initialFonoCount = CountFonogramas();

        // Segundo repertório: tenta mesmo ISRC
        var cpfAutor2 = GerarCpfValido();
        var cpfInterprete2 = GerarCpfValido();
        var payload2 = CriarPayloadRepertorio(assocId, cpfAutor2, cpfInterprete2, isrcOverride: isrc);

        var response = await _client.PostAsJsonAsync("/api/v1/repertorios", payload2);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        problem.Should().NotBeNull();
        problem!.Title.Should().Be("Conflict");

        CountObras().Should().Be(initialObraCount);
        CountFonogramas().Should().Be(initialFonoCount);
    }

    [Fact]
    public async Task Post_Repertorio_SemPermissao_DeveRetornar403()
    {
        var assocId = await ObterAssociacaoIdAsync();
        var cpfAutor = GerarCpfValido();
        var cpfInterprete = GerarCpfValido();

        var clientSemPermissao = _factory.CreateAuthenticatedClientWithPermissions(
            "consultor.teste", "consultor-cadastro");

        var payload = CriarPayloadRepertorio(assocId, cpfAutor, cpfInterprete);

        var response = await clientSemPermissao.PostAsJsonAsync("/api/v1/repertorios", payload);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Get_TitularPorDocumento_ComDocumentoValido_DeveRetornarResumoMascarado()
    {
        var assocId = await ObterAssociacaoIdAsync();
        var cpfAutor = GerarCpfValido();
        var cpfInterprete = GerarCpfValido();

        _mockIswcService
            .Setup(s => s.ObterIswcAsync(It.IsAny<string>(), It.IsAny<IEnumerable<string>>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync($"T-{Guid.NewGuid().ToString()[..8]}");

        // Cria repertório para ter um titular no banco
        var payload = CriarPayloadRepertorio(assocId, cpfAutor, cpfInterprete);
        await _client.PostAsJsonAsync("/api/v1/repertorios", payload);

        var response = await _client.GetAsync($"/api/v1/repertorios/titulares?documento={cpfAutor}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var titularResumo = await response.Content.ReadFromJsonAsync<TitularResumoResponse>();
        titularResumo.Should().NotBeNull();
        titularResumo!.Nome.Should().NotBeNullOrEmpty();
        titularResumo.DocumentoFormatado.Should().NotContain("000");
        titularResumo.Tipo.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Get_TitularPorDocumento_SemDocumento_DeveRetornar400()
    {
        var response = await _client.GetAsync("/api/v1/repertorios/titulares?documento=");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        problem.Should().NotBeNull();
        problem!.Title.Should().Be("One or more validation errors occurred.");
    }

    [Fact]
    public async Task Get_TitularPorDocumento_DocumentoNaoEncontrado_DeveRetornar200ComNull()
    {
        var cpfInexistente = GerarCpfValido();

        var response = await _client.GetAsync($"/api/v1/repertorios/titulares?documento={cpfInexistente}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Be("null");
    }
}
