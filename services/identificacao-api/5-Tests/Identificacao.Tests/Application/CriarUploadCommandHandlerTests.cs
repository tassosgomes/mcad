using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using FluentValidation;
using Identificacao.Application.Uploads.Commands;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Identificacao.Domain.Exceptions;
using Identificacao.Domain.Interfaces;
using Moq;
using Xunit;

namespace Identificacao.Tests.Application;

public class CriarUploadCommandHandlerTests
{
    private readonly Mock<ICaptacaoRepository> _captacaoRepoMock = new();
    private readonly Mock<IUploadRepository> _uploadRepoMock = new();
    private readonly Mock<IMinioService> _minioServiceMock = new();
    
    private CriarUploadCommandHandler CreateHandler() 
        => new(
            _captacaoRepoMock.Object,
            _uploadRepoMock.Object,
            _minioServiceMock.Object,
            Mock.Of<IIdentificacaoAuditPublisher>());

    private Stream CreateStream(string content) 
        => new MemoryStream(Encoding.UTF8.GetBytes(content));

    [Fact]
    public async Task Handle_CsvValido_CriaUploadProcessando()
    {
        var handler = CreateHandler();
        var captacao = Captacao.Criar(Guid.NewGuid(), DateOnly.FromDateTime(DateTime.Today), "Teste", Guid.NewGuid(), "Nome");
        
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(captacao);

        var stream = CreateStream("isrc;iswc\n1;2");
        var cmd = new CriarUploadCommand(captacao.Id, "arq.csv", stream, captacao.AnalistaResponsavelId);

        var result = await handler.HandleAsync(cmd, default);

        result.Status.Should().Be("Processando");
        _minioServiceMock.Verify(m => m.UploadAsync(It.IsAny<string>(), stream, "text/csv", default), Times.Once);
        _uploadRepoMock.Verify(u => u.AddAsync(It.IsAny<Upload>(), default), Times.Once);
    }

    [Fact]
    public async Task Handle_ArquivoNaoCsv_LancaValidation()
    {
        var handler = CreateHandler();
        var stream = CreateStream("teste");
        var cmd = new CriarUploadCommand(Guid.NewGuid(), "arq.txt", stream, Guid.NewGuid());

        await Assert.ThrowsAsync<ValidationException>(() => handler.HandleAsync(cmd, default));
    }

    [Fact]
    public async Task Handle_ArquivoVazio_LancaValidation()
    {
        var handler = CreateHandler();
        var captacao = Captacao.Criar(Guid.NewGuid(), DateOnly.FromDateTime(DateTime.Today), "Teste", Guid.NewGuid(), "Nome");
        
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var stream = new MemoryStream(); // Zero bytes
        var cmd = new CriarUploadCommand(captacao.Id, "arq.csv", stream, captacao.AnalistaResponsavelId);

        await Assert.ThrowsAsync<ValidationException>(() => handler.HandleAsync(cmd, default));
    }

    [Fact]
    public async Task Handle_CaptacaoFechada_LancaDomainException()
    {
        var handler = CreateHandler();
        var captacao = Captacao.Criar(Guid.NewGuid(), DateOnly.FromDateTime(DateTime.Today), "Teste", Guid.NewGuid(), "Nome");
        typeof(Captacao).GetProperty("Status")?.SetValue(captacao, StatusCaptacao.Fechada);

        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var stream = CreateStream("teste");
        var cmd = new CriarUploadCommand(captacao.Id, "arq.csv", stream, captacao.AnalistaResponsavelId);

        await Assert.ThrowsAsync<DomainException>(() => handler.HandleAsync(cmd, default));
    }

    [Fact]
    public async Task Handle_OutroAnalista_LancaForbidden()
    {
        var handler = CreateHandler();
        var captacao = Captacao.Criar(Guid.NewGuid(), DateOnly.FromDateTime(DateTime.Today), "Teste", Guid.NewGuid(), "Nome");

        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        var stream = CreateStream("teste");
        var cmd = new CriarUploadCommand(captacao.Id, "arq.csv", stream, Guid.NewGuid()); // Diferente

        await Assert.ThrowsAsync<DomainException>(() => handler.HandleAsync(cmd, default)); // Captacao throws DomainException by default for validation
    }

    // ───────────── Cobertura faltante ─────────────

    [Fact]
    public async Task Handle_CaptacaoInexistente_LancaNotFoundException()
    {
        var handler = CreateHandler();
        var captacaoId = Guid.NewGuid();
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacaoId, It.IsAny<CancellationToken>())).ReturnsAsync((Captacao?)null);

        var stream = CreateStream("isrc;iswc\n1;2");
        var cmd = new CriarUploadCommand(captacaoId, "arq.csv", stream, Guid.NewGuid());

        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync(cmd, default));
    }

    [Fact]
    public async Task Handle_MinioFalha_NaoPersisteUpload()
    {
        var handler = CreateHandler();
        var captacao = Captacao.Criar(Guid.NewGuid(), DateOnly.FromDateTime(DateTime.Today), "Teste", Guid.NewGuid(), "Nome");
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);
        _minioServiceMock.Setup(m => m.UploadAsync(It.IsAny<string>(), It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("MinIO indisponível"));

        var stream = CreateStream("isrc;iswc\n1;2");
        var cmd = new CriarUploadCommand(captacao.Id, "arq.csv", stream, captacao.AnalistaResponsavelId);

        await Assert.ThrowsAsync<InvalidOperationException>(() => handler.HandleAsync(cmd, default));

        _uploadRepoMock.Verify(u => u.AddAsync(It.IsAny<Upload>(), It.IsAny<CancellationToken>()), Times.Never);
        _uploadRepoMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_FormatoMinioKey_RespeitaPadrao()
    {
        var handler = CreateHandler();
        var captacao = Captacao.Criar(Guid.NewGuid(), DateOnly.FromDateTime(DateTime.Today), "Teste", Guid.NewGuid(), "Nome");
        _captacaoRepoMock.Setup(r => r.GetByIdAsync(captacao.Id, It.IsAny<CancellationToken>())).ReturnsAsync(captacao);

        string? keyCapturada = null;
        _minioServiceMock.Setup(m => m.UploadAsync(It.IsAny<string>(), It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Callback<string, Stream, string, CancellationToken>((k, _, _, _) => keyCapturada = k)
            .ReturnsAsync((string k, Stream _, string _, CancellationToken _) => k);

        Upload? uploadCapturado = null;
        _uploadRepoMock.Setup(u => u.AddAsync(It.IsAny<Upload>(), It.IsAny<CancellationToken>()))
            .Callback<Upload, CancellationToken>((u, _) => uploadCapturado = u)
            .Returns(Task.CompletedTask);

        var stream = CreateStream("isrc;iswc\n1;2");
        var cmd = new CriarUploadCommand(captacao.Id, "meu-arquivo.csv", stream, captacao.AnalistaResponsavelId);

        await handler.HandleAsync(cmd, default);

        keyCapturada.Should().NotBeNull();
        uploadCapturado.Should().NotBeNull();
        keyCapturada.Should().Be($"uploads/{captacao.Id}/{uploadCapturado!.Id}/meu-arquivo.csv");
        uploadCapturado.MinioKey.Should().Be(keyCapturada);
    }
}
