namespace Ecad.Authz.Sdk;

public interface IEcadAuthzClient
{
    Task<AuthzDecision> CheckAsync(
        AuthzCheckRequest request,
        string? bearerToken,
        CancellationToken cancellationToken = default);
}
