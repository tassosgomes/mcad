using FluentAssertions;
using Identificacao.Application.Pendentes.Commands;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Identificacao.Domain.Interfaces;
using Moq;

namespace Identificacao.Tests.Application;

public class ResolverPendentesEmLoteCommandHandlerTests
{
    private readonly Mock<IExecucaoRepository> _execucaoRepoMock = new();
    private readonly Mock<ICadastroHttpClient> _cadastroClientMock = new();
    private readonly ResolverPendentesEmLoteCommandHandler _handler;

    public ResolverPendentesEmLoteCommandHandlerTests()
    {
        _handler = new ResolverPendentesEmLoteCommandHandler(
            _execucaoRepoMock.Object,
            _cadastroClientMock.Object,
            Mock.Of<IIdentificacaoAuditPublisher>());
    }

    private Captacao CriarCaptacao(StatusCaptacao status)
    {
        var rubrica = Rubrica.Criar(Guid.NewGuid(), "TST", "Teste", false);
        var captacao = Captacao.Criar(rubrica.Id, new DateOnly(2026, 1, 1), Guid.NewGuid(), "Emissora XYZ", Guid.NewGuid(), "João");
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
    public async Task Handle_3De3ComSucesso_TodasResolvidas()
    {
        var captacao = CriarCaptacao(StatusCaptacao.Aberta);
        var e1 = CriarExecucao(captacao, StatusExecucao.Pendente);
        var e2 = CriarExecucao(captacao, StatusExecucao.Pendente);
        var e3 = CriarExecucao(captacao, StatusExecucao.Pendente);
        
        var targets = new List<ExecucaoTarget> { 
            new(e1.CaptacaoId, e1.Id), new(e2.CaptacaoId, e2.Id), new(e3.CaptacaoId, e3.Id) 
        };
        var command = new ResolverPendentesEmLoteCommand(targets, Guid.NewGuid(), null);

        _execucaoRepoMock.Setup(r => r.GetByIdAsync(e1.CaptacaoId, e1.Id, It.IsAny<CancellationToken>())).ReturnsAsync(e1);
        _execucaoRepoMock.Setup(r => r.GetByIdAsync(e2.CaptacaoId, e2.Id, It.IsAny<CancellationToken>())).ReturnsAsync(e2);
        _execucaoRepoMock.Setup(r => r.GetByIdAsync(e3.CaptacaoId, e3.Id, It.IsAny<CancellationToken>())).ReturnsAsync(e3);

        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(command.ObraId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ObraResumoDto(command.ObraId, "Obra Teste", "BR-1", "LIBERADO"));

        var result = await _handler.HandleAsync(command, CancellationToken.None);

        result.TotalResolvidas.Should().Be(3);
        result.TotalRejeitadas.Should().Be(0);
        e1.Status.Should().Be(StatusExecucao.Identificada);
        _execucaoRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_2De3CaptacaoFechada_RejeicaoParcial()
    {
        var c1 = CriarCaptacao(StatusCaptacao.Aberta);
        var cFechada = CriarCaptacao(StatusCaptacao.Fechada);
        
        var e1 = CriarExecucao(c1, StatusExecucao.Pendente);
        var e2 = CriarExecucao(cFechada, StatusExecucao.Pendente); // Rejeita
        var e3 = CriarExecucao(cFechada, StatusExecucao.Pendente); // Rejeita
        
        var targets = new List<ExecucaoTarget> { 
            new(e1.CaptacaoId, e1.Id), new(e2.CaptacaoId, e2.Id), new(e3.CaptacaoId, e3.Id) 
        };
        var command = new ResolverPendentesEmLoteCommand(targets, Guid.NewGuid(), null);

        _execucaoRepoMock.Setup(r => r.GetByIdAsync(e1.CaptacaoId, e1.Id, It.IsAny<CancellationToken>())).ReturnsAsync(e1);
        _execucaoRepoMock.Setup(r => r.GetByIdAsync(e2.CaptacaoId, e2.Id, It.IsAny<CancellationToken>())).ReturnsAsync(e2);
        _execucaoRepoMock.Setup(r => r.GetByIdAsync(e3.CaptacaoId, e3.Id, It.IsAny<CancellationToken>())).ReturnsAsync(e3);

        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(command.ObraId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ObraResumoDto(command.ObraId, "Obra Teste", "BR-1", "LIBERADO"));

        var result = await _handler.HandleAsync(command, CancellationToken.None);

        result.TotalResolvidas.Should().Be(1);
        result.TotalRejeitadas.Should().Be(2);
        result.DetalhesRejeitadas.Should().HaveCount(2);
        e1.Status.Should().Be(StatusExecucao.Identificada);
    }

    [Fact]
    public async Task Handle_ObraNaoLiberada_RejeitaLoteInteiro()
    {
        var command = new ResolverPendentesEmLoteCommand(new List<ExecucaoTarget> { new(Guid.NewGuid(), Guid.NewGuid()) }, Guid.NewGuid(), null);

        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(command.ObraId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ObraResumoDto(command.ObraId, "Obra Teste", "BR-1", "PENDENTE"));

        var result = await _handler.HandleAsync(command, CancellationToken.None);

        result.TotalResolvidas.Should().Be(0);
        result.TotalRejeitadas.Should().Be(1);
        result.DetalhesRejeitadas[0].Motivo.Should().Contain("não está liberada");
        
        // Verifica que nem foi chamado o repo
        _execucaoRepoMock.Verify(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_ExecucaoNaoEncontrada_RejeitadaNaoBloqueiaRestante()
    {
        var captacao = CriarCaptacao(StatusCaptacao.Aberta);
        var e1 = CriarExecucao(captacao, StatusExecucao.Pendente);
        var e2Id = Guid.NewGuid();
        
        var targets = new List<ExecucaoTarget> { 
            new(e1.CaptacaoId, e1.Id), new(captacao.Id, e2Id) 
        };
        var command = new ResolverPendentesEmLoteCommand(targets, Guid.NewGuid(), null);

        _execucaoRepoMock.Setup(r => r.GetByIdAsync(e1.CaptacaoId, e1.Id, It.IsAny<CancellationToken>())).ReturnsAsync(e1);
        _execucaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, e2Id, It.IsAny<CancellationToken>())).ReturnsAsync((Execucao?)null);

        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(command.ObraId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ObraResumoDto(command.ObraId, "Obra Teste", "BR-1", "LIBERADO"));

        var result = await _handler.HandleAsync(command, CancellationToken.None);

        result.TotalResolvidas.Should().Be(1);
        result.TotalRejeitadas.Should().Be(1);
        result.DetalhesRejeitadas[0].ExecucaoId.Should().Be(e2Id);
        result.DetalhesRejeitadas[0].Motivo.Should().Contain("não encontrada");
    }

    // ───────────── Cobertura faltante ─────────────

    [Fact]
    public async Task Handle_ExcecaoInesperada_RejeitaComMensagemErroInterno()
    {
        var captacao = CriarCaptacao(StatusCaptacao.Aberta);
        var execId = Guid.NewGuid();

        var targets = new List<ExecucaoTarget> { new(captacao.Id, execId) };
        var command = new ResolverPendentesEmLoteCommand(targets, Guid.NewGuid(), null);

        _execucaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, execId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Falha inesperada"));

        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(command.ObraId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ObraResumoDto(command.ObraId, "Obra Teste", "BR-1", "LIBERADO"));

        var result = await _handler.HandleAsync(command, CancellationToken.None);

        result.TotalResolvidas.Should().Be(0);
        result.TotalRejeitadas.Should().Be(1);
        result.DetalhesRejeitadas[0].Motivo.Should().StartWith("Erro interno:");
        result.DetalhesRejeitadas[0].Motivo.Should().Contain("Falha inesperada");
    }

    [Fact]
    public async Task Handle_ComFonograma_BuscaFonogramaEObraParaISWC()
    {
        var captacao = CriarCaptacao(StatusCaptacao.Aberta);
        var execucao = CriarExecucao(captacao, StatusExecucao.Pendente);

        var obraId = Guid.NewGuid();
        var fonogramaId = Guid.NewGuid();
        var targets = new List<ExecucaoTarget> { new(execucao.CaptacaoId, execucao.Id) };
        var command = new ResolverPendentesEmLoteCommand(targets, obraId, fonogramaId);

        _execucaoRepoMock.Setup(r => r.GetByIdAsync(execucao.CaptacaoId, execucao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(execucao);

        _cadastroClientMock.Setup(c => c.GetFonogramaByIdAsync(fonogramaId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FonogramaResumoDto(fonogramaId, obraId, "Fonograma X", "BR-FONO-1", "Artista", "LIBERADO"));
        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(obraId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ObraResumoDto(obraId, "Obra X", "ISWC-X", "LIBERADO"));

        var result = await _handler.HandleAsync(command, CancellationToken.None);

        result.TotalResolvidas.Should().Be(1);
        execucao.Status.Should().Be(StatusExecucao.Identificada);
        execucao.ObraTitulo.Should().Be("Fonograma X");
        execucao.FonogramaIsrc.Should().Be("BR-FONO-1");
        execucao.ObraIswc.Should().Be("ISWC-X");
        execucao.Interpretes.Should().Be("Artista");

        _cadastroClientMock.Verify(c => c.GetFonogramaByIdAsync(fonogramaId, It.IsAny<CancellationToken>()), Times.Once);
        _cadastroClientMock.Verify(c => c.GetObraByIdAsync(obraId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_TodasFalham_NaoChamaSaveChanges()
    {
        var cFechada = CriarCaptacao(StatusCaptacao.Fechada);
        var e1 = CriarExecucao(cFechada, StatusExecucao.Pendente);
        var e2 = CriarExecucao(cFechada, StatusExecucao.Pendente);

        var targets = new List<ExecucaoTarget> { new(e1.CaptacaoId, e1.Id), new(e2.CaptacaoId, e2.Id) };
        var command = new ResolverPendentesEmLoteCommand(targets, Guid.NewGuid(), null);

        _execucaoRepoMock.Setup(r => r.GetByIdAsync(e1.CaptacaoId, e1.Id, It.IsAny<CancellationToken>())).ReturnsAsync(e1);
        _execucaoRepoMock.Setup(r => r.GetByIdAsync(e2.CaptacaoId, e2.Id, It.IsAny<CancellationToken>())).ReturnsAsync(e2);

        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(command.ObraId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ObraResumoDto(command.ObraId, "Obra", "BR-1", "LIBERADO"));

        var result = await _handler.HandleAsync(command, CancellationToken.None);

        result.TotalResolvidas.Should().Be(0);
        result.TotalRejeitadas.Should().Be(2);
        _execucaoRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }
}
