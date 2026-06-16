using FluentAssertions;
using Identificacao.Application.Captacoes.Commands;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Identidade;
using Identificacao.Domain.Interfaces;
using Microsoft.Extensions.Logging;
using Moq;

namespace Identificacao.Tests.Application;

public class ReprocessarResponsaveisDesconhecidosCommandHandlerTests
{
    private readonly Mock<ICaptacaoRepository> _captacaoRepoMock;
    private readonly Mock<IUsuarioIdentidadeRepository> _usuarioRepoMock;
    private readonly Mock<ILogger<ReprocessarResponsaveisDesconhecidosCommandHandler>> _loggerMock;
    private readonly ReprocessarResponsaveisDesconhecidosCommandHandler _handler;

    public ReprocessarResponsaveisDesconhecidosCommandHandlerTests()
    {
        _captacaoRepoMock = new Mock<ICaptacaoRepository>();
        _usuarioRepoMock = new Mock<IUsuarioIdentidadeRepository>();
        _loggerMock = new Mock<ILogger<ReprocessarResponsaveisDesconhecidosCommandHandler>>();
        _handler = new ReprocessarResponsaveisDesconhecidosCommandHandler(
            _captacaoRepoMock.Object,
            _usuarioRepoMock.Object,
            _loggerMock.Object);
    }

    private static UsuarioIdentidade CriarUsuario(string logtoUserId, string displayName)
    {
        return new UsuarioIdentidade
        {
            LogtoUserId = logtoUserId,
            DisplayName = displayName,
            Username = logtoUserId,
            IsSuspended = false
        };
    }

    [Fact]
    public async Task Handle_CorrigeApenasDesconhecidoComIdCasavel()
    {
        var analistaId = AnalistaIdentificador.FromSubject("user-1");
        var captacao1 = Captacao.Criar(Guid.NewGuid(), DateOnly.FromDateTime(DateTime.UtcNow),
            Guid.NewGuid(), "Usuário", analistaId, "Desconhecido");
        var captacao2 = Captacao.Criar(Guid.NewGuid(), DateOnly.FromDateTime(DateTime.UtcNow),
            Guid.NewGuid(), "Usuário", Guid.NewGuid(), "Desconhecido");

        var captacoes = new List<Captacao> { captacao1, captacao2 };
        var usuarios = new List<UsuarioIdentidade> { CriarUsuario("user-1", "João Silva") };

        _captacaoRepoMock
            .Setup(r => r.ListarPorNomeResponsavelAsync("Desconhecido", It.IsAny<CancellationToken>()))
            .ReturnsAsync(captacoes);
        _usuarioRepoMock
            .Setup(r => r.ListarTodosAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(usuarios);

        var result = await _handler.HandleAsync(
            new ReprocessarResponsaveisDesconhecidosCommand(), CancellationToken.None);

        result.TotalAnalisadas.Should().Be(2);
        result.TotalCorrigidas.Should().Be(1);
        captacao1.AnalistaResponsavelNome.Should().Be("João Silva");
        captacao2.AnalistaResponsavelNome.Should().Be("Desconhecido");
        captacao1.AnalistaResponsavelId.Should().Be(analistaId);

        _captacaoRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_IgnoraSemCorrespondencia_SemException()
    {
        var captacoes = new List<Captacao>
        {
            Captacao.Criar(Guid.NewGuid(), DateOnly.FromDateTime(DateTime.UtcNow),
                Guid.NewGuid(), "Usuário", Guid.NewGuid(), "Desconhecido")
        };
        var usuarios = new List<UsuarioIdentidade> { CriarUsuario("user-x", "Maria") };

        _captacaoRepoMock
            .Setup(r => r.ListarPorNomeResponsavelAsync("Desconhecido", It.IsAny<CancellationToken>()))
            .ReturnsAsync(captacoes);
        _usuarioRepoMock
            .Setup(r => r.ListarTodosAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(usuarios);

        var result = await _handler.HandleAsync(
            new ReprocessarResponsaveisDesconhecidosCommand(), CancellationToken.None);

        result.TotalAnalisadas.Should().Be(1);
        result.TotalCorrigidas.Should().Be(0);
        captacoes[0].AnalistaResponsavelNome.Should().Be("Desconhecido");
    }

    [Fact]
    public async Task Handle_Idempotente_SegundaExecucaoZeroCorrigidas()
    {
        var analistaId = AnalistaIdentificador.FromSubject("user-1");
        var captacao = Captacao.Criar(Guid.NewGuid(), DateOnly.FromDateTime(DateTime.UtcNow),
            Guid.NewGuid(), "Usuário", analistaId, "Desconhecido");
        var usuarios = new List<UsuarioIdentidade> { CriarUsuario("user-1", "João Silva") };

        _captacaoRepoMock
            .Setup(r => r.ListarPorNomeResponsavelAsync("Desconhecido", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Captacao> { captacao });
        _usuarioRepoMock
            .Setup(r => r.ListarTodosAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(usuarios);

        var result1 = await _handler.HandleAsync(
            new ReprocessarResponsaveisDesconhecidosCommand(), CancellationToken.None);
        result1.TotalCorrigidas.Should().Be(1);
        captacao.AnalistaResponsavelNome.Should().Be("João Silva");

        _captacaoRepoMock
            .Setup(r => r.ListarPorNomeResponsavelAsync("Desconhecido", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Captacao>());

        var result2 = await _handler.HandleAsync(
            new ReprocessarResponsaveisDesconhecidosCommand(), CancellationToken.None);
        result2.TotalAnalisadas.Should().Be(0);
        result2.TotalCorrigidas.Should().Be(0);
    }

    [Fact]
    public async Task Handle_ResolveResponsavelSuspenso()
    {
        var analistaId = AnalistaIdentificador.FromSubject("suspended-user");
        var captacao = Captacao.Criar(Guid.NewGuid(), DateOnly.FromDateTime(DateTime.UtcNow),
            Guid.NewGuid(), "Usuário", analistaId, "Desconhecido");
        var usuarios = new List<UsuarioIdentidade>
        {
            new UsuarioIdentidade
            {
                LogtoUserId = "suspended-user",
                DisplayName = "Carlos Suspenso",
                Username = "suspended-user",
                IsSuspended = true
            }
        };

        _captacaoRepoMock
            .Setup(r => r.ListarPorNomeResponsavelAsync("Desconhecido", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Captacao> { captacao });
        _usuarioRepoMock
            .Setup(r => r.ListarTodosAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(usuarios);

        var result = await _handler.HandleAsync(
            new ReprocessarResponsaveisDesconhecidosCommand(), CancellationToken.None);

        result.TotalAnalisadas.Should().Be(1);
        result.TotalCorrigidas.Should().Be(1);
        captacao.AnalistaResponsavelNome.Should().Be("Carlos Suspenso");
    }
}
