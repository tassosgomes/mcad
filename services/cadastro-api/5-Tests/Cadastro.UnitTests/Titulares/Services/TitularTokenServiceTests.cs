using System.IdentityModel.Tokens.Jwt;
using AwesomeAssertions;
using Cadastro.Domain.Entities;
using Cadastro.Domain.ValueObjects;
using Cadastro.Infra.Services;

namespace Cadastro.UnitTests.Titulares.Services;

public class TitularTokenServiceTests
{
    private const string SecretValido = "portal-jwt-secret-com-no-minimo-32-bytes!!";
    private static readonly TimeSpan Tolernacia = TimeSpan.FromSeconds(5);

    private static Titular CriarTitular() =>
        Titular.CriarPessoaFisica(
            nome: "João da Silva",
            cpf: Cpf.Create("12345678909"),
            nacionalidade: "Brasileira",
            associacaoId: Guid.NewGuid());

    [Fact]
    public void Construtor_ComSecretValido_NaoDeveLancar()
    {
        var act = () => new TitularTokenService(SecretValido);

        act.Should().NotThrow();
    }

    [Fact]
    public void Construtor_ComSecretAusente_DeveLancarInvalidOperationException()
    {
        var act = () => new TitularTokenService("");

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*PORTAL_JWT_SECRET*");
    }

    [Fact]
    public void Construtor_ComSecretMenorQue32Bytes_DeveLancarInvalidOperationException()
    {
        var secretCurto = "senha-muito-curta";

        var act = () => new TitularTokenService(secretCurto);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*32 bytes*");
    }

    [Fact]
    public void Gerar_DeveProduzirTokenComSubIgualAoTitularId()
    {
        var titular = CriarTitular();
        var sut = new TitularTokenService(SecretValido);

        var token = sut.Gerar(titular);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        var sub = jwt.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;

        sub.Should().Be(titular.Id.ToString());
    }

    [Fact]
    public void Gerar_DeveProduzirTokenComIssuerCorreto()
    {
        var titular = CriarTitular();
        var sut = new TitularTokenService(SecretValido);

        var token = sut.Gerar(titular);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        jwt.Issuer.Should().Be("cadastro-api-portal");
    }

    [Fact]
    public void Gerar_DeveProduzirTokenComClaimNome()
    {
        var titular = CriarTitular();
        var sut = new TitularTokenService(SecretValido);

        var token = sut.Gerar(titular);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        var nome = jwt.Claims.FirstOrDefault(c => c.Type == "nome")?.Value;

        nome.Should().Be(titular.Nome);
    }

    [Fact]
    public void Gerar_DeveProduzirTokenComExpiracaoAproximada60Minutos()
    {
        var titular = CriarTitular();
        var sut = new TitularTokenService(SecretValido);
        var antes = DateTime.UtcNow;

        var token = sut.Gerar(titular);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        var diferenca = jwt.ValidTo - antes;

        diferenca.Should().BeCloseTo(TimeSpan.FromMinutes(60), Tolernacia);
    }

    [Fact]
    public void Gerar_DeveProduzirTokenAssinadoComHmacSha256()
    {
        var titular = CriarTitular();
        var sut = new TitularTokenService(SecretValido);

        var token = sut.Gerar(titular);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        jwt.Header.Alg.Should().Be("HS256");
    }

    [Fact]
    public void Gerar_ComTitularNulo_DeveLancarArgumentNullException()
    {
        var sut = new TitularTokenService(SecretValido);

        var act = () => sut.Gerar(null!);

        act.Should().Throw<ArgumentNullException>();
    }
}
