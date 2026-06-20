using FluentAssertions;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Application.Captacoes.Commands;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Identidade;
using Identificacao.Domain.Interfaces;
using Moq;

namespace Identificacao.Tests.Application;

public class CriarCaptacaoCommandHandlerTests
{
    private readonly Mock<ICaptacaoRepository> _captacaoRepoMock;
    private readonly Mock<IRubricaRepository> _rubricaRepoMock;
    private readonly Mock<IUsuarioIdentidadeRepository> _usuarioRepoMock;
    private readonly CriarCaptacaoCommandHandler _handler;

    public CriarCaptacaoCommandHandlerTests()
    {
        _captacaoRepoMock = new Mock<ICaptacaoRepository>();
        _rubricaRepoMock = new Mock<IRubricaRepository>();
        _usuarioRepoMock = new Mock<IUsuarioIdentidadeRepository>();
        _handler = new CriarCaptacaoCommandHandler(
            _captacaoRepoMock.Object,
            _rubricaRepoMock.Object,
            Mock.Of<IIdentificacaoAuditPublisher>(),
            _usuarioRepoMock.Object);
    }

    [Fact]
    public async Task Handle_DadosValidos_CriaCaptacaoAberta()
    {
        var rubricaId = Guid.NewGuid();
        var rubricas = new List<Rubrica> { Rubrica.Criar(rubricaId, "RADIO", "Rádio", false) };
        _rubricaRepoMock.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(rubricas);
        _captacaoRepoMock.Setup(r => r.ExisteAtivaParaRubricaPeriodoAsync(rubricaId, It.IsAny<DateOnly>(), null, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _usuarioRepoMock.Setup(r => r.BuscarPorSubjectAsync("test-subject", It.IsAny<CancellationToken>())).ReturnsAsync((UsuarioIdentidade?)null);

        var cmd = new CriarCaptacaoCommand(rubricaId, new DateOnly(2023, 10, 1), Guid.NewGuid(), "Usuário", Guid.NewGuid(), "test-subject", null);

        var response = await _handler.HandleAsync(cmd, CancellationToken.None);

        response.Should().NotBeNull();
        response.Status.Should().Be("Aberta");
        _captacaoRepoMock.Verify(r => r.AddAsync(It.IsAny<Captacao>(), It.IsAny<CancellationToken>()), Times.Once);
        _captacaoRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_RubricaPeriodoDuplicado_LancaConflictException()
    {
        var rubricaId = Guid.NewGuid();
        var rubricas = new List<Rubrica> { Rubrica.Criar(rubricaId, "RADIO", "Rádio", false) };
        _rubricaRepoMock.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(rubricas);
        _captacaoRepoMock.Setup(r => r.ExisteAtivaParaRubricaPeriodoAsync(rubricaId, It.IsAny<DateOnly>(), null, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var cmd = new CriarCaptacaoCommand(rubricaId, new DateOnly(2023, 10, 1), Guid.NewGuid(), "Usuário", Guid.NewGuid(), "test-subject", "claim-name");

        var act = () => _handler.HandleAsync(cmd, CancellationToken.None);

        var exception = await act.Should().ThrowAsync<ConflictException>();
        exception.Which.ErrorCode.Should().Be("CAPTACAO_DUPLICADA");
    }

    [Fact]
    public async Task Handle_RubricaInexistente_LancaNotFoundException()
    {
        _rubricaRepoMock.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new List<Rubrica>());

        var cmd = new CriarCaptacaoCommand(Guid.NewGuid(), new DateOnly(2023, 10, 1), Guid.NewGuid(), "Usuário", Guid.NewGuid(), "test-subject", "claim-name");

        var act = () => _handler.HandleAsync(cmd, CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task Handle_ProjecaoEncontrada_UsaNomeExibicao()
    {
        var rubricaId = Guid.NewGuid();
        var analistaId = Guid.NewGuid();
        var rubricas = new List<Rubrica> { Rubrica.Criar(rubricaId, "RADIO", "Rádio", false) };
        _rubricaRepoMock.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(rubricas);
        _captacaoRepoMock.Setup(r => r.ExisteAtivaParaRubricaPeriodoAsync(rubricaId, It.IsAny<DateOnly>(), null, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        var usuario = new UsuarioIdentidade
        {
            LogtoUserId = "subject-1",
            DisplayName = "João Silva",
            Username = "jsilva",
            Email = "jsilva@example.com"
        };
        _usuarioRepoMock.Setup(r => r.BuscarPorSubjectAsync("subject-1", It.IsAny<CancellationToken>())).ReturnsAsync(usuario);

        var cmd = new CriarCaptacaoCommand(rubricaId, new DateOnly(2023, 10, 1), Guid.NewGuid(), "Usuário", analistaId, "subject-1", "claim-name");

        var response = await _handler.HandleAsync(cmd, CancellationToken.None);

        response.AnalistaResponsavel.Nome.Should().Be("João Silva");
    }

    [Fact]
    public async Task Handle_SemProjecaoComClaim_UsaClaim()
    {
        var rubricaId = Guid.NewGuid();
        var analistaId = Guid.NewGuid();
        var rubricas = new List<Rubrica> { Rubrica.Criar(rubricaId, "RADIO", "Rádio", false) };
        _rubricaRepoMock.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(rubricas);
        _captacaoRepoMock.Setup(r => r.ExisteAtivaParaRubricaPeriodoAsync(rubricaId, It.IsAny<DateOnly>(), null, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _usuarioRepoMock.Setup(r => r.BuscarPorSubjectAsync("subject-2", It.IsAny<CancellationToken>())).ReturnsAsync((UsuarioIdentidade?)null);

        var cmd = new CriarCaptacaoCommand(rubricaId, new DateOnly(2023, 10, 1), Guid.NewGuid(), "Usuário", analistaId, "subject-2", "Maria Claim");

        var response = await _handler.HandleAsync(cmd, CancellationToken.None);

        response.AnalistaResponsavel.Nome.Should().Be("Maria Claim");
    }

    [Fact]
    public async Task Handle_SemProjecaoSemClaim_UsaDesconhecido()
    {
        var rubricaId = Guid.NewGuid();
        var analistaId = Guid.NewGuid();
        var rubricas = new List<Rubrica> { Rubrica.Criar(rubricaId, "RADIO", "Rádio", false) };
        _rubricaRepoMock.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(rubricas);
        _captacaoRepoMock.Setup(r => r.ExisteAtivaParaRubricaPeriodoAsync(rubricaId, It.IsAny<DateOnly>(), null, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _usuarioRepoMock.Setup(r => r.BuscarPorSubjectAsync("subject-3", It.IsAny<CancellationToken>())).ReturnsAsync((UsuarioIdentidade?)null);

        var cmd = new CriarCaptacaoCommand(rubricaId, new DateOnly(2023, 10, 1), Guid.NewGuid(), "Usuário", analistaId, "subject-3", null);

        var response = await _handler.HandleAsync(cmd, CancellationToken.None);

        response.AnalistaResponsavel.Nome.Should().Be("Desconhecido");
    }
}
