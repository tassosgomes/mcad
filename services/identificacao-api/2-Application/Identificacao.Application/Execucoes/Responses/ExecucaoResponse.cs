using Identificacao.Application.TiposUtilizacao.Responses;

namespace Identificacao.Application.Execucoes.Responses;

public record ExecucaoResponse(
    Guid Id,
    Guid ObraId,
    Guid? FonogramaId,
    string ObraTitulo,
    string? FonogramaIsrc,
    string? ObraIswc,
    string Interpretes,
    string Inicio,
    string Fim,
    int DuracaoSegundos,
    int Quantidade,
    TipoUtilizacaoResponse? TipoUtilizacao,
    string? TituloPrograma,
    string Status
);
