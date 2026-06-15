using AwesomeAssertions;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;

namespace Cadastro.UnitTests.Entities;

public class SolicitacaoAlteracaoTests
{
    [Fact]
    public void Criar_ComDadosValidos_DeveNascerSolicitada()
    {
        var titularId = Guid.NewGuid();

        var solicitacao = SolicitacaoAlteracao.Criar(
            titularId,
            CampoSolicitacao.Nome,
            valorAtual: "João",
            valorPretendido: "João Silva",
            justificativa: "Nome incompleto no cadastro");

        solicitacao.Id.Should().NotBeEmpty();
        solicitacao.TitularId.Should().Be(titularId);
        solicitacao.Campo.Should().Be(CampoSolicitacao.Nome);
        solicitacao.ValorAtual.Should().Be("João");
        solicitacao.ValorPretendido.Should().Be("João Silva");
        solicitacao.Justificativa.Should().Be("Nome incompleto no cadastro");
        solicitacao.Status.Should().Be(StatusSolicitacao.Solicitada);
        solicitacao.SolicitadaEm.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        solicitacao.DecisaoPor.Should().BeNull();
        solicitacao.DecididaEm.Should().BeNull();
        solicitacao.JustificativaRejeicao.Should().BeNull();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void Criar_ComAssociacaoEVazio_DeveLancarDomainExceptionRF20(string valorPretendido)
    {
        var action = () => SolicitacaoAlteracao.Criar(
            Guid.NewGuid(),
            CampoSolicitacao.Associacao,
            valorAtual: "UBC",
            valorPretendido: valorPretendido,
            justificativa: "Trocar de associação");

        action.Should().Throw<DomainException>()
            .WithMessage("O vínculo de associação só pode ser alterado, nunca removido");
    }

    [Fact]
    public void Criar_ComAssociacaoValida_DeveAceitar()
    {
        var solicitacao = SolicitacaoAlteracao.Criar(
            Guid.NewGuid(),
            CampoSolicitacao.Associacao,
            valorAtual: "UBC",
            valorPretendido: "ABRAMUS",
            justificativa: "Mudança de associação");

        solicitacao.Status.Should().Be(StatusSolicitacao.Solicitada);
        solicitacao.ValorPretendido.Should().Be("ABRAMUS");
    }

    [Fact]
    public void Criar_ComJustificativaVazia_DeveLancarDomainException()
    {
        var action = () => SolicitacaoAlteracao.Criar(
            Guid.NewGuid(),
            CampoSolicitacao.Nome,
            valorAtual: "João",
            valorPretendido: "João Silva",
            justificativa: "  ");

        action.Should().Throw<DomainException>().WithMessage("Justificativa é obrigatória");
    }

    [Fact]
    public void Aprovar_Solicitada_DeveTransitarEARegistrarDecisao()
    {
        var solicitacao = SolicitacaoAlteracao.Criar(
            Guid.NewGuid(),
            CampoSolicitacao.Nome,
            "João",
            "João Silva",
            "Nome incompleto");
        var analistaId = Guid.NewGuid();

        solicitacao.Aprovar(analistaId);

        solicitacao.Status.Should().Be(StatusSolicitacao.Aprovada);
        solicitacao.DecisaoPor.Should().Be(analistaId);
        solicitacao.DecididaEm.Should().NotBeNull();
    }

    [Fact]
    public void Aprovar_Aprovada_DeveLancarDomainException()
    {
        var solicitacao = SolicitacaoAlteracao.Criar(
            Guid.NewGuid(),
            CampoSolicitacao.Nome,
            "João",
            "João Silva",
            "Nome incompleto");
        solicitacao.Aprovar(Guid.NewGuid());

        var action = () => solicitacao.Aprovar(Guid.NewGuid());

        action.Should().Throw<DomainException>()
            .WithMessage($"Transição inválida: {StatusSolicitacao.Aprovada} → {StatusSolicitacao.Aprovada}");
    }

    [Fact]
    public void Aprovar_Rejeitada_DeveLancarDomainException()
    {
        var solicitacao = SolicitacaoAlteracao.Criar(
            Guid.NewGuid(),
            CampoSolicitacao.Nome,
            "João",
            "João Silva",
            "Nome incompleto");
        solicitacao.Rejeitar(Guid.NewGuid(), "Sem documentos comprobatórios");

        var action = () => solicitacao.Aprovar(Guid.NewGuid());

        action.Should().Throw<DomainException>()
            .WithMessage($"Transição inválida: {StatusSolicitacao.Rejeitada} → {StatusSolicitacao.Aprovada}");
    }

    [Fact]
    public void Rejeitar_Solicitada_DeveTransitarERegistrarJustificativa()
    {
        var solicitacao = SolicitacaoAlteracao.Criar(
            Guid.NewGuid(),
            CampoSolicitacao.Nome,
            "João",
            "João Silva",
            "Nome incompleto");
        var analistaId = Guid.NewGuid();

        solicitacao.Rejeitar(analistaId, "Documentação insuficiente");

        solicitacao.Status.Should().Be(StatusSolicitacao.Rejeitada);
        solicitacao.DecisaoPor.Should().Be(analistaId);
        solicitacao.DecididaEm.Should().NotBeNull();
        solicitacao.JustificativaRejeicao.Should().Be("Documentação insuficiente");
    }

    [Fact]
    public void Rejeitar_ComJustificativaVazia_DeveLancarDomainException()
    {
        var solicitacao = SolicitacaoAlteracao.Criar(
            Guid.NewGuid(),
            CampoSolicitacao.Nome,
            "João",
            "João Silva",
            "Nome incompleto");

        var action = () => solicitacao.Rejeitar(Guid.NewGuid(), "  ");

        action.Should().Throw<DomainException>().WithMessage("Justificativa de rejeição é obrigatória");
    }
}
