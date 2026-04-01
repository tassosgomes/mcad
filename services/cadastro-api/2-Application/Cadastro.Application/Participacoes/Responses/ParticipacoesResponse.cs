namespace Cadastro.Application.Participacoes.Responses;

public record ParticipacoesResponse(
    Guid FonogramaId,
    IEnumerable<ParticipacaoItemResponse> Participacoes,
    decimal? SomaPercentual,
    bool SomaCalculada,
    bool PercentuaisDesatualizados
);
