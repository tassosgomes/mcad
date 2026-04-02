using FluentAssertions;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Identificacao.Domain.Exceptions;

namespace Identificacao.Tests.Domain;

public class CaptacaoTests
{
    [Fact]
    public void Criar_ComDadosValidos_RetornaCaptacaoAberta()
    {
        var rubricaId = Guid.NewGuid();
        var periodo = new DateOnly(2023, 10, 1);
        var analistaId = Guid.NewGuid();

        var captacao = Captacao.Criar(rubricaId, periodo, "Netflix", analistaId, "Joao");

        captacao.Should().NotBeNull();
        captacao.Status.Should().Be(StatusCaptacao.Aberta);
        captacao.RubricaId.Should().Be(rubricaId);
        captacao.Periodo.Should().Be(periodo);
        captacao.UsuarioDeMusica.Should().Be("Netflix");
        captacao.AnalistaResponsavelId.Should().Be(analistaId);
        captacao.AnalistaResponsavelNome.Should().Be("Joao");
    }

    [Fact]
    public void Atualizar_CaptacaoAberta_AtualizaDados()
    {
        var captacao = Captacao.Criar(Guid.NewGuid(), new DateOnly(2023, 10, 1), "Netflix", Guid.NewGuid(), "Joao");
        var novaRubricaId = Guid.NewGuid();
        var novoPeriodo = new DateOnly(2023, 11, 1);

        captacao.Atualizar(novaRubricaId, novoPeriodo, "Globo");

        captacao.RubricaId.Should().Be(novaRubricaId);
        captacao.Periodo.Should().Be(novoPeriodo);
        captacao.UsuarioDeMusica.Should().Be("Globo");
    }

    [Fact]
    public void Atualizar_CaptacaoFechada_LancaDomainException()
    {
        var captacao = Captacao.Criar(Guid.NewGuid(), new DateOnly(2023, 10, 1), "Netflix", Guid.NewGuid(), "Joao");
        
        // Simular fechamento via reflection (pois não temos método fechar ainda, mas o status é private set)
        var prop = typeof(Captacao).GetProperty("Status");
        prop!.SetValue(captacao, StatusCaptacao.Fechada);

        var act = () => captacao.Atualizar(Guid.NewGuid(), new DateOnly(2023, 11, 1), "Globo");

        act.Should().Throw<DomainException>().WithMessage("Apenas captações com status ABERTA podem ser modificadas.");
    }

    [Fact]
    public void ValidarPropriedade_OutroAnalista_LancaDomainException()
    {
        var captacao = Captacao.Criar(Guid.NewGuid(), new DateOnly(2023, 10, 1), "Netflix", Guid.NewGuid(), "Joao");

        var act = () => captacao.ValidarPropriedade(Guid.NewGuid());

        act.Should().Throw<DomainException>().WithMessage("Apenas o analista responsável pode modificar esta captação.");
    }

    [Fact]
    public void ValidarPropriedade_AnalistaDono_NaoLancaExcecao()
    {
        var analistaId = Guid.NewGuid();
        var captacao = Captacao.Criar(Guid.NewGuid(), new DateOnly(2023, 10, 1), "Netflix", analistaId, "Joao");

        var act = () => captacao.ValidarPropriedade(analistaId);

        act.Should().NotThrow();
    }

    [Fact]
    public void ValidarAberta_StatusAberta_NaoLancaExcecao()
    {
        var captacao = Captacao.Criar(Guid.NewGuid(), new DateOnly(2023, 10, 1), "Netflix", Guid.NewGuid(), "Joao");

        var act = () => captacao.ValidarAberta();

        act.Should().NotThrow();
    }

    [Fact]
    public void ValidarAberta_StatusFechada_LancaDomainException()
    {
        var captacao = Captacao.Criar(Guid.NewGuid(), new DateOnly(2023, 10, 1), "Netflix", Guid.NewGuid(), "Joao");
        
        var prop = typeof(Captacao).GetProperty("Status");
        prop!.SetValue(captacao, StatusCaptacao.Fechada);

        var act = () => captacao.ValidarAberta();

        act.Should().Throw<DomainException>().WithMessage("Apenas captações com status ABERTA podem ser modificadas.");
    }
}
