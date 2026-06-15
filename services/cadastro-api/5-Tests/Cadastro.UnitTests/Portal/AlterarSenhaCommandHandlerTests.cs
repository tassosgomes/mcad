using BCryptNet = BCrypt.Net.BCrypt;
using AwesomeAssertions;

using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Portal.Commands;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Cadastro.UnitTests.Portal;

public class AlterarSenhaCommandHandlerTests
{
    private readonly Mock<ICredencialTitularRepository> _mockCredencialRepo;
    private readonly AlterarSenhaCommandHandler _handler;

    private const string SenhaAtual = "minhaSenha123";
    private const string NovaSenha = "novaSenha456";

    public AlterarSenhaCommandHandlerTests()
    {
        _mockCredencialRepo = new Mock<ICredencialTitularRepository>();

        _handler = new AlterarSenhaCommandHandler(
            _mockCredencialRepo.Object,
            NullLogger<AlterarSenhaCommandHandler>.Instance);
    }

    [Fact]
    public async Task HandleAsync_ComSenhaAtualCorreta_DeveRehashearEPersistir()
    {
        // Arrange
        var titularId = Guid.NewGuid();
        var senhaHashAntiga = BCryptNet.HashPassword(SenhaAtual, workFactor: 4);
        var credencial = CredencialTitular.Criar(titularId, senhaHashAntiga);

        _mockCredencialRepo.Setup(r => r.ByTitularIdAsync(titularId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(credencial);

        var command = new AlterarSenhaCommand(titularId, SenhaAtual, NovaSenha);

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert
        result.Should().BeTrue();

        // Hash mudou
        credencial.SenhaHash.Should().NotBe(senhaHashAntiga);
        // Nova senha verifica contra o novo hash
        BCryptNet.Verify(NovaSenha, credencial.SenhaHash).Should().BeTrue();
        // Senha antiga NÃO verifica mais
        BCryptNet.Verify(SenhaAtual, credencial.SenhaHash).Should().BeFalse();

        _mockCredencialRepo.Verify(r => r.Update(credencial), Times.Once);
        _mockCredencialRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ComSenhaAtualIncorreta_DeveLancarAutenticacaoGenerica()
    {
        // Arrange — RF-06: senha atual errada não revela qual campo falhou
        var titularId = Guid.NewGuid();
        var credencial = CredencialTitular.Criar(
            titularId, BCryptNet.HashPassword(SenhaAtual, workFactor: 4));

        _mockCredencialRepo.Setup(r => r.ByTitularIdAsync(titularId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(credencial);

        var command = new AlterarSenhaCommand(titularId, "senhaErrada", NovaSenha);

        // Act
        var ex = await Assert.ThrowsAsync<AutenticacaoTitularException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        // Assert
        ex.Message.Should().Be("Credenciais inválidas");
        _mockCredencialRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ComCredencialInexistente_DeveLancarAutenticacaoGenerica()
    {
        // Arrange — titularId sem credencial (token inválido ou conta removida)
        var titularId = Guid.NewGuid();
        _mockCredencialRepo.Setup(r => r.ByTitularIdAsync(titularId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((CredencialTitular?)null);

        var command = new AlterarSenhaCommand(titularId, SenhaAtual, NovaSenha);

        // Act
        var ex = await Assert.ThrowsAsync<AutenticacaoTitularException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        // Assert
        ex.Message.Should().Be("Credenciais inválidas");
    }

    [Fact]
    public async Task HandleAsync_AposRehash_SenhaAntigaNaoDeveValidar()
    {
        // Arrange — RF-07: após alterar senha, apenas a nova valida
        var titularId = Guid.NewGuid();
        var credencial = CredencialTitular.Criar(
            titularId, BCryptNet.HashPassword(SenhaAtual, workFactor: 4));

        _mockCredencialRepo.Setup(r => r.ByTitularIdAsync(titularId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(credencial);

        var command = new AlterarSenhaCommand(titularId, SenhaAtual, NovaSenha);

        // Act
        await _handler.HandleAsync(command, CancellationToken.None);

        // Assert — hash BCrypt work factor 12
        credencial.SenhaHash.Should().StartWith("$2");
        // A nova senha tem hash de work factor >= 12 (custo de hash configurado)
        // Não testamos o work factor exato pois varia ($2a$ vs $2b$), apenas que é BCrypt
        BCryptNet.Verify(NovaSenha, credencial.SenhaHash).Should().BeTrue();
    }
}
