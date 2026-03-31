namespace Cadastro.Application.Titularidades.Responses;

public record TitularidadesResponse(
    Guid ObraId,
    IEnumerable<TitularidadeItemResponse> Titularidades,
    decimal SomaPercentual,
    bool SomaCompleta
);
