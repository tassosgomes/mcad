using Identificacao.Domain.Entities;

namespace Identificacao.Infra.Data.Seeds;

public static class TipoUtilizacaoSeed
{
    public static readonly Guid TaId = Guid.Parse("d1e2f3a4-0001-0000-0000-000000000001");
    public static readonly Guid TeId = Guid.Parse("d1e2f3a4-0001-0000-0000-000000000002");
    public static readonly Guid PeId = Guid.Parse("d1e2f3a4-0001-0000-0000-000000000003");
    public static readonly Guid BkId = Guid.Parse("d1e2f3a4-0001-0000-0000-000000000004");

    public static IEnumerable<TipoUtilizacao> GetTipos() => new[]
    {
        TipoUtilizacao.Criar(TaId, "TA", "Tema de Abertura", 1.0m),
        TipoUtilizacao.Criar(TeId, "TE", "Tema de Encerramento", 1.0m),
        TipoUtilizacao.Criar(PeId, "PE", "Performance Cênica", 1.0m),
        TipoUtilizacao.Criar(BkId, "BK", "Background (Música de Fundo)", 0.0833m),
    };
}
