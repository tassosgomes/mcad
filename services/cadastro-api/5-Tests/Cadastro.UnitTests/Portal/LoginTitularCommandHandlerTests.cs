using BCryptNet = BCrypt.Net.BCrypt;
using AwesomeAssertions;

using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Portal.Commands;
using Cadastro.Application.Titulares.Services;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Cadastro.UnitTests.Portal;

public class LoginTitularCommandHandlerTests
{
    private readonly Mock<ICredencialTitularRepository> _mockCredencialRepo;
    private readonly Mock<ITitularRepository> _mockTitularRepo;
    private readonly Mock<ITitularTokenService> _mockTokenService;
    private readonly LoginTitularCommandHandler _handler;

    private const string CpfValido = "123.456.789-09";
    private const string CpfLimpo = "12345678909";
    private const string SenhaCorreta = "minhaSenha123";

    public LoginTitularCommandHandlerTests()
    {
        _mockCredencialRepo = new Mock<ICredencialTitularRepository>();
        _mockTitularRepo = new Mock<ITitularRepository>();
        _mockTokenService = new Mock<ITitularTokenService>();

        _handler = new LoginTitularCommandHandler(
            _mockCredencialRepo.Object,
            _mockTitularRepo.Object,
            _mockTokenService.Object,
            NullLogger<LoginTitularCommandHandler>.Instance);
    }

    private static Titular CriarTitular(string nome = "João")
    {
        var cpf = Cpf.Create(CpfValido);
        return Titular.CriarPessoaFisica(nome, cpf, "BR", Guid.NewGuid(), null);
    }

    private static CredencialTitular CriarCredencial(Guid titularId, string senha, int falhas = 0)
    {
        var cred = CredencialTitular.Criar(titularId, BCryptNet.HashPassword(senha, workFactor: 4));
        for (var i = 0; i < falhas; i++)
            cred.IncrementarFalha();
        return cred;
    }

    [Fact]
    public async Task HandleAsync_ComCredenciaisValidas_DeveRetornarToken()
    {
        // Arrange
        var titular = CriarTitular();
        var credencial = CriarCredencial(titular.Id, SenhaCorreta);

        _mockCredencialRepo.Setup(r => r.ByDocumentoAsync(CpfLimpo, It.IsAny<CancellationToken>()))
            .ReturnsAsync(credencial);
        _mockTitularRepo.Setup(r => r.GetByIdAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);
        _mockTokenService.Setup(s => s.Gerar(titular)).Returns("jwt-token-fake");

        var command = new LoginTitularCommand(CpfValido, SenhaCorreta);

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert
        result.Token.Should().Be("jwt-token-fake");
        result.Titular.Id.Should().Be(titular.Id);
        result.Titular.Nome.Should().Be(titular.Nome);
        result.ExpiraEm.Should().BeAfter(DateTime.UtcNow);

        // Sucesso reseta falhas
        _mockCredencialRepo.Verify(r => r.Update(credencial), Times.Once);
        _mockCredencialRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ComCredencialInexistente_DeveLancarAutenticacaoTitularExceptionGenerica()
    {
        // Arrange — RF-06: mensagem idêntica para "usuário inexistente"
        _mockCredencialRepo.Setup(r => r.ByDocumentoAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((CredencialTitular?)null);

        var command = new LoginTitularCommand(CpfValido, SenhaCorreta);

        // Act
        var ex = await Assert.ThrowsAsync<AutenticacaoTitularException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        // Assert
        ex.Message.Should().Be("Credenciais inválidas");
        _mockTokenService.Verify(s => s.Gerar(It.IsAny<Titular>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ComSenhaIncorreta_DeveLancarAutenticacaoGenericaEIncrementarFalha()
    {
        // Arrange
        var titular = CriarTitular();
        var credencial = CriarCredencial(titular.Id, SenhaCorreta, falhas: 0);

        _mockCredencialRepo.Setup(r => r.ByDocumentoAsync(CpfLimpo, It.IsAny<CancellationToken>()))
            .ReturnsAsync(credencial);

        var command = new LoginTitularCommand(CpfValido, "senhaErrada123");

        // Act
        var ex = await Assert.ThrowsAsync<AutenticacaoTitularException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        // Assert — RF-06: mensagem genérica
        ex.Message.Should().Be("Credenciais inválidas");

        // IncrementarFalha foi chamado e persistido
        credencial.TentativasFalhas.Should().Be(1);
        _mockCredencialRepo.Verify(r => r.Update(credencial), Times.Once);
        _mockCredencialRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        _mockTokenService.Verify(s => s.Gerar(It.IsAny<Titular>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_NaQuintaFalha_DeveAtivarLockout()
    {
        // Arrange — credencial com 4 falhas; a 5ª ativa lockout exponencial (1 min)
        var titular = CriarTitular();
        var credencial = CriarCredencial(titular.Id, SenhaCorreta, falhas: 4);
        credencial.EstaBloqueado.Should().BeFalse("ainda não atingiu 5 falhas");

        _mockCredencialRepo.Setup(r => r.ByDocumentoAsync(CpfLimpo, It.IsAny<CancellationToken>()))
            .ReturnsAsync(credencial);

        var command = new LoginTitularCommand(CpfValido, "senhaErrada123");

        // Act
        await Assert.ThrowsAsync<AutenticacaoTitularException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        // Assert — lockout foi ativado
        credencial.TentativasFalhas.Should().Be(5);
        credencial.BloqueadoAte.Should().NotBeNull();
        credencial.EstaBloqueado.Should().BeTrue();
        var duracao = credencial.BloqueadoAte!.Value - DateTime.UtcNow;
        duracao.Should().BeCloseTo(TimeSpan.FromMinutes(1), TimeSpan.FromSeconds(15));
    }

    [Fact]
    public async Task HandleAsync_ComCredencialBloqueada_DeveLancarAutenticacaoGenerica()
    {
        // Arrange — RF-06: titular bloqueado recebe a MESMA mensagem "Credenciais inválidas"
        var titular = CriarTitular();
        var credencial = CriarCredencial(titular.Id, SenhaCorreta, falhas: 5);
        credencial.EstaBloqueado.Should().BeTrue("configuração do teste");

        _mockCredencialRepo.Setup(r => r.ByDocumentoAsync(CpfLimpo, It.IsAny<CancellationToken>()))
            .ReturnsAsync(credencial);

        var command = new LoginTitularCommand(CpfValido, SenhaCorreta);

        // Act
        var ex = await Assert.ThrowsAsync<AutenticacaoTitularException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        // Assert — mensagem idêntica às outras falhas (RF-06)
        ex.Message.Should().Be("Credenciais inválidas");
        _mockTokenService.Verify(s => s.Gerar(It.IsAny<Titular>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ComDocumentoInvalido_DeveLancarAutenticacaoGenerica()
    {
        // Arrange — documento com formato inválido; DomainException capturada → 401 genérico (RF-06)
        var command = new LoginTitularCommand("000.000.000-00", SenhaCorreta);

        // Act
        var ex = await Assert.ThrowsAsync<AutenticacaoTitularException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        // Assert
        ex.Message.Should().Be("Credenciais inválidas");
    }
}
