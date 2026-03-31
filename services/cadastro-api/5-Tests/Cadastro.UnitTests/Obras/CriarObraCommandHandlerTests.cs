using Cadastro.Application.Obras.Commands;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using FluentAssertions;
using Moq;
using Xunit;

namespace Cadastro.UnitTests.Obras;

public class CriarObraCommandHandlerTests
{
    private readonly Mock<IObraRepository> _repoMock;
    private readonly CriarObraCommandHandler _handler;

    public CriarObraCommandHandlerTests()
    {
        _repoMock = new Mock<IObraRepository>();
        _handler = new CriarObraCommandHandler(_repoMock.Object);
    }

    [Fact]
    public async Task HandleAsync_DeveCriarObraNoRepositorioERetornarPendente()
    {
        var command = new CriarObraCommand("My Song", "Remix", "MUSICAL", "Pop");

        var response = await _handler.HandleAsync(command, CancellationToken.None);

        _repoMock.Verify(r => r.AddAsync(It.Is<ObraMusical>(o => 
            o.Titulo == "My Song" && o.Tipo == TipoObra.Musical && o.Genero == "Pop"),
            It.IsAny<CancellationToken>()), Times.Once);
            
        _repoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);

        response.Should().NotBeNull();
        response.Titulo.Should().Be("My Song");
        response.Status.Should().Be("PENDENTE");
    }
}
