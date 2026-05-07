using Cadastro.Application.Audit;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Obras.Commands;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;
using FluentAssertions;
using Moq;
using Xunit;

namespace Cadastro.UnitTests.Obras;

public class AtualizarObraCommandHandlerTests
{
    private readonly Mock<IObraRepository> _repoMock;
    private readonly Mock<IObraAuditPublisher> _auditMock;
    private readonly AtualizarObraCommandHandler _handler;

    public AtualizarObraCommandHandlerTests()
    {
        _repoMock = new Mock<IObraRepository>();
        _auditMock = new Mock<IObraAuditPublisher>();
        _handler = new AtualizarObraCommandHandler(_repoMock.Object, _auditMock.Object);
    }

    [Fact]
    public async Task HandleAsync_ObraPendente_TituloDiferente_DeveAtualizarLivremente()
    {
        var obra = ObraMusical.Criar("Velho", TipoObra.Musical);
        _repoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);

        var command = new AtualizarObraCommand(obra.Id, "Novo", null, "MUSICAL", null);
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        result.Titulo.Should().Be("Novo");
        _repoMock.Verify(r => r.Update(obra), Times.Once);
        _repoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        _auditMock.Verify(a => a.PublishAsync(
            obra,
            ObraAuditOperation.Update,
            It.IsAny<IReadOnlyDictionary<string, object?>?>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ObraLiberada_TituloDiferente_DeveLancarDepuracaoNecessaria()
    {
        var obra = ObraMusical.Criar("Velho", TipoObra.Musical);
        obra.AtribuirIswc("T-111"); // becomes Liberado
        _repoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);

        var command = new AtualizarObraCommand(obra.Id, "Novo Titulo", null, "MUSICAL", null);

        var act = () => _handler.HandleAsync(command, CancellationToken.None);
        await act.Should().ThrowAsync<DepuracaoNecessariaException>();
        _auditMock.Verify(a => a.PublishAsync(
            It.IsAny<ObraMusical>(),
            It.IsAny<ObraAuditOperation>(),
            It.IsAny<IReadOnlyDictionary<string, object?>?>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ObraLiberada_GeneroDiferenteTituloIgual_DeveAtualizarSemDepurar()
    {
        var obra = ObraMusical.Criar("Velho", TipoObra.Musical, null, "Rock");
        obra.AtribuirIswc("T-111"); // becomes Liberado
        _repoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);

        var command = new AtualizarObraCommand(obra.Id, "Velho", null, "MUSICAL", "Jazz");
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        result.Genero.Should().Be("Jazz");
        _repoMock.Verify(r => r.Update(obra), Times.Once);
        _auditMock.Verify(a => a.PublishAsync(
            obra,
            ObraAuditOperation.Update,
            It.IsAny<IReadOnlyDictionary<string, object?>?>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ObraDepurada_DeveLancarStatusConflictException()
    {
        var obra = ObraMusical.Criar("Velho", TipoObra.Musical);
        obra.AtribuirIswc("T-111");
        obra.Depurar(Guid.NewGuid()); // becomes Depurada
        _repoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);

        var command = new AtualizarObraCommand(obra.Id, "Teste", null, "MUSICAL", "Rock");

        var act = () => _handler.HandleAsync(command, CancellationToken.None);
        await act.Should().ThrowAsync<StatusConflictException>().WithMessage("Obras depuradas não podem ser editadas");
    }
}
