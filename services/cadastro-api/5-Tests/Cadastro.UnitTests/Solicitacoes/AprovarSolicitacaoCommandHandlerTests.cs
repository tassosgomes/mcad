using AwesomeAssertions;
using Cadastro.Application.Audit;
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
/// Unit tests para <see cref="AprovarSolicitacaoCommandHandler"/> (RF-16, RF-18).
/// Cobertura:
/// - RF-16: NOME aprovada → titular.Nome alterado + audit com diff.
/// - RF-16: ASSOCIACAO aprovada com destino válido → AssociacaoId trocado.
/// - ASSOCIACAO com destino inexistente → DomainException (422).
/// - Transição inválida (APROVADA → APROVADA) → DomainException.
/// - NotFound: solicitação inexistente → NotFoundException.
/// - Persistência atômica no sucesso; rollback no erro.
/// </summary>
public class AprovarSolicitacaoCommandHandlerTests
{
    private readonly Mock<ISolicitacaoAlteracaoRepository> _mockSolicitacaoRepo;
    private readonly Mock<ITitularRepository> _mockTitularRepo;
    private readonly Mock<IAssociacaoRepository> _mockAssociacaoRepo;
    private readonly Mock<ITitularAuditPublisher> _mockAuditPublisher;
    private readonly AprovarSolicitacaoCommandHandler _handler;

    public AprovarSolicitacaoCommandHandlerTests()
    {
        _mockSolicitacaoRepo = new Mock<ISolicitacaoAlteracaoRepository>();
        _mockTitularRepo = new Mock<ITitularRepository>();
        _mockAssociacaoRepo = new Mock<IAssociacaoRepository>();
        _mockAuditPublisher = new Mock<ITitularAuditPublisher>();

        _mockAuditPublisher
            .Setup(a => a.Snapshot(It.IsAny<Titular>()))
            .Returns(new Dictionary<string, object?>());

        _handler = new AprovarSolicitacaoCommandHandler(
            _mockSolicitacaoRepo.Object,
            _mockTitularRepo.Object,
            _mockAssociacaoRepo.Object,
            _mockAuditPublisher.Object,
            NullLogger<AprovarSolicitacaoCommandHandler>.Instance);
    }

    private static Titular CriarTitular()
    {
        var titular = Titular.CriarPessoaFisica(
            "João",
            Cpf.Create("12345678909"),
            "Brasileira",
            Guid.NewGuid());

        typeof(Titular).GetProperty(nameof(Titular.AssociacaoId))!
            .SetValue(titular, Guid.Parse("00000000-0000-0000-0000-000000000001"));

        return titular;
    }

    private static SolicitacaoAlteracao CriarSolicitacao(Guid titularId, CampoSolicitacao campo, string valorAtual, string valorPretendido)
    {
        return SolicitacaoAlteracao.Criar(
            titularId,
            campo,
            valorAtual,
            valorPretendido,
            "Justificativa válida para alteração de dado sensível.");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-16: NOME aprovada → titular.Nome alterado + audit com diff (RF-18)
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_Nome_DeveAlterarNomeEAuditar()
    {
        // Arrange
        var titular = CriarTitular();
        var solicitacao = CriarSolicitacao(titular.Id, CampoSolicitacao.Nome, "João", "João Silva");
        var command = new AprovarSolicitacaoCommand(solicitacao.Id, Guid.NewGuid());

        _mockSolicitacaoRepo.Setup(r => r.GetByIdAsync(solicitacao.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(solicitacao);
        _mockTitularRepo.Setup(r => r.GetByIdForUpdateAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Status.Should().Be("APROVADA");
        result.Id.Should().Be(solicitacao.Id);

        titular.Nome.Should().Be("João Silva");

        _mockSolicitacaoRepo.Verify(r => r.Update(solicitacao), Times.Once);
        _mockAuditPublisher.Verify(
            a => a.PublishAsync(
                titular,
                TitularAuditOperation.AprovacaoSolicitacao,
                It.IsAny<IReadOnlyDictionary<string, object?>>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
        _mockSolicitacaoRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-16: ASSOCIACAO aprovada com destino válido → AssociacaoId trocado
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_AssociacaoComDestinoValido_DeveTrocarAssociacaoId()
    {
        // Arrange
        var titular = CriarTitular();
        var destinoId = Guid.Parse("00000000-0000-0000-0000-000000000002");
        var solicitacao = CriarSolicitacao(
            titular.Id,
            CampoSolicitacao.Associacao,
            titular.AssociacaoId.ToString(),
            destinoId.ToString());
        var command = new AprovarSolicitacaoCommand(solicitacao.Id, Guid.NewGuid());

        _mockSolicitacaoRepo.Setup(r => r.GetByIdAsync(solicitacao.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(solicitacao);
        _mockTitularRepo.Setup(r => r.GetByIdForUpdateAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);
        _mockAssociacaoRepo.Setup(r => r.GetByIdAsync(destinoId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Associacao(destinoId, "ABRAMUS", "ABRAMUS", "00.000.000/0001-00"));

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Status.Should().Be("APROVADA");

        titular.AssociacaoId.Should().Be(destinoId);

        _mockSolicitacaoRepo.Verify(r => r.Update(solicitacao), Times.Once);
        _mockAuditPublisher.Verify(
            a => a.PublishAsync(
                titular,
                TitularAuditOperation.AprovacaoSolicitacao,
                It.IsAny<IReadOnlyDictionary<string, object?>>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
        _mockSolicitacaoRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ASSOCIACAO com destino inexistente → DomainException (422)
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_AssociacaoDestinoInexistente_DeveLancarDomainException()
    {
        // Arrange
        var titular = CriarTitular();
        var destinoId = Guid.Parse("00000000-0000-0000-0000-000000000099");
        var solicitacao = CriarSolicitacao(
            titular.Id,
            CampoSolicitacao.Associacao,
            titular.AssociacaoId.ToString(),
            destinoId.ToString());
        var command = new AprovarSolicitacaoCommand(solicitacao.Id, Guid.NewGuid());

        _mockSolicitacaoRepo.Setup(r => r.GetByIdAsync(solicitacao.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(solicitacao);
        _mockTitularRepo.Setup(r => r.GetByIdForUpdateAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);
        _mockAssociacaoRepo.Setup(r => r.GetByIdAsync(destinoId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Associacao?)null);

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        _mockSolicitacaoRepo.Verify(r => r.Update(It.IsAny<SolicitacaoAlteracao>()), Times.Never);
        _mockSolicitacaoRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Transição inválida: APROVADA → APROVADA
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_SolicitacaoJaAprovada_DeveLancarDomainException()
    {
        // Arrange — aprova duas vezes a mesma solicitação.
        var titular = CriarTitular();
        var solicitacao = CriarSolicitacao(titular.Id, CampoSolicitacao.Nome, "João", "João Silva");
        solicitacao.Aprovar(Guid.NewGuid()); // já aprovada

        var command = new AprovarSolicitacaoCommand(solicitacao.Id, Guid.NewGuid());

        _mockSolicitacaoRepo.Setup(r => r.GetByIdAsync(solicitacao.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(solicitacao);
        _mockTitularRepo.Setup(r => r.GetByIdForUpdateAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        _mockSolicitacaoRepo.Verify(r => r.Update(It.IsAny<SolicitacaoAlteracao>()), Times.Never);
        _mockSolicitacaoRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // NotFound
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_SolicitacaoInexistente_DeveLancarNotFoundException()
    {
        // Arrange
        var id = Guid.NewGuid();
        var command = new AprovarSolicitacaoCommand(id, Guid.NewGuid());

        _mockSolicitacaoRepo.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((SolicitacaoAlteracao?)null);

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        _mockSolicitacaoRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CAE_IPI aprovada → titular.CaeIpi alterado
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_CaeIpi_DeveAtualizarCaeIpi()
    {
        // Arrange
        var titular = CriarTitular();
        var solicitacao = CriarSolicitacao(titular.Id, CampoSolicitacao.CaeIpi, "", "123.456.78.90");
        var command = new AprovarSolicitacaoCommand(solicitacao.Id, Guid.NewGuid());

        _mockSolicitacaoRepo.Setup(r => r.GetByIdAsync(solicitacao.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(solicitacao);
        _mockTitularRepo.Setup(r => r.GetByIdForUpdateAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Status.Should().Be("APROVADA");

        titular.CaeIpi.Should().NotBeNull();
        titular.CaeIpi!.Valor.Should().Be("123.456.78.90");

        _mockAuditPublisher.Verify(
            a => a.PublishAsync(
                titular,
                TitularAuditOperation.AprovacaoSolicitacao,
                It.IsAny<IReadOnlyDictionary<string, object?>>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
        _mockSolicitacaoRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
}
