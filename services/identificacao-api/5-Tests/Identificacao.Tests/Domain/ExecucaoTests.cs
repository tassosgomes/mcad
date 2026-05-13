using FluentAssertions;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Identificacao.Domain.Exceptions;

namespace Identificacao.Tests.Domain;

public class ExecucaoTests
{
    [Fact]
    public void Criar_DadosValidos_RetornaExecucaoComDuracaoCalculada()
    {
        // Arrange
        var captacaoId = Guid.NewGuid();
        var obraId = Guid.NewGuid();
        var inicio = new TimeOnly(14, 30, 0);
        var fim = new TimeOnly(14, 33, 45);

        // Act
        var execucao = Execucao.Criar(
            captacaoId, obraId, null, "Minha Obra", null, null, "", 
            inicio, fim, 1, null, null, StatusExecucao.Pendente);

        // Assert
        execucao.Should().NotBeNull();
        execucao.DuracaoSegundos.Should().Be(225); // 3 minutos e 45 segundos
    }

    [Fact]
    public void Criar_FimAnteriorAoInicio_LancaDomainException()
    {
        // Arrange
        var inicio = new TimeOnly(14, 30, 0);
        var fim = new TimeOnly(14, 29, 59);

        // Act & Assert
        Action action = () => Execucao.Criar(
            Guid.NewGuid(), Guid.NewGuid(), null, "Minha Obra", null, null, "", 
            inicio, fim, 1, null, null, StatusExecucao.Pendente);

        action.Should().Throw<DomainException>()
            .WithMessage("O horário de fim deve ser posterior ao início.");
    }

    [Fact]
    public void Criar_FimIgualAoInicio_LancaDomainException()
    {
        // Arrange
        var inicio = new TimeOnly(14, 30, 0);
        var fim = new TimeOnly(14, 30, 0);

        // Act & Assert
        Action action = () => Execucao.Criar(
            Guid.NewGuid(), Guid.NewGuid(), null, "Minha Obra", null, null, "", 
            inicio, fim, 1, null, null, StatusExecucao.Pendente);

        action.Should().Throw<DomainException>()
            .WithMessage("O horário de fim deve ser posterior ao início.");
    }

    [Fact]
    public void Atualizar_RecalculaDuracao()
    {
        // Arrange
        var execucao = Execucao.Criar(
            Guid.NewGuid(), Guid.NewGuid(), null, "Minha Obra", null, null, "", 
            new TimeOnly(14, 30, 0), new TimeOnly(14, 31, 0), 1, null, null, StatusExecucao.Pendente);

        execucao.DuracaoSegundos.Should().Be(60);

        var novoInicio = new TimeOnly(15, 0, 0);
        var novoFim = new TimeOnly(15, 2, 30);

        // Act
        execucao.Atualizar(
            execucao.ObraId, null, "Novo Titulo", null, null, "", 
            novoInicio, novoFim, 2, null, null, StatusExecucao.Identificada);

        // Assert
        execucao.DuracaoSegundos.Should().Be(150); // 2 minutos e 30 segundos
        execucao.ObraTitulo.Should().Be("Novo Titulo");
        execucao.Status.Should().Be(StatusExecucao.Identificada);
        execucao.Quantidade.Should().Be(2);
    }
    [Fact]
    public void Resolver_ExecucaoPendente_TransicionaParaIdentificadaEAtualizaDados()
    {
        // Arrange
        var execucao = Execucao.Criar(
            Guid.NewGuid(), Guid.NewGuid(), null, "Obra Provisoria", null, null, "", 
            new TimeOnly(14, 30, 0), new TimeOnly(14, 31, 0), 1, null, null, StatusExecucao.Pendente);

        var obraId = Guid.NewGuid();
        var fonogramaId = Guid.NewGuid();

        // Act
        execucao.Resolver(obraId, fonogramaId, "Titulo Resolvido", "BRUM99999999", "T-000000000-1", "Artista 1");

        // Assert
        execucao.Status.Should().Be(StatusExecucao.Identificada);
        execucao.ObraId.Should().Be(obraId);
        execucao.FonogramaId.Should().Be(fonogramaId);
        execucao.ObraTitulo.Should().Be("Titulo Resolvido");
        execucao.FonogramaIsrc.Should().Be("BRUM99999999");
        execucao.ObraIswc.Should().Be("T-000000000-1");
        execucao.Interpretes.Should().Be("Artista 1");
    }

    [Fact]
    public void Resolver_ExecucaoNaoPendente_LancaDomainException()
    {
        // Arrange
        var execucao = Execucao.Criar(
            Guid.NewGuid(), Guid.NewGuid(), null, "Obra Final", null, null, "", 
            new TimeOnly(14, 30, 0), new TimeOnly(14, 31, 0), 1, null, null, StatusExecucao.Identificada);

        // Act & Assert
        Action action = () => execucao.Resolver(Guid.NewGuid(), null, "Novo Titulo", null, null, "");

        action.Should().Throw<DomainException>()
            .WithMessage("Execução já está identificada.");
    }

    // ───────────── Cobertura faltante ─────────────

    private static Execucao CriarPendente() => Execucao.Criar(
        Guid.NewGuid(), Guid.NewGuid(), null,
        "Tit Original", null, null, "",
        new TimeOnly(12, 0), new TimeOnly(12, 5),
        1, null, null, StatusExecucao.Pendente);

    [Fact]
    public void Criar_ObraTituloNull_LancaArgumentNullException()
    {
        var act = () => Execucao.Criar(
            Guid.NewGuid(), Guid.NewGuid(), null,
            null!, null, null, "",
            new TimeOnly(12, 0), new TimeOnly(12, 5),
            1, null, null, StatusExecucao.Pendente);

        act.Should().Throw<ArgumentNullException>().And.ParamName.Should().Be("obraTitulo");
    }

    [Fact]
    public void Atualizar_ObraTituloNull_LancaArgumentNullException()
    {
        var execucao = CriarPendente();

        var act = () => execucao.Atualizar(
            Guid.NewGuid(), null, null!, null, null, "",
            new TimeOnly(13, 0), new TimeOnly(13, 5),
            1, null, null, StatusExecucao.Pendente);

        act.Should().Throw<ArgumentNullException>().And.ParamName.Should().Be("obraTitulo");
    }

    [Fact]
    public void Atualizar_FimMenorOuIgualInicio_LancaDomainException()
    {
        var execucao = CriarPendente();

        var act = () => execucao.Atualizar(
            Guid.NewGuid(), null, "Tit", null, null, "",
            new TimeOnly(13, 0), new TimeOnly(13, 0), // fim == inicio
            1, null, null, StatusExecucao.Pendente);

        act.Should().Throw<DomainException>().WithMessage("O horário de fim deve ser posterior ao início.");
    }

    [Fact]
    public void Resolver_ObraTituloNull_LancaArgumentNullException()
    {
        var execucao = CriarPendente();

        var act = () => execucao.Resolver(Guid.NewGuid(), null, null!, null, null, "");

        act.Should().Throw<ArgumentNullException>().And.ParamName.Should().Be("obraTitulo");
    }
}
