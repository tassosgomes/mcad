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

namespace Cadastro.UnitTests.Titularidades;

public class EditarTitularidadeHandlerTests
{
    private readonly Mock<ITitularidadeRepository> _titularidadeRepoMock;
    private readonly Mock<IObraRepository> _obraRepoMock;
    private readonly EditarTitularidadeCommandHandler _handler;

    public EditarTitularidadeHandlerTests()
    {
        _titularidadeRepoMock = new Mock<ITitularidadeRepository>();
        _obraRepoMock = new Mock<IObraRepository>();
        _handler = new EditarTitularidadeCommandHandler(_titularidadeRepoMock.Object, _obraRepoMock.Object);
    }

    [Fact]
    public async Task HandleAsync_ProcessoValido_DeveRetornarResponse()
    {
        var obraId = Guid.NewGuid();
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        // Set Id to match
        typeof(ObraMusical).GetProperty("Id")!.SetValue(obra, obraId);

        var titularidade = TitularidadeAutoral.Criar(obraId, Guid.NewGuid(), CategoriaAutoral.Autor, 10.0m);
        var titular = Titular.CriarPessoaFisica("Nome", Cpf.Create("12345678909"), "BR", Guid.NewGuid());
        typeof(TitularidadeAutoral).GetProperty("Titular")!.SetValue(titularidade, titular);

        var command = new EditarTitularidadeCommand(obraId, titularidade.Id, 20.0m);

        _obraRepoMock.Setup(r => r.GetByIdAsync(obraId, It.IsAny<CancellationToken>())).ReturnsAsync(obra);
        _titularidadeRepoMock.Setup(r => r.GetByIdAsync(titularidade.Id, It.IsAny<CancellationToken>())).ReturnsAsync(titularidade);
        _titularidadeRepoMock.Setup(r => r.GetByObraIdAsync(obraId, It.IsAny<CancellationToken>())).ReturnsAsync(new List<TitularidadeAutoral> { titularidade });

        var act = async () => await _handler.HandleAsync(command, CancellationToken.None);
        
        var result = await act.Should().NotThrowAsync();
        result.Subject.Should().BeOfType<TitularidadesResponse>();
        _titularidadeRepoMock.Verify(r => r.Update(It.IsAny<TitularidadeAutoral>()), Times.Once);
        _titularidadeRepoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
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
