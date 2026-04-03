using FluentAssertions;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Application.Execucoes.Commands;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Identificacao.Domain.Exceptions;
using Identificacao.Domain.Interfaces;
using Moq;

namespace Identificacao.Tests.Application;

public class CriarExecucaoCommandHandlerTests
{
    private readonly Mock<IExecucaoRepository> _execucaoRepoMock = new();
    private readonly Mock<ICaptacaoRepository> _captacaoRepoMock = new();
    private readonly Mock<ITipoUtilizacaoRepository> _tipoUtilizacaoRepoMock = new();
    private readonly Mock<ICadastroHttpClient> _cadastroClientMock = new();
    private readonly CriarExecucaoCommandHandler _handler;

    public CriarExecucaoCommandHandlerTests()
    {
        _handler = new CriarExecucaoCommandHandler(
            _execucaoRepoMock.Object,
            _captacaoRepoMock.Object,
            _tipoUtilizacaoRepoMock.Object,
            _cadastroClientMock.Object);
    }

    private Captacao CriarCaptacaoAberta(Guid analistaId, bool exigeClassificacao)
    {
        var rubrica = Rubrica.Criar(Guid.NewGuid(), "TST", "Teste", exigeClassificacao);
        var captacao = Captacao.Criar(rubrica.Id, new DateOnly(2026, 1, 1), "Emissora XYZ", analistaId, "João");
        // Reflection para setar Rubrica
        typeof(Captacao).GetProperty("Rubrica")!.SetValue(captacao, rubrica);
        return captacao;
    }

    [Fact]
    public async Task Handle_ObraLiberada_StatusIdentificada()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacaoAberta(analistaId, false);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var obraId = Guid.NewGuid();
        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(obraId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ObraResumoDto(obraId, "Minha Obra", "BR-123", "LIBERADA"));

        var command = new CriarExecucaoCommand(
            captacao.Id, obraId, null, new TimeOnly(12, 0), new TimeOnly(12, 5), 1, null, null, analistaId);

        var result = await _handler.HandleAsync(command, CancellationToken.None);

        result.Status.Should().Be("Identificada");
        _execucaoRepoMock.Verify(r => r.AddAsync(It.IsAny<Execucao>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_ObraPendente_StatusPendente()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacaoAberta(analistaId, false);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var obraId = Guid.NewGuid();
        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(obraId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ObraResumoDto(obraId, "Minha Obra", null, "PENDENTE"));

        var command = new CriarExecucaoCommand(
            captacao.Id, obraId, null, new TimeOnly(12, 0), new TimeOnly(12, 5), 1, null, null, analistaId);

        var result = await _handler.HandleAsync(command, CancellationToken.None);

        result.Status.Should().Be("Pendente");
    }

    [Fact]
    public async Task Handle_RubricaAudiovisualSemTipoUtilizacao_LancaDomainException()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacaoAberta(analistaId, true);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var command = new CriarExecucaoCommand(
            captacao.Id, Guid.NewGuid(), null, new TimeOnly(12, 0), new TimeOnly(12, 5), 1, null, "Programa", analistaId);

        Func<Task> act = async () => await _handler.HandleAsync(command, CancellationToken.None);
        await act.Should().ThrowAsync<DomainException>().WithMessage("Tipo de Utilização é obrigatório para esta rubrica.");
    }

    [Fact]
    public async Task Handle_RubricaAudiovisualSemTituloPrograma_LancaDomainException()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacaoAberta(analistaId, true);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var command = new CriarExecucaoCommand(
            captacao.Id, Guid.NewGuid(), null, new TimeOnly(12, 0), new TimeOnly(12, 5), 1, Guid.NewGuid(), "", analistaId);

        Func<Task> act = async () => await _handler.HandleAsync(command, CancellationToken.None);
        await act.Should().ThrowAsync<DomainException>().WithMessage("Título do Programa é obrigatório para rubricas audiovisuais.");
    }

    [Fact]
    public async Task Handle_RubricaNaoAudiovisualSemTipoUtilizacao_Permite()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacaoAberta(analistaId, false);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var obraId = Guid.NewGuid();
        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(obraId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ObraResumoDto(obraId, "Minha Obra", "BR-123", "LIBERADA"));

        var command = new CriarExecucaoCommand(
            captacao.Id, obraId, null, new TimeOnly(12, 0), new TimeOnly(12, 5), 1, null, null, analistaId);

        var result = await _handler.HandleAsync(command, CancellationToken.None);
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task Handle_CaptacaoFechada_LancaDomainException()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacaoAberta(analistaId, false);
        typeof(Captacao).GetProperty("Status")!.SetValue(captacao, StatusCaptacao.Fechada);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var command = new CriarExecucaoCommand(
            captacao.Id, Guid.NewGuid(), null, new TimeOnly(12, 0), new TimeOnly(12, 5), 1, null, null, analistaId);

        Func<Task> act = async () => await _handler.HandleAsync(command, CancellationToken.None);
        await act.Should().ThrowAsync<DomainException>().WithMessage("Apenas captações ABERTAS podem receber execuções.");
    }

    [Fact]
    public async Task Handle_OutroAnalista_LancaForbiddenException()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacaoAberta(analistaId, false);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var command = new CriarExecucaoCommand(
            captacao.Id, Guid.NewGuid(), null, new TimeOnly(12, 0), new TimeOnly(12, 5), 1, null, null, Guid.NewGuid());

        Func<Task> act = async () => await _handler.HandleAsync(command, CancellationToken.None);
        await act.Should().ThrowAsync<ForbiddenException>();
    }
}
