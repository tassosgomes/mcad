using Cadastro.Domain.Entities;

namespace Cadastro.Infra.Data.Seeds;

/// <summary>
/// Seed das 7 associações de gestão coletiva do ECAD.
/// UUIDs são determinísticos (hardcoded) para garantir idempotência do seed e
/// referência estável cross-service (RF-01, RF-03).
/// CNPJs conforme dados oficiais das associações.
/// </summary>
public static class AssociacaoSeed
{
    // UUIDs determinísticos — não alterar após a primeira migration
    public static readonly Guid AbramusId   = Guid.Parse("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    public static readonly Guid AmarId      = Guid.Parse("b2c3d4e5-f6a7-8901-bcde-f12345678901");
    public static readonly Guid AssimId     = Guid.Parse("c3d4e5f6-a7b8-9012-cdef-123456789012");
    public static readonly Guid SbacemId    = Guid.Parse("d4e5f6a7-b8c9-0123-defa-234567890123");
    public static readonly Guid SicamId     = Guid.Parse("e5f6a7b8-c9d0-1234-efab-345678901234");
    public static readonly Guid SocinproId  = Guid.Parse("f6a7b8c9-d0e1-2345-fabc-456789012345");
    public static readonly Guid UbcId       = Guid.Parse("a7b8c9d0-e1f2-3456-abcd-567890123456");

    public static Associacao[] GetSeedData() =>
    [
        new(AbramusId,  "Associação Brasileira de Música e Artes",                             "ABRAMUS",   "50.997.063/0001-32"),
        new(AmarId,     "Associação de Músicos, Arranjadores e Regentes",                      "AMAR",      "30.713.325/0001-82"),
        new(AssimId,    "Associação de Intérpretes e Músicos",                                 "ASSIM",     "43.985.563/0001-99"),
        new(SbacemId,   "Sociedade Brasileira de Autores, Compositores e Escritores de Música","SBACEM",    "33.780.222/0001-23"),
        new(SicamId,    "Sociedade Independente de Compositores e Autores Musicais",            "SICAM",     "62.092.010/0001-51"),
        new(SocinproId, "Sociedade Brasileira de Administração e Proteção de Direitos Intelectuais", "SOCINPRO", "33.748.146/0001-79"),
        new(UbcId,      "União Brasileira de Compositores",                                    "UBC",       "33.576.166/0001-00"),
    ];
}
