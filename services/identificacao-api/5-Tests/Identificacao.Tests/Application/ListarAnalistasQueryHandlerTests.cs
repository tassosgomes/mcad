using FluentAssertions;
using Identificacao.Application.Captacoes.Responses;
using Identificacao.Application.Identidade.Queries;
using Identificacao.Domain.Identidade;
using Identificacao.Domain.Interfaces;
using Moq;

namespace Identificacao.Tests.Application;

public class ListarAnalistasQueryHandlerTests
{
    private readonly Mock<IUsuarioIdentidadeRepository> _repoMock;
    private readonly ListarAnalistasQueryHandler _handler;

    public ListarAnalistasQueryHandlerTests()
    {
        _repoMock = new Mock<IUsuarioIdentidadeRepository>();
        _handler = new ListarAnalistasQueryHandler(_repoMock.Object);
    }

    [Fact]
    public async Task Handle_RetornaApenasAtivos()
    {
        var usuarios = new List<UsuarioIdentidade>
        {
            new() { LogtoUserId = "ativo-1", DisplayName = "Ativo Um", IsSuspended = false, DeletedAtUtc = null },
            new() { LogtoUserId = "suspenso-1", DisplayName = "Suspenso Um", IsSuspended = true, DeletedAtUtc = null },
            new() { LogtoUserId = "excluido-1", DisplayName = "Excluido Um", IsSuspended = false, DeletedAtUtc = DateTime.UtcNow },
        };

        _repoMock.Setup(r => r.ListarAtivosAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(usuarios.Where(u => !u.IsSuspended && u.DeletedAtUtc == null).ToList());

        var result = await _handler.HandleAsync(new ListarAnalistasQuery(), CancellationToken.None);

        result.Should().HaveCount(1);
        result.Single().Nome.Should().Be("Ativo Um");
    }

    [Fact]
    public async Task Handle_OrdenadoPorNome()
    {
        var usuarios = new List<UsuarioIdentidade>
        {
            new() { LogtoUserId = "joao", DisplayName = "Joao" },
            new() { LogtoUserId = "maria", DisplayName = "maria" },
            new() { LogtoUserId = "ana", DisplayName = "Ana" },
        };

        _repoMock.Setup(r => r.ListarAtivosAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(usuarios);

        var result = await _handler.HandleAsync(new ListarAnalistasQuery(), CancellationToken.None);

        result.Select(a => a.Nome).Should().Equal("Ana", "Joao", "maria");
    }

    [Fact]
    public async Task Handle_IdCalculadoViaAnalistaIdentificador_FromSubject()
    {
        var logtoId = "usuario-subject-123";
        var expectedGuid = AnalistaIdentificador.FromSubject(logtoId);

        var usuarios = new List<UsuarioIdentidade>
        {
            new() { LogtoUserId = logtoId, DisplayName = "Usuario Teste" },
        };

        _repoMock.Setup(r => r.ListarAtivosAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(usuarios);

        var result = await _handler.HandleAsync(new ListarAnalistasQuery(), CancellationToken.None);

        result.Single().Id.Should().Be(expectedGuid);
    }

    [Fact]
    public async Task Handle_AplicaFallbackNomeExibicao()
    {
        var usuarios = new List<UsuarioIdentidade>
        {
            new() { LogtoUserId = "sem-display", Username = "joao", Email = "joao@exemplo.com", DisplayName = null },
            new() { LogtoUserId = "sem-username", Username = null, Email = "maria@exemplo.com", DisplayName = null },
        };

        _repoMock.Setup(r => r.ListarAtivosAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(usuarios);

        var result = await _handler.HandleAsync(new ListarAnalistasQuery(), CancellationToken.None);

        result.Should().HaveCount(2);
        result.First().Nome.Should().Be("joao");
        result.Last().Nome.Should().Be("maria@exemplo.com");
    }

    [Fact]
    public async Task Handle_ListaVazia_RetornaArrayVazio()
    {
        _repoMock.Setup(r => r.ListarAtivosAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<UsuarioIdentidade>());

        var result = await _handler.HandleAsync(new ListarAnalistasQuery(), CancellationToken.None);

        result.Should().BeEmpty();
    }
}
