using Cadastro.Application.Titularidades.Queries;
using Cadastro.Application.Titularidades.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using FluentAssertions;
using Moq;
using Xunit;

namespace Cadastro.UnitTests.Titularidades;

public class ListarTitularidadesHandlerTests
{
    private readonly Mock<ITitularidadeRepository> _titularidadeRepoMock;
    private readonly Mock<IObraRepository> _obraRepoMock;
    private readonly ListarTitularidadesQueryHandler _handler;

    public ListarTitularidadesHandlerTests()
    {
        _titularidadeRepoMock = new Mock<ITitularidadeRepository>();
        _obraRepoMock = new Mock<IObraRepository>();
        _handler = new ListarTitularidadesQueryHandler(_titularidadeRepoMock.Object, _obraRepoMock.Object);
    }

    [Fact]
    public async Task HandleAsync_ProcessoValido_DeveRetornarResponse()
    {
        var obraId = Guid.NewGuid();
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        typeof(ObraMusical).GetProperty("Id")!.SetValue(obra, obraId);

        var titular1 = Titular.CriarPessoaFisica("Nome PF1", Cpf.Create("12345678909"), "BR", Guid.NewGuid());
        var titular2 = Titular.CriarPessoaFisica("Nome PF2", Cpf.Create("98765432100"), "BR", Guid.NewGuid());
        
        var t1 = TitularidadeAutoral.Criar(obraId, titular1.Id, CategoriaAutoral.Autor, 50.0m);
        var t2 = TitularidadeAutoral.Criar(obraId, titular2.Id, CategoriaAutoral.Autor, 50.0m);
        
        // Atribui o Titular via reflection para simular o Include do EF
        typeof(TitularidadeAutoral).GetProperty("Titular")!.SetValue(t1, titular1);
        typeof(TitularidadeAutoral).GetProperty("Titular")!.SetValue(t2, titular2);

        _obraRepoMock.Setup(r => r.GetByIdAsync(obraId, It.IsAny<CancellationToken>())).ReturnsAsync(obra);
        _titularidadeRepoMock.Setup(r => r.GetByObraIdAsync(obraId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<TitularidadeAutoral> { t1, t2 });

        var query = new ListarTitularidadesQuery(obraId);
        
        var result = await _handler.HandleAsync(query, CancellationToken.None);
        
        result.Should().BeOfType<TitularidadesResponse>();
        result.SomaPercentual.Should().Be(100.0m);
        result.SomaCompleta.Should().BeTrue();
        result.Titularidades.Should().HaveCount(2);
    }

    [Fact]
    public async Task HandleAsync_ObraSemTitulares_DeveRetornarSomaZero()
    {
        var obraId = Guid.NewGuid();
        var obra = ObraMusical.Criar("Teste", TipoObra.Musical);
        typeof(ObraMusical).GetProperty("Id")!.SetValue(obra, obraId);

        _obraRepoMock.Setup(r => r.GetByIdAsync(obraId, It.IsAny<CancellationToken>())).ReturnsAsync(obra);
        _titularidadeRepoMock.Setup(r => r.GetByObraIdAsync(obraId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<TitularidadeAutoral>());

        var query = new ListarTitularidadesQuery(obraId);
        
        var result = await _handler.HandleAsync(query, CancellationToken.None);
        
        result.Should().BeOfType<TitularidadesResponse>();
        result.SomaPercentual.Should().Be(0m);
        result.SomaCompleta.Should().BeFalse();
        result.Titularidades.Should().BeEmpty();
    }
}
