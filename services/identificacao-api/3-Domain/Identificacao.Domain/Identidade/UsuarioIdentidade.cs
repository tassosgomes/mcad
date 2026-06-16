namespace Identificacao.Domain.Identidade;

public class UsuarioIdentidade
{
    public string LogtoUserId { get; set; } = string.Empty;
    public string? Username { get; set; }
    public string? DisplayName { get; set; }
    public string? Email { get; set; }
    public List<string> Roles { get; set; } = [];
    public bool IsSuspended { get; set; }
    public DateTime? DeletedAtUtc { get; set; }

    public string NomeExibicao => DisplayName ?? Username ?? Email ?? LogtoUserId;
}
