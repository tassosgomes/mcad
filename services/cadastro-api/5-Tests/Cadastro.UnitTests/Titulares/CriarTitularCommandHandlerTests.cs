using AwesomeAssertions;
using Cadastro.Application.Common.Authorization;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Titulares.Commands;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using FluentValidation;
using FluentValidation.Results;
using Moq;

namespace Cadastro.UnitTests.Titulares;

public class CriarTitularCommandHandlerTests
{
    private readonly Mock<ITitularRepository> _mockTitularRepo;
    private readonly Mock<IAssociacaoRepository> _mockAssociacaoRepo;
    private readonly Mock<IValidator<CriarTitularCommand>> _mockValidator;
    private readonly Mock<IOutboxEventWriter> _mockOutbox;
    private readonly CriarTitularCommandHandler _handler;

    public CriarTitularCommandHandlerTests()
    {
        _mockTitularRepo = new Mock<ITitularRepository>();
        _mockAssociacaoRepo = new Mock<IAssociacaoRepository>();
        _mockValidator = new Mock<IValidator<CriarTitularCommand>>();
        _mockOutbox = new Mock<IOutboxEventWriter>();

        _mockValidator.Setup(v => v.ValidateAsync(It.IsAny<CriarTitularCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult());

        _handler = new CriarTitularCommandHandler(
            _mockTitularRepo.Object,
            _mockAssociacaoRepo.Object,
            _mockValidator.Object,
            _mockOutbox.Object,
            Mock.Of<ITitularAuditPublisher>(),
            Mock.Of<ICurrentUserPermissions>(p => p.Has(CadastroPermissionNames.TitularVerCpfCompleto)));
    }

    [Fact]
    public async Task HandleAsync_ComAssociacaoInexistente_DeveLancarNotFoundException()
    {
        // Arrange
        var command = new CriarTitularCommand("João", "PF", "12345678909", "BR", Guid.NewGuid(), null);
        
        _mockAssociacaoRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Associacao?)null);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => 
            _handler.HandleAsync(command, CancellationToken.None));
            
        ex.Message.Should().Contain("Associação");
    }

    [Fact]
    public async Task HandleAsync_ComDocumentoDuplicado_DeveLancarConflictException()
    {
        // Arrange
        var command = new CriarTitularCommand("João", "PF", "12345678909", "BR", Guid.NewGuid(), null);
        
        var associacao = new Associacao(command.AssociacaoId, "ABRAMUS", "Associação Brasileira", "50.997.063/0001-32");
        _mockAssociacaoRepo.Setup(r => r.GetByIdAsync(command.AssociacaoId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(associacao);

        _mockTitularRepo.Setup(r => r.ExisteDocumentoAsync("12345678909", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ConflictException>(() => 
            _handler.HandleAsync(command, CancellationToken.None));
            
        ex.Message.Should().Contain("Já existe um titular cadastrado com este PF");
    }

    [Fact]
    public async Task HandleAsync_ComCpfInvalido_DevePropagarDomainException()
    {
        // Arrange
        var command = new CriarTitularCommand("João", "PF", "11111111111", "BR", Guid.NewGuid(), null);
        
        var associacao = new Associacao(command.AssociacaoId, "ABRAMUS", "Associação Brasileira", "50.997.063/0001-32");
        _mockAssociacaoRepo.Setup(r => r.GetByIdAsync(command.AssociacaoId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(associacao);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<DomainException>(() => 
            _handler.HandleAsync(command, CancellationToken.None));
            
        ex.Message.Should().Be("CPF inválido");
    }
}
