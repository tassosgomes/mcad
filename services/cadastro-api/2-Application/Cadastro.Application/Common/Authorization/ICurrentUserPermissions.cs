namespace Cadastro.Application.Common.Authorization;

public interface ICurrentUserPermissions
{
    bool Has(string permission);
}
