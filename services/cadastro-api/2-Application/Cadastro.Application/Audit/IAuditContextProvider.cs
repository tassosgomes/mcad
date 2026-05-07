using Ecad.Audit.Sdk;

namespace Cadastro.Application.Audit;

public interface IAuditContextProvider
{
    AuditContext Current(string fallbackUsername = "system");
}
