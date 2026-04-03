using Identificacao.Application.Common;
using Identificacao.Application.Execucoes.Responses;

namespace Identificacao.Application.Execucoes.Commands;

public record CriarExecucaoCommand(
    Guid CaptacaoId, 
    Guid ObraId, 
    Guid? FonogramaId,
    TimeOnly Inicio, 
    TimeOnly Fim, 
    int Quantidade,
    Guid? TipoUtilizacaoId, 
    string? TituloPrograma,
    Guid AnalistaId
) : ICommand<ExecucaoResponse>;
