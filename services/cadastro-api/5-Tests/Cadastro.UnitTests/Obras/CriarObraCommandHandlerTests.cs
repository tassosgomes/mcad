using Cadastro.Application.Audit;
using Cadastro.Application.Obras.Commands;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using FluentAssertions;
using Moq;
using Xunit;

namespace Cadastro.UnitTests.Obras;

public class CriarObraCommandHandlerTests
{
    private readonly Mock<IObraRepository> _repoMock;
    private readonly Mock<IObraAuditPublisher> _auditMock;
    private readonly CriarObraCommandHandler _handler;

    public CriarObraCommandHandlerTests()
    {
        _repoMock = new Mock<IObraRepository>();
        _auditMock = new Mock<IObraAuditPublisher>();
        _handler = new CriarObraCommandHandler(_repoMock.Object, _auditMock.Object);
    }

    [Fact]
    public async Task CriarObraPendenteCommandHandler_ComPayloadValido_DeveCriarObraPendente()
    {
        ObraMusical? obraPersistida = null;
        _repoMock
            .Setup(r => r.AddAsync(It.IsAny<ObraMusical>(), It.IsAny<CancellationToken>()))
            .Callback<ObraMusical, CancellationToken>((obra, _) => obraPersistida = obra)
            .ReturnsAsync((ObraMusical obra, CancellationToken _) => obra);

        var handler = new CriarObraPendenteCommandHandler(_repoMock.Object, _auditMock.Object);
        var command = new CriarObraPendenteCommand("Obra Inline", "POT_POURRI");

        var response = await handler.HandleAsync(command, CancellationToken.None);

        response.Titulo.Should().Be("Obra Inline");
        response.Tipo.Should().Be("POT_POURRI");
        response.Status.Should().Be("PENDENTE");
        obraPersistida.Should().NotBeNull();
        obraPersistida!.Status.Should().Be(StatusObra.Pendente);
        obraPersistida.Tipo.Should().Be(TipoObra.PotPourri);
        _repoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        _auditMock.Verify(a => a.PublishAsync(
            obraPersistida,
            ObraAuditOperation.Create,
            null,
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public void CriarObraPendenteCommandValidator_ComTipoInvalido_DeveRejeitar()
    {
        var validator = new CriarObraPendenteCommandValidator();
        var command = new CriarObraPendenteCommand("Obra Inline", "AUDIOVISUAL");

        var result = validator.Validate(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(error => error.ErrorMessage.Contains("Tipo inválido"));
    }

}
