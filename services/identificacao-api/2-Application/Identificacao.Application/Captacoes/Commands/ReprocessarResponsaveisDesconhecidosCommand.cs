using Identificacao.Application.Common;

namespace Identificacao.Application.Captacoes.Commands;

public record ReprocessarResponsaveisDesconhecidosCommand() : ICommand<ReprocessarResponsaveisResult>;

public record ReprocessarResponsaveisResult(int TotalAnalisadas, int TotalCorrigidas);
