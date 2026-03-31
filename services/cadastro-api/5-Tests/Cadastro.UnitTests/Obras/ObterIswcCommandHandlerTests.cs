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

public class ObterIswcCommandHandlerTests
{
    private readonly Mock<IObraRepository> _repoMock;
    private readonly Mock<IIswcService> _iswcMock;
    private readonly Mock<ITitularidadeRepository> _titularidadeRepoMock;
    private readonly ObterIswcCommandHandler _handler;

    public ObterIswcCommandHandlerTests()
    {
        _repoMock = new Mock<IObraRepository>();
        _iswcMock = new Mock<IIswcService>();
        _titularidadeRepoMock = new Mock<ITitularidadeRepository>();
        _handler = new ObterIswcCommandHandler(_repoMock.Object, _iswcMock.Object, _titularidadeRepoMock.Object);
    }

    [Fact]
    public async Task HandleAsync_Pendente_SemTitulares_DeveLancarDomainException422()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        _repoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);
        _titularidadeRepoMock.Setup(r => r.GetByObraIdAsync(obra.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<TitularidadeAutoral>());

        var command = new ObterIswcCommand(obra.Id);
        var act = () => _handler.HandleAsync(command, CancellationToken.None);
        
        await act.Should().ThrowAsync<DomainException>();
    }

    [Fact]
    public async Task HandleAsync_NaoPendente_DeveLancarDomainException()
    {
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        obra.AtribuirIswc("T-123"); // turns to Liberado
        _repoMock.Setup(r => r.GetByIdAsync(obra.Id, It.IsAny<CancellationToken>())).ReturnsAsync(obra);

        var command = new ObterIswcCommand(obra.Id);
        var act = () => _handler.HandleAsync(command, CancellationToken.None);
        
        await act.Should().ThrowAsync<DomainException>().WithMessage("ISWC só pode ser solicitado para obras PENDENTES.");
    }
}
