using AwesomeAssertions;
using Cadastro.Application.Common.Authorization;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Titulares.Commands;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using FluentValidation;
using FluentValidation.Results;
using Moq;

namespace Cadastro.UnitTests.Titulares;

public class AtualizarTitularCommandHandlerTests
{
    private readonly Mock<ITitularRepository> _mockTitularRepo;
    private readonly Mock<IAssociacaoRepository> _mockAssociacaoRepo;
    private readonly Mock<IValidator<AtualizarTitularCommand>> _mockValidator;
    private readonly AtualizarTitularCommandHandler _handler;

    public AtualizarTitularCommandHandlerTests()
    {
        _mockTitularRepo = new Mock<ITitularRepository>();
        _mockAssociacaoRepo = new Mock<IAssociacaoRepository>();
        _mockValidator = new Mock<IValidator<AtualizarTitularCommand>>();

        _mockValidator.Setup(v => v.ValidateAsync(It.IsAny<AtualizarTitularCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult());

        _handler = new AtualizarTitularCommandHandler(
            _mockTitularRepo.Object,
            _mockAssociacaoRepo.Object,
            _mockValidator.Object,
            Mock.Of<ITitularAuditPublisher>(),
            Mock.Of<ICurrentUserPermissions>(p => p.Has(CadastroPermissionNames.TitularVerCpfCompleto)));
    }

    [Fact]
    public async Task HandleAsync_ComTitularInexistente_DeveLancarNotFoundException()
    {
        // Arrange
        var command = new AtualizarTitularCommand(Guid.NewGuid(), "Teste", "BR", Guid.NewGuid(), "ATIVO", null);

        _mockTitularRepo.Setup(r => r.GetByIdForUpdateAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Titular?)null);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => 
            _handler.HandleAsync(command, CancellationToken.None));
            
        ex.Message.Should().Contain("Titular");
    }
}
