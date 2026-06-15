namespace Cadastro.Application.Portal.Responses;

/// <summary>
/// Response do auto-cadastro do titular (RF-01 a RF-04).
/// Não retorna token: o titular deve realizar login em seguida (RF-05).
/// </summary>
public record AutoCadastroResponse(TitularResumo Titular);
