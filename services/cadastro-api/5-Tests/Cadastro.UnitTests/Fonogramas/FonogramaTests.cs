using AwesomeAssertions;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.ValueObjects;

namespace Cadastro.UnitTests.Fonogramas;

public class FonogramaTests
{
    [Fact]
    public void Criar_DeveRetornarFonogramaPendenteComObra()
    {
        var isrc = Isrc.Create("BRXYZ2300001");
        var obraId = Guid.NewGuid();

        var fonograma = Fonograma.Criar(isrc, obraId, "Brasil", new DateOnly(2023, 1, 1), new DateOnly(2023, 2, 1));

        fonograma.Should().NotBeNull();
        fonograma.Isrc.Valor.Should().Be("BRXYZ2300001");
        fonograma.ObraId.Should().Be(obraId);
        fonograma.Status.Should().Be(StatusFonograma.PendenteValidacao);
        fonograma.PaisOrigem.Should().Be("Brasil");
        fonograma.DataGravacao.Should().Be(new DateOnly(2023, 1, 1));
        fonograma.DataLancamento.Should().Be(new DateOnly(2023, 2, 1));
    }

    [Fact]
    public void Atualizar_FonogramaPendente_DeveAtualizarEContinuarPendente()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "Brasil", null, null);
        var novoIsrc = Isrc.Create("USXYZ2300002");

        fonograma.Atualizar(novoIsrc, "USA", new DateOnly(2023, 1, 1), null);

        fonograma.Isrc.Valor.Should().Be("USXYZ2300002");
        fonograma.PaisOrigem.Should().Be("USA");
        fonograma.Status.Should().Be(StatusFonograma.PendenteValidacao);
    }

    [Fact]
    public void RequerDepuracao_FonogramaLiberadoEIsrcDiferente_RetornaTrue()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "Brasil", null, null);
        // Usar reflection para forçar status ou adicionar método de teste se necessário.
        // Como não podemos setar private setters diretamente, vamos usar force:
        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(fonograma, StatusFonograma.Liberado);

        var requer = fonograma.RequerDepuracao(Isrc.Create("USXYZ2300002"));

        requer.Should().BeTrue();
    }

    [Fact]
    public void RequerDepuracao_FonogramaLiberadoEIsrcIgual_RetornaFalse()
    {
        var isrc = Isrc.Create("BRXYZ2300001");
        var fonograma = Fonograma.Criar(isrc, Guid.NewGuid(), "Brasil", null, null);
        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(fonograma, StatusFonograma.Liberado);

        var requer = fonograma.RequerDepuracao(Isrc.Create("BRXYZ2300001"));

        requer.Should().BeFalse();
    }

    [Fact]
    public void PodeSerExcluido_FonogramaLiberadoOuDepurado_RetornaFalse()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "Brasil", null, null);
        
        fonograma.PodeSerExcluido.Should().BeTrue();

        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(fonograma, StatusFonograma.Liberado);
        fonograma.PodeSerExcluido.Should().BeFalse();

        prop?.SetValue(fonograma, StatusFonograma.Depurado);
        fonograma.PodeSerExcluido.Should().BeFalse();
    }

    [Fact]
    public void Depurar_FonogramaValido_DeveMudarStatusEDefinirFk()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "Brasil", null, null);
        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(fonograma, StatusFonograma.Liberado);
        
        var novoId = Guid.NewGuid();

        fonograma.Depurar(novoId);

        fonograma.Status.Should().Be(StatusFonograma.Depurado);
        fonograma.FonogramaDepuradoParaId.Should().Be(novoId);
    }

    [Fact]
    public void Depurar_FonogramaNaoLiberado_DeveLancarDomainException()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "Brasil", null, null);
        
        var action = () => fonograma.Depurar(Guid.NewGuid());

        action.Should().Throw<DomainException>().WithMessage("Apenas fonogramas LIBERADOS podem ser depurados");
    }
}
