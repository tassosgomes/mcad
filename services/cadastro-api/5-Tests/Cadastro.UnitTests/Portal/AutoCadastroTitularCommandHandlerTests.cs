using BCryptNet = BCrypt.Net.BCrypt;
using AwesomeAssertions;

using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Portal.Commands;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Cadastro.UnitTests.Portal;

public class AutoCadastroTitularCommandHandlerTests
{
    private readonly Mock<ITitularRepository> _mockTitularRepo;
    private readonly Mock<ICredencialTitularRepository> _mockCredencialRepo;
    private readonly AutoCadastroTitularCommandHandler _handler;

    private const string CpfValido = "123.456.789-09";   // CPF algoritmo válido
    private const string CpfLimpo = "12345678909";
    private const string CaeValido = "000.000.00.00";
    private const string SenhaValida = "minhaSenha123";

    public AutoCadastroTitularCommandHandlerTests()
    {
        _mockTitularRepo = new Mock<ITitularRepository>();
        _mockCredencialRepo = new Mock<ICredencialTitularRepository>();

        _handler = new AutoCadastroTitularCommandHandler(
            _mockTitularRepo.Object,
            _mockCredencialRepo.Object,
            NullLogger<AutoCadastroTitularCommandHandler>.Instance);
    }

    private static Titular CriarTitularPF(string nome = "João")
    {
        var cpf = Cpf.Create(CpfValido);
        var cae = CaeIpi.Create(CaeValido);
        return Titular.CriarPessoaFisica(nome, cpf, "BR", Guid.NewGuid(), cae);
    }

    [Fact]
    public async Task HandleAsync_ComCpfECaeValidos_DeveCriarCredencialComHash()
    {
        // Arrange
        var titular = CriarTitularPF();
        _mockTitularRepo.Setup(r => r.GetByDocumentoAsync(CpfLimpo, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);
        _mockCredencialRepo.Setup(r => r.ByTitularIdAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((CredencialTitular?)null);

        CredencialTitular? credencialPersistida = null;
        _mockCredencialRepo.Setup(r => r.AddAsync(It.IsAny<CredencialTitular>(), It.IsAny<CancellationToken>()))
            .Callback<CredencialTitular, CancellationToken>((c, _) => credencialPersistida = c)
            .Returns(Task.CompletedTask);

        var command = new AutoCadastroTitularCommand(CpfValido, CaeValido, SenhaValida);

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Titular.Id.Should().Be(titular.Id);
        result.Titular.Nome.Should().Be(titular.Nome);

        credencialPersistida.Should().NotBeNull();
        credencialPersistida!.TitularId.Should().Be(titular.Id);
        // RF-04: senha em texto plano NÃO pode estar no hash
        credencialPersistida.SenhaHash.Should().NotBe(SenhaValida);
        // Hash BCrypt válido — verifica a senha original
        BCryptNet.Verify(SenhaValida, credencialPersistida.SenhaHash).Should().BeTrue();

        _mockCredencialRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ComTitularInexistente_DeveLancarAutenticacaoTitularException()
    {
        // Arrange — titular não existe (RF-02). Mensagem genérica (RF-06).
        _mockTitularRepo.Setup(r => r.GetByDocumentoAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Titular?)null);

        var command = new AutoCadastroTitularCommand(CpfValido, CaeValido, SenhaValida);

        // Act
        var ex = await Assert.ThrowsAsync<AutenticacaoTitularException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        // Assert — RF-06: mensagem genérica, não revela se CPF ou CAE
        ex.Message.Should().Be("Credenciais inválidas");
        _mockCredencialRepo.Verify(r => r.AddAsync(It.IsAny<CredencialTitular>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ComCaeDivergente_DeveLancarAutenticacaoTitularException()
    {
        // Arrange — titular existe mas CAE divergente (RF-02). Mensagem genérica (RF-06).
        var titular = CriarTitularPF();
        _mockTitularRepo.Setup(r => r.GetByDocumentoAsync(CpfLimpo, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var command = new AutoCadastroTitularCommand(CpfValido, "11.111.111-11", SenhaValida);

        // Act
        var ex = await Assert.ThrowsAsync<AutenticacaoTitularException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        // Assert
        ex.Message.Should().Be("Credenciais inválidas");
        _mockCredencialRepo.Verify(r => r.AddAsync(It.IsAny<CredencialTitular>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ComCredencialJaExistente_DeveLancarConflictException()
    {
        // Arrange — RF-03: não pode criar mais de uma conta para o mesmo CPF/CNPJ
        var titular = CriarTitularPF();
        _mockTitularRepo.Setup(r => r.GetByDocumentoAsync(CpfLimpo, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var existente = CredencialTitular.Criar(titular.Id, BCryptNet.HashPassword(SenhaValida, workFactor: 4));
        _mockCredencialRepo.Setup(r => r.ByTitularIdAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existente);

        var command = new AutoCadastroTitularCommand(CpfValido, CaeValido, SenhaValida);

        // Act
        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        // Assert
        ex.Message.Should().Contain("Já existe conta para este CPF/CNPJ");
        _mockCredencialRepo.Verify(r => r.AddAsync(It.IsAny<CredencialTitular>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ComSenhaValida_NuncaDevePersistirSenhaEmTextoPlano()
    {
        // Arrange — RF-04: senha em texto plano jamais pode estar no SenhaHash
        var titular = CriarTitularPF();
        _mockTitularRepo.Setup(r => r.GetByDocumentoAsync(CpfLimpo, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);
        _mockCredencialRepo.Setup(r => r.ByTitularIdAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((CredencialTitular?)null);

        CredencialTitular? credencialPersistida = null;
        _mockCredencialRepo.Setup(r => r.AddAsync(It.IsAny<CredencialTitular>(), It.IsAny<CancellationToken>()))
            .Callback<CredencialTitular, CancellationToken>((c, _) => credencialPersistida = c)
            .Returns(Task.CompletedTask);

        var command = new AutoCadastroTitularCommand(CpfValido, CaeValido, SenhaValida);

        // Act
        await _handler.HandleAsync(command, CancellationToken.None);

        // Assert
        credencialPersistida.Should().NotBeNull();
        credencialPersistida!.SenhaHash.Should().NotBeNullOrEmpty();
        credencialPersistida.SenhaHash.Should().NotContain(SenhaValida);
        credencialPersistida.SenhaHash.Should().StartWith("$2");  // prefixo BCrypt ($2a/$2b/$2y)
    }

    [Fact]
    public async Task HandleAsync_ComCpfInvalido_DeveLancarDomainException()
    {
        // Arrange — CPF algoritmo-inválido (111.111.111-11). VO rejeita.
        var command = new AutoCadastroTitularCommand("111.111.111-11", CaeValido, SenhaValida);

        // Act & Assert — DomainException propagada (422 no GlobalExceptionHandler)
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));
    }
}
