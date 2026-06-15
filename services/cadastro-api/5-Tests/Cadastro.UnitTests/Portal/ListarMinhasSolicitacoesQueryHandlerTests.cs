using AwesomeAssertions;
using Cadastro.Application.Portal.Queries;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Moq;

namespace Cadastro.UnitTests.Portal;

/// <summary>
/// Unit tests para <see cref="ListarMinhasSolicitacoesQueryHandler"/> (RF-17).
/// Cobertura:
/// - RF-17: isolamento — filtro <c>TitularId</c> é sempre o do <c>ICurrentTitular</c>, repassado ao repositório.
/// - RF-17: filtro por <c>Status</c> repassado ao repositório (<c>SOLICITADA</c>, <c>APROVADA</c>, <c>REJEITADA</c>).
/// - Paginação default (page=1, size=20) e cálculo de TotalPages.
/// </summary>
public class ListarMinhasSolicitacoesQueryHandlerTests
{
    private readonly Mock<ISolicitacaoAlteracaoRepository> _mockRepo;
    private readonly ListarMinhasSolicitacoesQueryHandler _handler;

    public ListarMinhasSolicitacoesQueryHandlerTests()
    {
        _mockRepo = new Mock<ISolicitacaoAlteracaoRepository>();
        _handler = new ListarMinhasSolicitacoesQueryHandler(_mockRepo.Object);
    }

    private static SolicitacaoAlteracao CriarSolicitacao(
        Guid titularId,
        CampoSolicitacao campo = CampoSolicitacao.Nome,
        StatusSolicitacao status = StatusSolicitacao.Solicitada)
    {
        var s = SolicitacaoAlteracao.Criar(
            titularId,
            campo,
            valorAtual: "Valor Antigo",
            valorPretendido: campo == CampoSolicitacao.Associacao
                ? Guid.NewGuid().ToString()
                : "Valor Novo",
            justificativa: "Justificativa válida com mais de dez caracteres.");

        // Avança o state machine quando precisamos de status != SOLICITADA.
        if (status == StatusSolicitacao.Aprovada)
        {
            s.Aprovar(Guid.NewGuid());
        }
        else if (status == StatusSolicitacao.Rejeitada)
        {
            s.Rejeitar(Guid.NewGuid(), "Documentação insuficiente.");
        }

        return s;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-17: isolamento — TitularId sempre do token, repassado ao repositório
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_DeveRepassarTitularIdDoTokenParaOFiltroDoRepositorio()
    {
        // Arrange — RF-17: o handler sempre passa o TitularId do token no filtro (nunca da query string).
        var titularId = Guid.NewGuid();
        var solicitacao = CriarSolicitacao(titularId);

        SolicitacaoFiltro? filtroCapturado = null;
        _mockRepo
            .Setup(r => r.ListarAsync(It.IsAny<SolicitacaoFiltro>(), It.IsAny<CancellationToken>()))
            .Callback<SolicitacaoFiltro, CancellationToken>((f, _) => filtroCapturado = f)
            .ReturnsAsync((new[] { solicitacao }, 1));

        var query = new ListarMinhasSolicitacoesQuery(TitularId: titularId);

        // Act
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        // Assert — o filtro repassado ao repositório contém o TitularId do token.
        filtroCapturado.Should().NotBeNull();
        filtroCapturado!.TitularId.Should().Be(titularId);
        result.Data.Should().ContainSingle();
        result.Pagination.Total.Should().Be(1);

        // O repositório foi chamado exatamente uma vez (não há chamadas para outro titularId).
        _mockRepo.Verify(
            r => r.ListarAsync(It.IsAny<SolicitacaoFiltro>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_DeveAplicarDefaultPage1Size20QuandoOmitidos()
    {
        // Arrange — paginação default: page=1, size=20.
        var titularId = Guid.NewGuid();
        SolicitacaoFiltro? filtroCapturado = null;
        _mockRepo
            .Setup(r => r.ListarAsync(It.IsAny<SolicitacaoFiltro>(), It.IsAny<CancellationToken>()))
            .Callback<SolicitacaoFiltro, CancellationToken>((f, _) => filtroCapturado = f)
            .ReturnsAsync((Enumerable.Empty<SolicitacaoAlteracao>(), 0));

        var query = new ListarMinhasSolicitacoesQuery(TitularId: titularId);

        // Act
        await _handler.HandleAsync(query, CancellationToken.None);

        // Assert — defaults repassados ao filtro.
        filtroCapturado!.Page.Should().Be(1);
        filtroCapturado.Size.Should().Be(20);
        filtroCapturado.Status.Should().BeNull();
        filtroCapturado.Campo.Should().BeNull();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-17: filtro por status
    // ──────────────────────────────────────────────────────────────────────────

    [Theory]
    [InlineData("SOLICITADA", StatusSolicitacao.Solicitada)]
    [InlineData("APROVADA", StatusSolicitacao.Aprovada)]
    [InlineData("REJEITADA", StatusSolicitacao.Rejeitada)]
    public async Task HandleAsync_DeveRepassarFiltroDeStatusQuandoInformado(
        string statusStr, StatusSolicitacao statusEsperado)
    {
        // Arrange — RF-17: cada valor SCREAMING_SNAKE_CASE mapeia para o enum correto.
        var titularId = Guid.NewGuid();
        SolicitacaoFiltro? filtroCapturado = null;
        _mockRepo
            .Setup(r => r.ListarAsync(It.IsAny<SolicitacaoFiltro>(), It.IsAny<CancellationToken>()))
            .Callback<SolicitacaoFiltro, CancellationToken>((f, _) => filtroCapturado = f)
            .ReturnsAsync((Enumerable.Empty<SolicitacaoAlteracao>(), 0));

        var query = new ListarMinhasSolicitacoesQuery(TitularId: titularId, Status: statusStr);

        // Act
        await _handler.HandleAsync(query, CancellationToken.None);

        // Assert — o filtro foi repassado com o enum correto.
        filtroCapturado!.Status.Should().Be(statusEsperado);
    }

    [Fact]
    public async Task HandleAsync_ComStatusNulo_DeveBuscarTodosOsStatus()
    {
        // Arrange — RF-17: sem filtro de status, retorna solicitações em qualquer estado.
        var titularId = Guid.NewGuid();
        SolicitacaoFiltro? filtroCapturado = null;
        _mockRepo
            .Setup(r => r.ListarAsync(It.IsAny<SolicitacaoFiltro>(), It.IsAny<CancellationToken>()))
            .Callback<SolicitacaoFiltro, CancellationToken>((f, _) => filtroCapturado = f)
            .ReturnsAsync((Enumerable.Empty<SolicitacaoAlteracao>(), 0));

        var query = new ListarMinhasSolicitacoesQuery(TitularId: titularId, Status: null);

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
        SolicitacaoFiltro? filtroCapturado = null;
        _mockRepo
            .Setup(r => r.ListarAsync(It.IsAny<SolicitacaoFiltro>(), It.IsAny<CancellationToken>()))
            .Callback<SolicitacaoFiltro, CancellationToken>((f, _) => filtroCapturado = f)
            .ReturnsAsync((Enumerable.Empty<SolicitacaoAlteracao>(), 0));

        var query = new ListarMinhasSolicitacoesQuery(TitularId: titularId, Status: "INEXISTENTE");

        // Act
        await _handler.HandleAsync(query, CancellationToken.None);

        // Assert — fallback defensivo: status desconhecido vira null no filtro.
        filtroCapturado!.Status.Should().BeNull();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Response: mapeamento de status, campo e exigeAvisoJanela
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_DeveMapearStatusEFlagExigeAvisoJanelaNoResponse()
    {
        // Arrange — RF-17: titular vê o status atual e a flag de aviso de janela.
        var titularId = Guid.NewGuid();
        var nome = CriarSolicitacao(titularId, CampoSolicitacao.Nome, StatusSolicitacao.Solicitada);
        var associacao = CriarSolicitacao(titularId, CampoSolicitacao.Associacao, StatusSolicitacao.Solicitada);
        var rejeitada = CriarSolicitacao(titularId, CampoSolicitacao.CaeIpi, StatusSolicitacao.Rejeitada);

        _mockRepo
            .Setup(r => r.ListarAsync(It.IsAny<SolicitacaoFiltro>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((new SolicitacaoAlteracao[] { nome, associacao, rejeitada }, 3));

        var query = new ListarMinhasSolicitacoesQuery(TitularId: titularId);

        // Act
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        // Assert
        result.Data.Should().HaveCount(3);

        var nomeResp = result.Data.First(s => s.Id == nome.Id);
        nomeResp.Status.Should().Be("SOLICITADA");
        nomeResp.Campo.Should().Be("NOME");
        nomeResp.ExigeAvisoJanela.Should().BeFalse();
        nomeResp.JustificativaRejeicao.Should().BeNull();
        nomeResp.DecididaEm.Should().BeNull();

        var associacaoResp = result.Data.First(s => s.Id == associacao.Id);
        associacaoResp.Campo.Should().Be("ASSOCIACAO");
        associacaoResp.ExigeAvisoJanela.Should().BeTrue();

        var rejeitadaResp = result.Data.First(s => s.Id == rejeitada.Id);
        rejeitadaResp.Status.Should().Be("REJEITADA");
        rejeitadaResp.JustificativaRejeicao.Should().NotBeNullOrEmpty();
        rejeitadaResp.DecididaEm.Should().NotBeNull();
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
        var solicitacoesPagina = Enumerable.Range(0, tamanho)
            .Select(_ => CriarSolicitacao(titularId))
            .ToArray();

        SolicitacaoFiltro? filtroCapturado = null;
        _mockRepo
            .Setup(r => r.ListarAsync(It.IsAny<SolicitacaoFiltro>(), It.IsAny<CancellationToken>()))
            .Callback<SolicitacaoFiltro, CancellationToken>((f, _) => filtroCapturado = f)
            .ReturnsAsync((solicitacoesPagina, totalBanco));

        var query = new ListarMinhasSolicitacoesQuery(
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
        // Arrange — titular sem solicitações.
        var titularId = Guid.NewGuid();
        _mockRepo
            .Setup(r => r.ListarAsync(It.IsAny<SolicitacaoFiltro>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Enumerable.Empty<SolicitacaoAlteracao>(), 0));

        var query = new ListarMinhasSolicitacoesQuery(TitularId: titularId);

        // Act
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        // Assert
        result.Data.Should().BeEmpty();
        result.Pagination.Total.Should().Be(0);
        result.Pagination.TotalPages.Should().Be(0);
    }
}
