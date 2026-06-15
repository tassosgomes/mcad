namespace Cadastro.Application.Portal.Responses;

/// <summary>
/// Response de uma solicitação de alteração de dado sensível aberta pelo titular
/// (RF-14, RF-15, RF-17, RF-20, RF-21).
/// <para>
/// <c>Status</c> em SCREAMING_SNAKE_CASE (<c>SOLICITADA</c>, <c>APROVADA</c>, <c>REJEITADA</c>).
/// <c>DecididaEm</c> e <c>JustificativaRejeicao</c> só são preenchidos pelo Analista (task 12.0).
/// </para>
/// <para>
/// RF-21: <c>ExigeAvisoJanela</c> é <c>true</c> quando <c>Campo == ASSOCIACAO</c> — sinal para o
/// frontend exibir o aviso de impacto em janelas de distribuição.
/// </para>
/// </summary>
public record SolicitacaoResponse(
    Guid Id,
    string Campo,
    string ValorAtual,
    string ValorPretendido,
    string Justificativa,
    string Status,
    DateTime? DecididaEm,
    string? JustificativaRejeicao,
    bool ExigeAvisoJanela);
