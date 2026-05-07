using Ecad.Audit.Sdk;

namespace Cadastro.Application.Audit;

public sealed class NoopAuditContextProvider : IAuditContextProvider
{
    public AuditContext Current(string fallbackUsername = "system")
    {
        var requestId = Guid.NewGuid().ToString();
        return new AuditContext(
            UserId: fallbackUsername,
            Username: fallbackUsername,
            DisplayName: fallbackUsername,
            Roles: [],
            AuthProvider: "system",
            TraceId: requestId.Replace("-", string.Empty, StringComparison.Ordinal),
            RequestId: requestId,
            Channel: "SYSTEM");
    }
}
