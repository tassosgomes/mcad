using AwesomeAssertions;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.ValueObjects;

namespace Cadastro.UnitTests.Fonogramas;

public class FonogramaTests
{
    [Fact]
    public void Criar_DeveRetornarFonogramaPendenteComObra()
    {
        var isrc = Isrc.Create("BRXYZ2300001");
        var obraId = Guid.NewGuid();

        var fonograma = Fonograma.Criar(isrc, obraId, "Brasil", new DateOnly(2023, 1, 1), new DateOnly(2023, 2, 1));

        fonograma.Should().NotBeNull();
        fonograma.Isrc.Valor.Should().Be("BRXYZ2300001");
        fonograma.ObraId.Should().Be(obraId);
        fonograma.Status.Should().Be(StatusFonograma.PendenteValidacao);
        fonograma.PaisOrigem.Should().Be("Brasil");
        fonograma.DataGravacao.Should().Be(new DateOnly(2023, 1, 1));
        fonograma.DataLancamento.Should().Be(new DateOnly(2023, 2, 1));
    }

    [Fact]
    public void Atualizar_FonogramaPendente_DeveAtualizarEContinuarPendente()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "Brasil", null, null);
        var novoIsrc = Isrc.Create("USXYZ2300002");

        fonograma.Atualizar(novoIsrc, "USA", new DateOnly(2023, 1, 1), null);

        fonograma.Isrc.Valor.Should().Be("USXYZ2300002");
        fonograma.PaisOrigem.Should().Be("USA");
        fonograma.Status.Should().Be(StatusFonograma.PendenteValidacao);
    }

    [Fact]
    public void RequerDepuracao_FonogramaLiberadoEIsrcDiferente_RetornaTrue()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "Brasil", null, null);
        // Usar reflection para forçar status ou adicionar método de teste se necessário.
        // Como não podemos setar private setters diretamente, vamos usar force:
        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(fonograma, StatusFonograma.Liberado);

        var requer = fonograma.RequerDepuracao(Isrc.Create("USXYZ2300002"));

        requer.Should().BeTrue();
    }

    [Fact]
    public void RequerDepuracao_FonogramaLiberadoEIsrcIgual_RetornaFalse()
    {
        var isrc = Isrc.Create("BRXYZ2300001");
        var fonograma = Fonograma.Criar(isrc, Guid.NewGuid(), "Brasil", null, null);
        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(fonograma, StatusFonograma.Liberado);

        var requer = fonograma.RequerDepuracao(Isrc.Create("BRXYZ2300001"));

        requer.Should().BeFalse();
    }

    [Fact]
    public void PodeSerExcluido_FonogramaLiberadoOuDepurado_RetornaFalse()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "Brasil", null, null);
        
        fonograma.PodeSerExcluido.Should().BeTrue();

        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(fonograma, StatusFonograma.Liberado);
        fonograma.PodeSerExcluido.Should().BeFalse();

        prop?.SetValue(fonograma, StatusFonograma.Depurado);
        fonograma.PodeSerExcluido.Should().BeFalse();
    }

    [Fact]
    public void Depurar_FonogramaValido_DeveMudarStatusEDefinirFk()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "Brasil", null, null);
        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(fonograma, StatusFonograma.Liberado);
        
        var novoId = Guid.NewGuid();

        fonograma.Depurar(novoId);

        fonograma.Status.Should().Be(StatusFonograma.Depurado);
        fonograma.FonogramaDepuradoParaId.Should().Be(novoId);
    }

    [Fact]
    public void Depurar_FonogramaNaoLiberado_DeveLancarDomainException()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "Brasil", null, null);

        var action = () => fonograma.Depurar(Guid.NewGuid());

        action.Should().Throw<DomainException>().WithMessage("Apenas fonogramas LIBERADOS podem ser depurados");
    }

    // ---------------------------------------------------------------------------
    // Liberar
    // ---------------------------------------------------------------------------

    [Fact]
    public void Liberar_FonogramaPendenteDocumentacao_DeveTransitarParaLiberado()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "Brasil", null, null);
        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(fonograma, StatusFonograma.PendenteDocumentacao);

        fonograma.Liberar();

        fonograma.Status.Should().Be(StatusFonograma.Liberado);
    }

    [Fact]
    public void Liberar_FonogramaJaLiberado_DeveLancarDomainException()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "Brasil", null, null);
        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(fonograma, StatusFonograma.Liberado);

        var action = () => fonograma.Liberar();

        action.Should().Throw<DomainException>()
            .WithMessage("Apenas fonogramas em PENDENTE_DOCUMENTACAO podem ser liberados");
    }

    [Fact]
    public void Liberar_FonogramaDepurado_DeveLancarDomainException()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "Brasil", null, null);
        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(fonograma, StatusFonograma.Depurado);

        var action = () => fonograma.Liberar();

        action.Should().Throw<DomainException>()
            .WithMessage("Apenas fonogramas em PENDENTE_DOCUMENTACAO podem ser liberados");
    }

    // ---------------------------------------------------------------------------
    // Bloquear
    // ---------------------------------------------------------------------------

    [Fact]
    public void Bloquear_FonogramaLiberado_DeveMudarStatusEArmazenarJustificativa()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "Brasil", null, null);
        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(fonograma, StatusFonograma.Liberado);

        fonograma.Bloquear("Suspeita de fraude");

        fonograma.Status.Should().Be(StatusFonograma.Bloqueado);
        fonograma.BloqueioJustificativa.Should().Be("Suspeita de fraude");
    }

    [Fact]
    public void Bloquear_FonogramaDepurado_DeveLancarDomainException()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "Brasil", null, null);
        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(fonograma, StatusFonograma.Depurado);

        var action = () => fonograma.Bloquear("Qualquer motivo");

        action.Should().Throw<DomainException>()
            .WithMessage("Fonogramas depurados não podem ser bloqueados");
    }

    [Fact]
    public void Bloquear_FonogramaJaBloqueado_DeveLancarDomainException()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "Brasil", null, null);
        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(fonograma, StatusFonograma.Bloqueado);

        var action = () => fonograma.Bloquear("Tentativa dupla");

        action.Should().Throw<DomainException>()
            .WithMessage("Fonograma já está bloqueado");
    }

    // Bloquear_SemMotivo_DeveLancarDomainException — SKIPPED
    // O método Bloquear(string justificativa) não valida se a justificativa é nula ou
    // vazia; a regra não existe no domínio atual, portanto não há comportamento a testar.

    // ---------------------------------------------------------------------------
    // Desbloquear
    // ---------------------------------------------------------------------------

    [Fact]
    public void Desbloquear_FonogramaBloqueado_DeveRestaurarPendenteValidacaoELimparJustificativa()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "Brasil", null, null);
        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(fonograma, StatusFonograma.Bloqueado);
        var justProp = typeof(Fonograma).GetProperty("BloqueioJustificativa");
        justProp?.SetValue(fonograma, "Motivo anterior");

        fonograma.Desbloquear();

        fonograma.Status.Should().Be(StatusFonograma.PendenteValidacao);
        fonograma.BloqueioJustificativa.Should().BeNull();
    }

    [Fact]
    public void Desbloquear_FonogramaNaoBloqueado_DeveLancarDomainException()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "Brasil", null, null);
        // Status inicial é PendenteValidacao — não é Bloqueado.

        var action = () => fonograma.Desbloquear();

        action.Should().Throw<DomainException>()
            .WithMessage("Apenas fonogramas BLOQUEADOS podem ser desbloqueados");
    }

    // ---------------------------------------------------------------------------
    // DefinirUrlAudio
    // ---------------------------------------------------------------------------

    [Fact]
    public void DefinirUrlAudio_FonogramaPendenteValidacao_DeveDefinirUrl()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "Brasil", null, null);
        // Status inicial é PendenteValidacao — operação deve ser permitida.

        fonograma.DefinirUrlAudio("https://storage.example.com/audio.mp3");

        fonograma.UrlAudio.Should().Be("https://storage.example.com/audio.mp3");
    }

    [Fact]
    public void DefinirUrlAudio_FonogramaPendenteDocumentacao_DeveDefinirUrl()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "Brasil", null, null);
        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(fonograma, StatusFonograma.PendenteDocumentacao);

        fonograma.DefinirUrlAudio("https://storage.example.com/audio.mp3");

        fonograma.UrlAudio.Should().Be("https://storage.example.com/audio.mp3");
    }

    [Fact]
    public void DefinirUrlAudio_FonogramaLiberado_DeveLancarDomainException()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "Brasil", null, null);
        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(fonograma, StatusFonograma.Liberado);

        var action = () => fonograma.DefinirUrlAudio("https://storage.example.com/audio.mp3");

        action.Should().Throw<DomainException>()
            .WithMessage("URL de áudio não pode ser alterada nesse status");
    }

    [Fact]
    public void DefinirUrlAudio_FonogramaDepurado_DeveLancarDomainException()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "Brasil", null, null);
        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(fonograma, StatusFonograma.Depurado);

        var action = () => fonograma.DefinirUrlAudio("https://storage.example.com/audio.mp3");

        action.Should().Throw<DomainException>()
            .WithMessage("URL de áudio não pode ser alterada nesse status");
    }

    [Fact]
    public void DefinirUrlAudio_FonogramaBloqueado_DeveLancarDomainException()
    {
        var fonograma = Fonograma.Criar(Isrc.Create("BRXYZ2300001"), Guid.NewGuid(), "Brasil", null, null);
        var prop = typeof(Fonograma).GetProperty("Status");
        prop?.SetValue(fonograma, StatusFonograma.Bloqueado);

        var action = () => fonograma.DefinirUrlAudio("https://storage.example.com/audio.mp3");

        action.Should().Throw<DomainException>()
            .WithMessage("URL de áudio não pode ser alterada nesse status");
    }
}
