namespace Cadastro.Application.Portal.Responses;

/// <summary>
/// Response de <c>GET /api/v1/portal/me</c>.
/// Exibe dados básicos do titular autenticado com documento mascarado (LGPD).
/// </summary>
public record MeuTitularResponse(
    Guid Id,
    string Nome,
    string Tipo,
    string Documento,
    string DocumentoFormatado,
    ContatoResponse? Contato);
