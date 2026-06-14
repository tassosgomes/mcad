namespace Cadastro.Infra.Storage;

public class StorageOptions
{
    public string BaseUrl { get; set; } = string.Empty;
    public string LogToIssuer { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string Resource { get; set; } = string.Empty;
}
