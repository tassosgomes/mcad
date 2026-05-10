using AwesomeAssertions;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Fonogramas.Commands;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using Moq;

namespace Cadastro.UnitTests.Fonogramas;

public class DepurarFonogramaCommandHandlerTests
{
    private readonly Mock<IFonogramaRepository> _repoMock;
    private readonly Mock<IOutboxEventWriter> _outboxMock;
    private readonly DepurarFonogramaCommandHandler _handler;

    public DepurarFonogramaCommandHandlerTests()
    {
        _repoMock = new Mock<IFonogramaRepository>();
        _outboxMock = new Mock<IOutboxEventWriter>();
        _handler = new DepurarFonogramaCommandHandler(
            _repoMock.Object,
            _outboxMock.Object,
            Mock.Of<IFonogramaAuditPublisher>());
    }

    [Fact]
    public async Task Handle_DeveDepurarFonograma_QuandoLiberado()
    {
        var original = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "BR", null, null);
        var obra = ObraMusical.Criar("Música 1", TipoObra.Musical, null, "Rock");
        var propObra = typeof(Fonograma).GetProperty("Obra");
        propObra?.SetValue(original, obra);
        
        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(original, StatusFonograma.Liberado);

        var command = new DepurarFonogramaCommand(original.Id, "USXYZ2300002", "USA", null, null);

        _repoMock.Setup(repo => repo.GetByIdAsync(original.Id, default)).ReturnsAsync(original);
        _repoMock.Setup(repo => repo.ExisteIsrcAsync("USXYZ2300002", original.Id, default)).ReturnsAsync(false);

        var result = await _handler.HandleAsync(command, default);

        result.Should().NotBeNull();
        result.FonogramaDepurado.Status.Should().Be("DEPURADO");
        result.NovoFonograma.Isrc.Should().Be("USXYZ2300002");
        result.NovoFonograma.Status.Should().Be("PENDENTE_VALIDACAO");

        _repoMock.Verify(repo => repo.AddAsync(It.IsAny<Fonograma>(), default), Times.Once);
        _repoMock.Verify(repo => repo.Update(original), Times.Once);
        _repoMock.Verify(repo => repo.SaveChangesAsync(default), Times.Once);
    }

    [Fact]
    public async Task Handle_NaoLiberado_DeveLancarConflictException()
    {
        var original = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "BR", null, null);
        var obra = ObraMusical.Criar("Música 1", TipoObra.Musical, null, "Rock");
        var propObra = typeof(Fonograma).GetProperty("Obra");
        propObra?.SetValue(original, obra);

        var command = new DepurarFonogramaCommand(original.Id, "USXYZ2300002", "USA", null, null);

        _repoMock.Setup(repo => repo.GetByIdAsync(original.Id, default)).ReturnsAsync(original);

        var action = async () => await _handler.HandleAsync(command, default);

        await action.Should().ThrowAsync<ConflictException>().WithMessage("Apenas fonogramas LIBERADOS podem ser depurados.");
    }
}
