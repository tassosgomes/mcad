using FluentAssertions;
using Identificacao.Application.Common;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Application.Captacoes.Commands;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Exceptions;
using Identificacao.Domain.Interfaces;
using Moq;

namespace Identificacao.Tests.Application;

public class ExcluirCaptacaoCommandHandlerTests
{
    private readonly Mock<ICaptacaoRepository> _captacaoRepoMock;
    private readonly ExcluirCaptacaoCommandHandler _handler;

    public ExcluirCaptacaoCommandHandlerTests()
    {
        _captacaoRepoMock = new Mock<ICaptacaoRepository>();
        _handler = new ExcluirCaptacaoCommandHandler(_captacaoRepoMock.Object);
    }

    [Fact]
    public async Task Handle_CaptacaoAberta_ExcluiComSucesso()
    {
        var analistaId = Guid.NewGuid();
        var captacao = Captacao.Criar(Guid.NewGuid(), new DateOnly(2023, 10, 1), "User", analistaId, "Nome");

        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var cmd = new ExcluirCaptacaoCommand(captacao.Id, analistaId);

        var response = await _handler.HandleAsync(cmd, CancellationToken.None);

        response.Should().Be(Unit.Value);
        _captacaoRepoMock.Verify(r => r.RemoveAsync(captacao, It.IsAny<CancellationToken>()), Times.Once);
        _captacaoRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_CaptacaoFechada_LancaDomainException()
    {
        var analistaId = Guid.NewGuid();
        var captacao = Captacao.Criar(Guid.NewGuid(), new DateOnly(2023, 10, 1), "User", analistaId, "Nome");
        var prop = typeof(Captacao).GetProperty("Status");
        prop!.SetValue(captacao, Identificacao.Domain.Enums.StatusCaptacao.Fechada);

        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var cmd = new ExcluirCaptacaoCommand(captacao.Id, analistaId);

        var act = () => _handler.HandleAsync(cmd, CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>();
    }

    [Fact]
    public async Task Handle_OutroAnalista_LancaDomainException()
    {
        var analistaId = Guid.NewGuid();
        var outroAnalista = Guid.NewGuid();
        var captacao = Captacao.Criar(Guid.NewGuid(), new DateOnly(2023, 10, 1), "User", analistaId, "Nome");

        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var cmd = new ExcluirCaptacaoCommand(captacao.Id, outroAnalista);

        var act = () => _handler.HandleAsync(cmd, CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>();
    }
}
