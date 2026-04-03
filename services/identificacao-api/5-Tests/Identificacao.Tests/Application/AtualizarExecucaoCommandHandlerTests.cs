using FluentAssertions;
using Identificacao.Application.Execucoes.Commands;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
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
            _cadastroClientMock.Object);
    }

    private Captacao CriarCaptacaoAberta(Guid analistaId)
    {
        var rubrica = Rubrica.Criar(Guid.NewGuid(), "TST", "Teste", false);
        var captacao = Captacao.Criar(rubrica.Id, new DateOnly(2026, 1, 1), "Emissora XYZ", analistaId, "João");
        typeof(Captacao).GetProperty("Rubrica")!.SetValue(captacao, rubrica);
        return captacao;
    }

    [Fact]
    public async Task Handle_AlteraObra_RecalculaStatus()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacaoAberta(analistaId);
        
        var execucao = Execucao.Criar(
            captacao.Id, Guid.NewGuid(), null, "Tit", null, null, "", 
            new TimeOnly(12, 0), new TimeOnly(12, 5), 1, null, null, StatusExecucao.Pendente);

        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        _execucaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, execucao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(execucao);

        var novaObraId = Guid.NewGuid();
        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(novaObraId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ObraResumoDto(novaObraId, "Novo Titulo", "BR-999", "LIBERADA"));

        var command = new AtualizarExecucaoCommand(
            captacao.Id, execucao.Id, novaObraId, null, new TimeOnly(12,0), new TimeOnly(12, 5), 1, null, null, analistaId);

        var result = await _handler.HandleAsync(command, CancellationToken.None);

        result.Status.Should().Be("Identificada");
        result.ObraTitulo.Should().Be("Novo Titulo");
    }
}
