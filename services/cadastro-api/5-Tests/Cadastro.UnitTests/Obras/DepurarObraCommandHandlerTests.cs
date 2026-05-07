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

public class DepurarObraCommandHandlerTests
{
    private readonly Mock<IObraRepository> _repoMock;
    private readonly Mock<ITitularidadeRepository> _titularidadeRepoMock;
    private readonly Mock<IOutboxEventWriter> _outboxMock;
    private readonly Mock<IObraAuditPublisher> _auditMock;
    private readonly DepurarObraCommandHandler _handler;

    public DepurarObraCommandHandlerTests()
    {
        _repoMock = new Mock<IObraRepository>();
        _titularidadeRepoMock = new Mock<ITitularidadeRepository>();
        _outboxMock = new Mock<IOutboxEventWriter>();
        _auditMock = new Mock<IObraAuditPublisher>();
        _handler = new DepurarObraCommandHandler(
            _repoMock.Object,
            _titularidadeRepoMock.Object,
            _outboxMock.Object,
            _auditMock.Object);
    }

    [Fact]
    public async Task HandleAsync_Liberada_DeveDepurarOriginalECriarNovaTransacional()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        obra.AtribuirIswc("T-123"); // becomes Liberado
        var titularidadeOriginal = TitularidadeAutoral.Criar(obra.Id, Guid.NewGuid(), CategoriaAutoral.Autor, 100.0m);

        _repoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);
        _titularidadeRepoMock
            .Setup(r => r.GetByObraIdAsync(obra.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync([titularidadeOriginal]);

        var command = new DepurarObraCommand(obra.Id, "Novo Teste", "MUSICAL", "Sub", "Pop");
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        obra.Status.Should().Be(StatusObra.Depurada);
        
        _repoMock.Verify(r => r.AddAsync(It.IsAny<ObraMusical>(), It.IsAny<CancellationToken>()), Times.Once);
        _titularidadeRepoMock.Verify(r => r.AddAsync(
            It.Is<TitularidadeAutoral>(t =>
                t.ObraId == result.NovaObra.Id &&
                t.TitularId == titularidadeOriginal.TitularId &&
                t.Categoria == titularidadeOriginal.Categoria &&
                t.Percentual == titularidadeOriginal.Percentual),
            It.IsAny<CancellationToken>()), Times.Once);
        _repoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        _auditMock.Verify(a => a.PublishAsync(
            obra,
            ObraAuditOperation.Depurate,
            It.IsAny<IReadOnlyDictionary<string, object?>?>(),
            It.IsAny<CancellationToken>()), Times.Once);
        _auditMock.Verify(a => a.PublishAsync(
            It.Is<ObraMusical>(o => o.Id == result.NovaObra.Id),
            ObraAuditOperation.Create,
            null,
            It.IsAny<CancellationToken>()), Times.Once);

        result.ObraDepurada.Status.Should().Be("DEPURADA");
        result.NovaObra.Status.Should().Be("PENDENTE");
    }

    [Fact]
    public async Task HandleAsync_Pendente_DeveLancarConflictException()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical); // Pendente
        _repoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);
        _titularidadeRepoMock
            .Setup(r => r.GetByObraIdAsync(obra.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var command = new DepurarObraCommand(obra.Id, "Novo", "MUSICAL", null, null);

        var act = () => _handler.HandleAsync(command, CancellationToken.None);
        await act.Should().ThrowAsync<ConflictException>().WithMessage("Apenas obras LIBERADAS podem ser depuradas.");
        _auditMock.Verify(a => a.PublishAsync(
            It.IsAny<ObraMusical>(),
            It.IsAny<ObraAuditOperation>(),
            It.IsAny<IReadOnlyDictionary<string, object?>?>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }
}
