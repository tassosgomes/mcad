namespace Cadastro.Application.Portal.Responses;

/// <summary>
/// Response dos dados de contato do titular (RF-09, RF-10).
/// Retornado por <c>PUT /api/v1/portal/me/contato</c> após atualização e por
/// <c>GET /api/v1/portal/me</c> aninhado em <see cref="MeuTitularResponse"/>.
/// </summary>
public record ContatoResponse(
    string? Email,
    EnderecoDto? Endereco,
    IReadOnlyList<TelefoneDto> Telefones);
