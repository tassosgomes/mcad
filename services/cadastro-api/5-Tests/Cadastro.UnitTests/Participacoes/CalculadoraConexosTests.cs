using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Services;
using FluentAssertions;

namespace Cadastro.UnitTests.Participacoes;

public class CalculadoraConexosTests
{
    private ParticipacaoConexa CriarParticipante(CategoriaConexo categoria)
    {
        return ParticipacaoConexa.Criar(Guid.NewGuid(), Guid.NewGuid(), categoria);
    }

    [Fact]
    public void Calcular_UmMusico_DeveDistribuirPercentualCompleto()
    {
        // Com 1 músico: Intérprete=43.7, Produtor=41.7, Músico=14.6 (FatiaMusicoCom / 1 = 14.6, sem resto)
        var participacoes = new List<ParticipacaoConexa>
        {
            CriarParticipante(CategoriaConexo.Interprete),
            CriarParticipante(CategoriaConexo.ProdutorFonografico),
            CriarParticipante(CategoriaConexo.MusicoExecutante)
        };

        CalculadoraConexos.Calcular(participacoes);

        participacoes.Single(p => p.Categoria == CategoriaConexo.MusicoExecutante)
            .Percentual.Should().Be(14.6m);
        participacoes.Sum(p => p.Percentual).Should().Be(100.0000m);
    }

    [Fact]
    public void Calcular_ComMusico_DeveDistribuir_43_7__41_7__14_6()
    {
        var participacoes = new List<ParticipacaoConexa>
        {
            CriarParticipante(CategoriaConexo.Interprete),
            CriarParticipante(CategoriaConexo.ProdutorFonografico),
            CriarParticipante(CategoriaConexo.MusicoExecutante)
        };

        CalculadoraConexos.Calcular(participacoes);

        participacoes[0].Percentual.Should().Be(43.7m);
        participacoes[1].Percentual.Should().Be(41.7m);
        participacoes[2].Percentual.Should().Be(14.6m);
        participacoes.Sum(p => p.Percentual).Should().Be(100.0000m);
    }

    [Fact]
    public void Calcular_SemMusico_DeveDistribuir_50__50()
    {
        var participacoes = new List<ParticipacaoConexa>
        {
            CriarParticipante(CategoriaConexo.Interprete),
            CriarParticipante(CategoriaConexo.ProdutorFonografico)
        };

        CalculadoraConexos.Calcular(participacoes);

        participacoes.Sum(p => p.Percentual).Should().Be(100.0000m);
        participacoes[0].Percentual.Should().Be(50.0m);
        participacoes[1].Percentual.Should().Be(50.0m);
    }

    [Fact]
    public void Calcular_Dueto_DeveDistribuirCorretamente()
    {
        var participacoes = new List<ParticipacaoConexa>
        {
            CriarParticipante(CategoriaConexo.Interprete),
            CriarParticipante(CategoriaConexo.Interprete),
            CriarParticipante(CategoriaConexo.ProdutorFonografico),
            CriarParticipante(CategoriaConexo.MusicoExecutante),
            CriarParticipante(CategoriaConexo.MusicoExecutante)
        };

        CalculadoraConexos.Calcular(participacoes);

        participacoes.Where(p => p.Categoria == CategoriaConexo.Interprete)
            .Select(p => p.Percentual).Should().AllBeEquivalentTo(21.85m);
        participacoes.Single(p => p.Categoria == CategoriaConexo.ProdutorFonografico)
            .Percentual.Should().Be(41.7m);
        participacoes.Where(p => p.Categoria == CategoriaConexo.MusicoExecutante)
            .Select(p => p.Percentual).Should().AllBeEquivalentTo(7.3m);
        participacoes.Sum(p => p.Percentual).Should().Be(100.0000m);
    }

    [Fact]
    public void Calcular_TresMusicos_ArredondamentoDiferenca_14_6()
    {
        var participacoes = new List<ParticipacaoConexa>
        {
            CriarParticipante(CategoriaConexo.Interprete),
            CriarParticipante(CategoriaConexo.ProdutorFonografico),
            CriarParticipante(CategoriaConexo.MusicoExecutante),
            CriarParticipante(CategoriaConexo.MusicoExecutante),
            CriarParticipante(CategoriaConexo.MusicoExecutante)
        };

        CalculadoraConexos.Calcular(participacoes);

        var musicos = participacoes.Where(p => p.Categoria == CategoriaConexo.MusicoExecutante).ToList();
        musicos[0].Percentual.Should().Be(4.8668m);
        musicos[1].Percentual.Should().Be(4.8666m);
        musicos[2].Percentual.Should().Be(4.8666m);
        musicos.Sum(p => p.Percentual).Should().Be(14.6m);
        participacoes.Sum(p => p.Percentual).Should().Be(100.0000m);
    }

    [Fact]
    public void Calcular_QuatroMusicos_SemDiferenca_14_6()
    {
        var participacoes = new List<ParticipacaoConexa>
        {
            CriarParticipante(CategoriaConexo.Interprete),
            CriarParticipante(CategoriaConexo.ProdutorFonografico),
            CriarParticipante(CategoriaConexo.MusicoExecutante),
            CriarParticipante(CategoriaConexo.MusicoExecutante),
            CriarParticipante(CategoriaConexo.MusicoExecutante),
            CriarParticipante(CategoriaConexo.MusicoExecutante)
        };

        CalculadoraConexos.Calcular(participacoes);

        var musicos = participacoes.Where(p => p.Categoria == CategoriaConexo.MusicoExecutante).ToList();
        musicos.Select(p => p.Percentual).Should().AllBeEquivalentTo(3.65m);
        musicos.Sum(p => p.Percentual).Should().Be(14.6m);
        participacoes.Sum(p => p.Percentual).Should().Be(100.0000m);
    }

    [Fact]
    public void Calcular_TresInterpretes_SemMusico_Arredondamento_50()
    {
        var participacoes = new List<ParticipacaoConexa>
        {
            CriarParticipante(CategoriaConexo.Interprete),
            CriarParticipante(CategoriaConexo.Interprete),
            CriarParticipante(CategoriaConexo.Interprete),
            CriarParticipante(CategoriaConexo.ProdutorFonografico)
        };

        CalculadoraConexos.Calcular(participacoes);

        var interpretes = participacoes.Where(p => p.Categoria == CategoriaConexo.Interprete).ToList();
        interpretes[0].Percentual.Should().Be(16.6668m);
        interpretes[1].Percentual.Should().Be(16.6666m);
        interpretes[2].Percentual.Should().Be(16.6666m);
        interpretes.Sum(p => p.Percentual).Should().Be(50.0m);
        participacoes.Sum(p => p.Percentual).Should().Be(100.0000m);
    }

    [Fact]
    public void Calcular_OneManBand_DeveRetornar100()
    {
        var titularId = Guid.NewGuid();
        var fonoId = Guid.NewGuid();
        var participacoes = new List<ParticipacaoConexa>
        {
            ParticipacaoConexa.Criar(fonoId, titularId, CategoriaConexo.Interprete),
            ParticipacaoConexa.Criar(fonoId, titularId, CategoriaConexo.ProdutorFonografico),
            ParticipacaoConexa.Criar(fonoId, titularId, CategoriaConexo.MusicoExecutante),
        };

        CalculadoraConexos.Calcular(participacoes);

        participacoes.Sum(p => p.Percentual).Should().Be(100.0000m);
    }

    [Fact]
    public void Calcular_SemInterprete_ThrowsException()
    {
        var participacoes = new List<ParticipacaoConexa>
        {
            CriarParticipante(CategoriaConexo.ProdutorFonografico)
        };

        var act = () => CalculadoraConexos.Calcular(participacoes);
        act.Should().Throw<DomainException>().WithMessage("*Intérprete*");
    }

    [Fact]
    public void Calcular_SemProdutor_ThrowsException()
    {
        var participacoes = new List<ParticipacaoConexa>
        {
            CriarParticipante(CategoriaConexo.Interprete)
        };

        var act = () => CalculadoraConexos.Calcular(participacoes);
        act.Should().Throw<DomainException>().WithMessage("*Produtor*");
    }
}
