using FluentAssertions;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Application.Execucoes.Commands;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Identificacao.Domain.Exceptions;
using Identificacao.Domain.Interfaces;
using Moq;

namespace Identificacao.Tests.Application;

public class AtualizarExecucaoCommandHandlerTests
{
    private readonly Mock<IExecucaoRepository> _execucaoRepoMock = new();
    private readonly Mock<ICaptacaoRepository> _captacaoRepoMock = new();
    private readonly Mock<ITipoUtilizacaoRepository> _tipoUtilizacaoRepoMock = new();
    private readonly Mock<ICadastroHttpClient> _cadastroClientMock = new();
    private readonly AtualizarExecucaoCommandHandler _handler;

    public AtualizarExecucaoCommandHandlerTests()
    {
        _handler = new AtualizarExecucaoCommandHandler(
            _execucaoRepoMock.Object,
            _captacaoRepoMock.Object,
            _tipoUtilizacaoRepoMock.Object,
            _cadastroClientMock.Object,
            Mock.Of<IIdentificacaoAuditPublisher>());
    }

    private static Captacao CriarCaptacaoAberta(Guid analistaId, bool exigeClassificacao = false)
    {
        var rubrica = Rubrica.Criar(Guid.NewGuid(), exigeClassificacao ? "TV" : "TST", "Teste", exigeClassificacao);
        var captacao = Captacao.Criar(rubrica.Id, new DateOnly(2026, 1, 1), "Emissora XYZ", analistaId, "João");
        typeof(Captacao).GetProperty("Rubrica")!.SetValue(captacao, rubrica);
        return captacao;
    }

    private static Execucao CriarExecucao(Guid captacaoId, StatusExecucao status = StatusExecucao.Pendente) =>
        Execucao.Criar(
            captacaoId, Guid.NewGuid(), null, "Tit", null, null, "",
            new TimeOnly(12, 0), new TimeOnly(12, 5), 1, null, null, status);

    private static AtualizarExecucaoCommand CmdValido(Captacao captacao, Execucao execucao, Guid analistaId, Guid? novaObraId = null) =>
        new(captacao.Id, execucao.Id, novaObraId ?? Guid.NewGuid(), null,
            new TimeOnly(12, 0), new TimeOnly(12, 5), 1, null, null, analistaId);

    [Fact]
    public async Task Handle_AlteraObra_RecalculaStatus()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacaoAberta(analistaId);
        var execucao = CriarExecucao(captacao.Id);

        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        _execucaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, execucao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(execucao);

        var novaObraId = Guid.NewGuid();
        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(novaObraId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ObraResumoDto(novaObraId, "Novo Titulo", "BR-999", "LIBERADO"));

        var command = new AtualizarExecucaoCommand(
            captacao.Id, execucao.Id, novaObraId, null, new TimeOnly(12, 0), new TimeOnly(12, 5), 1, null, null, analistaId);

        var result = await _handler.HandleAsync(command, CancellationToken.None);

        result.Status.Should().Be("Identificada");
        result.ObraTitulo.Should().Be("Novo Titulo");
    }

    [Fact]
    public async Task Handle_CaptacaoInexistente_LancaNotFoundException()
    {
        var analistaId = Guid.NewGuid();
        var captacaoId = Guid.NewGuid();
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacaoId, It.IsAny<CancellationToken>())).ReturnsAsync((Captacao?)null);

        var cmd = new AtualizarExecucaoCommand(
            captacaoId, Guid.NewGuid(), Guid.NewGuid(), null,
            new TimeOnly(12, 0), new TimeOnly(12, 5), 1, null, null, analistaId);

        Func<Task> act = () => _handler.HandleAsync(cmd, CancellationToken.None);
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task Handle_OutroAnalista_LancaForbiddenException()
    {
        var dono = Guid.NewGuid();
        var outro = Guid.NewGuid();
        var captacao = CriarCaptacaoAberta(dono);
        var execucao = CriarExecucao(captacao.Id);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var cmd = CmdValido(captacao, execucao, outro);

        Func<Task> act = () => _handler.HandleAsync(cmd, CancellationToken.None);
        await act.Should().ThrowAsync<ForbiddenException>();
    }

    [Fact]
    public async Task Handle_CaptacaoFechada_LancaDomainException()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacaoAberta(analistaId);
        typeof(Captacao).GetProperty("Status")!.SetValue(captacao, StatusCaptacao.Fechada);
        var execucao = CriarExecucao(captacao.Id);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var cmd = CmdValido(captacao, execucao, analistaId);

        Func<Task> act = () => _handler.HandleAsync(cmd, CancellationToken.None);
        await act.Should().ThrowAsync<DomainException>().WithMessage("Apenas captações ABERTAS podem ter suas execuções editadas.");
    }

    [Fact]
    public async Task Handle_ExecucaoInexistente_LancaNotFoundException()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacaoAberta(analistaId);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        _execucaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((Execucao?)null);

        var cmd = new AtualizarExecucaoCommand(
            captacao.Id, Guid.NewGuid(), Guid.NewGuid(), null,
            new TimeOnly(12, 0), new TimeOnly(12, 5), 1, null, null, analistaId);

        Func<Task> act = () => _handler.HandleAsync(cmd, CancellationToken.None);
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task Handle_RubricaAudiovisualSemTipoUtilizacao_LancaDomainException()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacaoAberta(analistaId, exigeClassificacao: true);
        var execucao = CriarExecucao(captacao.Id);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        _execucaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, execucao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(execucao);

        var cmd = new AtualizarExecucaoCommand(
            captacao.Id, execucao.Id, Guid.NewGuid(), null,
            new TimeOnly(12, 0), new TimeOnly(12, 5), 1, null, "Programa", analistaId);

        Func<Task> act = () => _handler.HandleAsync(cmd, CancellationToken.None);
        await act.Should().ThrowAsync<DomainException>().WithMessage("Tipo de Utilização é obrigatório para esta rubrica.");
    }

    [Fact]
    public async Task Handle_RubricaAudiovisualSemTituloPrograma_LancaDomainException()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacaoAberta(analistaId, exigeClassificacao: true);
        var execucao = CriarExecucao(captacao.Id);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        _execucaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, execucao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(execucao);

        var cmd = new AtualizarExecucaoCommand(
            captacao.Id, execucao.Id, Guid.NewGuid(), null,
            new TimeOnly(12, 0), new TimeOnly(12, 5), 1, Guid.NewGuid(), "", analistaId);

        Func<Task> act = () => _handler.HandleAsync(cmd, CancellationToken.None);
        await act.Should().ThrowAsync<DomainException>().WithMessage("Título do Programa é obrigatório para rubricas audiovisuais.");
    }

    [Fact]
    public async Task Handle_TipoUtilizacaoInexistente_LancaNotFoundException()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacaoAberta(analistaId);
        var execucao = CriarExecucao(captacao.Id);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        _execucaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, execucao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(execucao);
        _tipoUtilizacaoRepoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((TipoUtilizacao?)null);

        var cmd = new AtualizarExecucaoCommand(
            captacao.Id, execucao.Id, Guid.NewGuid(), null,
            new TimeOnly(12, 0), new TimeOnly(12, 5), 1, Guid.NewGuid(), "Prog", analistaId);

        Func<Task> act = () => _handler.HandleAsync(cmd, CancellationToken.None);
        await act.Should().ThrowAsync<NotFoundException>().WithMessage("Tipo de Utilização não encontrado.");
    }

    [Fact]
    public async Task Handle_ObraInexistente_LancaNotFoundException()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacaoAberta(analistaId);
        var execucao = CriarExecucao(captacao.Id);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        _execucaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, execucao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(execucao);
        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((ObraResumoDto?)null);

        var cmd = CmdValido(captacao, execucao, analistaId);

        Func<Task> act = () => _handler.HandleAsync(cmd, CancellationToken.None);
        await act.Should().ThrowAsync<NotFoundException>().WithMessage("Obra não encontrada no Cadastro.");
    }

    [Fact]
    public async Task Handle_FonogramaInexistente_LancaNotFoundException()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacaoAberta(analistaId);
        var execucao = CriarExecucao(captacao.Id);
        var obraId = Guid.NewGuid();
        var fonogramaId = Guid.NewGuid();

        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        _execucaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, execucao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(execucao);
        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(obraId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ObraResumoDto(obraId, "Obra", "ISWC", "LIBERADO"));
        _cadastroClientMock.Setup(c => c.GetFonogramaByIdAsync(fonogramaId, It.IsAny<CancellationToken>())).ReturnsAsync((FonogramaResumoDto?)null);

        var cmd = new AtualizarExecucaoCommand(
            captacao.Id, execucao.Id, obraId, fonogramaId,
            new TimeOnly(12, 0), new TimeOnly(12, 5), 1, null, null, analistaId);

        Func<Task> act = () => _handler.HandleAsync(cmd, CancellationToken.None);
        await act.Should().ThrowAsync<NotFoundException>().WithMessage("Fonograma não encontrado no Cadastro.");
    }

    [Fact]
    public async Task Handle_FonogramaDivergenteDaObra_LancaDomainException()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacaoAberta(analistaId);
        var execucao = CriarExecucao(captacao.Id);
        var obraId = Guid.NewGuid();
        var fonogramaId = Guid.NewGuid();
        var outraObraId = Guid.NewGuid();

        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        _execucaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, execucao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(execucao);
        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(obraId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ObraResumoDto(obraId, "Obra", "ISWC", "LIBERADO"));
        _cadastroClientMock.Setup(c => c.GetFonogramaByIdAsync(fonogramaId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FonogramaResumoDto(fonogramaId, outraObraId, "Fono", "BR-1", null, "LIBERADO"));

        var cmd = new AtualizarExecucaoCommand(
            captacao.Id, execucao.Id, obraId, fonogramaId,
            new TimeOnly(12, 0), new TimeOnly(12, 5), 1, null, null, analistaId);

        Func<Task> act = () => _handler.HandleAsync(cmd, CancellationToken.None);
        await act.Should().ThrowAsync<DomainException>().WithMessage("O fonograma informado não pertence à obra selecionada.");
    }

    [Fact]
    public async Task Handle_ObraPassaParaPendente_StatusRecalculadoParaPendente()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacaoAberta(analistaId);
        // Execucao começa como Identificada (estado feliz pré-edição)
        var execucao = CriarExecucao(captacao.Id, StatusExecucao.Identificada);

        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        _execucaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, execucao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(execucao);

        var novaObraId = Guid.NewGuid();
        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(novaObraId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ObraResumoDto(novaObraId, "Obra Pendente", null, "PENDENTE"));

        var cmd = CmdValido(captacao, execucao, analistaId, novaObraId);

        var result = await _handler.HandleAsync(cmd, CancellationToken.None);

        result.Status.Should().Be("Pendente");
        execucao.Status.Should().Be(StatusExecucao.Pendente);
    }
}
