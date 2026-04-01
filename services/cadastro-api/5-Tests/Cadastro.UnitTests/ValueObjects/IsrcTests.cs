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

    [Theory]
    [InlineData("BR-XYZ-23-0000")] // 11 digits
    [InlineData("BR-XYZ-23-000012")] // 13 digits
    [InlineData("12-XYZ-23-00001")] // pais invalido (numeros)
    [InlineData("BR-XYZ-XX-00001")] // ano invalido (letras)
    [InlineData("BR-XYZ-23-AAAA1")] // sequencia invalida (letras)
    [InlineData("")]
    [InlineData(null)]
    public void Create_ComFomatoIsrcInvalido_DeveLancarDomainException(string isrcInvalido)
    {
        var action = () => Isrc.Create(isrcInvalido);
        action.Should().Throw<DomainException>().WithMessage("ISRC deve seguir formato CC-XXX-YY-NNNNN (12 caracteres alfanuméricos)");
    }
}
