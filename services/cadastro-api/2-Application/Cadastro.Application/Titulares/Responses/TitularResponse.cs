namespace Cadastro.Application.Titulares.Responses;

/// <summary>
/// Response completa de um titular — derivada do API Contract.
/// documentoFormatado calculado no mapeamento Titular → TitularResponse.
/// associacao aninhado para evitar N+1 no frontend.
/// </summary>
public record TitularResponse(
    Guid Id,
    string Nome,
    string Tipo,
    string Documento,
    string DocumentoFormatado,
    string Nacionalidade,
    string? CaeIpi,
    AssociacaoResumoResponse Associacao,
    string Status,
    DateTime CriadoEm,
    DateTime AtualizadoEm);

/// <summary>
/// Resumo de associação aninhado no TitularResponse.
/// </summary>
public record AssociacaoResumoResponse(
    Guid Id,
    string Sigla,
    string Nome);
