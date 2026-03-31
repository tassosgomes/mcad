using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using FluentAssertions;
using Xunit;

namespace Cadastro.UnitTests.Titularidades;

public class TitularidadeAutoralTests
{
    [Fact]
    public void Criar_ValoresValidos_DeveCriarInstancia()
    {
        var obraId = Guid.NewGuid();
        var titularId = Guid.NewGuid();
        var titularidade = TitularidadeAutoral.Criar(obraId, titularId, CategoriaAutoral.Autor, 50.0m);

        titularidade.ObraId.Should().Be(obraId);
        titularidade.TitularId.Should().Be(titularId);
        titularidade.Categoria.Should().Be(CategoriaAutoral.Autor);
        titularidade.Percentual.Should().Be(50.0m);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(100.0001)]
    public void Criar_PercentualInvalido_DeveLancarDomainException(decimal percentual)
    {
        var act = () => TitularidadeAutoral.Criar(Guid.NewGuid(), Guid.NewGuid(), CategoriaAutoral.Autor, percentual);
        act.Should().Throw<DomainException>().WithMessage("Percentual deve estar entre 0.0001 e 100.0000");
    }

    [Fact]
    public void AlterarPercentual_ValorValido_DeveAtualizar()
    {
        var titularidade = TitularidadeAutoral.Criar(Guid.NewGuid(), Guid.NewGuid(), CategoriaAutoral.Autor, 50.0m);
        titularidade.AlterarPercentual(75.5m);
        titularidade.Percentual.Should().Be(75.5m);
    }

    [Fact]
    public void AlterarPercentual_ValorInvalido_DeveLancarDomainException()
    {
        var titularidade = TitularidadeAutoral.Criar(Guid.NewGuid(), Guid.NewGuid(), CategoriaAutoral.Autor, 50.0m);
        var act = () => titularidade.AlterarPercentual(200.0m);
        act.Should().Throw<DomainException>();
    }
}
