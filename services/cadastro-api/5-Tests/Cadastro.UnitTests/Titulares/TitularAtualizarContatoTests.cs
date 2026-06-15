using AwesomeAssertions;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.ValueObjects;

namespace Cadastro.UnitTests.Titulares;

public class TitularAtualizarContatoTests
{
    private static Titular CriarTitular() =>
        Titular.CriarPessoaFisica(
            nome: "João",
            cpf: Cpf.Create("12345678909"),
            nacionalidade: "Brasileira",
            associacaoId: Guid.NewGuid());

    private static TelefoneTitular Fone(TipoTelefone tipo = TipoTelefone.Celular) =>
        new(tipo, Telefone.Create("(11) 99999-0000"));

    [Fact]
    public void AtualizarContato_ComEmailEnderecoETelefone_DeveAtualizarCampos()
    {
        var titular = CriarTitular();
        var email = Email.Create("joao@x.com");
        var endereco = Endereco.Create(
            Cep.Create("01001000"),
            "Praça da Sé",
            "100",
            null,
            "Sé",
            "São Paulo",
            Uf.Create("SP"));
        var telefones = new List<TelefoneTitular> { Fone() };

        titular.AtualizarContato(email, endereco, telefones);

        titular.Email.Should().NotBeNull();
        titular.Email!.Valor.Should().Be("joao@x.com");
        titular.Endereco.Should().NotBeNull();
        titular.Endereco!.Cidade.Should().Be("São Paulo");
        titular.Telefones.Should().HaveCount(1);
    }

    [Fact]
    public void AtualizarContato_ComListaVazia_DeveAceitarESubstituirColecao()
    {
        var titular = CriarTitular();
        titular.AtualizarContato(Email.Create("a@b.com"), null, new List<TelefoneTitular> { Fone() });
        titular.Telefones.Should().HaveCount(1);

        titular.AtualizarContato(null, null, new List<TelefoneTitular>());

        titular.Telefones.Should().BeEmpty();
    }

    [Fact]
    public void AtualizarContato_SubstituiIntegralmenteAColecaoExistente()
    {
        var titular = CriarTitular();
        var inicial = new List<TelefoneTitular>
        {
            Fone(TipoTelefone.Celular),
            Fone(TipoTelefone.Residencial)
        };
        titular.AtualizarContato(null, null, inicial);
        titular.Telefones.Should().HaveCount(2);

        var substituta = new List<TelefoneTitular> { Fone(TipoTelefone.Comercial) };
        titular.AtualizarContato(null, null, substituta);

        titular.Telefones.Should().HaveCount(1);
        titular.Telefones[0].Tipo.Should().Be(TipoTelefone.Comercial);
    }

    [Fact]
    public void AtualizarContato_ComMaisDeCincoTelefones_DeveLancarDomainException()
    {
        var titular = CriarTitular();
        var telefones = Enumerable.Range(0, 6).Select(_ => Fone()).ToList();

        var action = () => titular.AtualizarContato(null, null, telefones);

        action.Should().Throw<DomainException>().WithMessage("Titular pode ter no máximo 5 telefones");
    }

    [Fact]
    public void AtualizarContato_ComExatamenteCincoTelefones_DeveAceitar()
    {
        var titular = CriarTitular();
        var telefones = Enumerable.Range(0, 5).Select(_ => Fone()).ToList();

        titular.AtualizarContato(null, null, telefones);

        titular.Telefones.Should().HaveCount(5);
    }

    [Fact]
    public void AtualizarContato_DeveAtualizarTimestampAtualizadoEm()
    {
        var titular = CriarTitular();
        var atualizadoEmOriginal = titular.AtualizadoEm;

        Thread.Sleep(20);
        titular.AtualizarContato(null, null, new List<TelefoneTitular>());

        titular.AtualizadoEm.Should().BeAfter(atualizadoEmOriginal);
    }

    [Fact]
    public void Telefones_RecemCriado_DeveIniciarVazio()
    {
        var titular = CriarTitular();

        titular.Email.Should().BeNull();
        titular.Endereco.Should().BeNull();
        titular.Telefones.Should().BeEmpty();
    }
}
