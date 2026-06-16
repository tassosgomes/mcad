using FluentAssertions;
using Identificacao.Application.Common.Responses;
using Identificacao.Application.UsuariosMusica.Queries;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Interfaces;
using Moq;

namespace Identificacao.Tests.Application;

public class BuscarUsuariosMusicaQueryHandlerTests
{
    private readonly Mock<IUsuarioMusicaSnapshotRepository> _repoMock;
    private readonly BuscarUsuariosMusicaQueryHandler _handler;

    public BuscarUsuariosMusicaQueryHandlerTests()
    {
        _repoMock = new Mock<IUsuarioMusicaSnapshotRepository>();
        _handler = new BuscarUsuariosMusicaQueryHandler(_repoMock.Object);
    }

    [Fact]
    public async Task Handle_QComMenosDe2Caracteres_RetornaListaVazia()
    {
        var query = new BuscarUsuariosMusicaQuery("r", null, 1, 10);

        var result = await _handler.HandleAsync(query, CancellationToken.None);

        result.Items.Should().BeEmpty();
        result.Pagination.Total.Should().Be(0);
        result.Pagination.TotalPages.Should().Be(0);
    }

    [Fact]
    public async Task Handle_QNull_RetornaListaVazia()
    {
        var query = new BuscarUsuariosMusicaQuery(null, null, 1, 10);

        var result = await _handler.HandleAsync(query, CancellationToken.None);

        result.Items.Should().BeEmpty();
    }

    [Fact]
    public async Task Handle_BuscaAtivos_RetornaPaginado()
    {
        var snapshots = new List<UsuarioMusicaSnapshot>
        {
            UsuarioMusicaSnapshot.Criar(Guid.NewGuid(), "Radio Globo SP", "12345678000190", "ATIVO", DateTime.UtcNow),
            UsuarioMusicaSnapshot.Criar(Guid.NewGuid(), "Radio XYZ LTDA", "98765432000199", "ATIVO", DateTime.UtcNow),
        };

        _repoMock.Setup(r => r.BuscarAsync("radio", null, 1, 10, It.IsAny<CancellationToken>()))
            .ReturnsAsync((snapshots, snapshots.Count));

        var query = new BuscarUsuariosMusicaQuery("radio", null, 1, 10);

        var result = await _handler.HandleAsync(query, CancellationToken.None);

        result.Items.Should().HaveCount(2);
        result.Pagination.Total.Should().Be(2);
        result.Pagination.TotalPages.Should().Be(1);
        result.Pagination.Page.Should().Be(1);
        result.Pagination.Size.Should().Be(10);
        result.Items.First().RazaoSocial.Should().Be("Radio Globo SP");
    }

    [Fact]
    public async Task Handle_BuscaPorCnpj_FiltraCorretamente()
    {
        var cnpj = "12345678000190";
        var snapshots = new List<UsuarioMusicaSnapshot>
        {
            UsuarioMusicaSnapshot.Criar(Guid.NewGuid(), "Radio Globo SP", cnpj, "ATIVO", DateTime.UtcNow),
        };

        _repoMock.Setup(r => r.BuscarAsync("radio", cnpj, 1, 10, It.IsAny<CancellationToken>()))
            .ReturnsAsync((snapshots, snapshots.Count));

        var query = new BuscarUsuariosMusicaQuery("radio", cnpj, 1, 10);

        var result = await _handler.HandleAsync(query, CancellationToken.None);

        result.Items.Should().HaveCount(1);
        result.Items.Single().Cnpj.Should().Be(cnpj);
    }

    [Fact]
    public async Task Handle_SemResultados_RetornaListaVaziaEPaginacaoZerada()
    {
        _repoMock.Setup(r => r.BuscarAsync("xyz", null, 1, 10, It.IsAny<CancellationToken>()))
            .ReturnsAsync((new List<UsuarioMusicaSnapshot>(), 0));

        var query = new BuscarUsuariosMusicaQuery("xyz", null, 1, 10);

        var result = await _handler.HandleAsync(query, CancellationToken.None);

        result.Items.Should().BeEmpty();
        result.Pagination.Total.Should().Be(0);
        result.Pagination.TotalPages.Should().Be(0);
    }
}
