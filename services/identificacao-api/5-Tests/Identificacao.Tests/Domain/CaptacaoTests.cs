using FluentAssertions;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Identificacao.Domain.Exceptions;

namespace Identificacao.Tests.Domain;

public class CaptacaoTests
{
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

    // ───────────── Cobertura faltante de máquina de estados ─────────────

    private static Captacao CriarAberta() =>
        Captacao.Criar(Guid.NewGuid(), new DateOnly(2023, 10, 1), "Netflix", Guid.NewGuid(), "Joao");

    [Fact]
    public void Fechar_CaptacaoJaFechada_LancaDomainException()
    {
        var captacao = CriarAberta();
        captacao.Fechar();

        var act = () => captacao.Fechar();

        act.Should().Throw<DomainException>().WithMessage("Apenas captações com status ABERTA podem ser modificadas.");
    }

    [Fact]
    public void Fechar_CaptacaoCancelada_LancaDomainException()
    {
        var captacao = CriarAberta();
        captacao.Fechar();
        captacao.Cancelar("Motivo qualquer");

        var act = () => captacao.Fechar();

        act.Should().Throw<DomainException>().WithMessage("Apenas captações com status ABERTA podem ser modificadas.");
    }

    [Fact]
    public void Cancelar_CaptacaoAberta_LancaDomainException()
    {
        var captacao = CriarAberta();

        var act = () => captacao.Cancelar("Motivo");

        act.Should().Throw<DomainException>().WithMessage("Apenas captações FECHADAS podem ser canceladas.");
    }

    [Fact]
    public void Cancelar_CaptacaoJaCancelada_LancaDomainException()
    {
        var captacao = CriarAberta();
        captacao.Fechar();
        captacao.Cancelar("Primeiro motivo");

        var act = () => captacao.Cancelar("Segundo motivo");

        act.Should().Throw<DomainException>().WithMessage("Apenas captações FECHADAS podem ser canceladas.");
    }

    [Fact]
    public void Atualizar_CaptacaoCancelada_LancaDomainException()
    {
        var captacao = CriarAberta();
        captacao.Fechar();
        captacao.Cancelar("Motivo");

        var act = () => captacao.Atualizar(Guid.NewGuid(), new DateOnly(2023, 11, 1), "Globo");

        act.Should().Throw<DomainException>().WithMessage("Apenas captações com status ABERTA podem ser modificadas.");
    }
}
