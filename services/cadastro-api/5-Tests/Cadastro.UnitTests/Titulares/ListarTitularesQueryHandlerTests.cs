using AwesomeAssertions;
using Cadastro.Application.Titulares.Queries;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using Moq;

namespace Cadastro.UnitTests.Titulares;

public class ListarTitularesQueryHandlerTests
{
    private readonly Mock<ITitularRepository> _mockRepo;
    private readonly ListarTitularesQueryHandler _handler;

    public ListarTitularesQueryHandlerTests()
    {
        _mockRepo = new Mock<ITitularRepository>();
        _handler = new ListarTitularesQueryHandler(_mockRepo.Object);
    }

    [Fact]
    public async Task HandleAsync_DeveRetornarTitularesPaginadosETransacionarMapeamento()
    {
        // Arrange
        var associacao = new Associacao(Guid.NewGuid(), "ABRAMUS", "Associação Brasileira", "50.997.063/0001-32");
        var titular = Titular.CriarPessoaFisica("Teste", Cpf.Create("12345678909"), "BR", associacao.Id);
        typeof(Titular).GetProperty("Associacao")!.SetValue(titular, associacao);

        var query = new ListarTitularesQuery(Page: 1, Size: 10, Nome: "Teste");

        _mockRepo.Setup(r => r.ListarAsync(It.IsAny<TitularFiltro>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((new[] { titular }, 1));

        // Act
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Data.Should().HaveCount(1);
        result.Data.First().Nome.Should().Be("Teste");
        result.Pagination.Total.Should().Be(1);
        result.Pagination.TotalPages.Should().Be(1);
        result.Pagination.Page.Should().Be(1);
        result.Pagination.Size.Should().Be(10);
    }

    [Fact]
    public async Task HandleAsync_ComListaVazia_DeveRetornarTotalZero()
    {
        // Arrange
        var query = new ListarTitularesQuery();

        _mockRepo.Setup(r => r.ListarAsync(It.IsAny<TitularFiltro>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Enumerable.Empty<Titular>(), 0));

        // Act
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Data.Should().BeEmpty();
        result.Pagination.Total.Should().Be(0);
        result.Pagination.TotalPages.Should().Be(0);
    }
}
