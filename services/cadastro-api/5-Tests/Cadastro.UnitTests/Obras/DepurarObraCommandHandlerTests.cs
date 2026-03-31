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
    private readonly DepurarObraCommandHandler _handler;

    public DepurarObraCommandHandlerTests()
    {
        _repoMock = new Mock<IObraRepository>();
        _handler = new DepurarObraCommandHandler(_repoMock.Object);
    }

    [Fact]
    public async Task HandleAsync_Liberada_DeveDepurarOriginalECriarNovaTransacional()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        obra.AtribuirIswc("T-123"); // becomes Liberado
        _repoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);

        var command = new DepurarObraCommand(obra.Id, "Novo Teste", "MUSICAL", "Sub", "Pop");
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        obra.Status.Should().Be(StatusObra.Depurada);
        
        _repoMock.Verify(r => r.AddAsync(It.IsAny<ObraMusical>(), It.IsAny<CancellationToken>()), Times.Once);
        _repoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);

        result.ObraDepurada.Status.Should().Be("DEPURADA");
        result.NovaObra.Status.Should().Be("PENDENTE");
    }

    [Fact]
    public async Task HandleAsync_Pendente_DeveLancarConflictException()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical); // Pendente
        _repoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);

        var command = new DepurarObraCommand(obra.Id, "Novo", "MUSICAL", null, null);

        var act = () => _handler.HandleAsync(command, CancellationToken.None);
        await act.Should().ThrowAsync<ConflictException>().WithMessage("Apenas obras LIBERADAS podem ser depuradas.");
    }
}
