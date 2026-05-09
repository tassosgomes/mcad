using Ecad.Audit.Sdk;

namespace Identificacao.Application.Audit;

public interface IAuditContextProvider
{
    AuditContext Current(string fallbackUsername = "system");
}
