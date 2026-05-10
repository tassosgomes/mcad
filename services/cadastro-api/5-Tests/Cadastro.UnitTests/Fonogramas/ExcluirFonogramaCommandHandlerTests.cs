using AwesomeAssertions;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Fonogramas.Commands;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using Moq;

namespace Cadastro.UnitTests.Fonogramas;

public class ExcluirFonogramaCommandHandlerTests
{
    private readonly Mock<IFonogramaRepository> _repoMock;
    private readonly ExcluirFonogramaCommandHandler _handler;

    public ExcluirFonogramaCommandHandlerTests()
    {
        _repoMock = new Mock<IFonogramaRepository>();
        _handler = new ExcluirFonogramaCommandHandler(_repoMock.Object, Mock.Of<IFonogramaAuditPublisher>());
    }

    [Fact]
    public async Task Handle_FonogramaPendente_DeveExcluir()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "BR", null, null);
        var command = new ExcluirFonogramaCommand(fonograma.Id);

        _repoMock.Setup(repo => repo.GetByIdAsync(fonograma.Id, default)).ReturnsAsync(fonograma);

        var result = await _handler.HandleAsync(command, default);

        result.Should().BeTrue();
        _repoMock.Verify(repo => repo.Delete(fonograma), Times.Once);
        _repoMock.Verify(repo => repo.SaveChangesAsync(default), Times.Once);
    }

    [Fact]
    public async Task Handle_FonogramaLiberado_DeveLancarConflictException()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "BR", null, null);
        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(fonograma, StatusFonograma.Liberado);

        var command = new ExcluirFonogramaCommand(fonograma.Id);

        _repoMock.Setup(repo => repo.GetByIdAsync(fonograma.Id, default)).ReturnsAsync(fonograma);

        var action = async () => await _handler.HandleAsync(command, default);

        await action.Should().ThrowAsync<ConflictException>().WithMessage("Fonogramas liberados ou depurados não podem ser excluídos.");
    }

    [Fact]
    public async Task Handle_FonogramaNaoEncontrado_DeveLancarNotFoundException()
    {
        var command = new ExcluirFonogramaCommand(Guid.NewGuid());

        _repoMock.Setup(repo => repo.GetByIdAsync(command.Id, default)).ReturnsAsync((Fonograma?)null);

        var action = async () => await _handler.HandleAsync(command, default);

        await action.Should().ThrowAsync<NotFoundException>();
    }
}
