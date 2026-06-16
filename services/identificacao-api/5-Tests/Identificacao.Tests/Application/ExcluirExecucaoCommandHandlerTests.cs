using FluentAssertions;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Application.Execucoes.Commands;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Identificacao.Domain.Exceptions;
using Identificacao.Domain.Interfaces;
using Moq;

namespace Identificacao.Tests.Application;

public class ExcluirExecucaoCommandHandlerTests
{
    private readonly Mock<IExecucaoRepository> _execucaoRepoMock = new();
    private readonly Mock<ICaptacaoRepository> _captacaoRepoMock = new();
    private readonly ExcluirExecucaoCommandHandler _handler;

    public ExcluirExecucaoCommandHandlerTests()
    {
        _handler = new ExcluirExecucaoCommandHandler(
            _execucaoRepoMock.Object,
            _captacaoRepoMock.Object,
            Mock.Of<IIdentificacaoAuditPublisher>());
    }

    private Captacao CriarCaptacaoAberta(Guid analistaId)
    {
        var rubrica = Rubrica.Criar(Guid.NewGuid(), "TST", "Teste", false);
        var captacao = Captacao.Criar(rubrica.Id, new DateOnly(2026, 1, 1), Guid.NewGuid(), "Emissora XYZ", analistaId, "João");
        typeof(Captacao).GetProperty("Rubrica")!.SetValue(captacao, rubrica);
        return captacao;
    }

    [Fact]
    public async Task Handle_CaptacaoAberta_ExcluiComSucesso()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacaoAberta(analistaId);
        var execucao = Execucao.Criar(
            captacao.Id, Guid.NewGuid(), null, "Tit", null, null, "", 
            new TimeOnly(12, 0), new TimeOnly(12, 5), 1, null, null, StatusExecucao.Pendente);

        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        _execucaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, execucao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(execucao);

        var command = new ExcluirExecucaoCommand(captacao.Id, execucao.Id, analistaId);
        await _handler.HandleAsync(command, CancellationToken.None);

        _execucaoRepoMock.Verify(r => r.RemoveAsync(execucao, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_CaptacaoFechada_LancaDomainException()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacaoAberta(analistaId);
        typeof(Captacao).GetProperty("Status")!.SetValue(captacao, StatusCaptacao.Fechada);
        var execucao = Execucao.Criar(
            captacao.Id, Guid.NewGuid(), null, "Tit", null, null, "", 
            new TimeOnly(12, 0), new TimeOnly(12, 5), 1, null, null, StatusExecucao.Pendente);

        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        _execucaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, execucao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(execucao);

        var command = new ExcluirExecucaoCommand(captacao.Id, execucao.Id, analistaId);
        Func<Task> act = async () => await _handler.HandleAsync(command, CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>();
    }

    [Fact]
    public async Task Handle_OutroAnalista_LancaForbiddenException()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacaoAberta(analistaId);
        
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var command = new ExcluirExecucaoCommand(captacao.Id, Guid.NewGuid(), Guid.NewGuid());
        Func<Task> act = async () => await _handler.HandleAsync(command, CancellationToken.None);

        await act.Should().ThrowAsync<ForbiddenException>();
    }
}
