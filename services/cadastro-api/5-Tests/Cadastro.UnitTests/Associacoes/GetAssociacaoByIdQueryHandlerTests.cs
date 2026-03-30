using FluentAssertions;
using Cadastro.Application.Associacoes.Queries;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.Exceptions;
using Moq;

namespace Cadastro.UnitTests.Associacoes;

public class GetAssociacaoByIdQueryHandlerTests
{
    private readonly Mock<IAssociacaoRepository> _mockRepo;
    private readonly GetAssociacaoByIdQueryHandler _handler;

    public GetAssociacaoByIdQueryHandlerTests()
    {
        _mockRepo = new Mock<IAssociacaoRepository>();
        _handler = new GetAssociacaoByIdQueryHandler(_mockRepo.Object);
    }

    [Fact]
    public async Task HandleAsync_WhenFound_ReturnsMappedAssociacao()
    {
        // Arrange
        var id = Guid.NewGuid();
        var associacao = new Associacao(id, "ABRAMUS", "Associação Brasileira", "50.997.063/0001-32");
        
        _mockRepo.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(associacao);

        // Act
        var result = await _handler.HandleAsync(new GetAssociacaoByIdQuery(id), CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(id);
        result.Sigla.Should().Be("ABRAMUS");
    }

    [Fact]
    public async Task HandleAsync_WhenNotFound_ThrowsNotFoundException()
    {
        // Arrange
        var id = Guid.NewGuid();
        _mockRepo.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Associacao?)null);

        // Act
        var action = async () => await _handler.HandleAsync(new GetAssociacaoByIdQuery(id), CancellationToken.None);

        // Assert
        await action.Should().ThrowAsync<NotFoundException>();
    }
}
