namespace Identificacao.Infra.ExternalServices;

public class CadastroOptions
{
    public string LogToIssuer { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string Resource { get; set; } = string.Empty;
    public string Scope { get; set; } = string.Empty;
}
