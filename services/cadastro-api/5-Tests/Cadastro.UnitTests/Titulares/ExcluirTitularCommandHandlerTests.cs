using AwesomeAssertions;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Titulares.Commands;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using Moq;

namespace Cadastro.UnitTests.Titulares;

public class ExcluirTitularCommandHandlerTests
{
    private readonly Mock<ITitularRepository> _mockRepo;
    private readonly ExcluirTitularCommandHandler _handler;

    public ExcluirTitularCommandHandlerTests()
    {
        _mockRepo = new Mock<ITitularRepository>();
        _handler = new ExcluirTitularCommandHandler(_mockRepo.Object);
    }

    [Fact]
    public async Task HandleAsync_ComTitularValidoEsemVinculos_DeveExcluir()
    {
        // Arrange
        var titularId = Guid.NewGuid();
        var titular = Titular.CriarPessoaFisica("Teste", Cpf.Create("12345678909"), "BR", Guid.NewGuid());
        typeof(Titular).GetProperty("Id")!.SetValue(titular, titularId);

        _mockRepo.Setup(r => r.GetByIdAsync(titularId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        _mockRepo.Setup(r => r.PossuiVinculosAsync(titularId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        var result = await _handler.HandleAsync(new ExcluirTitularCommand(titularId), CancellationToken.None);

        // Assert
        result.Should().BeTrue();
        _mockRepo.Verify(r => r.Delete(titular), Times.Once);
        _mockRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ComTitularComVinculos_DeveLancarConflictException()
    {
        // Arrange
        var titularId = Guid.NewGuid();
        var titular = Titular.CriarPessoaFisica("Teste", Cpf.Create("12345678909"), "BR", Guid.NewGuid());

        _mockRepo.Setup(r => r.GetByIdAsync(titularId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        _mockRepo.Setup(r => r.PossuiVinculosAsync(titularId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act & Assert
        var action = () => _handler.HandleAsync(new ExcluirTitularCommand(titularId), CancellationToken.None);

        await action.Should().ThrowAsync<ConflictException>()
            .WithMessage("Titular não pode ser excluído pois possui vínculos com obras ou fonogramas");
            
        _mockRepo.Verify(r => r.Delete(It.IsAny<Titular>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ComTitularInexistente_DeveLancarNotFoundException()
    {
        // Arrange
        var id = Guid.NewGuid();
        _mockRepo.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Titular?)null);

        // Act & Assert
        var action = () => _handler.HandleAsync(new ExcluirTitularCommand(id), CancellationToken.None);

        await action.Should().ThrowAsync<NotFoundException>();
    }
}
