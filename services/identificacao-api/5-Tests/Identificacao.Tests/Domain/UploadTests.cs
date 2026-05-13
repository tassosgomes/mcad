using System;
using FluentAssertions;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Xunit;

namespace Identificacao.Tests.Domain;

public class UploadTests
{
    [Fact]
    public void MarcarConcluido_SemErros_StatusConcluido()
    {
        // Arrange
        var upload = Upload.Criar(Guid.NewGuid(), "arquivo.csv", "key", Guid.NewGuid());

        // Act
        upload.MarcarConcluido(100, 100, 0);

        // Assert
        upload.Status.Should().Be(StatusUpload.Concluido);
        upload.TotalLinhas.Should().Be(100);
        upload.ExecucoesCriadas.Should().Be(100);
        upload.TotalErros.Should().Be(0);
        upload.ProcessadoEm.Should().NotBeNull();
    }

    [Fact]
    public void MarcarConcluido_ComErros_StatusConcluidoComErros()
    {
        // Arrange
        var upload = Upload.Criar(Guid.NewGuid(), "arquivo.csv", "key", Guid.NewGuid());

        // Act
        upload.MarcarConcluido(100, 95, 5);

        // Assert
        upload.Status.Should().Be(StatusUpload.ConcluidoComErros);
        upload.TotalLinhas.Should().Be(100);
        upload.ExecucoesCriadas.Should().Be(95);
        upload.TotalErros.Should().Be(5);
        upload.ProcessadoEm.Should().NotBeNull();
    }

    [Fact]
    public void MarcarErro_StatusErroComMensagem()
    {
        // Arrange
        var upload = Upload.Criar(Guid.NewGuid(), "arquivo.csv", "key", Guid.NewGuid());

        // Act
        upload.MarcarErro("Erro interno");

        // Assert
        upload.Status.Should().Be(StatusUpload.Erro);
        upload.MensagemErro.Should().Be("Erro interno");
        upload.ProcessadoEm.Should().NotBeNull();
    }
}
