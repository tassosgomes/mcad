using FluentAssertions;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Application.Captacoes.Commands;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Exceptions;
using Identificacao.Domain.Interfaces;
using Moq;

namespace Identificacao.Tests.Application;

public class AtualizarCaptacaoCommandHandlerTests
{
    private readonly Mock<ICaptacaoRepository> _captacaoRepoMock;
    private readonly Mock<IRubricaRepository> _rubricaRepoMock;
    private readonly AtualizarCaptacaoCommandHandler _handler;

    public AtualizarCaptacaoCommandHandlerTests()
    {
        _captacaoRepoMock = new Mock<ICaptacaoRepository>();
        _rubricaRepoMock = new Mock<IRubricaRepository>();
        _handler = new AtualizarCaptacaoCommandHandler(
            _captacaoRepoMock.Object,
            _rubricaRepoMock.Object,
            Mock.Of<IIdentificacaoAuditPublisher>());
    }

    [Fact]
    public async Task Handle_CaptacaoAberta_AtualizaDados()
    {
        var analistaId = Guid.NewGuid();
        var rubricaId = Guid.NewGuid();
        var rubrica = Rubrica.Criar(rubricaId, "RADIO", "Rádio", false);
        var novoRubricaId = Guid.NewGuid();
        var novaRubrica = Rubrica.Criar(novoRubricaId, "TV", "TV", false);
        
        var captacao = Captacao.Criar(rubricaId, new DateOnly(2023, 10, 1), Guid.NewGuid(), "User", analistaId, "Nome");
        
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        _rubricaRepoMock.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new List<Rubrica> { rubrica, novaRubrica });
        _captacaoRepoMock.Setup(r => r.ContarExecucoesAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(0);

        var novoUsuarioMusicaId = Guid.NewGuid();
        var cmd = new AtualizarCaptacaoCommand(captacao.Id, novoRubricaId, new DateOnly(2023, 11, 1), novoUsuarioMusicaId, "Novo User", analistaId);

        var response = await _handler.HandleAsync(cmd, CancellationToken.None);

        response.Should().NotBeNull();
        captacao.RubricaId.Should().Be(novoRubricaId);
        captacao.Periodo.Should().Be(new DateOnly(2023, 11, 1));
        captacao.UsuarioMusicaId.Should().Be(novoUsuarioMusicaId);
        captacao.UsuarioMusicaNome.Should().Be("Novo User");
        _captacaoRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_CaptacaoFechada_LancaDomainException()
    {
        var analistaId = Guid.NewGuid();
        var captacao = Captacao.Criar(Guid.NewGuid(), new DateOnly(2023, 10, 1), Guid.NewGuid(), "User", analistaId, "Nome");
        // Reflection ou workaround para fechar captação, pois só há factory
        var prop = typeof(Captacao).GetProperty("Status");
        prop!.SetValue(captacao, Identificacao.Domain.Enums.StatusCaptacao.Fechada);

        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var cmd = new AtualizarCaptacaoCommand(captacao.Id, Guid.NewGuid(), new DateOnly(2023, 11, 1), Guid.NewGuid(), "Novo", analistaId);

        var act = () => _handler.HandleAsync(cmd, CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>();
    }

    [Fact]
    public async Task Handle_OutroAnalista_LancaForbiddenException()
    {
        var analistaOriginal = Guid.NewGuid();
        var outroAnalista = Guid.NewGuid();
        var captacao = Captacao.Criar(Guid.NewGuid(), new DateOnly(2023, 10, 1), Guid.NewGuid(), "User", analistaOriginal, "Nome");

        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var cmd = new AtualizarCaptacaoCommand(captacao.Id, Guid.NewGuid(), new DateOnly(2023, 11, 1), Guid.NewGuid(), "Novo", outroAnalista);

        var act = () => _handler.HandleAsync(cmd, CancellationToken.None);

        await act.Should().ThrowAsync<ForbiddenException>()
            .WithMessage("Apenas o analista responsável pode modificar esta captação.");
    }

    [Fact]
    public async Task Handle_AlteraRubricaComExecucoes_LancaConflictException()
    {
        var analistaId = Guid.NewGuid();
        var rubricaId = Guid.NewGuid();
        var novoRubricaId = Guid.NewGuid();
        var captacao = Captacao.Criar(rubricaId, new DateOnly(2023, 10, 1), Guid.NewGuid(), "User", analistaId, "Nome");

        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        _rubricaRepoMock.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new List<Rubrica> { 
            Rubrica.Criar(rubricaId, "OLD", "Old", false),
            Rubrica.Criar(novoRubricaId, "NEW", "New", false)
        });
        _captacaoRepoMock.Setup(r => r.ContarExecucoesAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(5);

        var cmd = new AtualizarCaptacaoCommand(captacao.Id, novoRubricaId, new DateOnly(2023, 10, 1), Guid.NewGuid(), "User", analistaId);

        var act = () => _handler.HandleAsync(cmd, CancellationToken.None);

        await act.Should().ThrowAsync<ConflictException>().WithMessage("*não é possível alterar a rubrica*");
    }

    [Fact]
    public async Task Handle_AlteraRubricaSemExecucoes_Permite()
    {
        var analistaId = Guid.NewGuid();
        var rubricaId = Guid.NewGuid();
        var novoRubricaId = Guid.NewGuid();
        var captacao = Captacao.Criar(rubricaId, new DateOnly(2023, 10, 1), Guid.NewGuid(), "User", analistaId, "Nome");

        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        _rubricaRepoMock.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new List<Rubrica> { 
            Rubrica.Criar(rubricaId, "OLD", "Old", false),
            Rubrica.Criar(novoRubricaId, "NEW", "New", false)
        });
        _captacaoRepoMock.Setup(r => r.ContarExecucoesAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(0);

        var cmd = new AtualizarCaptacaoCommand(captacao.Id, novoRubricaId, new DateOnly(2023, 10, 1), Guid.NewGuid(), "User", analistaId);

        await _handler.HandleAsync(cmd, CancellationToken.None);

        captacao.RubricaId.Should().Be(novoRubricaId);
    }

    [Fact]
    public async Task Handle_NovaCombinacaoDuplicada_LancaConflictException()
    {
        var analistaId = Guid.NewGuid();
        var rubricaId = Guid.NewGuid();
        var captacao = Captacao.Criar(rubricaId, new DateOnly(2023, 10, 1), Guid.NewGuid(), "User", analistaId, "Nome");

        var novaData = new DateOnly(2023, 11, 1);

        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        _rubricaRepoMock.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new List<Rubrica> { 
            Rubrica.Criar(rubricaId, "OLD", "Old", false)
        });
        _captacaoRepoMock.Setup(r => r.ContarExecucoesAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(0);
        _captacaoRepoMock.Setup(r => r.ExisteAtivaParaRubricaPeriodoAsync(rubricaId, novaData, captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var cmd = new AtualizarCaptacaoCommand(captacao.Id, rubricaId, novaData, Guid.NewGuid(), "User", analistaId);

        var act = () => _handler.HandleAsync(cmd, CancellationToken.None);

        var exception = await act.Should().ThrowAsync<ConflictException>()
            .WithMessage("*Já existe uma captação ativa*");
        exception.Which.ErrorCode.Should().Be("CAPTACAO_DUPLICADA");
    }
}
