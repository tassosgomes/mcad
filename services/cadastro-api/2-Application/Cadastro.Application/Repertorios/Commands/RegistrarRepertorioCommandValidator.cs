using System.Text.RegularExpressions;
using Cadastro.Application.Repertorios.Responses;
using Cadastro.Domain.Enums;
using FluentValidation;

namespace Cadastro.Application.Repertorios.Commands;

public class RegistrarRepertorioCommandValidator : AbstractValidator<RegistrarRepertorioCommand>
{
    public RegistrarRepertorioCommandValidator()
    {
        RuleFor(x => x.Obra).NotNull().WithMessage("Dados da obra são obrigatórios.");

        When(x => x.Obra != null, () =>
        {
            RuleFor(x => x.Obra.Titulo)
                .NotEmpty().WithMessage("Título da obra é obrigatório.")
                .MaximumLength(300);

            RuleFor(x => x.Obra.Subtitulo)
                .MaximumLength(300);

            RuleFor(x => x.Obra.Tipo)
                .IsInEnum().WithMessage("Tipo de obra inválido.");
        });

        RuleFor(x => x.Titulares)
            .NotEmpty().WithMessage("Ao menos um titular é obrigatório.")
            .ForEach(titular => titular.SetValidator(new TitularRepertorioInputValidator()));

        RuleFor(x => x.Titularidades)
            .NotEmpty().WithMessage("Ao menos uma titularidade autoral é obrigatória.")
            .ForEach(titularidade => titularidade.SetValidator(new TitularidadeRepertorioInputValidator()));

        RuleFor(x => x.Fonogramas)
            .NotEmpty().WithMessage("Ao menos um fonograma é obrigatório.")
            .ForEach(fonograma => fonograma.SetValidator(new FonogramaRepertorioInputValidator()));
    }
}

public class TitularRepertorioInputValidator : AbstractValidator<TitularRepertorioInput>
{
    public TitularRepertorioInputValidator()
    {
        RuleFor(x => x)
            .Must(t => (t.TitularId.HasValue && t.NovoTitular is null) ||
                       (!t.TitularId.HasValue && t.NovoTitular is not null))
            .WithMessage("Informe exatamente uma das opções: TitularId (existente) ou NovoTitular (novo cadastro).");

        RuleFor(x => x.NovoTitular)
            .SetValidator(new NovoTitularRepertorioInputValidator()!)
            .When(x => x.NovoTitular is not null);
    }
}

public class NovoTitularRepertorioInputValidator : AbstractValidator<NovoTitularRepertorioInput>
{
    public NovoTitularRepertorioInputValidator()
    {
        RuleFor(x => x.Nome)
            .NotEmpty().WithMessage("Nome do titular é obrigatório.")
            .MaximumLength(200);

        RuleFor(x => x.TipoPessoa)
            .IsInEnum().WithMessage("Tipo de pessoa inválido. Use PF ou PJ.");

        RuleFor(x => x.Documento)
            .NotEmpty().WithMessage("Documento é obrigatório.")
            .Must((input, documento) => ValidarFormatoDocumento(documento, input.TipoPessoa))
            .WithMessage((input, _) => input.TipoPessoa == TipoTitular.PF
                ? "CPF deve ter 11 dígitos numéricos."
                : "CNPJ deve ter 14 caracteres alfanuméricos.");

        RuleFor(x => x.Nacionalidade)
            .NotEmpty().WithMessage("Nacionalidade é obrigatória.")
            .MaximumLength(100);

        RuleFor(x => x.AssociacaoId)
            .NotEmpty().WithMessage("Associação é obrigatória.");

        RuleFor(x => x.CaeIpi)
            .MaximumLength(20);
    }

    private static bool ValidarFormatoDocumento(string documento, TipoTitular tipoPessoa)
    {
        if (string.IsNullOrWhiteSpace(documento))
            return false;

        var limpo = Regex.Replace(documento, @"[^a-zA-Z0-9]", string.Empty);

        return tipoPessoa switch
        {
            TipoTitular.PF => limpo.Length == 11 && limpo.All(char.IsDigit),
            TipoTitular.PJ => limpo.Length == 14,
            _ => false
        };
    }
}

public class TitularidadeRepertorioInputValidator : AbstractValidator<TitularidadeRepertorioInput>
{
    public TitularidadeRepertorioInputValidator()
    {
        RuleFor(x => x.TitularLocalKey)
            .NotEmpty().WithMessage("Referência ao titular é obrigatória.");

        RuleFor(x => x.Categoria)
            .IsInEnum().WithMessage("Categoria autoral inválida. Use Autor ou Editor.");

        RuleFor(x => x.Percentual)
            .GreaterThan(0m).WithMessage("Percentual deve ser maior que zero.")
            .LessThanOrEqualTo(100m).WithMessage("Percentual não pode exceder 100%.");
    }
}

public class FonogramaRepertorioInputValidator : AbstractValidator<FonogramaRepertorioInput>
{
    public FonogramaRepertorioInputValidator()
    {
        RuleFor(x => x.Isrc)
            .NotEmpty().WithMessage("ISRC é obrigatório.")
            .Must(ValidarIsrc).WithMessage("ISRC inválido. Deve seguir o formato CC-XXX-YY-NNNNN (12 caracteres alfanuméricos).");

        RuleFor(x => x.Pais)
            .NotEmpty().WithMessage("País é obrigatório.")
            .MaximumLength(2).WithMessage("País deve ser o código ISO de 2 letras.");

        RuleFor(x => x.UrlAudio)
            .NotEmpty().WithMessage("URL de áudio é obrigatória.");

        RuleFor(x => x.Participacoes)
            .NotEmpty().WithMessage("Ao menos uma participação por fonograma é obrigatória.")
            .ForEach(participacao => participacao.SetValidator(new ParticipacaoRepertorioInputValidator()));
    }

    private static bool ValidarIsrc(string isrc)
    {
        if (string.IsNullOrWhiteSpace(isrc))
            return false;

        var limpo = Regex.Replace(isrc, @"[^a-zA-Z0-9]", string.Empty).ToUpperInvariant();

        if (limpo.Length != 12)
            return false;

        if (!char.IsLetter(limpo[0]) || !char.IsLetter(limpo[1]))
            return false;

        if (!char.IsDigit(limpo[5]) || !char.IsDigit(limpo[6]))
            return false;

        for (var i = 7; i < 12; i++)
            if (!char.IsDigit(limpo[i]))
                return false;

        return true;
    }
}

public class ParticipacaoRepertorioInputValidator : AbstractValidator<ParticipacaoRepertorioInput>
{
    public ParticipacaoRepertorioInputValidator()
    {
        RuleFor(x => x.TitularLocalKey)
            .NotEmpty().WithMessage("Referência ao titular é obrigatória.");

        RuleFor(x => x.Papel)
            .IsInEnum().WithMessage("Papel inválido. Use Interprete, ProdutorFonografico ou MusicoExecutante.");
    }
}
