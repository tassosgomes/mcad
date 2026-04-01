using AwesomeAssertions;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Fonogramas.Commands;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Moq;

namespace Cadastro.UnitTests.Fonogramas;

public class CriarFonogramaCommandHandlerTests
{
    private readonly Mock<IFonogramaRepository> _fonogramaRepoMock;
    private readonly Mock<IObraRepository> _obraRepoMock;
    private readonly CriarFonogramaCommandHandler _handler;

    public CriarFonogramaCommandHandlerTests()
    {
        _fonogramaRepoMock = new Mock<IFonogramaRepository>();
        _obraRepoMock = new Mock<IObraRepository>();
        _handler = new CriarFonogramaCommandHandler(_fonogramaRepoMock.Object, _obraRepoMock.Object);
    }

    [Fact]
    public async Task Handle_ComDadosValidos_DeveRetornarCriado()
    {
        var command = new CriarFonogramaCommand("BRXYZ2300001", Guid.NewGuid(), "BR", null, null);
        var obra = ObraMusical.Criar("Música 1", TipoObra.Musical, null, "Rock");
        _obraRepoMock.Setup(repo => repo.GetByIdAsync(command.ObraId, default)).ReturnsAsync(obra);
        _fonogramaRepoMock.Setup(repo => repo.ExisteIsrcAsync("BRXYZ2300001", default)).ReturnsAsync(false);

        var result = await _handler.HandleAsync(command, default);

        result.Should().NotBeNull();
        result.Isrc.Should().Be("BRXYZ2300001");
        result.Status.Should().Be("PENDENTE_VALIDACAO");

        _fonogramaRepoMock.Verify(repo => repo.AddAsync(It.IsAny<Fonograma>(), default), Times.Once);
        _fonogramaRepoMock.Verify(repo => repo.SaveChangesAsync(default), Times.Once);
    }

    [Fact]
    public async Task Handle_ComIsrcDuplicado_DeveLancarConflictException()
    {
        var command = new CriarFonogramaCommand("BRXYZ2300001", Guid.NewGuid(), "BR", null, null);
        _fonogramaRepoMock.Setup(repo => repo.ExisteIsrcAsync("BRXYZ2300001", default)).ReturnsAsync(true);

        var action = async () => await _handler.HandleAsync(command, default);

        await action.Should().ThrowAsync<ConflictException>().WithMessage("*Já existe um fonograma com o ISRC*");
    }

    [Fact]
    public async Task Handle_ObraNaoEncontrada_DeveLancarNotFoundException()
    {
        var command = new CriarFonogramaCommand("BRXYZ2300001", Guid.NewGuid(), "BR", null, null);
        _fonogramaRepoMock.Setup(repo => repo.ExisteIsrcAsync("BRXYZ2300001", default)).ReturnsAsync(false);
        _obraRepoMock.Setup(repo => repo.GetByIdAsync(command.ObraId, default)).ReturnsAsync((ObraMusical?)null);

        var action = async () => await _handler.HandleAsync(command, default);

        await action.Should().ThrowAsync<NotFoundException>();
    }
}
