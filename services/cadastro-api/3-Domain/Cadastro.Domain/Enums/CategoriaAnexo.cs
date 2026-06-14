using Cadastro.Domain.Enums;

namespace Cadastro.Domain.Enums;

public enum CategoriaAnexo
{
    // ObraMusical
    LetraObra,
    OutroDocumentoObra,

    // Fonograma
    AudioFonograma,
    OutroDocumentoFonograma,

    // Titular
    DocumentoIdentificacao,
    Contrato,
    OutroDocumentoTitular
}

public static class CategoriaAnexoExtensions
{
    private static readonly Dictionary<CategoriaAnexo, TipoEntidadeAnexo> _mapa = new()
    {
        [CategoriaAnexo.LetraObra]                 = TipoEntidadeAnexo.Obra,
        [CategoriaAnexo.OutroDocumentoObra]         = TipoEntidadeAnexo.Obra,
        [CategoriaAnexo.AudioFonograma]             = TipoEntidadeAnexo.Fonograma,
        [CategoriaAnexo.OutroDocumentoFonograma]    = TipoEntidadeAnexo.Fonograma,
        [CategoriaAnexo.DocumentoIdentificacao]     = TipoEntidadeAnexo.Titular,
        [CategoriaAnexo.Contrato]                   = TipoEntidadeAnexo.Titular,
        [CategoriaAnexo.OutroDocumentoTitular]      = TipoEntidadeAnexo.Titular,
    };

    public static bool CompatibilidadeComEntidade(this CategoriaAnexo categoria, TipoEntidadeAnexo entidade)
        => _mapa.TryGetValue(categoria, out var esperado) && esperado == entidade;
}
