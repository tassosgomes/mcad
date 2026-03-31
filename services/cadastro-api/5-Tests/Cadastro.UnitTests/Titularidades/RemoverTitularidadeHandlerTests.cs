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
    private readonly RemoverTitularidadeCommandHandler _handler;

    public RemoverTitularidadeHandlerTests()
    {
        _titularidadeRepoMock = new Mock<ITitularidadeRepository>();
        _obraRepoMock = new Mock<IObraRepository>();
        _handler = new RemoverTitularidadeCommandHandler(_titularidadeRepoMock.Object, _obraRepoMock.Object);
    }

    [Fact]
    public async Task HandleAsync_ProcessoValido_DeveRetornarResponse()
    {
        var obraId = Guid.NewGuid();
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        typeof(ObraMusical).GetProperty("Id")!.SetValue(obra, obraId);

        var titularidade = TitularidadeAutoral.Criar(obraId, Guid.NewGuid(), CategoriaAutoral.Autor, 10.0m);
        var command = new RemoverTitularidadeCommand(obraId, titularidade.Id);

        _obraRepoMock.Setup(r => r.GetByIdAsync(obraId, It.IsAny<CancellationToken>())).ReturnsAsync(obra);
        _titularidadeRepoMock.Setup(r => r.GetByIdAsync(titularidade.Id, It.IsAny<CancellationToken>())).ReturnsAsync(titularidade);
        _titularidadeRepoMock.Setup(r => r.GetByObraIdAsync(obraId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<TitularidadeAutoral>()); // Removed element

        var act = async () => await _handler.HandleAsync(command, CancellationToken.None);
        
        var result = await act.Should().NotThrowAsync();
        result.Subject.Should().BeOfType<TitularidadesResponse>();
        _titularidadeRepoMock.Verify(r => r.Delete(It.IsAny<TitularidadeAutoral>()), Times.Once);
        _titularidadeRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
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
