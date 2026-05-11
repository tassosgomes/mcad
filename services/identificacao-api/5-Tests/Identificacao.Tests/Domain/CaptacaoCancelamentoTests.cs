using FluentAssertions;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Identificacao.Domain.Exceptions;

namespace Identificacao.Tests.Domain;

public class CaptacaoCancelamentoTests
{
    private static Captacao CriarFechada()
    {
        var captacao = Captacao.Criar(Guid.NewGuid(), new DateOnly(2026, 1, 15), "Rede Globo", Guid.NewGuid(), "Joao");
        captacao.Fechar();
        return captacao;
    }

    [Fact]
    public void Cancelar_Fechada_NaoProcessada_StatusCancelada()
    {
        var captacao = CriarFechada();
        const string justificativa = "Execuções com tipo de utilização incorreto";

        captacao.Cancelar(justificativa);

        captacao.Status.Should().Be(StatusCaptacao.Cancelada);
        captacao.JustificativaCancelamento.Should().Be(justificativa);
        captacao.CanceladoEm.Should().NotBeNull();
        captacao.CanceladoEm.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void Cancelar_Aberta_LancaDomainException()
    {
        var captacao = Captacao.Criar(Guid.NewGuid(), new DateOnly(2026, 1, 15), "Rede Globo", Guid.NewGuid(), "Joao");

        var act = () => captacao.Cancelar("Motivo qualquer suficientemente longo");

        act.Should().Throw<DomainException>()
            .WithMessage("Apenas captações FECHADAS podem ser canceladas.");
    }

    [Fact]
    public void Cancelar_Processada_LancaDomainException()
    {
        var captacao = CriarFechada();
        captacao.MarcarDistribuicaoProcessada(DateTime.UtcNow);

        var act = () => captacao.Cancelar("Tentativa após distribuição");

        act.Should().Throw<DomainException>()
            .WithMessage("Este Rol já foi processado pela Distribuição e não pode ser cancelado.");
    }

    [Fact]
    public void Cancelar_JustificativaVazia_LancaDomainException()
    {
        var captacao = CriarFechada();

        var act = () => captacao.Cancelar("   ");

        act.Should().Throw<DomainException>()
            .WithMessage("Justificativa é obrigatória para cancelar uma captação.");
    }

    [Fact]
    public void MarcarDistribuicaoProcessada_FlagTrue()
    {
        var captacao = CriarFechada();
        var processadoEm = new DateTime(2026, 1, 16, 2, 0, 0, DateTimeKind.Utc);

        captacao.MarcarDistribuicaoProcessada(processadoEm);

        captacao.DistribuicaoProcessada.Should().BeTrue();
        captacao.DistribuicaoProcessadaEm.Should().Be(processadoEm);
    }

    [Fact]
    public void MarcarDistribuicaoProcessada_JaProcessada_Idempotente()
    {
        var captacao = CriarFechada();
        var primeira = new DateTime(2026, 1, 16, 2, 0, 0, DateTimeKind.Utc);
        var segunda = new DateTime(2026, 1, 17, 3, 0, 0, DateTimeKind.Utc);

        captacao.MarcarDistribuicaoProcessada(primeira);
        captacao.MarcarDistribuicaoProcessada(segunda);

        captacao.DistribuicaoProcessada.Should().BeTrue();
        captacao.DistribuicaoProcessadaEm.Should().Be(primeira);
    }
}
