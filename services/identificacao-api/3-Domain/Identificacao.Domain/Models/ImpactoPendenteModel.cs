namespace Identificacao.Domain.Models;

public record ImpactoPendenteModel(
    string Identificador,
    string Tipo,
    string? ObraTitulo,
    int QuantidadeExecucoes,
    int CaptacoesAfetadas
);
