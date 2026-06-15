namespace Cadastro.Application.Portal.Responses;

/// <summary>
/// DTO de telefone para o Portal do Titular (RF-09).
/// <c>Tipo</c> aceita "CELULAR" / "RESIDENCIAL" / "COMERCIAL" (case-insensitive).
/// <c>Numero</c> aceita formatos "(11) 99999-0000" ou "11999990000".
/// </summary>
public record TelefoneDto(string Tipo, string Numero);
