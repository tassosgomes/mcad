using Cadastro.Application.Common.Authorization;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Titularidades.Commands;
using Cadastro.Application.Titularidades.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;
using FluentAssertions;
using Moq;
using Xunit;

namespace Cadastro.UnitTests.Titularidades;

public class RemoverTitularidadeHandlerTests
{
    private readonly Mock<ITitularidadeRepository> _titularidadeRepoMock;
    private readonly Mock<IObraRepository> _obraRepoMock;
    private readonly Mock<ITitularidadeAuditPublisher> _auditPublisherMock;
    private readonly RemoverTitularidadeCommandHandler _handler;

    public RemoverTitularidadeHandlerTests()
    {
        _titularidadeRepoMock = new Mock<ITitularidadeRepository>();
        _obraRepoMock = new Mock<IObraRepository>();
        _auditPublisherMock = new Mock<ITitularidadeAuditPublisher>();
        _handler = new RemoverTitularidadeCommandHandler(
            _titularidadeRepoMock.Object,
            _obraRepoMock.Object,
            _auditPublisherMock.Object,
            Mock.Of<ICurrentUserPermissions>(p => p.Has(CadastroPermissionNames.TitularVerCpfCompleto)));
    }

    [Fact]
    public async Task HandleAsync_ObraLiberada_DeveLancarDepuracaoNecessariaException()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        obra.AtribuirIswc("T-1234");
        _obraRepoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);

        var command = new RemoverTitularidadeCommand(obra.Id, Guid.NewGuid());
        var act = () => _handler.HandleAsync(command, CancellationToken.None);
        await act.Should().ThrowAsync<DepuracaoNecessariaException>();
    }
}
