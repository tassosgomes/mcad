using FluentAssertions;
using FluentValidation;
using Identificacao.Application.Audit;
using Identificacao.Application.Cancelamento.Commands;
using Identificacao.Application.Cancelamento.Payloads;
using Identificacao.Application.Cancelamento.Responses;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Identificacao.Domain.Exceptions;
using Identificacao.Domain.Interfaces;
using Moq;

namespace Identificacao.Tests.Application;

public class CancelarRolCommandHandlerTests
{
    private readonly Mock<ICaptacaoRepository> _captacaoRepoMock;
    private readonly Mock<IExecucaoRepository> _execucaoRepoMock;
    private readonly Mock<IOutboxEventWriter> _outboxWriterMock;
    private readonly Mock<ICadastroHttpClient> _cadastroClientMock;
    private readonly CancelarRolCommandHandler _handler;

    public CancelarRolCommandHandlerTests()
    {
        _captacaoRepoMock = new Mock<ICaptacaoRepository>();
        _execucaoRepoMock = new Mock<IExecucaoRepository>();
        _outboxWriterMock = new Mock<IOutboxEventWriter>();
        _cadastroClientMock = new Mock<ICadastroHttpClient>();

        _handler = new CancelarRolCommandHandler(
            _captacaoRepoMock.Object,
            _execucaoRepoMock.Object,
            _outboxWriterMock.Object,
            _cadastroClientMock.Object,
            Mock.Of<IIdentificacaoAuditPublisher>(),
            new CancelarRolCommandValidator());
    }

    private static Captacao CriarFechada(Guid analistaId, string sigla = "RADIO")
    {
        var rubricaId = Guid.NewGuid();
        var rubrica = Rubrica.Criar(rubricaId, sigla, "Geral", false);
        var captacao = Captacao.Criar(rubricaId, new DateOnly(2026, 1, 15), "Rede Globo", analistaId, "Joao");
        typeof(Captacao).GetProperty("Rubrica")!.SetValue(captacao, rubrica);
        captacao.Fechar();
        return captacao;
    }

    private static CancelarRolCommand CmdValido(Guid captacaoId, Guid analistaId, string opcao) =>
        new(captacaoId, "Execuções com tipo de utilização incorreto", opcao, analistaId, "Joao");

    [Fact]
    public async Task Handle_ApenasCancelar_CancelaSemNovaCaptacao()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarFechada(analistaId);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var cmd = CmdValido(captacao.Id, analistaId, OpcoesRecriacao.ApenasCancelar);
        var result = await _handler.HandleAsync(cmd, CancellationToken.None);

        result.Status.Should().Be("CANCELADA");
        result.NovaCaptacaoId.Should().BeNull();
        result.ExecucoesCopiadas.Should().BeNull();
        result.EventoPublicado.Should().BeTrue();
        captacao.Status.Should().Be(StatusCaptacao.Cancelada);
        _captacaoRepoMock.Verify(r => r.AddAsync(It.IsAny<Captacao>(), It.IsAny<CancellationToken>()), Times.Never);
        _captacaoRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_RecriarVazia_NovaCaptacaoSemExecucoes()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarFechada(analistaId);
        Captacao? capturada = null;
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        _captacaoRepoMock.Setup(r => r.AddAsync(It.IsAny<Captacao>(), It.IsAny<CancellationToken>()))
            .Callback<Captacao, CancellationToken>((c, _) => capturada = c)
            .Returns(Task.CompletedTask);

        var cmd = CmdValido(captacao.Id, analistaId, OpcoesRecriacao.RecriarVazia);
        var result = await _handler.HandleAsync(cmd, CancellationToken.None);

        result.NovaCaptacaoId.Should().NotBeNull();
        result.ExecucoesCopiadas.Should().BeNull();
        capturada.Should().NotBeNull();
        capturada!.Status.Should().Be(StatusCaptacao.Aberta);
        capturada.RubricaId.Should().Be(captacao.RubricaId);
        capturada.Periodo.Should().Be(captacao.Periodo);
        _execucaoRepoMock.Verify(r => r.AddAsync(It.IsAny<Execucao>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_CopiarExecucoes_NovaCaptacaoComExecucoes()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarFechada(analistaId);
        var obraIdLiberado = Guid.NewGuid();
        var obraIdPendente = Guid.NewGuid();

        var execLiberada = Execucao.Criar(captacao.Id, obraIdLiberado, null,
            "Obra A", null, "ISWC-A", "Int", new TimeOnly(1, 0), new TimeOnly(2, 0),
            1, null, null, StatusExecucao.Identificada);
        var execPendente = Execucao.Criar(captacao.Id, obraIdPendente, null,
            "Obra B", null, "ISWC-B", "Int", new TimeOnly(3, 0), new TimeOnly(4, 0),
            1, null, null, StatusExecucao.Identificada);

        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        _execucaoRepoMock.Setup(r => r.ListarTodasDaCaptacaoAsync(captacao.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { execLiberada, execPendente });
        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(obraIdLiberado, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ObraResumoDto(obraIdLiberado, "Obra A", "ISWC-A", "LIBERADO"));
        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(obraIdPendente, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ObraResumoDto(obraIdPendente, "Obra B", "ISWC-B", "BLOQUEADO"));

        var copias = new List<Execucao>();
        _execucaoRepoMock.Setup(r => r.AddAsync(It.IsAny<Execucao>(), It.IsAny<CancellationToken>()))
            .Callback<Execucao, CancellationToken>((e, _) => copias.Add(e))
            .Returns(Task.CompletedTask);

        var cmd = CmdValido(captacao.Id, analistaId, OpcoesRecriacao.CopiarExecucoes);
        var result = await _handler.HandleAsync(cmd, CancellationToken.None);

        result.NovaCaptacaoId.Should().NotBeNull();
        result.ExecucoesCopiadas.Should().Be(2);
        copias.Should().HaveCount(2);
        copias.Select(e => e.Id).Should().NotContain(new[] { execLiberada.Id, execPendente.Id });
        copias.Single(e => e.ObraId == obraIdLiberado).Status.Should().Be(StatusExecucao.Identificada);
        copias.Single(e => e.ObraId == obraIdPendente).Status.Should().Be(StatusExecucao.Pendente);
    }

    [Fact]
    public async Task Handle_OutroAnalista_LancaForbidden()
    {
        var dono = Guid.NewGuid();
        var outro = Guid.NewGuid();
        var captacao = CriarFechada(dono);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var cmd = CmdValido(captacao.Id, outro, OpcoesRecriacao.ApenasCancelar);
        var act = () => _handler.HandleAsync(cmd, CancellationToken.None);

        await act.Should().ThrowAsync<ForbiddenException>();
    }

    [Fact]
    public async Task Handle_DistribuicaoProcessada_LancaDomainException()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarFechada(analistaId);
        captacao.MarcarDistribuicaoProcessada(DateTime.UtcNow);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var cmd = CmdValido(captacao.Id, analistaId, OpcoesRecriacao.ApenasCancelar);
        var act = () => _handler.HandleAsync(cmd, CancellationToken.None);

        var ex = await act.Should().ThrowAsync<DomainException>();
        ex.Which.Message.Should().Contain("processado pela Distribuição");
    }

    [Fact]
    public async Task Handle_JustificativaVazia_LancaValidation()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarFechada(analistaId);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var cmd = new CancelarRolCommand(captacao.Id, "", OpcoesRecriacao.ApenasCancelar, analistaId, "Joao");
        var act = () => _handler.HandleAsync(cmd, CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>();
        _captacaoRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_EventoOutboxCriado()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarFechada(analistaId, sigla: "TV_ABERTA");
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        RolCanceladoPayload? capturado = null;
        _outboxWriterMock.Setup(w => w.AddEvent("identificacao.rol.cancelado", captacao.Id.ToString(), It.IsAny<object>()))
            .Callback<string, string, object>((_, _, data) => capturado = data as RolCanceladoPayload);

        var cmd = CmdValido(captacao.Id, analistaId, OpcoesRecriacao.ApenasCancelar);
        await _handler.HandleAsync(cmd, CancellationToken.None);

        _outboxWriterMock.Verify(w => w.AddEvent(
            "identificacao.rol.cancelado", captacao.Id.ToString(), It.IsAny<object>()), Times.Once);
        capturado.Should().NotBeNull();
        capturado!.CaptacaoId.Should().Be(captacao.Id);
        capturado.Rubrica.Should().Be("TV_ABERTA");
        capturado.AnalistaId.Should().Be(analistaId);
        capturado.Justificativa.Should().Be("Execuções com tipo de utilização incorreto");
    }
}
