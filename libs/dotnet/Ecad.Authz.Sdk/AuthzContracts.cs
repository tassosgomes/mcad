namespace Ecad.Authz.Sdk;

public sealed record AuthzCheckRequest(
    string Permission,
    AuthzResourceRef? Resource = null);

public sealed record AuthzResourceRef(
    string Type,
    string Id);

public sealed record AuthzDecision(
    bool Allowed,
    string Reason,
    long AuthzVersion,
    AuthzScope? Scope = null)
{
    public static AuthzDecision Unavailable() => new(false, "AUTHZ_SERVICE_UNAVAILABLE", 0);
}

public sealed record AuthzScope(
    string Type,
    string Id);
