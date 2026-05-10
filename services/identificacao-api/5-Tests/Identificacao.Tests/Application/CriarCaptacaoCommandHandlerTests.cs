using FluentAssertions;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Application.Captacoes.Commands;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Interfaces;
using Moq;

namespace Identificacao.Tests.Application;

public class CriarCaptacaoCommandHandlerTests
{
    private readonly Mock<ICaptacaoRepository> _captacaoRepoMock;
    private readonly Mock<IRubricaRepository> _rubricaRepoMock;
    private readonly CriarCaptacaoCommandHandler _handler;

    public CriarCaptacaoCommandHandlerTests()
    {
        _captacaoRepoMock = new Mock<ICaptacaoRepository>();
        _rubricaRepoMock = new Mock<IRubricaRepository>();
        _handler = new CriarCaptacaoCommandHandler(
            _captacaoRepoMock.Object,
            _rubricaRepoMock.Object,
            Mock.Of<IIdentificacaoAuditPublisher>());
    }

    [Fact]
    public async Task Handle_DadosValidos_CriaCaptacaoAberta()
    {
        var rubricaId = Guid.NewGuid();
        var rubricas = new List<Rubrica> { Rubrica.Criar(rubricaId, "RADIO", "Rádio", false) };
        _rubricaRepoMock.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(rubricas);
        _captacaoRepoMock.Setup(r => r.ExisteAtivaParaRubricaPeriodoAsync(rubricaId, It.IsAny<DateOnly>(), null, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        var cmd = new CriarCaptacaoCommand(rubricaId, new DateOnly(2023, 10, 1), "Usuário", Guid.NewGuid(), "Analista");

        var response = await _handler.HandleAsync(cmd, CancellationToken.None);

        response.Should().NotBeNull();
        response.Status.Should().Be("Aberta");
        _captacaoRepoMock.Verify(r => r.AddAsync(It.IsAny<Captacao>(), It.IsAny<CancellationToken>()), Times.Once);
        _captacaoRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_RubricaPeriodoDuplicado_LancaConflictException()
    {
        var rubricaId = Guid.NewGuid();
        var rubricas = new List<Rubrica> { Rubrica.Criar(rubricaId, "RADIO", "Rádio", false) };
        _rubricaRepoMock.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(rubricas);
        _captacaoRepoMock.Setup(r => r.ExisteAtivaParaRubricaPeriodoAsync(rubricaId, It.IsAny<DateOnly>(), null, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var cmd = new CriarCaptacaoCommand(rubricaId, new DateOnly(2023, 10, 1), "Usuário", Guid.NewGuid(), "Analista");

        var act = () => _handler.HandleAsync(cmd, CancellationToken.None);

        await act.Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task Handle_RubricaInexistente_LancaNotFoundException()
    {
        _rubricaRepoMock.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new List<Rubrica>());

        var cmd = new CriarCaptacaoCommand(Guid.NewGuid(), new DateOnly(2023, 10, 1), "Usuário", Guid.NewGuid(), "Analista");

        var act = () => _handler.HandleAsync(cmd, CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }
}
