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

public class ExcluirObraCommandHandlerTests
{
    private readonly Mock<IObraRepository> _repoMock;
    private readonly Mock<IObraAuditPublisher> _auditMock;
    private readonly ExcluirObraCommandHandler _handler;

    public ExcluirObraCommandHandlerTests()
    {
        _repoMock = new Mock<IObraRepository>();
        _auditMock = new Mock<IObraAuditPublisher>();
        _handler = new ExcluirObraCommandHandler(_repoMock.Object, _auditMock.Object);
    }

    [Fact]
    public async Task HandleAsync_ObrasDepuradas_LancaConflictException()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        obra.AtribuirIswc("T-123");
        obra.Depurar(Guid.NewGuid());
        _repoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);

        var command = new ExcluirObraCommand(obra.Id);

        var act = () => _handler.HandleAsync(command, CancellationToken.None);
        await act.Should().ThrowAsync<ConflictException>();
        _auditMock.Verify(a => a.PublishAsync(
            It.IsAny<ObraMusical>(),
            It.IsAny<ObraAuditOperation>(),
            It.IsAny<IReadOnlyDictionary<string, object?>?>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_PossuiVinculos_LancaConflictException()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        _repoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);
        _repoMock.Setup(r => r.PossuiVinculosAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var command = new ExcluirObraCommand(obra.Id);

        var act = () => _handler.HandleAsync(command, CancellationToken.None);
        await act.Should()
            .ThrowAsync<ConflictException>()
            .WithMessage("Obra não pode ser excluída pois possui titularidades autorais vinculadas.");
        _auditMock.Verify(a => a.PublishAsync(
            It.IsAny<ObraMusical>(),
            It.IsAny<ObraAuditOperation>(),
            It.IsAny<IReadOnlyDictionary<string, object?>?>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }
}
