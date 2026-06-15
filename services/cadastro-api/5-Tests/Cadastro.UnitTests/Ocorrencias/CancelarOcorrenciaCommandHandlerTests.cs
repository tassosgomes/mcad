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
/// Unit tests para <see cref="CancelarOcorrenciaCommandHandler"/> (RF-36, RF-37, RF-38).
/// Cobertura:
/// - RF-36: <c>ABERTA → CANCELADA</c> e <c>EM_ANALISE → CANCELADA</c> com justificativa.
/// - RF-37: <c>CANCELADA → CANCELADA</c> lança <c>DomainException</c>.
/// - Persistência: <c>Update</c> + <c>SaveChangesAsync</c> no sucesso; nunca no erro.
/// - NotFound: ocorrência inexistente lança <c>NotFoundException</c>.
/// </summary>
public class CancelarOcorrenciaCommandHandlerTests
{
    private readonly Mock<IOcorrenciaRepository> _mockRepo;
    private readonly CancelarOcorrenciaCommandHandler _handler;

    public CancelarOcorrenciaCommandHandlerTests()
    {
        _mockRepo = new Mock<IOcorrenciaRepository>();
        _handler = new CancelarOcorrenciaCommandHandler(
            _mockRepo.Object,
            NullLogger<CancelarOcorrenciaCommandHandler>.Instance);
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
            o.Resolver("Parecer prévio.");
        }
        else if (status == StatusOcorrencia.Cancelada)
        {
            o.Cancelar("Cancelamento prévio.");
        }

        return o;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-36: ABERTA → CANCELADA
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_Aberta_DeveTransitarParaCanceladaERegistrarJustificativa()
    {
        // Arrange
        var ocorrencia = CriarOcorrencia(StatusOcorrencia.Aberta);
        var command = new CancelarOcorrenciaCommand(
            ocorrencia.Id,
            Guid.NewGuid(),
            Justificativa: "Solicitada em duplicidade.");

        _mockRepo.Setup(r => r.GetByIdAsync(ocorrencia.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ocorrencia);

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Status.Should().Be("CANCELADA");
        result.Id.Should().Be(ocorrencia.Id);

        _mockRepo.Verify(r => r.Update(ocorrencia), Times.Once);
        _mockRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-36: EM_ANALISE → CANCELADA
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_EmAnalise_DeveTransitarParaCancelada()
    {
        // Arrange
        var ocorrencia = CriarOcorrencia(StatusOcorrencia.EmAnalise);
        var command = new CancelarOcorrenciaCommand(
            ocorrencia.Id,
            Guid.NewGuid(),
            Justificativa: "Sem mérito para prosseguir.");

        _mockRepo.Setup(r => r.GetByIdAsync(ocorrencia.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ocorrencia);

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert
        result.Status.Should().Be("CANCELADA");
        _mockRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-37: transição inválida — CANCELADA → CANCELADA
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_Cancelada_DeveLancarDomainException()
    {
        // Arrange — RF-37: o domínio rejeita CANCELADA → CANCELADA.
        var ocorrencia = CriarOcorrencia(StatusOcorrencia.Cancelada);
        var command = new CancelarOcorrenciaCommand(
            ocorrencia.Id,
            Guid.NewGuid(),
            Justificativa: "Tentar cancelar de novo.");

        _mockRepo.Setup(r => r.GetByIdAsync(ocorrencia.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ocorrencia);

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        _mockRepo.Verify(r => r.Update(It.IsAny<Ocorrencia>()), Times.Never);
        _mockRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_Resolvida_DeveLancarDomainException()
    {
        // Arrange — RF-37: o domínio rejeita RESOLVIDA → CANCELADA.
        var ocorrencia = CriarOcorrencia(StatusOcorrencia.Resolvida);
        var command = new CancelarOcorrenciaCommand(
            ocorrencia.Id,
            Guid.NewGuid(),
            Justificativa: "Tentar cancelar resolvida.");

        _mockRepo.Setup(r => r.GetByIdAsync(ocorrencia.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ocorrencia);

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // NotFound
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_OcorrenciaInexistente_DeveLancarNotFoundException()
    {
        // Arrange
        var id = Guid.NewGuid();
        var command = new CancelarOcorrenciaCommand(id, Guid.NewGuid(), Justificativa: "Just.");

        _mockRepo.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Ocorrencia?)null);

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        _mockRepo.Verify(r => r.Update(It.IsAny<Ocorrencia>()), Times.Never);
        _mockRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }
}
