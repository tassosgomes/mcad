using Cadastro.Application.Common.Authorization;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Titularidades.Commands;
using Cadastro.Application.Titularidades.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using FluentAssertions;
using Moq;
using Xunit;
using Cadastro.UnitTests;

namespace Cadastro.UnitTests.Titularidades;

public class EditarTitularidadeHandlerTests
{
    private readonly Mock<ITitularidadeRepository> _titularidadeRepoMock;
    private readonly Mock<IObraRepository> _obraRepoMock;
    private readonly Mock<ITitularidadeAuditPublisher> _auditPublisherMock;
    private readonly EditarTitularidadeCommandHandler _handler;

    public EditarTitularidadeHandlerTests()
    {
        _titularidadeRepoMock = new Mock<ITitularidadeRepository>();
        _obraRepoMock = new Mock<IObraRepository>();
        _auditPublisherMock = new Mock<ITitularidadeAuditPublisher>();
        _handler = new EditarTitularidadeCommandHandler(
            _titularidadeRepoMock.Object,
            _obraRepoMock.Object,
            _auditPublisherMock.Object,
            PermissionsTestHelper.With(true));
    }

    [Fact]
    public async Task HandleAsync_ObraLiberada_DeveLancarDepuracaoNecessariaException()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        obra.AtribuirIswc("T-1234");

        _obraRepoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);

        var command = new EditarTitularidadeCommand(obra.Id, Guid.NewGuid(), 20.0m);
        var act = () => _handler.HandleAsync(command, CancellationToken.None);
        await act.Should().ThrowAsync<DepuracaoNecessariaException>();
    }

    [Fact]
    public async Task HandleAsync_TitularidadeNaoEncontrada_DeveLancarNotFoundException()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        _obraRepoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);
        _titularidadeRepoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((TitularidadeAutoral)null!);

        var command = new EditarTitularidadeCommand(obra.Id, Guid.NewGuid(), 20.0m);
        var act = () => _handler.HandleAsync(command, CancellationToken.None);
        await act.Should().ThrowAsync<NotFoundException>();
    }
}
