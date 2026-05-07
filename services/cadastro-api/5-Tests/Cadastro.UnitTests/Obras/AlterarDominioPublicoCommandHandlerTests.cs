using Cadastro.Application.Audit;
using Cadastro.Application.Obras.Commands;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using FluentAssertions;
using Moq;
using Xunit;

namespace Cadastro.UnitTests.Obras;

public class AlterarDominioPublicoCommandHandlerTests
{
    private readonly Mock<IObraRepository> _repoMock;
    private readonly Mock<IOutboxEventWriter> _outboxMock;
    private readonly Mock<IObraAuditPublisher> _auditMock;
    private readonly AlterarDominioPublicoCommandHandler _handler;

    public AlterarDominioPublicoCommandHandlerTests()
    {
        _repoMock = new Mock<IObraRepository>();
        _outboxMock = new Mock<IOutboxEventWriter>();
        _auditMock = new Mock<IObraAuditPublisher>();
        _handler = new AlterarDominioPublicoCommandHandler(_repoMock.Object, _outboxMock.Object, _auditMock.Object);
    }

    [Fact]
    public async Task HandleAsync_MarcarComoDP_MudaStatus()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical); // Pendente
        _repoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);

        var command = new AlterarDominioPublicoCommand(obra.Id, true);
        var res = await _handler.HandleAsync(command, CancellationToken.None);

        res.Status.Should().Be("DOMINIO_PUBLICO");
        res.DominioPublico.Should().BeTrue();
        _repoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        _auditMock.Verify(a => a.PublishAsync(
            obra,
            ObraAuditOperation.SetPublicDomain,
            It.IsAny<IReadOnlyDictionary<string, object?>?>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_RemoverDP_RestauraPendente()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical); 
        obra.MarcarDominioPublico(true);
        _repoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);

        var command = new AlterarDominioPublicoCommand(obra.Id, false);
        var res = await _handler.HandleAsync(command, CancellationToken.None);

        res.Status.Should().Be("PENDENTE");
        res.DominioPublico.Should().BeFalse();
        _auditMock.Verify(a => a.PublishAsync(
            obra,
            ObraAuditOperation.SetPublicDomain,
            It.IsAny<IReadOnlyDictionary<string, object?>?>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }
}
