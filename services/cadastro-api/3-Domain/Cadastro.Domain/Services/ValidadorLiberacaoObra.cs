using Cadastro.Domain.Entities;

namespace Cadastro.Domain.Services;

public static class ValidadorLiberacaoObra
{
    public static IReadOnlyList<PreRequisito> Validar(ObraMusical obra, decimal somaTitularidades, bool temIswc)
    {
        var pendencias = new List<PreRequisito>();

        pendencias.Add(new PreRequisito("Título", !string.IsNullOrWhiteSpace(obra.Titulo)));
        pendencias.Add(new PreRequisito("Tipo", obra.Tipo != default));
        
        pendencias.Add(new PreRequisito(
            "ISWC",
            temIswc,
            temIswc ? null : "ISWC não obtido"
        ));

        pendencias.Add(new PreRequisito(
            "Titularidades",
            somaTitularidades == 100.0000m,
            somaTitularidades == 100.0000m ? null : $"Soma ({somaTitularidades.ToString("0.0000")}%) diferente de 100%"
        ));

        return pendencias;
    }
}
