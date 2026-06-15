using AwesomeAssertions;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Portal.Commands;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;
using Cadastro.Domain.ValueObjects;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using ValidationException = Cadastro.Application.Common.Exceptions.ValidationException;

namespace Cadastro.UnitTests.Portal;

/// <summary>
/// Unit tests para <see cref="AbrirSolicitacaoCommandHandler"/> (RF-14, RF-15, RF-17, RF-20, RF-21).
/// Cobertura:
/// - RF-15: solicitação nasce <c>SOLICITADA</c>.
/// - RF-20: <c>ASSOCIACAO</c> sem destino (valor vazio) → <c>DomainException</c> do domínio.
/// - RF-14: validação estrutural — campo inválido, justificativa curta → <c>ValidationException</c>.
/// - RF-21: <c>ExigeAvisoJanela</c> é <c>true</c> apenas quando <c>Campo == ASSOCIACAO</c>.
/// - Captura de <c>ValorAtual</c> do titular carregado (Nome, CaeIpi, AssociacaoId, Tipo).
/// - Persistência: <c>AddAsync</c> + <c>SaveChangesAsync</c> chamados uma vez no sucesso.
/// - Titular inexistente → <c>NotFoundException</c> (404).
/// </summary>
public class AbrirSolicitacaoCommandHandlerTests
{
    private readonly Mock<ISolicitacaoAlteracaoRepository> _mockRepo;
    private readonly Mock<ITitularRepository> _mockTitularRepo;
    private readonly Mock<IValidator<AbrirSolicitacaoCommand>> _mockValidator;
    private readonly AbrirSolicitacaoCommandHandler _handler;

    public AbrirSolicitacaoCommandHandlerTests()
    {
        _mockRepo = new Mock<ISolicitacaoAlteracaoRepository>();
        _mockTitularRepo = new Mock<ITitularRepository>();
        _mockValidator = new Mock<IValidator<AbrirSolicitacaoCommand>>();

        // Validator estrutural sempre passa — testamos falhas específicas sobrescrevendo o setup.
        _mockValidator.Setup(v => v.ValidateAsync(It.IsAny<AbrirSolicitacaoCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult());

        // AddAsync retorna a própria entidade recebida (simula EF Core).
        _mockRepo.Setup(r => r.AddAsync(It.IsAny<SolicitacaoAlteracao>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SolicitacaoAlteracao s, CancellationToken _) => s);

        _handler = new AbrirSolicitacaoCommandHandler(
            _mockRepo.Object,
            _mockTitularRepo.Object,
            _mockValidator.Object,
            NullLogger<AbrirSolicitacaoCommandHandler>.Instance);
    }

    private static Titular CriarTitularPadrao(Guid? associacaoId = null, CaeIpi? caeIpi = null)
    {
        var cpf = Cpf.Create("123.456.789-09");
        return Titular.CriarPessoaFisica(
            nome: "João Silva",
            cpf: cpf,
            nacionalidade: "BR",
            associacaoId: associacaoId ?? Guid.NewGuid(),
            caeIpi: caeIpi);
    }

    private static AbrirSolicitacaoCommand CommandValido(Guid titularId, string campo = "NOME") => new(
        TitularId: titularId,
        Campo: campo,
        ValorPretendido: campo == "ASSOCIACAO" ? Guid.NewGuid().ToString() : "Novo Valor",
        Justificativa: "Justificativa válida com mais de dez caracteres.");

    // ──────────────────────────────────────────────────────────────────────────
    // RF-15: solicitação nasce SOLICITADA
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_ComCommandValido_DeveCriarSolicitacaoNoStatusSolicitada()
    {
        // Arrange
        var titular = CriarTitularPadrao();
        _mockTitularRepo.Setup(r => r.GetByIdAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var command = CommandValido(titular.Id);

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert — RF-15: a solicitação nasce no status SOLICITADA.
        result.Should().NotBeNull();
        result.Status.Should().Be("SOLICITADA");
        result.Id.Should().NotBeEmpty();
        result.Campo.Should().Be("NOME");
        result.ValorPretendido.Should().Be(command.ValorPretendido);
        result.Justificativa.Should().Be(command.Justificativa);
        result.DecididaEm.Should().BeNull();
        result.JustificativaRejeicao.Should().BeNull();

        // Persistência chamada uma vez.
        _mockRepo.Verify(r => r.AddAsync(It.IsAny<SolicitacaoAlteracao>(), It.IsAny<CancellationToken>()), Times.Once);
        _mockRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Captura de ValorAtual conforme Campo
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_ComCampoNome_DeveCapturarNomeDoTitularComoValorAtual()
    {
        // Arrange
        var titular = CriarTitularPadrao();
        _mockTitularRepo.Setup(r => r.GetByIdAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var command = CommandValido(titular.Id, campo: "NOME") with { ValorPretendido = "João Silva Souza" };

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert
        result.ValorAtual.Should().Be(titular.Nome);
        result.ValorPretendido.Should().Be("João Silva Souza");
    }

    [Fact]
    public async Task HandleAsync_ComCampoCaeIpi_DeveCapturarValorDoCaeIpiDoTitular()
    {
        // Arrange
        var caeIpi = CaeIpi.Create("1234567");
        var titular = CriarTitularPadrao(caeIpi: caeIpi);
        _mockTitularRepo.Setup(r => r.GetByIdAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var command = CommandValido(titular.Id, campo: "CAE_IPI") with { ValorPretendido = "7654321" };

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert
        result.ValorAtual.Should().Be("1234567");
        result.Campo.Should().Be("CAE_IPI");
    }

    [Fact]
    public async Task HandleAsync_ComCampoCaeIpiETitularSemCaeIpi_DeveCapturarStringVazia()
    {
        // Arrange — titular sem CAE/IPI preenchido.
        var titular = CriarTitularPadrao(caeIpi: null);
        _mockTitularRepo.Setup(r => r.GetByIdAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var command = CommandValido(titular.Id, campo: "CAE_IPI") with { ValorPretendido = "7654321" };

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert — ValorAtual é string vazia quando CaeIpi é null.
        result.ValorAtual.Should().BeEmpty();
    }

    [Fact]
    public async Task HandleAsync_ComCampoAssociacao_DeveCapturarAssociacaoIdDoTitular()
    {
        // Arrange
        var associacaoId = Guid.NewGuid();
        var titular = CriarTitularPadrao(associacaoId: associacaoId);
        _mockTitularRepo.Setup(r => r.GetByIdAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var command = CommandValido(titular.Id, campo: "ASSOCIACAO") with
        {
            ValorPretendido = Guid.NewGuid().ToString()
        };

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert
        result.ValorAtual.Should().Be(associacaoId.ToString());
        result.Campo.Should().Be("ASSOCIACAO");
    }

    [Fact]
    public async Task HandleAsync_ComCampoCategoria_DeveCapturarTipoTitularMaiusculo()
    {
        // Arrange
        var titular = CriarTitularPadrao();
        _mockTitularRepo.Setup(r => r.GetByIdAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var command = CommandValido(titular.Id, campo: "CATEGORIA") with { ValorPretendido = "PJ" };

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert — Categoria mapeia para Tipo (PF/PJ) em maiúsculas.
        result.ValorAtual.Should().Be("PF");
        result.Campo.Should().Be("CATEGORIA");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-20: ASSOCIACAO sem destino → DomainException
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_ComAssociacaoESemDestino_DeveLancarDomainExceptionRF20()
    {
        // Arrange — RF-20: o vínculo de associação só pode ser alterado, jamais removido.
        // Mesmo que o validator passe (simulando bypass), o domínio revalida em SolicitacaoAlteracao.Criar.
        var titular = CriarTitularPadrao();
        _mockTitularRepo.Setup(r => r.GetByIdAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var command = new AbrirSolicitacaoCommand(
            TitularId: titular.Id,
            Campo: "ASSOCIACAO",
            // String não-vazia para passar pelo handler, mas o teste de domínio abaixo
            // valida o cenário real. Aqui forçamos o caminho onde o domínio é acionado.
            ValorPretendido: "",
            Justificativa: "Justificativa válida com mais de dez caracteres.");

        // Act & Assert — o domínio lança DomainException (RF-20).
        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        ex.Message.Should().Contain("associação");

        // Persistência nunca é chamada quando o domínio rejeita.
        _mockRepo.Verify(r => r.AddAsync(It.IsAny<SolicitacaoAlteracao>(), It.IsAny<CancellationToken>()), Times.Never);
        _mockRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ComAssociacaoValida_DeveAceitarECapturarExigeAvisoJanela()
    {
        // Arrange — RF-20: destino informado (GUID válido) → domínio aceita.
        var titular = CriarTitularPadrao();
        _mockTitularRepo.Setup(r => r.GetByIdAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var command = CommandValido(titular.Id, campo: "ASSOCIACAO") with
        {
            ValorPretendido = Guid.NewGuid().ToString()
        };

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert — RF-21: ExigeAvisoJanela é true apenas para ASSOCIACAO.
        result.Status.Should().Be("SOLICITADA");
        result.ExigeAvisoJanela.Should().BeTrue();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-21: flag ExigeAvisoJanela
    // ──────────────────────────────────────────────────────────────────────────

    [Theory]
    [InlineData("NOME", false)]
    [InlineData("CAE_IPI", false)]
    [InlineData("CATEGORIA", false)]
    public async Task HandleAsync_ComCampoNaoAssociacao_DeveRetornarExigeAvisoJanelaFalse(
        string campo, bool esperado)
    {
        // Arrange — RF-21: ExigeAvisoJanela só é true para ASSOCIACAO.
        var titular = CriarTitularPadrao();
        _mockTitularRepo.Setup(r => r.GetByIdAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var command = CommandValido(titular.Id, campo: campo);

        // Act
        var result = await _handler.HandleAsync(command, CancellationToken.None);

        // Assert
        result.ExigeAvisoJanela.Should().Be(esperado);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RF-14: validação estrutural
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_ComFalhaDeValidacao_NaoDevePersistir()
    {
        // Arrange — validator falha; nada deve ser persistido.
        var titular = CriarTitularPadrao();
        _mockTitularRepo.Setup(r => r.GetByIdAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var command = CommandValido(titular.Id);

        _mockValidator.Setup(v => v.ValidateAsync(It.IsAny<AbrirSolicitacaoCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult(new[]
            {
                new ValidationFailure("Justificativa", "Justificativa deve ter no mínimo 10 caracteres")
            }));

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        ex.Errors.Should().ContainKey("Justificativa");
        _mockTitularRepo.Verify(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        _mockRepo.Verify(r => r.AddAsync(It.IsAny<SolicitacaoAlteracao>(), It.IsAny<CancellationToken>()), Times.Never);
        _mockRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ComCampoInvalido_DeveLancarValidationException()
    {
        // Arrange — RF-14: campo não mapeia para nenhum valor do enum CampoSolicitacao.
        var titular = CriarTitularPadrao();
        _mockTitularRepo.Setup(r => r.GetByIdAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var command = new AbrirSolicitacaoCommand(
            TitularId: titular.Id,
            Campo: "CAMPO_INEXISTENTE",
            ValorPretendido: "valor",
            Justificativa: "Justificativa válida com mais de dez caracteres.");

        _mockValidator.Setup(v => v.ValidateAsync(It.IsAny<AbrirSolicitacaoCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult(new[]
            {
                new ValidationFailure("Campo", "Campo inválido")
            }));

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        ex.Errors.Should().ContainKey("Campo");
    }

    [Fact]
    public async Task HandleAsync_ComJustificativaCurta_DeveLancarValidationException()
    {
        // Arrange — RF-14: justificativa com menos de 10 caracteres.
        var titular = CriarTitularPadrao();
        _mockTitularRepo.Setup(r => r.GetByIdAsync(titular.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(titular);

        var command = new AbrirSolicitacaoCommand(
            TitularId: titular.Id,
            Campo: "NOME",
            ValorPretendido: "valor",
            Justificativa: "curta");

        _mockValidator.Setup(v => v.ValidateAsync(It.IsAny<AbrirSolicitacaoCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult(new[]
            {
                new ValidationFailure("Justificativa", "Justificativa deve ter no mínimo 10 caracteres")
            }));

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        ex.Errors["Justificativa"].Should().Contain(e => e.Contains("10"));
    }

    [Fact]
    public async Task HandleAsync_ComTitularIdVazio_DeveFalharValidacao()
    {
        // Arrange — anti-tampering: TitularId não pode ser Guid.Empty.
        var command = CommandValido(Guid.Empty);

        _mockValidator.Setup(v => v.ValidateAsync(It.IsAny<AbrirSolicitacaoCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult(new[]
            {
                new ValidationFailure("TitularId", "TitularId é obrigatório")
            }));

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        ex.Errors.Should().ContainKey("TitularId");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Titular inexistente → NotFoundException (404)
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task HandleAsync_ComTitularInexistente_DeveLancarNotFoundException()
    {
        // Arrange — titular não encontrado no repositório.
        var titularId = Guid.NewGuid();
        _mockTitularRepo.Setup(r => r.GetByIdAsync(titularId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Titular?)null);

        var command = CommandValido(titularId);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.HandleAsync(command, CancellationToken.None));

        ex.ResourceName.Should().Be("Titular");
        _mockRepo.Verify(r => r.AddAsync(It.IsAny<SolicitacaoAlteracao>(), It.IsAny<CancellationToken>()), Times.Never);
        _mockRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }
}
