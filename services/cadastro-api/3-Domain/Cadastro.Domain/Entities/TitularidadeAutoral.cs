using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;

namespace Cadastro.Domain.Entities;

public class TitularidadeAutoral
{
    public Guid Id { get; private set; }
    public Guid ObraId { get; private set; }
    public Guid TitularId { get; private set; }
    public CategoriaAutoral Categoria { get; private set; }
    public decimal Percentual { get; private set; }
    public DateTime CriadoEm { get; private set; }

    // Navigation
    public ObraMusical Obra { get; private set; } = null!;
    public Titular Titular { get; private set; } = null!;

    private TitularidadeAutoral() { } // EF Core

    public static TitularidadeAutoral Criar(Guid obraId, Guid titularId, CategoriaAutoral categoria, decimal percentual)
    {
        if (percentual <= 0 || percentual > 100)
            throw new DomainException("Percentual deve estar entre 0.0001 e 100.0000");

        return new TitularidadeAutoral
        {
            Id = Guid.NewGuid(),
            ObraId = obraId,
            TitularId = titularId,
            Categoria = categoria,
            Percentual = Math.Round(percentual, 4),
            CriadoEm = DateTime.UtcNow,
        };
    }

    public void AlterarPercentual(decimal novoPercentual)
    {
        if (novoPercentual <= 0 || novoPercentual > 100)
            throw new DomainException("Percentual deve estar entre 0.0001 e 100.0000");
            
        Percentual = Math.Round(novoPercentual, 4);
    }
}
