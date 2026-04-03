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
}
