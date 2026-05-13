using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using FluentAssertions;
using Xunit;

namespace Cadastro.UnitTests.Participacoes;

public class ParticipacaoConexaTests
{
    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    [InlineData(100.0001)]
    [InlineData(101)]
    public void DefinirPercentual_ValorInvalido_ThrowsDomainException(decimal invalido)
    {
        var p = ParticipacaoConexa.Criar(Guid.NewGuid(), Guid.NewGuid(), CategoriaConexo.Interprete);

        var act = () => p.DefinirPercentual(invalido);
        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void AjustarPercentualManual_Musico_ThrowsDomainException()
    {
        var p = ParticipacaoConexa.Criar(Guid.NewGuid(), Guid.NewGuid(), CategoriaConexo.MusicoExecutante);

        var act = () => p.AjustarPercentualManual(10.0m);

        act.Should().Throw<DomainException>()
            .WithMessage("*Músico Executante*");
    }

    [Theory]
    [InlineData(CategoriaConexo.Interprete, true)]
    [InlineData(CategoriaConexo.ProdutorFonografico, true)]
    [InlineData(CategoriaConexo.MusicoExecutante, false)]
    public void Editavel_DeveRefletirCategoria(CategoriaConexo categoria, bool esperado)
    {
        var p = ParticipacaoConexa.Criar(Guid.NewGuid(), Guid.NewGuid(), categoria);

        p.Editavel.Should().Be(esperado);
    }
}
