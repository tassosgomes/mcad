namespace Cadastro.Application.Associacoes.Responses;

/// <summary>
/// DTO de resposta para Associacao.
/// Expõe id, sigla, nome e cnpj conforme API Contract (RF-08, RF-09).
/// </summary>
public record AssociacaoResponse(Guid Id, long Codigo, string Sigla, string Nome, string Cnpj);
