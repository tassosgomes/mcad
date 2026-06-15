using AwesomeAssertions;
using Cadastro.Application.Portal.Queries;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Moq;

namespace Cadastro.UnitTests.Portal;

/// <summary>
/// Unit tests para <see cref="ListarMinhasOcorrenciasQueryHandler"/> (RF-29, RF-30, RF-31).
/// Cobertura:
/// - RF-31: isolamento — filtro <c>TitularId</c> é sempre o do <c>ICurrentTitular</c>, repassado ao repositório.
/// - RF-29: filtro por <c>Status</c> repassado ao repositório (<c>ABERTA</c>, <c>EM_ANALISE</c>, etc.).
/// - RF-30: response inclui status atual e resolução quando houver.
/// </summary>
public class ListarMinhasOcorrenciasQueryHandlerTests
{
    private readonly Mock<IOcorrenciaRepository> _mockRepo;
    private readonly ListarMinhasOcorrenciasQueryHandler _handler;

    public ListarMinhasOcorrenciasQueryHandlerTests()
    {
        _mockRepo = new Mock<IOcorrenciaRepository>();
        _handler = new ListarMinhasOcorrenciasQueryHandler(_mockRepo.Object);
    }

    private static Ocorrencia CriarOcorrencia(
        Guid titularId,
        StatusOcorrencia status = StatusOcorrencia.Aberta,
        string? resolucao = null,
        Guid? obraId = null,
        DateTime? abertaEm = null)
    {
        var o = Ocorrencia.Criar(
            titularId,
            TipoOcorrencia.TitularidadeDivergente,
            "Descrição válida com mais de dez caracteres.",
            obraId,
            fonogramaId: null);

        // Avança o state machine via reflexão ou métodos de domínio quando precisamos de status != ABERTA.
        // Em vez de reflexão nos setters privados, usamos os métodos de transição do domínio
        // (AssumirAnalise → Resolver). Para CANCELADA usamos Cancelar.
        if (status == StatusOcorrencia.EmAnalise)
        {
            o.AssumirAnalise();
        }
        else if (status == StatusOcorrencia.Resolvida)
        {
            o.AssumirAnalise();
            o.Resolver(resolucao ?? "Resolução aplicada pelo analista.");
        }
        else if (status == StatusOcorrencia.Cancelada)
        {
            o.Cancelar("Justificativa de cancelamento.");
        }

        // AbertaEm é fixado em DateTime.UtcNow pelo factory — sobrescrevemos para testes determinísticos.
        if (abertaEm.HasValue)
        {
            typeof(Ocorrencia)
                .GetProperty(nameof(Ocorrencia.AbertaEm))!
                .SetValue(o, abertaEm.Value);
        }

        return o;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-31: isolamento — TitularId sempre do token, repassado ao repositório
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_DeveRepassarTitularIdDoTokenParaOFiltroDoRepositorio()
    {
        // Arrange — RF-31: o handler sempre passa o TitularId do token no filtro (nunca da query string).
        var titularId = Guid.NewGuid();
        var ocorrencia = CriarOcorrencia(titularId);

        OcorrenciaFiltro? filtroCapturado = null;
        _mockRepo
            .Setup(r => r.ListarAsync(It.IsAny<OcorrenciaFiltro>(), It.IsAny<CancellationToken>()))
            .Callback<OcorrenciaFiltro, CancellationToken>((f, _) => filtroCapturado = f)
            .ReturnsAsync((new[] { ocorrencia }, 1));

        var query = new ListarMinhasOcorrenciasQuery(TitularId: titularId);

        // Act
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        // Assert — o filtro repassado ao repositório contém o TitularId do token.
        filtroCapturado.Should().NotBeNull();
        filtroCapturado!.TitularId.Should().Be(titularId);
        result.Data.Should().ContainSingle();
        result.Pagination.Total.Should().Be(1);

        // O repositório foi chamado exatamente uma vez (não há chamadas para outro titularId).
        _mockRepo.Verify(
            r => r.ListarAsync(It.IsAny<OcorrenciaFiltro>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_DeveAplicarDefaultPage1Size20QuandoOmitidos()
    {
        // Arrange — paginação default: page=1, size=20.
        var titularId = Guid.NewGuid();
        OcorrenciaFiltro? filtroCapturado = null;
        _mockRepo
            .Setup(r => r.ListarAsync(It.IsAny<OcorrenciaFiltro>(), It.IsAny<CancellationToken>()))
            .Callback<OcorrenciaFiltro, CancellationToken>((f, _) => filtroCapturado = f)
            .ReturnsAsync((Enumerable.Empty<Ocorrencia>(), 0));

        var query = new ListarMinhasOcorrenciasQuery(TitularId: titularId);

        // Act
        await _handler.HandleAsync(query, CancellationToken.None);

        // Assert — defaults repassados ao filtro.
        filtroCapturado!.Page.Should().Be(1);
        filtroCapturado.Size.Should().Be(20);
        filtroCapturado.Status.Should().BeNull();
        filtroCapturado.Tipo.Should().BeNull();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-29: filtro por status
    // ──────────────────────────────────────────────────────────────────────────

    [Theory]
    [InlineData("ABERTA", StatusOcorrencia.Aberta)]
    [InlineData("EM_ANALISE", StatusOcorrencia.EmAnalise)]
    [InlineData("RESOLVIDA", StatusOcorrencia.Resolvida)]
    [InlineData("CANCELADA", StatusOcorrencia.Cancelada)]
    public async Task HandleAsync_DeveRepassarFiltroDeStatusQuandoInformado(
        string statusStr, StatusOcorrencia statusEsperado)
    {
        // Arrange — RF-29: cada valor SCREAMING_SNAKE_CASE mapeia para o enum correto.
        var titularId = Guid.NewGuid();
        OcorrenciaFiltro? filtroCapturado = null;
        _mockRepo
            .Setup(r => r.ListarAsync(It.IsAny<OcorrenciaFiltro>(), It.IsAny<CancellationToken>()))
            .Callback<OcorrenciaFiltro, CancellationToken>((f, _) => filtroCapturado = f)
            .ReturnsAsync((Enumerable.Empty<Ocorrencia>(), 0));

        var query = new ListarMinhasOcorrenciasQuery(TitularId: titularId, Status: statusStr);

        // Act
        await _handler.HandleAsync(query, CancellationToken.None);

        // Assert — o filtro foi repassado com o enum correto.
        filtroCapturado!.Status.Should().Be(statusEsperado);
    }

    [Fact]
    public async Task HandleAsync_ComStatusNulo_DeveBuscarTodosOsStatus()
    {
        // Arrange — RF-29: sem filtro de status, retorna ocorrências em qualquer estado.
        var titularId = Guid.NewGuid();
        OcorrenciaFiltro? filtroCapturado = null;
        _mockRepo
            .Setup(r => r.ListarAsync(It.IsAny<OcorrenciaFiltro>(), It.IsAny<CancellationToken>()))
            .Callback<OcorrenciaFiltro, CancellationToken>((f, _) => filtroCapturado = f)
            .ReturnsAsync((Enumerable.Empty<Ocorrencia>(), 0));

        var query = new ListarMinhasOcorrenciasQuery(TitularId: titularId, Status: null);

        // Act
        await _handler.HandleAsync(query, CancellationToken.None);

        // Assert — filtro Status é null (não filtra por status).
        filtroCapturado!.Status.Should().BeNull();
    }

    [Fact]
    public async Task HandleAsync_ComStatusInvalido_DeveTratarComoSemFiltro()
    {
        // Arrange — string não-mapeável não quebra o handler; trata como null (sem filtro).
        var titularId = Guid.NewGuid();
        OcorrenciaFiltro? filtroCapturado = null;
        _mockRepo
            .Setup(r => r.ListarAsync(It.IsAny<OcorrenciaFiltro>(), It.IsAny<CancellationToken>()))
            .Callback<OcorrenciaFiltro, CancellationToken>((f, _) => filtroCapturado = f)
            .ReturnsAsync((Enumerable.Empty<Ocorrencia>(), 0));

        var query = new ListarMinhasOcorrenciasQuery(TitularId: titularId, Status: "INEXISTENTE");

        // Act
        await _handler.HandleAsync(query, CancellationToken.None);

        // Assert — fallback defensivo: status desconhecido vira null no filtro.
        filtroCapturado!.Status.Should().BeNull();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-30: response inclui status e resolução
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_DeveMapearStatusEResolucaoNoResponse()
    {
        // Arrange — RF-30: titular vê o status atual e a resolução (quando houver).
        var titularId = Guid.NewGuid();
        var aberta = CriarOcorrencia(titularId, StatusOcorrencia.Aberta);
        var resolvida = CriarOcorrencia(
            titularId,
            StatusOcorrencia.Resolvida,
            resolucao: "Titularidade corrigida conforme contrato.");

        _mockRepo
            .Setup(r => r.ListarAsync(It.IsAny<OcorrenciaFiltro>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((new Ocorrencia[] { aberta, resolvida }, 2));

        var query = new ListarMinhasOcorrenciasQuery(TitularId: titularId);

        // Act
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        // Assert
        result.Data.Should().HaveCount(2);

        var abertaResp = result.Data.First(o => o.Id == aberta.Id);
        abertaResp.Status.Should().Be("ABERTA");
        abertaResp.Resolucao.Should().BeNull();
        abertaResp.ResolvidaEm.Should().BeNull();

        var resolvidaResp = result.Data.First(o => o.Id == resolvida.Id);
        resolvidaResp.Status.Should().Be("RESOLVIDA");
        resolvidaResp.Resolucao.Should().Be("Titularidade corrigida conforme contrato.");
        resolvidaResp.ResolvidaEm.Should().NotBeNull();
    }

    [Fact]
    public async Task HandleAsync_DeveCalcularPaginacaoCorretamente()
    {
        // Arrange — paginação sobre total retornado pelo repositório.
        var titularId = Guid.NewGuid();
        var pagina = 3;
        var tamanho = 5;
        var totalBanco = 12;

        // O repositório já devolve apenas a página solicitada (não o conjunto inteiro).
        var ocorrenciasPagina = Enumerable.Range(0, tamanho)
            .Select(_ => CriarOcorrencia(titularId))
            .ToArray();

        OcorrenciaFiltro? filtroCapturado = null;
        _mockRepo
            .Setup(r => r.ListarAsync(It.IsAny<OcorrenciaFiltro>(), It.IsAny<CancellationToken>()))
            .Callback<OcorrenciaFiltro, CancellationToken>((f, _) => filtroCapturado = f)
            .ReturnsAsync((ocorrenciasPagina, totalBanco));

        var query = new ListarMinhasOcorrenciasQuery(
            TitularId: titularId, Status: null, Page: pagina, Size: tamanho);

        // Act
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        // Assert — paginação reflete page/size do request e total do banco.
        filtroCapturado!.Page.Should().Be(pagina);
        filtroCapturado.Size.Should().Be(tamanho);
        result.Pagination.Page.Should().Be(pagina);
        result.Pagination.Size.Should().Be(tamanho);
        result.Pagination.Total.Should().Be(totalBanco);
        // 12 itens / 5 por página = 3 páginas (ceil).
        result.Pagination.TotalPages.Should().Be(3);
        result.Data.Should().HaveCount(tamanho);
    }

    [Fact]
    public async Task HandleAsync_ComListaVazia_DeveRetornarPaginacaoZero()
    {
        // Arrange — titular sem ocorrências.
        var titularId = Guid.NewGuid();
        _mockRepo
            .Setup(r => r.ListarAsync(It.IsAny<OcorrenciaFiltro>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Enumerable.Empty<Ocorrencia>(), 0));

        var query = new ListarMinhasOcorrenciasQuery(TitularId: titularId);

        // Act
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        // Assert
        result.Data.Should().BeEmpty();
        result.Pagination.Total.Should().Be(0);
        result.Pagination.TotalPages.Should().Be(0);
    }
}
