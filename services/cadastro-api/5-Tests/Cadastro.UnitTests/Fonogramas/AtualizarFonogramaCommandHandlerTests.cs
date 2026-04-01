using AwesomeAssertions;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Fonogramas.Commands;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using Moq;

namespace Cadastro.UnitTests.Fonogramas;

public class AtualizarFonogramaCommandHandlerTests
{
    private readonly Mock<IFonogramaRepository> _repoMock;
    private readonly AtualizarFonogramaCommandHandler _handler;

    public AtualizarFonogramaCommandHandlerTests()
    {
        _repoMock = new Mock<IFonogramaRepository>();
        _handler = new AtualizarFonogramaCommandHandler(_repoMock.Object);
    }

    [Fact]
    public async Task Handle_FonogramaPendente_ComIsrcDiferente_DeveAtualizar()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "BR", null, null);
        var obra = ObraMusical.Criar("Música 1", TipoObra.Musical, null, "Rock");
        var propObra = typeof(Fonograma).GetProperty("Obra");
        propObra?.SetValue(fonograma, obra);

        var command = new AtualizarFonogramaCommand(fonograma.Id, "USXYZ2300002", "USA", null, null);
        
        _repoMock.Setup(repo => repo.GetByIdAsync(fonograma.Id, default)).ReturnsAsync(fonograma);
        _repoMock.Setup(repo => repo.ExisteIsrcAsync("USXYZ2300002", fonograma.Id, default)).ReturnsAsync(false);

        var result = await _handler.HandleAsync(command, default);

        result.Should().NotBeNull();
        result.Isrc.Should().Be("USXYZ2300002");
        _repoMock.Verify(repo => repo.Update(It.IsAny<Fonograma>()), Times.Once);
        _repoMock.Verify(repo => repo.SaveChangesAsync(default), Times.Once);
    }

    [Fact]
    public async Task Handle_FonogramaLiberado_ComIsrcDiferente_DeveLancarDepuracaoNecessariaException()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "BR", null, null);
        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(fonograma, StatusFonograma.Liberado);

        var command = new AtualizarFonogramaCommand(fonograma.Id, "USXYZ2300002", "USA", null, null);
        _repoMock.Setup(repo => repo.GetByIdAsync(fonograma.Id, default)).ReturnsAsync(fonograma);

        var action = async () => await _handler.HandleAsync(command, default);

        await action.Should().ThrowAsync<DepuracaoNecessariaException>();
    }

    [Fact]
    public async Task Handle_FonogramaLiberado_SomentePaisAlterado_DevePermitir()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "BR", null, null);
        var obra = ObraMusical.Criar("Música 1", TipoObra.Musical, null, "Rock");
        var propObra = typeof(Fonograma).GetProperty("Obra");
        propObra?.SetValue(fonograma, obra);

        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(fonograma, StatusFonograma.Liberado);

        var command = new AtualizarFonogramaCommand(fonograma.Id, "BRXYZ2300001", "USA", null, null);
        _repoMock.Setup(repo => repo.GetByIdAsync(fonograma.Id, default)).ReturnsAsync(fonograma);

        var result = await _handler.HandleAsync(command, default);

        result.PaisOrigem.Should().Be("USA");
        result.Isrc.Should().Be("BRXYZ2300001");
    }

    [Fact]
    public async Task Handle_FonogramaDepurado_DeveLancarDomainExceptionOuSemelhante_AoRequererEdicao()
    {
        // Se Depurado lança DomainException internamente ao chamar Atualizar (se houver a lógica) ou a logica está la.
        // Simulamos setando como DEPURADO
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "BR", null, null);
        var obra = ObraMusical.Criar("Música 1", TipoObra.Musical, null, "Rock");
        var propObra = typeof(Fonograma).GetProperty("Obra");
        propObra?.SetValue(fonograma, obra);
        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(fonograma, StatusFonograma.Depurado);

        var command = new AtualizarFonogramaCommand(fonograma.Id, "BRXYZ2300001", "USA", null, null);
        _repoMock.Setup(repo => repo.GetByIdAsync(fonograma.Id, default)).ReturnsAsync(fonograma);

        var action = async () => await _handler.HandleAsync(command, default);

        await action.Should().ThrowAsync<Cadastro.Domain.Exceptions.DomainException>().WithMessage("Fonogramas depurados não podem ser editados");
    }
}
