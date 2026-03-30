using AwesomeAssertions;
using Cadastro.Application.Associacoes.Queries;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;
using Moq;

namespace Cadastro.UnitTests.Associacoes;

public class GetAssociacoesQueryHandlerTests
{
    private readonly Mock<IAssociacaoRepository> _mockRepo;
    private readonly GetAssociacoesQueryHandler _handler;

    public GetAssociacoesQueryHandlerTests()
    {
        _mockRepo = new Mock<IAssociacaoRepository>();
        _handler = new GetAssociacoesQueryHandler(_mockRepo.Object);
    }

    [Fact]
    public async Task HandleAsync_ReturnsAllAssociacoes_MappedToResponse()
    {
        // Arrange
        var associacoes = new List<Associacao>
        {
            new(Guid.NewGuid(), "Associação Brasileira de Música e Artes", "ABRAMUS", "50.997.063/0001-32")
        };
        _mockRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(associacoes);

        // Act
        var result = await _handler.HandleAsync(new GetAssociacoesQuery(), CancellationToken.None);

        // Assert
        result.Should().HaveCount(1);
        result.First().Sigla.Should().Be("ABRAMUS");
        result.First().Nome.Should().Be("Associação Brasileira de Música e Artes");
        result.First().Cnpj.Should().Be("50.997.063/0001-32");
    }

    [Fact]
    public async Task HandleAsync_WhenNoData_ReturnsEmptyList()
    {
        // Arrange
        _mockRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Associacao>());

        // Act
        var result = await _handler.HandleAsync(new GetAssociacoesQuery(), CancellationToken.None);

        // Assert
        result.Should().BeEmpty();
    }
}
