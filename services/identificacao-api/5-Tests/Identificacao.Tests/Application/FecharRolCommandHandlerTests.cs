using FluentAssertions;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Application.Fechamento.Commands;
using Identificacao.Application.Fechamento.Queries;
using Identificacao.Application.Fechamento.Responses;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Exceptions;
using Identificacao.Domain.Interfaces;
using MediatR;
using Moq;

namespace Identificacao.Tests.Application;

public class FecharRolCommandHandlerTests
{
    private readonly Mock<ICaptacaoRepository> _captacaoRepoMock;
    private readonly Mock<IExecucaoRepository> _execucaoRepoMock;
    private readonly Mock<IOutboxEventWriter> _outboxWriterMock;
    private readonly Mock<IRequestHandler<ValidarPreRequisitosQuery, PreRequisitosResponse>> _preReqHandlerMock;
    private readonly FecharRolCommandHandler _handler;

    public FecharRolCommandHandlerTests()
    {
        _captacaoRepoMock = new Mock<ICaptacaoRepository>();
        _execucaoRepoMock = new Mock<IExecucaoRepository>();
        _outboxWriterMock = new Mock<IOutboxEventWriter>();
        _preReqHandlerMock = new Mock<IRequestHandler<ValidarPreRequisitosQuery, PreRequisitosResponse>>();

        _handler = new FecharRolCommandHandler(
            _captacaoRepoMock.Object, _execucaoRepoMock.Object, _outboxWriterMock.Object, _preReqHandlerMock.Object);
    }

    private Captacao CriarCaptacao(Guid analistaId, bool fechada = false, bool exigeClassificacao = false)
    {
        var rubricaId = Guid.NewGuid();
        var rubrica = Rubrica.Criar(rubricaId, exigeClassificacao ? "TV" : "RADIO", "Geral", exigeClassificacao);
        
        var captacao = Captacao.Criar(rubricaId, new DateOnly(2023, 10, 1), "User", analistaId, "Analista");
        var propertyInfo = typeof(Captacao).GetProperty("Rubrica");
        propertyInfo!.SetValue(captacao, rubrica);

        if (fechada) captacao.Fechar();
        
        return captacao;
    }

    [Fact]
    public async Task Handle_TodosPreReqOk_FechaComOutboxEvent()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacao(analistaId);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var okResponse = new PreRequisitosResponse(captacao.Id, true, new List<PreRequisitoItem>(), null!);
        _preReqHandlerMock.Setup(h => h.Handle(It.IsAny<ValidarPreRequisitosQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(okResponse);
        
        _execucaoRepoMock.Setup(r => r.ListarTodasDaCaptacaoAsync(captacao.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Execucao>());

        var cmd = new FecharRolCommand(captacao.Id, analistaId);
        var result = await _handler.Handle(cmd, CancellationToken.None);

        result.Sucesso.Should().BeTrue();
        result.Status.Should().Be("FECHADA");
        _outboxWriterMock.Verify(w => w.AddEvent("identificacao.rol.fechado", captacao.Id.ToString(), It.IsAny<object>()), Times.Once);
        _captacaoRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_ComPendentes_RejeitaComCode()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacao(analistaId);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var badResponse = new PreRequisitosResponse(captacao.Id, false, new List<PreRequisitoItem> {
            new("zero_pendentes", "Zero pendentes", false, "Detalhes")
        }, null!);

        _preReqHandlerMock.Setup(h => h.Handle(It.IsAny<ValidarPreRequisitosQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(badResponse);

        var cmd = new FecharRolCommand(captacao.Id, analistaId);
        var act = () => _handler.Handle(cmd, CancellationToken.None);

        var ex = await act.Should().ThrowAsync<PreRequisitosException>();
        ex.Which.Code.Should().Be("zero_pendentes");
    }

    [Fact]
    public async Task Handle_OutroAnalista_LancaForbidden()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacao(analistaId);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var cmd = new FecharRolCommand(captacao.Id, Guid.NewGuid()); // Diferente
        var act = () => _handler.Handle(cmd, CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>(); // ValidarPropriedade throws DomainException
    }

    [Fact]
    public async Task Handle_CaptacaoJaFechada_Rejeita()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacao(analistaId, fechada: true);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var cmd = new FecharRolCommand(captacao.Id, analistaId);
        var act = () => _handler.Handle(cmd, CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>(); // ValidarAberta throws DomainException
    }

    [Fact]
    public async Task Handle_PayloadAudiovisual_IncluiTempoPeso()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacao(analistaId, exigeClassificacao: true);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var okResponse = new PreRequisitosResponse(captacao.Id, true, new List<PreRequisitoItem>(), null!);
        _preReqHandlerMock.Setup(h => h.Handle(It.IsAny<ValidarPreRequisitosQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(okResponse);

        var tipo = TipoUtilizacao.Criar(Guid.NewGuid(), "T1", "Tipo1", 100);
        var execucao = Execucao.Criar(captacao.Id, Guid.NewGuid(), null, "Obra", null, null, "Int", new TimeOnly(1,0), new TimeOnly(2,0), 1, tipo.Id, null, Identificacao.Domain.Enums.StatusExecucao.Identificada);
        
        // Use reflection to set TipoUtilizacao since it's a navigation property
        var tipoProp = typeof(Execucao).GetProperty("TipoUtilizacao");
        tipoProp!.SetValue(execucao, tipo);

        _execucaoRepoMock.Setup(r => r.ListarTodasDaCaptacaoAsync(captacao.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Execucao> { execucao });

        var cmd = new FecharRolCommand(captacao.Id, analistaId);
        var result = await _handler.Handle(cmd, CancellationToken.None);

        _outboxWriterMock.Verify(w => w.AddEvent("identificacao.rol.fechado", captacao.Id.ToString(), 
            It.Is<object>(o => ((Identificacao.Application.Fechamento.Payloads.RolFechadoPayload)o).Execucoes.ElementAt(0).Peso == 100)), Times.Once);
    }

    [Fact]
    public async Task Handle_PayloadAudio_CamposNull()
    {
        var analistaId = Guid.NewGuid();
        var captacao = CriarCaptacao(analistaId, exigeClassificacao: false);
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var okResponse = new PreRequisitosResponse(captacao.Id, true, new List<PreRequisitoItem>(), null!);
        _preReqHandlerMock.Setup(h => h.Handle(It.IsAny<ValidarPreRequisitosQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(okResponse);

        var execucao = Execucao.Criar(captacao.Id, Guid.NewGuid(), null, "Obra1", null, null, "Int", new TimeOnly(1,0), new TimeOnly(2,0), 1, null, null, Identificacao.Domain.Enums.StatusExecucao.Identificada);

        _execucaoRepoMock.Setup(r => r.ListarTodasDaCaptacaoAsync(captacao.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Execucao> { execucao });

        var cmd = new FecharRolCommand(captacao.Id, analistaId);
        var result = await _handler.Handle(cmd, CancellationToken.None);

        _outboxWriterMock.Verify(w => w.AddEvent("identificacao.rol.fechado", captacao.Id.ToString(), 
            It.Is<object>(o => ((Identificacao.Application.Fechamento.Payloads.RolFechadoPayload)o).Execucoes.ElementAt(0).Peso == null)), Times.Once);
    }
}
