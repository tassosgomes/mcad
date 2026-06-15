using AwesomeAssertions;
using Cadastro.Application.Audit;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Portal.Commands;
using Cadastro.Application.Portal.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Cadastro.UnitTests.Portal;

/// <summary>
/// Unit tests para <see cref="AtualizarContatoCommandHandler"/> (RF-09 a RF-13).
/// Cobertura:
/// - RF-11: formatos inválidos (email, CEP, UF, >5 telefones) → <c>DomainException</c> (422).
/// - RF-12: snapshot "antes" capturado PRE-mutation e reflete o valor anterior.
/// - RF-13: outbox <c>AddEvent("cadastro.titular.contato.atualizado")</c> chamado no sucesso.
/// - Titular inexistente → <c>NotFoundException</c> (404).
/// </summary>
public class AtualizarContatoCommandHandlerTests
{
    private readonly Mock<ITitularRepository> _mockTitularRepo;
    private readonly Mock<IValidator<AtualizarContatoCommand>> _mockValidator;
    private readonly Mock<ITitularAuditPublisher> _mockAuditPublisher;
    private readonly Mock<IOutboxEventWriter> _mockOutbox;
    private readonly AtualizarContatoCommandHandler _handler;

    public AtualizarContatoCommandHandlerTests()
    {
        _mockTitularRepo = new Mock<ITitularRepository>();
        _mockValidator = new Mock<IValidator<AtualizarContatoCommand>>();
        _mockAuditPublisher = new Mock<ITitularAuditPublisher>();
        _mockOutbox = new Mock<IOutboxEventWriter>();

        // Validator estrutural sempre passa — testamos a validação algorítmica via VOs.
        _mockValidator.Setup(v => v.ValidateAsync(It.IsAny<AtualizarContatoCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult());

        // Snapshot default retorna dict vazio; testes específicos (RF-12) sobrescrevem.
        _mockAuditPublisher.Setup(a => a.Snapshot(It.IsAny<Titular>()))
            .Returns(new Dictionary<string, object?>());

        _handler = new AtualizarContatoCommandHandler(
            _mockTitularRepo.Object,
            _mockValidator.Object,
            _mockAuditPublisher.Object,
            _mockOutbox.Object,
            NullLogger<AtualizarContatoCommandHandler>.Instance);
    }

    private static Titular CriarTitularComContatoAntigo()
    {
        var cpf = Cpf.Create("123.456.789-09");
        var titular = Titular.CriarPessoaFisica("João", cpf, "BR", Guid.NewGuid(), null);
        // Contato ANTERIOR — será capturado no snapshot "antes" (RF-12).
        titular.AtualizarContato(
            Email.Create("antigo@exemplo.com"),
            Endereco.Create(
                Cep.Create("01001-000"),
                "Praça da Sé",
                "100",
                complemento: null,
                "Sé",
                "São Paulo",
                Uf.Create("SP")),
            [
                new TelefoneTitular(TipoTelefone.Celular, Telefone.Create("(11) 99999-0000"))
            ]);
        return titular;
    }

    private static AtualizarContatoCommand CommandValido(Guid titularId) => new(
        titularId,
        Email: "novo@exemplo.com",
        Endereco: new EnderecoDto(
            "01002-000",
            "Av. Paulista",
            "200",
            "Sala 10",
            "Bela Vista",
            "São Paulo",
            "SP"),
        Telefones: [new TelefoneDto("CELULAR", "(11) 98888-1111")]);

    // ──────────────────────────────────────────────────────────────────────────
    // RF-11: validação algorítmica nos VOs → DomainException (422)
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_ComEmailInvalido_DeveLancarDomainException()
    {
        // Arrange — RF-11: email com formato inválido é rejeitado pelo VO Email.
        var titular = CriarTitularComContatoAntigo();
        _mockTitularRepo.Setup(r => r.GetByIdForUpdateAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var command = CommandValido(titular.Id) with { Email = "nao-e-email" };

        // Act & Assert — DomainException propagada (422 no GlobalExceptionHandler)
        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));
        ex.Message.Should().Contain("E-mail");

        // Nada persistido — falhou antes do SaveChanges.
        _mockTitularRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        _mockOutbox.Verify(o => o.AddEvent(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ComCepInvalido_DeveLancarDomainException()
    {
        // Arrange — RF-11: CEP com formato inválido (não tem 8 dígitos).
        var titular = CriarTitularComContatoAntigo();
        _mockTitularRepo.Setup(r => r.GetByIdForUpdateAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var command = CommandValido(titular.Id) with
        {
            Endereco = new EnderecoDto("123", "Rua X", "1", null, "Bairro", "Cidade", "SP")
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));
        ex.Message.Should().Contain("CEP");

        _mockTitularRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ComUfInexistente_DeveLancarDomainException()
    {
        // Arrange — RF-11: UF inexistente (não está entre as 27 UFs brasileiras).
        var titular = CriarTitularComContatoAntigo();
        _mockTitularRepo.Setup(r => r.GetByIdForUpdateAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var command = CommandValido(titular.Id) with
        {
            Endereco = new EnderecoDto("01001-000", "Rua X", "1", null, "Bairro", "Cidade", "XX")
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));
        ex.Message.Should().Contain("UF");

        _mockTitularRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ComMaisDeCincoTelefones_DeveLancarDomainException()
    {
        // Arrange — cap 5 imposto pelo domínio (Titular.AtualizarContato).
        var titular = CriarTitularComContatoAntigo();
        _mockTitularRepo.Setup(r => r.GetByIdForUpdateAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        // Validator estrutural permite até 5 — aqui forçamos 6 para o domínio rejeitar.
        var seisTelefones = Enumerable.Range(0, 6)
            .Select(_ => new TelefoneDto("CELULAR", "(11) 99999-0000"))
            .ToList();

        var command = CommandValido(titular.Id) with { Telefones = seisTelefones };

        // Act & Assert — o Validator estrutural precisaria deixar passar; aqui sobrescrevemos
        // para garantir que é o domínio que rejeita (RF-11 algorítmico, cap 5).
        _mockValidator.Setup(v => v.ValidateAsync(It.IsAny<AtualizarContatoCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult());

        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));
        ex.Message.Should().Contain("5 telefones");

        _mockTitularRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ComTelefoneInvalido_DeveLancarDomainException()
    {
        // Arrange — RF-11: número de telefone inválido (DDD/número não bate).
        var titular = CriarTitularComContatoAntigo();
        _mockTitularRepo.Setup(r => r.GetByIdForUpdateAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var command = CommandValido(titular.Id) with
        {
            Telefones = [new TelefoneDto("CELULAR", "123")]
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));
        ex.Message.Should().Contain("Telefone");

        _mockTitularRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Titular inexistente → NotFoundException (404)
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_ComTitularInexistente_DeveLancarNotFoundException()
    {
        // Arrange — titularId do token não corresponde a nenhum titular (conta removida?).
        var titularId = Guid.NewGuid();
        _mockTitularRepo.Setup(r => r.GetByIdForUpdateAsync(titularId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Titular?)null);

        var command = CommandValido(titularId);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));
        ex.Message.Should().Contain("Titular");

        _mockTitularRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        _mockOutbox.Verify(o => o.AddEvent(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>()), Times.Never);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-12 + RF-13: sucesso — audit antes/depois + evento outbox
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_ComDadosValidos_DeveAtualizarContatoEPersistir()
    {
        // Arrange
        var titular = CriarTitularComContatoAntigo();
        _mockTitularRepo.Setup(r => r.GetByIdForUpdateAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var command = CommandValido(titular.Id);

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert — response reflete o novo estado (RF-09, RF-10)
        result.Should().NotBeNull();
        result.Email.Should().Be("novo@exemplo.com");
        result.Endereco.Should().NotBeNull();
        result.Endereco!.Logradouro.Should().Be("Av. Paulista");
        result.Telefones.Should().HaveCount(1);
        result.Telefones[0].Numero.Should().Be("11988881111");

        // Persistência atômica chamada uma vez.
        _mockTitularRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ComDadosValidos_DevePublicarEventoOutboxTitularContatoAtualizado()
    {
        // Arrange — RF-13: evento cadastro.titular.contato.atualizado no outbox.
        var titular = CriarTitularComContatoAntigo();
        _mockTitularRepo.Setup(r => r.GetByIdForUpdateAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var command = CommandValido(titular.Id);

        // Act
        await _handler.HandleAsync(command, CancellationToken.None);

        // Assert — AddEvent chamado com o routing key exato (RF-13).
        _mockOutbox.Verify(
            o => o.AddEvent(
                "cadastro.titular.contato.atualizado",
                titular.Id.ToString(),
                It.IsAny<object>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ComDadosValidos_DeveCapturarSnapshotAntesAntesDaMutacao()
    {
        // Arrange — RF-12: snapshot "antes" deve refletir o valor ANTERIOR de contato.
        var titular = CriarTitularComContatoAntigo();

        // Capturamos o estado do titular no momento em que Snapshot() é chamado pelo handler.
        // Como o handler chama Snapshot ANTES de AtualizarContato, o titular ainda terá o email antigo.
        string? emailNoMomentoDoSnapshot = null;
        _mockAuditPublisher.Setup(a => a.Snapshot(It.IsAny<Titular>()))
            .Callback<Titular>(t => emailNoMomentoDoSnapshot = t.Email?.Valor)
            .Returns(new Dictionary<string, object?> { ["email"] = "antigo@exemplo.com" });

        _mockTitularRepo.Setup(r => r.GetByIdForUpdateAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var command = CommandValido(titular.Id); // email novo: novo@exemplo.com

        // Act
        await _handler.HandleAsync(command, CancellationToken.None);

        // Assert — RF-12: no momento do Snapshot, o titular ainda tinha o email ANTIGO.
        emailNoMomentoDoSnapshot.Should().Be("antigo@exemplo.com",
            "o snapshot 'antes' deve ser capturado ANTES da mutação (RF-12)");

        // E após o handler, o titular passou a ter o email novo (mutação aplicada).
        titular.Email!.Valor.Should().Be("novo@exemplo.com");
    }

    [Fact]
    public async Task HandleAsync_ComDadosValidos_DeveChamarPublishAsyncComSnapshotAntesEOperacaoAtualizarContato()
    {
        // Arrange — RF-12: PublishAsync recebe o snapshot "antes" e a operação AtualizarContato.
        var titular = CriarTitularComContatoAntigo();
        _mockTitularRepo.Setup(r => r.GetByIdForUpdateAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var beforeSnapshot = new Dictionary<string, object?> { ["email"] = "antigo@exemplo.com" };
        _mockAuditPublisher.Setup(a => a.Snapshot(It.IsAny<Titular>()))
            .Returns(beforeSnapshot);

        var command = CommandValido(titular.Id);

        // Act
        await _handler.HandleAsync(command, CancellationToken.None);

        // Assert — PublishAsync chamado com a operação correta e o snapshot "antes".
        _mockAuditPublisher.Verify(
            a => a.PublishAsync(
                titular,
                TitularAuditOperation.AtualizarContato,
                beforeSnapshot,
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ComContatoNulo_DeveLimparDadosDeContato()
    {
        // Arrange — titular pode limpar contato passando null/empty (RF-09).
        var titular = CriarTitularComContatoAntigo();
        _mockTitularRepo.Setup(r => r.GetByIdForUpdateAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var command = new AtualizarContatoCommand(titular.Id, Email: null, Endereco: null, Telefones: []);

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert — contato limpo
        result.Email.Should().BeNull();
        result.Endereco.Should().BeNull();
        result.Telefones.Should().BeEmpty();

        titular.Email.Should().BeNull();
        titular.Endereco.Should().BeNull();
        titular.Telefones.Should().BeEmpty();

        // Mesmo limpo, o evento outbox é publicado (houve alteração).
        _mockOutbox.Verify(
            o => o.AddEvent("cadastro.titular.contato.atualizado", titular.Id.ToString(), It.IsAny<object>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ComTipoTelefoneCaseInsensitive_DeveAceitar()
    {
        // Arrange — tipo "celular" (minúsculo) deve ser aceito via Enum.Parse ignoreCase.
        var titular = CriarTitularComContatoAntigo();
        _mockTitularRepo.Setup(r => r.GetByIdForUpdateAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var command = CommandValido(titular.Id) with
        {
            Telefones = [new TelefoneDto("celular", "(11) 98888-1111")]
        };

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert
        result.Telefones.Should().HaveCount(1);
        result.Telefones[0].Tipo.Should().Be("CELULAR");
    }
}
