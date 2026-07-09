using AwesomeAssertions;
using Cadastro.Application.Repertorios.Commands;
using Cadastro.Domain.Enums;
using FluentValidation.TestHelper;

namespace Cadastro.UnitTests.Repertorios;

public class RegistrarRepertorioCommandValidatorTests
{
    private readonly RegistrarRepertorioCommandValidator _validator = new();

    private static RegistrarRepertorioCommand CriarComandoValido()
    {
        return new RegistrarRepertorioCommand(
            Obra: new DadosObraRepertorio("Obra Teste", null, TipoObra.Musical, null),
            Titulares:
            [
                new TitularRepertorioInput(Guid.NewGuid(), null)
            ],
            Titularidades:
            [
                new TitularidadeRepertorioInput("0", CategoriaAutoral.Autor, 100m)
            ],
            Fonogramas:
            [
                new FonogramaRepertorioInput("BRABC2301234", "BR", null, null, "https://audio.example.com/track.mp3",
                [
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.Interprete),
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.ProdutorFonografico)
                ])
            ],
            SalvarComoPendente: false);
    }

    [Fact]
    public void Validate_ComComandoValido_NaoDeveTerErros()
    {
        var command = CriarComandoValido();

        var result = _validator.TestValidate(command);

        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_SemObra_DeveTerErro()
    {
        var command = new RegistrarRepertorioCommand(null!, [], [], [], false);

        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor(x => x.Obra);
    }

    [Fact]
    public void Validate_SemTitulo_DeveTerErro()
    {
        var command = CriarComandoValido() with
        {
            Obra = new DadosObraRepertorio(string.Empty, null, TipoObra.Musical, null)
        };

        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor("Obra.Titulo");
    }

    [Fact]
    public void Validate_SemTitulares_DeveTerErro()
    {
        var command = CriarComandoValido() with { Titulares = [] };

        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor(x => x.Titulares);
    }

    [Fact]
    public void Validate_SemTitularidades_DeveTerErro()
    {
        var command = CriarComandoValido() with { Titularidades = [] };

        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor(x => x.Titularidades);
    }

    [Fact]
    public void Validate_SemFonogramas_DeveTerErro()
    {
        var command = CriarComandoValido() with { Fonogramas = [] };

        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor(x => x.Fonogramas);
    }

    [Fact]
    public void Validate_TitularComTitularIdENovoTitular_DeveTerErro()
    {
        var command = CriarComandoValido() with
        {
            Titulares =
            [
                new TitularRepertorioInput(Guid.NewGuid(), new NovoTitularRepertorioInput("Nome", TipoTitular.PF, "12345678909", "BR", Guid.NewGuid(), null))
            ]
        };

        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor("Titulares[0]");
    }

    [Fact]
    public void Validate_TitularSemTitularIdENemNovoTitular_DeveTerErro()
    {
        var command = CriarComandoValido() with
        {
            Titulares =
            [
                new TitularRepertorioInput(null, null)
            ]
        };

        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor("Titulares[0]");
    }

    [Fact]
    public void Validate_NovoTitularSemNome_DeveTerErro()
    {
        var command = CriarComandoValido() with
        {
            Titulares =
            [
                new TitularRepertorioInput(null, new NovoTitularRepertorioInput(string.Empty, TipoTitular.PF, "12345678909", "BR", Guid.NewGuid(), null))
            ]
        };

        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor("Titulares[0].NovoTitular.Nome");
    }

    [Fact]
    public void Validate_NovoTitularComDocumentoCpfInvalido_DeveTerErro()
    {
        var command = CriarComandoValido() with
        {
            Titulares =
            [
                new TitularRepertorioInput(null, new NovoTitularRepertorioInput("Joao", TipoTitular.PF, "123", "BR", Guid.NewGuid(), null))
            ]
        };

        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor("Titulares[0].NovoTitular.Documento");
    }

    [Fact]
    public void Validate_NovoTitularComDocumentoCnpjInvalido_DeveTerErro()
    {
        var command = CriarComandoValido() with
        {
            Titulares =
            [
                new TitularRepertorioInput(null, new NovoTitularRepertorioInput("Empresa", TipoTitular.PJ, "12345", "BR", Guid.NewGuid(), null))
            ]
        };

        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor("Titulares[0].NovoTitular.Documento");
    }

    [Fact]
    public void Validate_NovoTitularSemAssociacao_DeveTerErro()
    {
        var command = CriarComandoValido() with
        {
            Titulares =
            [
                new TitularRepertorioInput(null, new NovoTitularRepertorioInput("Joao", TipoTitular.PF, "12345678909", "BR", Guid.Empty, null))
            ]
        };

        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor("Titulares[0].NovoTitular.AssociacaoId");
    }

    [Fact]
    public void Validate_TitularidadeSemLocalKey_DeveTerErro()
    {
        var command = CriarComandoValido() with
        {
            Titularidades =
            [
                new TitularidadeRepertorioInput(string.Empty, CategoriaAutoral.Autor, 50m)
            ]
        };

        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor("Titularidades[0].TitularLocalKey");
    }

    [Fact]
    public void Validate_TitularidadeComPercentualZero_DeveTerErro()
    {
        var command = CriarComandoValido() with
        {
            Titularidades =
            [
                new TitularidadeRepertorioInput("0", CategoriaAutoral.Autor, 0m)
            ]
        };

        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor("Titularidades[0].Percentual");
    }

    [Fact]
    public void Validate_TitularidadeComPercentualAcimaDeCem_DeveTerErro()
    {
        var command = CriarComandoValido() with
        {
            Titularidades =
            [
                new TitularidadeRepertorioInput("0", CategoriaAutoral.Autor, 150m)
            ]
        };

        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor("Titularidades[0].Percentual");
    }

    [Fact]
    public void Validate_FonogramaSemIsrc_DeveTerErro()
    {
        var command = CriarComandoValido() with
        {
            Fonogramas =
            [
                new FonogramaRepertorioInput(string.Empty, "BR", null, null, "https://audio.example.com/track.mp3", [])
            ]
        };

        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor("Fonogramas[0].Isrc");
    }

    [Fact]
    public void Validate_FonogramaComIsrcInvalido_DeveTerErro()
    {
        var command = CriarComandoValido() with
        {
            Fonogramas =
            [
                new FonogramaRepertorioInput("INVALID", "BR", null, null, "https://audio.example.com/track.mp3",
                [
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.Interprete),
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.ProdutorFonografico)
                ])
            ]
        };

        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor("Fonogramas[0].Isrc");
    }

    [Fact]
    public void Validate_FonogramaSemUrlAudio_DeveTerErro()
    {
        var command = CriarComandoValido() with
        {
            Fonogramas =
            [
                new FonogramaRepertorioInput("BRABC2301234", "BR", null, null, string.Empty,
                [
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.Interprete),
                    new ParticipacaoRepertorioInput("0", CategoriaConexo.ProdutorFonografico)
                ])
            ]
        };

        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor("Fonogramas[0].UrlAudio");
    }

    [Fact]
    public void Validate_FonogramaSemParticipacoes_DeveTerErro()
    {
        var command = CriarComandoValido() with
        {
            Fonogramas =
            [
                new FonogramaRepertorioInput("BRABC2301234", "BR", null, null, "https://audio.example.com/track.mp3", [])
            ]
        };

        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor("Fonogramas[0].Participacoes");
    }

    [Fact]
    public void Validate_ParticipacaoSemLocalKey_DeveTerErro()
    {
        var command = CriarComandoValido() with
        {
            Fonogramas =
            [
                new FonogramaRepertorioInput("BRABC2301234", "BR", null, null, "https://audio.example.com/track.mp3",
                [
                    new ParticipacaoRepertorioInput(string.Empty, CategoriaConexo.Interprete)
                ])
            ]
        };

        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor("Fonogramas[0].Participacoes[0].TitularLocalKey");
    }

    [Fact]
    public void Validate_NovoTitularValidoCpf_NaoDeveTerErro()
    {
        var command = CriarComandoValido() with
        {
            Titulares =
            [
                new TitularRepertorioInput(null, new NovoTitularRepertorioInput("Joao", TipoTitular.PF, "123.456.789-09", "BR", Guid.NewGuid(), null))
            ]
        };

        var result = _validator.TestValidate(command);

        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_NovoTitularValidoCnpj_NaoDeveTerErro()
    {
        var command = CriarComandoValido() with
        {
            Titulares =
            [
                new TitularRepertorioInput(null, new NovoTitularRepertorioInput("Empresa Ltda", TipoTitular.PJ, "12345678901234", "BR", Guid.NewGuid(), "CAE001"))
            ]
        };

        var result = _validator.TestValidate(command);

        result.ShouldNotHaveAnyValidationErrors();
    }
}
