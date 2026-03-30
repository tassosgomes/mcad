using AwesomeAssertions;
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
    private readonly CriarTitularCommandHandler _handler;

    public CriarTitularCommandHandlerTests()
    {
        _mockTitularRepo = new Mock<ITitularRepository>();
        _mockAssociacaoRepo = new Mock<IAssociacaoRepository>();
        _mockValidator = new Mock<IValidator<CriarTitularCommand>>();

        _mockValidator.Setup(v => v.ValidateAsync(It.IsAny<CriarTitularCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult());

        _handler = new CriarTitularCommandHandler(
            _mockTitularRepo.Object,
            _mockAssociacaoRepo.Object,
            _mockValidator.Object);
    }

    [Fact]
    public async Task HandleAsync_ComPfValido_DeveCriarERetornarTitular()
    {
        // Arrange
        var associacaoId = Guid.NewGuid();
        var command = new CriarTitularCommand("João Silva", "PF", "12345678909", "Brasileiro", associacaoId, null);
        
        var associacao = new Associacao(associacaoId, "ABRAMUS", "Associação Brasileira", "50.997.063/0001-32");
        _mockAssociacaoRepo.Setup(r => r.GetByIdAsync(associacaoId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(associacao);

        _mockTitularRepo.Setup(r => r.ExisteDocumentoAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        _mockTitularRepo.Setup(r => r.AddAsync(It.IsAny<Titular>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Titular t, CancellationToken _) => t);
            
        _mockTitularRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Guid id, CancellationToken _) => 
            {
                var cpf = Cpf.Create(command.Documento);
                var t = Titular.CriarPessoaFisica(command.Nome, cpf, command.Nacionalidade, command.AssociacaoId);
                // Via reflection para simular GetByIdAsync carregando Associação
                typeof(Titular).GetProperty("Id")!.SetValue(t, id);
                typeof(Titular).GetProperty("Associacao")!.SetValue(t, associacao);
                return t;
            });

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Nome.Should().Be("João Silva");
        result.Tipo.Should().Be("PF");
        result.DocumentoFormatado.Should().Be("123.456.789-09");
        _mockTitularRepo.Verify(r => r.AddAsync(It.IsAny<Titular>(), It.IsAny<CancellationToken>()), Times.Once);
        _mockTitularRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
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
