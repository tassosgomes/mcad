using Cadastro.Domain.Entities;

namespace Cadastro.Domain.Services;

public static class ValidadorLiberacaoFonograma
{
    public static IReadOnlyList<PreRequisito> Validar(Fonograma fonograma, decimal somaConexos, bool obraLiberada)
    {
        var pendencias = new List<PreRequisito>();

        pendencias.Add(new PreRequisito("ISRC", fonograma.Isrc != null));
        
        pendencias.Add(new PreRequisito(
            "Participações Conexas",
            somaConexos == 100.0000m,
            somaConexos == 100.0000m ? null : $"Soma ({somaConexos.ToString("0.0000")}%) diferente de 100%"
        ));

        pendencias.Add(new PreRequisito(
            "Obra LIBERADA",
            obraLiberada,
            obraLiberada ? null : "Obra vinculada não está LIBERADA"
        ));

        bool temAudio = !string.IsNullOrWhiteSpace(fonograma.UrlAudio);
        pendencias.Add(new PreRequisito(
            "URL Áudio",
            temAudio,
            temAudio ? null : "URL de áudio não preenchida"
        ));

        return pendencias;
    }
}
