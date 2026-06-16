using System.Security.Cryptography;
using System.Text;
using FluentAssertions;
using Identificacao.API.Infrastructure;
using Identificacao.Domain.Identidade;

namespace Identificacao.Tests.Domain;

public class AnalistaIdentificadorTests
{
    [Fact]
    public void FromSubject_GuidValido_PreservaGuidOriginal()
    {
        var guidOriginal = Guid.NewGuid();
        var subject = guidOriginal.ToString();

        var resultado = AnalistaIdentificador.FromSubject(subject);

        resultado.Should().Be(guidOriginal);
    }

    [Fact]
    public void FromSubject_StringNaoGuid_UsaMd5Deterministico()
    {
        var resultado1 = AnalistaIdentificador.FromSubject("analista-joao");
        var resultado2 = AnalistaIdentificador.FromSubject("analista-joao");

        resultado1.Should().Be(resultado2);
    }

    [Fact]
    public void FromSubject_MesmoSub_MesmoGuid()
    {
        var subject = "usuario-autenticado-logto";

        var resultado1 = AnalistaIdentificador.FromSubject(subject);
        var resultado2 = AnalistaIdentificador.FromSubject(subject);

        resultado1.Should().Be(resultado2);
    }

    [Fact]
    public void FromSubject_SubsDiferentes_GuidssDiferentes()
    {
        var resultado1 = AnalistaIdentificador.FromSubject("analista-joao");
        var resultado2 = AnalistaIdentificador.FromSubject("analista-maria");

        resultado1.Should().NotBe(resultado2);
    }

    [Fact]
    public void FromSubject_GuidsDiferentesSaoPreservados()
    {
        var guid1 = Guid.NewGuid();
        var guid2 = Guid.NewGuid();

        AnalistaIdentificador.FromSubject(guid1.ToString()).Should().Be(guid1);
        AnalistaIdentificador.FromSubject(guid2.ToString()).Should().Be(guid2);
    }

    [Fact]
    public void FromSubject_IgualFormulaHistorica()
    {
        var subject = "abc-123";

        var resultado = AnalistaIdentificador.FromSubject(subject);
        var esperado = new Guid(MD5.HashData(Encoding.UTF8.GetBytes(subject)));

        resultado.Should().Be(esperado);
    }

    [Fact]
    public void GetAnalistaId_DelegaParaAnalistaIdentificador()
    {
        var sub = Guid.NewGuid().ToString();
        var claimsPrincipal = new System.Security.Claims.ClaimsPrincipal(
            new System.Security.Claims.ClaimsIdentity(
                [new System.Security.Claims.Claim("sub", sub)]));

        var resultado = claimsPrincipal.GetAnalistaId();

        resultado.Should().Be(AnalistaIdentificador.FromSubject(sub));
    }
}
