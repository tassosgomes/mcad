using AwesomeAssertions;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.ValueObjects;

namespace Cadastro.UnitTests.ValueObjects;

public class IsrcTests
{
    [Fact]
    public void Create_ComIsrcValidoComHifens_DeveRetornarISRCUnificado()
    {
        var result = Isrc.Create("BR-XYZ-23-00001");
        
        result.Should().NotBeNull();
        result.Valor.Should().Be("BRXYZ2300001");
    }

    [Fact]
    public void Create_ComIsrcValidoSemHifens_DeveRetornarISRC()
    {
        var result = Isrc.Create("BRXYZ2300001");
        
        result.Should().NotBeNull();
        result.Valor.Should().Be("BRXYZ2300001");
    }

    [Fact]
    public void Formatado_DeveRetornarComHifens()
    {
        var isrc = Isrc.Create("BRXYZ2300001");
        isrc.Formatado.Should().Be("BR-XYZ-23-00001");
    }

}
