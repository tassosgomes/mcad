namespace Cadastro.Application.Portal.Responses;

/// <summary>
/// Response do login do titular (RF-05).
/// Contém o JWT emitido pelo serviço, a data de expiração e o resumo do titular.
/// Nunca expõe documento nem hash de senha (LGPD / RF-04 / RF-06).
/// </summary>
public record LoginResponse(
    string Token,
    DateTime ExpiraEm,
    TitularResumo Titular);
