namespace Ecad.Authz.Sdk;

public sealed class EcadAuthzOptions
{
    public const string SectionName = "EcadAuthz";

    public bool Enabled { get; set; } = true;

    public string BaseUrl { get; set; } = "http://localhost:8080/v1";

    public int TimeoutSeconds { get; set; } = 3;
}
