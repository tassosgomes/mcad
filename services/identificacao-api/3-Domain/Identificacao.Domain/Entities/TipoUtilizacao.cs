namespace Identificacao.Domain.Entities;

public class TipoUtilizacao
{
    public Guid Id { get; private set; }
    public string Sigla { get; private set; } = null!;
    public string Descricao { get; private set; } = null!;
    public decimal Peso { get; private set; }

    private TipoUtilizacao() { }

    public static TipoUtilizacao Criar(Guid id, string sigla, string descricao, decimal peso) => new()
    {
        Id = id, Sigla = sigla, Descricao = descricao, Peso = peso
    };
}
