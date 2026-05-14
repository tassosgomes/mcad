namespace Ecad.Authz.Sdk;

public sealed class EcadAuthzOptions
{
    public const string SectionName = "EcadAuthz";

    public bool Enabled { get; set; } = true;

    public string BaseUrl { get; set; } = "http://localhost:8080/v1";

    public int TimeoutSeconds { get; set; } = 3;

    /// <summary>
    /// TTL em segundos para cache local de decisões. Reservado para uso futuro
    /// pelo SDK (cache in-memory); por ora é lido apenas para padronizar a
    /// configuração entre serviços. Default: 30s.
    /// </summary>
    public int CacheTtlSeconds { get; set; } = 30;
}
