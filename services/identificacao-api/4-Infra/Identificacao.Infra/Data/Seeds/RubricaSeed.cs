using Identificacao.Domain.Entities;

namespace Identificacao.Infra.Data.Seeds;

public static class RubricaSeed
{
    public static readonly Guid RadioId = Guid.Parse("b1a2c3d4-0001-0000-0000-000000000001");
    public static readonly Guid TvAbertaId = Guid.Parse("b1a2c3d4-0001-0000-0000-000000000002");
    public static readonly Guid TvFechadaId = Guid.Parse("b1a2c3d4-0001-0000-0000-000000000003");
    public static readonly Guid CinemaId = Guid.Parse("b1a2c3d4-0001-0000-0000-000000000004");
    public static readonly Guid VodId = Guid.Parse("b1a2c3d4-0001-0000-0000-000000000005");
    public static readonly Guid StreamingAudioId = Guid.Parse("b1a2c3d4-0001-0000-0000-000000000006");
    public static readonly Guid ShowId = Guid.Parse("b1a2c3d4-0001-0000-0000-000000000007");

    public static IEnumerable<Rubrica> GetRubricas() => new[]
    {
        Rubrica.Criar(RadioId, "RADIO", "Rádio AM/FM", false),
        Rubrica.Criar(TvAbertaId, "TV_ABERTA", "TV Aberta", true),
        Rubrica.Criar(TvFechadaId, "TV_FECHADA", "TV Fechada", true),
        Rubrica.Criar(CinemaId, "CINEMA", "Cinema", true),
        Rubrica.Criar(VodId, "VOD", "Streaming Vídeo (VOD)", true),
        Rubrica.Criar(StreamingAudioId, "STREAMING_AUDIO", "Streaming Áudio", false),
        Rubrica.Criar(ShowId, "SHOW", "Show", false),
    };
}
