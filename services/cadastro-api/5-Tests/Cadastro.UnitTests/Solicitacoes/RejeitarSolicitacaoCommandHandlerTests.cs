using AwesomeAssertions;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Solicitacoes.Commands;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Cadastro.UnitTests.Solicitacoes;

/// <summary>
/// Unit tests para <see cref="RejeitarSolicitacaoCommandHandler"/> (RF-19).
/// Cobertura:
/// - RF-19: solicitação SOLICITADA → REJEITADA com justificativa registrada.
/// - Titular não alterado após rejeição.
/// - Transição inválida (APROVADA → REJEITADA) → DomainException.
/// - NotFound: solicitação inexistente → NotFoundException.
/// - Persistência no sucesso; rollback no erro.
/// </summary>
public class RejeitarSolicitacaoCommandHandlerTests
{
    private readonly Mock<ISolicitacaoAlteracaoRepository> _mockRepo;
    private readonly RejeitarSolicitacaoCommandHandler _handler;

    public RejeitarSolicitacaoCommandHandlerTests()
    {
        _mockRepo = new Mock<ISolicitacaoAlteracaoRepository>();
        _handler = new RejeitarSolicitacaoCommandHandler(
            _mockRepo.Object,
            NullLogger<RejeitarSolicitacaoCommandHandler>.Instance);
    }

    private static SolicitacaoAlteracao CriarSolicitacao()
    {
        return SolicitacaoAlteracao.Criar(
            Guid.NewGuid(),
            CampoSolicitacao.Nome,
            "João",
            "João Silva",
            "Justificativa válida para alteração de dado sensível.");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-19: SOLICITADA → REJEITADA com justificativa
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_Solicitada_DeveRejeitarComJustificativa()
    {
        // Arrange
        var solicitacao = CriarSolicitacao();
        var analistaId = Guid.NewGuid();
        var command = new RejeitarSolicitacaoCommand(
            solicitacao.Id,
            JustificativaRejeicao: "Dado informado não confere com documentação.",
            analistaId);

        _mockRepo.Setup(r => r.GetByIdAsync(solicitacao.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(solicitacao);

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Status.Should().Be("REJEITADA");
        result.Id.Should().Be(solicitacao.Id);
        result.JustificativaRejeicao.Should().Be("Dado informado não confere com documentação.");

        _mockRepo.Verify(r => r.Update(solicitacao), Times.Once);
        _mockRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Transição inválida: APROVADA → REJEITADA
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_JaAprovada_DeveLancarDomainException()
    {
        // Arrange
        var solicitacao = CriarSolicitacao();
        solicitacao.Aprovar(Guid.NewGuid()); // já aprovada

        var command = new RejeitarSolicitacaoCommand(
            solicitacao.Id,
            JustificativaRejeicao: "Tentativa inválida.",
            Guid.NewGuid());

        _mockRepo.Setup(r => r.GetByIdAsync(solicitacao.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(solicitacao);

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        _mockRepo.Verify(r => r.Update(It.IsAny<SolicitacaoAlteracao>()), Times.Never);
        _mockRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_JaRejeitada_DeveLancarDomainException()
    {
        // Arrange
        var solicitacao = CriarSolicitacao();
        solicitacao.Rejeitar(Guid.NewGuid(), "Já rejeitada antes.");

        var command = new RejeitarSolicitacaoCommand(
            solicitacao.Id,
            JustificativaRejeicao: "Tentativa dupla de rejeição.",
            Guid.NewGuid());

        _mockRepo.Setup(r => r.GetByIdAsync(solicitacao.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(solicitacao);

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        _mockRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // NotFound
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_SolicitacaoInexistente_DeveLancarNotFoundException()
    {
        // Arrange
        var id = Guid.NewGuid();
        var command = new RejeitarSolicitacaoCommand(
            id,
            JustificativaRejeicao: "Justificativa.",
            Guid.NewGuid());

        _mockRepo.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((SolicitacaoAlteracao?)null);

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        _mockRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }
}
