using AwesomeAssertions;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Ocorrencias.Commands;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Cadastro.UnitTests.Ocorrencias;

/// <summary>
/// Unit tests para <see cref="AnalisarOcorrenciaCommandHandler"/> (RF-34, RF-37, RF-38).
/// Cobertura:
/// - RF-34: <c>ABERTA → EM_ANALISE</c> com sucesso.
/// - RF-37: transição inválida (<c>RESOLVIDA → EM_ANALISE</c>) lança <c>DomainException</c>.
/// - Persistência: <c>Update</c> + <c>SaveChangesAsync</c> chamados no sucesso; nunca no erro.
/// - NotFound: ocorrência inexistente lança <c>NotFoundException</c>.
/// </summary>
public class AnalisarOcorrenciaCommandHandlerTests
{
    private readonly Mock<IOcorrenciaRepository> _mockRepo;
    private readonly AnalisarOcorrenciaCommandHandler _handler;

    public AnalisarOcorrenciaCommandHandlerTests()
    {
        _mockRepo = new Mock<IOcorrenciaRepository>();
        _handler = new AnalisarOcorrenciaCommandHandler(
            _mockRepo.Object,
            NullLogger<AnalisarOcorrenciaCommandHandler>.Instance);
    }

    private static Ocorrencia CriarOcorrencia(StatusOcorrencia status)
    {
        var o = Ocorrencia.Criar(
            Guid.NewGuid(),
            TipoOcorrencia.TitularidadeDivergente,
            "Descrição válida com mais de dez caracteres.");

        if (status == StatusOcorrencia.EmAnalise)
        {
            o.AssumirAnalise();
        }
        else if (status == StatusOcorrencia.Resolvida)
        {
            o.AssumirAnalise();
            o.Resolver("Parecer de resolução.");
        }
        else if (status == StatusOcorrencia.Cancelada)
        {
            o.Cancelar("Justificativa de cancelamento.");
        }

        return o;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-34: ABERTA → EM_ANALISE
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_Aberta_DeveTransitarParaEmAnalise()
    {
        // Arrange
        var ocorrencia = CriarOcorrencia(StatusOcorrencia.Aberta);
        var command = new AnalisarOcorrenciaCommand(ocorrencia.Id, Guid.NewGuid());

        _mockRepo.Setup(r => r.GetByIdAsync(ocorrencia.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ocorrencia);

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Status.Should().Be("EM_ANALISE");
        result.Id.Should().Be(ocorrencia.Id);

        _mockRepo.Verify(r => r.Update(ocorrencia), Times.Once);
        _mockRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-37: transição inválida
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_Resolvida_DeveLancarDomainException()
    {
        // Arrange — RF-37: o domínio rejeita RESOLVIDA → EM_ANALISE.
        var ocorrencia = CriarOcorrencia(StatusOcorrencia.Resolvida);
        var command = new AnalisarOcorrenciaCommand(ocorrencia.Id, Guid.NewGuid());

        _mockRepo.Setup(r => r.GetByIdAsync(ocorrencia.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ocorrencia);

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        _mockRepo.Verify(r => r.Update(It.IsAny<Ocorrencia>()), Times.Never);
        _mockRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_EmAnalise_DeveLancarDomainException()
    {
        // Arrange — RF-37: o domínio rejeita EM_ANALISE → EM_ANALISE.
        var ocorrencia = CriarOcorrencia(StatusOcorrencia.EmAnalise);
        var command = new AnalisarOcorrenciaCommand(ocorrencia.Id, Guid.NewGuid());

        _mockRepo.Setup(r => r.GetByIdAsync(ocorrencia.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ocorrencia);

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        _mockRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // NotFound
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_OcorrenciaInexistente_DeveLancarNotFoundException()
    {
        // Arrange
        var id = Guid.NewGuid();
        var command = new AnalisarOcorrenciaCommand(id, Guid.NewGuid());

        _mockRepo.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Ocorrencia?)null);

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        _mockRepo.Verify(r => r.Update(It.IsAny<Ocorrencia>()), Times.Never);
        _mockRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }
}
