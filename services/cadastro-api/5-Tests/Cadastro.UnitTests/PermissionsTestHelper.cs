using Cadastro.Application.Common.Authorization;
using Moq;

namespace Cadastro.UnitTests;

internal static class PermissionsTestHelper
{
    internal static ICurrentUserPermissions With(bool allowed)
    {
        var mock = new Mock<ICurrentUserPermissions>();
        mock.Setup(p => p.HasAsync(It.IsAny<string>())).ReturnsAsync(allowed);
        return mock.Object;
    }
}
