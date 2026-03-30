using AwesomeAssertions;
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
            _mockValidator.Object);
    }

    [Fact]
    public async Task HandleAsync_ComTitularValido_DeveAtualizarETornarNovoTitular()
    {
        // Arrange
        var titularId = Guid.NewGuid();
        var associacaoId = Guid.NewGuid();
        var command = new AtualizarTitularCommand(titularId, "João Silva Alterado", "US", associacaoId, "FALECIDO", null);

        var associacao = new Associacao(associacaoId, "ABRAMUS", "Associação Brasileira", "50.997.063/0001-32");
        _mockAssociacaoRepo.Setup(r => r.GetByIdAsync(associacaoId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(associacao);

        var cpf = Cpf.Create("12345678909");
        var titular = Titular.CriarPessoaFisica("João Silva", cpf, "Brasileiro", Guid.NewGuid());
        typeof(Titular).GetProperty("Id")!.SetValue(titular, titularId);
        typeof(Titular).GetProperty("Associacao")!.SetValue(titular, associacao);

        _mockTitularRepo.Setup(r => r.GetByIdAsync(titularId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Nome.Should().Be("João Silva Alterado");
        result.Nacionalidade.Should().Be("US");
        result.Status.Should().Be("FALECIDO");
        _mockTitularRepo.Verify(r => r.Update(It.IsAny<Titular>()), Times.Once);
        _mockTitularRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ComTitularInexistente_DeveLancarNotFoundException()
    {
        // Arrange
        var command = new AtualizarTitularCommand(Guid.NewGuid(), "Teste", "BR", Guid.NewGuid(), "ATIVO", null);

        _mockTitularRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Titular?)null);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => 
            _handler.HandleAsync(command, CancellationToken.None));
            
        ex.Message.Should().Contain("Titular");
    }
}
