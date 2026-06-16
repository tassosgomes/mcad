namespace Identificacao.Domain.Entities;

public class UsuarioMusicaSnapshot
{
    public Guid Id { get; private set; }
    public string RazaoSocial { get; private set; } = string.Empty;
    public string Cnpj { get; private set; } = string.Empty;
    public string Status { get; private set; } = string.Empty;
    public DateTime AtualizadoEm { get; private set; }

    private UsuarioMusicaSnapshot() { }

    public static UsuarioMusicaSnapshot Criar(Guid id, string razaoSocial, string cnpj, string status, DateTime atualizadoEm)
    {
        return new UsuarioMusicaSnapshot
        {
            Id = id,
            RazaoSocial = razaoSocial,
            Cnpj = cnpj,
            Status = status,
            AtualizadoEm = atualizadoEm
        };
    }
}
