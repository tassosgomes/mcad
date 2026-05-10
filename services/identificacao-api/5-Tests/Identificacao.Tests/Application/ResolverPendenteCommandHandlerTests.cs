using FluentAssertions;
using Identificacao.Application.Pendentes.Commands;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Identificacao.Domain.Exceptions;
using Identificacao.Domain.Interfaces;
using Moq;

namespace Identificacao.Tests.Application;

public class ResolverPendenteCommandHandlerTests
{
    private readonly Mock<IExecucaoRepository> _execucaoRepoMock = new();
    private readonly Mock<ICadastroHttpClient> _cadastroClientMock = new();
    private readonly ResolverPendenteCommandHandler _handler;

    public ResolverPendenteCommandHandlerTests()
    {
        _handler = new ResolverPendenteCommandHandler(
            _execucaoRepoMock.Object,
            _cadastroClientMock.Object,
            Mock.Of<IIdentificacaoAuditPublisher>());
    }

    private Captacao CriarCaptacao(StatusCaptacao status)
    {
        var rubrica = Rubrica.Criar(Guid.NewGuid(), "TST", "Teste", false);
        var captacao = Captacao.Criar(rubrica.Id, new DateOnly(2026, 1, 1), "Emissora XYZ", Guid.NewGuid(), "João");
        typeof(Captacao).GetProperty("Status")!.SetValue(captacao, status);
        typeof(Captacao).GetProperty("Rubrica")!.SetValue(captacao, rubrica);
        return captacao;
    }

    private Execucao CriarExecucao(Captacao captacao, StatusExecucao status)
    {
        var execucao = Execucao.Criar(
            captacao.Id, Guid.NewGuid(), null, "Tit", null, null, "", 
            new TimeOnly(12, 0), new TimeOnly(12, 5), 1, null, null, status);
        typeof(Execucao).GetProperty("Captacao")!.SetValue(execucao, captacao);
        return execucao;
    }

    [Fact]
    public async Task Handle_ObraLiberada_ResolveComSucesso()
    {
        var captacao = CriarCaptacao(StatusCaptacao.Aberta);
        var execucao = CriarExecucao(captacao, StatusExecucao.Pendente);
        var command = new ResolverPendenteCommand(execucao.Id, Guid.NewGuid(), null);

        _execucaoRepoMock.Setup(r => r.GetByExecucaoIdAsync(execucao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(execucao);
        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(command.ObraId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ObraResumoDto(command.ObraId, "Obra Teste", "BR-1", "LIBERADO"));

        await _handler.HandleAsync(command, CancellationToken.None);

        execucao.Status.Should().Be(StatusExecucao.Identificada);
        execucao.ObraTitulo.Should().Be("Obra Teste");
        _execucaoRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_ObraNaoLiberada_LancaDomainException()
    {
        var captacao = CriarCaptacao(StatusCaptacao.Aberta);
        var execucao = CriarExecucao(captacao, StatusExecucao.Pendente);
        var command = new ResolverPendenteCommand(execucao.Id, Guid.NewGuid(), null);

        _execucaoRepoMock.Setup(r => r.GetByExecucaoIdAsync(execucao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(execucao);
        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(command.ObraId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ObraResumoDto(command.ObraId, "Obra Teste", "BR-1", "PENDENTE"));

        Func<Task> act = async () => await _handler.HandleAsync(command, CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>().WithMessage("*não está liberada*");
    }

    [Fact]
    public async Task Handle_ExecucaoJaIdentificada_LancaDomainException()
    {
        var captacao = CriarCaptacao(StatusCaptacao.Aberta);
        var execucao = CriarExecucao(captacao, StatusExecucao.Identificada);
        var command = new ResolverPendenteCommand(execucao.Id, Guid.NewGuid(), null);

        _execucaoRepoMock.Setup(r => r.GetByExecucaoIdAsync(execucao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(execucao);

        Func<Task> act = async () => await _handler.HandleAsync(command, CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>().WithMessage("*já está identificada*");
    }

    [Fact]
    public async Task Handle_CaptacaoFechada_LancaDomainException()
    {
        var captacao = CriarCaptacao(StatusCaptacao.Fechada);
        var execucao = CriarExecucao(captacao, StatusExecucao.Pendente);
        var command = new ResolverPendenteCommand(execucao.Id, Guid.NewGuid(), null);

        _execucaoRepoMock.Setup(r => r.GetByExecucaoIdAsync(execucao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(execucao);

        Func<Task> act = async () => await _handler.HandleAsync(command, CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>().WithMessage("*captações com status ABERTA podem ser modificadas*");
    }

    [Fact]
    public async Task Handle_FonogramaLiberado_ResolveComSucesso()
    {
        var captacao = CriarCaptacao(StatusCaptacao.Aberta);
        var execucao = CriarExecucao(captacao, StatusExecucao.Pendente);
        var obraId = Guid.NewGuid();
        var fonogramaId = Guid.NewGuid();
        var command = new ResolverPendenteCommand(execucao.Id, obraId, fonogramaId);

        _execucaoRepoMock.Setup(r => r.GetByExecucaoIdAsync(execucao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(execucao);
        
        _cadastroClientMock.Setup(c => c.GetFonogramaByIdAsync(fonogramaId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FonogramaResumoDto(fonogramaId, obraId, "Fono Teste", "BR-2", "Singer", "LIBERADO"));
        
        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(obraId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ObraResumoDto(obraId, "Obra", "ISWC-1", "LIBERADO"));

        await _handler.HandleAsync(command, CancellationToken.None);

        execucao.Status.Should().Be(StatusExecucao.Identificada);
        execucao.ObraTitulo.Should().Be("Fono Teste");
        execucao.FonogramaIsrc.Should().Be("BR-2");
        execucao.ObraIswc.Should().Be("ISWC-1");
    }

    [Fact]
    public async Task Handle_FonogramaNaoLiberado_LancaDomainException()
    {
        var captacao = CriarCaptacao(StatusCaptacao.Aberta);
        var execucao = CriarExecucao(captacao, StatusExecucao.Pendente);
        var obraId = Guid.NewGuid();
        var fonogramaId = Guid.NewGuid();
        var command = new ResolverPendenteCommand(execucao.Id, obraId, fonogramaId);

        _execucaoRepoMock.Setup(r => r.GetByExecucaoIdAsync(execucao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(execucao);
        
        _cadastroClientMock.Setup(c => c.GetFonogramaByIdAsync(fonogramaId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FonogramaResumoDto(fonogramaId, obraId, "Fono Teste", "BR-2", "Singer", "BLOQUEADO"));

        Func<Task> act = async () => await _handler.HandleAsync(command, CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>().WithMessage("*não está liberado*");
    }
}
