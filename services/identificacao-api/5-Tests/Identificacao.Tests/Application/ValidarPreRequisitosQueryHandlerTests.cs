using FluentAssertions;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Application.Fechamento.Queries;
using Identificacao.Application.Fechamento.Responses;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Interfaces;
using Moq;

namespace Identificacao.Tests.Application;

public class ValidarPreRequisitosQueryHandlerTests
{
    private readonly Mock<ICaptacaoRepository> _captacaoRepoMock;
    private readonly Mock<IExecucaoRepository> _execucaoRepoMock;
    private readonly Mock<ICadastroHttpClient> _cadastroClientMock;
    private readonly ValidarPreRequisitosQueryHandler _handler;

    public ValidarPreRequisitosQueryHandlerTests()
    {
        _captacaoRepoMock = new Mock<ICaptacaoRepository>();
        _execucaoRepoMock = new Mock<IExecucaoRepository>();
        _cadastroClientMock = new Mock<ICadastroHttpClient>();
        _handler = new ValidarPreRequisitosQueryHandler(
            _captacaoRepoMock.Object, _execucaoRepoMock.Object, _cadastroClientMock.Object);
    }

    private Captacao CriarCaptacao(bool exigeClassificacao)
    {
        var rubricaId = Guid.NewGuid();
        var rubrica = Rubrica.Criar(rubricaId, exigeClassificacao ? "TV" : "RADIO", "Geral", exigeClassificacao);
        
        var captacao = Captacao.Criar(rubricaId, new DateOnly(2023, 10, 1), Guid.NewGuid(), "User", Guid.NewGuid(), "Analista");
        var propertyInfo = typeof(Captacao).GetProperty("Rubrica");
        propertyInfo!.SetValue(captacao, rubrica);
        
        return captacao;
    }

    [Fact]
    public async Task Handle_TodosAtendidos_RetornaTrue()
    {
        var captacao = CriarCaptacao(exigeClassificacao: true);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        
        _execucaoRepoMock.Setup(r => r.ContarPorCaptacaoAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(10);
        _execucaoRepoMock.Setup(r => r.ContarPendentesAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(0);
        _execucaoRepoMock.Setup(r => r.ListarTodasDaCaptacaoAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(new List<Execucao>());
        _execucaoRepoMock.Setup(r => r.ContarSemTipoUtilizacaoAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(0);
        _execucaoRepoMock.Setup(r => r.ContarSemHorarioAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(0);

        var query = new ValidarPreRequisitosQuery(captacao.Id);
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        result.TodosAtendidos.Should().BeTrue();
        result.Itens.Should().HaveCount(5);
    }

    [Fact]
    public async Task Handle_ZeroExecucoes_MinExecucoesFalha()
    {
        var captacao = CriarCaptacao(exigeClassificacao: false);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        
        _execucaoRepoMock.Setup(r => r.ContarPorCaptacaoAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(0);

        var query = new ValidarPreRequisitosQuery(captacao.Id);
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        result.TodosAtendidos.Should().BeFalse();
        result.Itens.Should().ContainSingle(i => i.Id == "min_execucoes" && !i.Atendido);
    }

    [Fact]
    public async Task Handle_3Pendentes_ZeroPendentesFalha()
    {
        var captacao = CriarCaptacao(exigeClassificacao: false);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        
        _execucaoRepoMock.Setup(r => r.ContarPorCaptacaoAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(10);
        _execucaoRepoMock.Setup(r => r.ContarPendentesAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(3);

        var query = new ValidarPreRequisitosQuery(captacao.Id);
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        result.TodosAtendidos.Should().BeFalse();
        result.Itens.Should().ContainSingle(i => i.Id == "zero_pendentes" && !i.Atendido);
    }

    [Fact]
    public async Task Handle_AudiovisualSemTipoUtilizacao_ClassificacaoFalha()
    {
        var captacao = CriarCaptacao(exigeClassificacao: true);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        
        _execucaoRepoMock.Setup(r => r.ContarPorCaptacaoAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(10);
        _execucaoRepoMock.Setup(r => r.ContarSemTipoUtilizacaoAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(2);

        var query = new ValidarPreRequisitosQuery(captacao.Id);
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        result.TodosAtendidos.Should().BeFalse();
        result.Itens.Should().ContainSingle(i => i.Id == "classificacao" && !i.Atendido);
    }

    [Fact]
    public async Task Handle_AudiovisualSemHorario_HorariosFalha()
    {
        var captacao = CriarCaptacao(exigeClassificacao: true);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        
        _execucaoRepoMock.Setup(r => r.ContarPorCaptacaoAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(10);
        _execucaoRepoMock.Setup(r => r.ContarSemHorarioAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(5);

        var query = new ValidarPreRequisitosQuery(captacao.Id);
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        result.TodosAtendidos.Should().BeFalse();
        result.Itens.Should().ContainSingle(i => i.Id == "horarios" && !i.Atendido);
    }

    [Fact]
    public async Task Handle_NaoAudiovisual_Itens4e5NaoAparecem()
    {
        var captacao = CriarCaptacao(exigeClassificacao: false);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        
        _execucaoRepoMock.Setup(r => r.ContarPorCaptacaoAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(10);
        _execucaoRepoMock.Setup(r => r.ContarPendentesAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(0);
        _execucaoRepoMock.Setup(r => r.ListarTodasDaCaptacaoAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(new List<Execucao>());

        var query = new ValidarPreRequisitosQuery(captacao.Id);
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        result.Itens.Should().HaveCount(3);
        result.Itens.Should().NotContain(i => i.Id == "classificacao");
        result.Itens.Should().NotContain(i => i.Id == "horarios");
        result.TodosAtendidos.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_ObraPendenteNoCadastro_ObrasLiberadasFalha()
    {
        var captacao = CriarCaptacao(exigeClassificacao: false);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        _execucaoRepoMock.Setup(r => r.ContarPorCaptacaoAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(1);
        
        var execucao = Execucao.Criar(captacao.Id, Guid.NewGuid(), null, "Obra", null, null, "Interprete", new TimeOnly(1,0), new TimeOnly(2,0), 1, null, null, Identificacao.Domain.Enums.StatusExecucao.Identificada);
        _execucaoRepoMock.Setup(r => r.ListarTodasDaCaptacaoAsync(captacao.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Execucao> { execucao });

        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ObraResumoDto(Guid.NewGuid(), "Obra", "Iswc", "PENDENTE"));

        var query = new ValidarPreRequisitosQuery(captacao.Id);
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        result.TodosAtendidos.Should().BeFalse();
        result.Itens.Should().ContainSingle(i => i.Id == "obras_liberadas" && !i.Atendido);
    }

    // ───────────── Cobertura faltante ─────────────

    [Fact]
    public async Task Handle_CaptacaoInexistente_LancaNotFoundException()
    {
        var captacaoId = Guid.NewGuid();
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacaoId, It.IsAny<CancellationToken>())).ReturnsAsync((Captacao?)null);

        var query = new ValidarPreRequisitosQuery(captacaoId);

        Func<Task> act = () => _handler.HandleAsync(query, CancellationToken.None);
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task Handle_FonogramaNaoLiberado_ObrasLiberadasFalha()
    {
        var captacao = CriarCaptacao(exigeClassificacao: false);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        _execucaoRepoMock.Setup(r => r.ContarPorCaptacaoAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(1);

        var fonogramaId = Guid.NewGuid();
        var execucao = Execucao.Criar(captacao.Id, Guid.NewGuid(), fonogramaId, "Obra", "BR-1", null, "Int", new TimeOnly(1, 0), new TimeOnly(2, 0), 1, null, null, Identificacao.Domain.Enums.StatusExecucao.Identificada);
        _execucaoRepoMock.Setup(r => r.ListarTodasDaCaptacaoAsync(captacao.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Execucao> { execucao });

        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ObraResumoDto(execucao.ObraId, "Obra", "Iswc", "LIBERADO"));
        _cadastroClientMock.Setup(c => c.GetFonogramaByIdAsync(fonogramaId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FonogramaResumoDto(fonogramaId, execucao.ObraId, "Fono", "BR-1", null, "PENDENTE"));

        var query = new ValidarPreRequisitosQuery(captacao.Id);
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        result.TodosAtendidos.Should().BeFalse();
        result.Itens.Should().ContainSingle(i => i.Id == "obras_liberadas" && !i.Atendido);
    }

    [Fact]
    public async Task Handle_CadastroHttpFalha_ObraContaComoNaoLiberada()
    {
        var captacao = CriarCaptacao(exigeClassificacao: false);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        _execucaoRepoMock.Setup(r => r.ContarPorCaptacaoAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(1);

        var execucao = Execucao.Criar(captacao.Id, Guid.NewGuid(), null, "Obra", null, null, "Int", new TimeOnly(1, 0), new TimeOnly(2, 0), 1, null, null, Identificacao.Domain.Enums.StatusExecucao.Identificada);
        _execucaoRepoMock.Setup(r => r.ListarTodasDaCaptacaoAsync(captacao.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Execucao> { execucao });

        _cadastroClientMock.Setup(c => c.GetObraByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("Cadastro indisponível"));

        var query = new ValidarPreRequisitosQuery(captacao.Id);
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        result.TodosAtendidos.Should().BeFalse();
        result.Itens.Should().ContainSingle(i => i.Id == "obras_liberadas" && !i.Atendido);
    }

    [Fact]
    public async Task Handle_ResumoFechamento_CalculaIdentificadasERetornaContratoCompleto()
    {
        var captacao = CriarCaptacao(exigeClassificacao: true);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        _execucaoRepoMock.Setup(r => r.ContarPorCaptacaoAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(10);
        _execucaoRepoMock.Setup(r => r.ContarPendentesAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(2);
        _execucaoRepoMock.Setup(r => r.ListarTodasDaCaptacaoAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(new List<Execucao>());

        var query = new ValidarPreRequisitosQuery(captacao.Id);
        var result = await _handler.HandleAsync(query, CancellationToken.None);

        result.Resumo.Should().NotBeNull();
        result.Resumo.TotalExecucoes.Should().Be(10);
        result.Resumo.Identificadas.Should().Be(8);
        result.Resumo.Pendentes.Should().Be(2);
        result.Resumo.RubricaNome.Should().Be("Geral");
        result.Resumo.Periodo.Should().Be(captacao.Periodo);
        result.Resumo.ExigeClassificacao.Should().BeTrue();
    }
}
