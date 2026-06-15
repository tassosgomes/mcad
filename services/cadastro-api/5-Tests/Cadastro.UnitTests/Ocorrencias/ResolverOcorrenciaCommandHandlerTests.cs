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
/// Unit tests para <see cref="ResolverOcorrenciaCommandHandler"/> (RF-35, RF-37, RF-39).
/// Cobertura:
/// - RF-35: <c>EM_ANALISE → RESOLVIDA</c> com parecer registrado.
/// - RF-39: outbox <c>AddEvent("cadastro.ocorrencia.resolvida")</c> chamado no sucesso.
/// - RF-37: transição inválida (<c>ABERTA → RESOLVIDA</c>) lança <c>DomainException</c>.
/// - Persistência: <c>Update</c> + <c>SaveChangesAsync</c> no sucesso; nunca no erro.
/// - NotFound: ocorrência inexistente lança <c>NotFoundException</c>.
/// </summary>
public class ResolverOcorrenciaCommandHandlerTests
{
    private readonly Mock<IOcorrenciaRepository> _mockRepo;
    private readonly Mock<IOutboxEventWriter> _mockOutbox;
    private readonly ResolverOcorrenciaCommandHandler _handler;

    public ResolverOcorrenciaCommandHandlerTests()
    {
        _mockRepo = new Mock<IOcorrenciaRepository>();
        _mockOutbox = new Mock<IOutboxEventWriter>();
        _handler = new ResolverOcorrenciaCommandHandler(
            _mockRepo.Object,
            _mockOutbox.Object,
            NullLogger<ResolverOcorrenciaCommandHandler>.Instance);
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

        return o;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-35: EM_ANALISE → RESOLVIDA
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_EmAnalise_DeveTransitarParaResolvidaERegistrarParecer()
    {
        // Arrange
        var ocorrencia = CriarOcorrencia(StatusOcorrencia.EmAnalise);
        var command = new ResolverOcorrenciaCommand(
            ocorrencia.Id,
            Guid.NewGuid(),
            Parecer: "Titularidade corrigida conforme contrato.");

        _mockRepo.Setup(r => r.GetByIdAsync(ocorrencia.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ocorrencia);

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Status.Should().Be("RESOLVIDA");
        result.Resolucao.Should().Be("Titularidade corrigida conforme contrato.");
        result.ResolvidaEm.Should().NotBeNull();

        _mockRepo.Verify(r => r.Update(ocorrencia), Times.Once);
        _mockRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-39: evento outbox cadastro.ocorrencia.resolvida
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_EmAnalise_DevePublicarEventoOcorrenciaResolvida()
    {
        // Arrange — RF-39: evento cadastro.ocorrencia.resolvida no outbox.
        var ocorrencia = CriarOcorrencia(StatusOcorrencia.EmAnalise);
        var command = new ResolverOcorrenciaCommand(
            ocorrencia.Id,
            Guid.NewGuid(),
            Parecer: "Resolvido por contato direto.");

        _mockRepo.Setup(r => r.GetByIdAsync(ocorrencia.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ocorrencia);

        // Act
        await _handler.HandleAsync(command, CancellationToken.None);

        // Assert — AddEvent chamado com o routing key exato e subject = ocorrenciaId.
        _mockOutbox.Verify(
            o => o.AddEvent(
                "cadastro.ocorrencia.resolvida",
                ocorrencia.Id.ToString(),
                It.IsAny<object>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ComFalhaDeTransicao_NaoDevePublicarEventoNemPersistir()
    {
        // Arrange — RF-37: ABERTA não pode ir direto para RESOLVIDA.
        var ocorrencia = CriarOcorrencia(StatusOcorrencia.Aberta);
        var command = new ResolverOcorrenciaCommand(
            ocorrencia.Id,
            Guid.NewGuid(),
            Parecer: "Parecer qualquer.");

        _mockRepo.Setup(r => r.GetByIdAsync(ocorrencia.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ocorrencia);

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        _mockRepo.Verify(r => r.Update(It.IsAny<Ocorrencia>()), Times.Never);
        _mockRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        _mockOutbox.Verify(
            o => o.AddEvent(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>()),
            Times.Never);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-37: transição inválida
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_Aberta_DeveLancarDomainException()
    {
        // Arrange — RF-37: o domínio rejeita ABERTA → RESOLVIDA.
        var ocorrencia = CriarOcorrencia(StatusOcorrencia.Aberta);
        var command = new ResolverOcorrenciaCommand(
            ocorrencia.Id,
            Guid.NewGuid(),
            Parecer: "Parecer.");

        _mockRepo.Setup(r => r.GetByIdAsync(ocorrencia.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ocorrencia);

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));
    }

    [Fact]
    public async Task HandleAsync_Resolvida_DeveLancarDomainException()
    {
        // Arrange — RF-37: o domínio rejeita RESOLVIDA → RESOLVIDA.
        var ocorrencia = CriarOcorrencia(StatusOcorrencia.Resolvida);
        var command = new ResolverOcorrenciaCommand(
            ocorrencia.Id,
            Guid.NewGuid(),
            Parecer: "Tentar resolver de novo.");

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
        var command = new ResolverOcorrenciaCommand(id, Guid.NewGuid(), Parecer: "Parecer.");

        _mockRepo.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Ocorrencia?)null);

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        _mockOutbox.Verify(
            o => o.AddEvent(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>()),
            Times.Never);
    }
}
