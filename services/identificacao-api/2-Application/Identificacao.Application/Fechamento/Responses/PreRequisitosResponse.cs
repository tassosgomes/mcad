namespace Identificacao.Application.Fechamento.Responses;

public record PreRequisitosResponse(
    Guid CaptacaoId,
    bool TodosAtendidos,
    IEnumerable<PreRequisitoItem> Itens,
    ResumoFechamento Resumo);

public record PreRequisitoItem(
    string Id,
    string Nome,
    bool Atendido,
    string? Detalhe);

public record ResumoFechamento(
    int TotalExecucoes,
    int Identificadas,
    int Pendentes,
    string RubricaNome,
    DateOnly Periodo,
    bool ExigeClassificacao);
