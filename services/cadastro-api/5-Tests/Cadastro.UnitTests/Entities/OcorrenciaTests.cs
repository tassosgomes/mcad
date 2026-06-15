using AwesomeAssertions;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;

namespace Cadastro.UnitTests.Entities;

public class OcorrenciaTests
{
    private static Ocorrencia CriarOcorrenciaAberta() =>
        Ocorrencia.Criar(Guid.NewGuid(), TipoOcorrencia.TitularidadeDivergente, "Descrição do erro");

    [Fact]
    public void Criar_ComDadosValidos_DeveNascerAberta()
    {
        var titularId = Guid.NewGuid();

        var ocorrencia = Ocorrencia.Criar(
            titularId,
            TipoOcorrencia.DadoCadastral,
            "Relato do erro",
            obraId: Guid.NewGuid(),
            fonogramaId: null);

        ocorrencia.Id.Should().NotBeEmpty();
        ocorrencia.TitularId.Should().Be(titularId);
        ocorrencia.Tipo.Should().Be(TipoOcorrencia.DadoCadastral);
        ocorrencia.Descricao.Should().Be("Relato do erro");
        ocorrencia.ObraId.Should().NotBeNull();
        ocorrencia.FonogramaId.Should().BeNull();
        ocorrencia.Status.Should().Be(StatusOcorrencia.Aberta);
        ocorrencia.AbertaEm.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        ocorrencia.ResolvidaEm.Should().BeNull();
    }

    [Fact]
    public void Criar_ComDescricaoVazia_DeveLancarDomainException()
    {
        var action = () => Ocorrencia.Criar(Guid.NewGuid(), TipoOcorrencia.ObraAusente, "  ");

        action.Should().Throw<DomainException>().WithMessage("Descrição é obrigatória");
    }

    [Fact]
    public void AssumirAnalise_Aberta_DeveTransitarParaEmAnalise()
    {
        var ocorrencia = CriarOcorrenciaAberta();

        ocorrencia.AssumirAnalise();

        ocorrencia.Status.Should().Be(StatusOcorrencia.EmAnalise);
    }

    [Fact]
    public void AssumirAnalise_EmAnalise_DeveLancarDomainException()
    {
        var ocorrencia = CriarOcorrenciaAberta();
        ocorrencia.AssumirAnalise();

        var action = () => ocorrencia.AssumirAnalise();

        action.Should().Throw<DomainException>()
            .WithMessage($"Transição inválida: {StatusOcorrencia.EmAnalise} → {StatusOcorrencia.EmAnalise}");
    }

    [Fact]
    public void Resolver_EmAnalise_DeveTransitarParaResolvidaERegistrarParecer()
    {
        var ocorrencia = CriarOcorrenciaAberta();
        ocorrencia.AssumirAnalise();

        ocorrencia.Resolver("Titularidade corrigida");

        ocorrencia.Status.Should().Be(StatusOcorrencia.Resolvida);
        ocorrencia.Resolucao.Should().Be("Titularidade corrigida");
        ocorrencia.ResolvidaEm.Should().NotBeNull();
    }

    [Fact]
    public void Resolver_Aberta_DeveLancarDomainException()
    {
        var ocorrencia = CriarOcorrenciaAberta();

        var action = () => ocorrencia.Resolver("Parecer");

        action.Should().Throw<DomainException>()
            .WithMessage($"Transição inválida: {StatusOcorrencia.Aberta} → {StatusOcorrencia.Resolvida}");
    }

    [Fact]
    public void Resolver_ComParecerVazio_DeveLancarDomainException()
    {
        var ocorrencia = CriarOcorrenciaAberta();
        ocorrencia.AssumirAnalise();

        var action = () => ocorrencia.Resolver("  ");

        action.Should().Throw<DomainException>().WithMessage("Parecer de resolução é obrigatório");
    }

    [Fact]
    public void Cancelar_Aberta_DeveTransitarParaCancelada()
    {
        var ocorrencia = CriarOcorrenciaAberta();

        ocorrencia.Cancelar("Solicitada em duplicidade");

        ocorrencia.Status.Should().Be(StatusOcorrencia.Cancelada);
        ocorrencia.JustificativaCancelamento.Should().Be("Solicitada em duplicidade");
        ocorrencia.ResolvidaEm.Should().NotBeNull();
    }

    [Fact]
    public void Cancelar_EmAnalise_DeveTransitarParaCancelada()
    {
        var ocorrencia = CriarOcorrenciaAberta();
        ocorrencia.AssumirAnalise();

        ocorrencia.Cancelar("Sem mérito");

        ocorrencia.Status.Should().Be(StatusOcorrencia.Cancelada);
    }

    [Fact]
    public void Cancelar_Resolvida_DeveLancarDomainException()
    {
        var ocorrencia = CriarOcorrenciaAberta();
        ocorrencia.AssumirAnalise();
        ocorrencia.Resolver("Resolvida");

        var action = () => ocorrencia.Cancelar("Tentativa de cancelar resolvida");

        action.Should().Throw<DomainException>()
            .WithMessage($"Transição inválida: {StatusOcorrencia.Resolvida} → {StatusOcorrencia.Cancelada}");
    }

    [Fact]
    public void Resolver_Resolvida_DeveLancarDomainException()
    {
        var ocorrencia = CriarOcorrenciaAberta();
        ocorrencia.AssumirAnalise();
        ocorrencia.Resolver("Resolvida");

        var action = () => ocorrencia.Resolver("Tentar resolver de novo");

        action.Should().Throw<DomainException>()
            .WithMessage($"Transição inválida: {StatusOcorrencia.Resolvida} → {StatusOcorrencia.Resolvida}");
    }
}
