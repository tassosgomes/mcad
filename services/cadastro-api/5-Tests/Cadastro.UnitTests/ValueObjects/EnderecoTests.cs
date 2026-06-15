using AwesomeAssertions;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.ValueObjects;

namespace Cadastro.UnitTests.ValueObjects;

public class EnderecoTests
{
    [Fact]
    public void Create_ComTodosCamposValidos_DeveRetornarEndereco()
    {
        // Act
        var result = Endereco.Create(
            cep: Cep.Create("01001000"),
            logradouro: "Praça da Sé",
            numero: "100",
            complemento: "Apto 2",
            bairro: "Sé",
            cidade: "São Paulo",
            uf: Uf.Create("SP"));

        // Assert
        result.Should().NotBeNull();
        result.Cep.Valor.Should().Be("01001000");
        result.Logradouro.Should().Be("Praça da Sé");
        result.Numero.Should().Be("100");
        result.Complemento.Should().Be("Apto 2");
        result.Bairro.Should().Be("Sé");
        result.Cidade.Should().Be("São Paulo");
        result.Uf.Valor.Should().Be("SP");
    }

    [Fact]
    public void Create_ComNumeroSemNumero_DeveAceitarSN()
    {
        // Act
        var result = Endereco.Create(
            cep: Cep.Create("01001000"),
            logradouro: "Rodovia BR-116",
            numero: "KM 12",
            complemento: null,
            bairro: "Zona Rural",
            cidade: "Lapa",
            uf: Uf.Create("PR"));

        // Assert
        result.Numero.Should().Be("KM 12");
        result.Complemento.Should().BeNull();
    }

    [Fact]
    public void Create_ComComplementoVazio_DeveNormalizarParaNull()
    {
        // Act
        var result = Endereco.Create(
            cep: Cep.Create("01001000"),
            logradouro: "Rua X",
            numero: "1",
            complemento: "   ",
            bairro: "Centro",
            cidade: "São Paulo",
            uf: Uf.Create("SP"));

        // Assert
        result.Complemento.Should().BeNull();
    }

    [Fact]
    public void Create_ComCamposRemovendoEspacos_DeveDarTrim()
    {
        // Act
        var result = Endereco.Create(
            cep: Cep.Create("01001000"),
            logradouro: "  Rua X  ",
            numero: "  1  ",
            complemento: null,
            bairro: "  Centro  ",
            cidade: "  São Paulo  ",
            uf: Uf.Create("SP"));

        // Assert
        result.Logradouro.Should().Be("Rua X");
        result.Numero.Should().Be("1");
        result.Bairro.Should().Be("Centro");
        result.Cidade.Should().Be("São Paulo");
    }

    [Fact]
    public void Create_ComCepNulo_DeveLancarDomainException()
    {
        // Act
        var action = () => Endereco.Create(
            cep: null!,
            logradouro: "Rua X",
            numero: "1",
            complemento: null,
            bairro: "Centro",
            cidade: "São Paulo",
            uf: Uf.Create("SP"));

        // Assert
        action.Should().Throw<DomainException>().WithMessage("CEP é obrigatório");
    }

    [Fact]
    public void Create_ComUfNula_DeveLancarDomainException()
    {
        // Act
        var action = () => Endereco.Create(
            cep: Cep.Create("01001000"),
            logradouro: "Rua X",
            numero: "1",
            complemento: null,
            bairro: "Centro",
            cidade: "São Paulo",
            uf: null!);

        // Assert
        action.Should().Throw<DomainException>().WithMessage("UF é obrigatória");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_ComLogradouroVazio_DeveLancarDomainException(string logradouro)
    {
        // Act
        var action = () => Endereco.Create(
            cep: Cep.Create("01001000"),
            logradouro: logradouro,
            numero: "1",
            complemento: null,
            bairro: "Centro",
            cidade: "São Paulo",
            uf: Uf.Create("SP"));

        // Assert
        action.Should().Throw<DomainException>().WithMessage("Logradouro é obrigatório");
    }

    [Fact]
    public void Create_ComLogradouroExcedendoTamanhoMaximo_DeveLancarDomainException()
    {
        // Arrange
        var logradouroLongo = new string('A', 151);

        // Act
        var action = () => Endereco.Create(
            cep: Cep.Create("01001000"),
            logradouro: logradouroLongo,
            numero: "1",
            complemento: null,
            bairro: "Centro",
            cidade: "São Paulo",
            uf: Uf.Create("SP"));

        // Assert
        action.Should().Throw<DomainException>().WithMessage("Logradouro deve ter no máximo 150 caracteres");
    }
}
